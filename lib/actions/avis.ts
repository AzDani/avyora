"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { verifierLimite } from "@/lib/ratelimit";
import { emailAModererReseau, emailAvisArtisan, emailAvisClient, envoyerEmailSuivi } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";
import { BUCKET_ARTISANS, TABLE_ARTISANS, TABLE_DEMANDES, TABLE_MER, TABLE_REALISATIONS, candidatureDe } from "@/lib/data/reseau";
import { MIMES_ACCEPTES, TAILLE_MAX, aujourdhuiParis } from "@/lib/reseau/candidature";
import {
  auteurAffiche, avisModifiable, cheminPhotoValide, estMotif, labelMotif, lireReponse, nettoyerTexte, prefixeGalerie, prefixePhotosAvis,
  reponseModifiable, validerAvis, validerRealisation, type ErreursAvis, type ErreursRealisation, type StatutAvis, type StatutReponse,
} from "@/lib/reseau/avis";
import { normaliserPortable } from "@/lib/telephone";
import type { Artisan } from "@/lib/reseau/artisan";

/**
 * Avis publics, réponses des artisans, galerie et mises à jour de dossier du Réseau AVYORA (25/11/2026). Tout part de
 * la SESSION ; les tables et le stockage n'ont aucune policy, seul ce code y écrit. Un avis publié est figé (ici, et
 * par la base : migration 0012). Daniel valide les avis et les réponses ; la galerie est publiée sans validation.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGES = ["image/jpeg", "image/png", "image/webp"];

function urlSite(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}
function destinataireInterne(): string {
  const v = process.env.ACCOMPAGNEMENT_TO?.trim();
  return v && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v) ? v : DESTINATAIRE_DEFAUT;
}
const SESSION = "Ta session a expiré : reconnecte-toi.";
const RESSAIE = "Réessaie dans un instant.";

/** L'artisan VALIDÉ du compte connecté. */
async function artisanValide(): Promise<{ ok: true; user: NonNullable<Awaited<ReturnType<typeof getUser>>>; artisan: Artisan } | { ok: false; erreur: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: SESSION };
  let artisan: Artisan | null;
  try {
    artisan = await candidatureDe(user.id);
  } catch {
    return { ok: false, erreur: RESSAIE };
  }
  if (!artisan || artisan.statut !== "valide") return { ok: false, erreur: "Ta participation au réseau n'est pas active." };
  return { ok: true, user, artisan };
}

/** Les photos sont-elles toutes présentes dans le dossier, et de vraies images ? */
async function photosPresentes(prefixe: string, chemins: string[]): Promise<boolean> {
  if (!chemins.length) return true;
  if (chemins.some((c) => !cheminPhotoValide(c, prefixe))) return false;
  const { data } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).list(prefixe.slice(0, -1), { limit: 1000 });
  const images = new Set(
    (data ?? []).filter((o) => IMAGES.includes(String((o.metadata as { mimetype?: string } | null)?.mimetype ?? ""))).map((o) => `${prefixe}${o.name}`),
  );
  return chemins.every((c) => images.has(c));
}
async function retirerFichiers(chemins: string[]) {
  if (chemins.length) await supabaseAdmin().storage.from(BUCKET_ARTISANS).remove(chemins);
}

/** Une URL d'envoi signée pour une photo, dans le dossier donné. Images seulement, 10 Mo au plus. */
async function urlEnvoi(prefixe: string, f: { taille: number; mime: string }, cle: string): Promise<{ ok: true; chemin: string; jeton: string } | { ok: false; erreur: string }> {
  if (typeof f?.mime !== "string" || !IMAGES.includes(f.mime)) return { ok: false, erreur: "Photos JPEG, PNG ou WebP seulement." };
  if (!(typeof f.taille === "number" && f.taille > 0 && f.taille <= TAILLE_MAX)) return { ok: false, erreur: "10 Mo au plus par photo." };
  if (!(await verifierLimite("artisanFichier", cle))) return { ok: false, erreur: "Trop d'envois : réessaie plus tard." };
  const chemin = `${prefixe}${randomUUID()}.${MIMES_ACCEPTES[f.mime as keyof typeof MIMES_ACCEPTES]}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).createSignedUploadUrl(chemin);
  if (error || !data) return { ok: false, erreur: RESSAIE };
  return { ok: true, chemin: data.path, jeton: data.token };
}

/* ─── Le client : son avis ─────────────────────────────────────────────────── */

type MiseClient = {
  id: string; artisan_id: string; avis_statut: StatutAvis | null; avis_photos: string[] | null;
  demande: { prenom: string; email: string; ville: string | null; code_postal: string };
};

/** La mise en relation ACCEPTÉE d'une demande du client connecté ; null sinon. */
async function miseDuClient(miseId: string, clientId: string): Promise<MiseClient | null> {
  if (typeof miseId !== "string" || !UUID.test(miseId)) return null;
  const sb = supabaseAdmin();
  const { data: m } = await sb.from(TABLE_MER).select("id, demande_id, artisan_id, statut, avis_statut, avis_photos").eq("id", miseId).eq("statut", "acceptee").maybeSingle();
  if (!m) return null;
  const { data: d } = await sb.from(TABLE_DEMANDES).select("prenom, email, ville, code_postal").eq("id", String(m.demande_id)).eq("client_id", clientId).maybeSingle();
  if (!d) return null;
  return {
    id: String(m.id), artisan_id: String(m.artisan_id), avis_statut: (m.avis_statut as StatutAvis | null) ?? null, avis_photos: (m.avis_photos as string[] | null) ?? [],
    demande: { prenom: String(d.prenom), email: String(d.email), ville: (d.ville as string | null) ?? null, code_postal: String(d.code_postal) },
  };
}

/** Une URL d'envoi pour une photo d'avis (`avis/<compte>/`). */
export async function preparerPhotoAvis(f: { taille: number; mime: string }) {
  const user = await getUser();
  if (!user) return { ok: false as const, erreur: SESSION };
  return urlEnvoi(prefixePhotosAvis(user.id), f, `avis:${user.id}`);
}

/**
 * Le client envoie (ou corrige) son avis sur un artisan qui a accepté sa demande. Il part « en attente » chez Daniel.
 * Refusé si l'avis est déjà publié (figé) ou retiré.
 */
export async function envoyerAvis(miseId: string, brut: unknown): Promise<{ ok: true } | { ok: false; erreur?: string; erreurs?: ErreursAvis }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: SESSION };
  const m = await miseDuClient(miseId, user.id);
  if (!m) return { ok: false, erreur: "Cet artisan n'a pas accepté ta demande : tu ne peux pas encore donner ton avis." };
  if (!avisModifiable(m.avis_statut)) return { ok: false, erreur: "Ton avis est publié : il ne peut plus être modifié." };
  const v = validerAvis(brut);
  if (!v.ok) return { ok: false, erreurs: v.erreurs };
  if (!(await photosPresentes(prefixePhotosAvis(user.id), v.a.photos))) return { ok: false, erreurs: { photos: "Une photo n'a pas été envoyée : retire-la et ajoute-la de nouveau." } };
  if (!(await verifierLimite("reseauAvis", user.id))) return { ok: false, erreur: "Trop d'envois aujourd'hui : réessaie demain." };

  const auteur = auteurAffiche(m.demande.prenom, typeof user.user_metadata?.nom === "string" ? user.user_metadata.nom : null);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from(TABLE_MER)
    .update({
      avis_note: v.a.note, avis_commentaire: v.a.texte, avis_mois: v.a.mois, avis_photos: v.a.photos, avis_auteur: auteur,
      avis_statut: "en_attente", avis_motif: null, avis_le: new Date().toISOString(),
    })
    .eq("id", m.id)
    .eq("statut", "acceptee")
    .or("avis_statut.is.null,avis_statut.eq.en_attente,avis_statut.eq.refuse")
    .select("id");
  if (error || !data?.length) return { ok: false, erreur: "Ton avis n'a pas pu être enregistré : recharge la page." };
  await retirerFichiers((m.avis_photos ?? []).filter((c) => !v.a.photos.includes(c)));

  const { data: art } = await sb.from(TABLE_ARTISANS).select("raison_sociale, nom_commercial").eq("id", m.artisan_id).maybeSingle();
  const nomArtisan = art ? String(art.nom_commercial || art.raison_sociale) : "Artisan";
  const mail = emailAModererReseau({
    titre: `Avis à valider : ${nomArtisan} (${v.a.note}/5)`,
    lignes: [["Artisan", nomArtisan], ["Auteur", auteur], ["Note", `${v.a.note}/5`], ["Avis", v.a.texte], ["Photos", String(v.a.photos.length)]],
    url: `${urlSite()}/admin/avis`, bouton: "Valider ou refuser",
  });
  await envoyerEmailSuivi({ to: destinataireInterne(), subject: mail.subject, html: mail.html });
  await journaliser("reponse_devis", { userId: user.id, payload: { mise: m.id, avis: v.a.note, statut: "en_attente" } });
  revalidatePath("/demandes-devis");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ─── L'artisan : réponse, signalement, galerie, dossier ─────────────────────── */

/** La mise en relation d'un avis PUBLIÉ sur l'artisan connecté. */
async function avisPublieDe(miseId: string, artisanId: string): Promise<{ id: string; reponse_statut: StatutReponse | null } | null> {
  if (typeof miseId !== "string" || !UUID.test(miseId)) return null;
  const { data } = await supabaseAdmin().from(TABLE_MER).select("id, reponse_statut").eq("id", miseId).eq("artisan_id", artisanId).eq("avis_statut", "publie").maybeSingle();
  return data ? { id: String(data.id), reponse_statut: (data.reponse_statut as StatutReponse | null) ?? null } : null;
}

/** L'artisan répond publiquement à un avis : la réponse part en attente chez Daniel (modifiable tant qu'elle n'est pas publiée). */
export async function repondreAvis(miseId: string, texte: string): Promise<{ ok: boolean; erreur?: string }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  const rep = lireReponse(texte);
  if (!rep) return { ok: false, erreur: "Écris ta réponse." };
  const m = await avisPublieDe(miseId, a.artisan.id);
  if (!m) return { ok: false, erreur: "Avis introuvable." };
  if (!reponseModifiable(m.reponse_statut)) return { ok: false, erreur: "Ta réponse est publiée : elle ne peut plus être modifiée." };
  if (!(await verifierLimite("reseauAvis", a.user.id))) return { ok: false, erreur: "Trop d'envois aujourd'hui : réessaie demain." };
  const { error } = await supabaseAdmin()
    .from(TABLE_MER)
    .update({ reponse_texte: rep, reponse_statut: "en_attente", reponse_motif: null, reponse_le: new Date().toISOString() })
    .eq("id", m.id)
    .or("reponse_statut.is.null,reponse_statut.eq.en_attente,reponse_statut.eq.refuse");
  if (error) return { ok: false, erreur: RESSAIE };
  const nom = a.artisan.nomCommercial || a.artisan.raisonSociale;
  const mail = emailAModererReseau({ titre: `Réponse à valider : ${nom}`, lignes: [["Artisan", nom], ["Réponse", rep]], url: `${urlSite()}/admin/avis`, bouton: "Valider ou refuser" });
  await envoyerEmailSuivi({ to: destinataireInterne(), subject: mail.subject, html: mail.html });
  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** L'artisan signale un avis publié qu'il pense contraire aux règles : Daniel tranche (il ne peut pas le supprimer lui-même). */
export async function signalerAvis(miseId: string, texte: string): Promise<{ ok: boolean; erreur?: string }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  const raison = nettoyerTexte(texte, 1000);
  if (raison.length < 5) return { ok: false, erreur: "Explique en quelques mots ce qui ne va pas." };
  const m = await avisPublieDe(miseId, a.artisan.id);
  if (!m) return { ok: false, erreur: "Avis introuvable." };
  if (!(await verifierLimite("reseauAvis", a.user.id))) return { ok: false, erreur: "Trop d'envois aujourd'hui : réessaie demain." };
  const { error } = await supabaseAdmin().from(TABLE_MER).update({ avis_signale_le: new Date().toISOString(), avis_signalement: raison }).eq("id", m.id);
  if (error) return { ok: false, erreur: RESSAIE };
  const nom = a.artisan.nomCommercial || a.artisan.raisonSociale;
  const mail = emailAModererReseau({ titre: `Avis signalé par ${nom}`, lignes: [["Artisan", nom], ["Raison", raison]], url: `${urlSite()}/admin/avis`, bouton: "Trancher" });
  await envoyerEmailSuivi({ to: destinataireInterne(), subject: mail.subject, html: mail.html });
  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Une URL d'envoi pour une photo de la galerie (`<compte>/galerie/`). */
export async function preparerPhotoRealisation(f: { taille: number; mime: string }) {
  const a = await artisanValide();
  if (!a.ok) return a;
  return urlEnvoi(prefixeGalerie(a.user.id), f, `galerie:${a.user.id}`);
}

/** Ajoute (id null) ou modifie une réalisation de la galerie : en ligne tout de suite, sans validation. */
export async function enregistrerRealisation(id: string | null, brut: unknown): Promise<{ ok: true; id: string } | { ok: false; erreur?: string; erreurs?: ErreursRealisation }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  const v = validerRealisation(brut);
  if (!v.ok) return { ok: false, erreurs: v.erreurs };
  const prefixe = prefixeGalerie(a.user.id);
  if (!(await photosPresentes(prefixe, v.r.photos))) return { ok: false, erreurs: { photos: "Une photo n'a pas été envoyée : retire-la et ajoute-la de nouveau." } };
  if (!(await verifierLimite("reseauAvis", a.user.id))) return { ok: false, erreur: "Trop d'envois aujourd'hui : réessaie demain." };
  const sb = supabaseAdmin();
  const ligne = { titre: v.r.titre, description: v.r.description, ville: v.r.ville, mois: v.r.mois, photos: v.r.photos, updated_at: new Date().toISOString() };
  if (id) {
    if (!UUID.test(id)) return { ok: false, erreur: "Réalisation introuvable." };
    const { data: avant } = await sb.from(TABLE_REALISATIONS).select("id, photos").eq("id", id).eq("artisan_id", a.artisan.id).is("retiree_le", null).maybeSingle();
    if (!avant) return { ok: false, erreur: "Réalisation introuvable." };
    const { error } = await sb.from(TABLE_REALISATIONS).update(ligne).eq("id", id).eq("artisan_id", a.artisan.id);
    if (error) return { ok: false, erreur: RESSAIE };
    await retirerFichiers(((avant.photos as string[]) ?? []).filter((c) => !v.r.photos.includes(c)));
    revalidatePath("/espace-artisan", "layout");
    revalidatePath("/avis-artisans", "layout");
    return { ok: true, id };
  }
  const { count } = await sb.from(TABLE_REALISATIONS).select("id", { count: "exact", head: true }).eq("artisan_id", a.artisan.id);
  if ((count ?? 0) >= 60) return { ok: false, erreur: "60 réalisations au plus : supprime-en une avant d'en ajouter." };
  const { data, error } = await sb.from(TABLE_REALISATIONS).insert({ ...ligne, artisan_id: a.artisan.id }).select("id").single();
  if (error || !data) return { ok: false, erreur: RESSAIE };
  await journaliser("action_admin", { userId: a.user.id, payload: { action: "realisation_ajoutee", realisation: String(data.id) } });
  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/avis-artisans", "layout");
  return { ok: true, id: String(data.id) };
}

/** Supprime une réalisation de SA galerie, et ses photos. */
export async function supprimerRealisation(id: string): Promise<{ ok: boolean; erreur?: string }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, erreur: "Réalisation introuvable." };
  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_REALISATIONS).delete().eq("id", id).eq("artisan_id", a.artisan.id).select("photos");
  if (!data?.length) return { ok: false, erreur: "Réalisation introuvable." };
  await retirerFichiers(((data[0].photos as string[]) ?? []).filter((c) => c.startsWith(prefixeGalerie(a.user.id))));
  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/avis-artisans", "layout");
  return { ok: true };
}

/** L'artisan change son portable : tout de suite (pas de validation). */
export async function changerPortable(saisie: string): Promise<{ ok: boolean; erreur?: string }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  const r = normaliserPortable(String(saisie ?? ""));
  if (!r.ok) return { ok: false, erreur: "Ce numéro n'est pas un portable lisible (06 ou 07)." };
  const { error } = await supabaseAdmin().from(TABLE_ARTISANS).update({ telephone: r.tel }).eq("id", a.artisan.id).eq("statut", "valide");
  if (error) return { ok: false, erreur: RESSAIE };
  await journaliser("action_admin", { userId: a.user.id, payload: { action: "artisan_portable" } });
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

/**
 * L'artisan demande une mise à jour que Daniel doit vérifier : sa nouvelle décennale (assureur, contrat, date de fin ;
 * l'attestation est déposée à part), ou un changement de métiers / de zone (message). Daniel l'applique depuis la fiche.
 */
export async function demanderMajDossier(brut: unknown): Promise<{ ok: boolean; erreur?: string }> {
  const a = await artisanValide();
  if (!a.ok) return a;
  const b = (brut ?? {}) as Record<string, unknown>;
  const le = new Date().toISOString();
  let maj: Record<string, string>;
  if (b.type === "decennale") {
    const assureur = nettoyerTexte(b.assureur, 120).replace(/\n+/g, " ");
    const police = nettoyerTexte(b.police, 60).replace(/\n+/g, " ");
    const fin = String(b.fin ?? "");
    if (assureur.length < 2 || police.length < 2) return { ok: false, erreur: "Indique l'assureur et le numéro de contrat." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin <= aujourdhuiParis()) return { ok: false, erreur: "La nouvelle date de fin doit être dans le futur." };
    maj = { type: "decennale", assureur, police, fin, le };
  } else {
    const texte = nettoyerTexte(b.texte, 1000);
    if (texte.length < 5) return { ok: false, erreur: "Dis à Daniel ce qui doit changer." };
    maj = { type: "message", texte, le };
  }
  if (!(await verifierLimite("reseauAvis", a.user.id))) return { ok: false, erreur: "Trop d'envois aujourd'hui : réessaie demain." };
  const { error } = await supabaseAdmin().from(TABLE_ARTISANS).update({ maj_demandee: maj }).eq("id", a.artisan.id);
  if (error) return { ok: false, erreur: RESSAIE };
  const nom = a.artisan.nomCommercial || a.artisan.raisonSociale;
  const lignes: [string, string][] = maj.type === "decennale"
    ? [["Artisan", nom], ["Demande", "Nouvelle décennale"], ["Assureur", maj.assureur], ["Contrat", maj.police], ["Valable jusqu'au", maj.fin]]
    : [["Artisan", nom], ["Demande", maj.texte]];
  const mail = emailAModererReseau({ titre: `Mise à jour demandée : ${nom}`, lignes, url: `${urlSite()}/admin/artisans/${a.artisan.id}`, bouton: "Ouvrir la fiche" });
  await envoyerEmailSuivi({ to: destinataireInterne(), subject: mail.subject, html: mail.html, replyTo: a.artisan.email });
  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ─── Daniel (admin) ─────────────────────────────────────────────────────────── */

async function admin(): Promise<{ id: string } | null> {
  const ad = await getAdmin();
  if (!ad) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:avis" } });
    return null;
  }
  return { id: ad.id };
}

/**
 * Publier, refuser (motif de la liste, envoyé à l'auteur) ou retirer un avis. Publier prévient le client et l'artisan
 * (qui peut répondre). Retirer : seulement un avis publié (demande de l'auteur, signalement fondé).
 */
export async function modererAvis(miseId: string, decision: "publier" | "refuser" | "retirer" | "garder", motif?: string): Promise<{ ok: boolean; erreur?: string }> {
  const ad = await admin();
  if (!ad) return { ok: false, erreur: "Réservé à l'admin." };
  if (typeof miseId !== "string" || !UUID.test(miseId) || !["publier", "refuser", "retirer", "garder"].includes(decision)) return { ok: false, erreur: "Demande invalide." };
  if (decision === "refuser" && !estMotif(motif)) return { ok: false, erreur: "Choisis un motif." };
  const sb = supabaseAdmin();
  const maintenant = new Date().toISOString();
  const maj =
    decision === "publier" ? { depuis: "en_attente", ligne: { avis_statut: "publie", avis_publie_le: maintenant, avis_modere_le: maintenant, avis_motif: null } }
    : decision === "refuser" ? { depuis: "en_attente", ligne: { avis_statut: "refuse", avis_modere_le: maintenant, avis_motif: labelMotif(motif) } }
    : decision === "retirer" ? { depuis: "publie", ligne: { avis_statut: "retire", avis_modere_le: maintenant, avis_signale_le: null, avis_signalement: null } }
    : { depuis: "publie", ligne: { avis_signale_le: null, avis_signalement: null } };
  const { data, error } = await sb.from(TABLE_MER).update(maj.ligne).eq("id", miseId).eq("avis_statut", maj.depuis).select("id, demande_id, artisan_id, avis_note");
  if (error) return { ok: false, erreur: RESSAIE };
  if (!data?.length) return { ok: false, erreur: "Cet avis a déjà été traité : recharge la page." };

  if (decision === "publier" || decision === "refuser") {
    const m = data[0];
    const [{ data: d }, { data: art }] = await Promise.all([
      sb.from(TABLE_DEMANDES).select("prenom, email").eq("id", String(m.demande_id)).maybeSingle(),
      sb.from(TABLE_ARTISANS).select("id, raison_sociale, nom_commercial, contact_nom, email").eq("id", String(m.artisan_id)).maybeSingle(),
    ]);
    const nomArtisan = art ? String(art.nom_commercial || art.raison_sociale) : "l'artisan";
    if (d) {
      const mail = emailAvisClient({
        prenom: String(d.prenom), nomArtisan, publie: decision === "publier", motif: labelMotif(motif),
        suiviUrl: `${urlSite()}/demandes-devis`, ficheUrl: art ? `${urlSite()}/avis-artisans/${art.id}` : undefined,
      });
      await envoyerEmailSuivi({ to: String(d.email), subject: mail.subject, html: mail.html, replyTo: destinataireInterne() });
    }
    if (decision === "publier" && art) {
      const mail = emailAvisArtisan({ nomArtisan: String(art.contact_nom), note: Number(m.avis_note) || undefined, espaceUrl: `${urlSite()}/espace-artisan/avis` });
      await envoyerEmailSuivi({ to: String(art.email), subject: mail.subject, html: mail.html, replyTo: destinataireInterne() });
    }
  }
  await journaliser("action_admin", { userId: ad.id, payload: { action: `avis_${decision}`, mise: miseId } });
  revalidatePath("/admin", "layout");
  revalidatePath("/avis-artisans", "layout");
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

/** Publier ou refuser (motif, envoyé à l'artisan) la réponse d'un artisan à un avis. */
export async function modererReponse(miseId: string, decision: "publier" | "refuser", motif?: string): Promise<{ ok: boolean; erreur?: string }> {
  const ad = await admin();
  if (!ad) return { ok: false, erreur: "Réservé à l'admin." };
  if (typeof miseId !== "string" || !UUID.test(miseId) || (decision !== "publier" && decision !== "refuser")) return { ok: false, erreur: "Demande invalide." };
  if (decision === "refuser" && !estMotif(motif)) return { ok: false, erreur: "Choisis un motif." };
  const sb = supabaseAdmin();
  const ligne = decision === "publier"
    ? { reponse_statut: "publie", reponse_modere_le: new Date().toISOString(), reponse_motif: null }
    : { reponse_statut: "refuse", reponse_modere_le: new Date().toISOString(), reponse_motif: labelMotif(motif) };
  const { data, error } = await sb.from(TABLE_MER).update(ligne).eq("id", miseId).eq("reponse_statut", "en_attente").select("artisan_id");
  if (error) return { ok: false, erreur: RESSAIE };
  if (!data?.length) return { ok: false, erreur: "Cette réponse a déjà été traitée : recharge la page." };
  if (decision === "refuser") {
    const { data: art } = await sb.from(TABLE_ARTISANS).select("contact_nom, email").eq("id", String(data[0].artisan_id)).maybeSingle();
    if (art) {
      const mail = emailAvisArtisan({ nomArtisan: String(art.contact_nom), reponseRefusee: labelMotif(motif), espaceUrl: `${urlSite()}/espace-artisan/avis` });
      await envoyerEmailSuivi({ to: String(art.email), subject: mail.subject, html: mail.html, replyTo: destinataireInterne() });
    }
  }
  await journaliser("action_admin", { userId: ad.id, payload: { action: `reponse_${decision}`, mise: miseId } });
  revalidatePath("/admin", "layout");
  revalidatePath("/avis-artisans", "layout");
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

/** Retirer une réalisation de la galerie d'un artisan (publiée sans validation), avec un motif court. */
export async function retirerRealisation(id: string, motif: string): Promise<{ ok: boolean; erreur?: string }> {
  const ad = await admin();
  if (!ad) return { ok: false, erreur: "Réservé à l'admin." };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, erreur: "Demande invalide." };
  const m = nettoyerTexte(motif, 300) || "Retirée par AVYORA";
  const { data, error } = await supabaseAdmin().from(TABLE_REALISATIONS).update({ retiree_le: new Date().toISOString(), retiree_motif: m }).eq("id", id).is("retiree_le", null).select("id");
  if (error || !data?.length) return { ok: false, erreur: "Déjà retirée : recharge la page." };
  await journaliser("action_admin", { userId: ad.id, payload: { action: "realisation_retiree", realisation: id } });
  revalidatePath("/admin", "layout");
  revalidatePath("/avis-artisans", "layout");
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

/** La mise à jour demandée par un artisan : l'appliquer (nouvelle décennale) ou la marquer traitée. */
export async function traiterMajArtisan(id: string, appliquer: boolean): Promise<{ ok: boolean; erreur?: string }> {
  const ad = await admin();
  if (!ad) return { ok: false, erreur: "Réservé à l'admin." };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, erreur: "Demande invalide." };
  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_ARTISANS).select("maj_demandee").eq("id", id).maybeSingle();
  const maj = (data?.maj_demandee ?? null) as { type?: string; assureur?: string; police?: string; fin?: string } | null;
  if (!maj) return { ok: false, erreur: "Rien en attente." };
  const ligne: Record<string, unknown> = { maj_demandee: null };
  if (appliquer && maj.type === "decennale" && maj.assureur && maj.police && maj.fin) {
    Object.assign(ligne, { decennale_assureur: maj.assureur, decennale_police: maj.police, decennale_fin: maj.fin });
  }
  const { error } = await sb.from(TABLE_ARTISANS).update(ligne).eq("id", id);
  if (error) return { ok: false, erreur: RESSAIE };
  await journaliser("action_admin", { userId: ad.id, payload: { action: appliquer ? "artisan_maj_appliquee" : "artisan_maj_traitee", artisan: id } });
  revalidatePath("/admin", "layout");
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

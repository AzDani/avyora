"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getUser, estPro } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { verifierLimite } from "@/lib/ratelimit";
import { emailDemandeEnvoyee, emailDemandeSansArtisan, emailNouvelleDemandeArtisan, emailReponseArtisan, envoyerEmailSuivi } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";
import { BUCKET_ARTISANS, TABLE_ARTISANS, TABLE_DEMANDES, TABLE_MER, artisansDisponibles, candidatureDe } from "@/lib/data/reseau";
import { MIMES_ACCEPTES, TAILLE_MAX, aujourdhuiParis } from "@/lib/reseau/candidature";
import { MAX_PHOTOS_DEMANDE, estIssue, labelDelai, lireAvis, placesRestantes, validerDemandeDevis, type ArtisanPropose, type ErreursDemande, type EstimationJointe, type StatutMiseEnRelation } from "@/lib/reseau/demande";
import { departementDuCodePostal, nomDepartement } from "@/lib/reseau/departements";
import { labelMetier } from "@/lib/reseau/metiers";
import { afficherPortable } from "@/lib/telephone";
import { estimationProjet, lotsProjet, natureProjet } from "@/lib/estimateur/projet";

/**
 * Les demandes de devis du Réseau AVYORA (phase 2, 17/11/2026). Côté client : chercher les artisans de sa zone, envoyer
 * des photos, envoyer la demande (réservé à AVYORA Pro). Côté artisan : accepter ou refuser. Tout part de la SESSION ;
 * les tables n'ont aucune policy, seul ce code y écrit. L'estimation jointe est recalculée ICI depuis le projet du
 * client (jamais reçue du navigateur), et les coordonnées du client ne sont montrées qu'à l'artisan qui accepte.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function urlSite(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}
function destinataireInterne(): string {
  const v = process.env.ACCOMPAGNEMENT_TO?.trim();
  return v && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v) ? v : DESTINATAIRE_DEFAUT;
}

type ErreurDevis = "session" | "pro" | "limite" | "invalide" | "type" | "taille" | "serveur";

/** Le compte connecté, s'il a droit aux demandes de devis (AVYORA Pro ; pendant la bêta, tout compte confirmé). */
async function clientPro(): Promise<{ ok: true; user: NonNullable<Awaited<ReturnType<typeof getUser>>> } | { ok: false; erreur: ErreurDevis }> {
  const user = await getUser();
  if (!user?.email) return { ok: false, erreur: "session" };
  if (!estPro(user)) return { ok: false, erreur: "pro" };
  return { ok: true, user };
}

/** Les artisans que le client peut choisir pour ces travaux, à ce code postal. */
export async function chercherArtisans(q: { codePostal: string; metiers: string[] }): Promise<{ ok: true; artisans: ArtisanPropose[]; departement: string } | { ok: false; erreur: ErreurDevis }> {
  const c = await clientPro();
  if (!c.ok) return c;
  const dep = departementDuCodePostal(String(q?.codePostal ?? ""));
  const metiers = Array.isArray(q?.metiers) ? q.metiers.filter((m): m is string => typeof m === "string").slice(0, 20) : [];
  if (!dep || !metiers.length) return { ok: false, erreur: "invalide" };
  if (!(await verifierLimite("devisRecherche", c.user.id))) return { ok: false, erreur: "limite" };
  try {
    return { ok: true, artisans: await artisansDisponibles(dep, metiers, c.user.id), departement: dep };
  } catch {
    return { ok: false, erreur: "serveur" };
  }
}

/** Une URL d'envoi signée pour une photo de la demande, dans `demandes/<compte>/`. Images seulement, 10 Mo au plus. */
export async function preparerPhotoDemande(f: { taille: number; mime: string }): Promise<{ ok: true; chemin: string; jeton: string } | { ok: false; erreur: ErreurDevis }> {
  const c = await clientPro();
  if (!c.ok) return c;
  if (typeof f?.mime !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(f.mime)) return { ok: false, erreur: "type" };
  if (!(typeof f.taille === "number" && f.taille > 0 && f.taille <= TAILLE_MAX)) return { ok: false, erreur: "taille" };
  if (!(await verifierLimite("artisanFichier", `devis:${c.user.id}`))) return { ok: false, erreur: "limite" };
  const chemin = `demandes/${c.user.id}/${randomUUID()}.${MIMES_ACCEPTES[f.mime as keyof typeof MIMES_ACCEPTES]}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).createSignedUploadUrl(chemin);
  if (error || !data) return { ok: false, erreur: "serveur" };
  return { ok: true, chemin: data.path, jeton: data.token };
}

/**
 * Envoie la demande : validation, photos vérifiées dans le dossier du compte, artisans choisis revérifiés (validés,
 * de la zone, du métier, décennale en cours), estimation recalculée depuis SON projet. Chaque artisan reçoit un e-mail
 * sans les coordonnées du client ; le client reçoit un récapitulatif ; sans artisan, Daniel est prévenu.
 */
export async function envoyerDemandeDevis(brut: unknown): Promise<{ ok: true; id: string } | { ok: false; erreur?: ErreurDevis; erreurs?: ErreursDemande }> {
  const c = await clientPro();
  if (!c.ok) return c;
  const user = c.user;
  const v = validerDemandeDevis(brut);
  const photosBrutes = Array.isArray((brut as { photos?: unknown })?.photos) ? ((brut as { photos: unknown[] }).photos.filter((p): p is string => typeof p === "string")) : [];
  const prefixe = `demandes/${user.id}/`;
  const photosMalFormees = photosBrutes.length > MAX_PHOTOS_DEMANDE || photosBrutes.some((p) => !p.startsWith(prefixe) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p.slice(prefixe.length)));
  if (!v.ok || photosMalFormees) return { ok: false, erreurs: { ...(v.ok ? {} : v.erreurs), ...(photosMalFormees ? { photos: "invalide" } : {}) } };
  const d = v.d;

  const sb = supabaseAdmin();
  const dep = departementDuCodePostal(d.codePostal)!;

  // Les photos : présentes dans le stockage, dans le dossier du compte.
  const photos = [...new Set(photosBrutes)];
  if (photos.length) {
    const { data: objets } = await sb.storage.from(BUCKET_ARTISANS).list(prefixe.slice(0, -1), { limit: 1000 });
    // Présentes, et vraiment des images (le stockage accepte aussi les PDF des attestations).
    const images = new Set(
      (objets ?? [])
        .filter((o) => ["image/jpeg", "image/png", "image/webp"].includes(String((o.metadata as { mimetype?: string } | null)?.mimetype ?? "")))
        .map((o) => `${prefixe}${o.name}`),
    );
    if (photos.some((p) => !images.has(p))) return { ok: false, erreurs: { photos: "invalide" } };
  }

  // Les artisans choisis : toujours disponibles pour CES travaux, dans CE département.
  let choisis: { id: string; user_id: string; nom: string; contact_nom: string; email: string }[] = [];
  if (d.artisans.length) {
    const { data, error } = await sb
      .from(TABLE_ARTISANS)
      .select("id, user_id, raison_sociale, nom_commercial, contact_nom, email")
      .in("id", d.artisans)
      .eq("statut", "valide")
      .contains("departements", [dep])
      .overlaps("metiers", [...new Set([...d.metiers, "tce"])])
      .gte("decennale_fin", aujourdhuiParis());
    if (error) return { ok: false, erreur: "serveur" };
    const lignes = (data ?? []) as { id: string; user_id: string; raison_sociale: string; nom_commercial: string | null; contact_nom: string; email: string }[];
    if (lignes.length !== d.artisans.length || lignes.some((l) => l.user_id === user.id)) return { ok: false, erreurs: { artisans: "indisponible" } };
    choisis = lignes.map((l) => ({ id: l.id, user_id: l.user_id, nom: l.nom_commercial || l.raison_sociale, contact_nom: l.contact_nom, email: l.email }));
  }
  // Aucun artisan choisi alors qu'il y en a dans la zone : le client doit en choisir (la demande « sans artisan » est
  // réservée aux zones encore vides, celles où Daniel doit recruter).
  if (!choisis.length) {
    const dispo = await artisansDisponibles(dep, d.metiers, user.id).catch(() => []);
    if (dispo.some((a) => a.id)) return { ok: false, erreurs: { artisans: "choisir" } };
  }

  // L'estimation : seulement depuis un projet DU COMPTE, recalculée ici.
  let projetId: string | null = null;
  let estimation: EstimationJointe | null = null;
  if (d.projetId) {
    const { data: p } = await sb.from("projects").select("id, owner_id, type_bien, surface, reponses").eq("id", d.projetId).eq("owner_id", user.id).maybeSingle();
    if (p) {
      projetId = String(p.id);
      const est = d.joindreEstimation ? estimationProjet(p.reponses) : null;
      if (est) {
        estimation = {
          ttc: Math.round(est.ttc), surface: Math.round(Number(p.surface) || est.surface), typeBien: String(p.type_bien ?? ""), nature: natureProjet(p.reponses),
          lots: lotsProjet(p.reponses).map((l) => ({ lot: l.corps, ttc: Math.round(l.ttc) })).slice(0, 40),
        };
      }
    }
  }

  // Le quota du jour ne compte que les demandes qui partent vraiment (pas les essais refusés plus haut).
  if (!(await verifierLimite("devisDemande", user.id))) return { ok: false, erreur: "limite" };

  const { data: ins, error: errIns } = await sb
    .from(TABLE_DEMANDES)
    .insert({
      client_id: user.id, projet_id: projetId, metiers: d.metiers, code_postal: d.codePostal, departement: dep, ville: d.ville || null, adresse: d.adresse || null,
      description: d.description || null, quantites: d.quantites || null, delai: d.delai || null, photos, estimation,
      prenom: d.prenom, telephone: d.telephone, email: user.email, consentement_le: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (errIns || !ins) return { ok: false, erreur: "serveur" };
  const id = String(ins.id);

  if (choisis.length) {
    const { error } = await sb.from(TABLE_MER).insert(choisis.map((a) => ({ demande_id: id, artisan_id: a.id })));
    if (error) {
      await sb.from(TABLE_DEMANDES).delete().eq("id", id);
      return { ok: false, erreur: "serveur" };
    }
  }

  const travaux = d.metiers.map(labelMetier);
  const lieu = `${d.ville ? `${d.ville}, ` : ""}${nomDepartement(dep)} (${d.codePostal})`;
  for (const a of choisis) {
    const m = emailNouvelleDemandeArtisan({ nomArtisan: a.contact_nom, travaux, lieu, delai: labelDelai(d.delai || null), avecEstimation: !!estimation, espaceUrl: `${urlSite()}/espace-artisan#demandes` });
    await envoyerEmailSuivi({ to: a.email, subject: m.subject, html: m.html, replyTo: destinataireInterne() });
  }
  const recap = emailDemandeEnvoyee({ prenom: d.prenom, artisans: choisis.map((a) => a.nom), suiviUrl: `${urlSite()}/demandes-devis` });
  await envoyerEmailSuivi({ to: user.email!, subject: recap.subject, html: recap.html, replyTo: destinataireInterne() });
  if (!choisis.length) {
    const m = emailDemandeSansArtisan({ travaux, lieu, adminUrl: `${urlSite()}/admin/devis` });
    await envoyerEmailSuivi({ to: destinataireInterne(), subject: m.subject, html: m.html });
  }
  await journaliser("demande_devis", { userId: user.id, payload: { demande: id, artisans: choisis.length } });

  revalidatePath("/demandes-devis");
  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

/**
 * La réponse de l'artisan à une demande : accepter (ses coordonnées partent au client, celles du client s'affichent
 * pour lui) ou refuser. Seulement un artisan VALIDÉ, sur SA mise en relation, encore en attente.
 */
export async function repondreDemande(miseId: string, reponse: "accepter" | "refuser"): Promise<{ ok: boolean; erreur?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (typeof miseId !== "string" || !UUID.test(miseId) || (reponse !== "accepter" && reponse !== "refuser")) return { ok: false, erreur: "Demande invalide." };
  let artisan;
  try {
    artisan = await candidatureDe(user.id);
  } catch {
    return { ok: false, erreur: "Réessaie dans un instant." };
  }
  if (!artisan || artisan.statut !== "valide") return { ok: false, erreur: "Ta participation au réseau n'est pas active." };

  const sb = supabaseAdmin();
  const statut = reponse === "accepter" ? "acceptee" : "refusee";
  const { data: maj, error } = await sb
    .from(TABLE_MER)
    .update({ statut, repondu_le: new Date().toISOString() })
    .eq("id", miseId)
    .eq("artisan_id", artisan.id)
    .eq("statut", "envoyee")
    .select("demande_id");
  if (error) return { ok: false, erreur: "Réessaie dans un instant." };
  if (!maj?.length) return { ok: false, erreur: "Cette demande a déjà reçu ta réponse." };

  const { data: dem } = await sb.from(TABLE_DEMANDES).select("prenom, email").eq("id", String(maj[0].demande_id)).maybeSingle();
  if (dem) {
    const nom = artisan.nomCommercial || artisan.raisonSociale;
    const m = emailReponseArtisan({
      prenom: String(dem.prenom), nomArtisan: nom, acceptee: statut === "acceptee",
      contact: statut === "acceptee" ? { nom: artisan.contactNom, telephone: afficherPortable(artisan.telephone), email: artisan.email } : undefined,
      suiviUrl: `${urlSite()}/demandes-devis`,
    });
    await envoyerEmailSuivi({ to: String(dem.email), subject: m.subject, html: m.html, replyTo: statut === "acceptee" ? artisan.email : destinataireInterne() });
  }
  await journaliser("reponse_devis", { userId: user.id, payload: { mise: miseId, statut } });
  revalidatePath("/espace-artisan");
  return { ok: true };
}

/* ─── Phase 3 : suivi, avis, remplacement d'un artisan ───────────────────────── */

/** L'artisan annonce qu'il a envoyé son devis (seulement sur SA mise en relation acceptée, une fois). */
export async function marquerDevisEnvoye(miseId: string): Promise<{ ok: boolean; erreur?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (typeof miseId !== "string" || !UUID.test(miseId)) return { ok: false, erreur: "Demande invalide." };
  let artisan;
  try {
    artisan = await candidatureDe(user.id);
  } catch {
    return { ok: false, erreur: "Réessaie dans un instant." };
  }
  if (!artisan || artisan.statut !== "valide") return { ok: false, erreur: "Ta participation au réseau n'est pas active." };
  const { data, error } = await supabaseAdmin()
    .from(TABLE_MER)
    .update({ devis_envoye_le: new Date().toISOString() })
    .eq("id", miseId)
    .eq("artisan_id", artisan.id)
    .eq("statut", "acceptee")
    .is("devis_envoye_le", null)
    .select("id");
  if (error) return { ok: false, erreur: "Réessaie dans un instant." };
  if (!data?.length) return { ok: false, erreur: "C'est déjà noté." };
  revalidatePath("/espace-artisan");
  return { ok: true };
}

/** La mise en relation d'une demande DU CLIENT connecté, acceptée par l'artisan ; null sinon. */
async function miseAccepteeDuClient(miseId: string, clientId: string): Promise<{ id: string } | null> {
  if (typeof miseId !== "string" || !UUID.test(miseId)) return null;
  const sb = supabaseAdmin();
  const { data: m } = await sb.from(TABLE_MER).select("id, demande_id, statut").eq("id", miseId).eq("statut", "acceptee").maybeSingle();
  if (!m) return null;
  const { data: d } = await sb.from(TABLE_DEMANDES).select("id").eq("id", String(m.demande_id)).eq("client_id", clientId).maybeSingle();
  return d ? { id: String(m.id) } : null;
}

/** Le client indique où il en est avec un artisan qui a accepté : devis reçu, signé, pas retenu (ou rien). */
export async function suivreArtisan(miseId: string, issue: string | null): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user || (issue !== null && !estIssue(issue))) return { ok: false };
  const m = await miseAccepteeDuClient(miseId, user.id);
  if (!m) return { ok: false };
  const { error } = await supabaseAdmin().from(TABLE_MER).update({ issue, issue_le: issue ? new Date().toISOString() : null }).eq("id", m.id).eq("statut", "acceptee");
  if (error) return { ok: false };
  revalidatePath("/demandes-devis");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** L'avis du client sur un artisan qui a accepté sa demande (modifiable). Visible par Daniel seul pour l'instant. */
export async function laisserAvis(miseId: string, note: number, commentaire: string): Promise<{ ok: boolean }> {
  const user = await getUser();
  const avis = lireAvis(note, commentaire);
  if (!user || !avis) return { ok: false };
  const m = await miseAccepteeDuClient(miseId, user.id);
  if (!m) return { ok: false };
  const { error } = await supabaseAdmin()
    .from(TABLE_MER)
    .update({ avis_note: avis.note, avis_commentaire: avis.commentaire, avis_le: new Date().toISOString() })
    .eq("id", m.id)
    .eq("statut", "acceptee");
  if (error) return { ok: false };
  await journaliser("reponse_devis", { userId: user.id, payload: { mise: m.id, avis: avis.note } });
  revalidatePath("/demandes-devis");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Le client ajoute un ou plusieurs artisans à sa demande, à la place de ceux qui ont refusé ou n'ont pas répondu :
 * 3 en cours au plus, 6 contactés au total (`placesRestantes`, tenu aussi par la base). Mêmes règles qu'à l'envoi :
 * validés, de la zone, du métier, décennale en cours, ni déjà contactés ni le client lui-même.
 */
export async function ajouterArtisans(demandeId: string, ids: string[]): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const c = await clientPro();
  if (!c.ok) return { ok: false, erreur: c.erreur === "pro" ? "Réservé à AVYORA Pro." : "Ta session a expiré : reconnecte-toi." };
  const user = c.user;
  const choix = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string" && UUID.test(x)))] : [];
  if (typeof demandeId !== "string" || !UUID.test(demandeId) || !choix.length) return { ok: false, erreur: "Choisis au moins un artisan." };

  const sb = supabaseAdmin();
  const { data: d } = await sb.from(TABLE_DEMANDES).select("id, metiers, departement, code_postal, ville, delai, estimation, prenom").eq("id", demandeId).eq("client_id", user.id).maybeSingle();
  if (!d) return { ok: false, erreur: "Demande introuvable." };
  const { data: merData, error: errMer } = await sb.from(TABLE_MER).select("artisan_id, statut").eq("demande_id", demandeId);
  if (errMer) return { ok: false, erreur: "Réessaie dans un instant." };
  const existants = (merData ?? []) as { artisan_id: string; statut: StatutMiseEnRelation }[];
  if (choix.length > placesRestantes(existants.map((m) => m.statut))) return { ok: false, erreur: "Tu ne peux plus ajouter autant d'artisans à cette demande." };
  if (choix.some((x) => existants.some((m) => m.artisan_id === x))) return { ok: false, erreur: "Un de ces artisans a déjà reçu ta demande." };

  const metiers = (d.metiers as string[]) ?? [];
  const { data: arts, error } = await sb
    .from(TABLE_ARTISANS)
    .select("id, user_id, raison_sociale, nom_commercial, contact_nom, email")
    .in("id", choix)
    .eq("statut", "valide")
    .neq("user_id", user.id)
    .contains("departements", [String(d.departement)])
    .overlaps("metiers", [...new Set([...metiers, "tce"])])
    .gte("decennale_fin", aujourdhuiParis());
  if (error) return { ok: false, erreur: "Réessaie dans un instant." };
  const lignes = (arts ?? []) as { id: string; contact_nom: string; email: string }[];
  if (lignes.length !== choix.length) return { ok: false, erreur: "Un artisan choisi n'est plus disponible : recharge la page." };
  if (!(await verifierLimite("devisRecherche", user.id))) return { ok: false, erreur: "Trop d'essais : réessaie plus tard." };

  const { error: errIns } = await sb.from(TABLE_MER).insert(lignes.map((a) => ({ demande_id: demandeId, artisan_id: a.id })));
  if (errIns) return { ok: false, erreur: "Ajout impossible : recharge la page et réessaie." };

  const lieu = `${d.ville ? `${d.ville}, ` : ""}${nomDepartement(String(d.departement))} (${d.code_postal})`;
  for (const a of lignes) {
    const m = emailNouvelleDemandeArtisan({ nomArtisan: a.contact_nom, travaux: metiers.map(labelMetier), lieu, delai: labelDelai((d.delai as string | null) ?? null), avecEstimation: !!d.estimation, espaceUrl: `${urlSite()}/espace-artisan#demandes` });
    await envoyerEmailSuivi({ to: a.email, subject: m.subject, html: m.html, replyTo: destinataireInterne() });
  }
  await journaliser("demande_devis", { userId: user.id, payload: { demande: demandeId, ajoutes: lignes.length } });
  revalidatePath("/demandes-devis");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

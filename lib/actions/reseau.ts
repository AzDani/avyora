"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { verifierLimite } from "@/lib/ratelimit";
import { emailArtisan, emailCandidatureArtisan, envoyerEmailSuivi } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";
import { BUCKET_ARTISANS, TABLE_ARTISANS, TABLE_DOCUMENTS, candidatureDe, documentsDe } from "@/lib/data/reseau";
import { estComptePro } from "@/lib/compte/type";
import { candidatureModifiable, lireDocument, type DocumentArtisan } from "@/lib/reseau/artisan";
import {
  DOCS, MIMES_ACCEPTES, TAILLE_MAX, TYPES_DOCUMENTS, documentsManquants, mimeAccepte, validerCandidature,
  type ErreursCandidature, type TypeDocument,
} from "@/lib/reseau/candidature";
import { normaliserSiret, siretCoherent, verifierSiret, type VerifSiret } from "@/lib/reseau/siret";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";

/**
 * Les actions de l'artisan qui postule au Réseau AVYORA (/espace-artisan). Toutes partent de la SESSION (getUser) :
 * l'identifiant du compte ne vient jamais du navigateur. Les tables et le stockage n'ont aucune policy : seul ce code,
 * avec la clé service_role, y écrit, et seulement dans la ligne et le dossier du compte connecté. Une candidature ne se
 * modifie que tant qu'elle n'est pas envoyée, ou quand Daniel a demandé un complément (`candidatureModifiable`).
 */

type Erreur = "session" | "verrouille" | "limite" | "type" | "taille" | "trop" | "introuvable" | "serveur" | "pro";

function urlSite(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}
function destinataireInterne(): string {
  const v = process.env.ACCOMPAGNEMENT_TO?.trim();
  return v && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v) ? v : DESTINATAIRE_DEFAUT;
}
/** Un nom de fichier affichable : sans chemin ni caractère de contrôle, 200 caractères au plus. */
function nomFichier(v: unknown): string {
  const s = String(v ?? "").split(/[\\/]/).pop()!.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, "").trim().slice(0, 200);
  return s || "fichier";
}
/** La candidature du compte peut-elle être modifiée ? Une lecture en panne répond NON (jamais « nouveau venu »). */
async function modifiable(userId: string): Promise<{ ok: true; existante: Awaited<ReturnType<typeof candidatureDe>> } | { ok: false; erreur: Erreur }> {
  try {
    const existante = await candidatureDe(userId);
    return candidatureModifiable(existante) ? { ok: true, existante } : { ok: false, erreur: "verrouille" };
  } catch {
    return { ok: false, erreur: "serveur" };
  }
}

const estType = (t: unknown): t is TypeDocument => typeof t === "string" && (TYPES_DOCUMENTS as string[]).includes(t);

/**
 * Peut-il déposer ce type de fichier ? Une candidature modifiable : tout, dans la limite de `DOCS`. Un artisan VALIDÉ
 * (25/11/2026) : sa nouvelle attestation décennale ou RC pro, depuis « Mon dossier » (10 au plus : les anciennes
 * restent pour l'historique) ; Daniel vérifie la nouvelle décennale avant de changer la date.
 */
async function peutDeposer(user: { id: string; app_metadata?: Record<string, unknown> | null }, type: TypeDocument): Promise<{ ok: true; max: number } | { ok: false; erreur: Erreur }> {
  const userId = user.id;
  const m = await modifiable(userId);
  // Une NOUVELLE candidature : seulement un compte pro (26/11/2026). Une candidature déjà commencée continue.
  if (m.ok && !m.existante && !estComptePro(user)) return { ok: false, erreur: "pro" };
  if (m.ok) return { ok: true, max: DOCS[type].max };
  if (m.erreur !== "verrouille" || (type !== "decennale" && type !== "rc_pro")) return m;
  try {
    const a = await candidatureDe(userId);
    return a?.statut === "valide" ? { ok: true, max: 10 } : { ok: false, erreur: "verrouille" };
  } catch {
    return { ok: false, erreur: "serveur" };
  }
}

/** Vérifie un SIRET pendant la saisie (nom de l'entreprise, état). Compte connecté, 20 par heure. */
export async function verifierMonSiret(saisie: string): Promise<{ ok: true; verif: VerifSiret } | { ok: false; erreur: "session" | "invalide" | "cle" | "limite" }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "session" };
  const siret = normaliserSiret(String(saisie ?? ""));
  if (!siret) return { ok: false, erreur: "invalide" };
  if (!siretCoherent(siret)) return { ok: false, erreur: "cle" };
  if (!(await verifierLimite("artisanSiret", user.id))) return { ok: false, erreur: "limite" };
  return { ok: true, verif: await verifierSiret(siret) };
}

/**
 * Prépare l'envoi d'un fichier : une URL d'envoi signée, à usage unique, vers `<compte>/<type>/<aléa>.<ext>`. Le
 * navigateur envoie le fichier directement au stockage (pas de limite de taille des actions serveur), puis appelle
 * `enregistrerDocument`. Le stockage refuse lui-même plus de 10 Mo et tout autre type que PDF, JPEG, PNG, WebP.
 */
export async function preparerEnvoiDocument(f: { type: string; taille: number; mime: string }): Promise<{ ok: true; chemin: string; jeton: string } | { ok: false; erreur: Erreur }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "session" };
  if (!estType(f?.type) || typeof f.mime !== "string" || !mimeAccepte(f.type, f.mime)) return { ok: false, erreur: "type" };
  if (!(typeof f.taille === "number" && f.taille > 0 && f.taille <= TAILLE_MAX)) return { ok: false, erreur: "taille" };
  const m = await peutDeposer(user, f.type);
  if (!m.ok) return m;
  const deja = (await documentsDe(user.id)).filter((d) => d.type === f.type).length;
  if (deja >= m.max) return { ok: false, erreur: "trop" };
  if (!(await verifierLimite("artisanFichier", user.id))) return { ok: false, erreur: "limite" };

  const chemin = `${user.id}/${f.type}/${randomUUID()}.${MIMES_ACCEPTES[f.mime as keyof typeof MIMES_ACCEPTES]}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).createSignedUploadUrl(chemin);
  if (error || !data) return { ok: false, erreur: "serveur" };
  return { ok: true, chemin: data.path, jeton: data.token };
}

/** Enregistre un fichier envoyé : il doit être dans le dossier du compte, présent dans le stockage, du bon type. */
export async function enregistrerDocument(f: { type: string; chemin: string; nom: string }): Promise<{ ok: true; document: DocumentArtisan } | { ok: false; erreur: Erreur }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "session" };
  if (!estType(f?.type) || typeof f.chemin !== "string") return { ok: false, erreur: "type" };
  const prefixe = `${user.id}/${f.type}/`;
  const fichier = f.chemin.slice(prefixe.length);
  if (!f.chemin.startsWith(prefixe) || !/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(fichier)) return { ok: false, erreur: "introuvable" };
  const m = await peutDeposer(user, f.type);
  if (!m.ok) return m;

  const sb = supabaseAdmin();
  const { data: liste } = await sb.storage.from(BUCKET_ARTISANS).list(prefixe.slice(0, -1), { search: fichier, limit: 5 });
  const objet = (liste ?? []).find((o) => o.name === fichier);
  const meta = (objet?.metadata ?? {}) as { size?: number; mimetype?: string };
  if (!objet || typeof meta.size !== "number") return { ok: false, erreur: "introuvable" };
  const retirer = () => sb.storage.from(BUCKET_ARTISANS).remove([f.chemin]);
  if (!meta.mimetype || !mimeAccepte(f.type, meta.mimetype) || meta.size <= 0 || meta.size > TAILLE_MAX) {
    await retirer();
    return { ok: false, erreur: "type" };
  }
  const deja = (await documentsDe(user.id)).filter((d) => d.type === f.type).length;
  if (deja >= m.max) {
    await retirer();
    return { ok: false, erreur: "trop" };
  }
  const { data, error } = await sb
    .from(TABLE_DOCUMENTS)
    .insert({ user_id: user.id, type: f.type, chemin: f.chemin, nom: nomFichier(f.nom), taille: meta.size, mime: meta.mimetype })
    .select("id, type, chemin, nom, taille, mime, created_at")
    .single();
  if (error || !data) {
    await retirer();
    return { ok: false, erreur: "serveur" };
  }
  return { ok: true, document: lireDocument(data as Record<string, unknown>) };
}

/** Retire un fichier déposé (le sien seulement, tant que la candidature est modifiable). */
export async function supprimerDocument(id: string): Promise<{ ok: boolean; erreur?: Erreur }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "session" };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erreur: "introuvable" };
  const m = await modifiable(user.id);
  if (!m.ok) return m;
  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_DOCUMENTS).select("chemin").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return { ok: false, erreur: "introuvable" };
  await sb.storage.from(BUCKET_ARTISANS).remove([String(data.chemin)]);
  const { error } = await sb.from(TABLE_DOCUMENTS).delete().eq("id", id).eq("user_id", user.id);
  return error ? { ok: false, erreur: "serveur" } : { ok: true };
}

/**
 * Envoie la candidature : tout est revérifié ici (champs, documents, SIRET auprès du répertoire des entreprises). Un
 * établissement FERMÉ est refusé ; une API muette ou un SIRET pas encore listé ne bloque pas (Daniel le voit et
 * relance la vérification). La candidature passe « à examiner » ; Daniel et l'artisan reçoivent un e-mail.
 */
export async function soumettreCandidature(brut: unknown): Promise<{ ok: true } | { ok: false; erreur?: Erreur; erreurs?: ErreursCandidature }> {
  const user = await getUser();
  if (!user?.email) return { ok: false, erreur: "session" };
  const m = await modifiable(user.id);
  if (!m.ok) return m;
  const existante = m.existante;
  // Le réseau est réservé aux professionnels du bâtiment (26/11/2026) : une nouvelle candidature exige un compte pro.
  if (!existante && !estComptePro(user)) return { ok: false, erreur: "pro" };

  const v = validerCandidature(brut);
  const docs = await documentsDe(user.id);
  const compte = Object.fromEntries(TYPES_DOCUMENTS.map((t) => [t, docs.filter((d) => d.type === t).length]));
  const manque = documentsManquants(compte);
  if (!v.ok || manque) return { ok: false, erreurs: { ...(v.ok ? {} : v.erreurs), ...(manque ? { documents: manque } : {}) } };
  if (!(await verifierLimite("artisanEnvoi", user.id))) return { ok: false, erreur: "limite" };

  const c = v.c;
  const verif = await verifierSiret(c.siret);
  if (verif.statut === "ferme") return { ok: false, erreurs: { siret: "ferme" } };

  const maintenant = new Date().toISOString();
  const ligne = {
    user_id: user.id,
    statut: "en_attente",
    siret: c.siret,
    raison_sociale: verif.nom ?? (c.nomCommercial || c.contactNom),
    nom_commercial: c.nomCommercial || null,
    siret_verif: verif,
    contact_nom: c.contactNom,
    telephone: c.telephone,
    email: user.email,
    metiers: c.metiers,
    departements: c.departements,
    presentation: c.presentation || null,
    site_web: c.siteWeb || null,
    lien_avis: c.lienAvis || null,
    rge: verif.rge === true,
    decennale_assureur: c.decennaleAssureur,
    decennale_police: c.decennalePolice,
    decennale_fin: c.decennaleFin,
    conditions_acceptees_le: maintenant,
    soumise_le: maintenant,
    updated_at: maintenant,
    message_admin: null,
    // Un renvoi après complément peut tout changer (SIRET, assureur, pièces) : l'appel est à refaire avant de valider.
    ...(existante ? { appel_le: null } : {}),
  };
  // Première candidature : une insertion (un second envoi simultané échoue sur l'unicité du compte). Après un complément
  // demandé : une mise à jour, seulement si la candidature est TOUJOURS « à compléter » (jamais par-dessus une décision).
  const sb = supabaseAdmin();
  const { data, error } = existante
    ? await sb.from(TABLE_ARTISANS).update(ligne).eq("user_id", user.id).eq("statut", "a_completer").select("id").maybeSingle()
    : await sb.from(TABLE_ARTISANS).insert(ligne).select("id").single();
  if (error || !data) return { ok: false, erreur: existante ? "verrouille" : "serveur" };
  const id = String(data.id);
  const completee = !!existante;

  const STATUT_SIRET: Record<VerifSiret["statut"], string> = { actif: "actif", ferme: "fermé", introuvable: "introuvable dans le répertoire", indisponible: "pas encore vérifié" };
  const interne = emailCandidatureArtisan({
    raisonSociale: ligne.raison_sociale, contactNom: c.contactNom, telephone: c.telephone, email: user.email,
    metiers: c.metiers.map(labelMetier), zone: resumeDepartements(c.departements), siret: c.siret,
    siretStatut: STATUT_SIRET[verif.statut], completee, ficheUrl: `${urlSite()}/admin/artisans/${id}`,
  });
  const issueInterne = await envoyerEmailSuivi({ to: destinataireInterne(), subject: interne.subject, html: interne.html, replyTo: user.email });
  const accuse = emailArtisan("recue", { nom: c.contactNom, espaceUrl: `${urlSite()}/espace-artisan` });
  const issueAccuse = await envoyerEmailSuivi({ to: user.email, subject: accuse.subject, html: accuse.html, replyTo: destinataireInterne() });
  await journaliser("candidature_artisan", { userId: user.id, payload: { artisan: id, completee, envoi_interne: issueInterne, envoi_accuse: issueAccuse } });

  revalidatePath("/espace-artisan", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

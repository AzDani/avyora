/**
 * Avis publics et galerie du Réseau AVYORA (décisions de Dani du 25/11/2026). Module pur, partagé par les formulaires
 * et les actions serveur (lib/actions/avis.ts), qui revérifient tout.
 *
 * Avis : le client qui a été mis en relation (l'artisan a ACCEPTÉ sa demande) note l'artisan, écrit son avis, donne le
 * mois des travaux et jusqu'à 6 photos. Daniel le lit avant publication et ne le refuse que pour un motif de
 * `MOTIFS_REFUS` (L111-7-2 du Code de la consommation : un avis négatif mais correct est publié). Modifiable tant qu'il
 * n'est pas publié ; publié, il est figé (la base le refuse aussi, migration 0012). L'artisan peut répondre (réponse
 * validée aussi) et signaler un avis ; il ne peut pas le supprimer. Visible par les membres AVYORA Pro.
 *
 * Galerie : un artisan validé publie ses réalisations (titre, description, ville, mois, 1 à 10 photos) sans validation ;
 * Daniel peut en retirer une après coup.
 */

export const MAX_PHOTOS_AVIS = 6;
export const MAX_PHOTOS_REALISATION = 10;
export const MIN_TEXTE_AVIS = 20;
export const MAX_TEXTE_AVIS = 1000;
/** L'alerte « ta décennale arrive à échéance », dans l'espace artisan. */
export const ALERTE_DECENNALE_JOURS = 30;

export type StatutAvis = "en_attente" | "publie" | "refuse" | "retire";
export type StatutReponse = "en_attente" | "publie" | "refuse";

/** Les motifs de refus, publiés sur les pages des avis. Le texte part à l'auteur avec le refus. */
export const MOTIFS_REFUS = [
  ["injurieux", "Insultes, propos injurieux ou discriminatoires"],
  ["donnees", "Données personnelles (nom complet, téléphone, adresse, plaque)"],
  ["hors_sujet", "Hors sujet : l'avis ne parle pas des travaux ni de l'artisan"],
  ["non_authentique", "Avis non authentique (écrit par l'artisan, un concurrent, ou contre une contrepartie)"],
  ["photo", "Photo inadaptée (visage reconnaissable, adresse lisible, sans rapport avec les travaux)"],
] as const;
export type MotifRefus = (typeof MOTIFS_REFUS)[number][0];
export const estMotif = (v: unknown): v is MotifRefus => MOTIFS_REFUS.some(([k]) => k === v);
export const labelMotif = (v: string | null | undefined) => (v ? MOTIFS_REFUS.find(([k]) => k === v)?.[1] ?? v : "");

/**
 * Les motifs de refus de la RÉPONSE d'un artisan à un avis (26/11/2026) : ceux des avis ne collaient pas (« l'avis ne
 * parle pas… », « photo inadaptée » pour un texte sans photo). Le libellé est enregistré et envoyé à l'artisan.
 */
export const MOTIFS_REFUS_REPONSE = [
  ["injurieux", "Insultes ou propos injurieux envers le client"],
  ["donnees", "Données personnelles du client (nom complet, adresse, téléphone)"],
  ["hors_sujet", "Hors sujet : la réponse ne parle pas de l'avis ni des travaux"],
  ["publicite", "Publicité ou démarchage (promotion, lien, autre numéro de contact)"],
] as const;
export type MotifRefusReponse = (typeof MOTIFS_REFUS_REPONSE)[number][0];
export const estMotifReponse = (v: unknown): v is MotifRefusReponse => MOTIFS_REFUS_REPONSE.some(([k]) => k === v);
export const labelMotifReponse = (v: string | null | undefined) => (v ? MOTIFS_REFUS_REPONSE.find(([k]) => k === v)?.[1] ?? v : "");

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Un texte saisi : sans caractère de contrôle (les retours à la ligne restent), espaces retirés, coupé à `max`. */
export function nettoyerTexte(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** « 2026-10 » (ou « 2026-10-01 ») → le premier jour du mois « 2026-10-01 », s'il n'est ni futur ni à plus de 10 ans. */
export function lireMois(v: unknown, maintenant = new Date()): string | null {
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(String(v ?? ""));
  if (!m) return null;
  const a = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const courant = maintenant.getFullYear() * 12 + maintenant.getMonth();
  const saisi = a * 12 + (mo - 1);
  if (saisi > courant || saisi < courant - 120) return null;
  return `${m[1]}-${m[2]}-01`;
}

/** « 2026-10-01 » → « octobre 2026 ». */
export function labelMois(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return "";
  return `${MOIS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
}

/** Les 24 derniers mois, du plus récent au plus ancien, pour le sélecteur « quand les travaux ont-ils été faits ? ». */
export function moisRecents(maintenant = new Date(), n = 24): { v: string; label: string }[] {
  const out: { v: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ v, label: labelMois(v) });
  }
  return out;
}

/**
 * Le nom affiché sous un avis : le prénom et l'initiale du nom (« Julie M. »). Le nom vient du compte s'il a deux mots
 * ou plus, sinon le prénom de la demande seul. Jamais d'adresse e-mail.
 */
export function auteurAffiche(prenomDemande: string, nomCompte?: string | null): string {
  const propre = (s: string) => s.replace(/[^\p{L}\p{M}' -]/gu, "").replace(/\s+/g, " ").trim();
  const mots = propre(String(nomCompte ?? "")).split(" ").filter(Boolean);
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1);
  if (mots.length >= 2) return `${cap(mots[0])} ${mots[mots.length - 1].charAt(0).toLocaleUpperCase("fr-FR")}.`.slice(0, 60);
  const p = propre(prenomDemande).split(" ")[0] || "Client";
  return cap(p).slice(0, 60);
}

export type AvisSaisi = { note: number; texte: string; mois: string; photos: string[] };
export type ErreursAvis = Partial<Record<"note" | "texte" | "mois" | "photos", string>>;

/** L'avis envoyé par le client. Les photos ne sont ici que comptées : leur dossier est vérifié côté serveur. */
export function validerAvis(brut: unknown, maintenant = new Date()): { ok: true; a: AvisSaisi } | { ok: false; erreurs: ErreursAvis } {
  const b = (brut ?? {}) as Record<string, unknown>;
  const erreurs: ErreursAvis = {};
  const note = typeof b.note === "number" ? b.note : Number(b.note);
  if (!Number.isInteger(note) || note < 1 || note > 5) erreurs.note = "Choisis une note de 1 à 5 étoiles.";
  const texte = nettoyerTexte(b.texte, MAX_TEXTE_AVIS);
  if (texte.length < MIN_TEXTE_AVIS) erreurs.texte = `Raconte en quelques mots comment ça s'est passé (${MIN_TEXTE_AVIS} caractères au moins).`;
  const mois = lireMois(b.mois, maintenant);
  if (!mois) erreurs.mois = "Indique le mois des travaux.";
  const photos = Array.isArray(b.photos) ? [...new Set(b.photos.filter((p): p is string => typeof p === "string"))] : [];
  if (photos.length > MAX_PHOTOS_AVIS) erreurs.photos = `${MAX_PHOTOS_AVIS} photos au plus.`;
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  return { ok: true, a: { note, texte, mois: mois!, photos } };
}

/** Le client peut-il (encore) écrire ou modifier son avis ? Oui sauf publié (figé) ou retiré. */
export const avisModifiable = (statut: StatutAvis | null | undefined) => statut !== "publie" && statut !== "retire";

/** La réponse publique de l'artisan : 2 à 1 000 caractères ; modifiable tant qu'elle n'est pas publiée. */
export function lireReponse(v: unknown): string | null {
  const t = nettoyerTexte(v, 1000);
  return t.length >= 2 ? t : null;
}
export const reponseModifiable = (statut: StatutReponse | null | undefined) => statut !== "publie";

export type RealisationSaisie = { titre: string; description: string; ville: string | null; mois: string | null; photos: string[] };
export type ErreursRealisation = Partial<Record<"titre" | "description" | "ville" | "mois" | "photos", string>>;

/** Une réalisation de la galerie. Photos comptées ici, vérifiées dans le dossier de l'artisan côté serveur. */
export function validerRealisation(brut: unknown, maintenant = new Date()): { ok: true; r: RealisationSaisie } | { ok: false; erreurs: ErreursRealisation } {
  const b = (brut ?? {}) as Record<string, unknown>;
  const erreurs: ErreursRealisation = {};
  const titre = nettoyerTexte(b.titre, 120).replace(/\n+/g, " ");
  if (titre.length < 3) erreurs.titre = "Donne un titre à ces travaux.";
  const description = nettoyerTexte(b.description, 1000);
  if (description.length < 10) erreurs.description = "Décris les travaux réalisés en quelques mots.";
  const ville = nettoyerTexte(b.ville, 80).replace(/\n+/g, " ") || null;
  const moisBrut = String(b.mois ?? "").trim();
  const mois = moisBrut ? lireMois(moisBrut, maintenant) : null;
  if (moisBrut && !mois) erreurs.mois = "Mois invalide.";
  const photos = Array.isArray(b.photos) ? [...new Set(b.photos.filter((p): p is string => typeof p === "string"))] : [];
  if (!photos.length) erreurs.photos = "Ajoute au moins une photo.";
  else if (photos.length > MAX_PHOTOS_REALISATION) erreurs.photos = `${MAX_PHOTOS_REALISATION} photos au plus.`;
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  return { ok: true, r: { titre, description, ville, mois, photos } };
}

export type ResumeNotes = { moyenne: number | null; n: number; repartition: [number, number, number, number, number] };

/** La moyenne (arrondie au dixième) et la répartition 5 → 1 étoiles des avis publiés. */
export function resumeNotes(notes: number[]): ResumeNotes {
  const ok = notes.filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  const rep: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const n of ok) rep[5 - n]++;
  return { moyenne: ok.length ? Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10 : null, n: ok.length, repartition: rep };
}

/** « 4,7 » */
export const noteFr = (n: number | null) => (n == null ? "–" : n.toFixed(1).replace(".", ","));

/** Le chemin d'une photo d'avis ou de galerie est-il bien dans le dossier attendu ? */
export function cheminPhotoValide(chemin: string, prefixe: string): boolean {
  return chemin.startsWith(prefixe) && /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(chemin.slice(prefixe.length));
}
export const prefixePhotosAvis = (clientId: string) => `avis/${clientId}/`;
export const prefixeGalerie = (userId: string) => `${userId}/galerie/`;

/** Jours avant la fin de la décennale (négatif si dépassée), à partir de dates « AAAA-MM-JJ ». */
export function joursAvant(finIso: string, aujourdhuiIso: string): number {
  const a = Date.parse(`${finIso}T00:00:00Z`), b = Date.parse(`${aujourdhuiIso}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((a - b) / 86_400_000) : 0;
}

/** La mise à jour qu'un artisan validé demande à Daniel (colonne `maj_demandee`, migration 0012). */
export type MajDemandee =
  | { type: "decennale"; assureur: string; police: string; fin: string; le: string }
  | { type: "message"; texte: string; le: string };

export function lireMaj(v: unknown): MajDemandee | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const le = typeof o.le === "string" ? o.le : "";
  if (o.type === "decennale" && typeof o.assureur === "string" && typeof o.police === "string" && typeof o.fin === "string") {
    return { type: "decennale", assureur: o.assureur, police: o.police, fin: o.fin, le };
  }
  if (o.type === "message" && typeof o.texte === "string") return { type: "message", texte: o.texte, le };
  return null;
}

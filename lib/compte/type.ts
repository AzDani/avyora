/**
 * Le type de compte (décision de Dani du 26/11/2026) : chaque inscrit dit s'il est PARTICULIER ou PROFESSIONNEL du
 * bâtiment. Les deux ont exactement les mêmes outils (estimer, dessiner, suivre, AVYORA Pro) ; être pro ajoute
 * seulement la possibilité de postuler au Réseau AVYORA. Un particulier ne peut pas y postuler, sauf s'il passe en
 * compte pro avec le SIRET actif d'une entreprise du bâtiment, vérifié automatiquement.
 *
 * Le type vit dans `app_metadata` (seul le serveur, avec la clé service_role, peut l'écrire) : un utilisateur ne peut
 * pas se déclarer pro en modifiant ses propres métadonnées depuis le navigateur. Module pur.
 */
import { normaliserPortable } from "@/lib/telephone";
import { CLES_METIERS } from "@/lib/reseau/metiers";

export type TypeCompte = "particulier" | "pro";

type AvecMeta = { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null } | null | undefined;

/** Le type choisi par le compte, ou null s'il ne l'a pas encore dit (comptes d'avant le 26/11/2026). */
export function typeCompte(user: AvecMeta): TypeCompte | null {
  const t = user?.app_metadata?.type_compte;
  return t === "particulier" || t === "pro" ? t : null;
}
export const estComptePro = (user: AvecMeta) => typeCompte(user) === "pro";

/** Toutes les régions de France, dans l'ordre alphabétique ; l'outre-mer à part, présenté tout en bas. */
export const REGIONS_FRANCE = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
] as const;
export const REGIONS_OUTRE_MER = ["Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"] as const;
export const estRegion = (v: unknown): v is string =>
  typeof v === "string" && ((REGIONS_FRANCE as readonly string[]).includes(v) || (REGIONS_OUTRE_MER as readonly string[]).includes(v));

/** Un texte court saisi : sans caractère de contrôle ni retour à la ligne, espaces réduits, coupé à `max`. */
export function texteCourt(v: unknown, max: number): string {
  return String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type ProjetParticulier = "reno" | "neuf" | "nsp";
export type ProfilParticulier = {
  prenom: string; telephone: string | null; objectif: "" | "residence" | "locatif" | "revente"; projet: "" | ProjetParticulier;
  maturite: string[]; region: string; canal: string;
};
export type ErreursParticulier = Partial<Record<"prenom" | "telephone" | "region", string>>;

const MATURITES = ["renseigne", "bien_en_vue", "terrain_en_vue", "terrain", "permis", "proprietaire", "travaux"];
const CANAUX = ["Google", "Réseaux sociaux", "Bouche-à-oreille", "Autre"];

/** Le questionnaire du particulier : seul le prénom est obligatoire ; un portable donné doit être lisible. */
export function validerParticulier(b: Record<string, unknown>): { ok: true; p: ProfilParticulier } | { ok: false; erreurs: ErreursParticulier } {
  const erreurs: ErreursParticulier = {};
  const prenom = texteCourt(b.prenom, 60);
  if (prenom.length < 1 || /[0-9@/:]/.test(prenom)) erreurs.prenom = "Indique ton prénom.";
  let telephone: string | null = null;
  const tel = texteCourt(b.telephone, 40);
  if (tel) {
    const r = normaliserPortable(tel);
    if (r.ok) telephone = r.tel;
    else erreurs.telephone = "Ce numéro n'est pas lisible : écris-le comme 06 12 34 56 78 (ou laisse-le vide).";
  }
  const region = typeof b.region === "string" ? b.region : "";
  if (region && !estRegion(region)) erreurs.region = "Choisis une région de la liste.";
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  const objectif = ["residence", "locatif", "revente"].includes(String(b.objectif)) ? (b.objectif as ProfilParticulier["objectif"]) : "";
  const projet = ["reno", "neuf", "nsp"].includes(String(b.projet)) ? (b.projet as ProjetParticulier) : "";
  const maturite = Array.isArray(b.maturite) ? [...new Set(b.maturite.filter((m): m is string => typeof m === "string" && MATURITES.includes(m)))] : [];
  const canal = CANAUX.includes(String(b.canal)) ? String(b.canal) : "";
  return { ok: true, p: { prenom, telephone, objectif, projet, maturite, region, canal } };
}

export type ProfilPro = { societe: string; nom: string; telephone: string; metier: string; region: string; siret: string | null };
export type ErreursPro = Partial<Record<keyof ProfilPro, string>>;

/** Le questionnaire du pro : société, nom, portable, métier principal et région obligatoires ; SIRET facultatif. */
export function validerPro(b: Record<string, unknown>): { ok: true; p: ProfilPro } | { ok: false; erreurs: ErreursPro } {
  const erreurs: ErreursPro = {};
  const societe = texteCourt(b.societe, 120);
  if (societe.length < 2) erreurs.societe = "Indique le nom de ta société.";
  const nom = texteCourt(b.nom, 120);
  if (nom.length < 2 || /[0-9@/:]/.test(nom)) erreurs.nom = "Indique ton prénom et ton nom.";
  const r = normaliserPortable(texteCourt(b.telephone, 40));
  if (!r.ok) erreurs.telephone = r.erreur === "vide" ? "Indique ton portable." : "Ce numéro n'est pas un portable lisible (06 ou 07).";
  const metier = String(b.metier ?? "");
  if (!(CLES_METIERS as readonly string[]).includes(metier)) erreurs.metier = "Choisis ton métier principal.";
  const region = String(b.region ?? "");
  if (!estRegion(region)) erreurs.region = "Choisis ta région.";
  const siretBrut = String(b.siret ?? "").replace(/\s+/g, "");
  if (siretBrut && !/^\d{14}$/.test(siretBrut)) erreurs.siret = "Un SIRET a 14 chiffres (ou laisse-le vide).";
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  return { ok: true, p: { societe, nom, telephone: r.ok ? r.tel : "", metier, region, siret: siretBrut || null } };
}

/**
 * Le profil « admin » d'un inscrit (lib/data/admin.ts lit `tuEs`, `objectif`, `maturite`, `region`, `canal`) : on garde
 * ces clés, dérivées des nouvelles réponses, pour que le tableau de bord et les fiches continuent de compter juste.
 */
export function tuEsDe(type: TypeCompte, objectif?: string): string[] {
  if (type === "pro") return ["pro"];
  return objectif === "locatif" ? ["particulier", "investisseur"] : ["particulier"];
}

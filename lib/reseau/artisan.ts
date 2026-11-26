import type { VerifSiret } from "./siret";
import { lireMaj, type MajDemandee } from "./avis";
import type { TypeDocument } from "./candidature";

/** Une candidature au Réseau AVYORA (table `artisans`, migration 0007), telle que le code la manipule. Module pur. */
export type StatutArtisan = "en_attente" | "a_completer" | "valide" | "refuse" | "suspendu";

export type Artisan = {
  id: string;
  userId: string;
  statut: StatutArtisan;
  siret: string;
  raisonSociale: string;
  nomCommercial: string | null;
  siretVerif: VerifSiret | null;
  contactNom: string;
  telephone: string;
  email: string;
  metiers: string[];
  departements: string[];
  presentation: string | null;
  siteWeb: string | null;
  lienAvis: string | null;
  rge: boolean;
  decennaleAssureur: string;
  decennalePolice: string;
  decennaleFin: string;
  soumiseLe: string;
  appelLe: string | null;
  valideLe: string | null;
  messageAdmin: string | null;
  notesAdmin: string | null;
  contactsEnvoyes: number;
  /** La mise à jour demandée par l'artisan validé (nouvelle décennale, métiers, zone), migration 0012. */
  majDemandee: MajDemandee | null;
};

export type DocumentArtisan = { id: string; type: TypeDocument; chemin: string; nom: string; taille: number; mime: string; createdAt: string };

export const COLONNES_ARTISAN =
  "id, user_id, statut, siret, raison_sociale, nom_commercial, siret_verif, contact_nom, telephone, email, metiers, departements, presentation, site_web, lien_avis, rge, decennale_assureur, decennale_police, decennale_fin, soumise_le, appel_le, valide_le, message_admin, notes_admin, contacts_envoyes, maj_demandee";

const STATUTS: StatutArtisan[] = ["en_attente", "a_completer", "valide", "refuse", "suspendu"];

export function lireArtisan(r: Record<string, unknown>): Artisan {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const n = (k: string) => (typeof r[k] === "string" && (r[k] as string) !== "" ? (r[k] as string) : null);
  const v = r.siret_verif && typeof r.siret_verif === "object" && "statut" in (r.siret_verif as object) ? (r.siret_verif as VerifSiret) : null;
  return {
    id: s("id"), userId: s("user_id"),
    statut: STATUTS.includes(r.statut as StatutArtisan) ? (r.statut as StatutArtisan) : "en_attente",
    siret: s("siret"), raisonSociale: s("raison_sociale"), nomCommercial: n("nom_commercial"), siretVerif: v,
    contactNom: s("contact_nom"), telephone: s("telephone"), email: s("email"),
    metiers: Array.isArray(r.metiers) ? (r.metiers as string[]) : [],
    departements: Array.isArray(r.departements) ? (r.departements as string[]) : [],
    presentation: n("presentation"), siteWeb: n("site_web"), lienAvis: n("lien_avis"), rge: r.rge === true,
    decennaleAssureur: s("decennale_assureur"), decennalePolice: s("decennale_police"), decennaleFin: s("decennale_fin"),
    soumiseLe: s("soumise_le"), appelLe: n("appel_le"), valideLe: n("valide_le"),
    messageAdmin: n("message_admin"), notesAdmin: n("notes_admin"),
    contactsEnvoyes: typeof r.contacts_envoyes === "number" ? r.contacts_envoyes : 0,
    majDemandee: lireMaj(r.maj_demandee ?? null),
  };
}

export function lireDocument(r: Record<string, unknown>): DocumentArtisan {
  return {
    id: String(r.id), type: r.type as TypeDocument, chemin: String(r.chemin), nom: String(r.nom),
    taille: Number(r.taille) || 0, mime: String(r.mime), createdAt: String(r.created_at),
  };
}

/** L'artisan peut (re)remplir sa candidature : il n'en a pas encore, ou l'admin lui a demandé un complément. */
export const candidatureModifiable = (a: Pick<Artisan, "statut"> | null) => !a || a.statut === "a_completer";

export const LIBELLES_STATUT: Record<StatutArtisan, string> = {
  en_attente: "À examiner",
  a_completer: "Complément demandé",
  valide: "Validé",
  refuse: "Refusé",
  suspendu: "Suspendu",
};

/** Combien de jours avant la fin de la décennale (négatif : expirée). `aujourdhui` en AAAA-MM-JJ. */
export function joursAvantFinDecennale(fin: string, aujourdhui: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 864e5);
}

/** Ce qui manque pour valider : l'appel avec Daniel, une décennale en cours, une attestation déposée, un SIRET non fermé. */
export function bloquantsValidation(a: Artisan, nbDecennales: number, aujourdhui: string): string[] {
  const b: string[] = [];
  if (!a.appelLe) b.push("L'appel avec l'artisan n'est pas encore marqué comme fait.");
  if (joursAvantFinDecennale(a.decennaleFin, aujourdhui) < 0) b.push("Son assurance décennale est expirée.");
  if (nbDecennales < 1) b.push("Aucune attestation de décennale n'est déposée.");
  if (a.siretVerif?.statut === "ferme") b.push("Son établissement est fermé d'après le répertoire des entreprises.");
  return b;
}

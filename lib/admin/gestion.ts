/**
 * Comptabilité et planning de l'admin (27/11/2026) : les règles PURES. Rien ici ne lit la base ni Stripe ; les pages
 * /admin/compta et /admin/planning, les actions (lib/actions/gestion.ts) et les bureaux virtuels s'en servent, les tests aussi.
 *
 * Les heures des rendez-vous se saisissent et s'affichent en heure de FRANCE (celle du client) ; la base garde l'instant
 * exact. Les bureaux affichent en plus l'heure de Daniel, calculée dans son navigateur.
 */

/* ─── Charges fixes ─────────────────────────────────────────────────────────── */

export type Devise = "EUR" | "USD";
export type Frequence = "mois" | "an";
export type Charge = { id: string; nom: string; montantCentimes: number; devise: Devise; frequence: Frequence; echeance: string | null; actif: boolean };

export const SYMBOLE: Record<Devise, string> = { EUR: "€", USD: "$" };

/** « 19,99 », « 19.99 », « 1 200 » ou « 1 200,50 € » → centimes ; null si ce n'est pas un montant. */
export function lireMontant(brut: unknown): number | null {
  const t = String(brut ?? "").replace(/[\s €$]/g, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Un montant lisible : « 19,99 € », « 1 200 $ ». */
export function montant(centimes: number, devise: Devise = "EUR"): string {
  const v = centimes / 100;
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })} ${SYMBOLE[devise]}`;
}

/** Ce qu'une charge coûte par mois (une charge annuelle compte pour un douzième). */
export const parMois = (c: Pick<Charge, "montantCentimes" | "frequence">) => (c.frequence === "an" ? Math.round(c.montantCentimes / 12) : c.montantCentimes);

/** Le total mensuel des charges actives, devise par devise (aucune conversion : le taux n'est pas inventé). */
export function totalMensuel(charges: Charge[]): Partial<Record<Devise, number>> {
  const t: Partial<Record<Devise, number>> = {};
  for (const c of charges) if (c.actif) t[c.devise] = (t[c.devise] ?? 0) + parMois(c);
  return t;
}
export const totalTexte = (t: Partial<Record<Devise, number>>) =>
  (Object.entries(t) as [Devise, number][]).filter(([, v]) => v > 0).map(([d, v]) => montant(v, d)).join(" + ") || "0 €";

/* ─── Les entrées Stripe ────────────────────────────────────────────────────── */

/** Ce que Stripe a encaissé sur une période (en euros, centimes), frais et remboursements à part. */
export type Encaissements = { brut: number; frais: number; rembourse: number; net: number; nb: number };
export type EntreesStripe = { mois: Encaissements; precedent: Encaissements; lu: string };

/** Les opérations de solde Stripe → les encaissements. Seules les opérations en euros comptent (le compte encaisse en euros). */
export function encaissements(ops: { type: string; amount: number; fee: number; currency: string }[]): Encaissements {
  const e: Encaissements = { brut: 0, frais: 0, rembourse: 0, net: 0, nb: 0 };
  for (const o of ops) {
    if (o.currency !== "eur") continue;
    if (o.type === "charge" || o.type === "payment") { e.brut += o.amount; e.frais += o.fee; e.nb++; }
    else if (o.type === "refund" || o.type === "payment_refund") e.rembourse += -o.amount;
  }
  e.net = e.brut - e.frais - e.rembourse;
  return e;
}

/* ─── Rendez-vous ───────────────────────────────────────────────────────────── */

export type TypeRdv = "avis_achat" | "relecture_devis" | "point_projet" | "autre";
export type ModeRdv = "telephone" | "visio";
export type StatutRdv = "a_confirmer" | "confirme" | "fait" | "annule";
export type CompteRendu = "aucun" | "a_relire" | "envoye";
export type RendezVous = {
  id: string; debut: string; dureeMin: number; client: string; sujet: string | null;
  type: TypeRdv; mode: ModeRdv; statut: StatutRdv; compteRendu: CompteRendu; demandeId: string | null;
};

export const TYPES_RDV: [TypeRdv, string][] = [["avis_achat", "Avis avant achat"], ["relecture_devis", "Relecture de devis"], ["point_projet", "Point projet"], ["autre", "Autre"]];
export const MODES_RDV: [ModeRdv, string][] = [["telephone", "par téléphone"], ["visio", "en visio"]];
export const STATUTS_RDV: [StatutRdv, string][] = [["a_confirmer", "À confirmer"], ["confirme", "Confirmé"], ["fait", "Fait"], ["annule", "Annulé"]];
export const COMPTES_RENDUS: [CompteRendu, string][] = [["aucun", "Pas encore"], ["a_relire", "À relire"], ["envoye", "Envoyé au client"]];
const dans = <T extends string>(l: [T, string][], v: unknown): v is T => l.some(([k]) => k === v);
export const estTypeRdv = (v: unknown): v is TypeRdv => dans(TYPES_RDV, v);
export const estModeRdv = (v: unknown): v is ModeRdv => dans(MODES_RDV, v);
export const estStatutRdv = (v: unknown): v is StatutRdv => dans(STATUTS_RDV, v);
export const estCompteRendu = (v: unknown): v is CompteRendu => dans(COMPTES_RENDUS, v);
export const libelle = <T extends string>(l: [T, string][], v: T) => l.find(([k]) => k === v)?.[1] ?? v;

/* ─── L'heure de France ─────────────────────────────────────────────────────── */

const fmtParis = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
/** Les composantes d'un instant, en heure de France. */
export function enParis(t: Date): { y: number; m: number; d: number; h: number; mn: number; jourSemaine: number } {
  const o: Record<string, string> = {};
  for (const p of fmtParis.formatToParts(t)) o[p.type] = p.value;
  const jours = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mn: +o.minute, jourSemaine: jours.indexOf(o.weekday) };
}
/** L'instant exact d'une date et d'une heure de France (gère les changements d'heure). */
export function instantParis(y: number, m: number, d: number, h: number, mn: number): Date {
  const vise = Date.UTC(y, m - 1, d, h, mn);
  let t = vise;
  for (let i = 0; i < 2; i++) { const p = enParis(new Date(t)); t += vise - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mn); }
  return new Date(t);
}
/** « 2026-12-03T14:30 » (champ date et heure, lu comme heure de France) → instant ; null si illisible ou impossible. */
export function lireDebut(brut: unknown): Date | null {
  const m = String(brut ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [y, mo, d, h, mn] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mn > 59) return null;
  const t = instantParis(y, mo, d, h, mn), p = enParis(t);
  return p.d === d && p.m === mo ? t : null;
}
const deux = (n: number) => String(n).padStart(2, "0");
/** L'instant → « 14:30 » en heure de France. */
export const heureParis = (t: Date) => { const p = enParis(t); return `${deux(p.h)}:${deux(p.mn)}`; };
/** L'instant → valeur d'un champ date et heure (heure de France), pour préremplir un formulaire. */
export const champDebut = (t: Date) => { const p = enParis(t); return `${p.y}-${deux(p.m)}-${deux(p.d)}T${deux(p.h)}:${deux(p.mn)}`; };
/** Le lundi (heure de France, 00:00) de la semaine d'un instant, en jour calendaire UTC (ms). */
export function lundiParis(t: Date): number {
  const p = enParis(t);
  return Date.UTC(p.y, p.m - 1, p.d) - p.jourSemaine * 864e5;
}
/** Combien de jours séparent le jour (en France) d'un rendez-vous du lundi de référence. */
export function jourDepuisLundi(t: Date, lundi: number): number {
  const p = enParis(t);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d) - lundi) / 864e5);
}

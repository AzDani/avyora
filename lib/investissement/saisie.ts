/**
 * Ce que l'utilisateur saisit dans la section « Investissement » de la fiche projet (module M3), tel qu'il est
 * enregistré dans `reponses.invest`, et le passage aux entrées du moteur : un champ laissé vide (null) prend une
 * valeur par défaut tirée du projet (travaux de l'estimation, département du code postal, type de bien…).
 */
import { z } from "zod";
import { departement } from "./impot";
import { DEFAUTS } from "./regles";
import { REGIMES, type EntreeLocation, type NiveauLoyer, type Regime } from "./location";
import { CADRES, type CadreRevente, type EntreeRevente } from "./revente";

/** Champs numériques saisissables, avec leurs bornes (montants en €, taux et parts en %). */
export const CHAMPS = {
  prix: [0, 50_000_000], fraisNotaire: [0, 5_000_000], fraisAgence: [0, 5_000_000], travaux: [0, 20_000_000],
  travauxDeductiblesPct: [0, 100], mobilier: [0, 1_000_000], valeurApres: [0, 50_000_000],
  apport: [0, 50_000_000], taux: [0, 20], dureeAns: [1, 30], assurancePct: [0, 3], fraisDossier: [0, 500_000],
  loyerNu: [0, 500_000], loyerMeuble: [0, 500_000], loyerBailleurPrive: [0, 500_000], vacanceMois: [0, 12],
  taxeFonciere: [0, 500_000], coproNonRecup: [0, 500_000], pno: [0, 100_000], gestionPct: [0, 30], entretien: [0, 500_000], cfe: [0, 100_000],
  revenu: [0, 50_000_000], parts: [1, 20],
  horizon: [1, 30], indexLoyers: [-5, 10], indexCharges: [-5, 10], indexRevenu: [-5, 10], terrainPct: [0, 90],
  comptableLmnp: [0, 50_000], comptableSciIr: [0, 50_000], comptableIs: [0, 50_000], creationSociete: [0, 50_000],
} as const;
export type ChampNum = keyof typeof CHAMPS;

export type SaisieLocation = Partial<Record<ChampNum, number | null>> & {
  neuf?: boolean | null;
  /** Le prix d'achat est celui d'un terrain à bâtir (construction neuve) ; null = déduit de la nature du projet. */
  terrain?: boolean | null;
  collectif?: boolean | null;
  immeuble15ans?: boolean | null;
  couple?: boolean;
  renoEnergetique?: boolean;
  niveauBailleurPrive?: NiveauLoyer;
  /** Travaux : suivre la prévision des dépenses réelles (M5) dès qu'il y en a. */
  suiviReel?: boolean;
  /** Le régime que l'utilisateur envisage, comparé au meilleur (null = pas encore choisi). */
  choix?: Regime | null;
};

/** Champs propres à l'achat-revente ; l'achat, les travaux et le crédit sont partagés avec la location. */
export const CHAMPS_REVENTE = {
  prixRevente: [0, 50_000_000], dureeMois: [1, 120], fraisAgenceVente: [0, 5_000_000], diagnostics: [0, 50_000],
  mainlevee: [0, 500_000], travauxEntreprisePct: [0, 100], chargesPortage: [0, 500_000],
} as const;
export type ChampRevente = keyof typeof CHAMPS_REVENTE;
export type SaisieRevente = Partial<Record<ChampRevente, number | null>> & {
  etatNeuf?: boolean;
  sansIra?: boolean;
  habite?: boolean;
  primo?: boolean;
  nbVendeurs?: 1 | 2;
  /** Le cadre que l'utilisateur envisage, comparé au meilleur. */
  choix?: CadreRevente | null;
};

export type SaisieInvest = { actif: boolean; strategie: "location" | "revente"; location: SaisieLocation; revente?: SaisieRevente };

const champsNum = Object.fromEntries(
  (Object.keys(CHAMPS) as ChampNum[]).map((k) => [k, z.number().finite().min(CHAMPS[k][0]).max(CHAMPS[k][1]).nullable().optional()]),
) as Record<ChampNum, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;

export const investSchema = z.object({
  actif: z.boolean(),
  strategie: z.enum(["location", "revente"]),
  location: z.object({
    ...champsNum,
    neuf: z.boolean().nullable().optional(),
    terrain: z.boolean().nullable().optional(),
    collectif: z.boolean().nullable().optional(),
    immeuble15ans: z.boolean().nullable().optional(),
    couple: z.boolean().optional(),
    renoEnergetique: z.boolean().optional(),
    niveauBailleurPrive: z.enum(["intermediaire", "social", "tres_social"]).optional(),
    suiviReel: z.boolean().optional(),
    choix: z.enum(REGIMES as [Regime, ...Regime[]]).nullable().optional(),
  }).strict(),
  revente: z.object({
    ...(Object.fromEntries((Object.keys(CHAMPS_REVENTE) as ChampRevente[]).map((k) => [k, z.number().finite().min(CHAMPS_REVENTE[k][0]).max(CHAMPS_REVENTE[k][1]).nullable().optional()])) as Record<ChampRevente, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>),
    etatNeuf: z.boolean().optional(),
    sansIra: z.boolean().optional(),
    habite: z.boolean().optional(),
    primo: z.boolean().optional(),
    nbVendeurs: z.union([z.literal(1), z.literal(2)]).optional(),
    choix: z.enum(CADRES as [CadreRevente, ...CadreRevente[]]).nullable().optional(),
  }).strict().optional(),
}).strict();

/** Ce que le projet apporte aux valeurs par défaut. */
export type ContexteProjet = {
  codePostal?: string;
  typeBien?: string;
  nature?: "reno" | "neuf";
  /** Travaux de l'estimation, aléas compris. */
  travauxEstimes: number;
  /** Prévision de fin de chantier des dépenses réelles (M5), s'il y a des dépenses. */
  travauxPrevision?: number;
};

const v = (x: number | null | undefined, d: number): number => (typeof x === "number" && Number.isFinite(x) ? x : d);

/** Travaux retenus : la saisie, sinon la prévision des dépenses réelles (si suivie), sinon l'estimation. */
export function travauxRetenus(s: SaisieLocation, p: ContexteProjet): { montant: number; source: "saisie" | "reel" | "estimation" } {
  if (typeof s.travaux === "number") return { montant: s.travaux, source: "saisie" };
  if (s.suiviReel !== false && p.travauxPrevision != null) return { montant: Math.round(p.travauxPrevision), source: "reel" };
  return { montant: Math.round(p.travauxEstimes), source: "estimation" };
}

/** Les entrées du moteur, ou null tant que les 3 champs indispensables manquent (prix, loyer, revenus du foyer). */
export function entreeDepuisSaisie(s: SaisieLocation, p: ContexteProjet): EntreeLocation | null {
  if (!(v(s.prix, 0) > 0) || !(v(s.loyerNu, 0) > 0 || v(s.loyerMeuble, 0) > 0) || s.revenu == null) return null;
  return completer(s, p);
}

/** Toutes les entrées, champs vides remplacés par leur valeur par défaut (aussi pour les afficher dans les champs). */
export function completer(s: SaisieLocation, p: ContexteProjet): EntreeLocation {
  const neuf = s.neuf ?? p.nature === "neuf";
  const terrainABatir = s.terrain ?? p.nature === "neuf";
  const collectif = s.collectif ?? (p.typeBien ? p.typeBien !== "Maison" : true);
  const loyerNu = v(s.loyerNu, Math.round(v(s.loyerMeuble, 0) / 1.15));
  const loyerMeuble = v(s.loyerMeuble, Math.round(loyerNu * 1.15));
  const prix = v(s.prix, 0);
  return {
    prix,
    neuf,
    terrainABatir,
    dept: departement(p.codePostal),
    fraisNotaire: typeof s.fraisNotaire === "number" ? s.fraisNotaire : null,
    fraisAgence: v(s.fraisAgence, 0),
    travaux: travauxRetenus(s, p).montant,
    travauxDeductiblesPct: v(s.travauxDeductiblesPct, neuf ? 0 : 100),
    mobilier: v(s.mobilier, 5_000),
    collectif,
    immeuble15ans: s.immeuble15ans ?? !neuf,
    apport: v(s.apport, 0),
    taux: v(s.taux, 3.5),
    dureeAns: v(s.dureeAns, 20),
    assurancePct: v(s.assurancePct, 0.3),
    fraisDossier: v(s.fraisDossier, 1_500),
    loyerNu,
    loyerMeuble,
    loyerBailleurPrive: v(s.loyerBailleurPrive, loyerNu),
    vacanceMois: v(s.vacanceMois, 0.5),
    taxeFonciere: v(s.taxeFonciere, loyerNu),
    coproNonRecup: v(s.coproNonRecup, collectif ? 600 : 0),
    pno: v(s.pno, collectif ? 150 : 250),
    gestionPct: v(s.gestionPct, 0),
    entretien: v(s.entretien, 400),
    cfe: v(s.cfe, 300),
    revenu: v(s.revenu, 0),
    parts: v(s.parts, s.couple ? 2 : 1),
    couple: !!s.couple,
    horizon: v(s.horizon, 20),
    indexLoyers: v(s.indexLoyers, 1.5),
    indexCharges: v(s.indexCharges, 2),
    indexRevenu: v(s.indexRevenu, 1),
    terrainPct: v(s.terrainPct, collectif ? DEFAUTS.terrainPct : 20),
    renoEnergetique: !!s.renoEnergetique,
    niveauBailleurPrive: s.niveauBailleurPrive ?? "intermediaire",
    comptableLmnp: v(s.comptableLmnp, DEFAUTS.comptableLmnp),
    comptableSciIr: v(s.comptableSciIr, DEFAUTS.comptableSciIr),
    comptableIs: v(s.comptableIs, DEFAUTS.comptableIs),
    creationSociete: v(s.creationSociete, DEFAUTS.creationSociete),
  };
}

/** Saisie lue dans les réponses d'un projet (tolérante : une valeur abîmée est ignorée, pas bloquante). */
export function lireSaisie(reponses: unknown): SaisieInvest {
  const brut = (reponses as { invest?: unknown } | null)?.invest;
  const r = investSchema.safeParse(brut);
  return r.success ? (r.data as SaisieInvest) : { actif: false, strategie: "location", location: {} };
}

/** Entrées de l'achat-revente, champs vides remplacés par leur valeur par défaut. L'achat, les travaux et le
 *  crédit viennent de la saisie commune (bloc « Achat » et « Crédit »). */
export function completerRevente(s: SaisieInvest, p: ContexteProjet): EntreeRevente {
  const l = completer(s.location, p);
  const r = s.revente ?? {};
  return {
    prix: l.prix,
    neuf: l.neuf,
    terrainABatir: l.terrainABatir,
    dept: l.dept,
    fraisNotaire: l.fraisNotaire,
    fraisAgence: l.fraisAgence,
    travaux: l.travaux,
    travauxEntreprisePct: v(r.travauxEntreprisePct, 100),
    etatNeuf: !!r.etatNeuf,
    apport: l.apport,
    taux: l.taux,
    dureeAns: l.dureeAns,
    assurancePct: l.assurancePct,
    fraisDossier: l.fraisDossier,
    sansIra: !!r.sansIra,
    taxeFonciere: v(s.location.taxeFonciere, Math.round(l.prix * 0.008)),
    chargesAnnuelles: v(r.chargesPortage, l.collectif ? 1_200 : 500),
    dureeMois: v(r.dureeMois, 12),
    prixRevente: v(r.prixRevente, 0),
    fraisAgenceVente: v(r.fraisAgenceVente, 0),
    diagnostics: v(r.diagnostics, 500),
    mainlevee: typeof r.mainlevee === "number" ? r.mainlevee : null,
    habite: !!r.habite,
    primo: !!r.primo,
    nbVendeurs: r.nbVendeurs ?? (s.location.couple ? 2 : 1),
    comptableIs: l.comptableIs,
    creationSociete: l.creationSociete,
  };
}

/** Entrées de l'achat-revente, ou null tant que le prix d'achat et le prix de revente manquent. */
export function entreeRevente(s: SaisieInvest, p: ContexteProjet): EntreeRevente | null {
  if (!(v(s.location.prix, 0) > 0) || !(v(s.revente?.prixRevente, 0) > 0)) return null;
  return completerRevente(s, p);
}

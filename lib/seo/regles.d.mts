/** Types des règles de l'Agent SEO (regles.mjs, partagé par le site et le script du Mac). */
export type JourSeo = { date: string; clics: number; impressions: number; ctr: number; position: number };
export type LigneSeo = { requete: string; page: string; clics: number; impressions: number; ctr: number; position: number };
export type Totaux = { clics: number; impressions: number; ctr: number; position: number };
export type Probleme = { code: "erreur" | "redirection" | "noindex" | "canonique" | "titre-absent" | "titre-long" | "description-absente"; detail: string };
export type BilanSante = { verifiees: number; graves: number; finitions: number; parCode: Record<string, number>; pages: { url: string; problemes: Probleme[] }[] };
export type Opportunites = {
  page2: LigneSeo[];
  ctrFaible: (LigneSeo & { ctrReference: number })[];
  cannibales: { requete: string; impressions: number; pages: { page: string; impressions: number; position: number }[] }[];
  reculs: (LigneSeo & { positionAvant: number })[];
};

export declare const PERIODE_JOURS: number;
export declare const PAGE2: { min: number; max: number; impressionsMin: number };
export declare const CTR_FAIBLE: { impressionsMin: number; ratio: number; echantillonMin: number };
export declare const CANNIBALE_IMPRESSIONS: number;
export declare const RECUL: { places: number; impressionsMin: number };
export declare const TITRE_MAX: number;
export declare const GRAVES: string[];
export declare function tranche(position: number): string;
export declare function totaux(jours: JourSeo[]): Totaux;
export declare function periodes(jours: JourSeo[], n?: number): { actuelle: Totaux; precedente: Totaux };
export declare function opportunites(lignes: LigneSeo[], avant?: LigneSeo[]): Opportunites;
export declare function problemesPage(r: { url: string; statut: number; enTetes?: Record<string, string | undefined>; html?: string }): Probleme[];
export declare function urlsDuSitemap(xml: string): string[];
export declare function bilanSante(resultats: { url: string; statut: number; enTetes?: Record<string, string | undefined>; html?: string }[]): BilanSante;

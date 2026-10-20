/**
 * Loyers de marché par commune : « Carte des loyers » 2025 de l'ANIL (lib/marche/loyers-2025.json, construit par
 * scripts/marche/construire-loyers.mjs). Les indicateurs sont des loyers d'annonce CHARGES COMPRISES de logements
 * NON MEUBLÉS : on retire une estimation des charges récupérables pour les comparer au loyer hors charges saisi, et
 * on majore pour le meublé. Source à citer : « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin ».
 */
import donnees from "./loyers-2025.json";
import { MAJORATION_MEUBLE } from "@/lib/investissement/regles";

export { MAJORATION_MEUBLE };

export type SerieLoyer = "ap12" | "ap3" | "maison";
const ORDRE: SerieLoyer[] = ["ap12", "ap3", "maison"];

/** Charges récupérables estimées, en €/m² par mois : 25 à 50 €/m²/an en immeuble collectif selon les sources
 *  professionnelles (sans chauffage collectif, bas de fourchette) ; peu de charges en maison (ordures ménagères). */
export const CHARGES_M2_MOIS: Record<SerieLoyer, number> = { ap12: 2, ap3: 2, maison: 0.3 };

export const MILLESIME_LOYERS = (donnees as { millesime: string }).millesime;

type Donnees = { z: [number, number, number][]; c: Record<string, [number, number, number, number]> };
const D = donnees as unknown as Donnees;

/** Série de la carte selon le bien : maison, ou appartement de 1-2 pièces / 3 pièces et plus. */
export function serieLoyer(typeBien: string | undefined): SerieLoyer {
  if (typeBien === "Maison") return "maison";
  return typeBien === "Studio" || typeBien === "T2" ? "ap12" : "ap3";
}

export type IndicateurLoyer = {
  /** Loyer nu charges comprises, €/m²/mois, et intervalle de prédiction à 95 %. */
  cc: number; ccBas: number; ccHaut: number;
  /** Les mêmes, hors charges (charges récupérables estimées retirées). */
  hc: number; hcBas: number; hcHaut: number;
  fiable: boolean;
};

export function indicateurLoyer(insee: string, serie: SerieLoyer): IndicateurLoyer | null {
  const c = D.c[insee];
  const i = ORDRE.indexOf(serie);
  if (!c || c[i] < 0) return null;
  const [cc, ccBas, ccHaut] = D.z[c[i]];
  const ch = CHARGES_M2_MOIS[serie];
  const hc = (x: number): number => Math.max(0, Math.round((x - ch) * 10) / 10);
  return { cc, ccBas, ccHaut, hc: hc(cc), hcBas: hc(ccBas), hcHaut: hc(ccHaut), fiable: ((c[3] >> i) & 1) === 1 };
}

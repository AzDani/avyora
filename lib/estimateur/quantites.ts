/**
 * Quantités automatiques PARTAGÉES par la rénovation (`autoQty`, core.ts) et la construction neuve
 * (`quantitesNeuf`, neuf.ts).
 *
 * Module SANS dépendance : il n'importe rien, pas même un type. `neuf.ts` ne doit rien importer du
 * moteur à l'exécution (le moteur l'appelle depuis `autoQty`, l'inverse ferait un cycle) ; les deux
 * natures lisent donc ici les formules qu'elles ont en commun.
 *
 * Le sens est choisi formule par formule (revue rénovation / neuf, chantier N8) :
 * - robinetterie de lavabo : deux par salle de bain avec un meuble double vasque (adopté en neuf) ; la
 *   rénovation suit en plus la quantité saisie du meuble (une par vasque), le neuf non (`robinetsNeuf`) ;
 * - étanchéité sous carrelage (SPEC) : la rénovation mesure la zone de chaque douche cochée ; le neuf
 *   garde 6,5 m² par salle de bain et n'ajoute que le supplément d'une douche plus grande (`specNeuf`) ;
 * - spots, sols, faïence, plinthes : la même formule des deux côtés ;
 * - portes : chaque nature garde la sienne (le neuf compte les portes de la maison décrite) ;
 * - arrondi : chaque nature garde le sien (la rénovation à l'entier, le neuf au centième).
 */

/** Ce que les formules lisent d'une ligne de la sélection (la forme de `LigneSel`, sans l'importer). */
export interface LigneQuantite {
  on?: boolean;
  manual?: boolean;
  qty?: number | null;
  vsel?: Record<string, string>;
}

/** Vasques d'un meuble : deux pour un meuble double vasque, une sinon. */
const vasquesParMeuble = (mv: LigneQuantite): number => (mv.vsel && mv.vsel["config"] === "double" ? 2 : 1);

/** Robinetterie de lavabo en rénovation = nombre de vasques : la quantité du meuble-vasque (une par
 *  salle de bain tant qu'elle est automatique), ×2 pour un meuble double vasque. Meuble non coché : une
 *  par salle de bain. */
export function robinetsReno(meubleVasque: LigneQuantite | undefined, sdb: number): number {
  const mv = meubleVasque;
  return mv && mv.on ? (mv.manual ? (mv.qty ?? 0) : sdb) * vasquesParMeuble(mv) : sdb;
}

/** Robinetterie de lavabo en construction neuve : une par salle de bain, deux avec un meuble double
 *  vasque coché. La quantité tapée sur le meuble n'y entre pas : avant N8, la robinetterie du neuf
 *  valait le nombre de salles de bain quelle que soit cette quantité, et un projet enregistré ne doit
 *  pas bouger ; seule la double vasque, variante admise par la revue, est chiffrée en plus. */
export function robinetsNeuf(meubleVasque: LigneQuantite | undefined, sdb: number): number {
  return meubleVasque?.on ? sdb * vasquesParMeuble(meubleVasque) : sdb;
}

/** Surface d'étanchéité par salle de bain quand aucune douche n'est choisie (estimation moyenne). */
export const SPEC_PAR_SDB = 6.5;
const DIMS_DOUCHE: Record<string, [number, number]> = { "120x80": [120, 80], "150x90": [150, 90] };
const DIM_DOUCHE_BASE = "120x80";

/** Zone d'une douche en contact avec l'eau, selon sa dimension : le sol du bac, le fond et les deux
 *  côtés sur ≈ 2 m de haut. Dimension inconnue : 120×80. */
export function zoneDouche(dim?: string): number {
  const [w, d] = DIMS_DOUCHE[dim || DIM_DOUCHE_BASE] || DIMS_DOUCHE[DIM_DOUCHE_BASE];
  const wm = w / 100, dm = d / 100;
  return wm * dm + (wm + 2 * dm) * 2;
}

/** Nombre de douches d'une ligne cochée : sa quantité saisie, sinon une par salle de bain. */
const nbDouches = (p: LigneQuantite, sdb: number): number => (p.manual ? (p.qty ?? 1) : sdb);

/** SPEC en rénovation : la zone de chaque douche cochée (bac, italienne), selon sa dimension ; aucune
 *  douche cochée → `SPEC_PAR_SDB` par salle de bain. Une ligne à quantité nulle compte pour une douche. */
export function specReno(douches: (LigneQuantite | undefined)[], sdb: number): number {
  let area = 0;
  for (const p of douches) {
    if (!p?.on) continue;
    area += zoneDouche(p.vsel && p.vsel["dim"]) * (nbDouches(p, sdb) || 1);
  }
  return area > 0 ? area : sdb * SPEC_PAR_SDB;
}

/** SPEC en construction neuve : `SPEC_PAR_SDB` par salle de bain, plus, pour chaque douche cochée plus
 *  grande que 120×80 (un bac 150×90), la zone qu'elle ajoute. Une douche standard ne change rien. */
export function specNeuf(douches: (LigneQuantite | undefined)[], sdb: number): number {
  let plus = 0;
  for (const p of douches) {
    if (!p?.on) continue;
    const ecart = zoneDouche(p.vsel && p.vsel["dim"]) - zoneDouche(DIM_DOUCHE_BASE);
    if (ecart > 0) plus += ecart * nbDouches(p, sdb);
  }
  return SPEC_PAR_SDB * sdb + plus;
}

/** Spots encastrés : environ un pour 2 m². */
export const spots = (surface: number): number => Math.round(surface / 2);
/** Sol carrelé (pièces d'eau, entrée, cuisine) : 60 % de la surface ; le béton ciré se pose au même endroit. */
export const solCarrele = (surface: number): number => surface * 0.6;
/** Sol « sec » (séjour, chambres) : 40 % de la surface — stratifié, parquet, sol souple ou moquette. */
export const solSec = (surface: number): number => surface * 0.4;
/** Faïence (et cloison hydrofuge) : 12 m² par salle de bain. */
export const faienceSdb = (sdb: number): number => sdb * 12;
/** Plinthes : le périmètre de pièces carrées de même surface moyenne, 4 × √(surface × pièces). */
export const plinthes = (surface: number, pieces: number): number => 4 * Math.sqrt(surface * pieces);

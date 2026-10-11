/**
 * Catalogue de la CONSTRUCTION NEUVE — même moteur, mêmes prix.
 *
 * `catalog-neuf.json` décrit le chantier d'une maison neuve dans l'ordre où il se déroule, du
 * permis de construire à la déclaration d'achèvement. Chaque lot y porte la phase du neuf (`p`).
 * Un poste y est de deux sortes :
 *
 * - `{ "ref": "<id>" }` : un poste qui existe déjà au catalogue de la rénovation (une fenêtre, un
 *   WC, un carrelage…). Il est REPRIS — le même objet, donc le même prix : il n'y a qu'un prix par
 *   ouvrage dans AVYORA. Un poste repris reste dans un lot du MÊME nom que son lot d'origine, pour
 *   garder son coefficient de finition et sa clé `key(lot, nom)`.
 * - un poste complet (`id`, `n`, `u`, `fp`, `sm`…) : un ouvrage propre au neuf (fondations,
 *   élévation des murs, couverture neuve tout compris, taxe d'aménagement…).
 *
 * Le catalogue de la rénovation (`catalog.json`) n'est pas touché : `CATALOG` reste exactement ce
 * qu'il était, et tout ce qui le lit (estimateur, pages de prix, plan) voit la même chose qu'avant.
 *
 * Ce module ne s'appelle pas `catalog-neuf.ts` : à côté de `catalog-neuf.json`, un `require` en
 * CommonJS (la configuration de Next) résoudrait « ./catalog-neuf » vers le JSON.
 *
 * Un lot du neuf peut revenir dans plusieurs phases (la maçonnerie coule les fondations, monte les
 * murs puis tire les chapes) : c'est la chronologie réelle du chantier. La clé d'un poste reste
 * unique, ce que vérifie `tests/estimateur-neuf.test.ts`.
 */
import raw from "./catalog-neuf.json";
/* Le catalogue rénovation est lu dans son JSON et non via `./catalog` : en CommonJS (configuration
   de Next), « ./catalog » se résout vers `catalog.json` avant `catalog.ts`. Le JSON est un module
   unique : ses postes sont les MÊMES objets que ceux de `CATALOG` (catalog.ts ne fait que le typer). */
import renoBrut from "./catalog.json";
import type { Lot, Tache, Ctx } from "./core";

const CATALOG = renoBrut as unknown as Lot[];

type PosteBrut = { ref: string } | Tache;
type LotBrut = { c: string; p: string; tva: number; note?: string; t: PosteBrut[] };

const RENO = new Map<string, { t: Tache; c: string }>();
for (const l of CATALOG) for (const t of l.t) RENO.set(t.id, { t, c: l.c });

/* Une référence vers un poste qui n'existe pas, ou rangée dans un autre lot que le sien, est une
   erreur de saisie du catalogue. Elle n'arrête PAS le chargement : le moteur de la rénovation
   importe ce module, et une incohérence du neuf (un poste rénovation renommé ou déplacé) ne doit
   pas faire tomber la rénovation. Elle est notée dans `ANOMALIES_NEUF`, que le test exige vide —
   c'est lui qui bloque la livraison. */
export const ANOMALIES_NEUF: string[] = [];
function resoudre(x: PosteBrut, lot: string): Tache | null {
  if (!("ref" in x)) return x;
  const r = RENO.get(x.ref);
  if (!r) { ANOMALIES_NEUF.push(`le poste repris « ${x.ref} » n'existe pas au catalogue rénovation`); return null; }
  if (r.c !== lot) ANOMALIES_NEUF.push(`« ${x.ref} » est rangé dans « ${lot} » au lieu de son lot d'origine « ${r.c} »`);
  return r.t;
}

export const CATALOG_NEUF: Lot[] = (raw as unknown as LotBrut[]).map((l) => ({
  c: l.c, p: l.p, tva: l.tva, ...(l.note ? { note: l.note } : {}),
  t: l.t.map((x) => resoudre(x, l.c)).filter((t): t is Tache => t !== null),
}));

/** Phases du chantier neuf, dans l'ordre (celui du catalogue). */
export const PHASES_NEUF: string[] = [...new Set(CATALOG_NEUF.map((l) => l.p))];

/** Identifiants des postes propres au neuf (hors postes repris de la rénovation). */
export const IDS_NEUF: string[] = (raw as unknown as LotBrut[]).flatMap((l) => l.t.filter((x) => !("ref" in x)).map((x) => (x as Tache).id));

/** Où trouver un poste du neuf par son identifiant : son lot (nom) et son libellé. */
export const POSTE_NEUF = new Map<string, { c: string; n: string; t: Tache }>();
for (const l of CATALOG_NEUF) for (const t of l.t) POSTE_NEUF.set(t.id, { c: l.c, n: t.n, t });

/** Le catalogue à chiffrer pour un projet : celui du neuf pour une construction, sinon la rénovation. */
export function catalogueDe(ctx: Pick<Ctx, "nature"> | null | undefined): Lot[] {
  return ctx && ctx.nature === "neuf" ? CATALOG_NEUF : CATALOG;
}

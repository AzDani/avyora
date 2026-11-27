/**
 * Les deux catalogues du moteur (rénovation et construction neuve) — mêmes prix, un seul magasin.
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
 * ── LE BARÈME NE PART JAMAIS DANS LE JAVASCRIPT PUBLIC (27/11/2026, option A validée par Dani) ──
 *
 * Ce module ne contient AUCUN prix. `CATALOG`, `CATALOG_NEUF`, `PHASES_NEUF`, `IDS_NEUF`,
 * `POSTE_NEUF` et `ANOMALIES_NEUF` sont des conteneurs, remplis EN PLACE par `installerCatalogues` :
 *
 * - côté serveur (pages, routes, actions), au chargement de ce module : la branche
 *   `typeof window === "undefined"` lit les deux JSON. Next remplace `typeof window` par une
 *   constante à la compilation : dans le paquet du NAVIGATEUR la branche est morte, et les JSON n'y
 *   entrent pas (vérifié après chaque build par `scripts/controle-bareme.mjs`) ;
 * - dans le navigateur, après connexion seulement : `chargerBareme()` (bareme-client.ts) les
 *   demande à `GET /api/estimateur/bareme` (compte exigé, journalisé, limité par compte), puis les
 *   installe ; le calcul reste instantané, dans le navigateur, comme avant.
 *
 * Les tableaux et la table gardent leur IDENTITÉ (remplis en place) : tout module qui les a importés
 * voit le contenu installé. Les modules qui en tirent leurs propres tables (identite, neuf,
 * detaille-neuf, liste-neuf) s'abonnent par `surCatalogue` et les reconstruisent à l'installation.
 *
 * Ce module ne s'appelle pas `catalog-neuf.ts` : à côté de `catalog-neuf.json`, un `require` en
 * CommonJS (la configuration de Next) résoudrait « ./catalog-neuf » vers le JSON.
 *
 * Un lot du neuf peut revenir dans plusieurs phases (la maçonnerie coule les fondations, monte les
 * murs puis tire les chapes) : c'est la chronologie réelle du chantier. La clé d'un poste reste
 * unique, ce que vérifie `tests/estimateur-neuf.test.ts`.
 */
import type { Lot, Tache, Ctx } from "./core";

type PosteBrut = { ref: string } | Tache;
type LotBrut = { c: string; p: string; tva: number; note?: string; t: PosteBrut[] };

/** Catalogue de la rénovation (réexporté par `catalog.ts`). Vide tant que le barème n'est pas installé. */
export const CATALOG: Lot[] = [];
/** Catalogue de la construction neuve. Vide tant que le barème n'est pas installé. */
export const CATALOG_NEUF: Lot[] = [];
/** Phases du chantier neuf, dans l'ordre (celui du catalogue). */
export const PHASES_NEUF: string[] = [];
/** Identifiants des postes propres au neuf (hors postes repris de la rénovation). */
export const IDS_NEUF: string[] = [];
/** Où trouver un poste du neuf par son identifiant : son lot (nom) et son libellé. */
export const POSTE_NEUF = new Map<string, { c: string; n: string; t: Tache }>();

/* Une référence vers un poste qui n'existe pas, ou rangée dans un autre lot que le sien, est une
   erreur de saisie du catalogue. Elle n'arrête PAS le chargement : le moteur de la rénovation
   importe ce module, et une incohérence du neuf (un poste rénovation renommé ou déplacé) ne doit
   pas faire tomber la rénovation. Elle est notée dans `ANOMALIES_NEUF`, que le test exige vide —
   c'est lui qui bloque la livraison. */
export const ANOMALIES_NEUF: string[] = [];

/** Les deux JSON tels qu'installés (servis tels quels par l'adresse réservée aux comptes). */
let sources: { reno: unknown; neuf: unknown } | null = null;
let version = 0;
const abonnes: Array<() => void> = [];
const ecouteurs = new Set<() => void>();

/** Le barème est-il installé (serveur : toujours ; navigateur : après `chargerBareme`) ? */
export const catalogueInstalle = (): boolean => sources !== null;
/** Numéro de l'installation (0 : rien d'installé). Sert d'instantané à `useSyncExternalStore`. */
export const versionCatalogue = (): number => version;
/** Les JSON installés, ou `null`. */
export const sourcesCatalogue = (): { reno: unknown; neuf: unknown } | null => sources;

/**
 * Une table dérivée du catalogue (index par id, par clé…) : `fn` la (re)construit. Appelée tout de suite
 * si le barème est déjà installé, puis à chaque installation. Ordre d'appel = ordre d'abonnement.
 */
export function surCatalogue(fn: () => void): void {
  abonnes.push(fn);
  if (sources) fn();
}
/** Pour React : prévenu après chaque installation (voir `useBareme`). */
export function ecouterCatalogue(fn: () => void): () => void {
  ecouteurs.add(fn);
  return () => { ecouteurs.delete(fn); };
}

/** Installe les deux catalogues (les JSON bruts). Rejouer la même installation ne fait rien. */
export function installerCatalogues(renoBrut: unknown, neufBrut: unknown): void {
  if (sources && sources.reno === renoBrut && sources.neuf === neufBrut) return;
  if (!Array.isArray(renoBrut) || !Array.isArray(neufBrut)) throw new Error("barème illisible");
  const reno = renoBrut as Lot[];
  CATALOG.splice(0, CATALOG.length, ...reno);

  const RENO = new Map<string, { t: Tache; c: string }>();
  for (const l of CATALOG) for (const t of l.t) RENO.set(t.id, { t, c: l.c });
  ANOMALIES_NEUF.length = 0;
  function resoudre(x: PosteBrut, lot: string): Tache | null {
    if (!("ref" in x)) return x;
    const r = RENO.get(x.ref);
    if (!r) { ANOMALIES_NEUF.push(`le poste repris « ${x.ref} » n'existe pas au catalogue rénovation`); return null; }
    if (r.c !== lot) ANOMALIES_NEUF.push(`« ${x.ref} » est rangé dans « ${lot} » au lieu de son lot d'origine « ${r.c} »`);
    return r.t;
  }
  const neuf = neufBrut as LotBrut[];
  CATALOG_NEUF.splice(0, CATALOG_NEUF.length, ...neuf.map((l) => ({
    c: l.c, p: l.p, tva: l.tva, ...(l.note ? { note: l.note } : {}),
    t: l.t.map((x) => resoudre(x, l.c)).filter((t): t is Tache => t !== null),
  })));
  PHASES_NEUF.splice(0, PHASES_NEUF.length, ...new Set(CATALOG_NEUF.map((l) => l.p)));
  IDS_NEUF.splice(0, IDS_NEUF.length, ...neuf.flatMap((l) => l.t.filter((x) => !("ref" in x)).map((x) => (x as Tache).id)));
  POSTE_NEUF.clear();
  for (const l of CATALOG_NEUF) for (const t of l.t) POSTE_NEUF.set(t.id, { c: l.c, n: t.n, t });

  sources = { reno: renoBrut, neuf: neufBrut };
  version++;
  for (const fn of abonnes) fn();
  for (const fn of ecouteurs) fn();
}

/** Le catalogue à chiffrer pour un projet : celui du neuf pour une construction, sinon la rénovation. */
export function catalogueDe(ctx: Pick<Ctx, "nature"> | null | undefined): Lot[] {
  return ctx && ctx.nature === "neuf" ? CATALOG_NEUF : CATALOG;
}

/* ── Côté serveur : le barème est lu ici, au chargement ──
   `typeof window` est une constante de compilation pour Next (« object » dans le paquet du navigateur) :
   cette branche, et les deux `require` qu'elle contient, n'existent pas dans le JavaScript public. */
declare const require: (id: string) => unknown;
if (typeof window === "undefined") {
  installerCatalogues(require("./catalog.json"), require("./catalog-neuf.json"));
}

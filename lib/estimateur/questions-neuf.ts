/**
 * CONSTRUCTION NEUVE — les questions du mode détaillé (« Affiner ma maison »), posées à la manière de
 * la rénovation (revue rénovation / neuf, §5 « Questions sur le bien » et chantier N9).
 *
 * Données pures : chaque question décrit une réponse de `MaisonNeuve`. Le composant qui les affiche
 * (`components/neuf/EstimateurNeuf.tsx`) reste générique : il lit cette table, il n'écrit aucune
 * question. Une clé n'est pas dans la maison : `$finition`, qui va dans les options du chiffrage.
 * « Qui réalise » n'est plus une question (N3) : c'est le réglage « Nouveaux postes cochés », au-dessus
 * des lots (`reglerNouveauxNeuf`, `detaille-neuf.ts`).
 *
 * Deux champs disent où et comment l'écran pose la question (N9) :
 * - `section` : la rubrique de la carte « Parle-nous de ta maison », dans l'ordre de la rénovation :
 *   type de maison, surfaces, pièces et configuration (la grille de compteurs de la rénovation, mêmes
 *   libellés : `dictDetail`), choix techniques (repliés derrière une ligne de résumé,
 *   `resumeTechniqueNeuf`), niveau de finition, qui pilote le chantier ;
 * - `vue` : le contrôle, selon la question : segment pour deux choix, pastilles de trois à six, cartes
 *   (chauffage, finition), compteur, champ (un nombre pris à la sortie du champ), code postal,
 *   interrupteur (« Cuisine équipée comprise »).
 * Dans les choix techniques, les groupes (Structure, Toit…) sont les sous-titres. La couverture, les
 * gouttières et la façade n'y sont plus (N10) : elles se choisissent sur leur ligne de choix, dans leur lot.
 */
import { maisonParDefaut, type MaisonNeuve } from "./neuf";
import type { TexteFrEn } from "./etapes-neuf";
import { BORNES_NEUF, minSdbNeuf, type Borne } from "./bornes-neuf";
import { dictDetail } from "../i18n/detail";
import type { Locale } from "../i18n/config";

export type CleQuestionNeuf = keyof MaisonNeuve | "$finition";
export type ValeurQuestionNeuf = string | number | boolean;

/** Rubrique de la carte, dans l'ordre de l'écran. */
export type SectionNeuf = "type" | "surfaces" | "pieces" | "technique" | "finition" | "pilotage";
export const SECTIONS_NEUF: SectionNeuf[] = ["type", "surfaces", "pieces", "technique", "finition", "pilotage"];

/** Contrôle d'une question : segment (2 choix), pastilles (3 à 6), cartes, compteur, champ, code postal, interrupteur. */
export type VueNeuf = "segment" | "pastilles" | "cartes" | "compteur" | "champ" | "cp" | "interrupteur";

export interface QuestionNeuf {
  k: CleQuestionNeuf;
  l: TexteFrEn;
  section: SectionNeuf;
  vue: VueNeuf;
  /** Choix proposés : [valeur, libellé]. Absent pour une saisie (`t`). */
  o?: [ValeurQuestionNeuf, TexteFrEn][];
  /** Cartes : l'objectif et la description de chaque choix (clé : la valeur). */
  cartes?: Record<string, { eye: TexteFrEn; desc: TexteFrEn }>;
  /** Saisie : un nombre (compteur ou champ), un code postal. */
  t?: "num" | "cp";
  u?: string;
  /** Bornes d'une saisie : celles du moteur (`BORNES_NEUF`), jamais recopiées. */
  min?: number; max?: number; step?: number;
  /** Minimum qui dépend de la maison (salles de bain : 0 s'il y a une suite parentale, sinon 1). */
  minDe?: (m: MaisonNeuve) => number;
  /** La question n'a d'objet que si… (sinon elle est masquée, comme en rénovation). */
  si?: (m: MaisonNeuve) => boolean;
  hint?: TexteFrEn;
}

export interface GroupeQuestionsNeuf { g: TexteFrEn; qs: QuestionNeuf[] }

const oui = { fr: "Oui", en: "Yes" };
const non = { fr: "Non", en: "No" };
const B = BORNES_NEUF;

/* Les compteurs de la rénovation, avec SES libellés (`dictDetail().bien.compteurs`) : « mêmes libellés ». */
const CF = dictDetail("fr").bien.compteurs, CE = dictDetail("en").bien.compteurs;
type CleLibelle = keyof typeof CF;
const lib = (k: CleLibelle): TexteFrEn => ({ fr: CF[k], en: CE[k] });
const compteur = (k: keyof MaisonNeuve, l: CleLibelle, b: Borne, extra: Partial<QuestionNeuf> = {}): QuestionNeuf =>
  ({ k, l: lib(l), section: "pieces", vue: "compteur", t: "num", min: b.min, max: b.max, step: 1, ...extra });

export const QUESTIONS_NEUF: GroupeQuestionsNeuf[] = [
  { g: { fr: "La maison", en: "The house" }, qs: [
    { k: "niveaux", l: { fr: "Niveaux", en: "Levels" }, section: "type", vue: "pastilles", o: [
      ["pp", { fr: "Plain-pied", en: "Single-story" }], ["etage", { fr: "À étage", en: "Two-story" }], ["combles", { fr: "Combles aménagés", en: "Converted attic" }],
    ] },
    { k: "forme", l: { fr: "Forme", en: "Shape" }, section: "type", vue: "pastilles", o: [
      ["rect", { fr: "Simple", en: "Simple" }], ["L", { fr: "En L", en: "L-shaped" }], ["complexe", { fr: "Complexe", en: "Complex" }],
    ] },
    { k: "surface", l: { fr: "Surface habitable", en: "Living area" }, section: "surfaces", vue: "champ", t: "num", u: "m²",
      min: B.surface.min, max: B.surface.max, step: 5, hint: { fr: "Tous les niveaux additionnés, hors garage.", en: "All floors added up, excluding the garage." } },
    { k: "garage", l: { fr: "Garage accolé", en: "Attached garage" }, section: "surfaces", vue: "champ", t: "num", u: "m²",
      min: B.garage.min, max: B.garage.max, step: 5, hint: { fr: "0 = sans garage", en: "0 = no garage" } },
    { k: "codePostal", l: { fr: "Code postal du terrain", en: "ZIP code of the plot" }, section: "surfaces", vue: "cp", t: "cp" },
    // La grille de la rénovation, dans son ordre. « Niveaux », qui l'ouvre, n'est pas une question : le type
    // de maison le décide, l'écran l'affiche en lecture seule (A7). L'interrupteur se pose sous la grille.
    compteur("sejour", "sejour", B.sejour),
    compteur("cuisines", "cuisine", B.cuisines),
    compteur("chambres", "chambres", B.chambres),
    compteur("suites", "suites", B.suites, { hint: lib("suitesAide") }),
    compteur("sdb", "sdb", B.sdb, { hint: lib("sdbAide"), minDe: minSdbNeuf }),
    compteur("wc", "wc", B.wc),
    compteur("couloir", "couloir", B.couloir),
    compteur("buanderie", "buanderie", B.buanderie),
    // Absent de la maison tant qu'on ne le règle pas : le nombre déduit de la surface (`menuiseriesNeuf`).
    compteur("menuiseries", "fenetres", B.menuiseries, { hint: lib("fenetresAide") }),
    { k: "cuisine", l: { fr: "Cuisine équipée comprise", en: "Fitted kitchen included" }, section: "pieces", vue: "interrupteur", o: [[true, oui], [false, non]] },
  ] },
  { g: { fr: "Structure", en: "Structure" }, qs: [
    { k: "plancherBas", l: { fr: "Plancher bas", en: "Ground floor" }, section: "technique", vue: "pastilles", o: [
      ["terre-plein", { fr: "Dalle sur terre-plein", en: "Slab on grade" }], ["vide-sanitaire", { fr: "Vide sanitaire", en: "Crawl space" }], ["sous-sol", { fr: "Sous-sol", en: "Basement" }],
    ] },
    { k: "murs", l: { fr: "Murs", en: "Walls" }, section: "technique", vue: "pastilles", o: [
      ["parpaing", { fr: "Parpaing", en: "Concrete block" }], ["brique", { fr: "Brique", en: "Brick" }], ["monomur", { fr: "Brique monomur", en: "Insulating brick" }],
      ["cellulaire", { fr: "Béton cellulaire", en: "Aerated concrete" }], ["ossature", { fr: "Ossature bois", en: "Timber frame" }],
    ] },
    { k: "escalier", l: { fr: "Escalier", en: "Staircase" }, section: "technique", vue: "segment", o: [
      ["bois", { fr: "Bois quart tournant", en: "Wooden quarter-turn" }], ["beton", { fr: "Béton", en: "Concrete" }],
    ], si: (m) => m.niveaux !== "pp" },
  ] },
  /* La couverture, les gouttières et la façade se choisissent sur leur ligne de choix, dans leur lot
     (N10 : « Couverture & zinguerie », « Façade ») ; la réponse de la maison suit (`choisirNeuf`). */
  { g: { fr: "Toit", en: "Roof" }, qs: [
    { k: "toiture", l: { fr: "Toiture", en: "Roof" }, section: "technique", vue: "pastilles", o: [
      ["2pans", { fr: "2 pans", en: "Gable" }], ["4pans", { fr: "4 pans", en: "Hip" }], ["plat", { fr: "Toit plat", en: "Flat roof" }],
    ] },
    { k: "penteFaible", l: { fr: "Toit à pente faible", en: "Low-pitch roof" }, section: "technique", vue: "segment", o: [
      [false, { fr: "Non (≈ 35°)", en: "No (≈ 35°)" }], [true, { fr: "Oui, tuile canal (≈ 17°)", en: "Yes, barrel tiles (≈ 17°)" }],
    ], si: (m) => m.toiture !== "plat" },
  ] },
  { g: { fr: "Chauffage et confort", en: "Heating and comfort" }, qs: [
    { k: "chauffage", l: { fr: "Chauffage", en: "Heating" }, section: "technique", vue: "cartes", o: [
      ["pac-eau", { fr: "PAC air/eau + plancher chauffant", en: "Air-to-water heat pump + underfloor heating" }],
      ["pac-air", { fr: "PAC air/air gainable", en: "Ducted air-to-air heat pump" }],
      ["poele", { fr: "Poêle à granulés + radiateurs", en: "Pellet stove + radiators" }],
    ], cartes: {
      "pac-eau": { eye: { fr: "Le plus courant", en: "Most common" },
        desc: { fr: "Une pompe à chaleur et un plancher chauffant à eau, coulé dans une chape liquide.", en: "A heat pump and water-based underfloor heating, set in a self-leveling screed." } },
      "pac-air": { eye: { fr: "Chaud et froid", en: "Heating and cooling" },
        desc: { fr: "Une pompe à chaleur gainable : de l'air chaud ou frais par des bouches, sur une chape classique.", en: "A ducted heat pump: warm or cool air through vents, on a standard screed." } },
      poele: { eye: { fr: "Le moins cher à poser", en: "Lowest upfront cost" },
        desc: { fr: "Un poêle à granulés et son conduit, et un radiateur électrique par chambre.", en: "A pellet stove and its flue, and an electric heater in each bedroom." } },
    } },
    { k: "vmc", l: { fr: "Ventilation", en: "Ventilation" }, section: "technique", vue: "segment", o: [
      ["simple", { fr: "Simple flux", en: "Single-flow" }], ["double", { fr: "Double flux", en: "Heat recovery (dual-flow)" }],
    ] },
  ] },
  { g: { fr: "Terrain et réseaux", en: "Plot and utilities" }, qs: [
    { k: "terrain", l: { fr: "Terrain", en: "Plot" }, section: "technique", vue: "segment", o: [["plat", { fr: "Plat", en: "Flat" }], ["pente", { fr: "En pente", en: "Sloping" }]] },
    { k: "argile", l: { fr: "Sol argileux (Géorisques)", en: "Clay soil (Géorisques)" }, section: "technique", vue: "pastilles", o: [
      ["non", { fr: "Non ou je ne sais pas", en: "No or I don't know" }], ["moyen", { fr: "Moyen", en: "Medium" }], ["fort", { fr: "Fort", en: "High" }],
    ] },
    { k: "sismique", l: { fr: "Zone sismique", en: "Seismic zone" }, section: "technique", vue: "pastilles", o: [
      [1, { fr: "1-2 ou je ne sais pas", en: "1-2 or I don't know" }], [3, { fr: "3", en: "3" }], [4, { fr: "4", en: "4" }], [5, { fr: "5", en: "5" }],
    ] },
    { k: "viabilise", l: { fr: "Terrain viabilisé", en: "Serviced plot" }, section: "technique", vue: "segment", o: [[true, oui], [false, non]],
      hint: { fr: "réseaux devant le terrain", en: "utilities at the plot boundary" } },
    { k: "distanceReseaux", l: { fr: "Distance maison – rue", en: "House to street distance" }, section: "technique", vue: "champ", t: "num", u: "m",
      min: B.distanceReseaux.min, max: B.distanceReseaux.max, step: 5 },
    { k: "lotissement", l: { fr: "Lotissement", en: "Subdivision" }, section: "technique", vue: "segment", o: [[false, non], [true, oui]] },
    { k: "borne", l: { fr: "Terrain déjà borné", en: "Boundaries already marked" }, section: "technique", vue: "segment", o: [[true, oui], [false, non]], si: (m) => !m.lotissement },
    { k: "evacTerreVegetale", l: { fr: "Terre végétale à évacuer", en: "Topsoil to remove" }, section: "technique", vue: "segment", o: [
      [false, { fr: "Non, gardée sur place", en: "No, kept on site" }], [true, oui],
    ] },
    { k: "assainissement", l: { fr: "Eaux usées", en: "Wastewater" }, section: "technique", vue: "pastilles", o: [
      ["collectif", { fr: "Tout-à-l'égout", en: "Mains sewer" }], ["fosse", { fr: "Fosse toutes eaux", en: "Septic tank" }], ["micro", { fr: "Micro-station", en: "Micro treatment plant" }],
    ] },
    { k: "eauxPluviales", l: { fr: "Eaux de pluie", en: "Rainwater" }, section: "technique", vue: "segment", o: [
      ["infiltration", { fr: "Infiltration sur la parcelle", en: "Soaked into the plot" }], ["reseau", { fr: "Réseau public", en: "Public storm drain" }],
    ] },
  ] },
  { g: { fr: "Finition et pilotage", en: "Finish and management" }, qs: [
    // Cartes : celles de la rénovation (`dictDetail().bien.finitions`) : mêmes noms, accroches et descriptions (A7).
    { k: "$finition", l: { fr: "Niveau de finition", en: "Finish level" }, section: "finition", vue: "cartes", o: [
      ["eco", { fr: "Éco", en: "Economy" }], ["standard", { fr: "Standard", en: "Standard" }], ["premium", { fr: "Premium", en: "Premium" }],
    ] },
    { k: "pilotage", l: { fr: "Qui pilote le chantier", en: "Who manages the build" }, section: "pilotage", vue: "segment", o: [
      ["moi", { fr: "Moi (lots séparés)", en: "Me (separate trades)" }], ["moe", { fr: "Un maître d'œuvre", en: "A project manager" }],
    ] },
  ] },
];

/** Toutes les questions, dans l'ordre de la table. */
export const TOUTES_QUESTIONS_NEUF: QuestionNeuf[] = QUESTIONS_NEUF.flatMap((g) => g.qs);

/** Les questions d'une rubrique qui ont un objet pour cette maison (les autres sont masquées). */
export function questionsVisibles(m: MaisonNeuve, section: SectionNeuf): QuestionNeuf[] {
  return TOUTES_QUESTIONS_NEUF.filter((q) => q.section === section && (!q.si || q.si(m)));
}

// ── La ligne de résumé des choix techniques (repliés) ───────────────────────────────────────────
type Court = Record<string, TexteFrEn>;
const COURT: Record<"murs" | "plancherBas" | "toiture" | "chauffage" | "assainissement", Court> = {
  murs: { parpaing: { fr: "Parpaing", en: "Concrete block" }, brique: { fr: "Brique", en: "Brick" }, monomur: { fr: "Monomur", en: "Insulating brick" },
    cellulaire: { fr: "Béton cellulaire", en: "Aerated concrete" }, ossature: { fr: "Ossature bois", en: "Timber frame" } },
  plancherBas: { "terre-plein": { fr: "dalle", en: "slab" }, "vide-sanitaire": { fr: "vide sanitaire", en: "crawl space" }, "sous-sol": { fr: "sous-sol", en: "basement" } },
  toiture: { "2pans": { fr: "2 pans", en: "gable roof" }, "4pans": { fr: "4 pans", en: "hip roof" }, plat: { fr: "toit plat", en: "flat roof" } },
  chauffage: { "pac-eau": { fr: "PAC air/eau", en: "air-to-water heat pump" }, "pac-air": { fr: "PAC air/air", en: "air-to-air heat pump" }, poele: { fr: "poêle à granulés", en: "pellet stove" } },
  assainissement: { collectif: { fr: "tout-à-l'égout", en: "mains sewer" }, fosse: { fr: "fosse toutes eaux", en: "septic tank" }, micro: { fr: "micro-station", en: "micro treatment plant" } },
};

/* Les autres réponses techniques : citées dans la ligne seulement quand elles s'écartent du réglage courant. */
const AUTRES: { k: keyof MaisonNeuve; si?: (m: MaisonNeuve) => boolean; texte: (v: never) => TexteFrEn }[] = [
  { k: "escalier", si: (m) => m.niveaux !== "pp", texte: (v: MaisonNeuve["escalier"]) => (v === "beton" ? { fr: "escalier béton", en: "concrete staircase" } : { fr: "escalier bois", en: "wooden staircase" }) },
  { k: "penteFaible", si: (m) => m.toiture !== "plat", texte: (v: boolean) => (v ? { fr: "pente faible", en: "low pitch" } : { fr: "pente ≈ 35°", en: "≈ 35° pitch" }) },
  { k: "vmc", texte: (v: MaisonNeuve["vmc"]) => (v === "double" ? { fr: "VMC double flux", en: "dual-flow ventilation" } : { fr: "VMC simple flux", en: "single-flow ventilation" }) },
  { k: "terrain", texte: (v: MaisonNeuve["terrain"]) => (v === "pente" ? { fr: "terrain en pente", en: "sloping plot" } : { fr: "terrain plat", en: "flat plot" }) },
  { k: "argile", texte: (v: MaisonNeuve["argile"]) => ({ non: { fr: "sol non argileux", en: "no clay soil" }, moyen: { fr: "sol argileux moyen", en: "medium clay soil" }, fort: { fr: "sol argileux fort", en: "high clay soil" } })[v] },
  { k: "sismique", texte: (v: number) => (v >= 3 ? { fr: `zone sismique ${v}`, en: `seismic zone ${v}` } : { fr: "zone sismique 1-2", en: "seismic zone 1-2" }) },
  { k: "viabilise", texte: (v: boolean) => (v ? { fr: "terrain viabilisé", en: "serviced plot" } : { fr: "terrain non viabilisé", en: "unserviced plot" }) },
  { k: "distanceReseaux", texte: (v: number) => ({ fr: `rue à ${v} m`, en: `street ${v} m away` }) },
  { k: "lotissement", texte: (v: boolean) => (v ? { fr: "lotissement", en: "subdivision" } : { fr: "hors lotissement", en: "not in a subdivision" }) },
  { k: "borne", si: (m) => !m.lotissement, texte: (v: boolean) => (v ? { fr: "terrain borné", en: "boundaries marked" } : { fr: "bornage à faire", en: "boundaries to mark" }) },
  { k: "evacTerreVegetale", texte: (v: boolean) => (v ? { fr: "terre végétale évacuée", en: "topsoil removed" } : { fr: "terre végétale gardée", en: "topsoil kept" }) },
  { k: "eauxPluviales", texte: (v: MaisonNeuve["eauxPluviales"]) => (v === "reseau" ? { fr: "eaux de pluie au réseau", en: "rainwater to the storm drain" } : { fr: "eaux de pluie infiltrées", en: "rainwater soaked in" }) },
];

/**
 * La ligne de résumé des choix techniques, repliés : murs · plancher bas · toit · chauffage · eaux usées
 * (« Parpaing · dalle · 2 pans · PAC air/eau · tout-à-l'égout »), puis chaque autre réponse qui s'écarte
 * du réglage courant (`maisonParDefaut`) et qui a un objet pour cette maison : la ligne dit vrai sans rien
 * déplier. La couverture, les gouttières et la façade n'y sont plus depuis N10 : elles se choisissent sur
 * leur ligne de choix, dans leur lot.
 */
export function resumeTechniqueNeuf(m: MaisonNeuve, locale: Locale): string {
  const t = (x: TexteFrEn | undefined) => (x ? x[locale] ?? x.fr : "");
  const items = [t(COURT.murs[m.murs]), t(COURT.plancherBas[m.plancherBas]), t(COURT.toiture[m.toiture]), t(COURT.chauffage[m.chauffage]),
    t(COURT.assainissement[m.assainissement])];
  const D = maisonParDefaut(m.surface);
  for (const a of AUTRES) {
    if (a.si && !a.si(m)) continue;
    if (m[a.k] !== D[a.k]) items.push(t(a.texte(m[a.k] as never)));
  }
  const s = items.filter(Boolean).join(" · ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

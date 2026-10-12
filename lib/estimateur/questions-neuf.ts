/**
 * CONSTRUCTION NEUVE — les questions du mode détaillé (« Affiner ma maison »).
 *
 * Données pures sorties de la maquette validée (`maquettes/neuf/app.js`, table `Q`) : six
 * groupes, chaque question décrit une réponse de `MaisonNeuve`. Le composant qui les affiche reste
 * générique : il lit cette table, il n'écrit aucune question. Une clé n'est pas dans la maison :
 * `$finition`, qui va dans les options du chiffrage. « Qui réalise » n'est plus une question (N3) :
 * il réécrivait toutes les lignes cochées ; c'est désormais le réglage « Nouveaux postes cochés »,
 * au-dessus des lots, qui ne touche aucune ligne (`reglerNouveauxNeuf`, `detaille-neuf.ts`).
 */
import type { MaisonNeuve } from "./neuf";
import type { TexteFrEn } from "./etapes-neuf";

export type CleQuestionNeuf = keyof MaisonNeuve | "$finition";
export type ValeurQuestionNeuf = string | number | boolean;

export interface QuestionNeuf {
  k: CleQuestionNeuf;
  l: TexteFrEn;
  /** Choix proposés : [valeur, libellé]. Absent pour une saisie (`t`). */
  o?: [ValeurQuestionNeuf, TexteFrEn][];
  /** Saisie : nombre (stepper), code postal, garage (avec / sans, surface). */
  t?: "num" | "cp" | "garage";
  u?: string;
  min?: number; max?: number; step?: number;
  /** La question n'a d'objet que si… (sinon elle est masquée, comme en rénovation). */
  si?: (m: MaisonNeuve) => boolean;
  hint?: TexteFrEn;
}

export interface GroupeQuestionsNeuf { g: TexteFrEn; qs: QuestionNeuf[] }

const oui = { fr: "Oui", en: "Yes" };
const non = { fr: "Non", en: "No" };

export const QUESTIONS_NEUF: GroupeQuestionsNeuf[] = [
  { g: { fr: "La maison", en: "The house" }, qs: [
    { k: "surface", l: { fr: "Surface habitable", en: "Living area" }, t: "num", u: "m²", min: 30, max: 400, step: 5 },
    { k: "codePostal", l: { fr: "Code postal", en: "Postcode" }, t: "cp" },
    { k: "niveaux", l: { fr: "Niveaux", en: "Levels" }, o: [
      ["pp", { fr: "Plain-pied", en: "Single storey" }], ["etage", { fr: "À étage", en: "Two storeys" }], ["combles", { fr: "Combles aménagés", en: "Converted attic" }],
    ] },
    { k: "forme", l: { fr: "Forme", en: "Shape" }, o: [
      ["rect", { fr: "Simple", en: "Simple" }], ["L", { fr: "En L", en: "L-shaped" }], ["complexe", { fr: "Complexe", en: "Complex" }],
    ] },
    { k: "garage", l: { fr: "Garage accolé", en: "Attached garage" }, t: "garage" },
    { k: "chambres", l: { fr: "Chambres", en: "Bedrooms" }, t: "num", min: 1, max: 8, step: 1 },
    { k: "sdb", l: { fr: "Salles d'eau", en: "Bathrooms" }, t: "num", min: 1, max: 4, step: 1 },
    { k: "wc", l: { fr: "WC", en: "Toilets" }, t: "num", min: 1, max: 4, step: 1 },
    { k: "cuisine", l: { fr: "Cuisine équipée", en: "Fitted kitchen" }, o: [[true, oui], [false, non]] },
  ] },
  { g: { fr: "Structure", en: "Structure" }, qs: [
    { k: "plancherBas", l: { fr: "Plancher bas", en: "Ground floor" }, o: [
      ["terre-plein", { fr: "Dalle sur terre-plein", en: "Slab on grade" }], ["vide-sanitaire", { fr: "Vide sanitaire", en: "Crawl space" }], ["sous-sol", { fr: "Sous-sol", en: "Basement" }],
    ] },
    { k: "murs", l: { fr: "Murs", en: "Walls" }, o: [
      ["parpaing", { fr: "Parpaing", en: "Concrete block" }], ["brique", { fr: "Brique", en: "Brick" }], ["monomur", { fr: "Brique monomur", en: "Insulating brick" }],
      ["cellulaire", { fr: "Béton cellulaire", en: "Aerated concrete" }], ["ossature", { fr: "Ossature bois", en: "Timber frame" }],
    ] },
    { k: "escalier", l: { fr: "Escalier", en: "Staircase" }, o: [
      ["bois", { fr: "Bois quart tournant", en: "Wooden quarter-turn" }], ["beton", { fr: "Béton", en: "Concrete" }],
    ], si: (m) => m.niveaux !== "pp", hint: { fr: "si étage", en: "if upstairs" } },
  ] },
  { g: { fr: "Toit et façade", en: "Roof and façade" }, qs: [
    { k: "toiture", l: { fr: "Toiture", en: "Roof" }, o: [
      ["2pans", { fr: "2 pans", en: "Gable" }], ["4pans", { fr: "4 pans", en: "Hip" }], ["plat", { fr: "Toit plat", en: "Flat roof" }],
    ] },
    { k: "couverture", l: { fr: "Couverture", en: "Roofing" }, o: [
      ["terre-cuite", { fr: "Tuiles terre cuite", en: "Clay tiles" }], ["beton", { fr: "Tuiles béton", en: "Concrete tiles" }], ["ardoise", { fr: "Ardoise", en: "Slate" }],
      ["ardoise-fibro", { fr: "Ardoise fibres-ciment", en: "Fibre-cement slate" }], ["bac-acier", { fr: "Bac acier", en: "Steel sheet" }], ["zinc", { fr: "Zinc", en: "Zinc" }],
    ], si: (m) => m.toiture !== "plat" },
    { k: "penteFaible", l: { fr: "Toit à pente faible", en: "Low-pitch roof" }, o: [
      [false, { fr: "Non (≈ 35°)", en: "No (≈ 35°)" }], [true, { fr: "Oui, tuile canal (≈ 17°)", en: "Yes, barrel tiles (≈ 17°)" }],
    ], si: (m) => m.toiture !== "plat" },
    { k: "gouttiere", l: { fr: "Gouttières", en: "Gutters" }, o: [
      ["zinc", { fr: "Zinc", en: "Zinc" }], ["pvc", { fr: "PVC", en: "PVC" }], ["alu", { fr: "Alu continu", en: "Seamless aluminium" }],
    ], si: (m) => m.toiture !== "plat" },
    { k: "facade", l: { fr: "Façade", en: "Façade" }, o: [
      ["enduit", { fr: "Enduit", en: "Render" }], ["bardage-bois", { fr: "Bardage bois", en: "Wood cladding" }], ["bardage-composite", { fr: "Bardage composite", en: "Composite cladding" }],
    ] },
  ] },
  { g: { fr: "Chauffage et confort", en: "Heating and comfort" }, qs: [
    { k: "chauffage", l: { fr: "Chauffage", en: "Heating" }, o: [
      ["pac-eau", { fr: "PAC air/eau + plancher chauffant", en: "Air-to-water heat pump + underfloor heating" }],
      ["pac-air", { fr: "PAC air/air gainable", en: "Ducted air-to-air heat pump" }],
      ["poele", { fr: "Poêle à granulés + radiateurs", en: "Pellet stove + radiators" }],
    ] },
    { k: "vmc", l: { fr: "Ventilation", en: "Ventilation" }, o: [
      ["simple", { fr: "Simple flux", en: "Single-flow" }], ["double", { fr: "Double flux", en: "Heat recovery (dual-flow)" }],
    ] },
  ] },
  { g: { fr: "Terrain et réseaux", en: "Plot and utilities" }, qs: [
    { k: "terrain", l: { fr: "Terrain", en: "Plot" }, o: [["plat", { fr: "Plat", en: "Flat" }], ["pente", { fr: "En pente", en: "Sloping" }]] },
    { k: "argile", l: { fr: "Sol argileux (Géorisques)", en: "Clay soil (Géorisques)" }, o: [
      ["non", { fr: "Non ou je ne sais pas", en: "No or I don't know" }], ["moyen", { fr: "Moyen", en: "Medium" }], ["fort", { fr: "Fort", en: "High" }],
    ] },
    { k: "sismique", l: { fr: "Zone sismique", en: "Seismic zone" }, o: [
      [1, { fr: "1-2 ou je ne sais pas", en: "1-2 or I don't know" }], [3, { fr: "3", en: "3" }], [4, { fr: "4", en: "4" }], [5, { fr: "5", en: "5" }],
    ] },
    { k: "viabilise", l: { fr: "Terrain viabilisé", en: "Serviced plot" }, o: [[true, oui], [false, non]], hint: { fr: "réseaux devant le terrain", en: "utilities at the plot boundary" } },
    { k: "distanceReseaux", l: { fr: "Distance maison – rue", en: "House to street distance" }, t: "num", u: "m", min: 0, max: 200, step: 5 },
    { k: "lotissement", l: { fr: "Lotissement", en: "Housing estate" }, o: [[false, non], [true, oui]] },
    { k: "borne", l: { fr: "Terrain déjà borné", en: "Boundaries already marked" }, o: [[true, oui], [false, non]], si: (m) => !m.lotissement },
    { k: "evacTerreVegetale", l: { fr: "Terre végétale à évacuer", en: "Topsoil to remove" }, o: [
      [false, { fr: "Non, gardée sur place", en: "No, kept on site" }], [true, oui],
    ] },
    { k: "assainissement", l: { fr: "Eaux usées", en: "Wastewater" }, o: [
      ["collectif", { fr: "Tout-à-l'égout", en: "Mains sewer" }], ["fosse", { fr: "Fosse toutes eaux", en: "Septic tank" }], ["micro", { fr: "Micro-station", en: "Micro treatment plant" }],
    ] },
    { k: "eauxPluviales", l: { fr: "Eaux de pluie", en: "Rainwater" }, o: [
      ["infiltration", { fr: "Infiltration sur la parcelle", en: "Soakaway on the plot" }], ["reseau", { fr: "Réseau public", en: "Public drain" }],
    ] },
  ] },
  { g: { fr: "Qui pilote, finition", en: "Who manages, finish" }, qs: [
    { k: "pilotage", l: { fr: "Qui pilote", en: "Who manages" }, o: [
      ["moi", { fr: "Moi (lots séparés)", en: "Me (separate trades)" }], ["moe", { fr: "Un maître d'œuvre", en: "A project manager" }],
    ] },
    { k: "$finition", l: { fr: "Finition", en: "Finish" }, o: [
      ["eco", { fr: "Éco", en: "Basic" }], ["standard", { fr: "Standard", en: "Standard" }], ["premium", { fr: "Premium", en: "Premium" }],
    ] },
  ] },
];

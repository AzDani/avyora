/**
 * Villes pour les pages SEO « Prix rénovation à [ville] ».
 * Le code postal (cp) sert au coefficient régional du moteur → chaque page a des prix réels.
 * Couverture : au moins une ville par département métropolitain (95) + Corse + 4 DOM, plus les
 * grandes métropoles à fort volume de recherche. Le département + la région (lib/geo.ts) enrichissent
 * chaque page pour un contenu unique par zone.
 */
import { regionCoef } from "./estimateur/core";
import { deptInfo } from "./geo";

export type Ville = { slug: string; nom: string; cp: string };

export const VILLES: Ville[] = [
  // ── Grandes métropoles ──
  { slug: "paris", nom: "Paris", cp: "75001" },
  { slug: "marseille", nom: "Marseille", cp: "13001" },
  { slug: "lyon", nom: "Lyon", cp: "69001" },
  { slug: "toulouse", nom: "Toulouse", cp: "31000" },
  { slug: "nice", nom: "Nice", cp: "06000" },
  { slug: "nantes", nom: "Nantes", cp: "44000" },
  { slug: "montpellier", nom: "Montpellier", cp: "34000" },
  { slug: "strasbourg", nom: "Strasbourg", cp: "67000" },
  { slug: "bordeaux", nom: "Bordeaux", cp: "33000" },
  { slug: "lille", nom: "Lille", cp: "59000" },
  { slug: "rennes", nom: "Rennes", cp: "35000" },
  { slug: "reims", nom: "Reims", cp: "51100" },
  { slug: "toulon", nom: "Toulon", cp: "83000" },
  { slug: "grenoble", nom: "Grenoble", cp: "38000" },
  { slug: "dijon", nom: "Dijon", cp: "21000" },
  { slug: "angers", nom: "Angers", cp: "49000" },
  { slug: "nimes", nom: "Nîmes", cp: "30000" },
  { slug: "aix-en-provence", nom: "Aix-en-Provence", cp: "13100" },
  { slug: "clermont-ferrand", nom: "Clermont-Ferrand", cp: "63000" },
  { slug: "le-havre", nom: "Le Havre", cp: "76600" },
  { slug: "rouen", nom: "Rouen", cp: "76000" },
  { slug: "nancy", nom: "Nancy", cp: "54000" },
  { slug: "annecy", nom: "Annecy", cp: "74000" },
  { slug: "versailles", nom: "Versailles", cp: "78000" },
  { slug: "saint-etienne", nom: "Saint-Étienne", cp: "42000" },
  { slug: "le-mans", nom: "Le Mans", cp: "72000" },
  { slug: "brest", nom: "Brest", cp: "29200" },
  { slug: "tours", nom: "Tours", cp: "37000" },
  { slug: "amiens", nom: "Amiens", cp: "80000" },
  { slug: "limoges", nom: "Limoges", cp: "87000" },
  { slug: "villeurbanne", nom: "Villeurbanne", cp: "69100" },
  { slug: "metz", nom: "Metz", cp: "57000" },
  { slug: "besancon", nom: "Besançon", cp: "25000" },
  { slug: "perpignan", nom: "Perpignan", cp: "66000" },
  { slug: "orleans", nom: "Orléans", cp: "45000" },
  { slug: "caen", nom: "Caen", cp: "14000" },
  { slug: "mulhouse", nom: "Mulhouse", cp: "68100" },
  { slug: "avignon", nom: "Avignon", cp: "84000" },
  { slug: "poitiers", nom: "Poitiers", cp: "86000" },
  { slug: "pau", nom: "Pau", cp: "64000" },
  { slug: "la-rochelle", nom: "La Rochelle", cp: "17000" },
  // ── Île-de-France (petite couronne & grande couronne) ──
  { slug: "boulogne-billancourt", nom: "Boulogne-Billancourt", cp: "92100" },
  { slug: "nanterre", nom: "Nanterre", cp: "92000" },
  { slug: "montreuil", nom: "Montreuil", cp: "93100" },
  { slug: "saint-denis", nom: "Saint-Denis", cp: "93200" },
  { slug: "creteil", nom: "Créteil", cp: "94000" },
  { slug: "argenteuil", nom: "Argenteuil", cp: "95100" },
  { slug: "cergy", nom: "Cergy", cp: "95000" },
  { slug: "evry-courcouronnes", nom: "Évry-Courcouronnes", cp: "91000" },
  { slug: "meaux", nom: "Meaux", cp: "77100" },
  { slug: "melun", nom: "Melun", cp: "77000" },
  // ── Nord & Hauts-de-France ──
  { slug: "roubaix", nom: "Roubaix", cp: "59100" },
  { slug: "tourcoing", nom: "Tourcoing", cp: "59200" },
  { slug: "dunkerque", nom: "Dunkerque", cp: "59140" },
  { slug: "valenciennes", nom: "Valenciennes", cp: "59300" },
  { slug: "calais", nom: "Calais", cp: "62100" },
  { slug: "arras", nom: "Arras", cp: "62000" },
  { slug: "beauvais", nom: "Beauvais", cp: "60000" },
  { slug: "compiegne", nom: "Compiègne", cp: "60200" },
  { slug: "saint-quentin", nom: "Saint-Quentin", cp: "02100" },
  // ── Sud & PACA / Occitanie ──
  { slug: "cannes", nom: "Cannes", cp: "06400" },
  { slug: "antibes", nom: "Antibes", cp: "06600" },
  { slug: "frejus", nom: "Fréjus", cp: "83600" },
  { slug: "beziers", nom: "Béziers", cp: "34500" },
  { slug: "narbonne", nom: "Narbonne", cp: "11100" },
  { slug: "carcassonne", nom: "Carcassonne", cp: "11000" },
  { slug: "montauban", nom: "Montauban", cp: "82000" },
  { slug: "albi", nom: "Albi", cp: "81000" },
  { slug: "tarbes", nom: "Tarbes", cp: "65000" },
  { slug: "gap", nom: "Gap", cp: "05000" },
  { slug: "digne-les-bains", nom: "Digne-les-Bains", cp: "04000" },
  { slug: "mende", nom: "Mende", cp: "48000" },
  { slug: "foix", nom: "Foix", cp: "09000" },
  { slug: "auch", nom: "Auch", cp: "32000" },
  { slug: "cahors", nom: "Cahors", cp: "46000" },
  { slug: "rodez", nom: "Rodez", cp: "12000" },
  { slug: "aubenas", nom: "Aubenas", cp: "07200" },
  // ── Nouvelle-Aquitaine ──
  { slug: "bayonne", nom: "Bayonne", cp: "64100" },
  { slug: "agen", nom: "Agen", cp: "47000" },
  { slug: "perigueux", nom: "Périgueux", cp: "24000" },
  { slug: "angouleme", nom: "Angoulême", cp: "16000" },
  { slug: "niort", nom: "Niort", cp: "79000" },
  { slug: "brive-la-gaillarde", nom: "Brive-la-Gaillarde", cp: "19100" },
  { slug: "mont-de-marsan", nom: "Mont-de-Marsan", cp: "40000" },
  { slug: "gueret", nom: "Guéret", cp: "23000" },
  // ── Bretagne & Pays de la Loire ──
  { slug: "quimper", nom: "Quimper", cp: "29000" },
  { slug: "lorient", nom: "Lorient", cp: "56100" },
  { slug: "vannes", nom: "Vannes", cp: "56000" },
  { slug: "saint-malo", nom: "Saint-Malo", cp: "35400" },
  { slug: "saint-brieuc", nom: "Saint-Brieuc", cp: "22000" },
  { slug: "saint-nazaire", nom: "Saint-Nazaire", cp: "44600" },
  { slug: "la-roche-sur-yon", nom: "La Roche-sur-Yon", cp: "85000" },
  { slug: "laval", nom: "Laval", cp: "53000" },
  // ── Centre-Val de Loire ──
  { slug: "bourges", nom: "Bourges", cp: "18000" },
  { slug: "chartres", nom: "Chartres", cp: "28000" },
  { slug: "chateauroux", nom: "Châteauroux", cp: "36000" },
  { slug: "blois", nom: "Blois", cp: "41000" },
  // ── Auvergne-Rhône-Alpes ──
  { slug: "valence", nom: "Valence", cp: "26000" },
  { slug: "chambery", nom: "Chambéry", cp: "73000" },
  { slug: "bourg-en-bresse", nom: "Bourg-en-Bresse", cp: "01000" },
  { slug: "montlucon", nom: "Montluçon", cp: "03100" },
  { slug: "aurillac", nom: "Aurillac", cp: "15000" },
  { slug: "le-puy-en-velay", nom: "Le Puy-en-Velay", cp: "43000" },
  // ── Bourgogne-Franche-Comté ──
  { slug: "chalon-sur-saone", nom: "Chalon-sur-Saône", cp: "71100" },
  { slug: "macon", nom: "Mâcon", cp: "71000" },
  { slug: "nevers", nom: "Nevers", cp: "58000" },
  { slug: "auxerre", nom: "Auxerre", cp: "89000" },
  { slug: "belfort", nom: "Belfort", cp: "90000" },
  { slug: "vesoul", nom: "Vesoul", cp: "70000" },
  { slug: "dole", nom: "Dole", cp: "39100" },
  // ── Grand Est ──
  { slug: "colmar", nom: "Colmar", cp: "68000" },
  { slug: "troyes", nom: "Troyes", cp: "10000" },
  { slug: "thionville", nom: "Thionville", cp: "57100" },
  { slug: "epinal", nom: "Épinal", cp: "88000" },
  { slug: "charleville-mezieres", nom: "Charleville-Mézières", cp: "08000" },
  { slug: "verdun", nom: "Verdun", cp: "55100" },
  { slug: "chaumont", nom: "Chaumont", cp: "52000" },
  // ── Normandie ──
  { slug: "evreux", nom: "Évreux", cp: "27000" },
  { slug: "cherbourg-en-cotentin", nom: "Cherbourg-en-Cotentin", cp: "50100" },
  { slug: "alencon", nom: "Alençon", cp: "61000" },
  // ── Corse ──
  { slug: "ajaccio", nom: "Ajaccio", cp: "20000" },
  { slug: "bastia", nom: "Bastia", cp: "20200" },
  // ── Outre-mer ──
  { slug: "fort-de-france", nom: "Fort-de-France", cp: "97200" },
  { slug: "pointe-a-pitre", nom: "Pointe-à-Pitre", cp: "97110" },
  // « de La Réunion » plutôt que « (La Réunion) » : le nom entre dans des titles et des phrases qui ont
  // déjà leurs parenthèses (« Prix rénovation à Saint-Denis (La Réunion) (2026) »).
  { slug: "saint-denis-reunion", nom: "Saint-Denis de La Réunion", cp: "97400" },
  { slug: "cayenne", nom: "Cayenne", cp: "97300" },
];

export function villeBySlug(slug: string): Ville | undefined {
  return VILLES.find((v) => v.slug === slug);
}

/**
 * Villes qui méritent une page dédiée : celles dont le coût de main-d'œuvre diffère réellement du
 * national (écart de -10 % à +20 %). Les 52 autres sont pile sur la moyenne — leur page dirait mot
 * pour mot ce que dit le hub national, ce que Google qualifie de doorway page. Elles sont
 * redirigées en 308 vers /prix-renovation plutôt que générées.
 * Mesuré sur les données : aucune ville ne se situe entre 0 % et 4 % d'écart, la coupure est nette.
 */
export const VILLES_SEO: Ville[] = VILLES.filter((v) => regionCoef(v.cp).mo !== 1);

/** Vrai si cette ville a une page dédiée (sinon : slug connu mais volontairement redirigé). */
export const aPageVille = (slug: string): boolean => VILLES_SEO.some((v) => v.slug === slug);

/** Villes retirées du SEO (écart de prix nul) : leurs URL sont redirigées en 308, pas supprimées. */
export const VILLES_RETIREES: Ville[] = VILLES.filter((v) => !VILLES_SEO.some((x) => x.slug === v.slug));

/** Villes qui étaient déclinées par la matrice avant le resserrement (top 40 de l'ancienne liste). */
export const MATRIX_VILLES_RETIREES: Ville[] = VILLES.slice(0, 40).filter(
  (v) => !VILLES_SEO.some((x) => x.slug === v.slug),
);

/**
 * Position (latitude, longitude en degrés) de chaque ville qui a une page — sert à ne proposer
 * « autour de » une ville que des villes RÉELLEMENT proches. Précision du centre-ville, largement
 * suffisante pour un rayon de 150 km. Une ville ajoutée à `VILLES_SEO` doit y figurer (vérifié par
 * tests/seo-contenu.test.ts) ; sans position, elle n'apparaît que dans « ailleurs en France ».
 */
export const COORDS: Record<string, readonly [number, number]> = {
  paris: [48.857, 2.352], marseille: [43.296, 5.37], lyon: [45.764, 4.836], toulouse: [43.605, 1.444],
  nice: [43.71, 7.262], nantes: [47.218, -1.554], montpellier: [43.611, 3.877], strasbourg: [48.573, 7.752],
  bordeaux: [44.838, -0.579], lille: [50.629, 3.057], rennes: [48.117, -1.678], toulon: [43.124, 5.928],
  grenoble: [45.188, 5.724], dijon: [47.322, 5.041], "aix-en-provence": [43.529, 5.447],
  "clermont-ferrand": [45.778, 3.087], "le-havre": [49.494, 0.108], rouen: [49.443, 1.099],
  nancy: [48.692, 6.184], annecy: [45.899, 6.129], versailles: [48.804, 2.13], villeurbanne: [45.767, 4.88],
  mulhouse: [47.75, 7.336], pau: [43.295, -0.371], "boulogne-billancourt": [48.836, 2.24],
  nanterre: [48.892, 2.207], montreuil: [48.864, 2.443], "saint-denis": [48.936, 2.357],
  creteil: [48.79, 2.455], argenteuil: [48.948, 2.248], cergy: [49.036, 2.063],
  "evry-courcouronnes": [48.629, 2.441], meaux: [48.96, 2.879], melun: [48.54, 2.661],
  roubaix: [50.692, 3.178], tourcoing: [50.724, 3.161], dunkerque: [51.034, 2.377],
  valenciennes: [50.358, 3.524], cannes: [43.552, 7.017], antibes: [43.58, 7.125], frejus: [43.433, 6.737],
  beziers: [43.344, 3.216], gap: [44.559, 6.079], mende: [44.518, 3.5], foix: [42.965, 1.607],
  auch: [43.646, 0.586], cahors: [44.448, 1.441], rodez: [44.351, 2.575], bayonne: [43.493, -1.475],
  "brive-la-gaillarde": [45.159, 1.533], gueret: [46.171, 1.871], "saint-malo": [48.649, -2.026],
  "saint-nazaire": [47.273, -2.214], laval: [48.073, -0.77], chateauroux: [46.811, 1.691],
  chambery: [45.564, 5.918], montlucon: [46.34, 2.603], aurillac: [44.927, 2.44],
  "le-puy-en-velay": [45.043, 3.885], nevers: [46.99, 3.159], auxerre: [47.798, 3.567],
  vesoul: [47.623, 6.155], colmar: [48.079, 7.358], epinal: [48.173, 6.45],
  "charleville-mezieres": [49.773, 4.72], verdun: [49.16, 5.384], chaumont: [48.111, 5.139],
  alencon: [48.432, 0.091], ajaccio: [41.919, 8.738], bastia: [42.697, 9.451],
  "fort-de-france": [14.616, -61.059], "pointe-a-pitre": [16.241, -61.533],
  "saint-denis-reunion": [-20.882, 55.45], cayenne: [4.922, -52.313],
};

/** Distance à vol d'oiseau entre deux villes, en km (formule de haversine) ; Infinity sans position. */
export function distanceKm(a: string, b: string): number {
  const pa = COORDS[a], pb = COORDS[b];
  if (!pa || !pb) return Infinity;
  const rad = Math.PI / 180;
  const dLat = (pb[0] - pa[0]) * rad, dLon = (pb[1] - pa[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(pa[0] * rad) * Math.cos(pb[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Rayon du bloc « autour de » : au-delà, ce n'est plus le même bassin d'artisans. */
export const RAYON_PROCHES_KM = 150;

/**
 * Villes à proposer en maillage depuis la page d'une ville donnée, en DEUX listes :
 *
 *  - `autour` : les villes à moins de RAYON_PROCHES_KM, de la plus proche à la plus lointaine
 *    (6 au plus). C'est la seule liste qu'on peut honnêtement titrer « autour de [ville] ».
 *  - `ailleurs` : une ROTATION déterministe sur la liste complète, décalée par l'index de la ville
 *    courante, qui complète jusqu'à `n` liens. Elle porte le maillage : chaque ville apparaît dans
 *    la rotation d'autant de pages qu'il y a de places, au lieu de dépendre de sa taille.
 *
 * POURQUOI DEUX LISTES. Une seule liste mélangeait les deux sous le titre « autour de » : la page de
 * Roubaix proposait Cannes, Gap et Foix « autour de Roubaix ». Et avant la rotation, chaque page
 * listait les 16 mêmes métropoles — 34 des 74 pages villes n'avaient qu'UN SEUL lien entrant.
 *
 * Déterministe (aucun aléa) : le rendu statique doit être stable d'un build à l'autre.
 */
export function villesProches(slug: string, n = 12): { autour: Ville[]; ailleurs: Ville[] } {
  const i = VILLES_SEO.findIndex((x) => x.slug === slug);
  if (i < 0) return { autour: [], ailleurs: VILLES_SEO.slice(0, n) };
  const autour = VILLES_SEO
    .filter((v) => v.slug !== slug)
    .map((v) => ({ v, d: distanceKm(slug, v.slug) }))
    .filter((x) => x.d <= RAYON_PROCHES_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(6, n))
    .map((x) => x.v);
  const vu = new Set<string>([slug, ...autour.map((v) => v.slug)]);
  const ailleurs: Ville[] = [];
  for (let k = 1; autour.length + ailleurs.length < n && k <= VILLES_SEO.length; k++) {
    const v = VILLES_SEO[(i + k) % VILLES_SEO.length];
    if (vu.has(v.slug)) continue;
    ailleurs.push(v); vu.add(v.slug);
  }
  return { autour, ailleurs };
}

/** Région d'un code postal. Import RELATIF : next.config.ts lit ce fichier sans l'alias « @/ ». */
const regionDe = (cp: string): string => deptInfo(cp).region;

export const regionDeVille = (slug: string): string =>
  regionDe(VILLES_SEO.find((x) => x.slug === slug)?.cp ?? "");

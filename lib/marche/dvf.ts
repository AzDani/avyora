/**
 * Ventes immobilières DVF (demandes de valeurs foncières, DGFiP, fichiers « geo-dvf » d'Etalab sur data.gouv.fr) :
 * lecture d'un fichier communal et statistiques de prix au m² des ventes comparables. Fonctions pures, sans réseau.
 * DVF ne couvre ni l'Alsace-Moselle (57, 67, 68 : livre foncier) ni Mayotte, et ne dit rien de l'état du bien.
 */

export type TypeVente = "appartement" | "maison";
export type Vente = { date: string; prix: number; surface: number; pieces: number; type: TypeVente; m2: number };

/** Départements sans DVF. */
export const HORS_DVF = new Set(["57", "67", "68", "976"]);

/** Bornes de cohérence d'un prix au m² : en dehors, la ligne est presque toujours une erreur ou une vente atypique. */
const M2_MIN = 300, M2_MAX = 30_000;

/** Découpe une ligne CSV (virgules, champs éventuellement entre guillemets). */
function champs(ligne: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < ligne.length; i++) {
    const ch = ligne[i];
    if (q) {
      if (ch === '"' && ligne[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Ventes d'un fichier geo-dvf communal. Une mutation n'est gardée que si c'est une vente simple (pas une VEFA, une
 * adjudication ou un échange) d'UN seul logement (appartement ou maison) ; ses dépendances (cave, parking) sont
 * tolérées. Le même logement répété sur plusieurs parcelles compte une fois.
 */
export function lireVentes(csv: string): Vente[] {
  const lignes = csv.split(/\r?\n/);
  const tete = champs(lignes[0] ?? "");
  const k = (n: string): number => tete.indexOf(n);
  const [cId, cDate, cNat, cVal, cType, cSurf, cPieces] = ["id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere", "type_local", "surface_reelle_bati", "nombre_pieces_principales"].map(k);
  if ([cId, cDate, cNat, cVal, cType, cSurf].some((x) => x < 0)) return [];
  const mutations = new Map<string, { date: string; nature: string; prix: number; logements: Set<string>; type?: TypeVente; surface: number; pieces: number }>();
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i]) continue;
    const f = champs(lignes[i]);
    const id = f[cId];
    let m = mutations.get(id);
    if (!m) { m = { date: f[cDate], nature: f[cNat], prix: Number(f[cVal]), logements: new Set(), surface: 0, pieces: 0 }; mutations.set(id, m); }
    const t = f[cType];
    if (t === "Appartement" || t === "Maison") {
      const surface = Number(f[cSurf]), pieces = Number(f[cPieces] || 0);
      m.logements.add(`${t}|${surface}|${pieces}`);
      m.type = t === "Appartement" ? "appartement" : "maison";
      m.surface = surface; m.pieces = pieces;
    } else if (t === "Local industriel. commercial ou assimilé") {
      m.logements.add("local"); // vente mixte : prix non attribuable au logement
    }
  }
  const out: Vente[] = [];
  for (const m of mutations.values()) {
    if (m.nature !== "Vente" || m.logements.size !== 1 || !m.type || !(m.surface >= 9) || !(m.prix > 0)) continue;
    const m2 = m.prix / m.surface;
    if (m2 < M2_MIN || m2 > M2_MAX) continue;
    out.push({ date: m.date, prix: m.prix, surface: m.surface, pieces: m.pieces, type: m.type, m2 });
  }
  return out;
}

/** Quantile par interpolation linéaire (q entre 0 et 1) d'une liste déjà triée. */
export function quantile(tri: number[], q: number): number {
  if (!tri.length) return NaN;
  const pos = (tri.length - 1) * q, b = Math.floor(pos), r = pos - b;
  return tri[b + 1] !== undefined ? tri[b] + r * (tri[b + 1] - tri[b]) : tri[b];
}

export type StatsVentes = {
  n: number;
  /** Les ventes retenues sont de surface proche (±30 %) ; false = toutes surfaces, faute de ventes proches. */
  surfaceProche: boolean;
  debut: string;
  fin: string;
  /** Prix au m² : 10e, 25e, 50e, 75e et 90e centiles. */
  p10: number; p25: number; med: number; p75: number; p90: number;
  /** Les 5 ventes de surface la plus proche, les plus récentes d'abord à surface égale. */
  exemples: Vente[];
};

/** Minimum de ventes pour donner une fourchette ; en dessous, pas de conseil. */
export const MIN_VENTES = 5;
/** Ventes de surface proche nécessaires pour s'y limiter ; sinon toutes les surfaces du même type. */
const MIN_PROCHES = 15;

/** Statistiques des ventes du même type sur les `mois` derniers mois des données (pas de la date du jour : DVF a du retard). */
export function statsVentes(ventes: Vente[], type: TypeVente, surface: number, mois = 24): StatsVentes | null {
  const memeType = ventes.filter((v) => v.type === type);
  if (!memeType.length) return null;
  const fin = memeType.reduce((m, v) => (v.date > m ? v.date : m), "");
  const d = new Date(fin + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - mois);
  const debutMin = d.toISOString().slice(0, 10);
  const recentes = memeType.filter((v) => v.date > debutMin);
  const proches = surface > 0 ? recentes.filter((v) => v.surface >= surface * 0.7 && v.surface <= surface * 1.3) : [];
  const surfaceProche = proches.length >= MIN_PROCHES;
  const base = surfaceProche ? proches : recentes;
  if (base.length < MIN_VENTES) return null;
  const tri = base.map((v) => v.m2).sort((a, b) => a - b);
  const exemples = [...base]
    .sort((a, b) => Math.abs(a.surface - surface) - Math.abs(b.surface - surface) || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
    .slice(0, 5);
  return {
    n: base.length, surfaceProche,
    debut: base.reduce((m, v) => (v.date < m ? v.date : m), base[0].date), fin,
    p10: quantile(tri, 0.1), p25: quantile(tri, 0.25), med: quantile(tri, 0.5), p75: quantile(tri, 0.75), p90: quantile(tri, 0.9),
    exemples,
  };
}

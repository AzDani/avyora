// Le moteur lit le SNAPSHOT généré depuis la base de connaissances (tables kb_*).
// Régénéré par lib/kb-db.ts `ecrireSnapshot()` à chaque édition admin. Le v0 reste la
// graine du premier seed. Le moteur reste pur/client-safe (import statique de JSON).
import ref from "./referentiel-prix.generated.json";

export type PosteRef = {
  corps_etat: string;
  poste: string;
  unite: string;
  prix_bas: number;
  prix_median: number;
  prix_haut: number;
  inclut?: string;
  confiance: string;
  part_mo?: number; // part de main d'œuvre (0-1) ; override de la valeur par corps d'état
};

export const REFERENTIEL = ref as unknown as {
  meta: { version: string; avertissement: string };
  postes: PosteRef[];
};

// Le référentiel et les fragments d'appel sont statiques : on met en cache chaque
// résolution (la page /projets estime tous les projets à chaque affichage).
const posteCache = new Map<string, PosteRef>();

/** Retrouve un poste du référentiel par corps d'état + fragment de libellé. */
export function getPoste(corpsEtat: string, fragment: string): PosteRef {
  const cle = `${corpsEtat}|${fragment.toLowerCase()}`;
  const enCache = posteCache.get(cle);
  if (enCache) return enCache;
  const frag = fragment.toLowerCase();
  const p = REFERENTIEL.postes.find(
    (p) => p.corps_etat === corpsEtat && p.poste.toLowerCase().includes(frag)
  );
  if (!p) throw new Error(`Poste introuvable : ${corpsEtat} / ${fragment}`);
  posteCache.set(cle, p);
  return p;
}

const DEPTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];
const DEPTS_METROPOLES = ["06", "13", "31", "33", "34", "35", "44", "59", "67", "69"];

/** Coefficient régional dérivé du code postal (référentiel = province). */
export function coefRegional(codePostal: string): { coef: number; label: string } {
  const dept = codePostal.slice(0, 2);
  if (DEPTS_IDF.includes(dept)) return { coef: 1.2, label: "Île-de-France (+20 %)" };
  if (DEPTS_METROPOLES.includes(dept))
    return { coef: 1.1, label: "Grande métropole (+10 %)" };
  return { coef: 1.0, label: "France hors IDF (référence)" };
}

/** Suggère un prix (médian) depuis la base en rapprochant un libellé libre d'un poste connu. */
export function suggestPrix(label: string): { prix: number; source: string } | null {
  const l = label.trim().toLowerCase();
  if (l.length < 3) return null;
  const mots = l.split(/\s+/).filter((m) => m.length > 2);
  let best: { p: PosteRef; score: number } | null = null;
  for (const p of REFERENTIEL.postes) {
    const pl = p.poste.toLowerCase();
    let score = 0;
    for (const m of mots) if (pl.includes(m)) score += m.length;
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  if (!best || best.score < 4) return null;
  return { prix: best.p.prix_median, source: best.p.poste };
}

export function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

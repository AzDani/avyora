import "server-only";
import { CATALOG, buildDevis, presetRapide, AMPLEURS, ampleurLabel, regionCoef, effPrices, finCoefTask, defaultCtx, type Ampleur, type TypeBien, type Finition } from "@/lib/estimateur";

/**
 * `label` est le libellé NEUTRE, à garder sur les grilles qui affichent côte à côte une colonne
 * appartement et une colonne maison (hubs, pages villes). `labelAppart` / `labelMaison` sont les
 * libellés spécialisés d'`ampleurLabel` — le niveau 4 s'appelle « Réno totale » pour un appartement
 * et « Réno lourde » pour une maison. N'utiliser les seconds que sur une grille mono-type, sinon
 * une ligne porterait un libellé d'appartement au-dessus d'une valeur maison.
 */
export type PrixLigne = {
  v: Ampleur;
  label: string;
  labelAppart: string;
  labelMaison: string;
  appartM2: number;
  maisonM2: number;
};

/** Estimation TTC (moteur) pour un bien : total et €/m², finition standard, tout confié aux artisans. */
export function estim(cp: string, type: TypeBien, surface: number, ampleur: Ampleur): { ttc: number; m2: number } {
  const { ctx, sel } = presetRapide({ type, surface, codePostal: cp, ampleur, finition: "standard", qui: "pros" });
  const dv = buildDevis(CATALOG, ctx, sel);
  const ttc = Math.round(dv.totaux.ttc);
  return { ttc, m2: surface > 0 ? Math.round(ttc / surface) : 0 };
}

function eurM2(cp: string, type: TypeBien, surface: number, ampleur: Ampleur): number {
  return estim(cp, type, surface, ampleur).m2;
}

/** Grille de prix TTC au m² (tout confié aux artisans, finition standard) par ampleur, pour une ville. */
export function prixVille(cp: string): PrixLigne[] {
  return AMPLEURS.map((a) => ({
    v: a.v,
    label: a.label,
    labelAppart: ampleurLabel(a.v, "T3").label,
    labelMaison: ampleurLabel(a.v, "Maison").label,
    appartM2: eurM2(cp, "T3", 70, a.v),   // appartement type ~70 m²
    maisonM2: eurM2(cp, "Maison", 100, a.v), // maison type ~100 m²
  }));
}

/** Grille de prix TTC au m² au niveau national (moyenne France), par ampleur. */
export function prixNational(): PrixLigne[] {
  return prixVille("");
}

export { regionCoef };

export type PosteRef = { lot: string; nom: string; unite: string; fp: number; sm: number | null };

/**
 * Prix de référence d'un poste du catalogue, pour les guides éditoriaux.
 * Les prix bruts du catalogue sont HT et calés sur la finition PREMIUM (coefficient 1) : les citer
 * tels quels surestimerait le cas courant. On applique donc le coefficient de finition demandé
 * (standard par défaut), exactement comme le fait le moteur — le guide ne peut pas diverger du
 * catalogue, puisqu'il le lit.
 */
export function posteRef(nom: string, finition: Finition = "standard"): PosteRef | null {
  for (const l of CATALOG) {
    const t = l.t.find((x) => x.n === nom);
    if (!t) continue;
    const ctx = { ...defaultCtx(), finition };
    const { fp, sm } = effPrices(t, undefined, ctx);
    if (fp == null) return null;
    const c = finCoefTask(ctx, l, t);
    return { lot: l.c, nom: t.n, unite: t.u, fp: Math.round(fp * c), sm: sm == null ? null : Math.round(sm * c) };
  }
  return null;
}

export type PartMO = { lot: string; postes: number; avecFourniture: number; partMO: number };

/**
 * Part de main-d'œuvre par lot, calculée depuis le catalogue : 1 − (somme des prix fourniture seule
 * / somme des prix fourni-posé), sur les seuls postes qui portent les deux prix.
 *
 * C'est la donnée qui permet de chiffrer honnêtement l'auto-rénovation : elle dit, lot par lot,
 * quelle part du prix est du geste et non de la matière. Calculée à l'exécution — un chiffre écrit
 * en dur divergerait du catalogue à la première révision de prix.
 */
export function partMainOeuvreParLot(): PartMO[] {
  const out: PartMO[] = [];
  for (const l of CATALOG) {
    let n = 0, avec = 0, sfp = 0, ssm = 0;
    for (const t of l.t) {
      n++;
      if (t.sm != null && t.fp != null) { avec++; sfp += t.fp; ssm += t.sm; }
    }
    if (avec > 0 && sfp > 0) out.push({ lot: l.c, postes: n, avecFourniture: avec, partMO: Math.round((1 - ssm / sfp) * 100) });
  }
  return out.sort((a, b) => b.partMO - a.partMO);
}

/** Postes sans prix « fourniture seule » : prestations pures, rien à acheter — donc rien à faire soi-même. */
export function postesSansFourniture(): { lot: string; nom: string }[] {
  const out: { lot: string; nom: string }[] = [];
  for (const l of CATALOG) for (const t of l.t) if (t.sm == null) out.push({ lot: l.c, nom: t.n });
  return out;
}

/** Compteurs globaux du catalogue, pour ne jamais écrire « 200 postes » ou « 18 lots » en dur. */
export function catalogueStats() {
  const postes = CATALOG.reduce((n, l) => n + l.t.length, 0);
  const avec = CATALOG.reduce((n, l) => n + l.t.filter((t) => t.sm != null).length, 0);
  return { lots: CATALOG.length, postes, avecFourniture: avec, sansFourniture: postes - avec,
           pctAvec: Math.round((avec / postes) * 100) };
}

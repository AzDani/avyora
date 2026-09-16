import "server-only";
import { CATALOG, buildDevis, presetRapide, AMPLEURS, regionCoef, effPrices, finCoefTask, defaultCtx, type Ampleur, type TypeBien, type Finition } from "@/lib/estimateur";

export type PrixLigne = { v: Ampleur; label: string; appartM2: number; maisonM2: number };

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

import "server-only";
import { CATALOG, buildDevis, presetRapide, AMPLEURS, regionCoef, type Ampleur, type TypeBien } from "@/lib/estimateur";

export type PrixLigne = { v: Ampleur; label: string; appartM2: number; maisonM2: number };

function eurM2(cp: string, type: TypeBien, surface: number, ampleur: Ampleur): number {
  const { ctx, sel } = presetRapide({ type, surface, codePostal: cp, ampleur, finition: "standard", qui: "pros" });
  const dv = buildDevis(CATALOG, ctx, sel);
  return surface > 0 ? Math.round(dv.totaux.ttc / surface) : 0;
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

export { regionCoef };

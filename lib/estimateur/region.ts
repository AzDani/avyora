/**
 * Coefficient régional (main-d'œuvre) — sans le moteur ni le catalogue : l'estimation rapide publique l'importe
 * seule pour afficher la zone du code postal (le chiffrage, lui, se fait côté serveur). Réexporté par `core.ts`.
 *
 * La MO varie fortement selon la région ; les matériaux sont ~nationaux (sauf outre-mer,
 * logistique îles). Barème modéré par département (2 premiers chiffres du code postal).
 */
export interface RegionCoef { mo: number; mat: number; zone: string; }
const REG_TIERS: { c: number; z: string; dep: string[] }[] = [
  { c: 1.20, z: "Paris & petite couronne", dep: ["75", "92", "93", "94"] },
  { c: 1.10, z: "Zone tendue", dep: ["77", "78", "91", "95", "06", "83", "13", "69", "74", "73"] },
  { c: 1.04, z: "Grande agglomération", dep: ["33", "31", "44", "35", "59", "67", "34", "38", "21", "54", "68", "64", "63", "76"] },
  { c: 0.90, z: "Zone rurale", dep: ["23", "15", "58", "55", "52", "08", "36", "48", "32", "46", "09", "88", "70", "03", "43", "12", "19", "89", "05", "53", "61"] },
];
const REG_DEP: Record<string, { c: number; z: string }> = {};
for (const t of REG_TIERS) for (const d of t.dep) REG_DEP[d] = { c: t.c, z: t.z };
const REG_DOM: Record<string, string> = { "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte" };

/** Coefficient régional depuis un code postal : { mo, mat, zone }. Défaut = moyenne nationale. */
export function regionCoef(cp?: string): RegionCoef {
  const d = (cp || "").replace(/\D/g, "");
  if (d.length < 2) return { mo: 1, mat: 1, zone: "Moyenne nationale" };
  const dom = REG_DOM[d.slice(0, 3)];
  if (dom) return { mo: 1.05, mat: 1.15, zone: dom + " (outre-mer)" };
  if (d.slice(0, 2) === "20") return { mo: 1.08, mat: 1.05, zone: "Corse" };
  const hit = REG_DEP[d.slice(0, 2)];
  return hit ? { mo: hit.c, mat: 1, zone: hit.z } : { mo: 1, mat: 1, zone: "Moyenne nationale" };
}

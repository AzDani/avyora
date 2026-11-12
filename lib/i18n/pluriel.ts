import type { Locale } from "./config";

/**
 * Accord en nombre selon la langue. Français : singulier pour 0 et 1 (« 0 poste », « 1 poste »).
 * Anglais : singulier pour 1 seulement (« 0 line items », « 1 line item »). La règle française
 * appliquée à l'anglais affichait « 0 trade · 0 line item ».
 */
export function accord(locale: Locale | string, n: number, singulier: string, pluriel: string): string {
  if (locale === "en") return n === 1 ? singulier : pluriel;
  return Math.abs(n) >= 2 ? pluriel : singulier;
}

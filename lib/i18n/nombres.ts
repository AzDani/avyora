import type { Locale } from "./config";

/**
 * Nombres et montants dans la langue de la page (revue rénovation / neuf, N14) : virgule et espace
 * fine en français (« 130,78 m² », « 92 000 € »), point et virgule en anglais américain (« 130.78 m² »,
 * « 92,000 € », l'euro après le montant comme dans tout le produit). Sans dépendance : utilisable côté
 * serveur comme dans un composant client.
 */
export const nfDe = (locale: Locale | string): string => (locale === "en" ? "en-US" : "fr-FR");

/** Un nombre, `dec` décimales au plus (les zéros inutiles tombent : 130,5 et non 130,50). */
export function nombre(locale: Locale | string, n: number, dec = 0): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString(nfDe(locale), { maximumFractionDigits: dec });
}

/** Un montant arrondi à l'euro, « € » après le nombre. */
export function euros(locale: Locale | string, n: number): string {
  return Math.round(Number.isFinite(n) ? n : 0).toLocaleString(nfDe(locale)) + " €";
}

/** Un pourcentage : « 5,5 % » en français (l'espace d'avant, inchangé), « 5.5% » en anglais. */
export function pourcent(locale: Locale | string, n: number, dec = 1): string {
  return nombre(locale, n, dec) + (locale === "en" ? "%" : " %");
}

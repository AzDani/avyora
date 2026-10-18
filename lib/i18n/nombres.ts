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

/** Le signe « % » d'un pourcentage déjà écrit : collé en anglais (« 7% »), après une espace INSÉCABLE en
 *  français (« 7 % »), pour que « % » ne passe jamais seul à la ligne (F1). */
export const signePct = (locale: Locale | string): string => (locale === "en" ? "%" : "\u00a0%");

/** Un pourcentage : « 5,5 % » en français (espace insécable), « 5.5% » en anglais. */
export function pourcent(locale: Locale | string, n: number, dec = 1): string {
  return nombre(locale, n, dec) + signePct(locale);
}

/**
 * Un montant tapé à la main, quelle que soit la langue : « 1 500 », « 1500,50 », « 1.234,56 » (FR),
 * « 1,500 », « 1,500.50 » (EN). Le DERNIER séparateur (point ou virgule) est la décimale s'il est suivi
 * d'un ou deux chiffres, sinon un séparateur de milliers. Illisible : NaN.
 */
export function lireMontant(texte: string): number {
  const t = String(texte ?? "").replace(/[\s  €]/g, "");
  if (!/^\d[\d.,]*$/.test(t)) return NaN;
  const i = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  if (i < 0) return Number(t);
  const apres = t.slice(i + 1);
  if (apres.length >= 1 && apres.length <= 2) return Number(t.slice(0, i).replace(/[.,]/g, "") + "." + apres);
  return Number(t.replace(/[.,]/g, ""));
}

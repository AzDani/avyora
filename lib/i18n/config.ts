/**
 * i18n léger (sans exploser les URLs) : la langue est stockée dans un cookie, lue côté serveur.
 * FR par défaut (marché actuel). EN = préparation du lancement US. Le contenu SEO/légal reste FR ;
 * seule l'interface produit est traduite. Quand un vrai contenu US existera, on ajoutera des routes
 * /en dédiées (bon pour le SEO US).
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "av-lang";

/**
 * Interrupteur global de l'i18n. `false` = tout le site en français, sélecteur masqué
 * (le code de traduction reste en place). Repasser à `true` pour réactiver l'anglais.
 */
export const I18N_ENABLED = true;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

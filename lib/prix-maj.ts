/**
 * Date de dernière révision du référentiel de prix — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Trois consommateurs : la mention « Prix mis à jour le … » visible sur les pages prix, le
 * `dateModified` des données structurées, et le `lastModified` du sitemap pour ces mêmes pages.
 *
 * ⚠ À mettre à jour À LA MAIN quand les prix du catalogue changent réellement.
 * Ne pas remplacer par `new Date()` : le sitemap annoncerait alors 500 pages modifiées à chaque
 * déploiement, y compris celles qui n'ont pas bougé — Google finit par ignorer un lastmod ainsi
 * dilué, et le budget de crawl part sur des pages inchangées.
 */
export const PRIX_MAJ = "2026-09-19";

/** Version lisible, pour l'affichage (ex. « 16 septembre 2026 »). */
export const PRIX_MAJ_FR = new Date(PRIX_MAJ).toLocaleDateString("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Année des prix publiés — celle qu'affichent les titles, les h1 et les FAQ des pages de prix
 * (« Prix d'une rénovation à Lyon en 2026 »). DÉRIVÉE de PRIX_MAJ, jamais de l'horloge :
 * - écrite en dur, elle était répétée 53 fois et se périmait le 1er janvier ;
 * - tirée de `new Date()`, elle afficherait « 2027 » sur des prix révisés en 2026, ce qui serait faux.
 * Elle ne change donc qu'avec une vraie révision du référentiel (mise à jour de PRIX_MAJ ci-dessus).
 */
export const ANNEE_PRIX = PRIX_MAJ.slice(0, 4);

/**
 * Date de dernière modification RÉELLE des pages qui ne sont pas des pages de prix (accueil,
 * estimateurs, /tarifs, hubs éditoriaux) — pour le `lastModified` du sitemap.
 * Même règle que PRIX_MAJ : à la main, quand le contenu de ces pages change vraiment.
 */
export const SITE_MAJ = "2026-11-12";

/**
 * Date de la version en vigueur de chaque page légale (celle affichée sous son titre,
 * « Dernière mise à jour : … »). À mettre à jour EN MÊME TEMPS que la page.
 */
export const LEGAL_MAJ: Record<"mentions-legales" | "cgu" | "cgv" | "confidentialite" | "cookies", string> = {
  "mentions-legales": "2026-09-12",
  cgu: "2026-10-16",
  cgv: "2026-10-16",
  confidentialite: "2026-09-06",
  cookies: "2026-09-06",
};

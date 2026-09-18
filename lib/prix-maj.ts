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

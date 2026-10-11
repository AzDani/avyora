/**
 * Interrupteurs de fonctionnalités — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Objectif MVP : ne vendre QUE l'estimateur. Tout le reste (chantier, analyse de devis,
 * rentabilité, documents, artisans, plateforme complète) est déjà construit mais MASQUÉ.
 * Pour réactiver une fonction plus tard : passer son flag à `true` (rien n'a été supprimé).
 *
 * Le masquage se fait à 3 endroits (menu, accueil, fiche projet) + redirection des routes
 * cachées vers l'accueil. On ne rend pas le code, on ne le supprime pas → réversible, sans risque.
 */
export const FEATURES = {
  estimateur: true, // le produit vendu
  projets: true, // liste + sauvegarde des estimations
  artisans: false,
  chantier: false,
  devis: false, // analyse de devis
  rentabilite: false,
  documents: false,
  plateforme: false, // grille marketing des 10 modules sur l'accueil
  /**
   * Construction neuve (estimation d'une maison à construire). Allumée en développement local,
   * éteinte dans un build de production tant que `NEXT_PUBLIC_FEATURE_NEUF` ne vaut pas « 1 ».
   * Ne jamais l'allumer en production avant le lancement (chantier C8). À `false`, le site public
   * est identique à aujourd'hui : les pages du neuf renvoient `notFound()`, aucun point d'entrée.
   */
  neuf: process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FEATURE_NEUF === "1",
} as const;

/**
 * La fiche projet se limite au résultat d'estimation tant qu'aucune fonction « atelier »
 * (chantier / devis / rentabilité / documents) n'est active.
 */
export const FICHE_PROJET_SIMPLE =
  !(FEATURES.chantier || FEATURES.devis || FEATURES.rentabilite || FEATURES.documents);

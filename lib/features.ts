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
   * Construction neuve (estimation d'une maison à construire) — lancée le 11/10/2026.
   * Allumée partout. Pour l'éteindre en urgence sans toucher au code : NEXT_PUBLIC_FEATURE_NEUF=0
   * dans les variables de Vercel, puis redéployer. Éteinte, le neuf disparaît : ses pages renvoient
   * `notFound()`, aucun point d'entrée n'est affiché, `/projets/nouveau` redevient l'écran de la
   * rénovation sans pré-page « Quel est ton projet ? ». Mais ce n'est PLUS un retour au site d'avant
   * le neuf : depuis la revue réno / neuf (docs/construction-neuve/revue-reno-neuf.md), des chantiers
   * changent aussi la rénovation quel que soit l'interrupteur (« Je le fais » et ses étiquettes dans
   * les lignes, liens qui portent `?nature=reno`, mesure par nature…). Revenir au site d'avant passe
   * par le redéploiement d'une version antérieure.
   */
  neuf: process.env.NEXT_PUBLIC_FEATURE_NEUF !== "0",
  /** Éditeur de plan en ligne (« Mes plans »). En ligne depuis le 12/10/2026 (C11) : NEXT_PUBLIC_FEATURE_PLANS=0
   *  l'éteint d'urgence sans toucher au code (au build : la variable est lue à la compilation). */
  plans: process.env.NEXT_PUBLIC_FEATURE_PLANS !== "0",
} as const;

/**
 * La fiche projet se limite au résultat d'estimation tant qu'aucune fonction « atelier »
 * (chantier / devis / rentabilité / documents) n'est active.
 */
export const FICHE_PROJET_SIMPLE =
  !(FEATURES.chantier || FEATURES.devis || FEATURES.rentabilite || FEATURES.documents);

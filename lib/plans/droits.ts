/**
 * Les droits Gratuit / Pro de l'éditeur de plan, dits par le SITE avec les mots de l'éditeur.
 *
 * Source de vérité : la table `DROITS` de `maquettes/plan-editor.html` (D48, D67, D68, D71). Le site n'en
 * recopie que les phrases qu'il affiche (vitrine `/logiciel-plan-maison`, puce et encart de `/tarifs`), au
 * caractère près : `node maquettes/tools/coherence.mjs` (§ 9) échoue si une phrase d'ici n'est plus dans
 * `DROITS`, ou si la vitrine et la page Tarifs ne les reprennent pas. L'éditeur est en français : ces
 * phrases aussi. Les textes anglais du site les traduisent à côté (`lib/i18n/plans.ts`, `dictionaries.ts`).
 *
 * Aucun prix, aucun emoji.
 */
export const DROITS_EDITEUR = {
  /** DROITS.dessin.planFinal (D68 : en gratuit, on dessine son Plan final). */
  dessinPlanFinal: "dessiner ton plan final",
  /** DROITS.controle.gratuit (le même en Pro). */
  controle: "les surfaces et le contrôle du plan",
  /** DROITS.vue3d.gratuit (D71 : la même pour tous). */
  vue3d: "la vue 3D de ton plan",
  /** DROITS.export.planFinal.gratuit (D67 : le dossier d'un Plan final). */
  exportPlanFinalGratuit: "le dossier PDF de tes plans, avec filigrane",
  /** DROITS.export.planFinal.pro */
  exportPlanFinalPro: "le dossier PDF de tes plans sans filigrane, avec le contrôle du plan et les surfaces",
  /** DROITS.plans.gratuit */
  plansGratuit: "1 plan enregistré",
  /** DROITS.plans.pro */
  plansPro: "des plans enregistrés sans limite",
  /** DROITS.renovation.pro (D68 : le Projet rénovation est Pro). */
  renovationPro: "le projet rénovation, pour partir de ton logement tel qu'il est et chiffrer ce qui change",
  /** DROITS.detail.pro */
  detailPro: "le détail tâche par tâche, avec le prix de chaque tâche",
  /** DROITS.suivi.pro */
  suiviPro: "le suivi de chantier avec le prix de chaque tâche, et ce qui est déjà réalisé",
} as const;

const D = DROITS_EDITEUR;

/** La colonne « Gratuit » de la vitrine : ce qu'a un gratuit, c'est-à-dire un Plan final (D68). */
export const COLONNE_GRATUIT = [D.dessinPlanFinal, D.controle, D.vue3d, D.exportPlanFinalGratuit, D.plansGratuit] as const;

/** La colonne « Pro » de la vitrine : ce que Pro ajoute (tout le gratuit est compris). */
export const COLONNE_PRO = [D.plansPro, D.exportPlanFinalPro, D.renovationPro, D.detailPro, D.suiviPro] as const;

/**
 * La puce « Éditeur de plan » de la page Tarifs : trois droits Pro, le dernier réduit à sa première
 * proposition (avant la virgule), séparés par « ; » (les phrases de `DROITS` portent déjà des virgules).
 */
export const PUCE_TARIFS = [D.plansPro, D.renovationPro, D.exportPlanFinalPro.split(",")[0]] as const;

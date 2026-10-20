/**
 * Paramètres fiscaux du simulateur d'investissement (module M3), arrêtés au 19/10/2026.
 * Source de vérité : docs/investissement/regles-fiscales-2026.md (chaque valeur y a sa source officielle
 * et son statut). Ne changer une valeur ici qu'en mettant ce document à jour.
 */

/** Barème de l'IR applicable aux revenus 2025 (LF 2026, art. 197 CGI). Revenus 2026 : barème non voté. */
export const BAREME_IR = [
  { jusqua: 11_600, taux: 0 },
  { jusqua: 29_579, taux: 0.11 },
  { jusqua: 84_577, taux: 0.3 },
  { jusqua: 181_917, taux: 0.41 },
  { jusqua: Infinity, taux: 0.45 },
] as const;

/** Plafonnement du quotient familial : avantage maximal par demi-part au-delà des parts de base (art. 197 I-2). */
export const PLAFOND_DEMI_PART = 1_807;

/** Décote (art. 197 I-4) : seuil, forfait et coefficient, pour une personne seule et pour un couple. */
export const DECOTE = { seul: { seuil: 1_982, forfait: 897 }, couple: { seuil: 3_277, forfait: 1_483 }, coef: 0.4525 } as const;

/** L'IR n'est pas mis en recouvrement en dessous de ce montant (art. 1657-1 bis). */
export const IR_MIN_RECOUVRE = 61;

/** Prélèvements sociaux 2026 (LFSS 2026 art. 12) : deux taux selon la nature du revenu. */
export const PS = {
  /** Revenus fonciers (location nue, SCI à l'IR) et plus-values immobilières des particuliers. */
  foncier: 0.172,
  /** Revenus LMNP, dividendes, intérêts de compte courant, plus-values de parts de société à l'IS. */
  patrimoine: 0.186,
  /** Part de CSG déductible du revenu global l'année du paiement (art. 154 quinquies). */
  csgDeductible: 0.068,
} as const;

/** Prélèvement forfaitaire unique 2026 (art. 200 A) : 12,8 % d'IR + 18,6 % de prélèvements sociaux. */
export const PFU = 0.314;

/** Micro-foncier (art. 32) : plafond de recettes du foyer et abattement. */
export const MICRO_FONCIER = { plafond: 15_000, abattement: 0.3 } as const;

/** Déficit foncier imputable sur le revenu global (art. 156 I-3°) ; majoré pour une rénovation énergétique
 *  (passage de E, F ou G à A, B, C ou D, dépenses payées jusqu'au 31/12/2027). */
export const DEFICIT_FONCIER = { plafond: 10_700, plafondRenoEnergetique: 21_400, reportAns: 10 } as const;

/** Forfait de frais de gestion déductible par local en location nue (art. 31 I-1° e). */
export const FORFAIT_GESTION_LOCAL = 20;

/** Statut du bailleur privé (LF 2026 art. 47, art. 31 I-1° i et j) : taux annuels, base et plafond par foyer.
 *  Confiance moyenne : taux et base relevés par l'ANIL et service-public, BOFiP pas encore publié. */
export const BAILLEUR_PRIVE = {
  taux: {
    neuf: { intermediaire: 0.035, social: 0.045, tres_social: 0.055 },
    ancien: { intermediaire: 0.03, social: 0.035, tres_social: 0.04 },
  },
  baseQuotePrix: 0.8,
  seuilTravauxAncien: 0.3,
  plafond: { intermediaire: 8_000, social: 10_000, tres_social: 12_000 },
  dureeEngagementAns: 9,
} as const;

/** Micro-BIC location meublée de longue durée (art. 50-0) : revenus 2026 à 2028. */
export const MICRO_BIC = { plafond: 83_600, abattement: 0.5, abattementMin: 305 } as const;

/** Seuil de recettes au-delà duquel le loueur meublé peut devenir professionnel (art. 155 IV). */
export const SEUIL_LMP = 23_000;

/** Report des déficits LMNP sur les revenus LMNP (art. 156 I 1° ter). */
export const DEFICIT_LMNP_REPORT_ANS = 10;

/** CFE d'un loueur meublé : exonérée si les recettes de N−2 ne dépassent pas ce montant (art. 1647 D). */
export const CFE_SEUIL_RECETTES = 5_000;

/** Impôt sur les sociétés (art. 219) : taux réduit PME jusqu'au seuil, taux normal au-delà. */
export const IS = { tauxReduit: 0.15, seuilReduit: 42_500, tauxNormal: 0.25 } as const;

/** Contribution sur les revenus locatifs des sociétés à l'IS (art. 234 nonies) : immeuble achevé depuis 15 ans au moins. */
export const CRL = { taux: 0.025, ageImmeubleAns: 15, seuilRecettes: 1_830 } as const;

/** Frais d'acquisition (art. 1594 D, 1584, 1647 V, 879 ; art. A444-91 C. com.). */
export const FRAIS_ACHAT = {
  /** Taux global des droits = taux départemental × 1,0237 + 1,20 %. */
  coefDept: 1.0237,
  taxeCommunale: 0.012,
  tauxDeptMajore: 0.05,
  /** Départements restés à 4,50 % au 01/06/2026 (table DGFiP). */
  depts450: ["05", "06", "07", "16", "26", "48", "60", "65", "71", "971", "976"],
  /** Indre : 3,80 %. */
  depts380: ["36"],
  /** Neuf / VEFA soumis à TVA : taxe de publicité foncière 0,70 % + 2,14 % de frais d'assiette. */
  neufTaux: 0.007 * 1.0214,
  csi: { taux: 0.001, min: 15 },
  emoluments: [
    { jusqua: 6_500, taux: 0.0387 },
    { jusqua: 17_000, taux: 0.01596 },
    { jusqua: 60_000, taux: 0.01064 },
    { jusqua: Infinity, taux: 0.00799 },
  ],
  /** TVA sur les émoluments : 20 % en métropole, 8,5 % en Guadeloupe, Martinique, Réunion, 0 en Guyane et à Mayotte. */
  tvaEmoluments: { defaut: 0.2, "971": 0.085, "972": 0.085, "974": 0.085, "973": 0, "976": 0 } as Record<string, number>,
  /** Débours du notaire : paramètre, environ 800 à 1 500 €. */
  debours: 1_000,
} as const;

/** Valeurs par défaut non officielles (marquées « à confirmer » dans le document), modifiables par l'utilisateur. */
/** Majoration du loyer meublé sur le loyer nu. Pas de chiffre national officiel : +14 % à Paris (loyers de référence
 *  de l'encadrement, 2025), environ +10 % le plus souvent cité ailleurs ; on retient le milieu. */
export const MAJORATION_MEUBLE = 0.12;

export const DEFAUTS = {
  comptableLmnp: 500,
  comptableSciIr: 400,
  comptableIs: 1_440, // 1 200 € HT, TVA non récupérable
  fraisBancairesSociete: 80,
  creationSociete: 1_000,
  terrainPct: 15,
  /** Grille par composants appliquée au bâti (hors terrain) : quote-part et durée. */
  composants: [
    { nom: "gros_oeuvre", quote: 0.5, duree: 50 },
    { nom: "facade_toiture", quote: 0.15, duree: 25 },
    { nom: "installations", quote: 0.2, duree: 20 },
    { nom: "agencements", quote: 0.15, duree: 12 },
  ],
  grosOeuvreIsAns: 80,
  dureeTravauxAns: 15,
  dureeMobilierAns: 7,
} as const;

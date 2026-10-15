import type { Locale } from "./config";

/**
 * Construction neuve : libellés COURTS dont ont besoin des composants partagés avec la rénovation
 * (fiche, suivi, liste des projets, ligne de l'estimateur, rappel d'inscription). Ils vivent hors
 * du dictionnaire global (`dictionaries.ts`), que `LangProvider` envoie à chaque page : la
 * rénovation ne porte pas le poids du neuf. Aucun prix ici, les montants viennent du moteur.
 */
const fr = {
  badge: "Construction neuve",
  projetNom: "Construction neuve",
  demarche: "Démarche",
  sansTva: "sans TVA",
  pctTravaux: "% des travaux",
  pctProjet: "% du projet",
  /* Ligne de l'estimateur : un poste réservé aux pros, et l'avertissement d'un poste de structure
     ou de clos-couvert passé en « Je le fais ». */
  proOblig: "Pro obligatoire",
  raisonsPro: {
    concessionnaire: "gestionnaire du réseau", etude: "mission d'expert", controle: "contrôle ou attestation",
    fluides: "fluides frigorigènes", reglementaire: "installateur qualifié", procede: "machine spécialisée",
  } as Record<string, string>,
  horsDecennale: "Fait soi-même : hors garantie décennale. Vérifie avec ton assureur dommages-ouvrage.",
  maisonNiveaux: { pp: "Maison plain-pied", etage: "Maison à étage", combles: "Maison avec combles aménagés" } as Record<string, string>,
  /* Affichage d'un projet neuf : fiche, suivi, résultat rapide, PDF, liste. */
  badgeEstim: "Estimation · construction neuve",
  maisonNeuve: "Maison neuve",
  dontConstr: "dont la construction",
  annexes: "études, taxes, assurance, branchements",
  fraisHorsTva: "Frais hors TVA",
  fraisSeg: "Frais (taxes, assurance)",
  /* « Qui fait quoi » (fiche et PDF, rénovation comme neuf) : la part des lignes perso, comptées dans le total (D8). */
  persoSeg: "Lignes perso",
  chambre: "chambre",
  chambres: "chambres",
  moisChantier: "mois de chantier",
  niveauxCourt: { pp: "plain-pied", etage: "à étage", combles: "combles aménagés" } as Record<string, string>,
  jalon: "Jalon",
  progNoteBold: "nombre de postes et démarches",
  eyebrowListe: "Estimation construction",
  introListe: "Tes estimations de rénovation et de construction, retrouvées et modifiables à tout moment.",
  /* Camembert « Où part le budget » d'un projet neuf : au-delà de 8 corps, une part « autres ». Son
     centre (rénovation comme neuf) : la somme des corps d'état, TTC sans la provision pour aléas. */
  autresCorps: "Autres corps d'état",
  donutTotal: "TTC hors aléas",
};

const en: typeof fr = {
  badge: "New build",
  projetNom: "New build",
  demarche: "Admin step",
  sansTva: "no VAT",
  pctTravaux: "% of the works",
  pctProjet: "% of the project",
  proOblig: "Pro required",
  raisonsPro: {
    concessionnaire: "utility company", etude: "expert service", controle: "inspection or certificate",
    fluides: "refrigerant handling", reglementaire: "certified installer", procede: "specialist machinery",
  } as Record<string, string>,
  horsDecennale: "DIY: not covered by the 10-year structural warranty. Check with your structural defects insurer.",
  maisonNiveaux: { pp: "Single-storey house", etage: "Two-storey house", combles: "House with converted attic" } as Record<string, string>,
  badgeEstim: "Estimate · new build",
  maisonNeuve: "New house",
  dontConstr: "of which construction",
  annexes: "studies, taxes, insurance, connections",
  fraisHorsTva: "Fees (no VAT)",
  fraisSeg: "Fees (taxes, insurance)",
  persoSeg: "Custom lines",
  chambre: "bedroom",
  chambres: "bedrooms",
  moisChantier: "months on site",
  niveauxCourt: { pp: "single-storey", etage: "two-storey", combles: "converted attic" } as Record<string, string>,
  jalon: "Milestone",
  progNoteBold: "number of items and admin steps",
  eyebrowListe: "Build estimate",
  introListe: "Your renovation and new-build estimates, saved and editable at any time.",
  autresCorps: "Other trades",
  donutTotal: "Incl. VAT, excl. contingency",
};

export type DictNeufCommun = typeof fr;
const DICTS: Record<Locale, DictNeufCommun> = { fr, en };

export function dictNeufCommun(locale: Locale): DictNeufCommun {
  return DICTS[locale] ?? fr;
}

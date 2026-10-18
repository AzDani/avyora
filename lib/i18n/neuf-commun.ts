import type { Locale } from "./config";

/**
 * Construction neuve : libellés COURTS dont ont besoin des composants partagés avec la rénovation
 * (fiche, suivi, liste des projets, ligne de l'estimateur, rappel d'inscription). Ils vivent hors
 * du dictionnaire global (`dictionaries.ts`), que `LangProvider` envoie à chaque page : la
 * rénovation ne porte pas le poids du neuf. Aucun prix ici, les montants viennent du moteur.
 */
const fr = {
  badge: "Construction neuve",
  /* Pastilles de la fiche, de la liste des projets et de l'admin (N14) : la nature du projet (`badge`
     pour le neuf) et son mode, et le type de bien enregistré (écrit en français dans la base). */
  badgeReno: "Rénovation",
  modeRapide: "Rapide",
  modeDetaille: "Détaillée",
  typesBien: { maison: "Maison", appartement: "Appartement", immeuble: "Immeuble", "maison neuve": "Maison neuve" } as Record<string, string>,
  projetNom: "Construction neuve",
  demarche: "Démarche",
  sansTva: "sans TVA",
  pctTravaux: "% des travaux",
  pctProjet: "% du projet",
  /* Ligne de l'estimateur (rénovation comme neuf) : un poste réservé aux pros, l'avertissement d'un
     poste de structure ou de clos-couvert passé en « Je le fais » (D4), et ce qu'un pro doit encore
     faire sur une PAC, une climatisation ou une borne prise soi-même (D2). */
  proOblig: "Pro obligatoire",
  raisonsPro: {
    concessionnaire: "gestionnaire du réseau", etude: "mission d'expert", controle: "contrôle ou attestation",
    fluides: "fluides frigorigènes", reglementaire: "installateur qualifié", procede: "machine spécialisée",
  } as Record<string, string>,
  horsDecennale: "Fait soi-même : hors garantie décennale. Vérifie avec ton assureur dommages-ouvrage.",
  horsDecennaleReno: "Fait soi-même : hors garantie décennale. Vérifie avec ton assureur ; pour un mur porteur ou une charpente, une étude est conseillée.",
  mentionsSoiMeme: {
    fluides: "Manipulation du fluide frigorigène : attestation de capacité requise pour la mise en service.",
    irve: "Borne de plus de 3,7 kW : pose par un installateur qualifié IRVE exigée (décret 2017-26).",
  } as Record<string, string>,
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
  badgeReno: "Renovation",
  modeRapide: "Quick",
  modeDetaille: "Detailed",
  typesBien: { maison: "House", appartement: "Apartment", immeuble: "Building", "maison neuve": "New house" } as Record<string, string>,
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
  horsDecennaleReno: "DIY: not covered by the 10-year structural warranty. Check with your insurer; for a load-bearing wall or roof framing, an engineering study is recommended.",
  mentionsSoiMeme: {
    fluides: "Refrigerant handling: a certified technician (attestation de capacité) is required to commission the system.",
    irve: "Charger over 3.7 kW: installation by an IRVE-certified electrician is required (decree 2017-26).",
  } as Record<string, string>,
  maisonNiveaux: { pp: "Single-story house", etage: "Two-story house", combles: "House with converted attic" } as Record<string, string>,
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
  niveauxCourt: { pp: "single-story", etage: "two-story", combles: "converted attic" } as Record<string, string>,
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

/** Le type de bien d'un projet (`type_bien`, écrit en français et en minuscules ou non selon l'écran
 *  qui l'a enregistré : « Maison », « appartement »…), dit dans la langue de la page. Inconnu : tel quel. */
export function libelleTypeBien(locale: Locale, typeBien: string | null | undefined): string {
  const v = (typeBien ?? "").trim();
  return dictNeufCommun(locale).typesBien[v.toLowerCase()] ?? v;
}

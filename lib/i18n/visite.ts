import type { Locale } from "./config";

/**
 * Visite guidée des estimateurs (`components/visite/VisiteGuidee.tsx`) : les textes, en FR et en EN.
 * Hors du dictionnaire global (même règle que `neuf.ts` et `plans.ts`) : seuls les estimateurs l'importent.
 *
 * `commun` : l'invitation, le bouton « ? Visite guidée » et la bulle. Puis une section par estimateur, une
 * entrée par étape ({ titre, texte }) ; l'ordre et les cibles des étapes vivent dans l'estimateur qui les
 * montre. Tutoiement, phrases courtes et concrètes, aucun prix, aucun emoji. FR et EN : la même forme
 * (vérifié par `tests/visite-guidee.test.ts`).
 *
 * Les quatre estimateurs : `rapideReno` (`EstimateurRapide`), `rapideNeuf` (`EstimateurRapideNeuf`), `detailleReno`
 * (`Estimateur`) et `detailleNeuf` (`EstimateurNeuf`). Le vocabulaire du neuf ne parle pas de rénovation.
 */

const fr = {
  commun: {
    invitation: "Te guider en 1 minute ?",
    cestParti: "C'est parti",
    nonMerci: "Non merci",
    /** Le bouton discret en haut de chaque estimateur (le « ? » est dessiné à part). */
    bouton: "Visite guidée",
    boutonAria: "Lancer la visite guidée de l'estimateur",
    etape: (i: number, n: number) => `Étape ${i} sur ${n}`,
    suivant: "Suivant",
    retour: "Retour",
    passer: "Passer",
    terminer: "C'est compris",
    regionInvitation: "Visite guidée",
  },
  rapideReno: {
    quoi: { titre: "Ce que tu estimes", texte: "Le logement entier (maison ou appartement), ou une pièce : cuisine, salle de bain… Une pièce se chiffre sans compte ; pour combiner des pièces différentes, il te faut un compte." },
    champs: { titre: "Surface et code postal", texte: "Indique la surface habitable et ton code postal : les prix s'ajustent à ta région. En mode pièces, chaque pièce a sa propre surface, juste au-dessus." },
    ampleur: { titre: "L'ampleur des travaux", texte: "Du simple rafraîchissement à la rénovation lourde. Chaque carte affiche son prix au m² dès que tu as répondu à la première question." },
    finition: { titre: "Le niveau de finition", texte: "Éco, standard ou premium : la gamme des matériaux et des équipements. C'est un des choix qui fait le plus bouger le budget." },
    qui: { titre: "Qui réalise les travaux", texte: "Tout par des pros, ou une partie par toi-même : la carte montre ce que tu économises sur la main-d'œuvre." },
    budget: { titre: "Ton budget, en direct", texte: "La fourchette se recalcule à chaque réponse, ajustée à ton code postal. Change une carte : tu vois tout de suite l'écart." },
    suite: { titre: "Enregistre ou affine", texte: "Enregistre ton estimation pour la retrouver dans ton espace, ou passe au détail poste par poste pour l'ajuster ligne à ligne." },
  },
  rapideNeuf: {
    maison: { titre: "Ta maison", texte: "Plain-pied ou à étage : c'est le point de départ. Le type de maison change l'emprise au sol, les fondations et la toiture." },
    champs: { titre: "Surface et terrain", texte: "Indique la surface habitable et le code postal du terrain : les prix s'ajustent à ta région." },
    finition: { titre: "Le niveau de finition", texte: "Éco, standard ou premium : la gamme des matériaux et des équipements. Chaque carte affiche son prix au m² dès que ta maison est décrite." },
    qui: { titre: "Qui construit", texte: "Tout par des pros, ou une partie par toi-même : la carte montre ce que tu économises sur la main-d'œuvre." },
    options: { titre: "Garage et eaux usées", texte: "Facultatif : ajoute un garage accolé, et dis si le terrain va au tout-à-l'égout ou demande une fosse." },
    budget: { titre: "Ton budget, en direct", texte: "La fourchette se recalcule à chaque réponse, ajustée au code postal du terrain. Change une carte : tu vois tout de suite l'écart." },
    suite: { titre: "Enregistre ou affine", texte: "Enregistre ton estimation pour la retrouver dans ton espace, ou passe au détail lot par lot, du gros œuvre aux finitions." },
  },
  detailleReno: {
    bien: { titre: "Parle-nous du bien", texte: "Logement entier ou quelques pièces : dis ce que tu rénoves. On s'en sert pour pré-remplir les quantités de chaque poste." },
    surfaces: { titre: "Surfaces et code postal", texte: "Surface, hauteur sous plafond et code postal : les quantités et les prix de ta région en dépendent." },
    pieces: { titre: "Tes pièces", texte: "Chambres, salles de bain, WC, fenêtres… Chaque pièce que tu comptes entre dans les quantités pré-remplies." },
    finition: { titre: "Le niveau de finition", texte: "Éco, standard ou premium : seule la gamme des matériaux change, la pose reste la même." },
    postes: { titre: "Les travaux, lot par lot", texte: "Ouvre un corps d'état, puis coche un travail : sa quantité est calculée d'après ton bien, et tu peux la corriger." },
    soi: { titre: "Un pro ou toi ?", texte: "Sur une ligne cochée, « Fait faire » compte un pro, pose comprise. Quand tu peux le faire toi-même, « Je le fais » ne garde que les matériaux." },
    total: { titre: "Ton total, en direct", texte: "Le total TTC suit chaque case cochée. La jauge le compare à ton budget max, si tu en as indiqué un." },
    suite: { titre: "Ton devis et ton rapport", texte: "« Voir mon devis » montre la répartition par lot. Enregistre le projet : tu retrouves son rapport PDF sur sa fiche." },
    /* La même étape, lancée depuis la vue « Mon devis » : le bouton y devient « ← Modifier ». */
    suiteDevis: { titre: "Ton devis et ton rapport", texte: "Tu es sur ton devis : la répartition par lot. « Modifier » te ramène à ta saisie. Enregistre le projet : tu retrouves son rapport PDF sur sa fiche." },
  },
  detailleNeuf: {
    maison: { titre: "Parle-nous de ta maison", texte: "Plain-pied ou à étage, et sa forme : on part de là pour cocher et mesurer chaque poste, des fondations à la toiture." },
    surfaces: { titre: "Surfaces et terrain", texte: "Surface habitable, garage et code postal du terrain : les quantités et les prix de ta région en dépendent." },
    pieces: { titre: "Tes pièces", texte: "Chambres, salles de bain, WC… Chaque pièce que tu comptes entre dans les quantités pré-remplies." },
    technique: { titre: "Choix techniques", texte: "Structure, toit, chauffage, terrain et réseaux : des réglages courants sont déjà remplis. « Modifier » les ouvre pour les ajuster." },
    finition: { titre: "Finition et pilotage", texte: "Éco, standard ou premium pour les matériaux. Puis qui pilote le chantier : toi en lots séparés, ou un maître d'œuvre." },
    postes: { titre: "Du gros œuvre aux finitions", texte: "Les lots suivent le chantier, des fondations à la remise des clés. Ouvre un lot et coche un poste : sa quantité est pré-calculée." },
    soi: { titre: "Un pro ou toi ?", texte: "Choisis comment arrivent les postes que tu coches : « Fait faire » ou « Je le fais ». Chaque ligne se règle aussi une à une." },
    barre: { titre: "Ton total et ton devis", texte: "Le total TTC et le prix au m² suivent chaque réponse. « Voir mon devis » le détaille ; enregistre pour retrouver ton rapport PDF." },
    /* La même étape, lancée depuis la vue « Mon devis » : le bouton y devient « ← Modifier ». */
    barreDevis: { titre: "Ton total et ton devis", texte: "Le total TTC et le prix au m² suivent chaque réponse. Tu es sur ton devis : « Modifier » te ramène à ta saisie ; enregistre pour retrouver ton rapport PDF." },
  },
};

export type DictVisite = typeof fr;

const en: DictVisite = {
  commun: {
    invitation: "Want a 1-minute tour?",
    cestParti: "Let's go",
    nonMerci: "No thanks",
    bouton: "Guided tour",
    boutonAria: "Start the estimator's guided tour",
    etape: (i: number, n: number) => `Step ${i} of ${n}`,
    suivant: "Next",
    retour: "Back",
    passer: "Skip",
    terminer: "Got it",
    regionInvitation: "Guided tour",
  },
  rapideReno: {
    quoi: { titre: "What you're estimating", texte: "The whole home (house or apartment), or a single room: kitchen, bathroom… One room is priced without an account; to combine different rooms, you need an account." },
    champs: { titre: "Area and ZIP code", texte: "Enter the living area and your ZIP code: prices adjust to your region. In rooms mode, each room has its own area, just above." },
    ampleur: { titre: "Scope of the work", texte: "From a simple refresh to a full renovation. Each card shows its price per m² as soon as you've answered the first question." },
    finition: { titre: "Finish level", texte: "Economy, standard or premium: the range of materials and fixtures. It's one of the choices that moves the budget the most." },
    qui: { titre: "Who does the work", texte: "All by pros, or part of it yourself: the card shows what you save on labor." },
    budget: { titre: "Your budget, live", texte: "The range updates with every answer, adjusted to your ZIP code. Change a card and you see the difference right away." },
    suite: { titre: "Save or refine", texte: "Save your estimate to find it in your account, or switch to the item-by-item detail to adjust it line by line." },
  },
  rapideNeuf: {
    maison: { titre: "Your house", texte: "Single-story or two-story: that's the starting point. The house type changes the footprint, the foundations and the roof." },
    champs: { titre: "Area and plot", texte: "Enter the living area and the plot's ZIP code: prices adjust to your region." },
    finition: { titre: "Finish level", texte: "Economy, standard or premium: the range of materials and fixtures. Each card shows its price per m² once your house is described." },
    qui: { titre: "Who builds it", texte: "All by pros, or part of it yourself: the card shows what you save on labor." },
    options: { titre: "Garage and wastewater", texte: "Optional: add an attached garage, and say whether the plot connects to the public sewer or needs a septic tank." },
    budget: { titre: "Your budget, live", texte: "The range updates with every answer, adjusted to the plot's ZIP code. Change a card and you see the difference right away." },
    suite: { titre: "Save or refine", texte: "Save your estimate to find it in your account, or switch to the trade-by-trade detail, from structural work to finishes." },
  },
  detailleReno: {
    bien: { titre: "Tell us about the property", texte: "Whole home or just a few rooms: say what you're renovating. We use it to prefill the quantities of every item." },
    surfaces: { titre: "Areas and ZIP code", texte: "Area, ceiling height and ZIP code: quantities and your region's prices depend on them." },
    pieces: { titre: "Your rooms", texte: "Bedrooms, bathrooms, toilets, windows… Every room you count goes into the prefilled quantities." },
    finition: { titre: "Finish level", texte: "Economy, standard or premium: only the range of materials changes, the installation stays the same." },
    postes: { titre: "The work, trade by trade", texte: "Open a trade, then check an item: its quantity is calculated from your property, and you can adjust it." },
    soi: { titre: "A pro or you?", texte: "On a checked line, \u201cHire out\u201d counts a pro, installation included. When you can do it yourself, \u201cDIY\u201d keeps only the materials." },
    total: { titre: "Your total, live", texte: "The total, tax included, follows every checked box. The gauge compares it with your max budget, if you set one." },
    suite: { titre: "Your estimate and report", texte: "\u201cSee my estimate\u201d shows the breakdown by trade. Save the project: its PDF report is waiting on its page." },
    suiteDevis: { titre: "Your estimate and report", texte: "You're on your estimate: the breakdown by trade. \u201cEdit\u201d takes you back to your entries. Save the project: its PDF report is waiting on its page." },
  },
  detailleNeuf: {
    maison: { titre: "Tell us about your house", texte: "Single-story or two-story, and its shape: we start from there to check and measure every item, from foundations to roof." },
    surfaces: { titre: "Areas and plot", texte: "Living area, garage and the plot's ZIP code: quantities and your region's prices depend on them." },
    pieces: { titre: "Your rooms", texte: "Bedrooms, bathrooms, toilets… Every room you count goes into the prefilled quantities." },
    technique: { titre: "Technical choices", texte: "Structure, roof, heating, plot and utilities: common settings are already filled in. \u201cChange\u201d opens them so you can adjust them." },
    finition: { titre: "Finish and management", texte: "Economy, standard or premium for the materials. Then who manages the build: you with separate trades, or a project manager." },
    postes: { titre: "From structure to finishes", texte: "Trades follow the build, from foundations to handover. Open a trade and check an item: its quantity is precalculated." },
    soi: { titre: "A pro or you?", texte: "Choose how newly checked items arrive: \u201cHire out\u201d or \u201cDIY\u201d. Each line can also be set one by one." },
    barre: { titre: "Your total and estimate", texte: "The total, tax included, and the price per m² follow every answer. \u201cSee my estimate\u201d breaks it down; save it to get your PDF report." },
    barreDevis: { titre: "Your total and estimate", texte: "The total, tax included, and the price per m² follow every answer. You're on your estimate: \u201cEdit\u201d takes you back to your entries; save it to get your PDF report." },
  },
};

export function dictVisite(locale: Locale): DictVisite {
  return locale === "en" ? en : fr;
}

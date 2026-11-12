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
 * Sections encore vides (`rapideNeuf`, `detailleReno`, `detailleNeuf`) : remplies quand leur visite est branchée.
 */
type Etape = { titre: string; texte: string };

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
    quoi: { titre: "Ce que tu estimes", texte: "Le logement entier (maison ou appartement), ou seulement une ou plusieurs pièces : cuisine, salle de bain… Tu peux en ajouter plusieurs." },
    champs: { titre: "Surface et code postal", texte: "Indique la surface à rénover et ton code postal : les prix s'ajustent à ta région. En mode pièces, chaque pièce a sa propre surface, juste au-dessus." },
    ampleur: { titre: "L'ampleur des travaux", texte: "Du simple rafraîchissement à la rénovation lourde. Chaque carte affiche son prix au m² dès que tu as répondu à la première question." },
    finition: { titre: "Le niveau de finition", texte: "Éco, standard ou premium : la gamme des matériaux et des équipements. C'est un des choix qui fait le plus bouger le budget." },
    qui: { titre: "Qui réalise les travaux", texte: "Tout par des pros, ou une partie par toi-même : la carte montre ce que tu économises sur la main-d'œuvre." },
    budget: { titre: "Ton budget, en direct", texte: "La fourchette se recalcule à chaque réponse, ajustée à ton code postal. Change une carte : tu vois tout de suite l'écart." },
    suite: { titre: "Enregistre ou affine", texte: "Enregistre ton estimation pour la retrouver dans ton espace, ou passe au détail poste par poste pour l'ajuster ligne à ligne." },
  },
  rapideNeuf: {} as Record<string, Etape>,
  detailleReno: {} as Record<string, Etape>,
  detailleNeuf: {} as Record<string, Etape>,
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
    quoi: { titre: "What you're estimating", texte: "The whole home (house or apartment), or just one or more rooms: kitchen, bathroom… You can add several." },
    champs: { titre: "Area and ZIP code", texte: "Enter the area to renovate and your ZIP code: prices adjust to your region. In rooms mode, each room has its own area, just above." },
    ampleur: { titre: "Scope of the work", texte: "From a simple refresh to a full renovation. Each card shows its price per m² as soon as you've answered the first question." },
    finition: { titre: "Finish level", texte: "Economy, standard or premium: the range of materials and fixtures. It's one of the choices that moves the budget the most." },
    qui: { titre: "Who does the work", texte: "All by pros, or part of it yourself: the card shows what you save on labor." },
    budget: { titre: "Your budget, live", texte: "The range updates with every answer, adjusted to your ZIP code. Change a card and you see the difference right away." },
    suite: { titre: "Save or refine", texte: "Save your estimate to find it in your account, or switch to the item-by-item detail to adjust it line by line." },
  },
  rapideNeuf: {},
  detailleReno: {},
  detailleNeuf: {},
};

export function dictVisite(locale: Locale): DictVisite {
  return locale === "en" ? en : fr;
}

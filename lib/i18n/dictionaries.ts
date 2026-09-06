import type { Locale } from "./config";

/**
 * Dictionnaires de traduction (produit). Objet plat par langue, importable côté serveur ET client
 * (ce ne sont que des chaînes). On étend namespace par namespace au fil des phases.
 */
export type Dict = typeof fr;

const fr = {
  nav: {
    projets: "Projets",
    guides: "Guides des prix",
    tarifs: "Tarifs",
    connexion: "Connexion",
    deconnexion: "Déconnexion",
    monCompte: "Mon compte",
    nouveauProjet: "Nouveau projet",
    menu: "Menu",
  },
  footer: {
    guides: "Guides des prix",
    prixVille: "Prix par ville",
    mentions: "Mentions légales",
    cgu: "CGU",
    cgv: "CGV",
    confidentialite: "Confidentialité",
    cookies: "Cookies",
    tarifs: "Tarifs",
    tagline:
      "Estimations indicatives basées sur le référentiel de prix AVYORA (France 2026). À confirmer par des devis d'artisans.",
  },
  langue: { label: "Langue", fr: "Français", en: "English" },
  choix: {
    eyebrow: "Nouvelle estimation",
    titre: "Comment veux-tu estimer ?",
    sousTitre:
      "Deux façons d'obtenir ton budget travaux. Commence rapide, affine quand tu veux — sans rien ressaisir.",
    rapideTag: "Gratuit",
    rapideTitre: "Estimation rapide",
    rapideLead: "4 questions, une fourchette chiffrée immédiate. Idéal pour un premier ordre de grandeur.",
    rapideF1: "Type de bien, surface, ampleur — en 3 min",
    rapideF2: "Fourchette ±15 % adaptée à ton code postal",
    rapideF3: "Sans inscription, résultat instantané",
    rapideCta: "Commencer gratuitement →",
    rapideFoot: "Aucune carte requise",
    detailTitre: "Estimation détaillée",
    detailLead: "Ajuste chaque poste et obtiens un devis précis, prêt à comparer avec les artisans.",
    detailF1: "Poste par poste, quantités ajustables en direct",
    detailF2: "Rapport PDF détaillé — qui fait quoi, budget par corps d'état",
    detailF3: "Suivi de chantier et modifications illimitées",
    detailCtaPro: "Ajuster poste par poste →",
    detailFootPro: "Inclus dans ton abonnement Pro",
    detailCtaFree: "Débloquer avec Pro →",
    detailFootFree: "Fonctionnalité AVYORA Pro ·",
    detailFootLien: "Voir les offres",
    hintAvant: "Pas sûr ? Commence par l'",
    hintFort: "estimation rapide",
    hintApres: " — tu pourras passer en détaillée à tout moment, tes réponses sont conservées.",
  },
  upsell: {
    eyebrow: "AVYORA Pro",
    titre: "Passe au niveau supérieur",
    texteAvant: "Débloque l'",
    texteFort1: "estimation détaillée poste par poste",
    texteMilieu: ", le ",
    texteFort2: "rapport PDF",
    texteApres: " prêt à comparer avec les artisans et le ",
    texteFort3: "suivi de chantier",
    texteFin: ". Estime juste, négocie mieux.",
    f1: "Devis précis, poste par poste",
    f2: "Rapport PDF détaillé",
    f3: "Suivi de chantier illimité",
    cta: "Voir les offres Pro →",
    rassure: "Sans engagement · résiliable en 3 clics",
  },
};

const en: Dict = {
  nav: {
    projets: "Projects",
    guides: "Price guides",
    tarifs: "Pricing",
    connexion: "Sign in",
    deconnexion: "Sign out",
    monCompte: "My account",
    nouveauProjet: "New project",
    menu: "Menu",
  },
  footer: {
    guides: "Price guides",
    prixVille: "Prices by city",
    mentions: "Legal notice",
    cgu: "Terms of use",
    cgv: "Terms of sale",
    confidentialite: "Privacy",
    cookies: "Cookies",
    tarifs: "Pricing",
    tagline:
      "Indicative estimates based on the AVYORA price reference (France 2026). Confirm with contractor quotes.",
  },
  langue: { label: "Language", fr: "Français", en: "English" },
  choix: {
    eyebrow: "New estimate",
    titre: "How do you want to estimate?",
    sousTitre:
      "Two ways to get your renovation budget. Start quick, refine anytime — without re-entering anything.",
    rapideTag: "Free",
    rapideTitre: "Quick estimate",
    rapideLead: "4 questions, an instant price range. Perfect for a first ballpark figure.",
    rapideF1: "Property type, area, scope — in 3 min",
    rapideF2: "±15% range tailored to your ZIP code",
    rapideF3: "No sign-up, instant result",
    rapideCta: "Start for free →",
    rapideFoot: "No card required",
    detailTitre: "Detailed estimate",
    detailLead: "Adjust every line item and get a precise quote, ready to compare with contractors.",
    detailF1: "Line by line, quantities adjustable live",
    detailF2: "Detailed PDF report — who does what, budget by trade",
    detailF3: "Project tracking and unlimited edits",
    detailCtaPro: "Adjust line by line →",
    detailFootPro: "Included in your Pro subscription",
    detailCtaFree: "Unlock with Pro →",
    detailFootFree: "AVYORA Pro feature ·",
    detailFootLien: "See plans",
    hintAvant: "Not sure? Start with the ",
    hintFort: "quick estimate",
    hintApres: " — you can switch to detailed anytime, your answers are kept.",
  },
  upsell: {
    eyebrow: "AVYORA Pro",
    titre: "Take it to the next level",
    texteAvant: "Unlock the ",
    texteFort1: "detailed line-by-line estimate",
    texteMilieu: ", the ",
    texteFort2: "PDF report",
    texteApres: " ready to compare with contractors, and ",
    texteFort3: "project tracking",
    texteFin: ". Estimate right, negotiate better.",
    f1: "Precise quote, line by line",
    f2: "Detailed PDF report",
    f3: "Unlimited project tracking",
    cta: "See Pro plans →",
    rassure: "No commitment · cancel in 3 clicks",
  },
};

const DICTS: Record<Locale, Dict> = { fr, en };

export function dict(locale: Locale): Dict {
  return DICTS[locale] ?? fr;
}

import type { Locale } from "@/lib/i18n/config";

/**
 * L'estimation rapide demande un compte pour voir le résultat (décision de Dani du 26/11/2026) : le visiteur sans compte
 * répond à tout, puis le chiffre est remplacé par « Ton estimation est prête » et un bouton vers l'inscription. Ses
 * réponses sont gardées (brouillon + réclamation) : une fois inscrit, le projet est créé et s'ouvre avec son chiffre.
 */
const FR = {
  pret: "🔒 Ton estimation est prête",
  sub: "Crée ton compte gratuit pour la voir : tes réponses sont gardées.",
  cta: "Voir mon estimation →",
  intro: "Réponds aux questions, puis crée ton compte gratuit pour voir ton budget.",
};
const EN: typeof FR = {
  pret: "🔒 Your estimate is ready",
  sub: "Create your free account to see it: your answers are kept.",
  cta: "See my estimate →",
  intro: "Answer the questions, then create your free account to see your budget.",
};
export const dictCompteEstimation = (locale: Locale) => (locale === "en" ? EN : FR);

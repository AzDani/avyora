// Google Ads — balise de base + helper de conversion.
// La balise globale est posée dans app/layout.tsx ; ce module expose l'ID et un
// déclencheur de conversion à appeler sur les actions clés (estimation lancée, abonnement).
export const AW_ID = "AW-18449681842";

/** Actions de conversion Google Ads (identifiants publics, créés dans Objectifs → Conversions). */
export const CONV = {
  /** « Abonnement » — paiement Stripe réussi (page /bienvenue-pro). */
  abonnement: "AW-18449681842/BeMSCKqv3vYcELKbv91E",
  /** « Estimation terminée » — l'estimation rapide a abouti (Affiner ou Enregistrer). Catégorie lead, 1 €, une fois par clic. */
  estimation: "AW-18449681842/R3NzCO_r6vgcELKbv91E",
} as const;

type GtagFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

/**
 * Déclenche une conversion Google Ads.
 * @param sendTo identifiant complet de l'action de conversion, ex. "AW-18449681842/AbCd012345".
 * @param params paramètres optionnels (value, currency, transaction_id…).
 */
export function adConversion(sendTo: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "conversion", { send_to: sendTo, ...params });
}

/**
 * Conversion « Estimation terminée » — une seule fois par session de navigation
 * (l'utilisateur peut cliquer Affiner puis Enregistrer : Google ne doit compter qu'un lead).
 */
export function conversionEstimation(): void {
  try {
    if (sessionStorage.getItem("av_conv_estimation")) return;
    sessionStorage.setItem("av_conv_estimation", "1");
  } catch {
    /* stockage indisponible : on envoie quand même */
  }
  adConversion(CONV.estimation, { value: 1.0, currency: "EUR" });
}

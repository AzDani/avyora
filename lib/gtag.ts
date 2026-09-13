// Google Ads — balise de base + helper de conversion.
// La balise globale est posée dans app/layout.tsx ; ce module expose l'ID et un
// déclencheur de conversion à appeler sur les actions clés (estimation lancée, abonnement).
export const AW_ID = "AW-18449681842";

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

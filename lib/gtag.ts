// Google Ads — balise de base + helper de conversion, SOUS CONSENTEMENT (lib/consentement.ts).
// La balise n'est jamais posée par le layout : elle est chargée par `chargerGtag()`, appelée par le bandeau de
// consentement (components/ConsentementCookies.tsx) quand le visiteur accepte, ou dès l'arrivée d'un visiteur qui avait
// déjà accepté. Sans consentement : ni script, ni cookie, ni conversion.
import { consentementPublicitaire } from "@/lib/consentement";

export const AW_ID = "AW-18449681842";

/** L'adresse du script gtag.js (autorisée par la CSP, next.config.ts). */
export const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${AW_ID}`;

/** Actions de conversion Google Ads (identifiants publics, créés dans Objectifs → Conversions). */
export const CONV = {
  /** « Abonnement » — paiement Stripe vérifié (page /bienvenue-pro). */
  abonnement: "AW-18449681842/BeMSCKqv3vYcELKbv91E",
  /** « Estimation terminée » — l'estimation rapide a abouti (Affiner ou Enregistrer). Catégorie lead, 1 €, une fois par clic. */
  estimation: "AW-18449681842/R3NzCO_r6vgcELKbv91E",
} as const;

type GtagFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
    /** Posé par chargerGtag() : la balise est initialisée (une seule fois par page). */
    __avGtag?: boolean;
  }
}

/** Les quatre signaux du Consent Mode v2. */
const SIGNAUX = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const;
const tous = (etat: "granted" | "denied") => Object.fromEntries(SIGNAUX.map((s) => [s, etat]));

/** La file gtag standard : gtag.js attend des objets `arguments`, pas des tableaux. */
function fileGtag(): GtagFn {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  return window.gtag;
}

/**
 * Initialise la balise Google Ads, une seule fois par page, et seulement si le visiteur a accepté. Consent Mode v2 :
 * l'état par défaut « denied » est posé AVANT tout le reste, puis la mise à jour « granted » (le consentement est
 * acquis), puis `js` / `config`, puis le script gtag.js est inséré : il dépile la file dans cet ordre.
 * Renvoie vrai si la balise est (ou était déjà) initialisée.
 */
export function chargerGtag(): boolean {
  if (typeof window === "undefined") return false;
  if (!consentementPublicitaire()) return false;
  if (window.__avGtag) return true;
  if (typeof document === "undefined") return false;
  window.__avGtag = true;
  const gtag = fileGtag();
  gtag("consent", "default", { ...tous("denied"), wait_for_update: 500 });
  gtag("consent", "update", tous("granted"));
  gtag("js", new Date());
  gtag("config", AW_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = GTAG_SRC;
  document.head.appendChild(s);
  return true;
}

/**
 * Retrait du consentement dans la page (la balise est déjà chargée) : tous les signaux repassent à « denied », gtag.js
 * ne lit ni n'écrit plus ses cookies. Au chargement suivant, la balise ne sera plus du tout posée.
 */
export function retirerConsentementGtag(): void {
  if (typeof window === "undefined" || !window.__avGtag || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", tous("denied"));
}

/**
 * Déclenche une conversion Google Ads — rien sans consentement.
 * @param sendTo identifiant complet de l'action de conversion, ex. "AW-18449681842/AbCd012345".
 * @param params paramètres optionnels (value, currency, transaction_id…).
 */
export function adConversion(sendTo: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  // La balise est chargée ici si besoin : une conversion peut partir avant que le bandeau ait monté (ordre des effets
  // React). La file garde l'ordre : consentement, config, puis l'événement.
  if (!chargerGtag() || typeof window.gtag !== "function") return;
  window.gtag("event", "conversion", { send_to: sendTo, ...params });
}

/**
 * Conversion « Estimation terminée » — une seule fois par session de navigation ET par nature
 * (l'utilisateur peut cliquer Affiner puis Enregistrer : Google ne doit compter qu'un lead ; mais une
 * rénovation puis une maison neuve, ce sont deux projets). Les deux natures alimentent pour l'instant la
 * même action : une 2ᵉ action « Estimation neuf » se crée dans la console Google Ads, puis s'ajoute à `CONV`.
 * Sans consentement, rien n'est envoyé NI marqué : une acceptation plus tard dans la session laisse la conversion partir.
 */
export function conversionEstimation(nature: "reno" | "neuf"): void {
  if (!consentementPublicitaire()) return;
  try {
    const cle = `av_conv_estimation_${nature}`;
    if (sessionStorage.getItem(cle)) return;
    sessionStorage.setItem(cle, "1");
  } catch {
    /* stockage indisponible : on envoie quand même */
  }
  adConversion(CONV.estimation, { value: 1.0, currency: "EUR" });
}

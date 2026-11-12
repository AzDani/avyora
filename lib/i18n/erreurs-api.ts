import type { Locale } from "./config";

/**
 * Message d'erreur d'un appel aux routes `/api/projects/…`, traduit dans la langue de l'écran, à
 * partir du STATUT HTTP. Les routes renvoient du texte français (« Projet introuvable », « Données
 * invalides. ») : l'afficher tel quel montrait du français dans l'interface anglaise. Le statut suffit
 * à dire à l'utilisateur quoi faire ; le texte du serveur n'est jamais montré.
 *
 * `null` (statut inconnu, ou pas de réponse) : à l'appelant de choisir son message générique.
 */
export type CasErreurApi = "session" | "interdit" | "introuvable" | "invalide" | "limite" | "trop" | "reseau";

const MESSAGES: Record<Locale, Record<CasErreurApi, string>> = {
  fr: {
    session: "Ta session a expiré. Reconnecte-toi puis réessaie.",
    interdit: "Tu n'as pas les droits pour faire ça sur ce projet.",
    introuvable: "Ce projet est introuvable (il a peut-être été supprimé).",
    invalide: "Les données envoyées sont invalides. Vérifie ta saisie et réessaie.",
    limite: "Tu as atteint la limite autorisée pour ce projet.",
    trop: "Trop de requêtes. Patiente un instant puis réessaie.",
    reseau: "Réseau indisponible. Réessaie.",
  },
  en: {
    session: "Your session has expired. Sign in again, then retry.",
    interdit: "You don't have permission to do that on this project.",
    introuvable: "This project can't be found (it may have been deleted).",
    invalide: "The data sent is invalid. Check your entries and try again.",
    limite: "You've reached the limit allowed for this project.",
    trop: "Too many requests. Wait a moment, then try again.",
    reseau: "Network unavailable. Try again.",
  },
};

/** Le cas d'erreur d'un statut HTTP (0 ou absent : réseau). */
export function casErreurApi(statut: number | null | undefined): CasErreurApi | null {
  if (!statut) return "reseau";
  if (statut === 401) return "session";
  if (statut === 403) return "interdit";
  if (statut === 404) return "introuvable";
  if (statut === 400 || statut === 413 || statut === 422) return "invalide";
  if (statut === 409) return "limite";
  if (statut === 429) return "trop";
  return null;
}

/** Le message traduit d'un cas d'erreur. */
export const messageCasApi = (locale: Locale, cas: CasErreurApi): string => (MESSAGES[locale] ?? MESSAGES.fr)[cas];

/** Le message traduit d'un statut HTTP, ou `defaut` quand le statut ne dit rien de précis (500…). */
export function messageErreurApi(locale: Locale, statut: number | null | undefined, defaut: string): string {
  const cas = casErreurApi(statut);
  return cas ? messageCasApi(locale, cas) : defaut;
}

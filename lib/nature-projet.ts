/**
 * La nature du projet (chantier N2) : rénovation (`reno`) ou construction neuve (`neuf`).
 *
 * Choisie en premier, sur la pré-page « Quel est ton projet ? » (`/projets/nouveau`), puis transportée
 * dans les adresses jusqu'au paiement : `/tarifs?source=…` ou `?nature=…`, le corps de la requête
 * `/api/stripe/checkout`, l'adresse de retour de Stripe, et enfin `/bienvenue-pro?nature=…`, qui
 * renvoie l'abonné vers SA maison. Liste FERMÉE à chaque étape : une valeur inconnue est ignorée, on
 * retombe sur la rénovation (le comportement d'avant). `reno` est la valeur de `ProjetEstim.nature`.
 *
 * Fonctions pures (aucune lecture de session ni de stockage) : testées sans rendu.
 */
import { FEATURES } from "@/lib/features";

export const NATURES = ["reno", "neuf"] as const;
export type NatureProjet = (typeof NATURES)[number];

/** Une nature de la liste fermée, ou rien (absente, inconnue, tableau d'une adresse `?nature=a&nature=b`). */
export function lireNature(v: unknown): NatureProjet | undefined {
  return typeof v === "string" && (NATURES as readonly string[]).includes(v) ? (v as NatureProjet) : undefined;
}

/**
 * D'où vient un visiteur de `/tarifs` qui a déjà dit sa nature (mesure `vue_tarifs`) : « Affiner » d'une
 * estimation rapide (`affiner-…`) ou la carte Pro de l'écran de choix (`choix-…`).
 */
export const SOURCES_NATURE = ["affiner-reno", "affiner-neuf", "choix-reno", "choix-neuf"] as const;
export type SourceNature = (typeof SOURCES_NATURE)[number];

/** La source de la liste fermée, ou rien. */
export function lireSourceNature(v: unknown): SourceNature | undefined {
  return typeof v === "string" && (SOURCES_NATURE as readonly string[]).includes(v) ? (v as SourceNature) : undefined;
}

/** La nature que porte une source (`affiner-neuf` → `neuf`). */
export function natureDeSource(s: SourceNature | undefined): NatureProjet | undefined {
  return s ? lireNature(s.slice(s.lastIndexOf("-") + 1)) : undefined;
}

/**
 * Le détaillé que l'on propose à un abonné (`/bienvenue-pro`, bandeau « déjà Pro » de `/tarifs`) :
 * venu du neuf, interrupteur `FEATURES.neuf` allumé, sa maison reprise de l'estimation rapide
 * (`?reprise=1`) ; sinon le détaillé de la rénovation, page vierge, comme avant.
 */
export function lienDetaillePro(nature: NatureProjet | undefined): string {
  return FEATURES.neuf && nature === "neuf" ? "/projets/nouveau/construction?reprise=1" : "/projets/nouveau/detaille?new=1";
}

/** Le suffixe d'adresse qui transporte la nature (`&nature=neuf`), vide hors de la liste fermée. */
function suffixe(nature: unknown): string {
  const n = lireNature(nature);
  return n ? `&nature=${n}` : "";
}

/**
 * Les adresses de retour de Stripe Checkout. Succès : `/bienvenue-pro` (l'identifiant de session est
 * remplacé par Stripe) ; abandon : `/tarifs?abo=annule`. La nature n'y entre que si elle est dans la
 * liste fermée : le corps de la requête vient du navigateur, il n'écrit jamais rien d'autre dans l'adresse.
 */
export function retoursStripe(origin: string, nature: unknown): { success_url: string; cancel_url: string } {
  const n = suffixe(nature);
  return {
    success_url: `${origin}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}${n}`,
    cancel_url: `${origin}/tarifs?abo=annule${n}`,
  };
}

/* ─── Mesure de la pré-page : clic_nouveau_projet { nature } ─────────────────── */

/** L'attribut posé sur chaque carte de la pré-page ; `SuiviChoixNature` l'écoute par délégation. */
export const ATTRIBUT_CHOIX_NATURE = "data-choix-nature";

/** Les props JSX d'une carte mesurée : `<Link {...choixNature("neuf")} …>`. */
export function choixNature(nature: NatureProjet): { "data-choix-nature": NatureProjet } {
  return { "data-choix-nature": nature };
}

/** L'élément cliqué (ou son ancêtre) qui porte `data-choix-nature`, et la nature qu'il dit (liste fermée). */
export function natureDepuisCible(cible: EventTarget | null): NatureProjet | undefined {
  const el = cible as { closest?: (s: string) => { getAttribute(n: string): string | null } | null } | null;
  if (!el || typeof el.closest !== "function") return undefined;
  const carte = el.closest(`[${ATTRIBUT_CHOIX_NATURE}]`);
  return carte ? lireNature(carte.getAttribute(ATTRIBUT_CHOIX_NATURE)) : undefined;
}

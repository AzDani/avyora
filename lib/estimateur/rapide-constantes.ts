/**
 * Constantes de l'estimation RAPIDE (ampleurs, bornes de surface, pièces) — sans le moteur, sans le catalogue, sans
 * les paniers : la page publique les importe seules (27/11/2026). Le chiffrage se fait côté serveur
 * (`rapide-serveur.ts`, `POST /api/estimateur/rapide`). Réexportées par `presets.ts` et `pieces.ts`.
 */
export type Ampleur = "rafraich" | "partielle" | "complete" | "lourde";
export type QuiRealise = "pros" | "partie" | "max";

export const AMPLEURS: { v: Ampleur; label: string; desc: string }[] = [
  { v: "rafraich", label: "Rafraîchissement", desc: "Peinture, sols, petites reprises. Rien de lourd." },
  { v: "partielle", label: "Réno partielle", desc: "Cuisine ou SDB, sols, quelques menuiseries." },
  { v: "complete", label: "Réno complète", desc: "Tous les lots refaits — distribution conservée." },
  { v: "lourde", label: "Réno lourde", desc: "Gros œuvre + charpente, toiture, façade." },
];

/**
 * Bornes de la surface du rapide « bien entier » (m²). En dessous de 8 m², ce n'est plus un bien ;
 * au-delà de 500 m², les paniers représentatifs (1 cuisine, 1 WC, 2 salles de bain au plus) ne
 * décrivent plus rien de réel : 10 000 m² donnaient 357 ml de cuisine et un seul WC. Mêmes bornes
 * que les liens des pages de prix (`app/estimation-travaux/page.tsx`) ; au-delà, l'estimation
 * détaillée.
 */
export const SURFACE_MIN_RAPIDE = 8;
export const SURFACE_MAX_RAPIDE = 500;

/** Surface chiffrée par le rapide : celle saisie, ramenée dans les bornes (vide ou illisible → le minimum). */
export const surfaceRapide = (s: number): number =>
  Math.min(SURFACE_MAX_RAPIDE, Math.max(SURFACE_MIN_RAPIDE, Number.isFinite(s) ? s : 0));

export type PieceKey = "cuisine" | "sdb" | "chambre" | "salon" | "suite" | "buanderie";

/** Métadonnées d'une pièce (surface par défaut réaliste). Libellés/emojis = côté UI. */
export const PIECES: { key: PieceKey; surfaceDefaut: number }[] = [
  { key: "cuisine", surfaceDefaut: 10 },
  { key: "sdb", surfaceDefaut: 5 },
  { key: "chambre", surfaceDefaut: 12 },
  { key: "salon", surfaceDefaut: 22 },
  { key: "suite", surfaceDefaut: 20 },
  { key: "buanderie", surfaceDefaut: 6 },
];

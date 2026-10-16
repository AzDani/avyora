/**
 * CONSTRUCTION NEUVE — les bornes des réponses chiffrées, en UN seul endroit.
 *
 * Avant, deux jeux de bornes se contredisaient : celui des questions (`questions-neuf.ts`, chambres
 * de 1 à 8) et celui du moteur (`maisonComplete`, chambres de 0 à 10), plus des « 30-400 m² » recopiés
 * dans le rapide, le brouillon, le contexte de l'URL et le plan. Tous lisent désormais cette table
 * (revue rénovation / neuf, chantier N8).
 *
 * Module SANS dépendance : le brouillon (`brouillon-neuf.ts`) et le contexte de l'URL (`neuf-contexte.ts`)
 * le lisent sans embarquer le moteur ni le catalogue du neuf.
 *
 * Une valeur venue d'un plan, d'un brouillon ou de l'API est ramenée dans ces bornes par `maisonComplete`.
 * Deux règles croisent plusieurs réponses et ne tiennent pas dans la table : au moins une salle de bain
 * en comptant les suites (SDB + suites ≥ 1), et au moins un WC (`wc.min`).
 */
export interface Borne { min: number; max: number }

export const BORNES_NEUF = {
  /** Surface habitable, tous niveaux, hors garage (m²). */
  surface: { min: 30, max: 400 },
  /** Garage accolé (m², 0 = sans garage). */
  garage: { min: 0, max: 80 },
  sejour: { min: 0, max: 5 },
  cuisines: { min: 0, max: 3 },
  /** Chambres HORS suites parentales. */
  chambres: { min: 0, max: 10 },
  /** Suites parentales : une chambre ET sa salle de bain. */
  suites: { min: 0, max: 6 },
  /** Salles de bain HORS suites (SDB + suites ≥ 1). */
  sdb: { min: 0, max: 6 },
  wc: { min: 1, max: 6 },
  couloir: { min: 0, max: 10 },
  buanderie: { min: 0, max: 4 },
  /** Menuiseries extérieures : fenêtres + portes-fenêtres + baies (sans la porte d'entrée ni celle du garage). */
  menuiseries: { min: 0, max: 80 },
  /** Distance de la rue (réseaux) à la maison (m). */
  distanceReseaux: { min: 0, max: 200 },
} as const satisfies Record<string, Borne>;

/** Bornes reprises sous leur ancien nom (des tests et le plan les importent). */
export const GARAGE_MAX = BORNES_NEUF.garage.max;
export const DISTANCE_RESEAUX_MAX = BORNES_NEUF.distanceReseaux.max;

/** Surface minimale proposée pour un garage, quand il y en a un (le « Oui » du questionnaire). */
export const GARAGE_MIN_SAISI = 10;

/** Ramène un nombre dans une borne (sans l'arrondir). */
export const dansBorne = (v: number, b: Borne): number => Math.min(b.max, Math.max(b.min, v));

/** La surface est-elle dans les bornes du formulaire ? (rapide relu, contexte de l'URL) */
export const surfaceNeufValide = (s: number): boolean => Number.isFinite(s) && s >= BORNES_NEUF.surface.min && s <= BORNES_NEUF.surface.max;

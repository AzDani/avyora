/**
 * Moteur de métré AVYORA — 100 % déterministe.
 * Les pièces viennent de la saisie manuelle ou de l'extraction IA d'un plan ;
 * tous les calculs de quantités sont faits ici, jamais par l'IA.
 */

export type TypePiece =
  | "sejour"
  | "chambre"
  | "cuisine"
  | "salle_de_bain"
  | "wc"
  | "couloir"
  | "cellier"
  | "buanderie"
  | "autre";

export type PieceRow = {
  id: number | string;
  nom: string;
  type_piece: TypePiece;
  longueur: number; // m
  largeur: number; // m
  hauteur: number; // m
  portes: number;
  fenetres: number;
  carrelage_sol: number; // 0/1 (SQLite)
  faience: number; // 0/1
};

export type MetrePiece = {
  nom: string;
  type: TypePiece;
  surfaceSol: number;
  perimetre: number;
  surfaceMurs: number; // déduction faite des ouvertures
  surfacePlafond: number;
  plinthesMl: number;
  faienceM2: number;
};

export type Metre = {
  pieces: MetrePiece[];
  totalSol: number;
  totalSolCarrelage: number;
  totalSolAutre: number;
  totalMurs: number;
  totalPlafonds: number;
  totalPlinthesMl: number;
  totalFaienceM2: number;
  totalPortes: number;
  totalFenetres: number;
  nbSallesDeBain: number;
  nbCloisonsMl: number; // ml de cloisons intérieures estimés (murs mitoyens entre pièces)
};

const SURFACE_PORTE = 0.83 * 2.04; // ≈ 1,7 m²
const SURFACE_FENETRE = 1.2 * 1.25; // ≈ 1,5 m²
const LARGEUR_PORTE = 0.9; // avec bâti, pour les plinthes
const HAUTEUR_FAIENCE = 2.0; // m — mi-hauteur + zone douche toute hauteur (moyenne)

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calculerMetrePiece(p: {
  nom: string;
  type_piece: TypePiece;
  longueur: number;
  largeur: number;
  hauteur: number;
  portes: number;
  fenetres: number;
  faience: boolean;
}): MetrePiece {
  const surfaceSol = r1(p.longueur * p.largeur);
  const perimetre = r1(2 * (p.longueur + p.largeur));
  const surfaceMurs = r1(
    Math.max(
      0,
      perimetre * p.hauteur - p.portes * SURFACE_PORTE - p.fenetres * SURFACE_FENETRE
    )
  );
  const plinthesMl = r1(Math.max(0, perimetre - p.portes * LARGEUR_PORTE));
  const faienceM2 = p.faience ? r1(perimetre * HAUTEUR_FAIENCE * 0.8) : 0; // 80 % du périmètre carrelé en moyenne
  return {
    nom: p.nom,
    type: p.type_piece,
    surfaceSol,
    perimetre,
    surfaceMurs,
    surfacePlafond: surfaceSol,
    plinthesMl,
    faienceM2,
  };
}

export function calculerMetre(rows: PieceRow[]): Metre {
  const pieces = rows.map((r) =>
    calculerMetrePiece({
      nom: r.nom,
      type_piece: r.type_piece,
      longueur: r.longueur,
      largeur: r.largeur,
      hauteur: r.hauteur,
      portes: r.portes,
      fenetres: r.fenetres,
      faience: !!r.faience,
    })
  );
  const sum = (f: (p: MetrePiece) => number) =>
    r1(pieces.reduce((s, p) => s + f(p), 0));

  const totalSolCarrelage = r1(
    rows
      .filter((r) => !!r.carrelage_sol)
      .reduce((s, r) => s + r.longueur * r.largeur, 0)
  );
  const totalSol = sum((p) => p.surfaceSol);

  // Cloisons intérieures : approximation métier — les murs mitoyens entre pièces
  // représentent ~ la moitié du périmètre cumulé hors murs extérieurs.
  const perimetreCumule = pieces.reduce((s, p) => s + p.perimetre, 0);
  const perimetreExterieur = 4 * Math.sqrt(totalSol || 1);
  const nbCloisonsMl = r1(Math.max(0, (perimetreCumule - perimetreExterieur) / 2));

  return {
    pieces,
    totalSol,
    totalSolCarrelage,
    totalSolAutre: r1(totalSol - totalSolCarrelage),
    totalMurs: sum((p) => p.surfaceMurs),
    totalPlafonds: sum((p) => p.surfacePlafond),
    totalPlinthesMl: sum((p) => p.plinthesMl),
    totalFaienceM2: sum((p) => p.faienceM2),
    totalPortes: rows.reduce((s, r) => s + r.portes, 0),
    totalFenetres: rows.reduce((s, r) => s + r.fenetres, 0),
    nbSallesDeBain: rows.filter((r) => r.type_piece === "salle_de_bain").length,
    nbCloisonsMl,
  };
}

export const TYPES_PIECES: { value: TypePiece; label: string }[] = [
  { value: "sejour", label: "Séjour" },
  { value: "chambre", label: "Chambre" },
  { value: "cuisine", label: "Cuisine" },
  { value: "salle_de_bain", label: "Salle de bain" },
  { value: "wc", label: "WC" },
  { value: "couloir", label: "Couloir / entrée" },
  { value: "cellier", label: "Cellier" },
  { value: "buanderie", label: "Buanderie" },
  { value: "autre", label: "Autre" },
];

/**
 * Paniers de RÉFÉRENCE d'une pièce refaite entièrement (cuisine, salle de bain, chambre) : la
 * source UNIQUE des pages /prix-travaux (`lib/seo-projets.ts`) et du niveau « Réno complète » de
 * l'estimation rapide par pièce (`pieces.ts`).
 *
 * POURQUOI. Les deux écrans avaient chacun leur panier, jamais comparés : la page de la cuisine
 * annonçait 12 800 – 17 400 € (dépose, ~5 ml de cuisine, point d'eau, spots, porte) et son bouton
 * « Estimer une cuisine » menait à un rapide qui chiffrait 9 300 – 12 500 € pour la même cuisine de
 * 12 m² (3 ml, ni dépose ni point d'eau) ; la salle de bain allait dans l'autre sens (revue du
 * 12/11/2026). Un seul panier, deux lecteurs : le même cas donne la même fourchette.
 *
 * Aucun code du moteur (types seulement) : le rapide, côté client, l'importe sans le catalogue.
 */

/**
 * Options d'une tâche du panier. Un seul 4ᵉ élément partagé, pour que l'ajout d'un régime d'échelle
 * et l'ajout d'une variante de catalogue ne se marchent pas dessus.
 */
export type TacheOpts = {
  /** Régime d'échelle quand une surface est passée à estimProjet. Absent = inférence par défaut. */
  regime?: "sol" | "murs" | "unite";
  /** Variante de catalogue (`LigneSel.vsel`). Absent = option par défaut du poste. */
  vsel?: Record<string, string>;
};

/**
 * Une tâche du panier représentatif : [corps, nom exact du catalogue, quantité, options].
 *
 * ⚠️ PIÈGE SILENCIEUX : si `nom` ne correspond pas EXACTEMENT à un poste du catalogue, la ligne est
 * ignorée sans lever d'erreur — le total est faux et rien ne le signale. Vérifier tout panier écrit
 * à la main contre `catalog.json`, et re-vérifier après un renommage de poste.
 */
export type TacheSel = [corps: string, nom: string, qty: number, opts?: TacheOpts];

/**
 * Ouvrages qui suivent le DÉVELOPPÉ DES MURS et non la surface au sol : leur quantité varie comme
 * le périmètre, donc en racine de la surface (un sol deux fois plus grand n'a que ~1,4 fois plus de
 * murs). Les traiter au prorata du sol surestimerait franchement les grandes pièces.
 */
const TACHES_MURS = new Set<string>([
  "Faïence / carrelage mural",
  "Peinture des murs",
  "Doubler un mur",
]);

/**
 * Quantité d'une tâche ramenée à une autre surface de pièce. Trois régimes :
 * — murs : ∝ périmètre, donc ∝ √surface ;
 * — sol/plafond (la quantité vaut la surface de référence) : ∝ surface ;
 * — équipements (WC, douche, VMC, porte…) : constants — une pièce plus grande n'a pas deux WC.
 */
export function qtyPourSurface(t: TacheSel, sRef: number, s: number): number {
  const [, nom, q, opts] = t;
  if (s === sRef) return q;
  const ratio = s / sRef;
  const sol = () => Math.round(q * ratio * 10) / 10;
  const murs = () => Math.round(q * Math.sqrt(ratio) * 10) / 10;
  // Un régime DÉCLARÉ prime sur l'inférence : une tâche dont la quantité ne vaut pas la surface de
  // référence (faux plafond sur une partie de la pièce, préparation murale au développé) resterait
  // sinon figée, et le barème afficherait une variation visiblement fausse.
  if (opts?.regime) return opts.regime === "sol" ? sol() : opts.regime === "murs" ? murs() : q;
  if (TACHES_MURS.has(nom)) return murs();
  if (Math.abs(q - sRef) < 0.01) return sol();
  return q;
}

/** Les pièces qui ont une page de prix ET une carte dans le rapide. */
export type PieceReference = "cuisine" | "sdb" | "chambre";

/** Panier d'une pièce refaite entièrement, à sa surface de référence (celle de la page de prix). */
export const PANIERS_PIECES: Record<PieceReference, { surface: number; tasks: TacheSel[] }> = {
  sdb: {
    surface: 6,
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Cloisons / Platrerie", "Faux plafond", 6],
      ["Electricite", "Ajouter / déplacer une prise", 3],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Electricite", "Spots encastrés (LED)", 4],
      ["Plomberie", "WC", 1],
      ["Plomberie", "Meuble-vasque", 1],
      ["Plomberie", "Robinetterie lavabo", 1],
      ["Plomberie", "Miroir", 1],
      ["Plomberie", "Bac de douche", 1],
      ["Plomberie", "Colonne de douche", 1],
      ["Plomberie", "Paroi de douche", 1],
      ["Chauffage / VMC", "Sèche-serviette", 1],
      ["Chauffage / VMC", "Ventilation (VMC)", 1],
      ["Carrelage / Revetements", "Étanchéité sous carrelage (SPEC douche)", 2],
      ["Carrelage / Revetements", "Préparation du sol (ragréage)", 6],
      ["Carrelage / Revetements", "Carrelage au sol", 6],
      ["Carrelage / Revetements", "Faïence / carrelage mural", 18],
      ["Carrelage / Revetements", "Seuils / barres de seuil", 1],
      ["Peinture", "Préparation des surfaces", 6],
      ["Peinture", "Peinture des plafonds", 6],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
    ],
  },
  cuisine: {
    surface: 12,
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Cuisine", "Cuisine complète neuve — tout compris", 5],
      ["Cuisine", "Crédence seule", 3],
      ["Carrelage / Revetements", "Préparation du sol (ragréage)", 12],
      ["Carrelage / Revetements", "Carrelage au sol", 12],
      ["Peinture", "Préparation des surfaces", 20],
      ["Peinture", "Peinture des murs", 20],
      ["Peinture", "Peinture des plafonds", 12],
      ["Electricite", "Ajouter / déplacer une prise", 5],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Electricite", "Spots encastrés (LED)", 3],
      ["Plomberie", "Créer / déplacer un point d'eau", 1],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
    ],
  },
  chambre: {
    surface: 12,
    tasks: [
      ["Peinture", "Préparation des surfaces", 30],
      ["Peinture", "Peinture des murs", 30],
      ["Peinture", "Peinture des plafonds", 12],
      ["Carrelage / Revetements", "Sol stratifié (imitation bois)", 12],
      ["Carrelage / Revetements", "Plinthes", 14],
      ["Electricite", "Ajouter / déplacer une prise", 3],
      ["Electricite", "Ajouter / déplacer un interrupteur", 1],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Chauffage / VMC", "Radiateurs électriques", 1],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
      ["Menuiseries interieures", "Placards & rangements", 2],
    ],
  },
};

/** Le panier de référence d'une pièce rejoué sur sa surface (mêmes règles que le barème des pages de prix). */
export function panierPiece(room: PieceReference, s: number): TacheSel[] {
  const ref = PANIERS_PIECES[room];
  return ref.tasks.map((t) => [t[0], t[1], qtyPourSurface(t, ref.surface, s), t[3]] as TacheSel);
}

/** La quantité d'un poste du panier de référence à une surface donnée (`undefined` : poste absent). */
export function qtyReference(room: PieceReference, nom: string, s: number): number | undefined {
  const ref = PANIERS_PIECES[room];
  const t = ref.tasks.find((x) => x[1] === nom);
  return t ? qtyPourSurface(t, ref.surface, s) : undefined;
}

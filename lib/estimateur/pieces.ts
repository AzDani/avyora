/**
 * Estimation « par pièce » pour le mode rapide : chaque pièce = un panier de postes du MÊME
 * catalogue/moteur que le reste. Plusieurs pièces (avec quantités) sont fusionnées en UN seul
 * devis (quantités additionnées par poste) → total juste, sans double-comptage (le moteur ne
 * facture que les tâches sélectionnées, aucun coût fixe caché) et sauvegardable comme un projet.
 */
import { key, type Ctx, type Selection, type Finition } from "./core";
import type { Ampleur, QuiRealise } from "./presets";

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

const DIY_PARTIE = new Set(["Peinture", "Carrelage / Revetements", "Cloisons / Platrerie", "Isolation"]);
const AMP_LVL: Record<Ampleur, number> = { rafraich: 0, partielle: 1, complete: 2, lourde: 3 };

type Tache = [corps: string, nom: string, qty: number];

/** Liste des tâches d'une pièce pour une surface + une ampleur (cumulatif : niveau N inclut 0..N). */
export function pieceTasks(room: PieceKey, s: number, ampleur: Ampleur): Tache[] {
  const surf = Math.max(2, s || 0);
  const wall = Math.round(4 * Math.sqrt(surf) * 2.5); // périmètre × hauteur ≈ surface murale
  const perim = Math.round(4 * Math.sqrt(surf));
  const lvl = AMP_LVL[ampleur];
  const out: Tache[] = [];

  const paint = (): Tache[] => [
    ["Peinture", "Peinture des murs", wall],
    ["Peinture", "Peinture des plafonds", surf],
    ["Peinture", "Préparation des surfaces", wall],
  ];
  const floorTile = (): Tache[] => [
    ["Carrelage / Revetements", "Carrelage au sol", surf],
    ["Carrelage / Revetements", "Plinthes", perim],
  ];
  const floorLam = (): Tache[] => [
    ["Carrelage / Revetements", "Sol stratifié (imitation bois)", surf],
    ["Carrelage / Revetements", "Plinthes", perim],
  ];
  const elec = (prises: number, points = 2): Tache[] => [
    ["Electricite", "Ajouter / déplacer une prise", prises],
    ["Electricite", "Ajouter un point lumineux", points],
  ];
  const curage = (): Tache[] => [
    ["Démolition", "Enlever un revêtement de sol", surf],
    ["Maçonnerie", "Couler une chape", surf],
  ];

  // Base (rafraîchissement) : peinture + sol, selon la pièce.
  const wet = room === "cuisine" || room === "sdb" || room === "buanderie";
  out.push(...paint(), ...(wet ? floorTile() : floorLam()));

  if (room === "cuisine") {
    if (lvl >= 1) out.push(
      ["Carrelage / Revetements", "Faïence / carrelage mural", Math.round(surf * 0.4) + 2], // crédence
      ["Cuisine", "Cuisine complète neuve — tout compris", Math.max(2.5, Math.round(surf / 3.5))],
    );
    if (lvl >= 2) out.push(...elec(Math.round(surf / 2) + 3));
    if (lvl >= 3) out.push(...curage());
  } else if (room === "sdb") {
    const faience = Math.round(4 * Math.sqrt(surf) * 2.2);
    if (lvl >= 1) out.push(
      ["Carrelage / Revetements", "Faïence / carrelage mural", faience],
      ["Plomberie", "Bac de douche classique 120×80", 1],
      ["Plomberie", "Robinetterie douche — en applique", 1],
      ["Plomberie", "Paroi fixe 120 (walk-in, verre 8 mm)", 1],
      ["Plomberie", "Robinetterie lavabo (mitigeur)", 1],
      ["Plomberie", "WC classique", 1],
      ["Plomberie", "Meuble-vasque simple", 1],
      ["Plomberie", "Miroir LED", 1],
      ["Chauffage / VMC", "Ventilation (VMC)", 1],
    );
    if (lvl >= 2) out.push(
      ["Cloisons / Platrerie", "Cloison pièce humide (hydrofuge)", faience],
      ...elec(Math.round(surf / 2) + 2),
    );
    if (lvl >= 3) out.push(...curage());
  } else if (room === "chambre") {
    if (lvl >= 1) out.push(["Menuiseries interieures", "Portes intérieures", 1]);
    if (lvl >= 2) out.push(...elec(Math.round(surf / 3) + 2));
    if (lvl >= 3) out.push(...curage());
  } else if (room === "salon") {
    if (lvl >= 1) out.push(["Menuiseries interieures", "Portes intérieures", 1]);
    if (lvl >= 2) out.push(...elec(Math.round(surf / 3) + 3));
    if (lvl >= 3) out.push(...curage());
  } else if (room === "suite") {
    // Chambre + petite salle d'eau (douche, WC, vasque, VMC).
    if (lvl >= 1) out.push(
      ["Menuiseries interieures", "Portes intérieures", 1],
      ["Carrelage / Revetements", "Faïence / carrelage mural", 16],
      ["Plomberie", "Bac de douche classique 120×80", 1],
      ["Plomberie", "Robinetterie douche — en applique", 1],
      ["Plomberie", "Paroi fixe 120 (walk-in, verre 8 mm)", 1],
      ["Plomberie", "Robinetterie lavabo (mitigeur)", 1],
      ["Plomberie", "WC classique", 1],
      ["Plomberie", "Meuble-vasque simple", 1],
      ["Plomberie", "Miroir LED", 1],
      ["Chauffage / VMC", "Ventilation (VMC)", 1],
    );
    if (lvl >= 2) out.push(
      ["Cloisons / Platrerie", "Cloison pièce humide (hydrofuge)", 12],
      ...elec(Math.round(surf / 3) + 3),
    );
    if (lvl >= 3) out.push(...curage());
  } else if (room === "buanderie") {
    if (lvl >= 1) out.push(
      ["Chauffage / VMC", "Ventilation (VMC)", 1],
    );
    if (lvl >= 2) out.push(
      ["Carrelage / Revetements", "Faïence / carrelage mural", Math.round(4 * Math.sqrt(surf) * 1.5)],
      ...elec(3),
    );
    if (lvl >= 3) out.push(...curage());
  }

  return out;
}

/** Contexte de base pour une estimation de pièce(s). Tâches en quantité manuelle → autoQty non utilisé. */
function ctxPiece(totalSurface: number, finition: Finition, cp: string): Ctx {
  const s = Math.max(2, totalSurface || 0);
  return {
    surface: s, surfaceSol: s, surfaceSolManual: true, niveaux: 1, type: "T3", hauteur: 2.5,
    pieces: 1, fenetres: 0, sdb: 0, wc: 0, budget: 0, aleas: 7, finition, codePostal: cp,
    sejour: 0, cuisine: 0, chambres: 0, suites: 0, couloir: 0, buanderie: 0,
  };
}

/** Une pièce = une instance avec sa propre surface (2 chambres = 2 entrées de surfaces différentes). */
export type PieceSel = { room: PieceKey; surface: number };

/**
 * Fusionne plusieurs pièces (chacune sa surface) en un seul { ctx, sel } : additionne les quantités
 * par poste. Réglages ampleur/finition/qui COMMUNS à toutes les pièces.
 */
export function presetPieces(
  rooms: PieceSel[],
  ampleur: Ampleur,
  finition: Finition,
  qui: QuiRealise,
  codePostal: string,
): { ctx: Ctx; sel: Selection } {
  const totalSurface = rooms.reduce((sum, r) => sum + (r.surface || 0), 0);
  const ctx = ctxPiece(totalSurface, finition, cp2(codePostal));
  const qtyByKey: Record<string, { corps: string; nom: string; qty: number }> = {};

  for (const r of rooms) {
    for (const [corps, nom, q] of pieceTasks(r.room, r.surface, ampleur)) {
      const k = key(corps, nom);
      if (!qtyByKey[k]) qtyByKey[k] = { corps, nom, qty: 0 };
      qtyByKey[k].qty += q;
    }
  }

  const sel: Selection = {};
  for (const k of Object.keys(qtyByKey)) {
    const { corps, qty } = qtyByKey[k];
    const self = qui === "max" || (qui === "partie" && DIY_PARTIE.has(corps));
    sel[k] = { on: true, self, qty: Math.round(qty), manual: true };
  }
  return { ctx, sel };
}

function cp2(cp: string): string {
  return (cp || "").replace(/\D/g, "").slice(0, 5);
}

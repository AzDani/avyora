/**
 * Mode « estimation rapide » : traduit (type, surface, ampleur, finition, qui réalise) en une
 * sélection de tâches (ctx + sel) envoyée au MÊME moteur que l'estimateur détaillé → chiffres
 * cohérents entre les deux modes. Différence maison/appartement = l'ENVELOPPE (toiture, façade,
 * charpente) que seule la maison porte, + plus de niveaux/fenêtres. Paniers représentatifs.
 */
import { key, type Ctx, type Selection, type TypeBien, type Finition } from "./core";

export type Ampleur = "rafraich" | "partielle" | "complete" | "lourde";
export type QuiRealise = "pros" | "partie" | "max";

export const AMPLEURS: { v: Ampleur; label: string; desc: string }[] = [
  { v: "rafraich", label: "Rafraîchissement", desc: "Peinture, sols, petites reprises. Rien de lourd." },
  { v: "partielle", label: "Réno partielle", desc: "Cuisine ou SDB, sols, quelques menuiseries." },
  { v: "complete", label: "Réno complète", desc: "Tous les lots refaits — distribution conservée." },
  { v: "lourde", label: "Réno lourde", desc: "Gros œuvre + charpente, toiture, façade." },
];

/** Libellé du niveau d'ampleur adapté au type : le niveau 4 = « Réno lourde » (maison, avec enveloppe)
 *  ou « Réno totale » (appartement, curage + redistribution sans structure d'immeuble). */
export function ampleurLabel(v: Ampleur, type: TypeBien): { label: string; desc: string } {
  const a = AMPLEURS.find((x) => x.v === v) ?? AMPLEURS[0];
  if (v === "lourde" && type !== "Maison")
    return { label: "Réno totale", desc: "Mise à nu : curage + redistribution, tout à neuf." };
  return { label: a.label, desc: a.desc };
}

const DIY_PARTIE = new Set(["Peinture", "Carrelage / Revetements", "Cloisons / Platrerie", "Isolation"]);

type Tache = [corps: string, nom: string];

// ── Intérieur (maison ET appartement), cumulatif ──
const RAFRAICH: Tache[] = [
  ["Peinture", "Peinture des murs"], ["Peinture", "Peinture des plafonds"], ["Peinture", "Préparation des surfaces"],
  ["Carrelage / Revetements", "Sol stratifié (imitation bois)"], ["Carrelage / Revetements", "Sol souple (PVC, lino)"], ["Carrelage / Revetements", "Plinthes"],
];
const PARTIELLE_ADD: Tache[] = [
  ["Carrelage / Revetements", "Carrelage au sol"], ["Carrelage / Revetements", "Faïence / carrelage mural"],
  ["Plomberie", "Installer un WC"], ["Plomberie", "Installer une douche (hors carrelage)"], ["Plomberie", "Installer un lavabo / meuble-vasque"],
  ["Electricite", "Changer / mettre aux normes le tableau"],
  ["Menuiseries exterieures", "Fenêtres"],
  ["Cuisine", "Cuisine complète neuve — tout compris"],
];
const COMPLETE_ADD: Tache[] = [
  ["Electricite", "Rénovation électrique complète"], ["Plomberie", "Refaire toute la plomberie (réseau, hors appareils)"],
  ["Isolation", "Isolation des murs par l'intérieur"],
  ["Cloisons / Platrerie", "Monter une cloison"], ["Cloisons / Platrerie", "Doubler un mur"], ["Cloisons / Platrerie", "Faux plafond"], ["Cloisons / Platrerie", "Finitions plâtrerie (bandes, enduit)"],
  ["Chauffage / VMC", "Radiateurs électriques"], ["Chauffage / VMC", "Ventilation (VMC)"],
  ["Menuiseries interieures", "Portes intérieures"],
];
const LOURDE_INT: Tache[] = [
  ["Maçonnerie", "Ouvrir un mur porteur — petite (porte/fenêtre)"], ["Maçonnerie", "Couler une chape"],
];
// Curage / mise à nu (niveau 4, maison ET appartement) : on dépose tout jusqu'au gros œuvre.
const CURAGE: Tache[] = [
  ["Démolition", "Enlever un revêtement de sol"], ["Démolition", "Enlever un revêtement mural"],
  ["Démolition", "Enlever les vieux réseaux"], ["Démolition", "Vider une cuisine / salle de bain"],
  ["Démolition", "Abattre une cloison"], ["Démolition", "Casser une dalle / vieux sol"],
];

// ── Enveloppe MAISON uniquement (l'appartement ne les porte pas), cumulatif ──
const MAISON_COMPLETE: Tache[] = [
  ["Isolation", "Isolation des combles perdus (soufflage)"],
  ["Toiture", "Nettoyer / démousser la toiture"],
  ["Façade", "Peindre la façade"],
];
const MAISON_LOURDE: Tache[] = [
  ["Charpente & structure bois", "Charpente neuve ou refaite"], ["Charpente & structure bois", "Traiter la charpente"],
  ["Toiture", "Toiture tuile — réfection complète (m²)"], ["Toiture", "Gouttières & descentes"],
  ["Façade", "Refaire l'enduit / le crépi"],
];

export type RapideInput = { type: TypeBien; surface: number; codePostal: string; ampleur: Ampleur; finition: Finition; qui: QuiRealise };

/** Construit ctx + sel pour le mode rapide. Dérive pièces/SDB/niveaux depuis la surface + le type. */
export function presetRapide(input: RapideInput): { ctx: Ctx; sel: Selection } {
  const surface = Math.max(8, input.surface || 0);
  const maison = input.type === "Maison";
  const niveaux = maison && surface > 90 ? 2 : 1;             // une maison a souvent 2 niveaux
  const surfaceSol = maison ? Math.round(surface / niveaux) : surface;
  const pieces = Math.max(2, Math.round(surface / 22));
  const sdb = surface > 110 ? 2 : 1;
  const fenetres = Math.max(3, Math.round(surface / (maison ? 13 : 18))); // appart = façade partagée, moins de fenêtres
  const ctx: Ctx = {
    surface, surfaceSol, surfaceSolManual: true, niveaux, type: input.type, hauteur: 2.5,
    pieces, fenetres, sdb, wc: 1, budget: 0, aleas: 7, finition: input.finition,
    codePostal: input.codePostal,
  };

  let tasks = [...RAFRAICH];
  if (input.ampleur !== "rafraich") tasks = tasks.concat(PARTIELLE_ADD);
  if (input.ampleur === "complete" || input.ampleur === "lourde") {
    tasks = tasks.concat(COMPLETE_ADD);
    if (maison) tasks = tasks.concat(MAISON_COMPLETE);
  }
  if (input.ampleur === "lourde") {
    // Niveau 4 = mise à nu (curage) + reprises. Maison : + enveloppe (charpente/toiture/façade).
    // Appartement : « Réno totale » = curage + redistribution, PAS de structure d'immeuble.
    tasks = tasks.concat(CURAGE, LOURDE_INT);
    if (maison) tasks = tasks.concat(MAISON_LOURDE);
  }

  const lourde = input.ampleur === "lourde";
  const qManuel: Record<string, number> = {
    [key("Menuiseries exterieures", "Fenêtres")]: fenetres,
    [key("Cuisine", "Cuisine complète neuve — tout compris")]: Math.max(2.5, Math.round(surface / 28)),
    [key("Maçonnerie", "Couler une chape")]: surface,
    [key("Maçonnerie", "Ouvrir un mur porteur — petite (porte/fenêtre)")]: lourde ? 2 : 1,
    [key("Démolition", "Enlever un revêtement mural")]: Math.round(surface * 2.2),
    [key("Démolition", "Abattre une cloison")]: Math.round(surface * 0.2),
    [key("Démolition", "Casser une dalle / vieux sol")]: surface,
  };

  const sel: Selection = {};
  for (const [c, n] of tasks) {
    const k = key(c, n);
    const self = input.qui === "max" || (input.qui === "partie" && DIY_PARTIE.has(c));
    sel[k] = { on: true, self };
    if (qManuel[k] != null) { sel[k].qty = qManuel[k]; sel[k].manual = true; }
  }
  return { ctx, sel };
}

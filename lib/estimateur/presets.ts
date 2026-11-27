/**
 * Mode « estimation rapide » : traduit (type, surface, ampleur, finition, qui réalise) en une
 * sélection de tâches (ctx + sel) envoyée au MÊME moteur que l'estimateur détaillé → chiffres
 * cohérents entre les deux modes. Différence maison/appartement = l'ENVELOPPE (toiture, façade,
 * charpente) que seule la maison porte, + plus de niveaux/fenêtres. Paniers représentatifs.
 */
import { key, ALEAS_RENO, type Ctx, type Selection, type TypeBien, type Finition } from "./core";
import { solCarrele } from "./quantites";
import { AMPLEURS, surfaceRapide, type Ampleur, type QuiRealise } from "./rapide-constantes";

export type { Ampleur, QuiRealise } from "./rapide-constantes";

export { AMPLEURS } from "./rapide-constantes";

/** Libellé du niveau d'ampleur adapté au type : le niveau 4 = « Réno lourde » (maison, avec enveloppe)
 *  ou « Réno totale » (appartement, curage + redistribution sans structure d'immeuble). */
export function ampleurLabel(v: Ampleur, type: TypeBien): { label: string; desc: string } {
  const a = AMPLEURS.find((x) => x.v === v) ?? AMPLEURS[0];
  if (v === "lourde" && type !== "Maison")
    return { label: "Réno totale", desc: "Mise à nu : curage + redistribution, tout à neuf." };
  return { label: a.label, desc: a.desc };
}

/** Lots qu'un particulier fait couramment lui-même (« J'en fais une partie ») : le MÊME choix en
 *  rénovation (rapide, par pièce) et en construction neuve. */
export const DIY_PARTIE = new Set(["Peinture", "Carrelage / Revetements", "Cloisons / Platrerie", "Isolation"]);

type Tache = [corps: string, nom: string];

export { SURFACE_MIN_RAPIDE, SURFACE_MAX_RAPIDE, surfaceRapide } from "./rapide-constantes";

// Les sols : UNE couche par zone, jamais deux. La zone « sèche » (séjour, chambres, 40 %) prend le
// stratifié à toutes les ampleurs ; la zone « carrelable » (pièces d'eau, entrée, cuisine, 60 %) prend
// un sol souple au rafraîchissement, puis le carrelage dès la réno partielle, qui le REMPLACE. Avant,
// stratifié ET sol souple couvraient chacun 40 % (la même zone, deux fois), et le carrelage s'y
// ajoutait : 84 m² de sol pour un appartement de 60 m² (revue du 12/11/2026).
const SOL_SOUPLE: Tache = ["Carrelage / Revetements", "Sol souple (PVC, lino)"];

// ── Intérieur (maison ET appartement), cumulatif ──
const RAFRAICH: Tache[] = [
  ["Peinture", "Peinture des murs"], ["Peinture", "Peinture des plafonds"], ["Peinture", "Préparation des surfaces"],
  ["Carrelage / Revetements", "Sol stratifié (imitation bois)"], ["Carrelage / Revetements", "Plinthes"],
];
const PARTIELLE_ADD: Tache[] = [
  ["Carrelage / Revetements", "Carrelage au sol"], ["Carrelage / Revetements", "Faïence / carrelage mural"],
  ["Plomberie", "WC"], ["Plomberie", "Bac de douche"], ["Plomberie", "Colonne de douche"], ["Plomberie", "Paroi de douche"], ["Plomberie", "Meuble-vasque"], ["Plomberie", "Robinetterie lavabo"], ["Plomberie", "Miroir"],
  ["Menuiseries exterieures", "Fenêtres"],
  ["Cuisine", "Cuisine complète neuve — tout compris"],
];
// Le tableau seul ne vaut que pour la réno partielle : dès la réno complète, « Rénovation électrique
// complète » le comprend (prix au m² de Dani, tableau compris — décision du 22/11/2026). Avant, les deux
// se cumulaient : ≈ 1 190 € TTC de trop sur une réno complète ou lourde.
const PARTIELLE_SEULE: Tache[] = [
  ["Electricite", "Changer / mettre aux normes le tableau"],
];
const COMPLETE_ADD: Tache[] = [
  ["Electricite", "Rénovation électrique complète"], ["Plomberie", "Refaire toute la plomberie (réseau, hors appareils)"],
  ["Isolation", "Isolation des murs par l'intérieur"],
  /* Le doublage de la façade est porté par « Isolation des murs par l'intérieur » (ci-dessus) :
     cocher AUSSI « Doubler un mur » facturait deux fois la même paroi (décision du 18/09/2026). */
  ["Cloisons / Platrerie", "Monter une cloison"], ["Cloisons / Platrerie", "Faux plafond"], ["Cloisons / Platrerie", "Finitions plâtrerie (bandes, enduit)"],
  ["Chauffage / VMC", "Radiateurs électriques"], ["Chauffage / VMC", "Ventilation (VMC)"],
  ["Menuiseries interieures", "Porte intérieure battante"],
];
const LOURDE_INT: Tache[] = [
  ["Maçonnerie", "Ouvrir un mur porteur — petite (porte/fenêtre)"], ["Maçonnerie", "Chape traditionnelle"],
];
// Curage / mise à nu (niveau 4, maison ET appartement) : on dépose tout jusqu'au gros œuvre.
const CURAGE: Tache[] = [
  ["Démolition", "Enlever un revêtement de sol"], ["Démolition", "Enlever un revêtement mural"],
  ["Démolition", "Enlever les vieux réseaux"], ["Démolition", "Dépose complète cuisine / salle de bain (curage)"],
  ["Démolition", "Abattre une cloison"], ["Démolition", "Casser une dalle / vieux sol"],
];

// ── Enveloppe MAISON uniquement (l'appartement ne les porte pas) ──
// L'isolation des combles vaut pour la réno complète ET la lourde. L'ENTRETIEN de l'enveloppe (toiture
// démoussée, façade repeinte) ne vaut que pour la réno complète : la réno lourde REFAIT la couverture et
// l'enduit, elle ne les entretient pas en plus. Avant, les deux se cumulaient : une maison de 100 m² en
// réno lourde payait le démoussage d'une toiture déposée, la peinture d'un enduit monocouche neuf (teinté
// dans la masse) et le traitement d'une charpente remplacée, soit ≈ 7 000 € de trop (audit du 21/11/2026).
const MAISON_ISOLATION: Tache[] = [
  ["Isolation", "Isolation des combles perdus (soufflage)"],
];
const MAISON_ENTRETIEN: Tache[] = [
  ["Charpente, couverture & structure bois", "Nettoyer / démousser la toiture"],
  ["Façade", "Peindre la façade"],
];
const MAISON_LOURDE: Tache[] = [
  ["Charpente, couverture & structure bois", "Charpente traditionnelle (hors couverture)"],
  ["Charpente, couverture & structure bois", "Réfection couverture tuiles (dépose + écran + liteaux)"], ["Charpente, couverture & structure bois", "Gouttières & descentes"],
  ["Façade", "Enduit monocouche (machine)"],
];

export type RapideInput = { type: TypeBien; surface: number; codePostal: string; ampleur: Ampleur; finition: Finition; qui: QuiRealise };

/** Construit ctx + sel pour le mode rapide. Dérive pièces/SDB/niveaux depuis la surface + le type. */
export function presetRapide(input: RapideInput): { ctx: Ctx; sel: Selection } {
  const surface = surfaceRapide(input.surface || 0);
  const maison = input.type === "Maison";
  const niveaux = maison && surface > 90 ? 2 : 1;             // une maison a souvent 2 niveaux
  const surfaceSol = maison ? Math.round(surface / niveaux) : surface;
  const pieces = Math.max(2, Math.round(surface / 22));
  const sdb = surface > 110 ? 2 : 1;
  const fenetres = Math.max(3, Math.round(surface / (maison ? 13 : 18))); // appart = façade partagée, moins de fenêtres
  const ctx: Ctx = {
    surface, surfaceSol, surfaceSolManual: true, niveaux, type: input.type, hauteur: 2.5,
    pieces, fenetres, sdb, wc: 1, budget: 0, aleas: ALEAS_RENO, finition: input.finition,
    codePostal: input.codePostal,
  };

  let tasks = [...RAFRAICH];
  // Rafraîchissement : sol souple sur la zone carrelable ; au-delà, le carrelage la couvre à sa place.
  if (input.ampleur === "rafraich") tasks.push(SOL_SOUPLE);
  else tasks = tasks.concat(PARTIELLE_ADD, input.ampleur === "partielle" ? PARTIELLE_SEULE : []);
  if (input.ampleur === "complete" || input.ampleur === "lourde") {
    tasks = tasks.concat(COMPLETE_ADD);
    if (maison) tasks = tasks.concat(MAISON_ISOLATION, input.ampleur === "complete" ? MAISON_ENTRETIEN : []);
  }
  if (input.ampleur === "lourde") {
    // Niveau 4 = mise à nu (curage) + reprises. Maison : + enveloppe (charpente/toiture/façade).
    // Appartement : « Réno totale » = curage + redistribution, PAS de structure d'immeuble.
    tasks = tasks.concat(CURAGE, LOURDE_INT);
    if (maison) tasks = tasks.concat(MAISON_LOURDE);
  }

  const lourde = input.ampleur === "lourde";
  const qManuel: Record<string, number> = {
    // La zone du carrelage (celle que le moteur donne au « Carrelage au sol »), pas les 40 % d'un sol sec.
    [key(...SOL_SOUPLE)]: Math.round(solCarrele(surface)),
    [key("Menuiseries exterieures", "Fenêtres")]: fenetres,
    [key("Cuisine", "Cuisine complète neuve — tout compris")]: Math.max(2.5, Math.round(surface / 28)),
    [key("Maçonnerie", "Chape traditionnelle")]: surface,
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

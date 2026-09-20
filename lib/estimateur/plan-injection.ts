/**
 * Phase 4 — l'injection : les contributions du plan deviennent une sélection.
 *
 * C'est ici que le plan écrit dans le projet. Trois décisions commandent ce fichier.
 *
 * **D13 — l'estimation reste écrite.** Le plan n'est pas recalculé à chaque lecture : il écrit
 * une fois dans `sel`, et le projet reste lisible tout seul. Un projet sans plan n'est jamais
 * touché par ce code.
 *
 * **D12 — une quantité corrigée à la main épingle la ligne.** Une ligne écrite par le plan porte
 * `plan: true`. Dès que l'utilisateur en modifie la quantité dans l'estimateur, ce drapeau tombe
 * et la ligne lui appartient : la prochaine injection ne l'écrase pas, elle SIGNALE l'écart. Sans
 * ça, le double check demandé en D1 ne servirait à rien — ce qu'on valide serait effacé à la
 * retouche suivante du plan.
 *
 * **D11 — un forfait se coche, il ne reçoit pas de quantité.** Le moteur ignore `qty` sur un
 * poste au forfait ; on ne lui en envoie donc pas, et le rapport le dit.
 *
 * La fonction ne décide rien d'autre : elle ne choisit pas de postes (c'est la table de
 * correspondance), elle ne calcule aucun prix (c'est le moteur). Elle rapproche et elle rapporte.
 */
import { key, type Selection } from "./core";
import { posteParId } from "./identite";
import type { Contribution } from "./plan-correspondance";

export type EtatLigne = "ajoutee" | "mise-a-jour" | "inchangee" | "epinglee";

export interface LigneInjectee {
  /** Clé de la sélection : `key(lot, nom)`. */
  cle: string;
  /** Identifiant stable du poste (D16). */
  poste: string;
  lot: string;
  nom: string;
  unite: string;
  /** Ce que le plan a mesuré. */
  quantite: number;
  /** Ce qu'il y avait avant, quand il y avait quelque chose. */
  avant: number | null;
  etat: EtatLigne;
  /** Le poste est au forfait : il se coche, sa quantité n'est pas lue (D11). */
  forfait: boolean;
  raison: string;
  /** Renseigné quand le plan a déduit au lieu de mesurer — à mettre en évidence à la relecture. */
  deduction?: string;
  /** Les objets du plan d'où vient la quantité. */
  sources: string[];
}

export interface RapportInjection {
  /** La sélection à enregistrer. L'objet reçu n'est jamais modifié. */
  selection: Selection;
  lignes: LigneInjectee[];
  /** Combien de lignes le plan a ajoutées, mises à jour, laissées telles quelles, ou n'a pas touchées. */
  bilan: { ajoutees: number; misesAJour: number; inchangees: number; epinglees: number; deductions: number };
}

const proche = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Écrit les contributions du plan dans une sélection, et rend le rapport de ce qui a changé.
 *
 * @param selection sélection actuelle du projet (jamais modifiée sur place)
 * @param contributions ce que la table de correspondance a produit
 */
export function injecterPlan(selection: Selection, contributions: Contribution[]): RapportInjection {
  const out: Selection = { ...selection };
  const lignes: LigneInjectee[] = [];

  for (const c of contributions) {
    const poste = posteParId(c.poste);
    if (!poste) continue;                       // la table garantit déjà l'existence ; ceinture et bretelles
    const cle = key(poste.lot, poste.nom);
    const avantLigne = selection[cle];
    const forfait = poste.tache.u === "forfait";
    const quantite = forfait ? 1 : c.quantite;

    // D12 : l'utilisateur a corrigé cette quantité à la main → on n'y touche pas, on signale.
    const epinglee = !!avantLigne && avantLigne.manual === true && avantLigne.plan !== true;
    if (epinglee) {
      lignes.push({
        cle, poste: c.poste, lot: poste.lot, nom: poste.nom, unite: poste.tache.u,
        quantite, avant: avantLigne.qty ?? null, etat: "epinglee", forfait,
        raison: c.raison, deduction: c.deduction, sources: c.sources,
      });
      continue;
    }

    const avant = avantLigne?.qty ?? null;
    const etat: EtatLigne = !avantLigne || avantLigne.on !== true ? "ajoutee"
      : avant != null && proche(avant, quantite) ? "inchangee"
      : "mise-a-jour";

    const ligne = { ...(avantLigne ?? {}), on: true, plan: true } as Selection[string];
    // D11 : un forfait n'a pas de quantité à recevoir — on le coche, et c'est tout.
    if (!forfait) { ligne.qty = quantite; ligne.manual = true; }
    if (c.variante) ligne.vsel = { ...(avantLigne?.vsel ?? {}), ...c.variante };
    /* Le moteur lit le matériau et le vitrage sur la ligne elle-même (`s.mat` / `s.vit`), pas
       dans `vsel` : une menuiserie dessinée en bois ou en triple vitrage se chiffrait sinon au
       défaut du moteur, quel que soit le choix fait sur le plan. */
    if (c.mat) ligne.mat = c.mat;
    if (c.vit) ligne.vit = c.vit;
    out[cle] = ligne;

    lignes.push({
      cle, poste: c.poste, lot: poste.lot, nom: poste.nom, unite: poste.tache.u,
      quantite, avant, etat, forfait, raison: c.raison, deduction: c.deduction, sources: c.sources,
    });
  }

  const bilan = {
    ajoutees: lignes.filter((l) => l.etat === "ajoutee").length,
    misesAJour: lignes.filter((l) => l.etat === "mise-a-jour").length,
    inchangees: lignes.filter((l) => l.etat === "inchangee").length,
    epinglees: lignes.filter((l) => l.etat === "epinglee").length,
    deductions: lignes.filter((l) => l.deduction).length,
  };
  return { selection: out, lignes, bilan };
}

/** Les lignes à montrer en priorité au double check : ce qui a changé, et ce qui a été déduit. */
export function lignesAValider(rapport: RapportInjection): LigneInjectee[] {
  const poids = (l: LigneInjectee) => (l.etat === "epinglee" ? 0 : l.deduction ? 1 : l.etat === "mise-a-jour" ? 2 : l.etat === "ajoutee" ? 3 : 4);
  return [...rapport.lignes].sort((a, b) => poids(a) - poids(b) || a.lot.localeCompare(b.lot) || a.nom.localeCompare(b.nom));
}

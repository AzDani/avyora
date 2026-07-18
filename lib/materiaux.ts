import type { Estimation } from "./estimation";
import type { Metre } from "./metre";

/**
 * Module 9 — liste de matériaux générée depuis l'estimation (100 % déterministe).
 * Quantités indicatives avec chutes incluses, arrondies en conditionnements fournisseur.
 */

export type Materiau = {
  nom: string;
  quantite: number;
  unite: string;
  detail?: string;
};

export type GroupeMateriaux = {
  corps: string;
  items: Materiau[];
};

const up = (n: number) => Math.ceil(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function listeMateriaux(est: Estimation, metre: Metre | null): GroupeMateriaux[] {
  const groupes: GroupeMateriaux[] = [];
  const q = (fragment: string): number =>
    est.lignes.find((l) => l.poste.toLowerCase().includes(fragment.toLowerCase()))?.quantite ?? 0;

  // Peinture
  const sPeinture = q("Peinture murs");
  if (sPeinture > 0) {
    groupes.push({
      corps: "Peinture",
      items: [
        { nom: "Sous-couche", quantite: up(sPeinture / 10), unite: "L", detail: "1 couche — rendement ~10 m²/L" },
        { nom: "Peinture de finition", quantite: up((sPeinture / 10) * 2), unite: "L", detail: "2 couches" },
        { nom: "Enduit de rebouchage/lissage", quantite: up(sPeinture * 0.15), unite: "kg" },
        { nom: "Kit rouleaux, bâches, adhésif de masquage", quantite: 1, unite: "lot" },
      ],
    });
  }

  // Carrelage sol
  const sCarrelage = q("Carrelage sol");
  if (sCarrelage > 0) {
    groupes.push({
      corps: "Carrelage sol",
      items: [
        { nom: "Carrelage", quantite: r1(sCarrelage * 1.1), unite: "m²", detail: "+10 % de chutes" },
        { nom: "Colle carrelage (sacs 25 kg)", quantite: up((sCarrelage * 4.5) / 25), unite: "sacs", detail: "~4,5 kg/m² double encollage" },
        { nom: "Joint (sacs 5 kg)", quantite: up((sCarrelage * 0.6) / 5), unite: "sacs" },
        { nom: "Croisillons + primaire", quantite: 1, unite: "lot" },
      ],
    });
  }

  // Faïence
  const sFaience = q("Faïence");
  if (sFaience > 0) {
    groupes.push({
      corps: "Faïence murale",
      items: [
        { nom: "Faïence", quantite: r1(sFaience * 1.1), unite: "m²", detail: "+10 % de chutes" },
        { nom: "Colle (sacs 25 kg)", quantite: up((sFaience * 3.5) / 25), unite: "sacs" },
        { nom: "Joint + natte/SEL d'étanchéité zones d'eau", quantite: 1, unite: "lot" },
      ],
    });
  }

  // Parquet
  const sParquet = q("Parquet");
  if (sParquet > 0) {
    groupes.push({
      corps: "Parquet stratifié",
      items: [
        { nom: "Lames stratifiées", quantite: r1(sParquet * 1.08), unite: "m²", detail: "+8 % de chutes" },
        { nom: "Sous-couche acoustique", quantite: r1(sParquet * 1.05), unite: "m²" },
      ],
    });
  }

  // Plinthes
  const mlPlinthes = q("Plinthes");
  if (mlPlinthes > 0) {
    groupes.push({
      corps: "Plinthes",
      items: [
        { nom: "Plinthes", quantite: r1(mlPlinthes * 1.1), unite: "ml", detail: "+10 % de coupes" },
        { nom: "Colle fixation / clous", quantite: 1, unite: "lot" },
      ],
    });
  }

  // Ragréage
  const sRagreage = q("Ragréage");
  if (sRagreage > 0) {
    groupes.push({
      corps: "Ragréage",
      items: [
        { nom: "Ragréage autolissant (sacs 25 kg)", quantite: up((sRagreage * 4.5) / 25), unite: "sacs", detail: "~3 mm d'épaisseur moyenne" },
        { nom: "Primaire d'accrochage", quantite: up(sRagreage / 50), unite: "bidons 5 L" },
      ],
    });
  }

  // Placo (cloisons + doublage + faux plafond)
  const sPlaco =
    q("Cloison placo") + q("Doublage murs") + q("Faux plafond");
  if (sPlaco > 0) {
    groupes.push({
      corps: "Plâtrerie",
      items: [
        { nom: "Plaques BA13 (250×120)", quantite: up((sPlaco / 3) * 1.05), unite: "plaques", detail: "+5 % de chutes" },
        { nom: "Rails + montants", quantite: up(sPlaco * 2.2), unite: "ml" },
        { nom: "Isolant (si doublage/cloison isolée)", quantite: r1(sPlaco), unite: "m²" },
        { nom: "Vis, bandes à joint, enduit", quantite: up(sPlaco * 0.35), unite: "kg d'enduit" },
      ],
    });
  }

  // Chape
  const sChape = est.lignes
    .filter((l) => l.poste.toLowerCase().includes("chape"))
    .reduce((s, l) => s + l.quantite, 0);
  if (sChape > 0) {
    groupes.push({
      corps: "Chape",
      items: [
        { nom: "Mortier de chape (~5 cm)", quantite: r1((sChape * 100) / 1000), unite: "t", detail: "~100 kg/m²" },
        { nom: "Treillis / fibres + film polyane", quantite: r1(sChape), unite: "m²" },
      ],
    });
  }

  // Hérisson + dalle
  const sDalle = q("Hérisson");
  if (sDalle > 0) {
    groupes.push({
      corps: "Dalle sur hérisson",
      items: [
        { nom: "Gravier compacté (~15 cm)", quantite: r1((sDalle * 0.25)), unite: "t", detail: "~250 kg/m²" },
        { nom: "Béton (dalle ~12 cm)", quantite: r1(sDalle * 0.12), unite: "m³" },
        { nom: "Treillis soudé + polyane", quantite: r1(sDalle * 1.1), unite: "m²" },
      ],
    });
  }

  // Fenêtres
  const nbFen = est.lignes
    .filter((l) => l.poste.toLowerCase().includes("fenêtre"))
    .reduce((s, l) => s + l.quantite, 0);
  if (nbFen > 0) {
    groupes.push({
      corps: "Menuiseries",
      items: [
        { nom: "Fenêtres (sur mesure — prendre les cotes tableau)", quantite: nbFen, unite: "u." },
        { nom: "Mousse expansive, compribande, silicone", quantite: 1, unite: "lot" },
      ],
    });
  }

  // Métré bonus : portes intérieures connues
  if (metre && metre.totalPortes > 0) {
    groupes.push({
      corps: "Menuiseries intérieures (d'après ton métré)",
      items: [
        { nom: "Blocs-portes", quantite: metre.totalPortes, unite: "u.", detail: "à confirmer selon l'état des existants" },
      ],
    });
  }

  return groupes;
}

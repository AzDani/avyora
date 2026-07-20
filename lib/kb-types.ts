/**
 * Base de connaissances métier AVYORA — modèle structuré du savoir de chiffrage.
 * Source de vérité éditable (tables kb_*). Le moteur d'estimation (pur, client-safe) lit un
 * SNAPSHOT JSON généré depuis ces tables → le savoir devient donnée, sans casser le moteur.
 */

export type Unite = "m2" | "m2_habitable" | "ml" | "m3" | "u" | "h" | "forfait" | string;

export type KbCategorie = {
  id: string; // = corps d'état (slug)
  nom: string;
  ordre: number;
  icone?: string | null;
  actif: number;
};

/** Un poste de travaux du catalogue (peinture, carrelage, PAC, SDB complète…). */
export type KbPoste = {
  id: string; // slug stable "categorie::poste"
  categorie_id: string;
  nom: string;
  description?: string | null; // ce que le poste inclut
  unite: Unite;
  prix_min: number;
  prix_moy: number;
  prix_max: number;
  part_mo?: number | null; // part main d'œuvre (0-1) ; null = défaut par catégorie
  duree_unitaire?: number | null; // h par unité → durée chantier
  difficulte: number; // 1-5
  finition_min: "eco" | "standard" | "premium" | "luxe" | string;
  confiance?: string | null;
  ordre: number;
  actif: number;
  archived: number;
};

export type KbDependance = {
  poste_id: string;
  requiert_poste_id: string;
  type: "requis" | "suggere" | "exclut";
};

/** Coefficient multiplicatif : finition, localisation (région/dept/ville), ancienneté, difficulté. */
export type KbCoefficient = {
  id: string;
  type: "finition" | "localisation" | "anciennete" | "difficulte" | "contexte";
  cle: string; // premium | 33 | avant_1949 | etage_sans_ascenseur
  scope_niveau: "national" | "region" | "departement" | "ville";
  cible?: string | null; // null = global | categorie_id | poste_id
  valeur: number;
  label?: string | null;
  actif: number;
};

/** Règle métier data-driven (remplace le code en dur) : condition → actions. */
export type KbRegle = {
  id: string;
  nom: string;
  type: "ajout_poste" | "coefficient" | "forfait_min" | "risque" | "conseil";
  priorite: number;
  condition_json: string;
  action_json: string;
  actif: number;
  archived: number;
  version: number;
};

/** Forme du snapshot JSON consommé par le moteur pur (miroir de referentiel-prix). */
export type ReferentielSnapshot = {
  meta: Record<string, unknown>;
  postes: {
    corps_etat: string;
    poste: string;
    unite: string;
    prix_bas: number;
    prix_median: number;
    prix_haut: number;
    inclut?: string;
    confiance?: string;
    part_mo?: number;
    kb_id?: string; // id stable (traçabilité KB → snapshot)
  }[];
};

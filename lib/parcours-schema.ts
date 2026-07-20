/**
 * Parcours data-driven (form-builder) — types de DÉFINITION, client-safe (aucun import DB).
 *
 * Le questionnaire n'est plus codé en dur : sa définition (étapes → groupes → questions →
 * options) vit en base et est éditée en admin. Le moteur de rendu lit cet arbre et écrit les
 * réponses ; les questions « liées » (binding) alimentent le moteur d'estimation existant
 * (contrat de variables système), les questions « libres » ajoutent un impact prix configurable.
 */

/** Les 14 types de réponse demandés + les widgets experts (composants dédiés). */
export type QuestionType =
  | "texte"        // texte libre
  | "nombre"       // nombre
  | "surface"      // surface en m²
  | "longueur"
  | "largeur"
  | "hauteur"
  | "volume"
  | "quantite"
  | "bool"         // oui / non
  | "unique"       // choix unique
  | "multiple"     // choix multiple
  | "liste"        // liste déroulante
  | "curseur"      // slider
  | "photo"
  | "document"
  | "commentaire"
  // widgets experts : rendus par un composant existant, positionnables comme une question
  | "configurateur_sdb"
  | "metre_pieces";

/** Comment la valeur d'une réponse liée est écrite dans `reponses` (contrat moteur). */
export type BindingType = "string" | "bool" | "number";

export type OptionDef = {
  id: string;
  label: string;
  /** Valeur écrite dans les réponses. Pour une question liée : la valeur attendue par le moteur. */
  valeur?: string;
  hint?: string;
  ordre: number;
  /** Question libre : montant de l'impact prix. */
  impactPrix?: number;
  mode?: "forfait" | "m2" | "pu";
  archived?: boolean;
};

/** Une clause de condition : compare une réponse (`binding`) à une valeur. */
export type RegleClause = {
  binding: string;
  op: "eq" | "ne" | "in" | "truthy" | "falsy";
  valeur?: string | string[];
};
/** Condition d'affichage en DNF : liste de groupes ; visible si UN groupe est entièrement vrai (OR de AND). */
export type RegleVisibilite = RegleClause[][];

export type QuestionConfig = {
  /** Condition d'affichage. Absente = toujours visible. */
  visibleSi?: RegleVisibilite;
  /**
   * Masqué : la question NE S'AFFICHE PAS mais reste dans reponsesParDefaut (sa valeur neutre est
   * appliquée au chiffrage) — équivalent des « blocs masqués » de l'ancien form (appliquerMasques).
   * À distinguer de `archived` (retiré de la définition, plus de défaut).
   */
  masque?: boolean;
  /** Choix unique : re-cliquer l'option sélectionnée revient à cette valeur (dé-sélection sûre). */
  neutre?: string;
  /**
   * Valeur PRÉ-SÉLECTIONNÉE à l'ouverture du formulaire (état initial), distincte du `neutre`.
   * Ex. peinture : défaut "complete" (tout repeindre) mais neutre "aucune" (cible de dé-sélection).
   * Absent → reponsesParDefaut retombe sur `neutre`. Reproduit les défauts de l'ancien formulaire.
   */
  defaut?: string;
  /** true = une réponse toujours sélectionnée (pas de dé-sélection). */
  obligatoireSelection?: boolean;
  /** Coercition de la valeur écrite dans `reponses[binding]`. */
  bindingType?: BindingType;
  /** Type nombre/curseur : bornes et pas. */
  min?: number;
  max?: number;
  pas?: number;
  unite?: string;
  /** Configurateur SDB : personnalisation config-driven (sous-questions custom + overrides douche). */
  sdbCustom?: import("@/components/SdbConfigurateur").SdbCustomConfig;
  /** Réglages libres additionnels (extensible sans migration). */
  [k: string]: unknown;
};

export type QuestionDef = {
  id: string;
  cle?: string;
  titre: string;
  description?: string;
  aide?: string;
  type: QuestionType;
  obligatoire: boolean;
  ordre: number;
  /** Variable système alimentée (ex. "sols"). Absent = question libre (impact prix configurable). */
  binding?: string;
  corpsEtat?: string;
  mediaUrl?: string;
  config?: QuestionConfig;
  options: OptionDef[];
  archived?: boolean;
};

export type GroupDef = {
  id: string;
  titre?: string;
  description?: string;
  ordre: number;
  questions: QuestionDef[];
  archived?: boolean;
};

export type StepDef = {
  id: string;
  cle: string;
  titre: string;
  description?: string;
  ordre: number;
  groups: GroupDef[];
  archived?: boolean;
};

export type ParcoursDef = {
  id: string;
  cle: string;
  titre: string;
  typeProjet: "renovation" | "neuf";
  version: number;
  steps: StepDef[];
};

/** Parcours entier chargé (réno + neuf), tel que le rendu et l'admin le consomment. */
export type ParcoursComplet = Record<"renovation" | "neuf", ParcoursDef | null>;

/** Évalue une clause contre les réponses (lookup = reponses puis méta). */
function clauseVraie(c: RegleClause, lire: (b: string) => unknown): boolean {
  const v = lire(c.binding);
  switch (c.op) {
    case "truthy": return !!v && v !== "non" && v !== 0;
    case "falsy": return !v || v === "non" || v === 0;
    case "eq": return String(v) === String(c.valeur);
    case "ne": return String(v) !== String(c.valeur);
    case "in": return Array.isArray(c.valeur) && c.valeur.map(String).includes(String(v));
    default: return true;
  }
}

/** Une question/section est visible si sa condition (DNF) est satisfaite (ou si absente). */
export function estVisible(cond: RegleVisibilite | undefined, lire: (b: string) => unknown): boolean {
  if (!cond || cond.length === 0) return true;
  return cond.some((groupe) => groupe.every((c) => clauseVraie(c, lire)));
}

const META = new Set(["nom", "surface", "codePostal"]);

/**
 * Valeurs par défaut des réponses (= état initial du formulaire), dérivées du schéma :
 * chaque question liée avec un `neutre` prend cette valeur (bool coercé). Reproduit les
 * défauts du formulaire codé en dur → conditions + estimation identiques dès l'ouverture.
 */
const NUM_DEFAUT = new Set(["nombre", "surface", "longueur", "largeur", "hauteur", "volume", "quantite", "curseur"]);

export function reponsesParDefaut(parcours: ParcoursDef): Record<string, string | boolean | number> {
  const r: Record<string, string | boolean | number> = {};
  for (const s of parcours.steps)
    for (const g of s.groups)
      for (const q of g.questions) {
        const b = q.binding;
        if (!b || META.has(b)) continue;
        if (q.type === "bool") {
          const d = q.config?.defaut ?? q.config?.neutre ?? "non";
          r[b] = q.config?.inverse ? d !== "oui" : d === "oui";
        } else {
          // Défaut initial explicite (config.defaut) prioritaire sur le neutre (cible de dé-sélection).
          const d = q.config?.defaut ?? q.config?.neutre;
          if (d != null) r[b] = NUM_DEFAUT.has(q.type) || q.config?.bindingType === "number" ? Number(d) : d;
        }
      }
  return r;
}

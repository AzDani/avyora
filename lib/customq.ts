/**
 * Personnalisation du questionnaire (éditeur inline additif).
 * Types client-safe + calcul pur des lignes de chiffrage. Aucun import DB.
 */

export type CustomMode = "forfait" | "m2"; // forfait = prix fixe ; m2 = prix × surface habitable
export type CustomType = "unique" | "multiple" | "nombre";

export type CustomOption = {
  id: string;
  label: string;
  prix: number; // 0 = « à chiffrer » (ne compte pas encore)
  mode: CustomMode;
};

export type CustomSection = 1 | 2 | 3 | 4;

export type CustomQuestion = {
  id: string;
  section: CustomSection;
  label: string;
  type: CustomType;
  corps: string;
  ordre: number;
  options: CustomOption[]; // nombre : une seule option = prix unitaire + nom d'unité
};

/** Personnalisation d'une question intégrée (repérée par son libellé d'origine, clé stable). */
export type BuiltinCustom = {
  hidden: string[]; // valeurs d'options intégrées masquées
  added: CustomOption[]; // options ajoutées par l'utilisateur (toggles qui s'ajoutent au prix)
  corps?: string; // corps d'état pour le budget des options ajoutées
  labelOverride?: string; // nom de la question renommé par l'utilisateur (affichage)
  optionLabels?: Record<string, string>; // libellés d'options intégrées renommés (par valeur)
};

/** Catégorie/sous-titre ajouté par l'utilisateur pour regrouper des questions dans une section. */
export type CustomHeading = {
  id: string;
  section: CustomSection;
  label: string;
  /** Catégorie parente (id de bloc : `head_*` intégré ou `h:<id>` custom). Absent = catégorie principale. */
  parent?: string;
};

export type FormConfig = {
  questions: CustomQuestion[];
  builtin: Record<string, BuiltinCustom>;
  /** Ordre voulu des blocs par section (ids de blocs intégrés + `q:<id>` questions + `h:<id>` catégories). Vide = ordre naturel. */
  order?: Record<number, string[]>;
  /** Catégories/sous-titres ajoutés par l'utilisateur. */
  headings?: CustomHeading[];
  /** Blocs intégrés masqués par l'utilisateur (ids de blocs). Masqués dans le vrai formulaire, réaffichables en perso. */
  hiddenBlocs?: string[];
  /** Questions/options personnalisées AJOUTÉES au configurateur de salle de bain (ex. « Type de miroir »). Répétées par SDB. */
  sdbQuestions?: CustomQuestion[];
};

export const CONFIG_VIDE: FormConfig = { questions: [], builtin: {}, order: {}, headings: [], hiddenBlocs: [], sdbQuestions: [] };

/**
 * Chronologie des travaux (gros œuvre → finitions). Sert à trier automatiquement
 * les questions ajoutées selon leur corps d'état (palier 3). Doit rester alignée
 * sur ORDRE_TRAVAUX de estimation.ts. Client-safe (aucune dépendance serveur).
 */
export const CORPS_ORDRE: string[] = [
  "demolition_curage",
  "gros_oeuvre",
  "couverture",
  "raccordements",
  "assainissement",
  "construction_neuve",
  "platrerie",
  "electricite",
  "plomberie",
  "chauffage_ventilation",
  "isolation",
  "menuiseries_ext",
  "menuiseries_int",
  "sols",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "facade",
  "divers",
];

/** Libellés des corps d'état (client-safe ; miroir de CORPS_LABELS d'estimation.ts). */
export const CORPS_LABEL: Record<string, string> = {
  demolition_curage: "Démolition / curage",
  gros_oeuvre: "Gros œuvre",
  couverture: "Couverture / charpente",
  raccordements: "Raccordements & compteurs",
  assainissement: "Assainissement",
  construction_neuve: "Construction neuve",
  platrerie: "Plâtrerie / cloisons",
  electricite: "Électricité",
  plomberie: "Plomberie",
  chauffage_ventilation: "Chauffage / ventilation",
  isolation: "Isolation",
  menuiseries_ext: "Menuiseries extérieures",
  menuiseries_int: "Menuiseries intérieures",
  sols: "Sols",
  salle_de_bain: "Salle de bain",
  cuisine: "Cuisine",
  peinture: "Peinture",
  facade: "Façade / extérieur",
  divers: "Divers",
};

/** Rang chronologique d'un corps d'état (les inconnus finissent à la fin). */
export function rangCorps(corps: string | undefined): number {
  const i = CORPS_ORDRE.indexOf(corps ?? "divers");
  return i < 0 ? CORPS_ORDRE.length : i;
}

/** Trie une liste de questions custom par chronologie des travaux, puis par ordre de création. */
export function trierQuestionsParCorps<T extends { corps: string; ordre: number }>(qs: T[]): T[] {
  return [...qs].sort((a, b) => rangCorps(a.corps) - rangCorps(b.corps) || a.ordre - b.ordre);
}

/**
 * Ordre effectif des blocs d'une section : on part de l'ordre sauvegardé (glisser-déposer),
 * puis on complète avec les blocs jamais déplacés en respectant leur ordre naturel.
 * `naturel` = ids des blocs intégrés dans l'ordre du JSX + `q:<id>` des questions custom
 * (déjà triées par corps pour le défaut chronologique).
 */
export function ordreEffectif(saved: string[] | undefined, naturel: string[]): string[] {
  const present = new Set(naturel);
  const res = (saved ?? []).filter((id) => present.has(id));
  const vus = new Set(res);
  for (const id of naturel) if (!vus.has(id)) res.push(id);
  return res;
}

// Réponses : clé = id de question personnalisée (valeur/liste/nombre) OU id d'option ajoutée (booléen)
export type CustomAnswers = Record<string, string | string[] | number | boolean>;

export type CustomLine = { corps: string; poste: string; montant: number };

const coutOption = (o: CustomOption, surface: number): number =>
  o.mode === "m2" ? Math.round(o.prix * surface) : Math.round(o.prix);

/**
 * Lignes de chiffrage d'UNE question personnalisée pour UNE réponse donnée.
 * Logique de prix unique, partagée par les questions de section et les options SDB.
 * `surfaceM2` = surface de référence pour le mode €/m² (logement pour les sections, SDB pour les salles de bain).
 */
function lignesPourQuestion(
  q: CustomQuestion,
  rep: string | string[] | number | boolean | undefined,
  surfaceM2: number,
  corps: string,
  suffixe = ""
): CustomLine[] {
  if (rep == null) return [];
  const lignes: CustomLine[] = [];
  if (q.type === "nombre") {
    const n = Number(rep);
    const o = q.options[0];
    if (o && n > 0 && o.prix > 0) lignes.push({ corps, poste: `${q.label} (${n} ${o.label})${suffixe}`, montant: Math.round(o.prix * n) });
  } else if (q.type === "unique") {
    const o = q.options.find((x) => x.id === rep);
    if (o && o.prix > 0) lignes.push({ corps, poste: `${q.label} — ${o.label}${suffixe}`, montant: coutOption(o, surfaceM2) });
  } else if (q.type === "multiple") {
    for (const id of Array.isArray(rep) ? rep : []) {
      const o = q.options.find((x) => x.id === id);
      if (o && o.prix > 0) lignes.push({ corps, poste: `${q.label} — ${o.label}${suffixe}`, montant: coutOption(o, surfaceM2) });
    }
  }
  return lignes;
}

/** Lignes de chiffrage issues des personnalisations (questions ajoutées + options ajoutées aux questions intégrées). */
export function computeCustomLines(
  config: FormConfig | undefined,
  answers: CustomAnswers | undefined,
  surface: number
): CustomLine[] {
  if (!config || !answers) return [];
  const lignes: CustomLine[] = [];

  // 1. Questions personnalisées (standalone)
  for (const q of config.questions) lignes.push(...lignesPourQuestion(q, answers[q.id], surface, q.corps));

  // 2. Options ajoutées aux questions intégrées (toggles)
  for (const [label, bc] of Object.entries(config.builtin)) {
    const nom = bc.labelOverride || label;
    for (const o of bc.added) {
      if (answers[o.id] && o.prix > 0)
        lignes.push({ corps: bc.corps || "divers", poste: `${nom} — ${o.label}`, montant: coutOption(o, surface) });
    }
  }

  return lignes;
}

/**
 * Lignes de chiffrage des options SDB personnalisées, répétées par salle de bain.
 * `configs` = tableau des salles de bain (chacune avec ses réponses dans `custom`).
 * Le mode €/m² s'applique à la surface de LA salle de bain (pas du logement) ;
 * sans surface saisie, on retient 5 m² (SDB typique) pour ne pas chiffrer 0.
 */
export function computeSdbLines(
  sdbQuestions: CustomQuestion[] | undefined,
  configs: { surface?: number; custom?: Record<string, string | string[] | number> }[]
): CustomLine[] {
  if (!sdbQuestions || sdbQuestions.length === 0) return [];
  const lignes: CustomLine[] = [];
  configs.forEach((c, i) => {
    const rep = c.custom ?? {};
    const suffixe = configs.length > 1 ? ` (SDB #${i + 1})` : "";
    const surfaceSdb = c.surface && c.surface > 0 ? c.surface : 5;
    for (const q of sdbQuestions)
      lignes.push(...lignesPourQuestion(q, rep[q.id], surfaceSdb, "salle_de_bain", suffixe));
  });
  return lignes;
}

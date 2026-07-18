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

export type CustomQuestion = {
  id: string;
  section: 1 | 2 | 3;
  label: string;
  type: CustomType;
  corps: string;
  ordre: number;
  options: CustomOption[]; // nombre : une seule option = prix unitaire + nom d'unité
};

/** Personnalisation d'une question intégrée (repérée par son libellé). */
export type BuiltinCustom = {
  hidden: string[]; // valeurs d'options intégrées masquées
  added: CustomOption[]; // options ajoutées par l'utilisateur (toggles qui s'ajoutent au prix)
  corps?: string; // corps d'état pour le budget des options ajoutées
};

export type FormConfig = {
  questions: CustomQuestion[];
  builtin: Record<string, BuiltinCustom>;
};

export const CONFIG_VIDE: FormConfig = { questions: [], builtin: {} };

// Réponses : clé = id de question personnalisée (valeur/liste/nombre) OU id d'option ajoutée (booléen)
export type CustomAnswers = Record<string, string | string[] | number | boolean>;

export type CustomLine = { corps: string; poste: string; montant: number };

const coutOption = (o: CustomOption, surface: number): number =>
  o.mode === "m2" ? Math.round(o.prix * surface) : Math.round(o.prix);

/** Lignes de chiffrage issues des personnalisations (questions ajoutées + options ajoutées aux questions intégrées). */
export function computeCustomLines(
  config: FormConfig | undefined,
  answers: CustomAnswers | undefined,
  surface: number
): CustomLine[] {
  if (!config || !answers) return [];
  const lignes: CustomLine[] = [];

  // 1. Questions personnalisées (standalone)
  for (const q of config.questions) {
    const rep = answers[q.id];
    if (rep == null) continue;
    if (q.type === "nombre") {
      const n = Number(rep);
      const o = q.options[0];
      if (o && n > 0 && o.prix > 0) lignes.push({ corps: q.corps, poste: `${q.label} (${n} ${o.label})`, montant: Math.round(o.prix * n) });
    } else if (q.type === "unique") {
      const o = q.options.find((x) => x.id === rep);
      if (o && o.prix > 0) lignes.push({ corps: q.corps, poste: `${q.label} — ${o.label}`, montant: coutOption(o, surface) });
    } else if (q.type === "multiple") {
      for (const id of Array.isArray(rep) ? rep : []) {
        const o = q.options.find((x) => x.id === id);
        if (o && o.prix > 0) lignes.push({ corps: q.corps, poste: `${q.label} — ${o.label}`, montant: coutOption(o, surface) });
      }
    }
  }

  // 2. Options ajoutées aux questions intégrées (toggles)
  for (const [label, bc] of Object.entries(config.builtin)) {
    for (const o of bc.added) {
      if (answers[o.id] && o.prix > 0)
        lignes.push({ corps: bc.corps || "divers", poste: `${label} — ${o.label}`, montant: coutOption(o, surface) });
    }
  }

  return lignes;
}

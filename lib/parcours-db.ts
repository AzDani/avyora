/**
 * Parcours data-driven — accès Supabase (serveur uniquement).
 * Lecture de l'arbre (rendu / admin) via le client scopé (form_* = lecture publique RLS),
 * écriture via service_role (tables globales sans policy write). Remplace l'accès SQLite.
 */
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ParcoursDef,
  StepDef,
  GroupDef,
  QuestionDef,
  OptionDef,
  QuestionType,
  QuestionConfig,
} from "./parcours-schema";

/** Charge l'arbre complet d'un parcours par type de projet (éléments actifs, non archivés). */
export async function getParcours(typeProjet: "renovation" | "neuf"): Promise<ParcoursDef | null> {
  const sb = await supabaseServer();
  const { data: p } = await sb
    .from("form_parcours")
    .select("id, cle, titre, type_projet, version")
    .eq("type_projet", typeProjet)
    .eq("actif", true)
    .eq("archived", false)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!p) return null;

  // 4 requêtes batch (steps → groups → questions → options), assemblage en mémoire.
  const { data: steps = [] } = await sb.from("form_steps").select("*").eq("parcours_id", p.id).eq("archived", false).order("ordre");
  const stepIds = (steps ?? []).map((s) => s.id);
  const { data: groups = [] } = stepIds.length
    ? await sb.from("form_groups").select("*").in("step_id", stepIds).eq("archived", false).order("ordre")
    : { data: [] };
  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: questions = [] } = groupIds.length
    ? await sb.from("form_questions").select("*").in("group_id", groupIds).eq("archived", false).order("ordre")
    : { data: [] };
  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: options = [] } = questionIds.length
    ? await sb.from("form_options").select("*").in("question_id", questionIds).eq("archived", false).order("ordre")
    : { data: [] };

  const optsByQ = new Map<string, OptionDef[]>();
  for (const o of options ?? []) {
    const arr = optsByQ.get(o.question_id) ?? [];
    arr.push({
      id: o.id, label: o.label, valeur: o.valeur ?? undefined, hint: o.hint ?? undefined,
      ordre: o.ordre, impactPrix: o.impact_prix || undefined, mode: (o.mode as OptionDef["mode"]) ?? "forfait",
    });
    optsByQ.set(o.question_id, arr);
  }
  const qsByGroup = new Map<string, QuestionDef[]>();
  for (const q of questions ?? []) {
    const arr = qsByGroup.get(q.group_id) ?? [];
    arr.push({
      id: q.id, cle: q.cle ?? undefined, titre: q.titre, description: q.description ?? undefined,
      aide: q.aide ?? undefined, type: q.type as QuestionType, obligatoire: !!q.obligatoire, ordre: q.ordre,
      binding: q.binding ?? undefined, corpsEtat: q.corps_etat ?? undefined, mediaUrl: q.media_url ?? undefined,
      config: q.config_json ? (q.config_json as QuestionConfig) : undefined,
      options: optsByQ.get(q.id) ?? [],
    });
    qsByGroup.set(q.group_id, arr);
  }
  const groupsByStep = new Map<string, GroupDef[]>();
  for (const g of groups ?? []) {
    const arr = groupsByStep.get(g.step_id) ?? [];
    arr.push({ id: g.id, titre: g.titre ?? undefined, description: g.description ?? undefined, ordre: g.ordre, questions: qsByGroup.get(g.id) ?? [] });
    groupsByStep.set(g.step_id, arr);
  }
  const stepDefs: StepDef[] = (steps ?? []).map((s) => ({
    id: s.id, cle: s.cle, titre: s.titre, description: s.description ?? undefined, ordre: s.ordre, groups: groupsByStep.get(s.id) ?? [],
  }));

  return { id: p.id, cle: p.cle, titre: p.titre, typeProjet: p.type_projet as "renovation" | "neuf", version: p.version, steps: stepDefs };
}

export async function getParcoursComplet() {
  const [renovation, neuf] = await Promise.all([getParcours("renovation"), getParcours("neuf")]);
  return { renovation, neuf };
}

/**
 * Remplace (idempotent) la définition d'un parcours par `def` : supprime l'ancien parcours de
 * même `cle` (cascade), puis insère tout l'arbre. Utilisé par le seed et l'import.
 */
export async function seedParcours(def: ParcoursDef) {
  const admin = supabaseAdmin();
  await admin.from("form_parcours").delete().eq("cle", def.cle);
  await admin.from("form_parcours").insert({
    id: def.id, cle: def.cle, titre: def.titre, type_projet: def.typeProjet, actif: true, version: def.version, archived: false,
  });

  const steps: Record<string, unknown>[] = [];
  const groups: Record<string, unknown>[] = [];
  const questions: Record<string, unknown>[] = [];
  const options: Record<string, unknown>[] = [];
  def.steps.forEach((s, si) => {
    steps.push({ id: s.id, parcours_id: def.id, cle: s.cle, titre: s.titre, description: s.description ?? null, ordre: s.ordre ?? si });
    s.groups.forEach((g, gi) => {
      groups.push({ id: g.id, step_id: s.id, titre: g.titre ?? null, description: g.description ?? null, ordre: g.ordre ?? gi });
      g.questions.forEach((q, qi) => {
        questions.push({
          id: q.id, group_id: g.id, cle: q.cle ?? null, titre: q.titre, description: q.description ?? null, aide: q.aide ?? null,
          type: q.type, obligatoire: !!q.obligatoire, ordre: q.ordre ?? qi, binding: q.binding ?? null, corps_etat: q.corpsEtat ?? null,
          media_url: q.mediaUrl ?? null, config_json: q.config ?? null,
        });
        q.options.forEach((o, oi) => {
          options.push({ id: o.id, question_id: q.id, label: o.label, valeur: o.valeur ?? null, hint: o.hint ?? null, ordre: o.ordre ?? oi, impact_prix: o.impactPrix ?? 0, mode: o.mode ?? "forfait" });
        });
      });
    });
  });
  if (steps.length) await admin.from("form_steps").insert(steps);
  if (groups.length) await admin.from("form_groups").insert(groups);
  if (questions.length) await admin.from("form_questions").insert(questions);
  if (options.length) await admin.from("form_options").insert(options);
}

// ────────────────────────────────────────────────────────────────────────────
// CRUD admin (form-builder). Une entité = step | group | question | option.
// ────────────────────────────────────────────────────────────────────────────
export type Entite = "step" | "group" | "question" | "option";

const TABLE: Record<Entite, string> = {
  step: "form_steps", group: "form_groups", question: "form_questions", option: "form_options",
};
const PARENT_COL: Record<Entite, string> = {
  step: "parcours_id", group: "step_id", question: "group_id", option: "question_id",
};
// Colonnes éditables par entité (whitelist — anti-injection, jamais l'utilisateur ne choisit la colonne).
const CHAMPS: Record<Entite, string[]> = {
  step: ["cle", "titre", "description"],
  group: ["titre", "description"],
  question: ["cle", "titre", "description", "aide", "type", "obligatoire", "binding", "corps_etat", "media_url", "config_json"],
  option: ["label", "valeur", "hint", "impact_prix", "mode"],
};

const uid = () => globalThis.crypto.randomUUID();

/** Ajoute une entité (ordre = max+1 parmi les frères) et renvoie son id. */
export async function ajouterEntite(entity: Entite, parentId: string): Promise<string> {
  const admin = supabaseAdmin();
  const id = uid();
  const { data: freres } = await admin.from(TABLE[entity]).select("ordre").eq(PARENT_COL[entity], parentId).order("ordre", { ascending: false }).limit(1);
  const ordre = ((freres?.[0]?.ordre as number) ?? -1) + 1;
  const rows: Record<Entite, Record<string, unknown>> = {
    step: { id, parcours_id: parentId, cle: `step_${ordre}`, titre: "Nouvelle étape", ordre },
    group: { id, step_id: parentId, titre: null, ordre },
    question: { id, group_id: parentId, titre: "Nouvelle question", type: "unique", ordre },
    option: { id, question_id: parentId, label: "Réponse", ordre },
  };
  await admin.from(TABLE[entity]).insert(rows[entity]);
  return id;
}

/** Met à jour les colonnes autorisées d'une entité. */
export async function majEntite(entity: Entite, id: string, patch: Record<string, unknown>) {
  const cols = CHAMPS[entity].filter((c) => c in patch);
  if (cols.length === 0) return;
  const update: Record<string, unknown> = {};
  for (const c of cols) {
    // config_json est jsonb en Postgres : on stocke l'objet directement (pas de string).
    update[c] = c === "config_json" && typeof patch[c] === "string" ? JSON.parse(patch[c] as string) : patch[c];
  }
  await supabaseAdmin().from(TABLE[entity]).update(update).eq("id", id);
}

/** Soft-delete / restauration. */
export async function archiverEntite(entity: Entite, id: string, archived: boolean) {
  await supabaseAdmin().from(TABLE[entity]).update({ archived }).eq("id", id);
}

/** Suppression définitive (depuis la corbeille). Cascade FK sur les enfants. */
export async function supprimerEntite(entity: Entite, id: string) {
  await supabaseAdmin().from(TABLE[entity]).delete().eq("id", id);
}

/** Déplace une entité (échange l'ordre avec le frère adjacent non archivé). */
export async function deplacerEntite(entity: Entite, id: string, sens: "up" | "down") {
  const admin = supabaseAdmin();
  const pc = PARENT_COL[entity];
  const { data: rowRaw } = await admin.from(TABLE[entity]).select("*").eq("id", id).maybeSingle();
  if (!rowRaw) return;
  const row = rowRaw as Record<string, unknown>;
  const parent = row[pc] as string;
  const ordre = row.ordre as number;
  const q = admin.from(TABLE[entity]).select("id, ordre").eq(pc, parent).eq("archived", false);
  const { data: voisins } = sens === "up"
    ? await q.lt("ordre", ordre).order("ordre", { ascending: false }).limit(1)
    : await q.gt("ordre", ordre).order("ordre", { ascending: true }).limit(1);
  const voisin = voisins?.[0] as { id: string; ordre: number } | undefined;
  if (!voisin) return;
  await admin.from(TABLE[entity]).update({ ordre: voisin.ordre }).eq("id", id);
  await admin.from(TABLE[entity]).update({ ordre }).eq("id", voisin.id);
}

/** Éléments archivés (corbeille admin). */
export async function corbeille() {
  const admin = supabaseAdmin();
  const lire = async (entity: Entite, libCol: string) => {
    const { data } = await admin.from(TABLE[entity]).select("*").eq("archived", true);
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { entity, id: row.id as string, libelle: (row[libCol] as string) || "(sans titre)" };
    });
  };
  const [s, g, q, o] = await Promise.all([lire("step", "titre"), lire("group", "titre"), lire("question", "titre"), lire("option", "label")]);
  return [...s, ...g, ...q, ...o];
}

/** Compte rapide (diagnostic / vérif seed). */
export async function compterParcours() {
  const admin = supabaseAdmin();
  const c = async (t: string) => {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [parcours, steps, groups, questions, options] = await Promise.all([
    c("form_parcours"), c("form_steps"), c("form_groups"), c("form_questions"), c("form_options"),
  ]);
  return { parcours, steps, groups, questions, options };
}

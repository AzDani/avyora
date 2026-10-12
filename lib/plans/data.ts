import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apercuDepuisEtat, type ApercuMur } from "@/lib/plans/apercu";
import { COLONNES_SESSION, type EtatPlan, type ResumePlan, type WorkflowPlan } from "@/lib/plans/schema";

/**
 * Couche d'accès « Mes plans » (table `floor_plans`, migration 0004).
 *
 * Tout passe par la session (RLS : le propriétaire seul), SAUF :
 *  - la création : `floor_plans` n'a aucune politique INSERT, la seule porte est la fonction
 *    `floor_plans_creer`, exécutable par le service role. La route lui passe la limite gratuite, que la
 *    base ne sait pas calculer ;
 *  - l'écriture des colonnes du SERVEUR (`apercu`, `workflow`, `schema_etat`, `contrat`, `contrat_at`) :
 *    la session n'a le droit UPDATE que sur `nom`, `etat`, `vue` et `resume` (0004). Une écriture qui
 *    touche l'état (donc la vignette et le type) ou le contrat passe par le service role, APRÈS avoir
 *    vérifié par la session que le plan est visible (RLS), et avec `owner_id` dans la même requête.
 *
 * Les erreurs Supabase ne remontent jamais telles quelles : `ErreurPlans` porte un message
 * générique, la route répond `{ code: "erreur" }`.
 */
export class ErreurPlans extends Error {
  constructor(public readonly etape: string) {
    super(`plans : échec (${etape})`);
  }
}

export const PLANS_LISTE_MAX = 100;

export type PlanCarte = {
  id: string;
  nom: string;
  workflow: WorkflowPlan;
  resume: ResumePlan | Record<string, never>;
  apercu: ApercuMur[] | null;
  revision: number;
  updated_at: string;
  estimations: number;
};

export type EstimationReliee = { id: string; nom: string; nature: "neuf" | "renovation"; created_at: string };

export type PlanComplet = {
  id: string;
  nom: string;
  workflow: WorkflowPlan;
  etat: EtatPlan;
  vue: Record<string, unknown> | null;
  resume: ResumePlan | Record<string, never>;
  revision: number;
  updated_at: string;
};

/** Nombre de plans du compte (sous RLS : les siens). */
export async function compterPlans(): Promise<number> {
  const sb = await supabaseServer();
  const { count, error } = await sb.from("floor_plans").select("id", { count: "exact", head: true });
  if (error) throw new ErreurPlans("compter");
  return count ?? 0;
}

/** Les cartes de « Mes plans » : JAMAIS l'état (la liste reste en kilo-octets). */
export async function listerPlans(): Promise<{ plans: PlanCarte[]; utilises: number }> {
  const sb = await supabaseServer();
  const { data, count, error } = await sb
    .from("floor_plans")
    .select("id, nom, workflow, resume, apercu, revision, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(PLANS_LISTE_MAX);
  if (error) throw new ErreurPlans("lister");
  const lignes = (data ?? []) as Omit<PlanCarte, "estimations">[];

  const parPlan = new Map<string, number>();
  if (lignes.length) {
    const { data: liens, error: e2 } = await sb
      .from("project_plans")
      .select("plan_id")
      .in("plan_id", lignes.map((l) => l.id));
    if (e2) throw new ErreurPlans("lister-estimations");
    for (const l of (liens ?? []) as { plan_id: string | null }[]) {
      if (l.plan_id) parPlan.set(l.plan_id, (parPlan.get(l.plan_id) ?? 0) + 1);
    }
  }
  return {
    plans: lignes.map((l) => ({
      id: l.id,
      nom: l.nom,
      workflow: l.workflow,
      resume: l.resume ?? {},
      apercu: l.apercu ?? null,
      revision: l.revision,
      updated_at: l.updated_at,
      estimations: parPlan.get(l.id) ?? 0,
    })),
    utilises: count ?? lignes.length,
  };
}

export async function lirePlan(id: string): Promise<PlanComplet | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("floor_plans")
    .select("id, nom, workflow, etat, vue, resume, revision, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ErreurPlans("lire");
  return (data as PlanComplet | null) ?? null;
}

/** Ce qu'il faut savoir d'un plan avant de l'écrire : son type et sa révision. */
export async function lireEntete(id: string): Promise<{ workflow: WorkflowPlan; revision: number } | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("floor_plans").select("workflow, revision").eq("id", id).maybeSingle();
  if (error) throw new ErreurPlans("entete");
  return (data as { workflow: WorkflowPlan; revision: number } | null) ?? null;
}

/** Les estimations nées de ce plan (liens `project_plans.plan_id`), les plus récentes d'abord. */
export async function estimationsDuPlan(planId: string): Promise<EstimationReliee[]> {
  const sb = await supabaseServer();
  const { data: liens, error } = await sb.from("project_plans").select("project_id").eq("plan_id", planId);
  if (error) throw new ErreurPlans("estimations-liens");
  const ids = [...new Set(((liens ?? []) as { project_id: string }[]).map((l) => l.project_id))];
  if (!ids.length) return [];
  const { data: projets, error: e2 } = await sb
    .from("projects")
    .select("id, nom, created_at, nature:reponses->ctx->>nature")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (e2) throw new ErreurPlans("estimations-projets");
  return ((projets ?? []) as { id: string; nom: string; created_at: string; nature: unknown }[]).map((p) => ({
    id: p.id,
    nom: p.nom,
    nature: p.nature === "neuf" ? "neuf" : "renovation",
    created_at: p.created_at,
  }));
}

export type CreationPlan =
  | { ok: true; id: string; revision: number; deja: boolean }
  | { ok: false; code: "limite_gratuite" | "plafond" };

/**
 * Création par la fonction SQL (service role). `limite` : 1 en gratuit, null en Pro. Un plan local
 * déjà repris (même `editeurId`) est rendu tel quel (`deja`), sans doublon ni décompte.
 */
export async function creerPlan(
  ownerId: string,
  limite: number | null,
  input: {
    nom: string;
    etat: EtatPlan;
    vue?: Record<string, unknown>;
    resume?: ResumePlan | null;
    editeurId?: string;
  },
): Promise<CreationPlan> {
  const { data, error } = await supabaseAdmin().rpc("floor_plans_creer", {
    p_owner: ownerId,
    p_limite: limite,
    p_nom: input.nom,
    p_workflow: input.etat.workflow,
    p_etat: input.etat,
    p_vue: input.vue ?? null,
    p_resume: input.resume ?? {},
    p_apercu: apercuDepuisEtat(input.etat),
    p_schema: input.etat.schema,
    p_editeur_id: input.editeurId ?? null,
  });
  if (error) {
    const m = String(error.message ?? "");
    if (m.includes("limite_gratuite")) return { ok: false, code: "limite_gratuite" };
    if (m.includes("plafond_plans")) return { ok: false, code: "plafond" };
    throw new ErreurPlans("creer");
  }
  const ligne = (Array.isArray(data) ? data[0] : data) as
    | { plan_id: string; plan_revision: number; deja: boolean }
    | null
    | undefined;
  if (!ligne?.plan_id) throw new ErreurPlans("creer-retour");
  return { ok: true, id: ligne.plan_id, revision: ligne.plan_revision, deja: !!ligne.deja };
}

export type MajPlan =
  | { ok: true; revision: number }
  | { ok: false; code: "introuvable" }
  | { ok: false; code: "conflit"; revision: number };

/**
 * Mise à jour sous verrou optimiste : `update … where id and revision = attendue returning revision`.
 * 0 ligne → on relit : absent (ou d'un autre compte) → introuvable, sinon conflit avec la révision
 * du serveur. `force` écrit sans condition (le client a gardé l'autre version en copie).
 * La révision n'est jamais écrite ici : le trigger la tient (elle n'avance que si le dessin change).
 *
 * Nom, vue ou résumé seuls : la session écrit (RLS). Dès que l'état ou le contrat change, il faut aussi
 * écrire des colonnes du serveur (vignette, type, version de schéma, contrat) : la session vérifie
 * d'abord qu'elle voit le plan, puis le service role écrit TOUT en une requête (atomique), filtrée par
 * `id`, `owner_id` ET la révision attendue.
 */
export async function majPlan(
  ownerId: string,
  id: string,
  attendue: number,
  patch: {
    nom?: string;
    etat?: EtatPlan;
    vue?: Record<string, unknown>;
    resume?: ResumePlan | null;
    contrat?: unknown;
  },
  force = false,
): Promise<MajPlan> {
  /* Ce que la session écrit : les seules colonnes de son `grant update (…)` (0004), par construction. */
  const ligne: Record<string, unknown> = {};
  for (const c of COLONNES_SESSION) {
    if (patch[c] === undefined) continue;
    ligne[c] = c === "resume" ? (patch.resume ?? {}) : patch[c];
  }
  const serveur: Record<string, unknown> = {};
  if (patch.etat !== undefined) {
    serveur.workflow = patch.etat.workflow;
    serveur.schema_etat = patch.etat.schema;
    serveur.apercu = apercuDepuisEtat(patch.etat);
  }
  if (patch.contrat !== undefined) {
    serveur.contrat = patch.contrat;
    serveur.contrat_at = new Date().toISOString();
  }

  if (!Object.keys(serveur).length) {
    const sb = await supabaseServer();
    let q = sb.from("floor_plans").update(ligne).eq("id", id);
    if (!force) q = q.eq("revision", attendue);
    const { data, error } = await q.select("revision");
    if (error) throw new ErreurPlans("maj");
    const r = (data ?? []) as { revision: number }[];
    if (r.length) return { ok: true, revision: r[0].revision };
    const entete = await lireEntete(id);
    if (!entete) return { ok: false, code: "introuvable" };
    return { ok: false, code: "conflit", revision: entete.revision };
  }

  /* 1. La session voit-elle ce plan ? (RLS : son propriétaire seul.) Sinon 404, sans rien écrire. */
  const entete = await lireEntete(id);
  if (!entete) return { ok: false, code: "introuvable" };
  if (!force && entete.revision !== attendue) return { ok: false, code: "conflit", revision: entete.revision };

  /* 2. Le service role écrit tout d'un coup, borné au propriétaire et à la révision attendue. */
  let q = supabaseAdmin()
    .from("floor_plans")
    .update({ ...ligne, ...serveur })
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (!force) q = q.eq("revision", attendue);
  const { data, error } = await q.select("revision");
  if (error) throw new ErreurPlans("maj-serveur");
  const r = (data ?? []) as { revision: number }[];
  if (r.length) return { ok: true, revision: r[0].revision };

  /* 0 ligne : un autre appareil a écrit entre les deux, ou le plan vient d'être supprimé. */
  const apres = await lireEntete(id);
  if (!apres) return { ok: false, code: "introuvable" };
  return { ok: false, code: "conflit", revision: apres.revision };
}

/** Suppression sous RLS. Les liens `project_plans.plan_id` repassent à null (clé étrangère). */
export async function supprimerPlan(id: string): Promise<boolean> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("floor_plans").delete().eq("id", id).select("id");
  if (error) throw new ErreurPlans("supprimer");
  return ((data ?? []) as unknown[]).length > 0;
}

/* ─── C8 : le lien estimation → plan, affiché sur la fiche et dans « Mes projets » ───────────── */

/** Un projet relié à un plan du compte (`project_plans.plan_id`), tel que la fiche et la liste l'affichent. */
export type LienPlan = {
  projectId: string;
  planId: string;
  nom: string;
  /** `floor_plans.updated_at` : la dernière écriture du plan. */
  planMaj: string;
  /** `project_plans.updated_at` : la pose du lien, ou le dernier cliché de la rénovation (C7). */
  lienMaj: string;
};

/** Ids par requête : un `in (…)` de 100 uuid garde l'adresse PostgREST sous 4 Ko. */
export const LIENS_PAR_REQUETE = 100;

/** Une seule requête, sous RLS : le lien et, par la clé étrangère, le nom et la date du plan. */
const COLONNES_LIEN = "project_id, plan_id, updated_at, plan:floor_plans(nom, updated_at)";

type LigneLien = {
  project_id: string;
  plan_id: string | null;
  updated_at: string;
  plan: { nom: string | null; updated_at: string } | { nom: string | null; updated_at: string }[] | null;
};

/**
 * Une ligne `project_plans` → le lien affichable, ou null :
 *  - `plan_id` null : le plan a été supprimé (`on delete set null`) ;
 *  - plan absent de la jointure : il n'est pas visible par la session (la RLS de `floor_plans` le réserve à
 *    son propriétaire ; un membre du projet ne voit donc pas le plan du propriétaire).
 */
function versLien(l: LigneLien): LienPlan | null {
  if (!l || typeof l.project_id !== "string" || typeof l.plan_id !== "string") return null;
  const plan = Array.isArray(l.plan) ? l.plan[0] : l.plan;
  if (!plan || typeof plan.updated_at !== "string") return null;
  return {
    projectId: l.project_id,
    planId: l.plan_id,
    nom: (plan.nom ?? "").trim() || "Plan",
    planMaj: plan.updated_at,
    lienMaj: typeof l.updated_at === "string" ? l.updated_at : plan.updated_at,
  };
}

/** Le plan dont ce projet est né, ou null (aucun lien, plan supprimé ou invisible). */
export async function planDuProjet(projectId: string): Promise<LienPlan | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("project_plans").select(COLONNES_LIEN).eq("project_id", projectId).maybeSingle();
  if (error) throw new ErreurPlans("lien-projet");
  return data ? versLien(data as unknown as LigneLien) : null;
}

/**
 * Les plans de plusieurs projets. Clé : l'id du projet. Une requête par tranche de
 * `LIENS_PAR_REQUETE` projets (une seule pour un compte ordinaire) ; aucune sans projet.
 */
export async function plansDesProjets(ids: string[]): Promise<Map<string, LienPlan>> {
  const out = new Map<string, LienPlan>();
  const uniques = [...new Set(ids.map(String))];
  if (!uniques.length) return out;
  const sb = await supabaseServer();
  const tranches: string[][] = [];
  for (let i = 0; i < uniques.length; i += LIENS_PAR_REQUETE) tranches.push(uniques.slice(i, i + LIENS_PAR_REQUETE));
  const reponses = await Promise.all(tranches.map((t) => sb.from("project_plans").select(COLONNES_LIEN).in("project_id", t)));
  for (const { data, error } of reponses) {
    if (error) throw new ErreurPlans("liens-projets");
    for (const l of (data ?? []) as unknown as LigneLien[]) {
      const lien = versLien(l);
      if (lien) out.set(lien.projectId, lien);
    }
  }
  return out;
}

/**
 * Le plan a-t-il été modifié depuis le lien (ou le dernier cliché de la rénovation) ? Le trigger de
 * `floor_plans` avance `updated_at` à chaque écriture ; l'éditeur n'écrit que si le dessin a changé.
 */
export function planAChange(lien: Pick<LienPlan, "planMaj" | "lienMaj">): boolean {
  const p = Date.parse(lien.planMaj), l = Date.parse(lien.lienMaj);
  return Number.isFinite(p) && Number.isFinite(l) && p > l;
}

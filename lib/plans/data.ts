import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apercuDepuisEtat, type ApercuMur } from "@/lib/plans/apercu";
import type { EtatPlan, ResumePlan, WorkflowPlan } from "@/lib/plans/schema";

/**
 * Couche d'accès « Mes plans » (table `floor_plans`, migration 0004).
 *
 * Tout passe par la session (RLS : le propriétaire seul), SAUF la création : `floor_plans` n'a
 * aucune politique INSERT, la seule porte est la fonction `floor_plans_creer`, exécutable par le
 * service role. La route lui passe la limite gratuite, que la base ne sait pas calculer.
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
 */
export async function majPlan(
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
  const ligne: Record<string, unknown> = {};
  if (patch.nom !== undefined) ligne.nom = patch.nom;
  if (patch.etat !== undefined) {
    ligne.etat = patch.etat;
    ligne.workflow = patch.etat.workflow;
    ligne.schema_etat = patch.etat.schema;
    ligne.apercu = apercuDepuisEtat(patch.etat);
  }
  if (patch.vue !== undefined) ligne.vue = patch.vue;
  if (patch.resume !== undefined) ligne.resume = patch.resume ?? {};
  if (patch.contrat !== undefined) {
    ligne.contrat = patch.contrat;
    ligne.contrat_at = new Date().toISOString();
  }

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

/** Suppression sous RLS. Les liens `project_plans.plan_id` repassent à null (clé étrangère). */
export async function supprimerPlan(id: string): Promise<boolean> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("floor_plans").delete().eq("id", id).select("id");
  if (error) throw new ErreurPlans("supprimer");
  return ((data ?? []) as unknown[]).length > 0;
}

import type { supabaseServer } from "@/lib/supabase/server";
import { journaliser } from "@/lib/audit";
import { editeurIdSchema, planIdSchema } from "@/lib/plans/schema";
import { RE_CONTRAT, type OrigineReliable } from "@/lib/plans/origine";

/**
 * Relier une estimation neuve à son plan (« Mes plans », chantier C6) : une ligne `project_plans`
 * `{project_id, plan_id}`, posée UNIQUEMENT par ce module (et, en C7, par le chemin de la rénovation).
 *
 * Tout passe par la SESSION : la RLS de 0004 ne laisse voir que les plans du compte, et n'autorise
 * l'écriture d'un lien que si le projet ET le plan appartiennent à l'utilisateur. Un `planId` d'un
 * autre compte ne résout donc rien : 0 ligne, et le projet reste créé.
 *
 * Ces fonctions NE LÈVENT JAMAIS : un échec est journalisé (`plan_lien_echoue`) et l'appelant
 * continue (le projet est déjà enregistré, le lien est un plus).
 */
type Sb = Awaited<ReturnType<typeof supabaseServer>>;

/** Version du contrat quand l'origine n'en porte pas (`workflow` existe à partir de 1.18). */
export const VERSION_CONTRAT_DEFAUT = "1.18.0";
/** Au plus tant d'estimations orphelines reliées d'un coup (un compte normal en a une ou deux). */
export const ORPHELINES_MAX = 50;

type PlanResolu = { id: string; nom: string | null };

async function echec(etape: string, payload: Record<string, unknown>): Promise<void> {
  await journaliser("plan_lien_echoue", { payload: { etape, ...payload } });
}

/** Le plan désigné par l'origine, sous RLS (les plans du compte seulement). `null` si aucun. */
async function resoudrePlan(sb: Sb, origine: OrigineReliable): Promise<PlanResolu | null> {
  const id = planIdSchema.safeParse(origine.planId);
  if (id.success) {
    const { data, error } = await sb.from("floor_plans").select("id, nom").eq("id", id.data.toLowerCase()).maybeSingle();
    if (error) throw new Error("resoudre-id");
    if (data) return data as PlanResolu;
  }
  const local = editeurIdSchema.safeParse(origine.planLocal);
  if (local.success) {
    const { data, error } = await sb.from("floor_plans").select("id, nom").eq("editeur_id", local.data).maybeSingle();
    if (error) throw new Error("resoudre-local");
    if (data) return data as PlanResolu;
  }
  return null;
}

/**
 * Après `POST /api/projects` : relie le projet créé au plan de son origine. Un lien déjà posé pour ce
 * projet n'est jamais remplacé (`onConflict: project_id`, ignoré). Rend `true` si une ligne est posée.
 */
export async function relierAuPlan(sb: Sb, projectId: string, origine: OrigineReliable): Promise<boolean> {
  try {
    const plan = await resoudrePlan(sb, origine);
    if (!plan) return false;
    const { data, error } = await sb
      .from("project_plans")
      .upsert(
        {
          project_id: projectId,
          plan_id: plan.id,
          version: origine.contrat ?? VERSION_CONTRAT_DEFAUT,
          contrat: null,
          nom: plan.nom ? plan.nom.slice(0, 200) : null,
        },
        { onConflict: "project_id", ignoreDuplicates: true },
      )
      .select("project_id");
    if (error) {
      await echec("relier", { projectId, planId: plan.id });
      return false;
    }
    return ((data ?? []) as unknown[]).length > 0;
  } catch (e) {
    await echec(e instanceof Error ? e.message : "relier", { projectId });
    return false;
  }
}

/**
 * Quand un plan local est repris dans le compte (`POST /api/plans` avec `editeurId`) : les estimations
 * de l'utilisateur nées de ce plan local (`reponses.origine.planLocal = editeurId`) et encore sans lien
 * sont reliées. C'est l'ordre « estimation réclamée avant le plan ». Rend le nombre de liens posés.
 */
export async function relierEstimationsOrphelines(sb: Sb, userId: string, planId: string, editeurId: string): Promise<number> {
  try {
    const local = editeurIdSchema.safeParse(editeurId);
    if (!local.success) return 0;
    const { data: plan, error: e0 } = await sb.from("floor_plans").select("id, nom").eq("id", planId).maybeSingle();
    if (e0) throw new Error("orphelines-plan");
    if (!plan) return 0;
    const p = plan as PlanResolu;

    const { data: projets, error: e1 } = await sb
      .from("projects")
      .select("id, contrat:reponses->origine->>contrat")
      .eq("owner_id", userId)
      .eq("reponses->ctx->>nature", "neuf")
      .eq("reponses->origine->>source", "plan")
      .eq("reponses->origine->>planLocal", local.data)
      .limit(ORPHELINES_MAX);
    if (e1) throw new Error("orphelines-projets");
    const lignes = (projets ?? []) as { id: string; contrat: unknown }[];
    if (!lignes.length) return 0;

    const { data: liens, error: e2 } = await sb
      .from("project_plans")
      .select("project_id")
      .in("project_id", lignes.map((l) => l.id));
    if (e2) throw new Error("orphelines-liens");
    const relies = new Set(((liens ?? []) as { project_id: string }[]).map((l) => l.project_id));
    const orphelins = lignes.filter((l) => !relies.has(l.id));
    if (!orphelins.length) return 0;

    const { data, error } = await sb
      .from("project_plans")
      .upsert(
        orphelins.map((l) => ({
          project_id: l.id,
          plan_id: p.id,
          version: typeof l.contrat === "string" && RE_CONTRAT.test(l.contrat) ? l.contrat : VERSION_CONTRAT_DEFAUT,
          contrat: null,
          nom: p.nom ? p.nom.slice(0, 200) : null,
        })),
        { onConflict: "project_id", ignoreDuplicates: true },
      )
      .select("project_id");
    if (error) throw new Error("orphelines-relier");
    return ((data ?? []) as unknown[]).length;
  } catch (e) {
    await echec(e instanceof Error ? e.message : "orphelines", { planId });
    return 0;
  }
}

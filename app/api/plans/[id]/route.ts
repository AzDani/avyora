import { FEATURES } from "@/lib/features";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { MAJEURE_CONTRAT_PLAN, planImportSchema } from "@/lib/validation";
import { estimationsDuPlan, lireEntete, lirePlan, majPlan, supprimerPlan } from "@/lib/plans/data";
import { PLAN_CONTRAT_OCTETS_MAX, PLAN_CORPS_MAX, planIdSchema, planMajSchema } from "@/lib/plans/schema";
import { octetsJsonb } from "@/lib/plans/jsonb";
import { problemeProfond } from "@/lib/plans/schema";
import { eteinte, erreur, lireCorpsBorne, repondre, type CodePlans } from "@/lib/plans/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Un identifiant qui n'est pas un uuid : 404, comme un plan absent ou d'un autre compte. */
async function idValide(ctx: Ctx): Promise<string | null> {
  const { id } = await ctx.params;
  return planIdSchema.safeParse(id).success ? id : null;
}

/** Le plan complet (état compris), et les estimations nées de lui. */
export async function GET(_req: Request, ctx: Ctx) {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    const id = await idValide(ctx);
    if (!id) return erreur("introuvable");
    const plan = await lirePlan(id);
    if (!plan) return erreur("introuvable");
    return repondre({ ...plan, estimations: await estimationsDuPlan(id) });
  } catch {
    return erreur("erreur");
  }
}

/**
 * Le contrat d'une estimation de rénovation : même contrôle que l'import, puis la taille telle que
 * Postgres la mesure (CHECK floor_plans_contrat_taille), puis (dans la route) même type de plan.
 */
function codeContrat(contrat: unknown): CodePlans | null {
  /* la même garde profonde que l'état (clés interdites, longueur des chaînes, profondeur), avant tout le reste :
     le contrat est recopié dans project_plans, que les membres du projet lisent */
  if (problemeProfond(contrat)) return "contrat_invalide";
  if (planImportSchema.safeParse(contrat).success) {
    const n = octetsJsonb(contrat);
    if (n === Infinity) return "contrat_invalide"; /* caractère nul, moitié de paire UTF-16 */
    return n > PLAN_CONTRAT_OCTETS_MAX ? "trop_volumineux" : null;
  }
  const c = (contrat as { contrat?: unknown } | null)?.contrat;
  if (typeof c === "string" && /^\d+\.\d+\.\d+$/.test(c) && Number(c.split(".")[0]) !== MAJEURE_CONTRAT_PLAN) {
    return "contrat_version";
  }
  return "contrat_invalide";
}

/**
 * Sauvegarde sous verrou optimiste : `revision` est celle que le client a lue. Périmée → 409
 * `{ code: "conflit", revision }`, que l'éditeur montre dans sa fenêtre de conflit.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    const id = await idValide(ctx);
    if (!id) return erreur("introuvable");
    if (!(await verifierLimite("plan", user.id))) return erreur("trop_de_requetes");

    const corps = await lireCorpsBorne(req, PLAN_CORPS_MAX);
    if (!corps.ok) return corps.res;
    const v = planMajSchema.safeParse(corps.data);
    if (!v.success) return erreur("invalide");
    const { revision, force, nom, etat, vue, resume, contrat } = v.data;
    if (nom === undefined && etat === undefined && vue === undefined && resume === undefined && contrat === undefined) {
      return erreur("invalide");
    }

    /* D68 : hors Pro, ni contrat de rénovation, ni PASSAGE d'un plan en rénovation. Un plan déjà en rénovation
       (Pro redevenu gratuit) reste modifiable : rien n'est retiré. */
    if (!estPro(user) && (contrat !== undefined || etat?.workflow === "renovation")) {
      /* l'existence d'abord : le plan d'un autre compte reste un 404, comme ailleurs */
      const entete = await lireEntete(id);
      if (!entete) return erreur("introuvable");
      if (contrat !== undefined || entete.workflow !== "renovation") return erreur("pro_requis");
    }

    if (contrat !== undefined) {
      const code = codeContrat(contrat);
      if (code) return erreur(code);
      const workflow = etat?.workflow ?? (await lireEntete(id))?.workflow;
      if (!workflow) return erreur("introuvable");
      if ((contrat as { workflow?: unknown }).workflow !== workflow) return erreur("contrat_workflow");
    }

    const r = await majPlan(user.id, id, revision, { nom, etat, vue, resume, contrat }, force === true);
    if (r.ok) return repondre({ revision: r.revision });
    if (r.code === "conflit") return erreur("conflit", { revision: r.revision });
    return erreur("introuvable");
  } catch {
    return erreur("erreur");
  }
}

/** Suppression. L'« Annuler » de 8 s de l'éditeur reste côté client : cet appel part à l'expiration. */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    const id = await idValide(ctx);
    if (!id) return erreur("introuvable");
    if (!(await verifierLimite("plan", user.id))) return erreur("trop_de_requetes");
    if (!(await supprimerPlan(id))) return erreur("introuvable");
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return erreur("erreur");
  }
}

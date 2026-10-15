import { FEATURES } from "@/lib/features";
import { getUser, estPro, limitePlans } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { creerPlan, listerPlans } from "@/lib/plans/data";
import { PLAN_CORPS_MAX, planCreerSchema } from "@/lib/plans/schema";
import { eteinte, erreur, lireCorpsBorne, repondre } from "@/lib/plans/http";
import { lienEchoue, relierEstimationsOrphelines } from "@/lib/plans/relier";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Les cartes de « Mes plans », sans l'état. */
export async function GET() {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    const { plans, utilises } = await listerPlans();
    return repondre({ plans, limite: estPro(user) ? null : 1, utilises });
  } catch {
    return erreur("erreur");
  }
}

/**
 * Range un plan dans le compte. La limite est tenue par la fonction SQL (seule autorité, sous verrou) : la
 * route lui passe `limitePlans` (1 en gratuit, null pour un abonné, 30 pour un inscrit de la bêta). Celle de la
 * bêta atteinte, la réponse est « plafond » (409) et non « limite gratuite » (402) : l'éditeur, qui le traite
 * en Pro, dit « Ton compte a atteint le nombre maximal de plans », sans proposer de passer Pro.
 */
export async function POST(req: Request) {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    if (!(await verifierLimite("planCreation", user.id))) return erreur("trop_de_requetes");

    const corps = await lireCorpsBorne(req, PLAN_CORPS_MAX);
    if (!corps.ok) return corps.res;
    const v = planCreerSchema.safeParse(corps.data);
    if (!v.success) return erreur("invalide");
    const { nom, etat, vue, resume, editeurId } = v.data;
    /* D68 : le Projet rénovation est réservé à Pro, côté serveur aussi */
    if (etat.workflow === "renovation" && !estPro(user)) return erreur("pro_requis");

    const limite = limitePlans(user);
    const r = await creerPlan(user.id, limite, { nom, etat, vue, resume, editeurId });
    if (!r.ok) return erreur(r.code === "limite_gratuite" && limite !== 1 ? "plafond" : r.code);
    /* Le plan est créé : plus rien ne peut changer la réponse (201). */
    if (editeurId) await relierOrphelines(user.id, r.id, editeurId);
    return repondre({ id: r.id, revision: r.revision, deja: r.deja }, 201);
  } catch {
    return erreur("erreur");
  }
}

/**
 * Plan local repris : les estimations déjà réclamées pour ce plan local (ordre « estimation avant le
 * plan ») lui sont reliées. NE LÈVE JAMAIS, même si la session elle-même ne peut pas être ouverte :
 * l'échec est journalisé, et la création reste une 201 (sinon le client réessaierait un plan déjà créé).
 */
async function relierOrphelines(userId: string, planId: string, editeurId: string): Promise<void> {
  try {
    await relierEstimationsOrphelines(await supabaseServer(), userId, planId, editeurId);
  } catch {
    await lienEchoue("orphelines-session", userId, { planId });
  }
}

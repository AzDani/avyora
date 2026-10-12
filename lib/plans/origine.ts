/**
 * L'origine « plan » d'une estimation neuve (chantier C6) : les identifiants du plan d'où elle vient.
 *
 * Module PUR, sans zod ni Supabase : `lib/estimateur/brouillon-neuf.ts` (relu par `ClaimDraft` et
 * `EstimationRappel`) l'importe sans alourdir leur bundle.
 *
 * - `planId` : un plan du compte (uuid de `floor_plans.id`), lien `&pid=` de l'éditeur ;
 * - `planLocal` : un plan de l'appareil (id local de l'éditeur, `floor_plans.editeur_id` une fois repris),
 *   lien `&pl=`.
 * Le serveur ne fait jamais confiance à ces valeurs : il résout le plan sous RLS (les plans du compte
 * seulement), cf. `lib/plans/relier.ts`.
 */
import type { OrigineNeuf } from "../estimateur/brouillon-neuf";

/** uuid (forme générale) : le serveur revalide par `planIdSchema`. */
export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Id local de l'éditeur (`uid()`, base 36) : même forme que `editeurIdSchema` et la contrainte SQL. */
export const RE_PLAN_LOCAL = /^[a-z0-9]{1,24}$/;
/** Version du contrat de l'éditeur (`project_plans.version` : 16 caractères au plus). */
export const RE_CONTRAT = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

/**
 * Relit une origine (brouillon du navigateur, réponses d'un projet). Garde `source: "plan"`, et
 * `contrat`, `planId`, `planLocal` seulement s'ils sont bien formés. Tout autre objet → `undefined`.
 * `contrat` reste celui que l'éditeur a écrit (chaîne de 16 caractères au plus), comme avant C6.
 */
export function nettoyerOrigine(x: unknown): OrigineNeuf | undefined {
  if (!x || typeof x !== "object" || Array.isArray(x)) return undefined;
  const o = x as Record<string, unknown>;
  if (o.source !== "plan") return undefined;
  return {
    source: "plan",
    ...(typeof o.contrat === "string" && o.contrat.length <= 16 ? { contrat: o.contrat } : {}),
    ...(typeof o.planId === "string" && RE_UUID.test(o.planId) ? { planId: o.planId.toLowerCase() } : {}),
    ...(typeof o.planLocal === "string" && RE_PLAN_LOCAL.test(o.planLocal) ? { planLocal: o.planLocal } : {}),
  };
}

/** Une origine qui désigne un plan (et donc peut être reliée). */
export type OrigineReliable = { contrat?: string; planId?: string; planLocal?: string };

/**
 * Les réponses d'un projet venu d'un plan : `source === "plan"`, un projet NEUF (le lien d'un Plan
 * final ne mène qu'à la construction neuve), et au moins un identifiant bien formé. `null` sinon :
 * aucune requête `project_plans` ne part.
 */
export function origineDuPlan(reponses: unknown): OrigineReliable | null {
  if (!reponses || typeof reponses !== "object" || Array.isArray(reponses)) return null;
  const r = reponses as { ctx?: unknown; origine?: unknown };
  const ctx = r.ctx as { nature?: unknown } | null | undefined;
  if (!ctx || typeof ctx !== "object" || ctx.nature !== "neuf") return null;
  const o = nettoyerOrigine(r.origine);
  if (!o || (!o.planId && !o.planLocal)) return null;
  return {
    ...(o.contrat && RE_CONTRAT.test(o.contrat) ? { contrat: o.contrat } : {}),
    ...(o.planId ? { planId: o.planId } : {}),
    ...(o.planLocal ? { planLocal: o.planLocal } : {}),
  };
}

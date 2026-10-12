import { z } from "zod";
import { FEATURES } from "@/lib/features";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { getLocale } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";
import { planIdSchema } from "@/lib/plans/schema";
import { valider } from "@/lib/plans/estimation";
import { eteinte, erreur, lireCorpsBorne, repondre } from "@/lib/plans/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Le corps : le code postal (si le contrat n'en porte pas), l'estimation reliée à mettre à jour, ou `nouvelle`. */
const corpsSchema = z
  .object({
    codePostal: z.string().regex(/^\d{5}$/).optional(),
    projetId: planIdSchema.optional(),
    nouvelle: z.boolean().optional(),
  })
  .strict();
const CORPS_MAX = 2000;

/**
 * « Mes plans », C7 : l'utilisateur a relu l'écran de validation (`/projets/depuis-plan/[planId]`) et
 * valide. Rien de ce que l'écran a montré n'est repris : `valider` relit le contrat EN BASE et recalcule
 * tout. Réponse `{ projectId }` ; le client continue vers `/projets/{projectId}/modifier` (D1 : dernière
 * relecture dans le détaillé). Erreurs : des codes, jamais un message de la base.
 */
export async function POST(req: Request, ctx: Ctx) {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return erreur("connexion_requise");
    if (!estPro(user)) return erreur("pro_requis");
    if (!(await verifierLimite("plan", user.id))) return erreur("trop_de_requetes");

    const { id } = await ctx.params;
    if (!planIdSchema.safeParse(id).success) return erreur("introuvable");

    const corps = await lireCorpsBorne(req, CORPS_MAX);
    if (!corps.ok) return corps.res;
    const brut = corps.data as { codePostal?: unknown } | null;
    const v = corpsSchema.safeParse(corps.data);
    if (!v.success) {
      /* Un code postal mal formé a son propre code : l'écran le montre sous le champ. */
      const cp = brut && typeof brut === "object" ? brut.codePostal : undefined;
      if (cp !== undefined && (typeof cp !== "string" || !/^\d{5}$/.test(cp))) {
        return erreur("code_postal");
      }
      return erreur("invalide");
    }

    const r = await valider(await supabaseServer(), user, id.toLowerCase(), { ...v.data, locale: await getLocale() });
    if (!r.ok) return erreur(r.code);
    return repondre({ projectId: r.projectId, cree: r.cree }, r.cree ? 201 : 200);
  } catch {
    return erreur("erreur");
  }
}

import { FEATURES } from "@/lib/features";
import { getUser, estPro } from "@/lib/auth";
import { compterPlans } from "@/lib/plans/data";
import { eteinte, erreur, repondre } from "@/lib/plans/http";
import { betaActive, betaEditeurPlan } from "@/lib/beta";

export const runtime = "nodejs";

/**
 * Ce que l'éditeur doit savoir au démarrage : connecté ou non, Pro ou non, et où en est la limite
 * gratuite. Sert à l'AFFICHAGE seulement : chaque écriture refait le contrôle côté serveur.
 *
 * Bêta gratuite (lib/beta.ts) : `beta.prix` et `beta.passer` remplacent, dans l'éditeur, la phrase du prix de Pro
 * et le libellé « Passer Pro » (`betaEditeurPlan`, la page /plan est statique : c'est cette réponse, rendue à la
 * requête, qui sait si la bêta court). Hors bêta, le champ n'existe pas : la réponse d'avant, au caractère près.
 */
export async function GET() {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    const beta = betaActive() ? { beta: betaEditeurPlan() } : {};
    if (!user) return repondre({ connecte: false, pro: false, limite: 1, utilises: 0, ...beta });
    const pro = estPro(user);
    return repondre({ connecte: true, pro, limite: pro ? null : 1, utilises: await compterPlans(), ...beta });
  } catch {
    return erreur("erreur");
  }
}

import { FEATURES } from "@/lib/features";
import { getUser, estPro } from "@/lib/auth";
import { compterPlans } from "@/lib/plans/data";
import { eteinte, erreur, repondre } from "@/lib/plans/http";

export const runtime = "nodejs";

/**
 * Ce que l'éditeur doit savoir au démarrage : connecté ou non, Pro ou non, et où en est la limite
 * gratuite. Sert à l'AFFICHAGE seulement : chaque écriture refait le contrôle côté serveur.
 */
export async function GET() {
  if (!FEATURES.plans) return eteinte();
  try {
    const user = await getUser();
    if (!user) return repondre({ connecte: false, pro: false, limite: 1, utilises: 0 });
    const pro = estPro(user);
    return repondre({ connecte: true, pro, limite: pro ? null : 1, utilises: await compterPlans() });
  } catch {
    return erreur("erreur");
  }
}

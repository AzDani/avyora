import { FEATURES } from "@/lib/features";
import { editeurAdmin } from "@/lib/editeur/heberger";

/**
 * L'éditeur de plan en LECTURE SEULE pour l'admin (`/admin/plans/editeur?id=…`). Comme /plan, rendu au build et
 * servi tel quel : la page ne contient aucune donnée, le plan arrive par /api/admin/plans/[id] (réservé admin) et
 * l'éditeur tourne dans un bac à sable (voir `amorcageAdmin` dans lib/editeur/heberger.ts).
 */
export const dynamic = "force-static";

export async function GET() {
  if (!FEATURES.plans) return new Response("Not found", { status: 404 });
  return new Response(await editeurAdmin(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

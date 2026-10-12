import { FEATURES } from "@/lib/features";
import { editeurHeberge } from "@/lib/editeur/heberger";

/**
 * L'éditeur de plan en pleine page (C4). Rendu au BUILD et servi comme un fichier statique : le HTML
 * ne contient aucune donnée utilisateur (la session et le plan arrivent par fetch, voir l'amorçage dans
 * lib/editeur/heberger.ts). Sa CSP propre et son `X-Robots-Tag` sont posés par next.config.ts : une CSP
 * renvoyée ici serait ignorée (la config l'emporte).
 */
export const dynamic = "force-static";

export async function GET() {
  if (!FEATURES.plans) return new Response("Not found", { status: 404 });
  return new Response(await editeurHeberge(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

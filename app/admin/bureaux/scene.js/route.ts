import { getAdmin } from "@/lib/auth";
import { SCENE_JS } from "@/lib/bureaux/scene-fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le script de la scène 3D des bureaux virtuels, réservé à l'admin (27/11/2026). Il était dans public/, donc
 * téléchargeable par n'importe qui : il ne contenait aucune donnée, mais c'est notre travail, il ne sort plus.
 * L'adresse porte la version (?v=…) : le navigateur de l'admin peut le garder en cache, en privé.
 */
export async function GET() {
  if (!(await getAdmin())) return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(SCENE_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "private, max-age=31536000, immutable", "X-Robots-Tag": "noindex" } });
}

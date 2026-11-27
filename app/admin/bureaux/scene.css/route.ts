import { getAdmin } from "@/lib/auth";
import { SCENE_CSS } from "@/lib/bureaux/scene-fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La feuille de style de la scène 3D des bureaux virtuels, réservée à l'admin (voir scene.js/route.ts). */
export async function GET() {
  if (!(await getAdmin())) return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(SCENE_CSS, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "private, max-age=31536000, immutable", "X-Robots-Tag": "noindex" } });
}

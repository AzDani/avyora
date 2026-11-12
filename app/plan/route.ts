import { FEATURES } from "@/lib/features";
import { editeurHeberge } from "@/lib/editeur/heberger";

/**
 * L'éditeur de plan en pleine page (C4). Rendu au BUILD et servi comme un fichier statique : le HTML
 * ne contient aucune donnée utilisateur (la session et le plan arrivent par fetch, voir l'amorçage dans
 * lib/editeur/heberger.ts). Sa CSP propre et son `X-Robots-Tag` sont posés par next.config.ts : une CSP
 * renvoyée ici serait ignorée (la config l'emporte).
 *
 * L'éditeur demande un compte (décision de Dani du 12/11/2026) : la route étant statique, c'est le proxy (proxy.ts) qui
 * renvoie un visiteur sans session vers l'inscription, l'adresse voulue dans `next`. Les éléments de l'éditeur pour un
 * visiteur sans compte (invitation « Garde ce plan dans ton compte », « Compte gratuit ») restent dans la source, mais
 * ne s'affichent plus en pratique (seulement si la session tombe en cours de route).
 */
export const dynamic = "force-static";

export async function GET() {
  if (!FEATURES.plans) return new Response("Not found", { status: 404 });
  return new Response(await editeurHeberge(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { cheminPropre, empreinte, estRobot, geo, noterJournee, signaler } from "@/lib/presence";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signal de présence d'un onglet ouvert (public/presence.js), pour le compteur « en ligne » de l'admin. La route est
 * hors du proxy : un visiteur sans session ne coûte aucun appel à Supabase. Un membre connecté (cookie de session
 * présent) est reconnu par `getClaims()` (jeton vérifié) et compté sous son compte. Le corps est le chemin de la
 * page, en texte ; `?j=1` ajoute la trace de l'historique de la journée. Répond toujours 204 : un échec ne doit rien montrer au visiteur.
 */
async function membreConnecte(): Promise<string | undefined> {
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))) return undefined;
  const { data } = await (await supabaseServer()).auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" && sub ? sub : undefined;
}

export async function POST(req: Request) {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    const chemin = cheminPropre((await req.text()).slice(0, 300));
    if (chemin && !estRobot(ua)) {
      const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "inconnue";
      const sel = process.env.PRESENCE_SEL || process.env.SUPABASE_SERVICE_ROLE_KEY || "avyora";
      const userId = await membreConnecte().catch(() => undefined);
      const jour = aujourdhuiParis();
      const signal = { id: userId ? `u:${userId}` : empreinte(ip, ua ?? "", jour, sel), chemin, ...geo(h), ...(userId ? { userId } : {}) };
      // `?j=1` : le navigateur demande aussi la trace de la journée (arrivée sur une page, puis ≈ toutes les 2 min 30).
      const journee = new URL(req.url).searchParams.get("j") === "1";
      await Promise.all([signaler(signal), journee ? noterJournee(signal, jour) : null]);
    }
  } catch (e) {
    console.warn("[presence] signal perdu :", (e as Error).message);
  }
  return new NextResponse(null, { status: 204 });
}

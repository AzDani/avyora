import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { cheminPropre, empreinte, estRobot, signaler } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signal de présence d'un onglet ouvert (public/presence.js), pour le compteur « en ligne » de l'admin. Sans
 * cookie ni session : la route est hors du proxy (aucun `auth.getUser()` toutes les 30 s par visiteur). Le corps est
 * le chemin de la page, en texte. Répond toujours 204 : un échec ne doit rien montrer au visiteur.
 */
export async function POST(req: Request) {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    const chemin = cheminPropre((await req.text()).slice(0, 300));
    if (chemin && !estRobot(ua)) {
      const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "inconnue";
      const sel = process.env.PRESENCE_SEL || process.env.SUPABASE_SERVICE_ROLE_KEY || "avyora";
      await signaler(empreinte(ip, ua ?? "", aujourdhuiParis(), sel), chemin);
    }
  } catch (e) {
    console.warn("[presence] signal perdu :", (e as Error).message);
  }
  return new NextResponse(null, { status: 204 });
}

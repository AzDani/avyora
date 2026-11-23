import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { lireEnLigne } from "@/lib/presence";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Au-delà, les membres connectés restent comptés mais sans pseudo ni e-mail (une lecture par membre, toutes les 15 s). */
const MEMBRES_MAX = 30;

/**
 * Visiteurs en ligne en ce moment (réservé admin), lus toutes les 15 s par le tableau de bord : le nombre, les pages,
 * et chaque visiteur (ville et pays approximatifs ; pour un membre connecté, son pseudo et son e-mail).
 */
export async function GET() {
  const refus = await gardeAdmin();
  if (refus) return refus;
  try {
    const enLigne = await lireEnLigne();
    if (!enLigne) return NextResponse.json({ disponible: false }, { headers: { "Cache-Control": "no-store" } });

    const ids = [...new Set(enLigne.visiteurs.map((v) => v.userId).filter((x): x is string => !!x))].slice(0, MEMBRES_MAX);
    const admin = ids.length ? supabaseAdmin() : null;
    const comptes = new Map<string, { email: string; username: string }>();
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await admin!.auth.admin.getUserById(id);
        const u = data?.user;
        if (u) comptes.set(id, { email: u.email ?? "", username: String(u.user_metadata?.username ?? "") });
      }),
    );
    const visiteurs = enLigne.visiteurs.map((v) => ({ ...v, ...(v.userId ? { compte: comptes.get(v.userId) ?? null } : {}) }));
    return NextResponse.json({ disponible: true, ...enLigne, visiteurs }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/en-ligne] lecture impossible :", e);
    return NextResponse.json({ disponible: false }, { status: 500 });
  }
}

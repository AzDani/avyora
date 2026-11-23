import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { lireEnLigne } from "@/lib/presence";
import { comptesMembres } from "@/lib/admin/comptes-presence";

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
    const comptes = await comptesMembres(enLigne.visiteurs.map((v) => v.userId).filter((x): x is string => !!x), MEMBRES_MAX);
    const visiteurs = enLigne.visiteurs.map((v) => ({ ...v, ...(v.userId ? { compte: comptes.get(v.userId) ?? null } : {}) }));
    return NextResponse.json({ disponible: true, ...enLigne, visiteurs }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/en-ligne] lecture impossible :", e);
    return NextResponse.json({ disponible: false }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { lireEnLigne } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Visiteurs en ligne en ce moment (réservé admin), lus toutes les 15 s par le tableau de bord. */
export async function GET() {
  const refus = await gardeAdmin();
  if (refus) return refus;
  try {
    const enLigne = await lireEnLigne();
    if (!enLigne) return NextResponse.json({ disponible: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ disponible: true, ...enLigne }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/en-ligne] lecture impossible :", e);
    return NextResponse.json({ disponible: false }, { status: 500 });
  }
}

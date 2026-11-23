import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { lireJournee } from "@/lib/presence";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { comptesMembres } from "@/lib/admin/comptes-presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La liste renvoyée est bornée (les plus récents d'abord) ; le total, lui, compte tout le monde. */
const VISITEURS_MAX = 300;
const MEMBRES_MAX = 60;

/**
 * Historique de la journée (heure de Paris), réservé admin, lu quand la liste du compteur est ouverte : chaque
 * visiteur passé aujourd'hui, son arrivée, sa dernière activité, ses pages, et pour un membre son pseudo et son e-mail.
 */
export async function GET() {
  const refus = await gardeAdmin();
  if (refus) return refus;
  try {
    const jour = aujourdhuiParis();
    const j = await lireJournee(jour);
    if (!j) return NextResponse.json({ disponible: false }, { headers: { "Cache-Control": "no-store" } });
    const liste = j.visiteurs.slice(0, VISITEURS_MAX);
    const comptes = await comptesMembres(liste.map((v) => v.userId).filter((x): x is string => !!x), MEMBRES_MAX);
    const visiteurs = liste.map((v) => ({ ...v, ...(v.userId ? { compte: comptes.get(v.userId) ?? null } : {}) }));
    return NextResponse.json(
      { disponible: true, jour, total: j.total, membres: j.membres, visiteurs, tronque: j.visiteurs.length > liste.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[admin/journee] lecture impossible :", e);
    return NextResponse.json({ disponible: false }, { status: 500 });
  }
}

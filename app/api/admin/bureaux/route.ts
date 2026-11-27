import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { listInscrits, listPlansAdmin, listDemandesAccompagnement } from "@/lib/data/admin";
import { compteAModerer, listArtisansAdmin, listDemandesDevisAdmin } from "@/lib/data/reseau";
import { lireEnLigne, lireJournee } from "@/lib/presence";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { construireBureaux } from "@/lib/bureaux/donnees";
import { mesurerServeurs } from "@/lib/bureaux/serveurs";
import { entreesStripe, listCharges, listRendezVous } from "@/lib/data/gestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le contenu des pièces des bureaux virtuels (réservé admin), relu chaque minute par la page. Les inscrits sont le
 * socle : s'ils ne se lisent pas, la réponse est une erreur. Chaque autre source qui échoue vaut null : seule sa
 * pièce passe « lecture impossible » (lib/bureaux/donnees.ts). Lecture seule : rien n'est écrit ici.
 */
export async function GET() {
  const refus = await gardeAdmin();
  if (refus) return refus;
  try {
    const maintenant = new Date();
    const [inscrits, plans, demandes, artisans, devis, avisAModerer, enLigne, journee, serveurs, charges, entrees, rendezVous] = await Promise.all([
      listInscrits(),
      listPlansAdmin().catch(() => null),
      listDemandesAccompagnement().catch(() => null),
      listArtisansAdmin().catch(() => null),
      listDemandesDevisAdmin().catch(() => null),
      compteAModerer().catch(() => null),
      lireEnLigne().catch(() => null),
      lireJournee(aujourdhuiParis(maintenant)).catch(() => null),
      mesurerServeurs(maintenant.getTime()).catch(() => null),
      listCharges().catch(() => null),
      entreesStripe(maintenant.getTime()).catch(() => null),
      listRendezVous(0, 2).catch(() => null),
    ]);
    const donnees = construireBureaux({ inscrits, plans, demandes, artisans, devis, avisAModerer, enLigne, journee, serveurs, charges, entrees, rendezVous, cleClaude: !!process.env.ANTHROPIC_API_KEY, maintenant });
    return NextResponse.json(donnees, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/bureaux] lecture impossible :", e);
    return NextResponse.json({ error: "Lecture impossible" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

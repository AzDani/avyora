import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_VERIFIER, verificationEnAttente } from "@/lib/auth-verifier";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite } from "@/lib/ratelimit";
import { exporterDonnees, nomFichierExport, type ClientLecture } from "@/lib/export-donnees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * « Télécharger mes données » (Mon compte) : l'export RGPD du compte connecté, en pièce jointe JSON. Lecture sous la
 * session (RLS) : lib/export-donnees.ts. Bornée par compte (catégorie `api`), jamais mise en cache.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  // Session ouverte par un lien relayé et pas encore confirmée (« Est-ce bien ton compte ? », proxy.ts) : le proxy
  // laisse passer les lectures /api, mais l'export complet du compte attend la réponse.
  if (verificationEnAttente((await cookies()).get(COOKIE_VERIFIER)?.value, user.id)) {
    return NextResponse.json({ error: "verification_requise" }, { status: 403 });
  }
  if (!(await verifierLimite("api", `export:${user.id}`))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  const sb = await supabaseServer();
  const maintenant = new Date();
  const contenu = await exporterDonnees(sb as unknown as ClientLecture, user, maintenant);
  return new NextResponse(JSON.stringify(contenu, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierExport(maintenant)}"`,
      "Cache-Control": "no-store",
    },
  });
}

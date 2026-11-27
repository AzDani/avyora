import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { journaliser } from "@/lib/audit";
import { sourcesCatalogue } from "@/lib/estimateur/catalogue-neuf";

/**
 * Le barème de prix (catalogues rénovation et neuf), pour les écrans qui calculent DANS le navigateur : estimateurs
 * détaillés, fiche projet, budget réel, estimation née d'un plan (27/11/2026, option A validée par Dani).
 *
 * Il n'est plus dans le JavaScript public : un visiteur sans compte ne le reçoit jamais. Un compte le reçoit ici,
 * chaque chargement est journalisé (`secu:bareme_charge` : compte, IP, navigateur) et plafonné par compte
 * (`bareme`, 60 / h), pour repérer et freiner une copie en série. Jamais mis en cache hors du navigateur du compte.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await verifierLimite("bareme", user.id))) {
    await journaliser("bareme_charge", { userId: user.id, email: user.email, payload: { refus: "limite" } });
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  const s = sourcesCatalogue();
  if (!s) return NextResponse.json({ error: "Barème indisponible" }, { status: 503 });
  await journaliser("bareme_charge", { userId: user.id, email: user.email });
  return NextResponse.json(
    { reno: s.reno, neuf: s.neuf },
    { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } },
  );
}

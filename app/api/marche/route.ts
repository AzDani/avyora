import { NextResponse } from "next/server";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { prixDuMarche } from "@/lib/marche/serveur";

/**
 * Prix du marché pour la section « Investissement » (module M3) : fourchette des ventes DVF comparables et loyer de
 * la carte ANIL, pour la commune du projet. Pro (pendant la bêta : tout compte confirmé). Paramètres : cp (code
 * postal), insee (commune choisie, facultatif), type (Studio, T2, T3, T4, Maison), surface (m²).
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("marche", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  const q = new URL(req.url).searchParams;
  const cp = q.get("cp") ?? "";
  const insee = q.get("insee") ?? undefined;
  const type = q.get("type") ?? undefined;
  const surface = Number(q.get("surface"));
  if (!/^\d{5}$/.test(cp) || (insee && !/^[0-9][0-9AB][0-9]{3}$/.test(insee)) || (type && !/^(Studio|T2|T3|T4|Maison)$/.test(type)) || !(surface >= 5 && surface <= 2_000)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  try {
    const m = await prixDuMarche({ cp, insee, typeBien: type, surface });
    return NextResponse.json(m, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "Source indisponible" }, { status: 502 });
  }
}

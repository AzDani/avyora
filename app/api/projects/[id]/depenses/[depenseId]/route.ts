import { NextResponse } from "next/server";
import { supprimerDepense } from "@/lib/data/depenses";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supprime une dépense réelle d'un projet (module M5). La RLS refuse celle d'un projet d'un autre. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; depenseId: string }> }) {
  const { id, depenseId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  if (!UUID.test(id) || !UUID.test(depenseId)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!(await supprimerDepense(id, depenseId))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

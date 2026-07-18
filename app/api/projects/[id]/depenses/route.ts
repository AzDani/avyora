import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { corpsEtat, libelle, montant } = await req.json();
  if (!corpsEtat || !libelle || !(Number(montant) > 0)) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  const info = db
    .prepare(
      "INSERT INTO expenses (project_id, corps_etat, libelle, montant) VALUES (?, ?, ?, ?)"
    )
    .run(id, corpsEtat, String(libelle).trim(), Number(montant));
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const depId = new URL(req.url).searchParams.get("dep");
  if (!depId) return NextResponse.json({ error: "dep manquant" }, { status: 400 });
  db.prepare("DELETE FROM expenses WHERE id = ? AND project_id = ?").run(depId, id);
  return NextResponse.json({ ok: true });
}

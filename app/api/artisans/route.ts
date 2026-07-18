import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const a = await req.json();
  if (!a.nom?.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }
  const info = db
    .prepare(
      "INSERT INTO artisans (nom, corps_etat, telephone, email, ville, note) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      String(a.nom).trim(),
      a.corpsEtat ?? "divers",
      a.telephone?.trim() || null,
      a.email?.trim() || null,
      a.ville?.trim() || null,
      a.note?.trim() || null
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  db.prepare("DELETE FROM artisans WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

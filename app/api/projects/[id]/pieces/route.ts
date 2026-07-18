import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = await req.json();
  if (!p.nom || !(Number(p.longueur) > 0) || !(Number(p.largeur) > 0)) {
    return NextResponse.json({ error: "Nom et dimensions requis" }, { status: 400 });
  }
  const info = db
    .prepare(
      `INSERT INTO rooms (project_id, nom, type_piece, longueur, largeur, hauteur, portes, fenetres, carrelage_sol, faience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      String(p.nom).trim(),
      p.typePiece ?? "autre",
      Number(p.longueur),
      Number(p.largeur),
      Number(p.hauteur) || 2.5,
      Math.max(0, Math.round(Number(p.portes) ?? 1)),
      Math.max(0, Math.round(Number(p.fenetres) ?? 0)),
      p.carrelageSol ? 1 : 0,
      p.faience ? 1 : 0
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = await req.json();
  if (!p.pieceId || !p.nom || !(Number(p.longueur) > 0) || !(Number(p.largeur) > 0)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  db.prepare(
    `UPDATE rooms SET nom = ?, type_piece = ?, longueur = ?, largeur = ?, hauteur = ?, portes = ?, fenetres = ?, carrelage_sol = ?, faience = ?
     WHERE id = ? AND project_id = ?`
  ).run(
    String(p.nom).trim(),
    p.typePiece ?? "autre",
    Number(p.longueur),
    Number(p.largeur),
    Number(p.hauteur) || 2.5,
    Math.max(0, Math.round(Number(p.portes) ?? 1)),
    Math.max(0, Math.round(Number(p.fenetres) ?? 0)),
    p.carrelageSol ? 1 : 0,
    p.faience ? 1 : 0,
    p.pieceId,
    id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pieceId = new URL(req.url).searchParams.get("piece");
  if (pieceId) {
    db.prepare("DELETE FROM rooms WHERE id = ? AND project_id = ?").run(pieceId, id);
  } else {
    db.prepare("DELETE FROM rooms WHERE project_id = ?").run(id);
  }
  return NextResponse.json({ ok: true });
}

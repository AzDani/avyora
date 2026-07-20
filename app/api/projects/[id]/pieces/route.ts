import { NextResponse } from "next/server";
import { addPiece, updatePiece, deletePiece, deleteAllPieces } from "@/lib/data/projects";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = await req.json();
  if (!p.nom || !(Number(p.longueur) > 0) || !(Number(p.largeur) > 0)) {
    return NextResponse.json({ error: "Nom et dimensions requis" }, { status: 400 });
  }
  const pieceId = await addPiece(id, p);
  return NextResponse.json({ id: pieceId });
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
  await updatePiece(id, String(p.pieceId), p);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pieceId = new URL(req.url).searchParams.get("piece");
  if (pieceId) await deletePiece(id, pieceId);
  else await deleteAllPieces(id);
  return NextResponse.json({ ok: true });
}

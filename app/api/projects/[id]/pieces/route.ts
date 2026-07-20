import { NextResponse } from "next/server";
import { addPiece, updatePiece, deletePiece, deleteAllPieces, getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { valider, jsonBody, pieceSchema } from "@/lib/validation";

async function garde(id: string): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await getProjet(id))) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;
  const v = valider(pieceSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const pieceId = await addPiece(id, v.data);
  return NextResponse.json({ id: pieceId });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;
  const v = valider(pieceSchema, await jsonBody(req));
  if (!v.ok || !v.data.pieceId) return v.ok ? NextResponse.json({ error: "pieceId requis" }, { status: 400 }) : v.res;
  await updatePiece(id, String(v.data.pieceId), v.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;
  const pieceId = new URL(req.url).searchParams.get("piece");
  if (pieceId) await deletePiece(id, pieceId);
  else await deleteAllPieces(id);
  return NextResponse.json({ ok: true });
}

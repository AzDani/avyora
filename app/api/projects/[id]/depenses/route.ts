import { NextResponse } from "next/server";
import { addDepense, deleteDepense } from "@/lib/data/projects";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { corpsEtat, libelle, montant } = await req.json();
  if (!corpsEtat || !libelle || !(Number(montant) > 0)) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  const depId = await addDepense(id, { corpsEtat, libelle, montant });
  return NextResponse.json({ id: depId });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const depId = new URL(req.url).searchParams.get("dep");
  if (!depId) return NextResponse.json({ error: "dep manquant" }, { status: 400 });
  await deleteDepense(id, depId);
  return NextResponse.json({ ok: true });
}

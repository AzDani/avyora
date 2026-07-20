import { NextResponse } from "next/server";
import { createArtisan, deleteArtisan } from "@/lib/data/artisans";

export async function POST(req: Request) {
  const a = await req.json();
  if (!a.nom?.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }
  const id = await createArtisan(a);
  if (!id) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await deleteArtisan(id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createArtisan, deleteArtisan } from "@/lib/data/artisans";
import { valider, jsonBody, artisanSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const v = valider(artisanSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const id = await createArtisan(v.data);
  if (!id) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await deleteArtisan(id);
  return NextResponse.json({ ok: true });
}

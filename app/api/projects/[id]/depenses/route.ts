import { NextResponse } from "next/server";
import { addDepense, deleteDepense, getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { valider, jsonBody, depenseSchema } from "@/lib/validation";

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
  const v = valider(depenseSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const depId = await addDepense(id, v.data);
  return NextResponse.json({ id: depId });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;
  const depId = new URL(req.url).searchParams.get("dep");
  if (!depId) return NextResponse.json({ error: "dep manquant" }, { status: 400 });
  await deleteDepense(id, depId);
  return NextResponse.json({ ok: true });
}

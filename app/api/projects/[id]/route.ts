import { NextResponse } from "next/server";
import { setArchived, updateProjet, deleteProjet, getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { valider, jsonBody, projetPatchSchema } from "@/lib/validation";

async function garde(id: string): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await getProjet(id))) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;

  const v = valider(projetPatchSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const data = v.data;

  if ("archived" in data) {
    await setArchived(id, data.archived);
    return NextResponse.json({ ok: true });
  }
  await updateProjet(id, {
    nom: data.nom,
    typeBien: data.typeBien,
    surface: data.surface,
    codePostal: data.codePostal,
    reponses: data.reponses,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await garde(id);
  if (g) return g;
  await deleteProjet(id); // enfants supprimés par cascade FK
  return NextResponse.json({ ok: true });
}

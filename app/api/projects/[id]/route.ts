import { NextResponse } from "next/server";
import { setArchived, updateProjet, deleteProjet } from "@/lib/data/projects";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Archivage / désarchivage
  if (typeof body.archived === "boolean") {
    await setArchived(id, body.archived);
    return NextResponse.json({ ok: true });
  }

  // Mise à jour de l'estimation (réponses du questionnaire, bien)
  if (body.reponses) {
    await updateProjet(id, {
      nom: body.nom,
      typeBien: body.typeBien,
      surface: body.surface,
      codePostal: body.codePostal,
      reponses: body.reponses,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteProjet(id); // enfants supprimés par cascade FK
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Archivage / désarchivage
  if (typeof body.archived === "boolean") {
    db.prepare("UPDATE projects SET archived = ? WHERE id = ?").run(body.archived ? 1 : 0, id);
    return NextResponse.json({ ok: true });
  }

  // Mise à jour de l'estimation (réponses du questionnaire, bien)
  if (body.reponses) {
    db.prepare(
      "UPDATE projects SET nom = ?, type_bien = ?, surface = ?, code_postal = ?, reponses_json = ? WHERE id = ?"
    ).run(
      String(body.nom).trim(),
      body.typeBien ?? "appartement",
      Number(body.surface),
      String(body.codePostal),
      JSON.stringify(body.reponses),
      id
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM quotes WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM scenarios WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

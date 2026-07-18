import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db, uploadsDir } from "@/lib/db";
import { extrairePiecesDuPlan, analyserPhoto } from "@/lib/vision";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("fichier") as File | null;
  const type = (form.get("type") as string) === "plan" ? "plan" : "photo";
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
  }
  const fichier = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  fs.writeFileSync(path.join(uploadsDir, fichier), Buffer.from(await file.arrayBuffer()));
  const info = db
    .prepare("INSERT INTO documents (project_id, type, fichier, nom) VALUES (?, ?, ?, ?)")
    .run(id, type, fichier, file.name);
  return NextResponse.json({ id: info.lastInsertRowid });
}

/** Analyse IA d'un document : plan → pièces (métré), photo → observations. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { docId } = await req.json();
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND project_id = ?")
    .get(docId, id) as { id: number; type: string; fichier: string } | undefined;
  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  if (doc.type === "plan") {
    const result = await extrairePiecesDuPlan(doc.fichier);
    if ("erreur" in result) return NextResponse.json({ error: result.erreur }, { status: 422 });
    if (result.length === 0)
      return NextResponse.json({ error: "Aucune pièce détectée sur ce plan." }, { status: 422 });
    const insert = db.prepare(
      `INSERT INTO rooms (project_id, nom, type_piece, longueur, largeur, hauteur, portes, fenetres, carrelage_sol, faience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM rooms WHERE project_id = ?").run(id);
      for (const p of result)
        insert.run(id, p.nom, p.type_piece, p.longueur, p.largeur, p.hauteur, p.portes, p.fenetres, p.carrelage_sol ? 1 : 0, p.faience ? 1 : 0);
    });
    tx();
    db.prepare("UPDATE documents SET note_ia = ? WHERE id = ?").run(
      `${result.length} pièces extraites du plan et intégrées au métré.`,
      doc.id
    );
    return NextResponse.json({ pieces: result.length });
  }

  const note = await analyserPhoto(doc.fichier);
  if (typeof note !== "string")
    return NextResponse.json({ error: note.erreur }, { status: 422 });
  db.prepare("UPDATE documents SET note_ia = ? WHERE id = ?").run(note, doc.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = new URL(req.url).searchParams.get("doc");
  if (!docId) return NextResponse.json({ error: "doc manquant" }, { status: 400 });
  const doc = db
    .prepare("SELECT fichier FROM documents WHERE id = ? AND project_id = ?")
    .get(docId, id) as { fichier: string } | undefined;
  if (doc) {
    try {
      fs.unlinkSync(path.join(uploadsDir, doc.fichier));
    } catch {}
    db.prepare("DELETE FROM documents WHERE id = ? AND project_id = ?").run(docId, id);
  }
  return NextResponse.json({ ok: true });
}

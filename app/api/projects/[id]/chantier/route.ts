import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimer, ORDRE_TRAVAUX, type Reponses } from "@/lib/estimation";
import { calculerMetre, type PieceRow } from "@/lib/metre";
import { getFormConfig } from "@/lib/customq-db";

/** Génère le plan de chantier (tâches ordonnées) depuis l'estimation. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projet = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | { surface: number; code_postal: string; reponses_json: string }
    | undefined;
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const existants = (
    db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE project_id = ?").get(id) as { n: number }
  ).n;
  if (existants > 0)
    return NextResponse.json({ error: "Plan déjà généré" }, { status: 409 });

  const pieces = db
    .prepare("SELECT * FROM rooms WHERE project_id = ?")
    .all(id) as PieceRow[];
  const est = estimer(
    projet.surface,
    projet.code_postal,
    JSON.parse(projet.reponses_json) as Reponses,
    pieces.length > 0 ? calculerMetre(pieces) : null,
    getFormConfig()
  );
  const insertStmt = db.prepare(
    "INSERT INTO tasks (project_id, corps_etat, titre, ordre) VALUES (?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    let n = 0;
    for (const l of est.lignes) {
      if (l.corpsEtat === "divers") continue;
      const ordre = ORDRE_TRAVAUX.indexOf(l.corpsEtat);
      insertStmt.run(id, l.corpsEtat, l.poste, ordre === -1 ? 99 : ordre);
      n++;
    }
    return n;
  });
  const n = tx();
  return NextResponse.json({ created: n });
}

/** Met à jour le statut d'une tâche. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { taskId, statut } = await req.json();
  if (!taskId || !["a_faire", "en_cours", "fait"].includes(statut)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  db.prepare("UPDATE tasks SET statut = ? WHERE id = ? AND project_id = ?").run(
    statut,
    taskId,
    id
  );
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { estimer, ORDRE_TRAVAUX, type Reponses } from "@/lib/estimation";
import { calculerMetre } from "@/lib/metre";
import { getFormConfig } from "@/lib/customq-db";
import { getProjet, getPieces, countTaches, insertTaches, setTacheStatut } from "@/lib/data/projects";

/** Génère le plan de chantier (tâches ordonnées) depuis l'estimation. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  if ((await countTaches(id)) > 0)
    return NextResponse.json({ error: "Plan déjà généré" }, { status: 409 });

  const pieces = await getPieces(id);
  const est = estimer(
    projet.surface,
    projet.code_postal,
    projet.reponses as Reponses,
    pieces.length > 0 ? calculerMetre(pieces) : null,
    await getFormConfig()
  );

  const taches = est.lignes
    .filter((l) => l.corpsEtat !== "divers")
    .map((l) => {
      const ordre = ORDRE_TRAVAUX.indexOf(l.corpsEtat);
      return { corps_etat: l.corpsEtat, titre: l.poste, ordre: ordre === -1 ? 99 : ordre };
    });
  const n = await insertTaches(id, taches);
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
  await setTacheStatut(id, String(taskId), statut);
  return NextResponse.json({ ok: true });
}

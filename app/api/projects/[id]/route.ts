import { NextResponse } from "next/server";
import { setArchived, updateProjet, renameProjet, getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
  // Renommage seul : le body ne contient que `nom` (pas de `reponses`).
  if (!("reponses" in data)) {
    await renameProjet(id, data.nom);
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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  // Vérif de propriété via le service-role (source fiable de owner_id), puis suppression via le
  // même client → contourne tout souci de contexte RLS sur le DELETE. Les enfants tombent par
  // ON DELETE CASCADE. On confirme qu'une ligne a bien été supprimée (sinon message clair).
  const admin = supabaseAdmin();
  const { data: proj } = await admin.from("projects").select("id, owner_id").eq("id", id).maybeSingle();
  if (!proj) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (proj.owner_id !== user.id) {
    return NextResponse.json({ error: "Vous n'êtes pas le propriétaire de ce projet." }, { status: 403 });
  }
  const { data: supprime, error } = await admin.from("projects").delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!supprime || supprime.length === 0) {
    return NextResponse.json({ error: "Aucune ligne supprimée." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { setArchived, updateProjet, renameProjet, getProjet, type Projet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { valider, jsonBody, projetPatchSchema } from "@/lib/validation";
import { fusionnerReponses, nomApresModification } from "@/lib/estimateur/maj-projet";

/** Session et projet lisible ; renvoie le projet enregistré (le PATCH d'estimation en a besoin). */
async function garde(id: string): Promise<{ res: NextResponse } | { projet: Projet }> {
  const user = await getUser();
  if (!user) return { res: NextResponse.json({ error: "Authentification requise" }, { status: 401 }) };
  const projet = await getProjet(id);
  if (!projet) return { res: NextResponse.json({ error: "Projet introuvable" }, { status: 404 }) };
  return { projet };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await garde(id);
  if ("res" in g) return g.res;
  const existant = g.projet;

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
  // « Modifier l'estimation » ne touche qu'à l'estimation : le nom choisi à la main, la simulation
  // Investissement et le suivi de chantier enregistrés restent (lib/estimateur/maj-projet.ts).
  await updateProjet(id, {
    nom: nomApresModification(existant.nom, existant.reponses, data.nom),
    typeBien: data.typeBien,
    surface: data.surface,
    codePostal: data.codePostal,
    reponses: fusionnerReponses(existant.reponses, data.reponses),
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
  if (error) {
    // Jamais le message de Postgres au client (il était affiché tel quel, en anglais technique).
    console.error("Suppression de projet échouée:", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
  if (!supprime || supprime.length === 0) {
    return NextResponse.json({ error: "Aucune ligne supprimée." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

// Statut d'avancement d'une tâche : 0 = à démarrer (défaut), 1 = en cours, 2 = terminé.
// Fusionné dans reponses.statuts (clé = "corps|nom"). state 0 = on retire la clé (reste léger).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : null;
  const state = Number(body?.state);
  if (!key || ![0, 1, 2].includes(state)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const reponses = { ...(projet.reponses as Record<string, unknown>) };
  const statuts = { ...((reponses.statuts as Record<string, number>) || {}) };
  if (state === 0) delete statuts[key];
  else statuts[key] = state;
  reponses.statuts = statuts;

  const sb = await supabaseServer();
  const { error } = await sb.from("projects").update({ reponses }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

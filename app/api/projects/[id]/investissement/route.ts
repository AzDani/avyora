import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody } from "@/lib/validation";
import { investSchema } from "@/lib/investissement/saisie";
import { supabaseServer } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre la saisie de la section « Investissement » (module M3) dans `reponses.invest` du projet.
 * Pro (pendant la bêta : tout compte confirmé), propriétaire ou membre du projet (RLS). Seule la clé `invest`
 * est remplacée : l'estimation et le suivi de chantier ne sont pas touchés.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  if (!UUID.test(id)) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  const v = valider(investSchema, await jsonBody(req));
  if (!v.ok) return v.res;

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const reponses = { ...(projet.reponses as Record<string, unknown>), invest: v.data };
  const sb = await supabaseServer();
  const { error } = await sb.from("projects").update({ reponses }).eq("id", id);
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

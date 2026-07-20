import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { journaliser } from "@/lib/audit";

/**
 * Export RGPD : renvoie TOUTES les données de l'utilisateur (portabilité) en JSON téléchargeable.
 * Scopé RLS (supabaseServer) → ne peut renvoyer que les données de l'appelant.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const [profil, projets, artisans] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("projects").select("*"),
    sb.from("artisans").select("*"),
  ]);
  const ids = (projets.data ?? []).map((p) => p.id);
  const enfants = ids.length
    ? await Promise.all([
        sb.from("rooms").select("*").in("project_id", ids),
        sb.from("expenses").select("*").in("project_id", ids),
        sb.from("tasks").select("*").in("project_id", ids),
        sb.from("quotes").select("*").in("project_id", ids),
        sb.from("scenarios").select("*").in("project_id", ids),
        sb.from("documents").select("*").in("project_id", ids),
      ])
    : [];

  const donnees = {
    export_le: new Date().toISOString(),
    compte: { id: user.id, email: user.email, cree_le: user.created_at, profil: profil.data },
    projets: projets.data ?? [],
    pieces: enfants[0]?.data ?? [],
    depenses: enfants[1]?.data ?? [],
    taches: enfants[2]?.data ?? [],
    devis: enfants[3]?.data ?? [],
    scenarios: enfants[4]?.data ?? [],
    documents: enfants[5]?.data ?? [],
    artisans: artisans.data ?? [],
  };

  await journaliser("export_donnees", { userId: user.id, email: user.email });
  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="avyora-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

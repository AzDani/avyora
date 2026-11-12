import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody, statutTacheSchema, reponsesDansLaBorne, MAX_STATUTS } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Statut d'avancement d'une tâche : 0 = à démarrer (défaut), 1 = en cours, 2 = terminé.
// Fusionné dans reponses.statuts (clé = "corps|nom"). state 0 = on retire la clé (reste léger).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await verifierLimite("statut", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  if (!UUID.test(id)) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  // Clé bornée (200 caractères), état 0, 1 ou 2 : rien d'autre n'entre dans `reponses.statuts`.
  const v = valider(statutTacheSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const { key, state } = v.data;

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const reponses = { ...(projet.reponses as Record<string, unknown>) };
  const statuts = { ...((reponses.statuts as Record<string, number>) || {}) };
  if (state === 0) delete statuts[key];
  else statuts[key] = state;
  reponses.statuts = statuts;

  // Même borne que les autres écritures de `reponses` (lib/validation.ts) : un projet trop gros serait ensuite
  // refusé à chaque enregistrement de l'estimateur. Retirer un statut (state 0) reste toujours possible.
  if (state !== 0 && (Object.keys(statuts).length > MAX_STATUTS || !reponsesDansLaBorne(reponses))) {
    return NextResponse.json({ error: "Données invalides." }, { status: 413 });
  }

  const sb = await supabaseServer();
  const { error } = await sb.from("projects").update({ reponses }).eq("id", id);
  if (error) {
    console.error("[statut] enregistrement impossible :", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

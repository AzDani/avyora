import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { majStatut } from "@/lib/data/reponses-projet";

// Statut d'avancement d'une tâche : 0 = à démarrer (défaut), 1 = en cours, 2 = terminé.
// Fusionné dans reponses.statuts (clé = "corps|nom"). state 0 = on retire la clé (reste léger).
// Le client envoie ses clics UN PAR UN, dans l'ordre (file d'attente d'EstimationResultat).
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

  // Écriture de la SEULE clé, atomique (lib/data/reponses-projet.ts) : deux clics rapprochés, ou un statut
  // et une sauvegarde de l'Investissement, ne s'effacent plus l'un l'autre.
  const r = await majStatut(id, key, state as 0 | 1 | 2);
  if (r === "refuse") return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
  if (r === "introuvable") return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (r === "erreur") return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

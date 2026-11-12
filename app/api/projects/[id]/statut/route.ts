import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody, statutTacheSchema, reponsesDansLaBorne, MAX_STATUTS } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { majStatut } from "@/lib/data/reponses-projet";

// Statut d'avancement d'une tâche : 0 = à démarrer (défaut), 1 = en cours, 2 = terminé.
// Fusionné dans reponses.statuts (clé = "corps|nom"). state 0 = on retire la clé (reste léger).
// Le client envoie ses clics UN PAR UN, dans l'ordre (file d'attente d'EstimationResultat).
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

  // Borne vérifiée sur l'état qu'on s'apprête à écrire (lib/validation.ts) : un projet trop gros serait ensuite
  // refusé à chaque enregistrement de l'estimateur. Retirer un statut (state 0) reste toujours possible.
  if (state !== 0) {
    const reponses = { ...(projet.reponses as Record<string, unknown>) };
    const statuts = { ...((reponses.statuts as Record<string, number>) || {}), [key]: state };
    reponses.statuts = statuts;
    if (Object.keys(statuts).length > MAX_STATUTS || !reponsesDansLaBorne(reponses)) {
      return NextResponse.json({ error: "Données invalides." }, { status: 413 });
    }
  }

  // Écriture de la SEULE clé, atomique (lib/data/reponses-projet.ts) : deux clics rapprochés, ou un statut
  // et une sauvegarde de l'Investissement, ne s'effacent plus l'un l'autre.
  const r = await majStatut(id, key, state as 0 | 1 | 2);
  if (r === "refuse") return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
  if (r === "introuvable") return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (r === "erreur") return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

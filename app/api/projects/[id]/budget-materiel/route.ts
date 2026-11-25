import { NextResponse } from "next/server";
import { majCleReponses } from "@/lib/data/reponses-projet";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody, budgetMaterielSchema } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre le budget « Matériel et outillage » du projet (budget réel, 25/11/2026) dans `reponses.budgetMateriel` :
 * ce que l'utilisateur prévoit pour acheter ou louer ses outils, selon son équipement. `null` : revenir au montant de
 * l'estimation. Pro (pendant la bêta : tout compte confirmé), propriétaire ou membre du projet (RLS). Seule cette clé
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
  const v = valider(budgetMaterielSchema, await jsonBody(req));
  if (!v.ok) return v.res;

  const montant = v.data.montant == null ? null : Math.round(v.data.montant * 100) / 100;
  // La fonction SQL refuse une valeur nulle : « revenir à l'estimation » s'écrit "estimation" (lu comme non fixé).
  const r = await majCleReponses(id, "budgetMateriel", montant ?? "estimation");
  if (r === "introuvable") return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (r === "refuse") return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
  if (r === "erreur") return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ ok: true, budgetMateriel: montant });
}

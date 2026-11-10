import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { getPlanAdmin } from "@/lib/data/admin";
import { journaliser } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Un plan quelconque, état compris, pour l'éditeur en lecture seule de l'admin (`/admin/plans/editeur`).
 * Réservé admin (gardeAdmin : 401 sans session, 403 sinon), lecture seule : la route n'a pas d'autre méthode.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const refus = await gardeAdmin();
  if (refus) return refus;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  const plan = await getPlanAdmin(id);
  if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  await journaliser("action_admin", { payload: { action: "voir_plan", planId: id } });
  return NextResponse.json(
    { id: plan.id, nom: plan.nom, workflow: plan.workflow, etat: plan.etat, vue: plan.vue, proprietaire: plan.email },
    { headers: { "Cache-Control": "no-store" } },
  );
}

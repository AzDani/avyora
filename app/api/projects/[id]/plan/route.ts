import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonBody, planImportSchema } from "@/lib/validation";
import { contributionsDuPlan, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { injecterPlan } from "@/lib/estimateur/plan-injection";
import type { Selection } from "@/lib/estimateur";

/**
 * Le plan d'un projet : on le reçoit, on le traduit, on rend le rapport à relire.
 *
 * Ce que cette route NE fait PAS : enregistrer la sélection. Le plan est stocké et le rapport
 * calculé, mais `reponses.sel` n'est écrit que quand l'utilisateur a validé — c'est le double
 * check posé en D1. Une route qui écrirait le devis au moment de l'import rendrait cet écran
 * décoratif.
 *
 * Le plan vit dans sa propre table : `reponses` est plafonné à 40 000 caractères et porte déjà
 * le contexte, la sélection, les lignes perso et les statuts de chantier.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const parsed = planImportSchema.safeParse(await jsonBody(req));
  if (!parsed.success) {
    // Contrairement au reste de l'API, on expose le message : « Données invalides » ne dirait pas
    // à l'utilisateur que son plan vient d'une autre version de l'éditeur.
    const message = parsed.error.issues[0]?.message ?? "plan invalide";
    return NextResponse.json({ error: `Ce plan ne peut pas être lu : ${message}.` }, { status: 400 });
  }

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const contrat = parsed.data as unknown as PlanPourCorrespondance;
  const { contributions, ignores } = contributionsDuPlan(contrat);
  const selCourante = ((projet.reponses as Record<string, unknown>)?.sel ?? {}) as Selection;
  const rapport = injecterPlan(selCourante, contributions);

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("project_plans")
    .upsert(
      {
        project_id: id,
        contrat,
        contributions,
        rapport: { lignes: rapport.lignes, bilan: rapport.bilan, ignores },
        version: parsed.data.contrat,
        nom: parsed.data.plan?.nom ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    planId: data.id,
    bilan: rapport.bilan,
    lignes: rapport.lignes,
    ignores,
  });
}

/** Le plan courant du projet, avec le rapport tel qu'il a été calculé à l'import. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("project_plans")
    .select("id, contrat, contributions, rapport, version, nom, updated_at")
    .eq("project_id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ plan: null });
  return NextResponse.json({ plan: data });
}

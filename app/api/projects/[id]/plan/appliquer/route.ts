import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { injecterPlan } from "@/lib/estimateur/plan-injection";
import type { Contribution } from "@/lib/estimateur/plan-correspondance";
import type { Selection } from "@/lib/estimateur";

/**
 * L'utilisateur a relu le rapport et valide : c'est ici, et seulement ici, que les quantités du
 * plan entrent dans le devis. La route d'import ne l'a pas fait exprès — sans cette séparation,
 * l'écran de validation posé en D1 n'aurait servi qu'à décorer un chiffrage déjà écrit.
 *
 * L'injection est REJOUÉE sur la sélection du moment, pas rejouée depuis le rapport figé : entre
 * l'import et la validation, l'utilisateur a pu corriger une quantité à la main. Elle reste alors
 * épinglée, exactement comme au moment où il l'a lue (D12).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const sb = await supabaseServer();
  const { data: plan, error: lecture } = await sb
    .from("project_plans")
    .select("id, contributions")
    .eq("project_id", id)
    .maybeSingle();
  if (lecture) return NextResponse.json({ error: lecture.message }, { status: 500 });
  if (!plan?.contributions) return NextResponse.json({ error: "Aucun plan à appliquer sur ce projet" }, { status: 404 });

  const reponses = { ...((projet.reponses as Record<string, unknown>) ?? {}) };
  const rapport = injecterPlan((reponses.sel ?? {}) as Selection, plan.contributions as Contribution[]);
  reponses.sel = rapport.selection;
  // `reponses` ne porte qu'un pointeur : le plan lui-même vit dans sa table (il ne tiendrait pas
  // dans les 40 000 caractères autorisés ici).
  reponses.plan = { id: plan.id, at: new Date().toISOString() };

  const { error } = await sb.from("projects").update({ reponses }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, bilan: rapport.bilan });
}

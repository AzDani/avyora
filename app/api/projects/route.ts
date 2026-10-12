import { NextResponse } from "next/server";
import { createProjet } from "@/lib/data/projects";
import { FEATURES } from "@/lib/features";
import { origineDuPlan } from "@/lib/plans/origine";
import { getUser } from "@/lib/auth";
import { lienEchoue, relierAuPlan } from "@/lib/plans/relier";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { valider, jsonBody, projetCreateSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await verifierLimite("api", await clientIp()))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  const v = valider(projetCreateSchema, await jsonBody(req));
  if (!v.ok) return v.res;
  const { nom, typeBien, surface, codePostal, reponses } = v.data;
  const id = await createProjet({ nom, typeBien, surface, codePostal, reponses });
  if (!id) {
    // Pas de session : le funnel anonyme sera rattaché à l'inscription (étape 7).
    return NextResponse.json({ error: "Connexion requise pour enregistrer le projet" }, { status: 401 });
  }
  // « Mes plans » (C6) : une estimation née d'un plan est reliée à ce plan (sous RLS, les plans du
  // compte seulement). Interrupteur éteint, ou réponses sans origine « plan » : rien n'est lu. Le lien
  // ne fait jamais échouer l'enregistrement.
  const origine = FEATURES.plans ? origineDuPlan(reponses) : null;
  if (origine) await relierProjet(id, origine);
  return NextResponse.json({ id });
}

/** Le projet est créé : le lien ne lève jamais, même si la session ne peut pas être rouverte (journalisé). */
async function relierProjet(projectId: string, origine: NonNullable<ReturnType<typeof origineDuPlan>>): Promise<void> {
  let userId: string | null = null;
  try {
    userId = (await getUser())?.id ?? null;
    await relierAuPlan(await supabaseServer(), userId, projectId, origine);
  } catch {
    await lienEchoue("session", userId, { projectId });
  }
}

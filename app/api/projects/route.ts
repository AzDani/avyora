import { NextResponse } from "next/server";
import { createProjet } from "@/lib/data/projects";

export async function POST(req: Request) {
  const body = await req.json();
  const { nom, typeBien, surface, codePostal, reponses } = body;
  if (!nom || !surface || !codePostal || !reponses) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  const id = await createProjet({ nom, typeBien, surface, codePostal, reponses });
  if (!id) {
    // Pas de session : le funnel anonyme sera rattaché à l'inscription (étape 7).
    return NextResponse.json({ error: "Connexion requise pour enregistrer le projet" }, { status: 401 });
  }
  return NextResponse.json({ id });
}

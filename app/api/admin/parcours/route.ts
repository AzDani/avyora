import { NextResponse } from "next/server";
import { getParcoursComplet, seedParcours, compterParcours, corbeille } from "@/lib/parcours-db";
import { parcoursParDefaut } from "@/lib/parcours-seed";

// GET : l'arbre complet du parcours (réno + neuf) + la corbeille, pour le rendu / l'admin.
export async function GET() {
  const [parcours, corb, compte] = await Promise.all([getParcoursComplet(), corbeille(), compterParcours()]);
  return NextResponse.json({ parcours, corbeille: corb, compte });
}

// POST : (re)seed le parcours par défaut depuis la définition générée du formulaire actuel.
// Palier 0 — outil de fondation ; sera remplacé par l'édition admin.
export async function POST() {
  for (const p of parcoursParDefaut()) await seedParcours(p);
  return NextResponse.json({ ok: true, compte: await compterParcours() });
}

import { NextResponse } from "next/server";
import { calculerRentabilite, type ParamsRentabilite } from "@/lib/rentabilite";
import { addScenario } from "@/lib/data/projects";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = (await req.json()) as ParamsRentabilite;
  const resultats = calculerRentabilite(p);
  await addScenario(id, p, resultats);
  return NextResponse.json(resultats);
}

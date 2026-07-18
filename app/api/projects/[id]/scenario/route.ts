import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculerRentabilite, type ParamsRentabilite } from "@/lib/rentabilite";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = (await req.json()) as ParamsRentabilite;
  const resultats = calculerRentabilite(p);
  db.prepare(
    "INSERT INTO scenarios (project_id, params_json, resultats_json) VALUES (?, ?, ?)"
  ).run(id, JSON.stringify(p), JSON.stringify(resultats));
  return NextResponse.json(resultats);
}

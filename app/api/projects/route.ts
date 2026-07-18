import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { nom, typeBien, surface, codePostal, reponses } = body;
  if (!nom || !surface || !codePostal || !reponses) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  const info = db
    .prepare(
      "INSERT INTO projects (nom, type_bien, surface, code_postal, reponses_json) VALUES (?, ?, ?, ?, ?)"
    )
    .run(nom, typeBien ?? "appartement", Number(surface), String(codePostal), JSON.stringify(reponses));
  return NextResponse.json({ id: info.lastInsertRowid });
}

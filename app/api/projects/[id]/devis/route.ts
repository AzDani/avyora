import { NextResponse } from "next/server";
import { analyserDevis } from "@/lib/devis";
import { addDevis, getProjet } from "@/lib/data/projects";
import { cheminFichier, uploadFichier } from "@/lib/storage";
import { getUser } from "@/lib/auth";
import { verifierLimite, clientIp } from "@/lib/ratelimit";

async function extraireTexte(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }
  return buffer.toString("utf-8");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!(await verifierLimite("ia", user.id))) {
    return NextResponse.json({ error: "Trop d'analyses en peu de temps. Réessaie dans une minute." }, { status: 429 });
  }
  if (!(await getProjet(id))) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("fichier") as File | null;
  const texteColle = (form.get("texte") as string | null)?.trim();
  const nom = ((form.get("nom") as string | null) || "Devis").trim();

  let texte = "";
  let fichier: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
    }
    try {
      texte = await extraireTexte(file);
    } catch {
      return NextResponse.json(
        { error: "Impossible de lire ce fichier. S'il s'agit d'un scan, colle le texte du devis à la place." },
        { status: 422 }
      );
    }
    fichier = cheminFichier(id, file.name);
    await uploadFichier(fichier, await file.arrayBuffer(), file.type);
  } else if (texteColle) {
    texte = texteColle;
  }

  if (!texte || texte.trim().length < 30) {
    return NextResponse.json(
      { error: "Aucun texte exploitable. Le PDF est peut-être un scan sans texte : colle le contenu du devis dans le champ texte." },
      { status: 422 }
    );
  }

  const analyse = await analyserDevis(texte);
  const devisId = await addDevis(id, { nom, fichier, texte, analyse, note: analyse.note });
  return NextResponse.json({ id: devisId });
}

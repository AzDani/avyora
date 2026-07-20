import { NextResponse } from "next/server";
import { extrairePiecesDuPlan, analyserPhoto } from "@/lib/vision";
import { addDocument, getDocument, setDocumentNote, deleteDocument, replacePieces, getProjet } from "@/lib/data/projects";
import { cheminFichier, uploadFichier, supprimerFichier, detecterTypeFichier } from "@/lib/storage";
import { getUser } from "@/lib/auth";
import { verifierLimite, clientIp } from "@/lib/ratelimit";

/** Vérifie que l'appelant est authentifié ET peut accéder au projet (RLS). Sinon réponse d'erreur. */
async function gardeProjet(id: string): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  const projet = await getProjet(id); // scopé RLS : null si non accessible
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const garde = await gardeProjet(id);
  if (garde) return garde;
  const form = await req.formData();
  const file = form.get("fichier") as File | null;
  const type = (form.get("type") as string) === "plan" ? "plan" : "photo";
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
  }
  const octets = await file.arrayBuffer();
  const vraiType = detecterTypeFichier(octets);
  if (!vraiType) {
    return NextResponse.json({ error: "Type de fichier non autorisé (PDF, JPG, PNG, WEBP, GIF uniquement)." }, { status: 400 });
  }
  const fichier = cheminFichier(id, file.name);
  await uploadFichier(fichier, octets, file.type);
  const docId = await addDocument(id, { type, fichier, nom: file.name });
  return NextResponse.json({ id: docId });
}

/** Analyse IA d'un document : plan → pièces (métré), photo → observations. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const garde = await gardeProjet(id);
  if (garde) return garde;
  if (!(await verifierLimite("ia", (await getUser())?.id ?? (await clientIp())))) {
    return NextResponse.json({ error: "Trop d'analyses en peu de temps. Réessaie dans une minute." }, { status: 429 });
  }
  const { docId } = await req.json();
  const doc = await getDocument(id, String(docId));
  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  if (doc.type === "plan") {
    const result = await extrairePiecesDuPlan(doc.fichier);
    if ("erreur" in result) return NextResponse.json({ error: result.erreur }, { status: 422 });
    if (result.length === 0)
      return NextResponse.json({ error: "Aucune pièce détectée sur ce plan." }, { status: 422 });
    await replacePieces(
      id,
      result.map((p) => ({
        nom: p.nom, type_piece: p.type_piece, longueur: p.longueur, largeur: p.largeur, hauteur: p.hauteur,
        portes: p.portes, fenetres: p.fenetres, carrelage_sol: !!p.carrelage_sol, faience: !!p.faience,
      }))
    );
    await setDocumentNote(doc.id, `${result.length} pièces extraites du plan et intégrées au métré.`);
    return NextResponse.json({ pieces: result.length });
  }

  const note = await analyserPhoto(doc.fichier);
  if (typeof note !== "string")
    return NextResponse.json({ error: note.erreur }, { status: 422 });
  await setDocumentNote(doc.id, note);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = new URL(req.url).searchParams.get("doc");
  if (!docId) return NextResponse.json({ error: "doc manquant" }, { status: 400 });
  const doc = await deleteDocument(id, docId);
  if (doc) {
    try {
      await supprimerFichier(doc.fichier);
    } catch {}
  }
  return NextResponse.json({ ok: true });
}

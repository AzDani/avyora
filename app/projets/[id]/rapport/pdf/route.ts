import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import { genererRapportPDF } from "@/lib/pdf";
import { clientIp, verifierLimite } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Téléchargement direct du rapport en PDF vectoriel (Pro + propriétaire du projet).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL(`/connexion?next=/projets/${id}`, req.url));
  if (!estPro(user)) return NextResponse.redirect(new URL("/tarifs", req.url));

  // Génération PDF = Chrome headless (coûteux) → limites par utilisateur pour protéger le serveur : 5 par minute, et
  // 30 par heure (pendant la bêta, tout inscrit y a droit ; sans Upstash, tenues en mémoire en production) ; et 60 par
  // heure par IP (un compte ne coûte rien : N comptes depuis une même machine ne multiplient pas la facture).
  if (!(await verifierLimite("pdf", user.id))) {
    return NextResponse.json({ error: "Trop de générations. Patiente une minute." }, { status: 429 });
  }
  if (!(await verifierLimite("pdfHeure", user.id)) || !(await verifierLimite("pdfIp", await clientIp()))) {
    return NextResponse.json({ error: "Trop de générations pour cette heure. Réessaie plus tard." }, { status: 429 });
  }

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const refCode = "AVY-" + String(projet.id).replace(/-/g, "").slice(0, 8).toUpperCase();
  const target = new URL(`/projets/${id}/rapport`, req.url).toString();

  try {
    const pdf = await genererRapportPDF(target, req.headers.get("cookie"));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="AVYORA-${refCode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Génération PDF échouée:", e);
    return NextResponse.json({ error: "Génération du PDF impossible" }, { status: 500 });
  }
}

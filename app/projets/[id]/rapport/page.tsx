import { notFound, redirect } from "next/navigation";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import { RapportPDF } from "@/components/RapportPDF";
import { PrintBar } from "@/components/PrintBar";
import type { Ctx, Selection } from "@/lib/estimateur";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapport d'estimation — AVYORA" };

// Rapport imprimable (print-to-PDF) — réservé aux abonnés Pro, propriétaire du projet.
export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/projets/${id}/rapport`);
  if (!estPro(user)) redirect("/tarifs");

  const projet = await getProjet(id);
  if (!projet) notFound();

  const reponses = projet.reponses as { ctx?: Ctx; sel?: Selection; codePostal?: string };
  const refCode = "AVY-" + String(projet.id).replace(/-/g, "").slice(0, 8).toUpperCase();

  return (
    <div>
      <PrintBar backHref={`/projets/${id}`} />
      <RapportPDF reponses={reponses} nom={projet.nom} refCode={refCode} />
    </div>
  );
}

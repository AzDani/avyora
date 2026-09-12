import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import ProjetActions from "@/components/ProjetActions";
import EstimationResultat from "@/components/EstimationResultat";
import { regionLabel, type Ctx, type Selection } from "@/lib/estimateur";
import RenameTitre from "@/components/RenameTitre";
import TelechargerRapport from "@/components/TelechargerRapport";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const TR = {
  fr: { projets: "Projets" },
  en: { projets: "Projects" },
} as const;

// Fiche projet — 100 % moteur estimateur : en-tête + résultat + téléchargement PDF direct.
export default async function ProjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projet = await getProjet(id);
  if (!projet) notFound();

  const user = await getUser();
  const locale = await getLocale();
  const s = TR[locale];
  const reponses = projet.reponses as { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; codePostal?: string };
  const refCode = "AVY-" + String(projet.id).replace(/-/g, "").slice(0, 8).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {s.projets}
          </Link>
          <RenameTitre id={projet.id} nom={projet.nom} />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="chip capitalize">{projet.type_bien}</span>
            <span className="chip num">{projet.surface} m²</span>
            <span className="chip num">{projet.code_postal}</span>
            <span className="chip">{regionLabel(projet.code_postal)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <TelechargerRapport projetId={String(projet.id)} refCode={refCode} isPro={estPro(user)} />
          <ProjetActions id={projet.id} archived={!!projet.archived} />
        </div>
      </div>

      <EstimationResultat reponses={reponses} projectId={projet.id} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import ProjetActions from "@/components/ProjetActions";
import EstimationResultat from "@/components/EstimationResultat";
import ResultatRapide from "@/components/ResultatRapide";
import ResultatRapideNeuf from "@/components/neuf/ResultatRapideNeuf";
import { regionLabel, estNeuf, type Ctx, type Selection, type Ampleur, type QuiRealise } from "@/lib/estimateur";
import RenameTitre from "@/components/RenameTitre";
import TelechargerRapport from "@/components/TelechargerRapport";
import { getLocale } from "@/lib/i18n/server";
import { libelleTypeBien } from "@/lib/i18n/neuf-commun";
import PastillesProjet from "@/components/PastillesProjet";
import { dict } from "@/lib/i18n/dictionaries";
import { FEATURES } from "@/lib/features";
import { planDuProjet, type LienPlan } from "@/lib/plans/data";
import PlanRelie from "@/components/plans/PlanRelie";
import { listDepenses } from "@/lib/data/depenses";

export const dynamic = "force-dynamic";

/** Le plan dont ce projet est né (C8). Interrupteur éteint : aucune requête. Une panne ne casse jamais la fiche. */
async function lienPlan(projectId: string): Promise<LienPlan | null> {
  if (!FEATURES.plans) return null;
  try {
    return await planDuProjet(projectId);
  } catch {
    return null;
  }
}

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
  const reponses = projet.reponses as { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; codePostal?: string; mode?: string; ampleur?: Ampleur; qui?: QuiRealise };
  const isRapide = reponses.mode === "rapide";
  const neuf = estNeuf(reponses.ctx);
  const refCode = "AVY-" + String(projet.id).replace(/-/g, "").slice(0, 8).toUpperCase();
  const lien = await lienPlan(String(projet.id));
  // La zone que le moteur applique à la main-d'œuvre (`regionCoef`), traduite comme dans l'estimateur.
  const zone = regionLabel(projet.code_postal);
  // Dépenses réelles (M5) : sur l'estimation détaillée, pour un compte Pro (pendant la bêta, tout compte confirmé).
  const depenses = !isRapide && estPro(user) ? await listDepenses(String(projet.id)) : undefined;

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
            {/* La nature et le mode d'abord (N14), puis le bien. Neuf : la pastille « Construction neuve »
                dit déjà le type (« Maison neuve » en doublon). */}
            <PastillesProjet nature={neuf ? "neuf" : "reno"} mode={isRapide ? "rapide" : "detaille"} locale={locale} />
            {!neuf && <span className="chip capitalize">{libelleTypeBien(locale, projet.type_bien)}</span>}
            <span className="chip num">{projet.surface} m²</span>
            <span className="chip num">{projet.code_postal}</span>
            <span className="chip">{dict(locale).rapide.zones[zone] ?? zone}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!isRapide && <TelechargerRapport projetId={String(projet.id)} refCode={refCode} isPro={estPro(user)} />}
          <ProjetActions id={projet.id} archived={!!projet.archived} />
        </div>
      </div>

      {lien && (
        <PlanRelie lien={lien} renovation={!neuf} isPro={estPro(user)} locale={locale} />
      )}

      {isRapide
        ? (neuf
          ? <ResultatRapideNeuf reponses={reponses} projectId={projet.id} isPro={estPro(user)} />
          : <ResultatRapide reponses={reponses} projectId={projet.id} isPro={estPro(user)} />)
        : <EstimationResultat reponses={reponses} projectId={projet.id} depenses={depenses} />}
    </div>
  );
}

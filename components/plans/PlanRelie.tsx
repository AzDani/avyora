import Link from "next/link";
import { dictPlans } from "@/lib/i18n/plans";
import { planAChange, type LienPlan } from "@/lib/plans/data";
import type { Locale } from "@/lib/i18n/config";

/**
 * « Mes plans », C8 : sur la fiche d'une estimation née d'un plan, la bannière « Vient de ton plan »
 * et le lien vers l'éditeur. Pour une RÉNOVATION dont le plan a été modifié depuis le dernier cliché
 * (`floor_plans.updated_at > project_plans.updated_at`) : « Ton plan a changé » et « Mettre à jour ».
 *
 * « Mettre à jour » ouvre l'ÉDITEUR (Pro ; sinon Tarifs), pas directement `/projets/depuis-plan/…` : cet
 * écran relit `floor_plans.contrat`, que seul l'éditeur sait calculer et qu'il n'envoie qu'au clic sur
 * « Mettre à jour l'estimation ». Après un changement du dessin, le contrat en base est donc celui
 * d'avant : y aller tout droit réappliquerait l'ancien plan.
 *
 * Le lien porte `&projet={id de cette fiche}` : l'éditeur le recopie sur `/projets/depuis-plan/{plan}?projet=…`,
 * pour que la mise à jour vise CETTE estimation, et non la plus récente des estimations reliées au même plan.
 *
 * Composant serveur : la page ne le rend que si l'interrupteur est allumé ET qu'un lien existe.
 */
export default function PlanRelie({
  lien,
  renovation,
  isPro,
  locale,
}: {
  lien: LienPlan;
  renovation: boolean;
  isPro: boolean;
  locale: Locale;
}) {
  const d = dictPlans(locale);
  const t = d.lien;
  const aChange = renovation && planAChange(lien);
  const planHref = `/plan?id=${encodeURIComponent(lien.planId)}`;
  const majHref = isPro
    ? `${planHref}&projet=${encodeURIComponent(lien.projectId)}`
    : "/tarifs?source=editeur-plan";

  return (
    <section className="rounded-field border border-brand-200 bg-brand-50 p-4" aria-label={t.vientDe} data-plan-relie="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand-600" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
              <path d="M3.5 12h7v8.5M10.5 7.5v1.5M14 12h6.5M14 3.5V9" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{t.vientDe}</p>
            <p className="truncate font-semibold text-ink" title={lien.nom}>{d.commun.cite(lien.nom)}</p>
          </div>
        </div>
        <a href={planHref} className="btn btn-outline py-1.5 text-[13px]">
          {t.ouvrirPlan}
        </a>
      </div>

      {aChange && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-brand-200 pt-3" data-plan-change="">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">{t.aChange}</p>
            <p className="mt-0.5 text-[13px] text-muted">{t.aChangeSous}</p>
          </div>
          {/* Vers l'éditeur (Pro) : <a>, sans préchargement de /plan ; vers Tarifs (gratuit) : Link. */}
          {isPro ? (
            <a href={majHref} className="btn btn-primary py-1.5 text-[13px]">
              {t.mettreAJour}
            </a>
          ) : (
            <Link href={majHref} className="btn btn-primary py-1.5 text-[13px]">
              {t.mettreAJour}
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10.5px] font-semibold">{t.pro}</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

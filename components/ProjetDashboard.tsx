"use client";

import Link from "next/link";
import type { TabId } from "@/components/ProjetWorkspace";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export type DashboardMetrics = {
  estimation: { bas: number; haut: number; median: number; mode: "rapide" | "detaille"; duree: [number, number]; precision: string };
  avancement: { planGenere: boolean; pct: number; faites: number; enCours: number; total: number };
  budget: { aDepenses: boolean; prevu: number; depense: number; prevision: number; depassement: boolean };
  prochainesEtapes: { label: string; tab: TabId; fait: boolean }[];
  infosManquantes: string[];
  recommandations: string[];
  alertes: { niveau: "danger" | "warning" | "info"; texte: string }[];
};

const ALERTE_CLS: Record<string, string> = {
  danger: "border-danger/20 bg-danger-soft text-danger",
  warning: "border-warning/20 bg-warning-soft text-warning",
  info: "border-brand-100 bg-brand-50/60 text-brand-800",
};

export default function ProjetDashboard({
  metrics,
  onNavigate,
  modifierHref,
}: {
  metrics: DashboardMetrics;
  onNavigate: (tab: TabId) => void;
  modifierHref: string;
}) {
  const { estimation: e, avancement: a, budget: b } = metrics;
  const restantes = metrics.prochainesEtapes.filter((s) => !s.fait);

  return (
    <div className="space-y-4">
      {/* Alertes prioritaires */}
      {metrics.alertes.length > 0 && (
        <div className="space-y-2">
          {metrics.alertes.map((al, i) => (
            <div key={i} className={`flex items-start gap-2.5 rounded-field border px-3.5 py-2.5 text-sm ${ALERTE_CLS[al.niveau]}`}>
              <span aria-hidden className="mt-px shrink-0">{al.niveau === "danger" ? "⚠" : al.niveau === "warning" ? "⚠" : "ⓘ"}</span>
              <span className="leading-relaxed">{al.texte}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trois cartes clés */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Estimation */}
        <button onClick={() => onNavigate("estimation")} className="card card-interactive p-5 text-left">
          <p className="eyebrow">Estimation travaux</p>
          <p className="data mt-1.5 text-lg font-semibold text-ink">
            {euros(e.bas)} <span className="text-faint">–</span> {euros(e.haut)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {e.precision} · <span className="num">{e.duree[0]}–{e.duree[1]} sem.</span>
          </p>
        </button>

        {/* Avancement */}
        <button onClick={() => onNavigate("chantier")} className="card card-interactive p-5 text-left">
          <p className="eyebrow">Avancement chantier</p>
          {a.planGenere ? (
            <>
              <p className="data mt-1.5 text-lg font-semibold text-ink">{a.pct} %</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${a.pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                <span className="num">{a.faites}</span>/<span className="num">{a.total}</span> tâches
                {a.enCours > 0 && <> · <span className="num">{a.enCours}</span> en cours</>}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted">Plan de chantier non généré.</p>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600">Générer le plan →</span>
            </>
          )}
        </button>

        {/* Budget */}
        <button onClick={() => onNavigate("chantier")} className="card card-interactive p-5 text-left">
          <p className="eyebrow">Budget</p>
          {b.aDepenses ? (
            <>
              <p className="data mt-1.5 text-lg font-semibold text-ink">{euros(b.depense)}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-all ${b.depassement ? "bg-danger" : "bg-positive"}`}
                  style={{ width: `${Math.min(100, b.prevu > 0 ? Math.round((b.depense / b.prevu) * 100) : 0)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                dépensé sur <span className="num">{euros(b.prevu)}</span> prévus ·{" "}
                <span className={b.depassement ? "font-medium text-danger" : "text-muted"}>
                  prévision {euros(b.prevision)}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted">Budget prévu <span className="data font-semibold text-ink">{euros(b.prevu)}</span>.</p>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600">Suivre les dépenses →</span>
            </>
          )}
        </button>
      </div>

      {/* Prochaines étapes + infos manquantes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Prochaines étapes</h2>
            {restantes.length > 0 && <span className="badge-brand">{restantes.length}</span>}
          </div>
          <ul className="space-y-1">
            {metrics.prochainesEtapes.map((s, i) => (
              <li key={i}>
                {s.fait ? (
                  <div className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-positive-soft text-positive">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="line-through">{s.label}</span>
                  </div>
                ) : (
                  <button onClick={() => onNavigate(s.tab)} className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink transition-colors hover:bg-brand-50">
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-line-strong" />
                    <span className="flex-1 font-medium">{s.label}</span>
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true"><path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Informations à compléter</h2>
          {metrics.infosManquantes.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="text-positive">✓</span> Ton questionnaire est complet — estimation au plus juste.
            </p>
          ) : (
            <>
              <ul className="space-y-2 text-sm text-muted">
                {metrics.infosManquantes.map((m, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <Link href={modifierHref} className="btn btn-outline mt-4 py-2 text-[13px]">
                Compléter le questionnaire
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recommandations */}
      {metrics.recommandations.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5a5 5 0 0 0-3 9v1.5h6V11.5a5 5 0 0 0-3-9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 16h4M8.5 18h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </span>
            <div>
              <p className="eyebrow">Recommandations</p>
              <h2 className="text-[15px] font-semibold text-ink">L&apos;expertise à connaître</h2>
            </div>
          </div>
          <ul className="space-y-2.5 text-sm leading-relaxed text-muted">
            {metrics.recommandations.slice(0, 3).map((c, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          {metrics.recommandations.length > 3 && (
            <button onClick={() => onNavigate("estimation")} className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">
              Voir les {metrics.recommandations.length} recommandations →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

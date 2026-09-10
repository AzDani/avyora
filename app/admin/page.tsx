import { listInscrits, statsGlobales, type Repartition } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Kpi({ k, v, d, good }: { k: string; v: string; d?: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{k}</div>
      <div className="num mt-2 text-[30px] font-bold tracking-tight text-ink">{v}</div>
      {d && <div className={"mt-1.5 text-[12.5px] font-semibold " + (good ? "text-[#0f9d6b]" : "text-faint")}>{d}</div>}
    </div>
  );
}

function Bars({ titre, hint, data, color }: { titre: string; hint: string; data: Repartition; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <h3 className="text-[15px] font-semibold text-ink">{titre}</h3>
      <p className="mb-4 mt-0.5 text-[12.5px] text-faint">{hint}</p>
      {data.length === 0 ? (
        <p className="text-[13px] text-faint">Aucune donnée pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((d) => (
            <div key={d.label} className="grid grid-cols-[130px_1fr_36px] items-center gap-2.5 text-[13px]">
              <span className="truncate text-muted">{d.label}</span>
              <span className="h-2.5 overflow-hidden rounded-md bg-surface-2">
                <span className="block h-full rounded-md" style={{ width: `${(d.n / max) * 100}%`, background: color }} />
              </span>
              <span className="num text-right font-semibold text-ink">{d.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminOverview() {
  const inscrits = await listInscrits();
  const s = statsGlobales(inscrits);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Kpi k="Inscrits" v={String(s.totalInscrits)} d={`+${s.nouveaux30j} sur 30 j`} good={s.nouveaux30j > 0} />
        <Kpi k="Projets créés" v={String(s.totalProjets)} d={s.budgetMoyen != null ? `budget moyen ${euros(s.budgetMoyen)}` : undefined} />
        <Kpi k="Comptes Pro" v={String(s.totalPro)} d="mode test Stripe" />
        <Kpi k="Onboarding complété" v={`${s.onboardingPct} %`} d={`${inscrits.filter((i) => i.onboardingFait).length} / ${s.totalInscrits}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bars titre="Type d'inscrit" hint="« Tu es… » rempli à l'inscription" data={s.parType} color="#7c3aed" />
        <Bars titre="Canal d'acquisition" hint="D'où ils viennent → où pousser le marketing" data={s.parCanal} color="#e05299" />
        <Bars titre="Tranche d'âge" hint="Profil démographique" data={s.parAge} color="#4f46e5" />
        <Bars titre="Top régions" hint="Répartition géographique" data={s.parRegion} color="#0ea5a4" />
      </div>
    </div>
  );
}

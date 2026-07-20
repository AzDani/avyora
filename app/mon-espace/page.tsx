import Link from "next/link";
import { getUser } from "@/lib/auth";
import { chargerEspacePerso, type ProjetStatut } from "@/lib/data/dashboard";
import ClaimDraft from "@/components/ClaimDraft";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon espace — AVYORA" };

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const ICONES: Record<string, string> = { maison: "M3 9.5 10 3l7 6.5", appartement: "M4 17V5h12v12", immeuble: "M4 17V4h5v13m0 0h7V8H9" };

export default async function MonEspacePage() {
  const user = await getUser();
  const prenom = (user?.user_metadata?.nom as string) || user?.email?.split("@")[0] || "";
  const { actifs, nbArchives, kpi } = await chargerEspacePerso();

  return (
    <div className="space-y-8">
      <ClaimDraft />

      <header className="animate-rise">
        <p className="eyebrow">Espace personnel</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Bonjour{prenom ? ` ${prenom}` : ""} 👋
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {actifs.length > 0
            ? "Voici l'avancement de tes projets."
            : "Lance ta première estimation — elle sera enregistrée ici."}
        </p>
        <Link href="/mon-espace/compte" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
          Mon compte &amp; confidentialité →
        </Link>
      </header>

      {actifs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Projets actifs" value={`${kpi.nbActifs}`} />
          <KpiTile label="Valeur travaux" value={`${euros(kpi.sumBas)} – ${euros(kpi.sumHaut)}`} accent />
          <KpiTile label="Surface totale" value={`${kpi.sumSurface.toLocaleString("fr-FR")} m²`} />
          <KpiTile label="Devis analysés" value={`${kpi.nbDevisTotal}`} />
        </div>
      )}

      {actifs.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-panel bg-brand-50 text-brand-600">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Aucun projet pour l&apos;instant</h2>
            <p className="mt-1 text-sm text-muted">Estime tes travaux en 2 minutes — c&apos;est gratuit.</p>
          </div>
          <Link href="/projets/nouveau" className="btn btn-primary py-2.5">Estimer mon premier projet</Link>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-ink">Mes projets</h2>
            <Link href="/projets" className="text-sm font-medium text-brand-600 hover:underline">
              Vue portefeuille →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {actifs.map((s) => (
              <ProjetCard key={s.projet.id} s={s} />
            ))}
          </div>
          {nbArchives > 0 && (
            <p className="text-sm text-muted">
              {nbArchives} projet{nbArchives > 1 ? "s" : ""} archivé{nbArchives > 1 ? "s" : ""} —{" "}
              <Link href="/projets" className="font-medium text-brand-600 hover:underline">voir dans le portefeuille</Link>.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-xs font-medium text-faint">{label}</div>
      <div className={`data mt-1 text-[15px] font-semibold ${accent ? "text-brand-700" : "text-ink"}`}>{value}</div>
    </div>
  );
}

const JALONS: { cle: keyof ProjetStatut["avancement"]; label: string }[] = [
  { cle: "metre", label: "Métré" },
  { cle: "chantier", label: "Chantier" },
  { cle: "devis", label: "Devis" },
  { cle: "rentabilite", label: "Rentabilité" },
];

function ProjetCard({ s }: { s: ProjetStatut }) {
  const p = s.projet;
  return (
    <Link href={`/projets/${p.id}`} className="card card-interactive group flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-brand-50 text-brand-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={ICONES[p.type_bien] ?? ICONES.appartement} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{p.nom}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="chip capitalize">{p.type_bien}</span>
              <span className="chip num">{p.surface} m²</span>
              <span className="chip num">{p.code_postal}</span>
            </div>
          </div>
        </div>
        {s.nbDevis > 0 && <span className="chip shrink-0">{s.nbDevis} devis</span>}
      </div>

      <div>
        <p className="eyebrow">Estimation travaux</p>
        <p className="data mt-0.5 text-lg font-semibold text-ink">
          {euros(s.totalBas)} <span className="text-faint">–</span> {euros(s.totalHaut)}
        </p>
      </div>

      {/* Avancement : barre + jalons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-faint">Avancement</span>
          <span className="num font-medium text-muted">{s.pctAvancement}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(6, s.pctAvancement)}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {JALONS.map((j) => {
            const ok = s.avancement[j.cle];
            return (
              <span
                key={j.cle}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${ok ? "bg-positive-soft text-positive" : "bg-surface-2 text-faint"}`}
              >
                {ok ? "✓" : "○"} {j.label}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevisDetail } from "@/lib/data/projects";
import { corpsLabel } from "@/lib/estimation";
import type { AnalyseDevis } from "@/lib/devis";

export const dynamic = "force-dynamic";

type LigneAvecVerdict = AnalyseDevis["lignes"][number] & {
  verdict?: string;
  commentaire?: string;
};

const VERDICTS: Record<string, { label: string; cls: string }> = {
  bas: { label: "Prix bas", cls: "bg-brand-50 text-brand-700" },
  marche: { label: "Dans le marché", cls: "bg-positive-soft text-positive" },
  eleve: { label: "Élevé", cls: "bg-danger-soft text-danger" },
  inconnu: { label: "Non comparé", cls: "bg-surface-2 text-faint" },
};

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DevisPage({
  params,
}: {
  params: Promise<{ id: string; devisId: string }>;
}) {
  const { id, devisId } = await params;
  const devis = await getDevisDetail(id, devisId);
  if (!devis) notFound();

  const a = devis.analyse as AnalyseDevis;
  const noteCouleur =
    a.note >= 70 ? "text-[#34d399]" : a.note >= 45 ? "text-[#fbbf24]" : "text-[#f87171]";

  return (
    <div className="space-y-6">
      <Link
        href={`/projets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour au projet
      </Link>

      <section className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[#1E1B4B] via-[#241f5e] to-[#191640] p-6 text-white shadow-hero">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#7C3AED]/25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C4B5FD]">Analyse du devis</p>
            <h1 className="mt-1.5 text-xl font-semibold">{devis.nom}</h1>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100/80">{a.resume}</p>
            {a.totalDetecte != null && (
              <p className="num mt-2 text-xs text-indigo-200/60">Total détecté : {euros(a.totalDetecte)}</p>
            )}
          </div>
          <div className="shrink-0 text-center">
            <div className={`data text-4xl font-bold ${noteCouleur}`}>{a.note}</div>
            <div className="text-xs text-indigo-200/50">/100</div>
          </div>
        </div>
        {a.mode === "regles" && (
          <p className="relative mt-4 rounded-field border border-amber-400/30 p-2.5 text-xs text-amber-300/90">
            Analyse par règles (sans IA). Pour l&apos;analyse IA complète — postes normalisés, comparaison prix,
            oublis — ajoute <code className="font-mono">ANTHROPIC_API_KEY</code> dans{" "}
            <code className="font-mono">.env.local</code> et relance le serveur.
          </p>
        )}
      </section>

      {a.alertes.length > 0 && (
        <section className="card border-danger/20 bg-danger-soft/50 p-5">
          <h2 className="mb-2 font-semibold text-ink">Points de vigilance ({a.alertes.length})</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            {a.alertes.map((al, i) => (
              <li key={i}>{al}</li>
            ))}
          </ul>
        </section>
      )}

      {a.pointsPositifs.length > 0 && (
        <section className="card border-positive/20 bg-positive-soft/50 p-5">
          <h2 className="mb-2 font-semibold text-ink">Points positifs</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            {a.pointsPositifs.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {a.questions.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-2 font-semibold text-ink">Questions à poser à l&apos;artisan avant de signer</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
            {a.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </section>
      )}

      {a.lignes.length > 0 && (
        <section className="card overflow-hidden p-0">
          <h2 className="p-4 pb-0 font-semibold text-ink">Lignes détectées ({a.lignes.length})</h2>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-faint">
                  <th className="px-4 py-2 font-medium">Libellé</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                  <th className="px-4 py-2 text-right font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {(a.lignes as LigneAvecVerdict[]).map((l, i) => {
                  const v = l.verdict ? VERDICTS[l.verdict] : null;
                  return (
                    <tr key={i} className="border-b border-line/60 align-top last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{l.libelle}</div>
                        <div className="text-xs text-faint">
                          {l.corpsEtat ? corpsLabel(l.corpsEtat) : ""}
                          {l.commentaire ? ` — ${l.commentaire}` : ""}
                        </div>
                      </td>
                      <td className="data whitespace-nowrap px-4 py-2.5 text-right font-semibold text-ink">
                        {l.montant != null ? euros(l.montant) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {v && (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${v.cls}`}>
                            {v.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

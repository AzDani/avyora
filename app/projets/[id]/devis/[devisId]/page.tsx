import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { corpsLabel } from "@/lib/estimation";
import type { AnalyseDevis } from "@/lib/devis";

export const dynamic = "force-dynamic";

type QuoteRow = {
  id: number;
  project_id: number;
  nom: string;
  analyse_json: string;
  created_at: string;
};

type LigneAvecVerdict = AnalyseDevis["lignes"][number] & {
  verdict?: string;
  commentaire?: string;
};

const VERDICTS: Record<string, { label: string; cls: string }> = {
  bas: { label: "Prix bas", cls: "bg-sky-100 text-sky-800" },
  marche: { label: "Dans le marché", cls: "bg-emerald-100 text-emerald-800" },
  eleve: { label: "Élevé", cls: "bg-red-100 text-red-800" },
  inconnu: { label: "Non comparé", cls: "bg-slate-100 text-slate-500" },
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
  const devis = db
    .prepare("SELECT * FROM quotes WHERE id = ? AND project_id = ?")
    .get(devisId, id) as QuoteRow | undefined;
  if (!devis) notFound();

  const a = JSON.parse(devis.analyse_json) as AnalyseDevis;
  const noteCouleur =
    a.note >= 70 ? "text-emerald-400" : a.note >= 45 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <Link href={`/projets/${id}`} className="text-sm text-slate-500 hover:underline">
        ← Retour au projet
      </Link>

      <section className="rounded-xl bg-[#1E1B4B] text-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{devis.nom}</h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{a.resume}</p>
            {a.totalDetecte != null && (
              <p className="text-xs text-slate-400 mt-2">
                Total détecté : {euros(a.totalDetecte)}
              </p>
            )}
          </div>
          <div className="text-center shrink-0">
            <div className={`text-4xl font-bold ${noteCouleur}`}>{a.note}</div>
            <div className="text-xs text-slate-400">/100</div>
          </div>
        </div>
        {a.mode === "regles" && (
          <p className="mt-4 text-xs text-amber-300/90 border border-amber-400/30 rounded-lg p-2.5">
            Analyse par règles (sans IA). Pour l&apos;analyse IA complète — postes
            normalisés, comparaison prix, oublis — ajoute{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> dans{" "}
            <code className="font-mono">.env.local</code> et relance le serveur.
          </p>
        )}
      </section>

      {a.alertes.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-medium text-red-900 mb-2">
            Points de vigilance ({a.alertes.length})
          </h2>
          <ul className="space-y-1.5 text-sm text-red-800 list-disc pl-5">
            {a.alertes.map((al, i) => (
              <li key={i}>{al}</li>
            ))}
          </ul>
        </section>
      )}

      {a.pointsPositifs.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-medium text-emerald-900 mb-2">Points positifs</h2>
          <ul className="space-y-1.5 text-sm text-emerald-800 list-disc pl-5">
            {a.pointsPositifs.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {a.questions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-2">
            Questions à poser à l&apos;artisan avant de signer
          </h2>
          <ol className="space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
            {a.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </section>
      )}

      {a.lignes.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <h2 className="font-medium p-4 pb-0">
            Lignes détectées ({a.lignes.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Libellé</th>
                  <th className="px-4 py-2 font-medium text-right">Montant</th>
                  <th className="px-4 py-2 font-medium text-right">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {(a.lignes as LigneAvecVerdict[]).map((l, i) => {
                  const v = l.verdict ? VERDICTS[l.verdict] : null;
                  return (
                    <tr key={i} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-2">
                        <div>{l.libelle}</div>
                        <div className="text-xs text-slate-400">
                          {l.corpsEtat ? corpsLabel(l.corpsEtat) : ""}
                          {l.commentaire ? ` — ${l.commentaire}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {l.montant != null ? euros(l.montant) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {v && (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${v.cls}`}
                          >
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

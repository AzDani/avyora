import type { GroupeMateriaux } from "@/lib/materiaux";

/* Module 9 — rendu serveur pur, replié par défaut. */
export default function MateriauxListe({ groupes }: { groupes: GroupeMateriaux[] }) {
  if (groupes.length === 0) return null;
  const total = groupes.reduce((s, g) => s + g.items.length, 0);
  return (
    <section className="card p-5">
      <details className="group">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-faint transition-transform group-open:rotate-90" aria-hidden="true">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Liste matériaux &amp; fournitures
          </span>
          <span className="num text-xs text-faint">{total} références</span>
        </summary>
        <p className="mt-2 pl-6 text-xs text-faint">
          Quantités indicatives, chutes incluses, arrondies en conditionnements fournisseur — à valider avant commande.
        </p>
        <div className="mt-4 space-y-5 pl-6">
          {groupes.map((g) => (
            <div key={g.corps}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">{g.corps}</div>
              <ul className="divide-y divide-line text-sm">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-muted">
                      {it.nom}
                      {it.detail && <span className="text-faint"> — {it.detail}</span>}
                    </span>
                    <span className="num shrink-0 whitespace-nowrap font-semibold text-ink">
                      {it.quantite} {it.unite}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

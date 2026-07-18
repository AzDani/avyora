import type { GroupeMateriaux } from "@/lib/materiaux";

/* Module 9 — rendu serveur pur, replié par défaut. */
export default function MateriauxListe({ groupes }: { groupes: GroupeMateriaux[] }) {
  if (groupes.length === 0) return null;
  const total = groupes.reduce((s, g) => s + g.items.length, 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <details>
        <summary className="cursor-pointer select-none flex items-center justify-between">
          <span className="font-medium">Liste matériaux & fournitures</span>
          <span className="text-xs text-slate-500">
            {total} références générées depuis ton estimation
          </span>
        </summary>
        <p className="text-xs text-slate-500 mt-2">
          Quantités indicatives, chutes incluses, arrondies en conditionnements
          fournisseur — à valider avant commande.
        </p>
        <div className="mt-3 space-y-4">
          {groupes.map((g) => (
            <div key={g.corps}>
              <div className="text-sm font-semibold text-slate-700 mb-1.5">{g.corps}</div>
              <ul className="divide-y divide-slate-100 text-sm">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span>
                      {it.nom}
                      {it.detail && (
                        <span className="text-xs text-slate-400"> — {it.detail}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium whitespace-nowrap">
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

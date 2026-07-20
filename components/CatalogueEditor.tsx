"use client";

import { useState } from "react";
import type { KbCategorie, KbPoste } from "@/lib/kb-types";

const pastille = (sel: boolean) =>
  `inline-flex items-center gap-1.5 rounded-field border px-3 py-1.5 text-sm transition-all ${
    sel
      ? "border-brand-500 bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-500/25"
      : "border-line-strong bg-surface font-medium text-muted hover:border-brand-300 hover:text-ink"
  }`;

type Prix = { min: number; moy: number; max: number };

export default function CatalogueEditor({ categories, postes }: { categories: KbCategorie[]; postes: KbPoste[] }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [rows, setRows] = useState<Record<string, Prix>>(() =>
    Object.fromEntries(postes.map((p) => [p.id, { min: p.prix_min, moy: p.prix_moy, max: p.prix_max }]))
  );
  const [etat, setEtat] = useState<Record<string, "saving" | "saved" | "error">>({});

  const visibles = postes.filter((p) => p.categorie_id === catId);
  const setCell = (id: string, k: keyof Prix, val: number) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], [k]: val } }));

  async function save(p: KbPoste) {
    const v = rows[p.id];
    if (v.min === p.prix_min && v.moy === p.prix_moy && v.max === p.prix_max) return;
    setEtat((e) => ({ ...e, [p.id]: "saving" }));
    const res = await fetch("/api/admin/referentiel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, prix_min: v.min, prix_moy: v.moy, prix_max: v.max }),
    });
    if (res.ok) {
      p.prix_min = v.min; p.prix_moy = v.moy; p.prix_max = v.max;
      setEtat((e) => ({ ...e, [p.id]: "saved" }));
      setTimeout(() => setEtat((e) => { const n = { ...e }; delete n[p.id]; return n; }), 1800);
    } else {
      setEtat((e) => ({ ...e, [p.id]: "error" }));
    }
  }

  return (
    <div className="space-y-4">
      {/* Corps d'état */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {categories.map((c) => {
            const n = postes.filter((p) => p.categorie_id === c.id).length;
            return (
              <button key={c.id} onClick={() => setCatId(c.id)} className={pastille(c.id === catId)}>
                {c.nom} <span className="num opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table des postes */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-faint">
                <th className="px-4 py-2.5 font-medium">Poste</th>
                <th className="px-3 py-2.5 font-medium">Unité</th>
                <th className="px-3 py-2.5 text-right font-medium">Prix min</th>
                <th className="px-3 py-2.5 text-right font-medium">Prix moyen</th>
                <th className="px-3 py-2.5 text-right font-medium">Prix max</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const v = rows[p.id];
                const st = etat[p.id];
                return (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink">{p.nom}</div>
                      {p.description && <div className="mt-0.5 max-w-md text-xs text-faint">{p.description}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{p.unite}</td>
                    {(["min", "moy", "max"] as (keyof Prix)[]).map((k) => (
                      <td key={k} className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          className="input num w-24 py-1.5 text-right"
                          value={v[k]}
                          onChange={(e) => setCell(p.id, k, Number(e.target.value) || 0)}
                          onBlur={() => save(p)}
                        />
                      </td>
                    ))}
                    <td className="w-8 px-3 py-2.5 text-right">
                      {st === "saving" && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-400" />}
                      {st === "saved" && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline text-positive" aria-hidden="true">
                          <path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {st === "error" && <span className="text-xs text-danger">!</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted">
        <span className="mt-px text-brand-500">ⓘ</span>
        Modifier un prix régénère le référentiel du moteur : toutes les estimations utilisent
        immédiatement la nouvelle valeur (min ≤ moyen ≤ max requis).
      </p>
    </div>
  );
}

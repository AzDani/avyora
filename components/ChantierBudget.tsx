"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Budget, TaskRow } from "@/lib/budget";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUTS: { value: TaskRow["statut"]; label: string; cls: string }[] = [
  { value: "a_faire", label: "À faire", cls: "bg-slate-100 text-slate-600" },
  { value: "en_cours", label: "En cours", cls: "bg-amber-100 text-amber-800" },
  { value: "fait", label: "Fait ✓", cls: "bg-emerald-100 text-emerald-800" },
];

export default function ChantierBudget({
  projectId,
  budget,
  taches,
  avancement,
  corpsOptions,
  depenses,
}: {
  projectId: number;
  budget: Budget;
  taches: TaskRow[];
  avancement: number;
  corpsOptions: { value: string; label: string }[];
  depenses: { id: number; corps_etat: string; libelle: string; montant: number }[];
}) {
  const router = useRouter();
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [corps, setCorps] = useState(corpsOptions[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [afficherDepenses, setAfficherDepenses] = useState(false);

  async function ajouterDepense() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/depenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corpsEtat: corps, libelle, montant: Number(montant) }),
    });
    setLibelle("");
    setMontant("");
    setBusy(false);
    router.refresh();
  }

  async function supprimerDepense(depId: number) {
    await fetch(`/api/projects/${projectId}/depenses?dep=${depId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  async function genererPlan() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/chantier`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function changerStatut(t: TaskRow) {
    const idx = STATUTS.findIndex((s) => s.value === t.statut);
    const suivant = STATUTS[(idx + 1) % STATUTS.length].value;
    await fetch(`/api/projects/${projectId}/chantier`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: t.id, statut: suivant }),
    });
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Chantier & budget</h2>
        {taches.length > 0 && (
          <span className="text-sm text-slate-500">
            Avancement : <span className="font-semibold text-slate-900">{avancement} %</span>
          </span>
        )}
      </div>

      {/* Alertes proactives (module 5) */}
      {budget.alertes.length > 0 && (
        <div className="space-y-2">
          {budget.alertes.map((a, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              ⚠ {a}
            </div>
          ))}
        </div>
      )}

      {/* Budget prévu vs réel */}
      <div>
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Budget prévu</div>
            <div className="font-semibold mt-0.5">{euros(budget.totalPrevu)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Dépensé</div>
            <div className="font-semibold mt-0.5">{euros(budget.totalReel)}</div>
          </div>
          <div
            className={`rounded-lg p-3 ${
              budget.previsionFinale > budget.totalPrevu ? "bg-red-50" : "bg-emerald-50"
            }`}
          >
            <div className="text-xs text-slate-500">Prévision finale</div>
            <div
              className={`font-semibold mt-0.5 ${
                budget.previsionFinale > budget.totalPrevu
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {euros(budget.previsionFinale)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {budget.lignes.map((l) => (
            <div key={l.corpsEtat}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium">{l.label}</span>
                <span className="text-slate-500">
                  {euros(l.reel)} / {euros(l.prevu)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    l.statut === "depasse"
                      ? "bg-red-500"
                      : l.statut === "attention"
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.round(l.ratio * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saisie dépense */}
      <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
        <div className="text-sm font-medium">Ajouter une dépense réelle</div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
          >
            {corpsOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 min-w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Libellé (ex. : acompte électricien)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <input
            type="number"
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Montant €"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
          <button
            onClick={ajouterDepense}
            disabled={busy || !libelle.trim() || !(Number(montant) > 0)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white font-medium disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
        {depenses.length > 0 && (
          <button
            onClick={() => setAfficherDepenses(!afficherDepenses)}
            className="text-xs text-slate-500 underline"
          >
            {afficherDepenses ? "Masquer" : "Voir"} les {depenses.length} dépenses
          </button>
        )}
        {afficherDepenses && (
          <ul className="text-sm divide-y divide-slate-100">
            {depenses.map((d) => (
              <li key={d.id} className="flex justify-between items-center py-1.5">
                <span>{d.libelle}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{euros(d.montant)}</span>
                  <button
                    onClick={() => supprimerDepense(d.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Plan de chantier (module 7) */}
      <div>
        <div className="text-sm font-medium mb-2">Plan de chantier</div>
        {taches.length === 0 ? (
          <button
            onClick={genererPlan}
            disabled={busy}
            className="rounded-lg bg-[#4F46E5] px-4 py-2.5 text-sm text-white font-medium disabled:opacity-50"
          >
            Générer le plan depuis l&apos;estimation
          </button>
        ) : (
          <>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${avancement}%` }}
              />
            </div>
            <ul className="space-y-1.5">
              {taches.map((t) => {
                const s = STATUTS.find((x) => x.value === t.statut)!;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span
                      className={`text-sm ${
                        t.statut === "fait" ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {t.titre}
                    </span>
                    <button
                      onClick={() => changerStatut(t)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}
                      title="Cliquer pour changer le statut"
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

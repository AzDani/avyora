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
  { value: "a_faire", label: "À faire", cls: "bg-surface-2 text-muted" },
  { value: "en_cours", label: "En cours", cls: "bg-warning-soft text-warning" },
  { value: "fait", label: "Fait ✓", cls: "bg-positive-soft text-positive" },
];

export default function ChantierBudget({
  projectId,
  budget,
  taches,
  avancement,
  corpsOptions,
  depenses,
}: {
  projectId: string;
  budget: Budget;
  taches: TaskRow[];
  avancement: number;
  corpsOptions: { value: string; label: string }[];
  depenses: { id: number | string; corps_etat: string; libelle: string; montant: number }[];
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

  async function supprimerDepense(depId: number | string) {
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
    <section className="card space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Chantier &amp; budget</h2>
        {taches.length > 0 && (
          <span className="text-sm text-muted">
            Avancement : <span className="data font-semibold text-ink">{avancement} %</span>
          </span>
        )}
      </div>

      {/* Alertes proactives (module 5) */}
      {budget.alertes.length > 0 && (
        <div className="space-y-2">
          {budget.alertes.map((a, i) => (
            <div key={i} className="rounded-field border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning">
              ⚠ {a}
            </div>
          ))}
        </div>
      )}

      {/* Budget prévu vs réel */}
      <div>
        <div className="mb-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-field bg-surface-2 p-3.5">
            <div className="text-xs text-faint">Budget prévu</div>
            <div className="data mt-1 font-semibold text-ink">{euros(budget.totalPrevu)}</div>
          </div>
          <div className="rounded-field bg-surface-2 p-3.5">
            <div className="text-xs text-faint">Dépensé</div>
            <div className="data mt-1 font-semibold text-ink">{euros(budget.totalReel)}</div>
          </div>
          <div className={`rounded-field p-3.5 ${budget.previsionFinale > budget.totalPrevu ? "bg-danger-soft" : "bg-positive-soft"}`}>
            <div className="text-xs text-faint">Prévision finale</div>
            <div className={`data mt-1 font-semibold ${budget.previsionFinale > budget.totalPrevu ? "text-danger" : "text-positive"}`}>
              {euros(budget.previsionFinale)}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {budget.lignes.map((l) => (
            <div key={l.corpsEtat}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-ink">{l.label}</span>
                <span className="num text-faint">
                  {euros(l.reel)} / {euros(l.prevu)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-all ${
                    l.statut === "depasse" ? "bg-danger" : l.statut === "attention" ? "bg-warning" : "bg-positive"
                  }`}
                  style={{ width: `${Math.min(100, Math.round(l.ratio * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saisie dépense */}
      <div className="space-y-2.5 rounded-field border border-dashed border-line-strong bg-surface-2/60 p-3.5">
        <div className="text-sm font-semibold text-ink">Ajouter une dépense réelle</div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={corps} onChange={(e) => setCorps(e.target.value)}>
            {corpsOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="input min-w-32 flex-1"
            placeholder="Libellé (ex. : acompte électricien)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <input
            type="number"
            className="input num w-28"
            placeholder="Montant €"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
          <button
            onClick={ajouterDepense}
            disabled={busy || !libelle.trim() || !(Number(montant) > 0)}
            className="btn btn-primary py-2"
          >
            Ajouter
          </button>
        </div>
        {depenses.length > 0 && (
          <button
            onClick={() => setAfficherDepenses(!afficherDepenses)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {afficherDepenses ? "Masquer" : "Voir"} les {depenses.length} dépenses
          </button>
        )}
        {afficherDepenses && (
          <ul className="divide-y divide-line text-sm">
            {depenses.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-1.5">
                <span className="text-muted">{d.libelle}</span>
                <span className="flex items-center gap-3">
                  <span className="data font-semibold text-ink">{euros(d.montant)}</span>
                  <button
                    onClick={() => supprimerDepense(d.id)}
                    className="text-faint transition-colors hover:text-danger"
                    aria-label="Supprimer la dépense"
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
        <div className="mb-2 text-sm font-semibold text-ink">Plan de chantier</div>
        {taches.length === 0 ? (
          <button onClick={genererPlan} disabled={busy} className="btn btn-primary py-2.5">
            Générer le plan depuis l&apos;estimation
          </button>
        ) : (
          <>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${avancement}%` }} />
            </div>
            <ul className="space-y-1.5">
              {taches.map((t) => {
                const s = STATUTS.find((x) => x.value === t.statut)!;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2">
                    <span className={`text-sm ${t.statut === "fait" ? "text-faint line-through" : "text-ink"}`}>{t.titre}</span>
                    <button
                      onClick={() => changerStatut(t)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${s.cls}`}
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

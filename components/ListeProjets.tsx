"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ProjetCarte = {
  id: number;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  nbDevis: number;
  totalBas: number;
  totalHaut: number;
  archived: boolean;
};

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ListeProjets({
  projets,
  archives,
}: {
  projets: ProjetCarte[];
  archives: ProjetCarte[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [modeSelection, setModeSelection] = useState(false);
  const [busy, setBusy] = useState(false);

  const archiveIds = new Set(archives.map((a) => a.id));
  const toutArchive = selection.size > 0 && [...selection].every((id) => archiveIds.has(id));

  function toggle(id: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function supprimerSelection() {
    if (
      !confirm(
        `Supprimer définitivement ${selection.size} projet${selection.size > 1 ? "s" : ""} et tout leur contenu (devis, dépenses, métré) ?`
      )
    )
      return;
    setBusy(true);
    await Promise.all(
      [...selection].map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" }))
    );
    setSelection(new Set());
    setModeSelection(false);
    setBusy(false);
    router.refresh();
  }

  async function archiverSelection(archived: boolean) {
    setBusy(true);
    await Promise.all(
      [...selection].map((id) =>
        fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived }),
        })
      )
    );
    setSelection(new Set());
    setModeSelection(false);
    setBusy(false);
    router.refresh();
  }

  function Carte({ p }: { p: ProjetCarte }) {
    const coche = selection.has(p.id);
    const contenu = (
      <div className="flex items-center gap-3">
        {modeSelection && (
          <span
            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center text-[11px] font-bold ${
              coche
                ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                : "border-slate-300 text-transparent"
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
        )}
        <div className="flex-1 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{p.nom}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {p.type_bien} · {p.surface} m² · {p.code_postal} · {p.nbDevis} devis
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-slate-900">
              {euros(p.totalBas)} – {euros(p.totalHaut)}
            </div>
            <div className="text-xs text-slate-500">travaux estimés</div>
          </div>
        </div>
      </div>
    );
    const classes = `block rounded-xl border bg-white p-4 transition-colors ${
      coche
        ? "border-[#4F46E5] ring-1 ring-[#4F46E5]"
        : p.archived
          ? "border-slate-100 opacity-60 hover:opacity-100"
          : "border-slate-200 hover:border-indigo-400"
    }`;
    if (modeSelection) {
      return (
        <button type="button" onClick={() => toggle(p.id)} className={`${classes} w-full text-left cursor-pointer`}>
          {contenu}
        </button>
      );
    }
    return (
      <Link href={`/projets/${p.id}`} className={classes}>
        {contenu}
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Mes projets</h2>
        <div className="flex items-center gap-2">
          {modeSelection && selection.size > 0 && (
            <>
              {toutArchive ? (
                <button
                  onClick={() => archiverSelection(false)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-indigo-400 disabled:opacity-50"
                >
                  Désarchiver ({selection.size})
                </button>
              ) : (
                <button
                  onClick={() => archiverSelection(true)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-indigo-400 disabled:opacity-50"
                >
                  Archiver ({selection.size})
                </button>
              )}
              <button
                onClick={supprimerSelection}
                disabled={busy}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white font-medium disabled:opacity-50"
              >
                {busy ? "…" : `Supprimer (${selection.size})`}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setModeSelection(!modeSelection);
              setSelection(new Set());
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-indigo-400"
          >
            {modeSelection ? "Annuler" : "Sélectionner"}
          </button>
        </div>
      </div>

      {projets.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun projet pour l&apos;instant. Crée ton premier projet pour obtenir
          une estimation en 2 minutes.
        </p>
      ) : (
        <ul className="space-y-3">
          {projets.map((p) => (
            <li key={p.id}>
              <Carte p={p} />
            </li>
          ))}
        </ul>
      )}

      {archives.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-500 cursor-pointer select-none">
            Projets archivés ({archives.length})
          </summary>
          <ul className="space-y-3 mt-3">
            {archives.map((p) => (
              <li key={p.id}>
                <Carte p={p} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

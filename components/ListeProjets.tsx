"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type StatutChantier = "estimation" | "en_cours" | "termine";

export type ProjetCarte = {
  id: number | string;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  ttc: number;
  archived: boolean;
  eurM2: number;
  statut: StatutChantier;
  donePct: number;
  progPct: number;
};

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function IconBien({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.startsWith("appart"))
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
      </svg>
    );
  if (t.startsWith("immeu"))
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M6 21V6l6-3 6 3v15" />
        <path d="M10 9h4M10 13h4M10 17h4" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function StatutBadge({ statut, archived }: { statut: StatutChantier; archived: boolean }) {
  const cfg = archived
    ? { cls: "bg-surface-2 text-faint", dot: "bg-line-strong", label: "Archivé" }
    : statut === "termine"
      ? { cls: "bg-positive-soft text-positive", dot: "bg-positive", label: "Terminé" }
      : statut === "en_cours"
        ? { cls: "bg-warning-soft text-warning", dot: "bg-[#efb44d]", label: "En cours" }
        : { cls: "bg-brand-50 text-brand-600", dot: "bg-brand-600", label: "Estimation" };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function ListeProjets({
  projets,
  archives,
}: {
  projets: ProjetCarte[];
  archives: ProjetCarte[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<number | string>>(new Set());
  const [modeSelection, setModeSelection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmSuppr, setConfirmSuppr] = useState(false);

  const archiveIds = new Set(archives.map((a) => a.id));
  const toutArchive = selection.size > 0 && [...selection].every((id) => archiveIds.has(id));

  function toggle(id: number | string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Suppression groupée : confirmation EN LIGNE (2 clics), pas de window.confirm (bloqué en iframe sandbox).
  async function supprimerSelection() {
    if (!confirmSuppr) { setConfirmSuppr(true); return; }
    setBusy(true);
    await Promise.all([...selection].map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
    setSelection(new Set());
    setModeSelection(false);
    setConfirmSuppr(false);
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
      <>
        <div className="flex items-start gap-3">
          {modeSelection && (
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-bold transition-colors ${
                coche ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong text-transparent"
              }`}
              aria-hidden="true"
            >
              ✓
            </span>
          )}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <IconBien type={p.type_bien} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-ink">{p.nom}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="chip capitalize">{p.type_bien}</span>
              <span className="chip num">{p.surface} m²</span>
              <span className="chip num">{p.code_postal}</span>
            </div>
          </div>
          {!modeSelection && (
            <svg
              width="18" height="18" viewBox="0 0 18 18" fill="none"
              className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
              aria-hidden="true"
            >
              <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {!p.archived && p.statut !== "estimation" && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-faint">
              <span>{p.statut === "termine" ? "Chantier terminé" : "Chantier en cours"}</span>
              <b className="data font-semibold text-muted">{p.donePct} %</b>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
              <span className="bg-positive" style={{ width: p.donePct + "%" }} />
              <span className="bg-[#efb44d]" style={{ width: p.progPct + "%" }} />
            </div>
          </div>
        )}

        <div className="my-4 h-px bg-line" />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Estimation travaux</p>
            <p className="data mt-1 text-[17px] font-semibold text-ink">
              {euros(p.ttc)} <span className="text-faint text-sm font-normal">TTC</span>
            </p>
            {p.surface > 0 && (
              <p className="mt-0.5 text-[11.5px] text-muted">
                ≈ <b className="data font-semibold text-ink">{Math.round(p.eurM2).toLocaleString("fr-FR")}</b> €/m²
              </p>
            )}
          </div>
          <StatutBadge statut={p.statut} archived={p.archived} />
        </div>
      </>
    );

    const base = `group relative overflow-hidden card p-5 transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-gradient-to-b before:from-brand-600 before:to-accent-600 before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100 ${
      p.archived ? "opacity-70 hover:opacity-100" : ""
    } ${coche ? "!border-brand-500 ring-2 ring-brand-500/20" : "hover:-translate-y-0.5"}`;

    if (modeSelection) {
      return (
        <button type="button" onClick={() => toggle(p.id)} className={`${base} card-interactive w-full cursor-pointer text-left`}>
          {contenu}
        </button>
      );
    }
    return (
      <Link href={`/projets/${p.id}`} className={`${base} card-interactive block`}>
        {contenu}
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Mes projets <span className="ml-1 text-sm font-normal text-faint">{projets.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {modeSelection && selection.size > 0 && (
            <>
              <button
                onClick={() => archiverSelection(!toutArchive)}
                disabled={busy}
                className="btn btn-outline py-1.5 text-[13px]"
              >
                {toutArchive ? "Désarchiver" : "Archiver"} ({selection.size})
              </button>
              <button onClick={supprimerSelection} disabled={busy} className="btn btn-danger py-1.5 text-[13px]">
                {busy ? "Suppression…" : confirmSuppr ? `Confirmer la suppression (${selection.size}) ?` : `Supprimer (${selection.size})`}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setModeSelection(!modeSelection);
              setSelection(new Set());
            }}
            className="btn btn-ghost py-1.5 text-[13px]"
          >
            {modeSelection ? "Annuler" : "Sélectionner"}
          </button>
          {!modeSelection && (
            <Link href="/projets/nouveau" className="btn btn-primary py-1.5 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Nouveau projet
            </Link>
          )}
        </div>
      </div>

      {projets.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <IconBien type="maison" />
          </span>
          <div>
            <p className="font-semibold text-ink">Aucun projet pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted">Crée ton premier projet et obtiens une estimation en 2 minutes.</p>
          </div>
          <Link href="/projets/nouveau" className="btn btn-primary mt-1 py-2.5">
            Estimer mon premier projet
          </Link>
        </div>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
          {projets.map((p) => (
            <li key={p.id}>
              <Carte p={p} />
            </li>
          ))}
        </ul>
      )}

      {archives.length > 0 && (
        <details className="group mt-6">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-open:rotate-90" aria-hidden="true">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Projets archivés ({archives.length})
          </summary>
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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

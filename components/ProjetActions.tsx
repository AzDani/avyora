"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Actions d'une fiche projet : Modifier / Archiver / Supprimer.
 * La suppression utilise une confirmation EN LIGNE (deux clics) et non window.confirm(),
 * car les pop-ups natives (confirm/alert) sont souvent bloquées dans les iframes sandbox.
 */
export default function ProjetActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function archiver() {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    router.refresh();
  }

  async function supprimer() {
    if (suppression) return;
    setSuppression(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErreur(d?.error || "Suppression impossible. Réessayez.");
        setSuppression(false);
        return;
      }
      router.push("/projets");
      router.refresh();
    } catch {
      setErreur("Réseau indisponible. Réessayez.");
      setSuppression(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Link href={`/projets/${id}/modifier`} className="btn btn-outline py-2 text-[13px]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L6 12l-2.7.7L4 10l7.5-7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        Modifier
      </Link>
      <button onClick={archiver} className="btn btn-ghost py-2 text-[13px]" title={archived ? "Désarchiver" : "Archiver"}>
        {archived ? "Désarchiver" : "Archiver"}
      </button>

      {confirmer ? (
        <span className="inline-flex items-center gap-2 rounded-field border border-danger/30 bg-danger-soft px-2.5 py-1.5">
          <span className="text-[13px] font-medium text-danger">Supprimer définitivement&nbsp;?</span>
          <button onClick={supprimer} disabled={suppression} className="btn btn-danger py-1.5 text-[12px] disabled:opacity-60">
            {suppression ? "Suppression…" : "Oui, supprimer"}
          </button>
          <button onClick={() => setConfirmer(false)} disabled={suppression} className="btn btn-ghost py-1.5 text-[12px]">
            Annuler
          </button>
        </span>
      ) : (
        <button
          onClick={() => { setErreur(null); setConfirmer(true); }}
          className="btn btn-ghost py-2 text-[13px] text-faint hover:!bg-danger-soft hover:!text-danger"
          title="Supprimer le projet"
          aria-label="Supprimer le projet"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 4.5h10M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M5 4.5l.5 8c0 .5.4.8.8.8h3.4c.4 0 .8-.3.8-.8l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {erreur && <span className="w-full text-right text-[12px] font-medium text-danger">{erreur}</span>}
    </div>
  );
}

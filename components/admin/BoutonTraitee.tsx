"use client";

import { useState, useTransition } from "react";
import { marquerDemandeTraitee } from "@/lib/actions/admin";

/** « Marquer traitée » ↔ « Remettre à traiter » sur une demande d'accompagnement. La page se met à jour seule. */
export default function BoutonTraitee({ id, traitee }: { id: string; traitee: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState(false);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await marquerDemandeTraitee(id, !traitee).catch(() => ({ ok: false }));
            setErreur(!r.ok);
          })
        }
        className={
          "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-60 " +
          (traitee ? "text-muted hover:bg-surface-2 hover:text-ink" : "bg-brand-600 text-white hover:bg-brand-700")
        }
      >
        {!traitee && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {enCours ? "Enregistrement…" : traitee ? "Remettre à traiter" : "Marquer traitée"}
      </button>
      {erreur && <p role="alert" className="text-[12px] text-[#b42318]">Pas enregistré : réessaie.</p>}
    </div>
  );
}

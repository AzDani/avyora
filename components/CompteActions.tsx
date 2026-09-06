"use client";

import { useActionState, useState } from "react";
import { supprimerCompte, type CompteState } from "@/lib/actions/compte";

export default function CompteActions({ email }: { email: string }) {
  const [state, action, pending] = useActionState<CompteState, FormData>(supprimerCompte, undefined);
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="space-y-6">
      {/* Suppression RGPD */}
      <section className="card border-danger/25 p-5">
        <h2 className="font-semibold text-danger">Supprimer mon compte</h2>
        <p className="mt-1 text-sm text-muted">
          Supprime définitivement ton compte <span className="font-medium text-ink">{email}</span> et
          toutes tes données (projets, estimations, devis, fichiers). <strong>Cette action est irréversible.</strong>
        </p>
        {!ouvert ? (
          <button onClick={() => setOuvert(true)} className="btn btn-danger mt-3 py-2">
            Supprimer mon compte
          </button>
        ) : (
          <form action={action} className="mt-4 space-y-3">
            {state?.error && (
              <p className="rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {state.error}
              </p>
            )}
            <label className="field-label" htmlFor="confirmation">
              Tape <span className="font-mono font-semibold">SUPPRIMER</span> pour confirmer
            </label>
            <input id="confirmation" name="confirmation" className="input" autoComplete="off" placeholder="SUPPRIMER" />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="btn btn-danger py-2 disabled:opacity-60">
                {pending ? "Suppression…" : "Supprimer définitivement"}
              </button>
              <button type="button" onClick={() => setOuvert(false)} className="btn btn-ghost py-2">
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

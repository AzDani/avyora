"use client";

import { useActionState, useState } from "react";
import { supprimerCompte, type CompteState } from "@/lib/actions/compte";
import { useLocale } from "@/components/i18n/LangProvider";

// Le mot de confirmation reste « SUPPRIMER » dans toutes les langues : il est comparé
// littéralement côté serveur (lib/actions/compte.ts). On ne traduit que les consignes autour.
const TR = {
  fr: {
    titre: "Supprimer mon compte",
    descAvant: "Supprime définitivement ton compte ",
    descApres: " et toutes tes données (projets, estimations, devis, fichiers). ",
    irreversible: "Cette action est irréversible.",
    bouton: "Supprimer mon compte",
    consigneAvant: "Tape ",
    consigneApres: " pour confirmer",
    suppression: "Suppression…",
    supprimerDef: "Supprimer définitivement",
    annuler: "Annuler",
  },
  en: {
    titre: "Delete my account",
    descAvant: "Permanently delete your account ",
    descApres: " and all your data (projects, estimates, quotes, files). ",
    irreversible: "This action is irreversible.",
    bouton: "Delete my account",
    consigneAvant: "Type ",
    consigneApres: " to confirm",
    suppression: "Deleting…",
    supprimerDef: "Delete permanently",
    annuler: "Cancel",
  },
} as const;

export default function CompteActions({ email }: { email: string }) {
  const locale = useLocale();
  const s = TR[locale];
  const [state, action, pending] = useActionState<CompteState, FormData>(supprimerCompte, undefined);
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="space-y-6">
      {/* Suppression RGPD */}
      <section className="card border-danger/25 p-5">
        <h2 className="font-semibold text-danger">{s.titre}</h2>
        <p className="mt-1 text-sm text-muted">
          {s.descAvant}<span className="font-medium text-ink">{email}</span>{s.descApres}<strong>{s.irreversible}</strong>
        </p>
        {!ouvert ? (
          <button onClick={() => setOuvert(true)} className="btn btn-danger mt-3 py-2">
            {s.bouton}
          </button>
        ) : (
          <form action={action} className="mt-4 space-y-3">
            {state?.error && (
              <p className="rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {state.error}
              </p>
            )}
            <label className="field-label" htmlFor="confirmation">
              {s.consigneAvant}<span className="font-mono font-semibold">SUPPRIMER</span>{s.consigneApres}
            </label>
            <input id="confirmation" name="confirmation" className="input" autoComplete="off" placeholder="SUPPRIMER" />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="btn btn-danger py-2 disabled:opacity-60">
                {pending ? s.suppression : s.supprimerDef}
              </button>
              <button type="button" onClick={() => setOuvert(false)} className="btn btn-ghost py-2">
                {s.annuler}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

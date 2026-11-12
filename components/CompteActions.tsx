"use client";

import { useActionState, useState } from "react";
import { supprimerCompte, type CompteState } from "@/lib/actions/compte";
import { useLocale } from "@/components/i18n/LangProvider";

// Le mot de confirmation reste « SUPPRIMER » dans toutes les langues : il est comparé
// littéralement côté serveur (lib/actions/compte.ts). On ne traduit que les consignes autour.
const TR = {
  fr: {
    exportTitre: "Télécharger mes données",
    exportDesc: "Une copie de toutes tes données (compte, profil, projets, estimations, dépenses, plans), dans un fichier JSON lisible et réutilisable ailleurs.",
    exportBouton: "Télécharger mes données",
    titre: "Supprimer mon compte",
    descAvant: "Supprime définitivement ton compte ",
    descApres: " et toutes tes données (projets, estimations, dépenses, plans). ",
    irreversible: "Cette action est irréversible.",
    abonnement: "Si tu as un abonnement Pro, il est résilié en même temps : plus aucun prélèvement.",
    bouton: "Supprimer mon compte",
    consigneAvant: "Tape ",
    consigneApres: " pour confirmer",
    suppression: "Suppression…",
    supprimerDef: "Supprimer définitivement",
    annuler: "Annuler",
  },
  en: {
    exportTitre: "Download my data",
    exportDesc: "A copy of all your data (account, profile, projects, estimates, expenses, floor plans) in a JSON file you can read and reuse elsewhere.",
    exportBouton: "Download my data",
    titre: "Delete my account",
    descAvant: "Permanently delete your account ",
    descApres: " and all your data (projects, estimates, expenses, floor plans). ",
    irreversible: "This action is irreversible.",
    abonnement: "If you have a Pro subscription, it's canceled at the same time: no further charges.",
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
      {/* Accès et portabilité RGPD : l'export JSON du compte (app/api/mon-compte/export, lib/export-donnees.ts). */}
      <section className="card p-5">
        <h2 className="font-semibold text-ink">{s.exportTitre}</h2>
        <p className="mt-1 text-sm text-muted">{s.exportDesc}</p>
        <a href="/api/mon-compte/export" download className="btn btn-outline mt-3 py-2">
          {s.exportBouton}
        </a>
      </section>

      {/* Suppression RGPD */}
      <section className="card border-danger/25 p-5">
        <h2 className="font-semibold text-danger">{s.titre}</h2>
        <p className="mt-1 text-sm text-muted">
          {s.descAvant}<span className="font-medium text-ink">{email}</span>{s.descApres}<strong>{s.irreversible}</strong>
        </p>
        <p className="mt-1 text-sm text-muted">{s.abonnement}</p>
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

"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Section « Abonnement » de la page compte. Affiche l'offre en cours et, pour les abonnés,
 * un bouton de gestion/résiliation qui appelle le portail (redirige vers l'URL renvoyée quand
 * le paiement sera branché ; affiche un message d'attente d'ici là).
 */
export default function AbonnementSection({ isPro }: { isPro: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function gerer() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/abonnement/portail", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url as string; // portail Stripe (une fois branché)
        return;
      }
      setMessage(data?.message || "Indisponible pour le moment. Réessaie plus tard.");
    } catch {
      setMessage("Réseau indisponible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Abonnement</h2>
          <p className="mt-1 text-sm text-muted">
            {isPro ? "Tu profites de toutes les fonctionnalités Pro." : "Tu es sur l'offre gratuite."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isPro ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-muted"
          }`}
        >
          {isPro ? "AVYORA Pro" : "Gratuit"}
        </span>
      </div>

      <div className="mt-4">
        {isPro ? (
          <>
            <button onClick={gerer} disabled={busy} className="btn btn-outline py-2 text-[13px] disabled:opacity-60">
              {busy ? "Un instant…" : "Gérer / résilier mon abonnement"}
            </button>
            <p className="mt-2 text-xs text-faint">
              Résiliation en ligne, sans engagement — effet à la fin de la période en cours.
            </p>
          </>
        ) : (
          <Link href="/tarifs" className="btn btn-primary py-2 text-[13px]">
            Voir les offres Pro
          </Link>
        )}
        {message && (
          <p className="mt-3 rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LangProvider";

const TR = {
  fr: {
    titre: "Abonnement",
    proDesc: "Tu profites de toutes les fonctionnalités Pro.",
    gratuitDesc: "Tu es sur l'offre gratuite.",
    badgePro: "AVYORA Pro",
    badgeGratuit: "Gratuit",
    instant: "Un instant…",
    gerer: "Gérer / résilier mon abonnement",
    resiliation: "Résiliation en ligne, sans engagement — effet à la fin de la période en cours.",
    voirOffres: "Voir les offres Pro",
    indispo: "Indisponible pour le moment. Réessaie plus tard.",
    reseau: "Réseau indisponible. Réessaie.",
  },
  en: {
    titre: "Subscription",
    proDesc: "You have access to all Pro features.",
    gratuitDesc: "You're on the free plan.",
    badgePro: "AVYORA Pro",
    badgeGratuit: "Free",
    instant: "One moment…",
    gerer: "Manage / cancel my subscription",
    resiliation: "Cancel online, no commitment — takes effect at the end of the current period.",
    voirOffres: "See Pro plans",
    indispo: "Unavailable right now. Try again later.",
    reseau: "Network unavailable. Try again.",
  },
} as const;

/**
 * Section « Abonnement » de la page compte. Affiche l'offre en cours et, pour les abonnés,
 * un bouton de gestion/résiliation qui appelle le portail (redirige vers l'URL renvoyée quand
 * le paiement sera branché ; affiche un message d'attente d'ici là).
 */
export default function AbonnementSection({ isPro }: { isPro: boolean }) {
  const locale = useLocale();
  const s = TR[locale];
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
      setMessage(data?.message || s.indispo);
    } catch {
      setMessage(s.reseau);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{s.titre}</h2>
          <p className="mt-1 text-sm text-muted">
            {isPro ? s.proDesc : s.gratuitDesc}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isPro ? "bg-brand-50 text-brand-600" : "bg-surface-2 text-muted"
          }`}
        >
          {isPro ? s.badgePro : s.badgeGratuit}
        </span>
      </div>

      <div className="mt-4">
        {isPro ? (
          <>
            <button onClick={gerer} disabled={busy} className="btn btn-outline py-2 text-[13px] disabled:opacity-60">
              {busy ? s.instant : s.gerer}
            </button>
            <p className="mt-2 text-xs text-faint">
              {s.resiliation}
            </p>
          </>
        ) : (
          <Link href="/tarifs" className="btn btn-primary py-2 text-[13px]">
            {s.voirOffres}
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

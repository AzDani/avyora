"use client";

import { useState } from "react";
import Link from "next/link";
import { suivre } from "@/lib/track";
import { useLocale } from "@/components/i18n/LangProvider";
import { messageErreurApi } from "@/lib/i18n/erreurs-api";

const TR = {
  fr: {
    telecharger: "Télécharger le rapport",
    generation: "Génération du PDF…",
    reessayer: "Réessayer",
    echec: "La génération du PDF a échoué. Réessaie dans un instant.",
    limite: "Trop de rapports générés d'affilée. Patiente une minute (au plus 5 par minute et 30 par heure).",
  },
  en: {
    telecharger: "Download the report",
    generation: "Generating PDF…",
    reessayer: "Try again",
    echec: "The PDF couldn't be generated. Try again in a moment.",
    limite: "Too many reports in a row. Wait a minute (up to 5 per minute and 30 per hour).",
  },
} as const;

/**
 * Bouton « Télécharger le rapport » — appelle la route serveur qui génère un PDF vectoriel
 * (Chrome headless) et le télécharge directement, sans page intermédiaire. Réservé aux Pro.
 */
export default function TelechargerRapport({
  projetId,
  refCode,
  isPro,
}: {
  projetId: string;
  refCode: string;
  isPro: boolean;
}) {
  const locale = useLocale();
  const s = TR[locale];
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Non-Pro : le bouton mène aux tarifs (le rapport PDF est une fonctionnalité Pro).
  if (!isPro) {
    return (
      <Link href="/tarifs" className="btn btn-primary py-2">
        <IconeDoc />
        {s.telecharger}
      </Link>
    );
  }

  async function telecharger() {
    if (busy) return;
    setBusy(true);
    setErreur(null);
    suivre("clic_telecharger_rapport");
    try {
      const res = await fetch(`/projets/${projetId}/rapport/pdf`);
      // Session expirée, vérification en attente, pas Pro : la route (ou le proxy) redirige, et fetch
      // suit la redirection jusqu'à une PAGE HTML en 200. On y va, au lieu d'enregistrer cette page en .pdf.
      if (res.redirected) { window.location.href = res.url; return; }
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("application/pdf")) {
        // 429 : la limite de générations, expliquée ; le reste selon le statut, traduit.
        setErreur(res.status === 429 ? s.limite : messageErreurApi(locale, res.status, s.echec));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AVYORA-${refCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setErreur(messageErreurApi(locale, 0, s.echec));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button onClick={telecharger} disabled={busy} className="btn btn-primary py-2 disabled:opacity-70">
        {busy ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {s.generation}
          </>
        ) : (
          <>
            <IconeDoc />
            {erreur ? s.reessayer : s.telecharger}
          </>
        )}
      </button>
      {erreur && <p role="alert" className="max-w-xs text-right text-[12px] font-medium text-danger">{erreur}</p>}
    </div>
  );
}

function IconeDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}

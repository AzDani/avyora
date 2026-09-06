"use client";

import { useState } from "react";
import Link from "next/link";
import { suivre } from "@/lib/track";

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
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(false);

  // Non-Pro : le bouton mène aux tarifs (le rapport PDF est une fonctionnalité Pro).
  if (!isPro) {
    return (
      <Link href="/tarifs" className="btn btn-primary py-2">
        <IconeDoc />
        Télécharger le rapport
      </Link>
    );
  }

  async function telecharger() {
    if (busy) return;
    setBusy(true);
    setErreur(false);
    suivre("clic_telecharger_rapport");
    try {
      const res = await fetch(`/projets/${projetId}/rapport/pdf`);
      if (!res.ok) throw new Error("génération échouée");
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
      setErreur(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={telecharger} disabled={busy} className="btn btn-primary py-2 disabled:opacity-70">
      {busy ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Génération du PDF…
        </>
      ) : (
        <>
          <IconeDoc />
          {erreur ? "Réessayer" : "Télécharger le rapport"}
        </>
      )}
    </button>
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

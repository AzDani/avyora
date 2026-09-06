"use client";

import { useState } from "react";
import { suivre } from "@/lib/track";

/** CTA d'abonnement pour un utilisateur connecté : lance Stripe Checkout pour le plan donné. */
export default function BoutonCheckout({ plan }: { plan: string }) {
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function sabonner() {
    if (busy) return;
    setBusy(true);
    setErreur(null);
    suivre("clic_sabonner", { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url as string; // redirection vers Stripe Checkout
        return;
      }
      setErreur(data?.error || "Indisponible pour le moment.");
    } catch {
      setErreur("Réseau indisponible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={sabonner} disabled={busy} className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-60">
        {busy ? "Redirection…" : "S'abonner"}
      </button>
      {erreur && <p className="mt-2 text-center text-xs text-danger">{erreur}</p>}
    </>
  );
}

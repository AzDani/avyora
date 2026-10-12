"use client";

import { useState } from "react";
import { suivre } from "@/lib/track";
import { useT } from "@/components/i18n/LangProvider";
import type { NatureProjet } from "@/lib/nature-projet";

/**
 * CTA d'abonnement pour un utilisateur connecté : lance Stripe Checkout pour le plan donné.
 * `nature` (N2) part avec la requête : la route la place dans l'adresse de retour (liste fermée).
 */
export default function BoutonCheckout({ plan, nature }: { plan: string; nature?: NatureProjet }) {
  const t = useT();
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
        body: JSON.stringify(nature ? { plan, nature } : { plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url as string; // redirection vers Stripe Checkout
        return;
      }
      setErreur(data?.error || t.boutons.indisponible);
    } catch {
      setErreur(t.boutons.reseau);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={sabonner} disabled={busy} className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-60">
        {busy ? t.boutons.redirection : t.boutons.sabonner}
      </button>
      {erreur && <p className="mt-2 text-center text-xs text-danger">{erreur}</p>}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { reclamationEnAttente } from "@/lib/auth-lien";

/**
 * Sur /auth/verifier : si ce navigateur garde une estimation ou un plan à ranger (« Enregistrer » sans compte, drapeaux
 * de ClaimDraft / ClaimPlan), on le dit avant le choix : « Oui, c'est mon compte » les rangera dans CE compte.
 * Rien sinon (le HTML serveur de la page ne change pas).
 */
export function RangementEnAttente({ texte }: { texte: string }) {
  const [attente, setAttente] = useState(false);
  useEffect(() => {
    try {
      setAttente(reclamationEnAttente((k) => localStorage.getItem(k)));
    } catch {
      /* stockage indisponible : rien à dire */
    }
  }, []);
  if (!attente) return null;
  return (
    <p className="rounded-field border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink" data-rangement-attente="">
      {texte}
    </p>
  );
}

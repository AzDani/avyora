"use client";

import { ouvrirChoixCookies } from "@/lib/consentement";

/**
 * Lien « Gérer mes cookies » (pied de page, politique cookies) : rouvre le bandeau de consentement
 * (components/ConsentementCookies.tsx). Un bouton, pas un lien : il ne mène nulle part, il ouvre le choix.
 */
export default function GererCookies({
  label,
  className = "inline-flex items-center py-2.5 text-left transition-colors hover:text-brand-700",
}: {
  label: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={ouvrirChoixCookies} className={className}>
      {label}
    </button>
  );
}

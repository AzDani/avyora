"use client";

import Link from "next/link";

/** Barre d'action au-dessus du rapport (masquée à l'impression via .no-print). */
export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print mb-5 flex items-center justify-between gap-3">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour au projet
      </Link>
      <button type="button" onClick={() => window.print()} className="btn btn-primary py-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Télécharger / imprimer le PDF
      </button>
    </div>
  );
}

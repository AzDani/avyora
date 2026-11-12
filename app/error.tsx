"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LangProvider";

/**
 * Frontière d'erreur (App Router) : capture les erreurs de rendu et affiche un écran de marque
 * avec une action de réessai. Ne fuit aucun détail technique à l'utilisateur. Dans la langue de la page : le
 * layout racine (et son LangProvider) reste affiché autour d'elle.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT().erreur;
  useEffect(() => {
    // Journalisation côté client (sans données sensibles) — pourra être branchée à un service.
    console.error("Erreur de rendu:", error?.digest ?? error?.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-panel bg-danger-soft text-danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{t.titre}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.texte}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn btn-primary py-2.5">{t.reessayer}</button>
        <Link href="/" className="btn btn-outline py-2.5">{t.accueil}</Link>
      </div>
      {error?.digest && <p className="mt-4 text-xs text-faint">{t.ref} {error.digest}</p>}
    </div>
  );
}

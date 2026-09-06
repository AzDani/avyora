"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Connexion sociale (Google / Apple) via Supabase OAuth.
 * Nécessite que les providers soient activés côté Supabase (Google Cloud / Apple Developer).
 * Tant qu'ils ne le sont pas, le clic affiche un message clair au lieu de planter.
 */
export function SocialAuth({ next = "/projets" }: { next?: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function oauth(provider: "google" | "apple") {
    setErr(null);
    setBusy(provider);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) {
        setErr(`Connexion via ${provider === "google" ? "Google" : "Apple"} indisponible pour le moment.`);
        setBusy(null);
      }
      // succès : Supabase redirige le navigateur vers le fournisseur.
    } catch {
      setErr("Une erreur est survenue. Réessaie.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      {err && (
        <p className="mb-3 rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{err}</p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => oauth("google")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-field border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink transition hover:border-brand-200 disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          {busy === "google" ? "…" : "Google"}
        </button>
        <button
          type="button"
          onClick={() => oauth("apple")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-field border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink transition hover:border-brand-200 disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.36 12.9c.02 2.3 2.02 3.06 2.04 3.07-.02.05-.32 1.1-1.06 2.18-.64.94-1.3 1.87-2.35 1.89-1.03.02-1.36-.61-2.54-.61-1.18 0-1.55.59-2.52.63-1.01.04-1.78-1.01-2.43-1.95-1.32-1.9-2.33-5.38-.97-7.73.67-1.16 1.87-1.9 3.17-1.92 1-.02 1.94.67 2.55.67.61 0 1.76-.83 2.96-.71.5.02 1.92.2 2.83 1.53-.07.05-1.69.99-1.67 2.95M14.4 6.66c.54-.65.9-1.56.8-2.46-.78.03-1.72.52-2.27 1.17-.5.57-.93 1.5-.81 2.38.87.07 1.75-.44 2.28-1.09" />
          </svg>
          {busy === "apple" ? "…" : "Apple"}
        </button>
      </div>
    </div>
  );
}

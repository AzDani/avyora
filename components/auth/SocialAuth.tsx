"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useT } from "@/components/i18n/LangProvider";

/**
 * « Continuer avec Google » (Supabase OAuth), sous le formulaire du lien d'accès (B2). Affiché seulement quand
 * l'interrupteur `FEATURES.authGoogle` (NEXT_PUBLIC_AUTH_GOOGLE=1) est allumé : le fournisseur doit d'abord être
 * activé côté Supabase (Authentication → Providers → Google). Le retour passe par /auth/callback, qui ramène à
 * `next` et date l'acceptation des CGU d'un compte qui vient de naître (lib/auth-arrivee.ts). Si Supabase refuse
 * malgré tout, le clic affiche un message clair au lieu de planter.
 */
export function SocialAuth({ next = "/projets" }: { next?: string }) {
  const t = useT().auth.lien;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setErr(null);
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) {
        setErr(t.googleIndispo);
        setBusy(false);
      }
      // succès : Supabase redirige le navigateur vers Google.
    } catch {
      setErr(t.googleIndispo);
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        {t.ou}
        <span className="h-px flex-1 bg-line" />
      </div>
      {err && (
        <p role="alert" className="mb-3 rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{err}</p>
      )}
      <button
        type="button"
        onClick={google}
        disabled={busy}
        data-auth-google=""
        className="flex w-full items-center justify-center gap-2 rounded-field border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink transition hover:border-brand-200 disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
        </svg>
        {busy ? "…" : t.google}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/components/i18n/LangProvider";
import LangSwitch from "@/components/i18n/LangSwitch";
import { I18N_ENABLED } from "@/lib/i18n/config";

/**
 * Menu de navigation mobile (< sm) : bouton hamburger + panneau déroulant.
 * Le header inline ne tient pas en 375px ; sur mobile on regroupe tout ici.
 */
export default function MobileMenu({ isLoggedIn, prenom }: { isLoggedIn: boolean; prenom?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const t = useT();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t.nav.menu}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg text-indigo-100 transition-colors hover:bg-white/10"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Fond cliquable pour fermer */}
          <button aria-hidden="true" tabIndex={-1} onClick={close} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-16px_rgba(30,27,75,.4)]">
            <Link
              href="/projets/nouveau"
              onClick={close}
              className="mb-1 flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {t.nav.nouveauProjet}
            </Link>
            <Link href="/projets" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              {t.nav.projets}
            </Link>
            <Link href="/guides" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              {t.nav.guides}
            </Link>
            <Link href="/tarifs" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              {t.nav.tarifs}
            </Link>
            <div className="my-1.5 border-t border-line" />
            {isLoggedIn ? (
              <>
                <Link href="/mon-espace/compte" onClick={close} className="block truncate rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                  {t.nav.monCompte}{prenom ? ` · ${prenom}` : ""}
                </Link>
                <form action={logout}>
                  <button type="submit" className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2">
                    {t.nav.deconnexion}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/connexion" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                {t.nav.connexion}
              </Link>
            )}
            {I18N_ENABLED && (
              <>
                <div className="my-1.5 border-t border-line" />
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-xs font-medium text-faint">{t.langue.label}</span>
                  <LangSwitch tone="light" />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

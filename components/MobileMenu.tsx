"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/components/i18n/LangProvider";
import LangSwitch from "@/components/i18n/LangSwitch";
import { I18N_ENABLED } from "@/lib/i18n/config";
import { FEATURES } from "@/lib/features";
import { IconePlan, VITRINE_PLAN } from "@/components/plans/OngletPlan";
import { clicPlan } from "@/lib/plans/mesure";
import { IconeAccompagnement, PAGE_ACCOMPAGNEMENT } from "@/components/accompagnement/OngletAccompagnement";
import { betaActive, lienInscriptionBeta } from "@/lib/beta";

/**
 * Menu de navigation mobile (< sm) : bouton hamburger + panneau déroulant.
 * Le header inline ne tient pas en 375px ; sur mobile on regroupe tout ici.
 *
 * Clavier (menu déroulant accessible) : à l'ouverture, le focus va sur le premier lien du panneau ; Échap ferme et
 * rend le focus au bouton Menu, comme un clic sur le fond. Le bouton fait 44 × 44 px (cible tactile).
 */
export default function MobileMenu({ isLoggedIn, prenom, isAdmin, isPro, artisan }: { isLoggedIn: boolean; prenom?: string; isAdmin?: boolean; isPro?: boolean; artisan?: { aRepondre: number } }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const t = useT();
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const panneauId = useId();
  /** Fermer en rendant le focus au bouton (Échap, clic sur le fond) : sans cela, il tombait au début de la page. */
  const fermerVersBouton = () => {
    setOpen(false);
    boutonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panneauRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      boutonRef.current?.focus();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={boutonRef}
        type="button"
        aria-label={t.nav.menu}
        aria-expanded={open}
        aria-controls={panneauId}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-lg text-indigo-100 transition-colors hover:bg-white/10"
      >
        {/* Un artisan avec des demandes à répondre : un point orange sur le bouton du menu (25/11/2026). */}
        {!!artisan?.aRepondre && !open && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#f59e0b] ring-2 ring-[#1E1B4B]" aria-hidden="true" />}
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
          <button aria-hidden="true" tabIndex={-1} onClick={fermerVersBouton} className="fixed inset-0 z-40 cursor-default" />
          <div ref={panneauRef} id={panneauId} className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-16px_rgba(30,27,75,.4)]">
            <Link
              href="/projets/nouveau"
              onClick={close}
              className="mb-1 flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {t.nav.nouveauProjet}
            </Link>
            {/* Éditeur de plan (C9) : une ligne contrastée, pas un deuxième bouton plein (un seul appel principal). */}
            {FEATURES.plans && (
              <Link
                href={VITRINE_PLAN}
                onClick={close}
                data-onglet-plan=""
                className="mb-1 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                {...clicPlan("nav_mobile")}
              >
                <IconePlan className="shrink-0" />
                <span className="flex-1">{t.nav.plan}</span>
                <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{t.nav.planPastille}</span>
              </Link>
            )}
            {/* Le conseil de Daniel (16/11/2026) : remonté juste sous le plan, une ligne contrastée avec sa mention, pas un
                deuxième bouton plein. */}
            <Link
              href={PAGE_ACCOMPAGNEMENT}
              onClick={close}
              data-onglet-accompagnement=""
              className="mb-1 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              <IconeAccompagnement className="shrink-0" />
              {/* La mention sur une 2ᵉ ligne : en pastille, elle se tassait sur trois lignes dans le panneau (mesuré). */}
              <span className="flex-1 leading-tight">
                {t.nav.accompagnement}
                <span className="mt-0.5 block text-[11.5px] font-medium text-brand-700/80">{t.nav.accompagnementPastille}</span>
              </span>
            </Link>
            {/* L'espace artisan (25/11/2026) : en tête des liens pour un artisan du réseau, avec ses demandes à répondre. */}
            {artisan && (
              <Link href="/espace-artisan" onClick={close} className="mb-1 flex items-center gap-2 rounded-lg bg-[#f3efff] px-3 py-2.5 text-sm font-semibold text-[#5b21b6] transition-colors hover:bg-[#ebe4ff]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M2.5 13.5h11M4 13.5V7.2L8 4l4 3.2v6.3M6.6 13.5V10h2.8v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="flex-1">Espace artisan</span>
                {artisan.aRepondre > 0 && <span className="num rounded-full bg-[#f59e0b] px-1.5 text-[11px] font-bold leading-5 text-[#1e1b4b]">{artisan.aRepondre}<span className="sr-only"> à répondre</span></span>}
              </Link>
            )}
            <Link href="/projets" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              {t.nav.projets}
            </Link>
            {isLoggedIn && (
              <Link href="/avis-artisans" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                Avis artisans
              </Link>
            )}
            <div className="my-1.5 border-t border-line" />
            {isLoggedIn ? (
              <>
                {!isPro && (
                  <Link href="/tarifs" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-surface-2">
                    {t.nav.passerPro}
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-surface-2">
                    🛡 Admin
                  </Link>
                )}
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
              <>
                {/* Un visiteur sans compte : l'inscription en un geste, depuis n'importe quelle page (pendant la bêta, tout
                    AVYORA est offert avec un compte : lib/beta.ts). */}
                <Link
                  href={betaActive() ? lienInscriptionBeta(undefined, "menu-mobile") : "/inscription"}
                  onClick={close}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-surface-2"
                >
                  {betaActive() ? t.beta.creerCompte : t.boutons.creerCompte}
                </Link>
                <Link href="/connexion" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                  {t.nav.connexion}
                </Link>
              </>
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

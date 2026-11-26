"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/components/i18n/LangProvider";

/**
 * Le menu du compte connecté, dans l'en-tête de l'ordinateur (décision de Dani du 26/11/2026). L'en-tête débordait de
 * 73 px pour un artisan à 1 280 px, et il fallait de la place pour « Mes devis » : Mon compte, Avis artisans, Admin et
 * Déconnexion passent dans ce menu, ouvert par l'icône du compte. Se ferme au clic dehors, avec Échap, ou en suivant
 * un lien.
 */
export default function MenuCompte({ prenom, isAdmin }: { prenom: string; isAdmin: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => { if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") { setOuvert(false); bouton.current?.focus(); } };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", dehors); document.removeEventListener("keydown", touche); };
  }, [ouvert]);

  const fermer = () => setOuvert(false);
  const ligne = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2";

  return (
    <div ref={racine} className="relative" data-menu-compte="">
      <button
        ref={bouton}
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label={`${t.nav.monCompte} · ${prenom}`}
        title={`${t.nav.monCompte} · ${prenom}`}
        onClick={() => setOuvert((o) => !o)}
        className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white " + (ouvert ? "bg-white/10 text-white" : "")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 13.2a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={"shrink-0 transition-transform " + (ouvert ? "rotate-180" : "")}>
          <path d="M2 3.5 5 6.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {ouvert && (
        <div id={id} className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-16px_rgba(30,27,75,0.45)]">
          <p className="truncate px-3 pb-1.5 pt-1 text-[12.5px] text-muted">{prenom}</p>
          <Link href="/mon-espace/compte" onClick={fermer} className={ligne}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-muted"><circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" /><path d="M3 13.2a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            {t.nav.monCompte}
          </Link>
          {/* Les avis sur les artisans du réseau (25/11/2026) : réservés aux membres Pro, la page le dit aux autres. */}
          <Link href="/avis-artisans" onClick={fermer} className={ligne}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-muted"><path d="M8 1.9l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            Avis artisans
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={fermer} className={ligne + " font-semibold text-brand-700"}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.6 13 3.5v4.2c0 3-2.1 5.4-5 6.7-2.9-1.3-5-3.7-5-6.7V3.5L8 1.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-line" />
          <form action={logout}>
            <button type="submit" className={ligne}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-muted"><path d="M6.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2.5M10.5 11 13.5 8l-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t.nav.deconnexion}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Le menu de l'espace artisan (25/11/2026, maquette validée par Dani) : colonne à gauche sur ordinateur, rangée
 * d'onglets qui défile sur téléphone. Les pastilles : demandes à répondre, note moyenne, nombre de réalisations, et un
 * point orange sur « Mon dossier » quand la décennale arrive à échéance ou qu'une mise à jour attend Daniel.
 */
export type CompteursMenu = { aRepondre: number; note: string | null; realisations: number; alerteDossier: boolean };

const ic = (d: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="hidden shrink-0 lg:block">
    {d}
  </svg>
);

const ITEMS = [
  { href: "/espace-artisan", label: "Accueil", icone: ic(<path d="M2.5 7 8 2.5 13.5 7v6.5h-11V7Z" />) },
  { href: "/espace-artisan/demandes", label: "Demandes", icone: ic(<><path d="M2.5 3.5h11v9h-11z" /><path d="M2.5 4l5.5 4.5L13.5 4" /></>) },
  { href: "/espace-artisan/avis", label: "Mes avis", icone: ic(<path d="M8 1.9l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.9z" />) },
  { href: "/espace-artisan/galerie", label: "Ma galerie", icone: ic(<><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="m2.8 11 3.4-3.2 2.6 2.3 1.8-1.5 2.6 2.4" /></>) },
  { href: "/espace-artisan/dossier", label: "Mon dossier", icone: ic(<><path d="M3.5 2.5h6l3 3v8h-9z" /><path d="M9.5 2.5v3h3" /></>) },
  { href: "/espace-artisan/aide", label: "Comment ça marche", icone: ic(<><circle cx="8" cy="8" r="5.6" /><path d="M6.4 6.3a1.7 1.7 0 1 1 2.3 1.6c-.5.2-.7.6-.7 1.1M8 11.1v.1" /></>) },
] as const;

export default function MenuArtisan({ c }: { c: CompteursMenu }) {
  const p = usePathname();
  const actif = (href: string) => (href === "/espace-artisan" ? p === href : p === href || p.startsWith(href + "/"));
  const extra = (href: string) => {
    if (href === "/espace-artisan/demandes" && c.aRepondre > 0)
      return <span className="num ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-5 text-white lg:ml-auto">{c.aRepondre}<span className="sr-only"> à répondre</span></span>;
    if (href === "/espace-artisan/avis" && c.note)
      return <span className="num ml-1 inline-flex items-center rounded-full bg-brand-50 px-1.5 text-[11px] font-bold leading-5 text-brand-700 lg:ml-auto">{c.note}<span className="sr-only"> sur 5</span></span>;
    if (href === "/espace-artisan/galerie" && c.realisations > 0)
      return <span className="num ml-1 inline-flex items-center rounded-full bg-brand-50 px-1.5 text-[11px] font-bold leading-5 text-brand-700 lg:ml-auto">{c.realisations}</span>;
    if (href === "/espace-artisan/dossier" && c.alerteDossier)
      return <span className="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f59e0b] lg:ml-auto" title="À mettre à jour"><span className="sr-only"> (à mettre à jour)</span></span>;
    return null;
  };
  return (
    <nav aria-label="Espace artisan" className="sticky top-[88px] z-20 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 lg:static lg:mx-0 lg:grid lg:gap-0.5 lg:p-1.5">
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={actif(it.href) ? "page" : undefined}
          className={
            "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13.5px] transition-colors lg:text-[14px] " +
            (actif(it.href) ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-muted hover:bg-surface-2 hover:text-ink")
          }
        >
          {it.icone}
          {it.label}
          {extra(it.href)}
        </Link>
      ))}
    </nav>
  );
}

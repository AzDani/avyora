"use client";

import { useId } from "react";
import Link from "next/link";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { IconeAccompagnement } from "@/components/accompagnement/OngletAccompagnement";

/**
 * Le menu de l'admin (refonte du 17/11/2026). Desktop : colonne fixe à gauche, rangée par usage (Clients, Demandes…) ;
 * mobile et tablette : la recherche puis une rangée d'onglets qui défile. Les pastilles comptent ce qui attend Daniel.
 * Une rubrique s'ajoute ici (le Réseau AVYORA arrivera ainsi), sans toucher aux pages.
 */
export type BadgesAdmin = { accompagnement?: number | null; artisans?: number | null; devis?: number | null; avis?: number | null };

/** `pleinePage` : la cible est une page à part, hors du layout de l'admin (les bureaux virtuels, faits pour l'ordinateur) : un vrai lien, et pas d'onglet sur mobile. */
type Item = { href: string; label: string; icone: React.ReactNode; badge?: keyof BadgesAdmin; pleinePage?: boolean };
type Groupe = { titre?: string; items: Item[] };

const ic = (d: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const GROUPES: Groupe[] = [
  {
    items: [
      { href: "/admin", label: "Tableau de bord", icone: ic(<><rect x="2" y="2" width="5" height="6" rx="1.2" /><rect x="9" y="2" width="5" height="3.5" rx="1.2" /><rect x="9" y="7.5" width="5" height="6.5" rx="1.2" /><rect x="2" y="10" width="5" height="4" rx="1.2" /></>) },
      { href: "/admin/bureaux", label: "Bureaux 3D", pleinePage: true, icone: ic(<><path d="M2.5 13.5V5.2L8 2.5l5.5 2.7v8.3" /><path d="M2.5 13.5h11M6 13.5V9.2h4v4.3M5.4 6.6h.01M8 6.6h.01M10.6 6.6h.01" /></>) },
    ],
  },
  {
    titre: "Clients",
    items: [
      { href: "/admin/inscrits", label: "Inscrits", icone: ic(<><circle cx="6" cy="5.5" r="2.5" /><path d="M1.8 13.5a4.2 4.2 0 0 1 8.4 0" /><path d="M10.5 3.2a2.4 2.4 0 0 1 0 4.6M12 9.6a4 4 0 0 1 2.2 3.9" /></>) },
      { href: "/admin/projets", label: "Projets", icone: ic(<><path d="M2.5 7.2 8 2.8l5.5 4.4" /><path d="M3.8 6.3v7.2h8.4V6.3" /><path d="M6.6 13.5V10h2.8v3.5" /></>) },
      { href: "/admin/plans", label: "Plans", icone: ic(<><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M2 8h5.5V2M7.5 11v3M10.5 8H14" /></>) },
    ],
  },
  {
    titre: "Demandes",
    items: [{ href: "/admin/accompagnement", label: "Accompagnement", icone: <IconeAccompagnement className="h-4 w-4" />, badge: "accompagnement" }],
  },
  {
    titre: "Gestion",
    items: [
      { href: "/admin/planning", label: "Planning", icone: ic(<><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.8h11M5.5 2v3M10.5 2v3M5.4 9.6h1.4M8.6 9.6h1.4" /></>) },
      { href: "/admin/compta", label: "Compta", icone: ic(<><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2 6.5h12M4.8 10h2.4" /></>) },
    ],
  },
  {
    titre: "Réseau AVYORA",
    items: [
      { href: "/admin/artisans", label: "Artisans", badge: "artisans", icone: ic(<><path d="M3 13.5h10" /><path d="M4.5 13.5V9.8a3.5 3.5 0 0 1 7 0v3.7" /><path d="M3.5 9.8h9" /><path d="M8 6.3V4.8" /></>) },
      { href: "/admin/devis", label: "Demandes de devis", badge: "devis", icone: ic(<><path d="M4 2h5.5L12 4.5V14H4z" /><path d="M9.5 2v2.5H12M6 8h4M6 10.5h4" /></>) },
      { href: "/admin/avis", label: "Avis et galeries", badge: "avis", icone: ic(<path d="M8 1.9l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.9z" />) },
    ],
  },
];

const actif = (p: string, href: string) => (href === "/admin" ? p === "/admin" : p === href || p.startsWith(href + "/"));

function Pastille({ n }: { n?: number | null }) {
  if (!n) return null;
  return (
    <span className="num ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-bold text-white">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> à traiter</span>
    </span>
  );
}

function Recherche() {
  // Rendue deux fois (colonne desktop, version mobile) : chaque champ a son propre id, sinon le label du champ visible
  // pointerait sur l'autre, masqué.
  const id = useId();
  return (
    <Form action="/admin/inscrits" role="search" className="relative">
      <label htmlFor={id} className="sr-only">Chercher un inscrit</label>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Inscrit : e-mail, nom, 06…"
        className="min-h-10 w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-brand-600"
      />
    </Form>
  );
}

export default function AdminNav({ email, badges }: { email: string; badges: BadgesAdmin }) {
  const p = usePathname();
  const items = GROUPES.flatMap((g) => g.items).filter((it) => !it.pleinePage);

  return (
    <>
      {/* Desktop : la colonne */}
      <aside className="hidden lg:block" aria-label="Admin">
        <div className="sticky top-24 space-y-5">
          <div>
            <p className="eyebrow">Espace admin</p>
            <p className="text-[19px] font-semibold tracking-tight text-ink">Pilotage AVYORA</p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-faint">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f9d6b]" aria-hidden="true" />
              {email}
            </p>
          </div>
          <Recherche />
          <nav className="space-y-4">
            {GROUPES.map((g, i) => (
              <div key={g.titre ?? i}>
                {g.titre && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{g.titre}</p>}
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const on = actif(p, it.href);
                    const Lien: React.ElementType = it.pleinePage ? "a" : Link;
                    return (
                      <li key={it.href}>
                        <Lien
                          href={it.href}
                          aria-current={on ? "page" : undefined}
                          className={
                            "flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-[14px] transition-colors " +
                            (on ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-muted hover:bg-surface hover:text-ink")
                          }
                        >
                          {it.icone}
                          {it.label}
                          {it.badge && <Pastille n={badges[it.badge]} />}
                        </Lien>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <Link href="/" className="inline-flex px-3 text-[12.5px] font-medium text-faint hover:text-brand-700">← Retour au site</Link>
        </div>
      </aside>

      {/* Mobile et tablette : la recherche, puis les onglets qui défilent */}
      <div className="space-y-3 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[19px] font-semibold tracking-tight text-ink">Pilotage AVYORA</p>
          <p className="truncate text-[12px] text-faint">{email}</p>
        </div>
        <Recherche />
        <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1.5">
            {items.map((it) => {
              const on = actif(p, it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={on ? "page" : undefined}
                    className={
                      "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors " +
                      (on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-muted hover:text-ink")
                    }
                  >
                    {it.icone}
                    {it.label}
                    {it.badge && !!badges[it.badge] && (
                      <span className={"num rounded-full px-1.5 text-[11px] font-bold " + (on ? "bg-white text-brand-700" : "bg-brand-600 text-white")}>
                        {badges[it.badge]}
                        <span className="sr-only"> à traiter</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

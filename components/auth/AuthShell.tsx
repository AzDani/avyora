import Link from "next/link";
import type { ReactNode } from "react";

const PARCOURS: { verbe: string; suite: string }[] = [
  { verbe: "Estime", suite: "ton budget en 3 min — 200 postes, précision ±15 %" },
  { verbe: "Choisis", suite: "matériaux & artisans, garde tes liens produits" },
  { verbe: "Suis", suite: "l'avancement de ton chantier, poste par poste" },
  { verbe: "Pilote", suite: "ton budget et tous tes projets au même endroit" },
];

/**
 * Écran d'authentification premium : formulaire à gauche, panneau de réassurance
 * de marque à droite (masqué sur mobile). Partagé par connexion et inscription.
 */
export function AuthShell({
  eyebrow,
  titre,
  sousTitre,
  children,
  bas,
}: {
  eyebrow: string;
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  bas?: ReactNode;
}) {
  return (
    <div className="animate-rise py-4 sm:py-8">
      <div className="mx-auto grid w-full overflow-hidden rounded-panel border border-line bg-surface shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
        {/* ── Formulaire ── */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5 self-start" aria-label="Accueil AVYORA">
            <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
              <rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5" />
              <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
            </svg>
            <span className="text-lg font-semibold tracking-[0.14em] text-ink">
              AVY<span className="text-[#A78BFA]">ORA</span>
            </span>
          </Link>

          <div className="w-full max-w-sm">
            <p className="eyebrow mb-2">{eyebrow}</p>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">{titre}</h1>
            {sousTitre && <p className="mt-2 text-[15px] leading-relaxed text-muted">{sousTitre}</p>}
            <div className="mt-7">{children}</div>
            {bas && <div className="mt-7 border-t border-line pt-5 text-sm text-muted">{bas}</div>}
          </div>
        </div>

        {/* ── Panneau de marque (desktop) ── */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#241f5e] to-[#191640] p-10 text-white lg:flex lg:flex-col lg:justify-center">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#7C3AED]/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-[#4F46E5]/20 blur-3xl" />
          <div className="relative max-w-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              Gestionnaire de travaux · France
            </span>
            <h2 className="mt-6 text-[28px] font-semibold leading-[1.15] tracking-tight">
              De l&apos;idée au
              <br />
              <span className="bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] bg-clip-text text-transparent">
                chantier fini.
              </span>
            </h2>
            <ul className="mt-8 space-y-4">
              {PARCOURS.map((p, i) => (
                <li key={p.verbe} className="flex items-start gap-3 text-[15px] leading-relaxed text-indigo-100/85">
                  <span className="data mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] bg-white/10 text-[11px] font-bold text-[#C4B5FD]">
                    {i + 1}
                  </span>
                  <span>
                    <b className="font-semibold text-white">{p.verbe}</b> {p.suite}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <dd className="data text-xl font-semibold text-white">200</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">postes de prix</dt>
              </div>
              <div>
                <dd className="data text-xl font-semibold text-white">18</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">corps d'état</dt>
              </div>
              <div>
                <dd className="data text-xl font-semibold text-white">±15 %</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">précision</dt>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

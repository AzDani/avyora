import Link from "next/link";
import type { ReactNode } from "react";

/** Conteneur de marque pour les écrans d'authentification (carte centrée, chevron AVYORA). */
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-6 sm:py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-2.5" aria-label="Accueil AVYORA">
        <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5" />
          <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
        </svg>
        <span className="text-lg font-semibold tracking-[0.14em] text-ink">
          AVY<span className="text-[#A78BFA]">ORA</span>
        </span>
      </Link>

      <div className="card w-full p-6 sm:p-8">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-2xl font-semibold text-ink">{titre}</h1>
        {sousTitre && <p className="mt-1.5 text-sm text-muted">{sousTitre}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {bas && <div className="mt-5 text-center text-sm text-muted">{bas}</div>}
    </div>
  );
}

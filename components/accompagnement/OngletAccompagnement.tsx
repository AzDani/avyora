"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PAGE_ACCOMPAGNEMENT = "/accompagnement-travaux";

/** Le casque de l'onglet (un dessin, pas un emoji). */
export function IconeAccompagnement({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M2.8 10.2V8.4a5.2 5.2 0 0 1 10.4 0v1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="1.9" y="9.2" width="2.9" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11.2" y="9.2" width="2.9" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * L'onglet « Accompagnement » de l'en-tête desktop (Dani, 16/11/2026 : « j'ai galéré à le trouver, il faut un onglet
 * spécifique »). Juste après « Plan 3D », en blanc comme lui (les autres liens sont en indigo pâle), sans pastille pour
 * ne pas doubler celle du plan. Monté seulement à partir de lg (la navigation inline de l'en-tête ;
 * en dessous, la ligne du menu). `aria-current` sur la page.
 */
export default function OngletAccompagnement({ label }: { label: string }) {
  const ici = usePathname() === PAGE_ACCOMPAGNEMENT;
  return (
    <Link
      href={PAGE_ACCOMPAGNEMENT}
      aria-current={ici ? "page" : undefined}
      data-onglet-accompagnement=""
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/10 aria-[current=page]:bg-white/10"
    >
      <IconeAccompagnement className="shrink-0" />
      {label}
    </Link>
  );
}

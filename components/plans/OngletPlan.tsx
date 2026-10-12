"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clicPlan } from "@/lib/plans/mesure";

export const VITRINE_PLAN = "/logiciel-plan-maison";

/** La maison de l'onglet (un dessin, pas un emoji). */
export function IconePlan({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M2.5 7.2 8 2.6l5.5 4.6V13a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V7.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.3 13.8V9.6h3.4v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * L'onglet « Plan 3D » de l'en-tête desktop (C9), derrière `FEATURES.plans` (le layout ne le monte pas
 * interrupteur éteint). Premier lien de la navigation, en blanc plein (les autres sont en indigo pâle),
 * avec la pastille « Gratuit ». Il mène à la vitrine, pas à l'éditeur : on voit avant de dessiner, et au
 * téléphone on ne dessine pas. `aria-current` sur la vitrine.
 */
export default function OngletPlan({ label, pastille }: { label: string; pastille: string }) {
  const ici = usePathname() === VITRINE_PLAN;
  return (
    <Link
      href={VITRINE_PLAN}
      aria-current={ici ? "page" : undefined}
      data-onglet-plan=""
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/10 aria-[current=page]:bg-white/10"
      {...clicPlan("nav")}
    >
      <IconePlan className="shrink-0" />
      {label}
      <span className="rounded-full bg-[#C4B5FD] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#1E1B4B]">{pastille}</span>
    </Link>
  );
}

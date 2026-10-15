"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictPlans, formatsPlans } from "@/lib/i18n/plans";
import { CLE_RECLAMATION_PLAN, lirePlansLocaux, planAReprendre, stockageNavigateur } from "@/lib/plans/local";

/**
 * Sur /inscription, quand on arrive de l'éditeur (drapeau `avyora-plan-claim`, ou `next=/plan`) :
 * « Ton plan est prêt », son nom, sa surface et ses pièces s'ils sont connus. Jumeau
 * d'`EstimationRappel` (compact comme lui : le bouton reste au-dessus du pli d'un portable), entièrement
 * traduit. Rien sans plan local (arrivée directe) : le HTML serveur de la page ne change pas.
 */
export function PlanRappel({ next }: { next?: string }) {
  const locale = useLocale();
  const t = dictPlans(locale);
  const [info, setInfo] = useState<{ nom: string; m2: number; pieces: number } | null>(null);

  useEffect(() => {
    const s = stockageNavigateur();
    if (!s) return;
    let drapeau: string | null = null;
    try {
      drapeau = s.getItem(CLE_RECLAMATION_PLAN);
    } catch {
      drapeau = null;
    }
    const versEditeur = next === "/plan" || (typeof next === "string" && next.startsWith("/plan?"));
    if (!drapeau && !versEditeur) return;
    const p = planAReprendre(lirePlansLocaux(s), drapeau);
    if (!p) return;
    const m2 = Number(p.resume?.m2);
    const pieces = Number(p.resume?.pieces);
    setInfo({
      nom: p.nom,
      m2: Number.isFinite(m2) && m2 > 0 ? m2 : 0,
      pieces: Number.isInteger(pieces) && pieces > 0 ? pieces : 0,
    });
  }, [next]);

  if (!info) return null;
  const f = formatsPlans(locale);
  const detail = [
    t.commun.cite(info.nom),
    info.m2 ? t.commun.m2(f.m2(info.m2)) : "",
    info.pieces ? t.commun.pieces(info.pieces) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="mb-4 rounded-field border border-brand-200 bg-brand-50 p-3 group-has-[[data-lien-envoye]]/auth:hidden sm:mb-5 sm:px-4">
      <p className="eyebrow mb-0.5">{t.rappel.titre}</p>
      <p className="font-semibold text-ink">{detail}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.rappel.texte}</p>
    </div>
  );
}

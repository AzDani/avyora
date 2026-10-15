"use client";

import { useEffect, useState } from "react";
import { CATALOG, buildDevis, catalogueDe, type Ctx, type Selection } from "@/lib/estimateur";
import { CLE_BROUILLON_NEUF, lireBrouillonNeuf, reclamationNeufPosee } from "@/lib/estimateur/brouillon-neuf";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

/**
 * Affiché sur /inscription quand l'utilisateur arrive depuis une estimation (brouillon présent) :
 * « Ton estimation est prête — on te la garde ». Rien si pas de brouillon (arrivée directe).
 */
const DRAFT_KEY = "avyora-estim-v2";
const fmt = (n: number) => n.toLocaleString("fr-FR");

export function EstimationRappel() {
  const [info, setInfo] = useState<{ lo: number; hi: number; label: string } | null>(null);
  const maisonNeuve = dictNeufCommun(useLocale()).maisonNeuve;

  useEffect(() => {
    // Construction neuve (son drapeau posé) : son brouillon, chiffré sur le catalogue du neuf.
    // Brouillon absent ou illisible : on retombe sur le rappel de la rénovation, comme avant.
    try {
      if (reclamationNeufPosee((k) => localStorage.getItem(k))) {
        const d = lireBrouillonNeuf(localStorage.getItem(CLE_BROUILLON_NEUF));
        const ttc = d ? buildDevis(catalogueDe(d.ctx), d.ctx, d.sel).totaux.ttc : 0;
        if (d && ttc > 0) {
          const lo = Math.round((ttc * 0.85) / 100) * 100;
          const hi = Math.round((ttc * 1.15) / 100) * 100;
          setInfo({ lo, hi, label: `${maisonNeuve} ${d.ctx.surface} m²` });
          return;
        }
      }
    } catch {
      /* stockage illisible : on retombe sur le chemin de la rénovation */
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { ctx?: Ctx; sel?: Selection };
      if (!d?.ctx || !d?.sel) return;
      const ttc = buildDevis(CATALOG, d.ctx, d.sel).totaux.ttc;
      if (!(ttc > 0)) return;
      const lo = Math.round((ttc * 0.85) / 100) * 100;
      const hi = Math.round((ttc * 1.15) / 100) * 100;
      const label = `${d.ctx.type ?? "Bien"} ${d.ctx.surface} m²`;
      setInfo({ lo, hi, label });
    } catch {
      /* pas de brouillon lisible */
    }
  }, [maisonNeuve]);

  if (!info) return null;
  return (
    <div className="mb-4 rounded-field border border-brand-200 bg-brand-50 p-3 sm:mb-6 sm:p-4" data-estimation-rappel="">
      <p className="eyebrow mb-1">Ton estimation est prête</p>
      <p className="data text-lg font-semibold text-ink sm:text-xl">
        {fmt(info.lo)} – {fmt(info.hi)} €
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        {info.label} — crée ton compte pour la sauvegarder, on te la garde.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CATALOG, buildDevis, type Ctx, type Selection } from "@/lib/estimateur";

/**
 * Affiché sur /inscription quand l'utilisateur arrive depuis une estimation (brouillon présent) :
 * « Ton estimation est prête — on te la garde ». Rien si pas de brouillon (arrivée directe).
 */
const DRAFT_KEY = "avyora-estim-v2";
const fmt = (n: number) => n.toLocaleString("fr-FR");

export function EstimationRappel() {
  const [info, setInfo] = useState<{ lo: number; hi: number; label: string } | null>(null);

  useEffect(() => {
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
  }, []);

  if (!info) return null;
  return (
    <div className="mb-6 rounded-field border border-brand-200 bg-brand-50 p-4">
      <p className="eyebrow mb-1">Ton estimation est prête</p>
      <p className="data text-xl font-semibold text-ink">
        {fmt(info.lo)} – {fmt(info.hi)} €
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        {info.label} — crée ton compte pour la sauvegarder, on te la garde.
      </p>
    </div>
  );
}

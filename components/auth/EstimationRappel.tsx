"use client";

import { useEffect, useState } from "react";
import { CATALOG, buildDevis, catalogueDe, type Ctx, type Selection } from "@/lib/estimateur";
import { totauxAvecPerso } from "@/lib/estimateur/projet";
import { CLE_BROUILLON_NEUF, lireBrouillonNeuf, reclamationNeufPosee } from "@/lib/estimateur/brouillon-neuf";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

/**
 * Affiché sur /inscription quand l'utilisateur arrive depuis une estimation (brouillon présent) :
 * « Ton estimation est prête — on te la garde ». Rien si pas de brouillon (arrivée directe).
 * La fourchette part du même total que le projet qui sera créé : lignes perso comprises (D8).
 * Traduit (FR / EN), montants au format de l'estimation rapide de la langue. Masqué sur l'écran « C'est envoyé »
 * (`AuthShell`) : l'écran dit lui-même que le lien ramène là où l'on en était. Compact (une ligne de texte) : sur un
 * portable (1366 × 657), le champ, le bouton et la mention des CGU restent au-dessus du pli.
 */
const DRAFT_KEY = "avyora-estim-v2";

export function EstimationRappel() {
  const [info, setInfo] = useState<{ lo: number; hi: number; label: string } | null>(null);
  const locale = useLocale();
  const tr = useT();
  const maisonNeuve = dictNeufCommun(locale).maisonNeuve;
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const fmt = (n: number) => n.toLocaleString(nf);
  // Le type de bien du brouillon est écrit en français (« Maison », « Appartement ») : dit dans la langue de la page.
  const typeBien = (v: string | undefined) =>
    v === "Maison" ? tr.rapide.typeMaison : v === "Appartement" ? tr.rapide.typeAppart : v || tr.auth.rappel.bien;

  useEffect(() => {
    // Construction neuve (son drapeau posé) : son brouillon, chiffré sur le catalogue du neuf.
    // Brouillon absent ou illisible : on retombe sur le rappel de la rénovation, comme avant.
    try {
      if (reclamationNeufPosee((k) => localStorage.getItem(k))) {
        const d = lireBrouillonNeuf(localStorage.getItem(CLE_BROUILLON_NEUF));
        const ttc = d ? totauxAvecPerso(buildDevis(catalogueDe(d.ctx), d.ctx, d.sel).totaux, d.custom, d.ctx.aleas).ttc : 0;
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
      const d = JSON.parse(raw) as { ctx?: Ctx; sel?: Selection; custom?: unknown };
      if (!d?.ctx || !d?.sel) return;
      const ttc = totauxAvecPerso(buildDevis(CATALOG, d.ctx, d.sel).totaux, d.custom, d.ctx.aleas).ttc;
      if (!(ttc > 0)) return;
      const lo = Math.round((ttc * 0.85) / 100) * 100;
      const hi = Math.round((ttc * 1.15) / 100) * 100;
      const label = `${typeBien(d.ctx.type)} ${d.ctx.surface} m²`;
      setInfo({ lo, hi, label });
    } catch {
      /* pas de brouillon lisible */
    }
    // relu quand la langue change : `typeBien` en dépend
  }, [maisonNeuve, locale]);

  if (!info) return null;
  return (
    <div className="mb-4 rounded-field border border-brand-200 bg-brand-50 p-3 group-has-[[data-lien-envoye]]/auth:hidden sm:mb-5 sm:px-4" data-estimation-rappel="">
      <p className="eyebrow mb-0.5">{tr.auth.rappel.titre}</p>
      <p className="data text-lg font-semibold text-ink">
        {fmt(info.lo)} – {fmt(info.hi)} €
      </p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">{tr.auth.rappel.texte(info.label)}</p>
    </div>
  );
}

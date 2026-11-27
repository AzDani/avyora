"use client";

import { useEffect, useState } from "react";
import { CLE_BROUILLON_NEUF, lireBrouillonNeuf, reclamationNeufPosee } from "@/lib/estimateur/brouillon-neuf";
import { CLE_BROUILLON_RENO, lireBrouillonReno, libelleBrouillonReno } from "@/lib/estimateur/brouillon-reno";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

/**
 * Affiché sur /inscription quand l'utilisateur arrive depuis une estimation (brouillon présent) :
 * « Ton estimation est prête — on te la garde ». Rien si pas de brouillon (arrivée directe).
 * SANS montant (décision de Dani du 27/11/2026, option 1) : le résultat se voit avec un compte, et le barème de prix
 * ne part plus dans le JavaScript public ; le rappel dit quel bien est estimé (« Maison neuve 120 m² »). Traduit (FR / EN). Masqué sur l'écran « C'est envoyé »
 * (`AuthShell`) : l'écran dit lui-même que le lien ramène là où l'on en était. Compact (une ligne de texte) : sur un
 * portable (1366 × 657), le champ, le bouton et la mention des CGU restent au-dessus du pli.
 *
 * Rénovation : le brouillon est relu comme pour sa réclamation (`lireBrouillonReno` : code postal à
 * 5 chiffres, surface non nulle). Un « Détail poste par poste » cliqué sur un formulaire vierge ne
 * range plus rien, et un vieux brouillon sans code postal ne s'affiche plus comme « ton estimation ».
 */
const DRAFT_KEY = CLE_BROUILLON_RENO;

export function EstimationRappel() {
  const [info, setInfo] = useState<{ label: string } | null>(null);
  const locale = useLocale();
  const tr = useT();
  const maisonNeuve = dictNeufCommun(locale).maisonNeuve;
  const nf = locale === "en" ? "en-US" : "fr-FR";
  // Le type de bien du brouillon est écrit en français (« Maison », « Appartement ») : dit dans la langue de la page.
  const typeBien = (v: string | undefined) =>
    v === "Maison" ? tr.rapide.typeMaison : v === "Appartement" ? tr.rapide.typeAppart : v || tr.auth.rappel.bien;
  const piece = (k: string) => tr.rapide.rooms[k] ?? k;

  useEffect(() => {
    // Construction neuve (son drapeau posé) : son brouillon.
    // Brouillon absent ou illisible : on retombe sur le rappel de la rénovation, comme avant.
    try {
      if (reclamationNeufPosee((k) => localStorage.getItem(k))) {
        const d = lireBrouillonNeuf(localStorage.getItem(CLE_BROUILLON_NEUF));
        if (d && d.ctx.surface > 0) {
          setInfo({ label: `${maisonNeuve} ${d.ctx.surface} m²` });
          return;
        }
      }
    } catch {
      /* stockage illisible : on retombe sur le chemin de la rénovation */
    }
    try {
      const d = lireBrouillonReno(localStorage.getItem(DRAFT_KEY));
      if (!d) return;
      setInfo({ label: libelleBrouillonReno(d, { type: typeBien, piece }, nf) });
    } catch {
      /* pas de brouillon lisible */
    }
    // relu quand la langue change : `typeBien` en dépend
  }, [maisonNeuve, locale]);

  if (!info) return null;
  return (
    <div className="mb-4 rounded-field border border-brand-200 bg-brand-50 p-3 group-has-[[data-lien-envoye]]/auth:hidden sm:mb-5 sm:px-4" data-estimation-rappel="">
      <p className="eyebrow mb-0.5">{tr.auth.rappel.titre}</p>
      <p className="text-[14px] leading-snug text-ink">{tr.auth.rappel.texte(info.label)}</p>
    </div>
  );
}

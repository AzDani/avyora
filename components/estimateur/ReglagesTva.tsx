"use client";

/**
 * Réglages « TVA et prix » d'un projet détaillé (rénovation et neuf, 25/11/2026, maquette V4 validée par
 * Dani) : qui paie (particulier / professionnel), affichage HT / TTC, qui fait les travaux (tout le projet
 * d'un coup), et « Tout remettre en automatique » avec confirmation. Règles : `lib/estimateur/tva.ts`.
 */
import { useState } from "react";
import { Intertitre, Segment } from "./intake";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictTva } from "@/lib/i18n/tva";
import { choisirPayeur, choisirAffichage, estPro, enHT, quiFait, toutFaire, nbRetouches, toutAutomatique } from "@/lib/estimateur/tva";
import type { Ctx, Lot, Selection } from "@/lib/estimateur";

export const REGLAGES_TVA_CSS = `
.av-estim .rtva{display:grid;gap:4px}
.av-estim .rtva .aide{font-size:11.5px;color:var(--faint);line-height:1.45;margin:2px 0 4px}
.av-estim .rtva .rtva-bas{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:8px;padding:9px 12px;border-radius:10px;background:var(--brand-50);font-size:12.5px;color:var(--muted)}
.av-estim .rtva .rtva-bas b{color:var(--ink)}
.av-estim .rtva .rtva-btn{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line);background:var(--surface);color:var(--brand);border-radius:8px;padding:5px 10px;cursor:pointer}
.av-estim .rtva .rtva-btn.plein{background:var(--brand);border-color:var(--brand);color:#fff}
.av-estim .rtva .rtva-btn.lien{border-color:transparent;background:none}
.av-estim .rtva .rtva-ask{color:#8a5208;font-weight:600}
.av-estim .rtva .rtva-btn:focus-visible{outline:2px solid var(--accent-600);outline-offset:1px}
`;

export function ReglagesTva({ ctx, setCtx, cat, sel, setSel, visite }: {
  ctx: Ctx; setCtx: (f: (c: Ctx) => Ctx) => void; cat: Lot[]; sel: Selection; setSel: (f: (s: Selection) => Selection) => void;
  /** La cible de la visite guidée (`data-visite`). */
  visite?: string;
}) {
  const tv = dictTva(useLocale()).reglages;
  const [demande, setDemande] = useState(false);
  const pro = estPro(ctx), ht = enHT(ctx);
  const qui = quiFait(cat, ctx, sel);
  const n = nbRetouches(sel);
  return (
    <div className="rtva" data-visite={visite}>
      <Intertitre>{tv.payeurT}</Intertitre>
      <Segment aria={tv.payeurT} valeur={pro ? "pro" : "part"} onChoix={(v) => setCtx((c) => choisirPayeur(c, v === "pro"))}
        options={[{ v: "part", label: tv.particulier }, { v: "pro", label: tv.pro }]} />
      <div className="aide">{tv.payeurAide(pro)}</div>

      <Intertitre>{tv.affichageT}</Intertitre>
      <Segment aria={tv.affichageT} valeur={ht ? "ht" : "ttc"} onChoix={(v) => setCtx((c) => choisirAffichage(c, v === "ht"))}
        options={[{ v: "ttc", label: tv.ttc }, { v: "ht", label: tv.ht }]} />
      <div className="aide">{tv.affichageAide}</div>

      <Intertitre>{tv.quiT}</Intertitre>
      <Segment aria={tv.quiT} valeur={qui ?? "art"} onChoix={(v) => { if (v !== "mix") setSel((s) => toutFaire(cat, ctx, s, v === "soi")); }}
        options={[{ v: "art", label: tv.artisans }, { v: "soi", label: tv.moi }, ...(qui === "mix" ? [{ v: "mix" as const, label: tv.casParCas }] : [])]} />
      <div className="aide">{tv.quiAide(qui)}</div>

      <div className="rtva-bas" aria-live="polite">
        {!n ? <span>{tv.retouches(0)}</span> : !demande ? (
          <>
            <span><b>{tv.retouches(n)}</b></span>
            <button type="button" className="rtva-btn" onClick={() => setDemande(true)}>{tv.toutAuto}</button>
          </>
        ) : (
          <>
            <span className="rtva-ask">{tv.confirmer(n)}</span>
            <button type="button" className="rtva-btn plein" onClick={() => { setSel(toutAutomatique); setDemande(false); }}>{tv.oui}</button>
            <button type="button" className="rtva-btn lien" onClick={() => setDemande(false)}>{tv.annuler}</button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * Barre live des estimations détaillées (sticky, nuit) : total animé, jauge du budget, bascule
 * « Voir mon devis » / « Modifier » et enregistrement. Partagée par la rénovation et le neuf (chantier
 * N6) ; le neuf y ajoute son prix au m² (`m2`). Aucun texte en dur, aucun montant calculé ici : le
 * total vient du moteur (lignes perso comprises, `totauxAvecPerso`).
 */
import type { ReactNode } from "react";
import { CountUp } from "./CountUp";
import { fmt } from "./partage";

export interface TextesBarreLive {
  totalK: string; ttc: string; budget: (b: string) => string; depasse: (x: string) => string; reste: (x: string) => string;
  sansBudget: string; voirDevis: string; modifier: string; enregistrer: string; enregistrerModifs: string; enregistrement: string;
}

/** Part du budget consommée (jauge, 100 % au plus) et dépassement. */
export function jaugeBudget(total: number, budget: number): { over: boolean; pct: number } {
  return { over: budget > 0 && total > budget, pct: budget > 0 ? Math.min(100, (total / budget) * 100) : 0 };
}

export function BarreLive({ total, budget, m2, vue, onVue, onEnregistrer, saving, edition, erreur, t, className }: {
  total: number; budget: number; m2?: ReactNode; vue: "saisie" | "devis"; onVue: (v: "saisie" | "devis") => void;
  onEnregistrer: () => void; saving: boolean; edition: boolean; erreur: string | null; t: TextesBarreLive; className?: string;
}) {
  const { over, pct } = jaugeBudget(total, budget);
  return (
    <div className={"av-estim-live" + (className ? " " + className : "") + (budget > 0 ? "" : " nobudget")}>
      <div className="live-in">
        <div className="totb">
          <div className="lbl">{t.totalK}</div>
          <div className="big"><CountUp value={total} /><small>{t.ttc}</small></div>
          {m2}
        </div>
        <div className="jauge">
          <div className="jtext">
            {budget > 0
              ? <>{t.budget(fmt(budget))} · {over ? <b style={{ color: "#fca5a5" }}>{t.depasse(fmt(total - budget))}</b> : <>{t.reste(fmt(budget - total))}</>}</>
              : t.sansBudget}
          </div>
          <div className="jbar"><div className={"jfill" + (over ? " over" : "")} style={{ width: pct + "%" }} /></div>
        </div>
        <button type="button" className="cta" onClick={() => { onVue(vue === "devis" ? "saisie" : "devis"); window.scrollTo(0, 0); }}>
          {vue === "devis" ? t.modifier : t.voirDevis}
        </button>
        <button type="button" className="save" onClick={onEnregistrer} disabled={saving}>
          {saving ? t.enregistrement : edition ? t.enregistrerModifs : t.enregistrer}
        </button>
        {erreur && <div className="err" role="alert">{erreur}</div>}
      </div>
    </div>
  );
}

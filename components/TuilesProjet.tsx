"use client";

/**
 * Tableau de bord d'un projet enregistré : une tuile par espace (estimation, suivi de chantier, budget réel,
 * investissement) qui résume son état ; un clic affiche l'espace sous les tuiles (EstimationResultat masque les
 * autres). Les chiffres sont préparés par EstimationResultat ; ce composant ne fait que les mettre en forme.
 */
import { useLocale } from "@/components/i18n/LangProvider";
import { euros, nombre, pourcent } from "@/lib/i18n/nombres";

export type Espace = "estim" | "chantier" | "budget" | "invest";

/** Résumé que la section Investissement remonte, déjà mis en forme dans la langue de la page. */
export type ResumeInvest =
  | { etat: "off" }
  | { etat: "incomplet"; strategie: "location" | "revente" }
  | { etat: "ok"; strategie: "location" | "revente"; valeur: string; detail: string; ton: "pos" | "neg" };

export type DonneesTuiles = {
  estim: { ttc: number; m2: number };
  chantier: { fait: number; enCours: number; total: number };
  /** undefined : espace indisponible (compte gratuit) ; nbDepenses = 0 : rien de saisi. */
  budget?: { prevision: number; estimation: number; nbDepenses: number; depasse: boolean };
  invest?: ResumeInvest | null;
};

const TR = {
  fr: {
    titre: "Ton projet en un coup d'œil",
    estim: "Estimation", chantier: "Chantier", budget: "Budget réel", invest: "Investissement",
    marge: "±15 %",
    pasCommence: "Pas encore commencé", taches: (f: number, n: number) => `${f} tâche${f > 1 ? "s" : ""} sur ${n} faite${f > 1 ? "s" : ""}`, enCours: (n: number) => `${n} en cours`,
    aucuneDepense: "Aucune dépense", aucuneSub: "Note tes dépenses pour voir l'écart avec le prévu",
    vsPrevu: (e: string, p: string) => `${e} · ${p} vs prévu`, prevision: "prévision de fin",
    offV: "Pas activé", offS: "Location ou achat-revente, après impôts",
    incompletV: "À compléter", incompletLoc: "Prix d'achat, loyer et revenus", incompletRev: "Prix d'achat et prix de revente",
    go: { estim: "Voir le détail", chantier: "Suivre le chantier", budget: "Mes dépenses", budgetVide: "Ajouter une dépense", invest: "Ouvrir", investOff: "Simuler", investInc: "Compléter" },
  },
  en: {
    titre: "Your project at a glance",
    estim: "Estimate", chantier: "Site", budget: "Actual budget", invest: "Investment",
    marge: "±15%",
    pasCommence: "Not started yet", taches: (f: number, n: number) => `${f} of ${n} task${n > 1 ? "s" : ""} done`, enCours: (n: number) => `${n} in progress`,
    aucuneDepense: "No expenses", aucuneSub: "Log your expenses to see the gap with the plan",
    vsPrevu: (e: string, p: string) => `${e} · ${p} vs plan`, prevision: "end-of-work forecast",
    offV: "Not on", offS: "Rental or buy-to-resell, after tax",
    incompletV: "To complete", incompletLoc: "Purchase price, rent and income", incompletRev: "Purchase and resale price",
    go: { estim: "See details", chantier: "Track the site", budget: "My expenses", budgetVide: "Add an expense", invest: "Open", investOff: "Simulate", investInc: "Complete" },
  },
} as const;

export const CSS_TUILES = `
.av-tuiles{margin-bottom:16px}
.av-tuiles h2{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);font-weight:600;margin:0 0 8px}
.av-tuiles .grille{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.av-tuiles .tu{font:inherit;text-align:left;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;color:var(--ink);min-width:0;min-height:44px;box-shadow:var(--shadow-sm)}
.av-tuiles .tu:hover{border-color:var(--brand-200)}
.av-tuiles .tu:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.av-tuiles .tu[aria-pressed="true"]{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-100)}
.av-tuiles .k{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:600}
.av-tuiles .tu[aria-pressed="true"] .k{color:var(--brand)}
.av-tuiles .v{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;font-size:19px;font-weight:600;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-tuiles .v.vide{font-family:var(--font-geist-sans);font-size:15px;letter-spacing:-.01em;color:var(--muted)}
.av-tuiles .v.pos{color:#0f9d6b}.av-tuiles .v.neg{color:#b42318}
.av-tuiles .s{font-size:11.5px;color:var(--muted);line-height:1.35}
.av-tuiles .p{display:inline-flex;font-size:11px;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap}
.av-tuiles .p.ok{background:#e6f7f0;color:#0f9d6b}.av-tuiles .p.w{background:#fdf1e1;color:#9a5a0b}.av-tuiles .p.r{background:#fdecec;color:#b42318}
.av-tuiles .mini{height:6px;border-radius:99px;background:var(--line);overflow:hidden;display:flex;margin:2px 0}
.av-tuiles .mini i{display:block;height:100%}
.av-tuiles .mini .d{background:#0f9d6b}.av-tuiles .mini .e{background:var(--brand-500,#6366f1)}
.av-tuiles .go{margin-top:auto;padding-top:4px;font-size:12px;font-weight:600;color:var(--brand)}
@media (max-width:560px){
  .av-tuiles .grille{grid-template-columns:1fr 1fr;gap:8px}
  .av-tuiles .tu{padding:10px 11px;border-radius:14px}
  .av-tuiles .v{font-size:16.5px}
}
@media (prefers-reduced-motion:no-preference){.av-tuiles .tu{transition:border-color .15s var(--ease),box-shadow .15s var(--ease)}}
`;

export default function TuilesProjet({ donnees: d, actif, onChoisir }: { donnees: DonneesTuiles; actif: Espace; onChoisir: (e: Espace) => void }) {
  const locale = useLocale();
  const t = TR[locale];
  const fmt = (v: number): string => euros(locale, v);
  const tuile = (id: Espace, contenu: React.ReactNode) => (
    <button key={id} type="button" className="tu" aria-pressed={actif === id} aria-controls={`espace-${id}`} onClick={() => onChoisir(id)}>
      {contenu}
    </button>
  );

  const ch = d.chantier;
  const pctFait = ch.total > 0 ? ch.fait / ch.total : 0, pctCours = ch.total > 0 ? ch.enCours / ch.total : 0;
  const b = d.budget;
  const ecart = b ? b.prevision - b.estimation : 0;
  const ecartPct = b && b.estimation > 0 ? ecart / b.estimation : 0;
  const signe = (v: number): string => (Math.round(v) > 0 ? "+" : Math.round(v) < 0 ? "−" : "") + fmt(Math.abs(v));
  const iv = d.invest;

  return (
    <div className="av-tuiles">
      <h2>{t.titre}</h2>
      <div className="grille">
        {tuile("estim", <>
          <span className="k">{t.estim}</span>
          <span className="v">{fmt(d.estim.ttc)}</span>
          <span className="s">{nombre(locale, d.estim.m2, 0)} €/m² · {t.marge}</span>
          <span className="go">{t.go.estim} →</span>
        </>)}
        {tuile("chantier", <>
          <span className="k">{t.chantier}</span>
          <span className="v">{pourcent(locale, pctFait * 100, 0)}</span>
          <span className="mini" aria-hidden="true"><i className="d" style={{ width: `${pctFait * 100}%` }} /><i className="e" style={{ width: `${pctCours * 100}%` }} /></span>
          <span className="s">{ch.fait === 0 && ch.enCours === 0 ? t.pasCommence : t.taches(ch.fait, ch.total) + (ch.enCours ? " · " + t.enCours(ch.enCours) : "")}</span>
          <span className="go">{t.go.chantier} →</span>
        </>)}
        {b && tuile("budget", b.nbDepenses === 0 ? <>
          <span className="k">{t.budget}</span>
          <span className="v vide">{t.aucuneDepense}</span>
          <span className="s">{t.aucuneSub}</span>
          <span className="go">{t.go.budgetVide} →</span>
        </> : <>
          <span className="k">{t.budget}</span>
          <span className="v">{fmt(b.prevision)}</span>
          <span className="s"><span className={"p " + (b.depasse || ecartPct > 0.05 ? "r" : ecart > 0.5 ? "w" : "ok")}>{t.vsPrevu(signe(ecart), (ecartPct > 0 ? "+" : ecartPct < 0 ? "−" : "") + pourcent(locale, Math.abs(ecartPct) * 100, 0))}</span></span>
          <span className="s">{t.prevision}</span>
          <span className="go">{t.go.budget} →</span>
        </>)}
        {iv !== undefined && tuile("invest", !iv || iv.etat === "off" ? <>
          <span className="k">{t.invest}</span>
          <span className="v vide">{t.offV}</span>
          <span className="s">{t.offS}</span>
          <span className="go">{t.go.investOff} →</span>
        </> : iv.etat === "incomplet" ? <>
          <span className="k">{t.invest}</span>
          <span className="v vide">{t.incompletV}</span>
          <span className="s">{iv.strategie === "revente" ? t.incompletRev : t.incompletLoc}</span>
          <span className="go">{t.go.investInc} →</span>
        </> : <>
          <span className="k">{t.invest}</span>
          <span className={"v " + iv.ton}>{iv.valeur}</span>
          <span className="s">{iv.detail}</span>
          <span className="go">{t.go.invest} →</span>
        </>)}
      </div>
    </div>
  );
}

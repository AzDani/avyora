"use client";

/**
 * Carte de résultat d'estimation — branchée sur le moteur estimateur (ctx + sel des reponses).
 * Remplace l'ancien RapportEstimation pour les projets au format estimateur. Même esthétique que
 * l'estimateur (hero nuit, Geist Mono, tuiles), + statistiques de travaux « à connaître ».
 */
import { useMemo, useState, useCallback } from "react";
import { EST_CSS } from "./estimateur-styles";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import {
  buildDevis, totals, customTotals, ICON, statutLigne, cleLegacy, regionCoef, piecesEff, type Ctx, type Selection,
  catalogueDe, estNeuf, phasesDe, tachesParCle, estJalon, geometrieNeuf, maisonComplete, piecesNeuf,
} from "@/lib/estimateur";
import { decoupe, INFO_PHASES, qteNeuf, premiersCorps } from "@/lib/estimateur/etapes-neuf";
import { totauxAvecPerso, persoValidees, lotsAvecPerso } from "@/lib/estimateur/projet";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";
import { normaliserCles } from "@/lib/estimateur/identite";
import { euros, nombre, pourcent } from "@/lib/i18n/nombres";

// Traductions de l'interface (chrome/UI uniquement) — les données (corps d'état, postes) restent telles quelles.
const TR = {
  fr: {
    unavailable: "Estimation indisponible pour ce projet.",
    badge: "Estimation · rénovation",
    inclTax: "TTC",
    mostLikely: "Le plus probable",
    margin: "marge ±15\u00a0%",
    labor: "main-d’œuvre",
    workExclTax: "Travaux HT",
    vat: "TVA",
    contingency: "Aléas",
    finish: "Finition",
    budgetLabel: "Budget",
    budgetOver: "dépassé",
    budgetLeft: "reste",
    pricePerM2: "Prix au m²",
    realCost: "ton coût réel",
    diyLot: " · tu poses beaucoup toi-même",
    scopeLabel: "Ampleur : ",
    allHiredOut: "tout fait faire",
    scaleRefresh: "rafraîch.",
    scalePartial: "partielle",
    scaleComplete: "complète",
    scaleHeavy: "lourde",
    ampleur: { refresh: "Rafraîchissement", partial: "Réno partielle", complete: "Réno complète", heavy: "Réno lourde" },
    biggestItem: "Poste le plus lourd",
    ofBudget: "du budget",
    theSite: "Le chantier",
    tradeWord: "corps",
    tradeWordP: "corps",
    itemWord: "poste",
    itemWordP: "postes",
    roomsWord: "pièces",
    ceiling: "plafond",
    whoDoesWhat: "Qui fait quoi",
    exclTaxParen: "(HT)",
    whoDoesWhatSub: "Comment se répartit ton budget entre les artisans et toi.",
    laborCap: "Main-d’œuvre",
    matPros: "Matériaux (pros)",
    matYou: "Matériaux (toi)",
    hireOut: "Fait faire",
    hireOutD1: "confié aux artisans",
    moAbbr: "MO",
    supplies: "fournitures",
    diySelf: "Tu fais toi-même",
    diyD1: "fournitures achetées",
    diyD2: "pour les postes que tu réalises",
    savings: "Économie",
    savingsD1: "main-d’œuvre évitée",
    savingsD2: "en réalisant une partie",
    ecoNoteA: "En réalisant une partie toi-même, tu évites ",
    ecoNoteB: " de main-d’œuvre.",
    whereBudget: "Où part le budget",
    whereBudgetSub1: "Par corps d’état — montants TTC · ",
    whereBudgetSub2: " corps chiffrés",
    siteTracking: "Suivi du chantier",
    theDetails: "Le détail",
    siteTrackingSub: "Marque l’avancement de chaque poste : à démarrer → en cours → terminé",
    detailsSub: "Chaque poste sélectionné, ligne par ligne",
    doneWord: "terminé",
    trackedS: "suivi",
    trackedP: "suivis",
    doneS: "terminé",
    doneP: "terminés",
    inProgress: "en cours",
    toStart: "à démarrer",
    progNoteA: "Avancement en ",
    progNoteBold: "nombre de postes",
    progNoteB: " terminés — pas en temps de travail.",
    stDone: "Terminé",
    stInProgress: "En cours",
    stToStart: "À démarrer",
    statusPrefix: "Statut : ",
    clickToChange: ", cliquer pour changer",
    dayAbbr: "j",
    modeRental: "location",
    modeDIY: "je fais",
    modeHireOut: "fait faire",
  },
  en: {
    unavailable: "Estimate unavailable for this project.",
    badge: "Estimate · renovation",
    inclTax: "incl. tax",
    mostLikely: "Most likely",
    margin: "±15% margin",
    labor: "labor",
    workExclTax: "Work (excl. tax)",
    vat: "VAT",
    contingency: "Contingency",
    finish: "Finish",
    budgetLabel: "Budget",
    budgetOver: "over",
    budgetLeft: "left",
    pricePerM2: "Price per m²",
    realCost: "your real cost",
    diyLot: " · you do a lot yourself",
    scopeLabel: "Scope: ",
    allHiredOut: "all hired out",
    scaleRefresh: "refresh",
    scalePartial: "partial",
    scaleComplete: "complete",
    scaleHeavy: "heavy",
    ampleur: { refresh: "Refresh", partial: "Partial reno", complete: "Full reno", heavy: "Heavy reno" },
    biggestItem: "Biggest line item",
    ofBudget: "of budget",
    theSite: "The site",
    tradeWord: "trade",
    tradeWordP: "trades",
    itemWord: "line item",
    itemWordP: "line items",
    roomsWord: "rooms",
    ceiling: "ceiling",
    whoDoesWhat: "Who does what",
    exclTaxParen: "(excl. tax)",
    whoDoesWhatSub: "How your budget splits between the tradespeople and you.",
    laborCap: "Labor",
    matPros: "Materials (pros)",
    matYou: "Materials (you)",
    hireOut: "Hire out",
    hireOutD1: "handed to tradespeople",
    moAbbr: "Labor",
    supplies: "supplies",
    diySelf: "You do it yourself",
    diyD1: "supplies you bought",
    diyD2: "for the items you do yourself",
    savings: "Savings",
    savingsD1: "labor avoided",
    savingsD2: "by doing part yourself",
    ecoNoteA: "By doing part yourself, you avoid ",
    ecoNoteB: " in labor.",
    whereBudget: "Where the budget goes",
    whereBudgetSub1: "By trade — amounts incl. tax · ",
    whereBudgetSub2: " trades priced",
    siteTracking: "Site tracking",
    theDetails: "The details",
    siteTrackingSub: "Mark the progress of each item: to start → in progress → done",
    detailsSub: "Each selected item, line by line",
    doneWord: "done",
    trackedS: "tracked",
    trackedP: "tracked",
    doneS: "done",
    doneP: "done",
    inProgress: "in progress",
    toStart: "to start",
    progNoteA: "Progress by ",
    progNoteBold: "number of items",
    progNoteB: " done — not by work time.",
    stDone: "Done",
    stInProgress: "In progress",
    stToStart: "To start",
    statusPrefix: "Status: ",
    clickToChange: ", click to change",
    dayAbbr: "d",
    modeRental: "rental",
    modeDIY: "DIY",
    modeHireOut: "hire out",
  },
} as const;

// Montants, nombres et pourcentages dans la langue de la page (N14) : en français, exactement le
// format d'avant (« 92 000 € », « 5,5 % ») ; en anglais, « 92,000 € », « 5.5% ».
// % lisible : entier au-delà de 1 %, une décimale en dessous → jamais « 0 % » pour un lot chiffré.
const pctLabel = (locale: string, p: number): string => pourcent(locale, p >= 1 ? Math.round(p) : Math.round(p * 10) / 10);

// Camembert « Où part le budget » : dégradé de marque ordonné par taille (plus gros = plus foncé).
const RAMP = ["#1E1B4B", "#3b2f96", "#4f46e5", "#635bf0", "#7c3aed", "#9061f2", "#a78bfa", "#bda6fb", "#cdbdfc", "#ddd0fe"];
function arcPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const r3 = (n: number) => Math.round(n * 1000) / 1000; // coords arrondies → rendu SSR/client identique (évite le mismatch d'hydratation)
  const p = (r: number, a: number): [number, number] => [r3(cx + r * Math.sin(a)), r3(cy - r * Math.cos(a))];
  const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1), [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

// Repère €/m² : rafraîchissement < 500 · partielle 500-800 · complète 800-1500 · lourde 1500+
function repereM2(e: number): { key: "refresh" | "partial" | "complete" | "heavy"; posPct: number } {
  const key = e < 500 ? "refresh" : e < 800 ? "partial" : e < 1500 ? "complete" : "heavy";
  return { key, posPct: Math.max(2, Math.min(98, (e / 2200) * 100)) };
}

const EXTRA_CSS = `
.av-estim .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.av-estim .stat{border:1px solid var(--line);border-radius:var(--radius-card);padding:16px 18px;background:var(--surface);box-shadow:var(--shadow-sm)}
.av-estim .stat .k{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.av-estim .stat .v{font-family:var(--font-geist-mono),monospace;font-weight:600;font-size:26px;margin-top:6px;color:var(--ink);letter-spacing:-.02em}
.av-estim .stat .sub{font-size:12px;color:var(--muted);margin:4px 0 0}
.av-estim .rep{margin-top:10px}
.av-estim .rep .bar{position:relative;height:8px;border-radius:999px;background:linear-gradient(90deg,#8ee6c2,#c4b5fd,#f6c58a,#f2a3a3)}
.av-estim .rep .mark{position:absolute;top:-3px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--brand);transform:translateX(-50%);box-shadow:0 1px 3px rgba(0,0,0,.25)}
.av-estim .rep .scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--faint);margin-top:5px}
.av-estim .top .track{background:var(--surface-2)}
.av-estim .prog{margin:14px 0 6px;background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.av-estim .prog .prow{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.av-estim .prog .ppct{font-family:var(--font-geist-mono),monospace;font-size:30px;font-weight:600;letter-spacing:-.02em;color:var(--ink)}
.av-estim .prog .ppct small{font-size:13px;color:var(--muted);font-weight:500;margin-left:4px}
.av-estim .prog .plbl{font-size:12px;color:var(--muted)}
.av-estim .prog .ptrack{margin-top:12px;height:12px;border-radius:999px;background:var(--line);overflow:hidden;display:flex}
.av-estim .prog .pfill{height:100%;background:#0f9d6b;transition:width .3s var(--ease)}
.av-estim .prog .pprog{height:100%;background:#efb44d;transition:width .3s var(--ease)}
.av-estim .prog .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.av-estim .prog .chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--line)}
.av-estim .prog .chip .cd{width:8px;height:8px;border-radius:50%}
.av-estim .prog .chip.done .cd{background:#0f9d6b}
.av-estim .prog .chip.cur .cd{background:#efb44d}
.av-estim .prog .chip.wait .cd{background:var(--line-strong)}
.av-estim .prog .chip b{font-family:var(--font-geist-mono),monospace}
.av-estim .prognote{font-size:11px;color:var(--faint);margin:10px 0 0}
.av-estim .prognote b{color:var(--muted);font-weight:600}
.av-estim .dtl.chant{grid-template-columns:1fr auto auto}
.av-estim .stbtn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-geist-sans);font-size:11px;font-weight:600;padding:5px 12px;border-radius:999px;cursor:pointer;white-space:nowrap;min-width:104px;justify-content:center;transition:.14s var(--ease);background:var(--surface);border:1px solid var(--line-strong);color:var(--muted)}
.av-estim .stbtn .ic{width:11px;height:11px;border-radius:50%;border:2px solid currentColor;display:inline-block}
.av-estim .st1{background:#fdf1e1;border-color:#f0c98a;color:#b06d10}
.av-estim .st1 .ic{border:0;background:currentColor;width:9px;height:9px}
.av-estim .st2{background:#e6f7f0;border-color:transparent;color:#0f9d6b}
.av-estim .st2 .ic{border:0}
.av-estim .qfq .split{display:flex;height:14px;border-radius:8px;overflow:hidden;margin-top:14px;gap:2px;background:var(--surface-2)}
.av-estim .qfq .split i{display:block;height:100%}
.av-estim .qfq .legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px}
.av-estim .qfq .legend span{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted)}
.av-estim .qfq .legend .dot{width:9px;height:9px;border-radius:3px}
.av-estim .qfq .legend b{color:var(--ink);font-weight:600;font-family:var(--font-geist-mono),monospace;white-space:nowrap}
.av-estim .qfq .legend .pct{font-family:var(--font-geist-mono),monospace;color:var(--faint);font-weight:600}
.av-estim .qfq .cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:18px}
.av-estim .qfq .qc{border:1px solid var(--line);border-radius:13px;padding:15px 14px;background:var(--surface)}
.av-estim .qfq .qc.good{background:#e6f7f0;border-color:transparent}
.av-estim .qfq .qc .k{font-size:10.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--faint)}
.av-estim .qfq .qc .k .pct{float:right;color:var(--brand);font-family:var(--font-geist-mono),monospace}
.av-estim .qfq .qc.good .k .pct{color:#0f9d6b}
.av-estim .qfq .qc .v{font-family:var(--font-geist-mono),monospace;font-size:22px;font-weight:600;margin-top:8px;letter-spacing:-.01em;white-space:nowrap}
.av-estim .qfq .qc.good .v{color:#0f9d6b}
.av-estim .qfq .qc .d{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.45}
.av-estim .qfq .eco-note{display:flex;align-items:center;gap:10px;margin-top:16px;background:#e6f7f0;border-radius:11px;padding:12px 14px;font-size:12.5px;color:var(--ink);line-height:1.4}
.av-estim .qfq .eco-note svg{width:20px;height:20px;flex:none;color:#0f9d6b}
.av-estim .qfq .eco-note b{color:#0f9d6b;font-family:var(--font-geist-mono),monospace;white-space:nowrap}
@media(max-width:520px){.av-estim .qfq .cards{grid-template-columns:1fr}}
.av-estim .bud .chart{display:flex;align-items:center;gap:26px;margin-top:16px}
.av-estim .bud .donut{position:relative;flex:none;width:186px;height:186px}
.av-estim .bud .donut svg{width:186px;height:186px;display:block}
.av-estim .bud .donut .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 26px}
.av-estim .bud .donut .center .v{font-family:var(--font-geist-mono),monospace;font-size:15px;font-weight:600;letter-spacing:-.02em;line-height:1.1;color:var(--ink)}
.av-estim .bud .donut .center .kk{font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:.12em;margin-top:3px}
.av-estim .bud .donut path{transition:opacity .15s}
.av-estim .bud .donut:hover path{opacity:.45}
.av-estim .bud .donut path:hover{opacity:1}
.av-estim .bud .legend{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.av-estim .bud .lg{display:grid;grid-template-columns:14px 1fr auto auto;align-items:center;gap:9px;padding:5px 6px;border-radius:8px;font-size:12.5px}
.av-estim .bud .lg:hover{background:var(--surface-2)}
.av-estim .bud .lg .dot{width:10px;height:10px;border-radius:3px}
.av-estim .bud .lg .nm{color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-estim .bud .lg .am{font-family:var(--font-geist-mono),monospace;color:var(--muted);text-align:right;font-size:11.5px}
.av-estim .bud .lg .pc{font-family:var(--font-geist-mono),monospace;color:var(--ink);font-weight:600;text-align:right;min-width:38px}
@media(max-width:560px){.av-estim .bud .chart{flex-direction:column;gap:16px}}
.av-estim .hero .four{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;font-weight:600;font-size:clamp(26px,5.5vw,38px);letter-spacing:-.02em;margin:14px 0 0;position:relative;z-index:1;line-height:1}
.av-estim .hero .four .s{opacity:.5;margin:0 6px}
.av-estim .hero .four small{font-size:15px;opacity:.7;font-family:var(--font-geist-sans);margin-left:6px}
.av-estim .hero .cap{position:relative;z-index:1;font-size:13px;color:#d7d4f2;margin-top:10px}
.av-estim .hero .cap b{color:#fff;font-weight:600;font-family:var(--font-geist-mono),monospace}
.av-estim .hero .zone{position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);font-size:11px;font-weight:600;padding:5px 11px;border-radius:999px;color:#fff}
.av-estim .hero .jauge{position:relative;z-index:1;margin-top:16px}
.av-estim .hero .jlbl{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:11px;color:#c4b5fd;margin-bottom:6px}
.av-estim .hero .jlbl .jval{color:#fff;font-weight:600;font-size:11.5px}
.av-estim .hero .jbar{height:8px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}
.av-estim .hero .jfill{height:100%;border-radius:999px;background:linear-gradient(90deg,#a78bfa,#4f46e5);transition:width .3s var(--ease)}
.av-estim .hero .jfill.over{background:linear-gradient(90deg,#f59e0b,#e0434b)}
`;

// Construction neuve seulement : jalon en tête de phase, badge « Démarche ». Injecté uniquement
// pour un projet neuf, la fiche rénovation garde exactement le même DOM.
const NEUF_CSS = `
.av-estim .jal{display:flex;align-items:flex-start;gap:8px;font-size:11.5px;color:var(--muted);margin:2px 0 6px;padding:6px 2px 6px 36px;line-height:1.4}
.av-estim .jal .ck{flex:none;display:inline-grid;place-items:center;width:14px;height:14px;border-radius:50%;border:2px solid var(--line-strong);margin-top:1px;font-size:9px;font-weight:700;color:#fff}
.av-estim .jal.ok{color:#0f9d6b}
.av-estim .jal.ok .ck{background:#0f9d6b;border-color:#0f9d6b}
.av-estim .jal b{font-weight:600;color:var(--ink)}
.av-estim .jal.ok b{color:#0f9d6b}
.av-estim .dtl .dem{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:#fdf1e1;color:#b06d10;white-space:nowrap}
.av-estim .dtl.chant .dem{min-width:74px;text-align:center;box-sizing:border-box}
.av-estim .split-neuf{margin-top:8px;font-size:12px;color:var(--muted);line-height:1.45}
.av-estim .split-neuf b{color:var(--ink);font-weight:600;font-family:var(--font-geist-mono),monospace;white-space:nowrap}
@media(max-width:560px){
  .av-estim .dtl.chant{grid-template-columns:minmax(0,1fr) auto;row-gap:6px;padding:9px 0}
  .av-estim .dtl.chant>span:first-child{grid-column:1/-1}
  .av-estim .dtl.chant .stbtn,.av-estim .dtl.chant .dem{justify-self:start}
  .av-estim .dtl.chant .stbtn{min-height:44px;padding:0 16px;font-size:12px}
}
`;

export default function EstimationResultat({ reponses, projectId, readOnly }: { reponses: { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; codePostal?: string; custom?: unknown }; projectId?: string; readOnly?: boolean }) {
  const locale = useLocale();
  const s = TR[locale];
  const rapide = useT().rapide; // zones et niveaux de finition : les libellés des deux rapides
  const fmt = (v: number): string => euros(locale, v);
  const nb = (v: number, dec = 0): string => nombre(locale, v, dec);
  // Sécurité rétro-compat : le code postal (coef régional) était stocké hors ctx dans d'anciens projets.
  // `ctx` et `sel` ne changent qu'avec `reponses` : le devis n'est plus recalculé à chaque clic du suivi.
  const ctx = useMemo(() => (reponses?.ctx ? { ...reponses.ctx, codePostal: reponses.ctx.codePostal ?? reponses.codePostal } : undefined), [reponses]);
  const sel = useMemo(() => normaliserCles((reponses?.sel || {}) as Selection), [reponses]);
  const neuf = estNeuf(ctx);
  const n = dictNeufCommun(locale);
  const taches = useMemo(() => (neuf ? tachesParCle(ctx) : null), [neuf, ctx]);
  const [statuts, setStatuts] = useState<Record<string, number>>(reponses?.statuts || {});
  const [closedPh, setClosedPh] = useState<Record<string, boolean>>({}); // phases repliées (Suivi / Détail)
  const togglePh = useCallback((ph: string) => setClosedPh((p) => ({ ...p, [ph]: !p[ph] })), []);
  const dv = useMemo(() => (ctx ? buildDevis(catalogueDe(ctx), ctx, sel) : null), [ctx, sel]);
  // Construction neuve : 9 phases et une centaine de postes. Seule la phase en cours à l'ouverture
  // (la première qui n'est pas terminée) est dépliée ; les autres s'ouvrent au clic. Calculée une
  // fois : cocher le dernier poste d'une phase ne la replie pas sous le doigt. Rénovation : null.
  const phaseCourante = useMemo(() => {
    if (!neuf || !dv) return null;
    const st0 = reponses?.statuts || {};
    for (const ph of phasesDe(ctx)) {
      const l = dv.lignes.filter((li) => li.phase === ph);
      if (l.some((li) => statutLigne(st0, li) !== 2)) return ph;
    }
    return null;
  }, [neuf, dv, ctx, reponses]);

  // Suivi de chantier : statut par tâche (0 à démarrer, 1 en cours, 2 terminé), sauvegardé côté serveur.
  const cycle = useCallback((k: string, legacy?: string | null) => {
    setStatuts((prev) => {
      const vu = prev[k] != null ? prev[k] : (legacy != null ? prev[legacy] : undefined) || 0;
      const next = (vu + 1) % 3;
      const copy = { ...prev };
      if (next === 0) delete copy[k]; else copy[k] = next;
      const purge = legacy != null && copy[legacy] != null;
      if (purge) delete copy[legacy];
      if (projectId && !readOnly) {
        const post = (key: string, state: number) => fetch(`/api/projects/${projectId}/statut`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, state }),
        }).catch(() => {});
        post(k, next);
        if (purge) post(legacy, 0); /* l'ancienne clé (avec variante) disparaît de l'enregistrement */
      }
      return copy;
    });
  }, [projectId, readOnly]);

  if (!ctx || !dv) {
    return <div className="card p-5 text-sm text-muted">{s.unavailable}</div>;
  }
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  // Les lignes perso comptent dans le total, rénovation comme neuf (D8) : le même chiffre que la
  // barre live, le devis, la liste des projets et le PDF.
  const perso = persoValidees(reponses?.custom);
  const t = totauxAvecPerso(t0, perso, ctx.aleas);
  const persoHT = customTotals(perso).ht;
  const pc = (n: number) => (t.ht > 0 ? Math.round((n / t.ht) * 100) : 0); // part du coût HT
  const pcTxt = (n: number) => (locale === "en" ? pc(n) + "%" : pc(n) + "\u00a0%"); // « 31 % » / « 31% »
  // Unité d'une quantité : « 6 units » au pluriel en anglais (le français garde « u »).
  const uniteTxt = (u: string, q: number) => (locale === "en" && u === "u" && q !== 1 ? "units" : catT(locale, "unites", u));

  // Stats
  const eurM2 = ctx.surface > 0 ? t.ttc / ctx.surface : 0; // ton coût réel (avec ton bricolage)
  const lo = Math.round((t.ttc * 0.85) / 100) * 100, hi = Math.round((t.ttc * 1.15) / 100) * 100;
  const reg = regionCoef(ctx.codePostal);
  const moPct = Math.round((reg.mo - 1) * 100);

  // Sélection dérivée « tout fait faire » : même postes, mêmes quantités, mais rien de posé
  // soi-même et prix perso ignorés → on peut la donner au moteur tel quel (aucun barème recopié).
  const selFF: Selection = {};
  for (const k2 of Object.keys(sel)) {
    const v = sel[k2];
    if (!v) continue;
    const { self: _s, pu: _pu, pm: _pm, ...reste } = v;
    selFF[k2] = { ...reste, self: false };
  }

  // Valeur « tout fait faire » (MO incluse partout) → juge l'AMPLEUR réelle du chantier,
  // indépendamment de ce que l'utilisateur pose lui-même (ce qui fait baisser son €/m² sans
  // réduire l'ampleur des travaux). C'est ce qui est comparable aux repères marché. Le moteur la
  // chiffre sur le catalogue DU PROJET (celui du neuf pour une construction : la boucle recopiée
  // d'avant lisait toujours la rénovation), lignes perso comprises comme dans `eurM2`.
  const ffTTC = totauxAvecPerso(totals(catalogueDe(ctx), ctx, selFF), perso, ctx.aleas).ttc;
  const eurM2FF = ctx.surface > 0 ? ffTTC / ctx.surface : 0; // ampleur (tout fait faire)
  const rep = repereM2(eurM2FF); // le repère se base sur l'ampleur, pas sur ton coût
  const diyGap = eurM2FF - eurM2 > 30; // écart significatif → tu poses beaucoup toi-même
  // Un lot par corps d'état (en neuf, un corps revient dans plusieurs phases), plus les lignes perso
  // (TTC) dans leur corps d'état, rénovation comme neuf, comme dans le PDF : la somme des tranches =
  // le total hors aléas.
  const lotsCorps = lotsAvecPerso(lots, perso);
  const lotsTri = [...lotsCorps].sort((a, x) => x.ttc - a.ttc);
  const top = lotsTri[0];
  // Tranches du camembert « Où part le budget » (corps d'état, ordonnés par taille).
  const budgetTotal = lotsTri.reduce((s, l) => s + l.ttc, 0);
  // La part du poste le plus lourd sur la même base que la légende du camembert (TTC hors aléas),
  // rénovation comme neuf : sur le TTC aléas compris, la carte disait 13 % quand la légende disait 14 %.
  const topPct = top && budgetTotal > 0 ? Math.round((top.ttc / budgetTotal) * 100) : 0;
  let _acc = 0;
  // Neuf : les 8 plus gros corps, le reste en une part « Autres corps d'état ». Rénovation : tous.
  const lotsDonut = neuf ? premiersCorps(lotsTri, n.autresCorps) : lotsTri;
  const slices = lotsDonut.map((l, i) => {
    const a0 = budgetTotal > 0 ? (_acc / budgetTotal) * 2 * Math.PI : 0;
    _acc += l.ttc;
    const a1 = budgetTotal > 0 ? (_acc / budgetTotal) * 2 * Math.PI : 0;
    return { corps: l.corps, ttc: l.ttc, color: RAMP[Math.min(i, RAMP.length - 1)], d: arcPath(100, 100, 92, 62, a0, a1), pct: budgetTotal > 0 ? (l.ttc / budgetTotal) * 100 : 0 };
  });

  // Ventilation TVA par taux (depuis les lignes, lignes perso comprises : leur TVA est dans le total).
  // Arrondi au dixième : à l'entier, le taux de 5,5 % sortait « 6 % » ou « 5 % » selon l'arrondi
  // flottant de la ligne, et la pastille affichait « 10 % · 6 % · 5 % ».
  const tvaByRate: Record<number, number> = {};
  lignes.forEach((li) => { if (li.ht > 0 && li.tva > 0) { const r = Math.round((li.tva / li.ht) * 1000) / 10; tvaByRate[r] = (tvaByRate[r] || 0) + li.tva; } });
  perso.forEach((x) => { const h = (x.prix || 0) * (x.qte || 0); if (h > 0 && x.tva > 0) tvaByRate[x.tva] = (tvaByRate[x.tva] || 0) + (h * x.tva) / 100; });
  const tauxPresents = Object.keys(tvaByRate).map(Number).sort((a, x) => x - a);

  const budget = ctx.budget || 0;
  const over = budget > 0 && t.ttc > budget;
  const nbLots = lotsCorps.length;
  // Construction neuve : la construction contre « études, taxes, assurance, branchements », la maison décrite.
  const cut = neuf ? decoupe(dv) : null;
  const maison = neuf ? maisonComplete(ctx.neuf) : null;
  const moisChantier = maison ? geometrieNeuf(maison).moisChantier : 0;
  const chambresMaison = maison ? piecesNeuf(maison).chambres : 0;   // suites parentales comprises
  const tache = (cle: string) => taches?.get(cle);
  const nbTaches = lignes.length;

  return (
    <div className="av-estim">
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + EXTRA_CSS }} />
      {neuf && <style dangerouslySetInnerHTML={{ __html: NEUF_CSS }} />}

      {/* Hero */}
      <div className="hero">
        <span className="glow g1" /><span className="glow g2" />
        <div className="eb"><span className="dot" />{neuf ? n.badgeEstim : s.badge}</div>
        <div className="four"><span className="num">{nb(lo)}</span><span className="s">–</span><span className="num">{nb(hi)}</span> €<small>{s.inclTax}</small></div>
        <div className="cap">{s.mostLikely} <b>{fmt(t.ttc)}</b> · ≈ <b>{nb(eurM2)} €/m²</b> · {s.margin}</div>
        {ctx.codePostal && (
          <div className="zone">📍 {rapide.zones[reg.zone] ?? reg.zone}{moPct ? ` · ${s.labor} ${moPct > 0 ? "+" : ""}${pourcent(locale, moPct, 0)}` : ""}</div>
        )}
        <div className="brk">
          <div className="pill"><span className="k">{s.workExclTax}</span><br /><span className="v num">{fmt(neuf ? t.ht - b.frais : t.ht)}</span></div>
          {neuf && b.frais > 0 && (
            <div className="pill"><span className="k">{n.fraisHorsTva}</span><br /><span className="v num">{fmt(b.frais)}</span></div>
          )}
          <div className="pill"><span className="k">{s.vat} {tauxPresents.length ? "(" + tauxPresents.map((r) => pourcent(locale, r)).join(" · ") + ")" : ""}</span><br /><span className="v num">{fmt(t.tva)}</span></div>
          <div className="pill"><span className="k">{s.contingency} {pourcent(locale, ctx.aleas || 0)}</span><br /><span className="v num">{fmt(t.aleas)}</span></div>
          <div className="pill"><span className="k">{s.finish}</span><br /><span className="v" style={{ textTransform: "capitalize" }}>{rapide.finitions[ctx.finition]?.label ?? ctx.finition}</span></div>
          {budget > 0 && (
            <div className="pill"><span className="k">{s.budgetLabel} · {over ? s.budgetOver : s.budgetLeft}</span><br /><span className="v num">{over ? "− " + fmt(t.ttc - budget) : fmt(budget - t.ttc)}</span></div>
          )}
        </div>
        {/* Jauge de budget retirée pour le moment (le pill « Budget · reste » suffit). */}
      </div>

      {/* Stats à connaître */}
      <div className="stats">
        <div className="stat">
          <div className="k">{s.pricePerM2}</div>
          <div className="v"><span className="num">{nb(eurM2)}</span> €/m²</div>
          <p className="sub">{s.realCost}{!neuf && diyGap ? s.diyLot : ""}</p>
          {cut ? (
            <p className="split-neuf">{n.dontConstr} <b>{fmt(cut.constr)}</b> · {n.annexes} <b>{fmt(cut.annexes)}</b></p>
          ) : (
          <div className="rep">
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
              {s.scopeLabel}{s.ampleur[rep.key]}
              {diyGap && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · ≈ <span className="num">{nb(eurM2FF)}</span> €/m² {s.allHiredOut}</span>}
            </div>
            <div className="bar"><span className="mark" style={{ left: rep.posPct + "%" }} /></div>
            <div className="scale"><span>{s.scaleRefresh}</span><span>{s.scalePartial}</span><span>{s.scaleComplete}</span><span>{s.scaleHeavy}</span></div>
          </div>
          )}
        </div>
        <div className="stat">
          <div className="k">{s.biggestItem}</div>
          <div className="v" style={{ fontSize: 20 }}>{top ? `${ICON[top.corps] || ""} ${catT(locale, "corps", top.corps)}` : "—"}</div>
          {/* Le montant en chiffres à chasse fixe, comme les autres cartes : en Geist à 12 px, l'espace fine des milliers
              ne se voyait presque pas (« 14148 € », F1). */}
          <p className="sub">{top ? <><span className="num">{fmt(top.ttc)}</span> · {pourcent(locale, topPct, 0)} {s.ofBudget}</> : ""}</p>
        </div>
        <div className="stat">
          <div className="k">{s.theSite}</div>
          <div className="v"><span className="num">{nbLots}</span> {nbLots > 1 ? s.tradeWordP : s.tradeWord} · <span className="num">{nbTaches}</span> {nbTaches > 1 ? s.itemWordP : s.itemWord}</div>
          {maison ? (
            <p className="sub">{maison.surface} m² · {chambresMaison} {chambresMaison > 1 ? n.chambres : n.chambre} · {n.niveauxCourt[maison.niveaux] ?? n.niveauxCourt.pp} · ≈ {moisChantier} {n.moisChantier}</p>
          ) : (
            <p className="sub">{ctx.surface} m² · {piecesEff(ctx) || ctx.pieces} {s.roomsWord} · {s.ceiling} {nb(ctx.hauteur, 2)} m</p>
          )}
        </div>
      </div>

      {/* Bilan fait-faire / je fais / économie */}
      <div className="card qfq">
        <h2>{s.whoDoesWhat} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>{s.exclTaxParen}</span></h2>
        <div className="sub">{s.whoDoesWhatSub}</div>
        <div className="split">
          <i style={{ width: `${t.ht > 0 ? (b.moA / t.ht) * 100 : 0}%`, background: "var(--brand)" }} />
          <i style={{ width: `${t.ht > 0 ? (b.matA / t.ht) * 100 : 0}%`, background: "var(--accent-300)" }} />
          <i style={{ width: `${t.ht > 0 ? (b.achat / t.ht) * 100 : 0}%`, background: "var(--accent-600)" }} />
          {b.frais > 0 && <i style={{ width: `${t.ht > 0 ? (b.frais / t.ht) * 100 : 0}%`, background: "var(--line-strong)" }} />}
          {persoHT > 0 && <i style={{ width: `${t.ht > 0 ? (persoHT / t.ht) * 100 : 0}%`, background: "var(--faint)" }} />}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "var(--brand)" }} />{s.laborCap} <b>{fmt(b.moA)}</b> <span className="pct">{pcTxt(b.moA)}</span></span>
          <span><span className="dot" style={{ background: "var(--accent-300)" }} />{s.matPros} <b>{fmt(b.matA)}</b> <span className="pct">{pcTxt(b.matA)}</span></span>
          <span><span className="dot" style={{ background: "var(--accent-600)" }} />{s.matYou} <b>{fmt(b.achat)}</b> <span className="pct">{pcTxt(b.achat)}</span></span>
          {b.frais > 0 && (
            <span><span className="dot" style={{ background: "var(--line-strong)" }} />{n.fraisSeg} <b>{fmt(b.frais)}</b> <span className="pct">{pcTxt(b.frais)}</span></span>
          )}
          {persoHT > 0 && (
            <span><span className="dot" style={{ background: "var(--faint)" }} />{n.persoSeg} <b>{fmt(persoHT)}</b> <span className="pct">{pcTxt(persoHT)}</span></span>
          )}
        </div>
        <div className="cards">
          <div className="qc"><div className="k">{s.hireOut} <span className="pct">{pcTxt(b.paye)}</span></div><div className="v">{fmt(b.paye)}</div><div className="d">{s.hireOutD1}<br />{s.moAbbr} {fmt(b.moA)} · {s.supplies} {fmt(b.matA)}</div></div>
          <div className="qc"><div className="k">{s.diySelf} <span className="pct">{pcTxt(b.achat)}</span></div><div className="v">{fmt(b.achat)}</div><div className="d">{s.diyD1}<br />{s.diyD2}</div></div>
          <div className="qc good"><div className="k">{s.savings}</div><div className="v">{fmt(b.eco)}</div><div className="d">{s.savingsD1}<br />{s.savingsD2}</div></div>
        </div>
        {b.eco > 0 && (
          <div className="eco-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <span>{s.ecoNoteA}<b>{fmt(b.eco)}</b>{s.ecoNoteB}</span>
          </div>
        )}
      </div>

      {/* Où part le budget — camembert par corps d'état */}
      <div className="card bud">
        <h2>{s.whereBudget}</h2>
        <div className="sub">{s.whereBudgetSub1}{neuf ? nbLots : slices.length}{s.whereBudgetSub2}</div>
        <div className="chart">
          <div className="donut">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              {slices.map((s) => (
                <path key={s.corps} d={s.d} fill={s.color} stroke="var(--surface)" strokeWidth={2}>
                  <title>{`${catT(locale, "corps", s.corps)} — ${fmt(s.ttc)} · ${pctLabel(locale, s.pct)}`}</title>
                </path>
              ))}
            </svg>
            <div className="center"><div className="v">{fmt(budgetTotal)}</div><div className="kk">{n.donutTotal}</div></div>
          </div>
          <div className="legend">
            {slices.map((s) => (
              <div key={s.corps} className="lg">
                <span className="dot" style={{ background: s.color }} />
                <span className="nm">{ICON[s.corps] || ""} {catT(locale, "corps", s.corps)}</span>
                <span className="am">{fmt(s.ttc)}</span>
                <span className="pc">{pctLabel(locale, s.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Détail par lot + suivi de chantier (statuts sauvegardés quand projet enregistré) */}
      <div className="card">
        <h2>{projectId ? s.siteTracking : s.theDetails}</h2>
        <div className="sub">{projectId ? s.siteTrackingSub : s.detailsSub}</div>
        {projectId && (() => {
          const total = lignes.length;
          const done = lignes.filter((li) => statutLigne(statuts, li) === 2).length;
          const prog = lignes.filter((li) => statutLigne(statuts, li) === 1).length;
          const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
          const pctProg = total > 0 ? Math.round((prog / total) * 100) : 0;
          return (
            <div className="prog">
              <div className="prow">
                <div className="ppct">{pourcent(locale, pctDone, 0)}<small>{s.doneWord}</small></div>
                <div className="plbl">{total} {total > 1 ? s.itemWordP : s.itemWord} {total > 1 ? s.trackedP : s.trackedS}</div>
              </div>
              <div className="ptrack">
                <span className="pfill" style={{ width: pctDone + "%" }} />
                <span className="pprog" style={{ width: pctProg + "%" }} />
              </div>
              <div className="chips">
                <span className="chip done"><span className="cd" /><b>{done}</b> {done > 1 ? s.doneP : s.doneS}</span>
                <span className="chip cur"><span className="cd" /><b>{prog}</b> {s.inProgress}</span>
                <span className="chip wait"><span className="cd" /><b>{total - done - prog}</b> {s.toStart}</span>
              </div>
              <p className="prognote">{s.progNoteA}<b>{neuf ? n.progNoteBold : s.progNoteBold}</b>{s.progNoteB}</p>
            </div>
          );
        })()}
        {phasesDe(ctx).map((ph) => {
          const lignesPh = lignes.filter((li) => li.phase === ph);
          if (!lignesPh.length) return null;
          const open = neuf ? !(closedPh[ph] ?? ph !== phaseCourante) : !closedPh[ph];
          const donePh = projectId ? lignesPh.filter((li) => statutLigne(statuts, li) === 2).length : 0;
          return (
            <div key={ph}>
              <button type="button" className={"phase-t" + (open ? " open" : "")} onClick={() => (neuf ? setClosedPh((p) => ({ ...p, [ph]: open })) : togglePh(ph))} aria-expanded={open}>
                <span className="chev" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className="pt-lbl">{catT(locale, "phases", ph)}</span>
                <span className="pt-meta">{projectId ? `${donePh}/${lignesPh.length}` : `${lignesPh.length} ${lignesPh.length > 1 ? s.itemWordP : s.itemWord}`}</span>
              </button>
              {neuf && INFO_PHASES[ph] && (() => {
                const ok = !!projectId && donePh === lignesPh.length;
                return (
                  <div className={"jal" + (ok ? " ok" : "")}>
                    <span className="ck" aria-hidden="true">{ok ? "✓" : ""}</span>
                    <span><b>{n.jalon}</b> · {INFO_PHASES[ph].jalon[locale]}</span>
                  </div>
                );
              })()}
              {open && lignesPh.map((li, i) => {
                const k = li.cle, kOld = cleLegacy(li);
                const tk = neuf ? tache(li.cle) : undefined;
                // Démarche : seulement tant que son montant est nul (un prix perso en fait une ligne chiffrée).
                const jalon = estJalon(tk) && li.ttc === 0;
                // Ligne au pourcentage (assurance dommages-ouvrage…) : pas de quantité, sa part des travaux,
                // sauf si un prix perso l'a figée (le pourcentage n'est alors plus ce qui la chiffre).
                const qtyTxt = li.unite === "pct"
                  ? (tk?.fp != null && sel[li.cle]?.pu == null
                    ? `${pourcent(locale, tk.fp, 3)} ${tk.assiette === "projet" || (tk.frais && tk.assiette !== "travaux") ? n.pctProjet : n.pctTravaux}`
                    : "—")
                  : qteNeuf(locale, li.qty, li.unite, li.mode === "location");
                const st = statutLigne(statuts, li);
                const stLabel = st === 2 ? s.stDone : st === 1 ? s.stInProgress : s.stToStart;
                return (
                  <div key={i} className={"dtl" + (projectId ? " chant" : "")}>
                    <span>
                      {/* Variante comprise (« Windows (PVC, double-pane) ») : les deux natures, comme « Mon devis ». */}
                      {catLigne(locale, li.nom, li.cle)}
                      {projectId && li.unite !== "forfait" && (
                        neuf
                          ? <span style={{ color: "var(--faint)", fontWeight: 400 }}> · {qtyTxt}</span>
                          : <span style={{ color: "var(--faint)", fontWeight: 400 }}> · {nb(li.qty, 2)} {li.mode === "location" ? s.dayAbbr : uniteTxt(li.unite, li.qty)}</span>
                      )}
                    </span>
                    {projectId ? (
                      readOnly ? (
                        <span className={"stbtn st" + st} aria-label={s.statusPrefix + stLabel}>
                          {st === 2 ? <>✓ {s.stDone}</> : <><span className="ic" />{stLabel}</>}
                        </span>
                      ) : (
                        <button className={"stbtn st" + st} onClick={() => cycle(k, kOld)} aria-label={s.statusPrefix + stLabel + s.clickToChange}>
                          {st === 2 ? <>✓ {s.stDone}</> : <><span className="ic" />{stLabel}</>}
                        </button>
                      )
                    ) : jalon ? (
                      <>
                        <span className="q">—</span>
                        <span className="dem">{n.demarche}</span>
                      </>
                    ) : (
                      <>
                        <span className="q">{li.unite === "forfait" ? "—" : neuf ? qtyTxt : nb(li.qty, 2) + " " + (li.mode === "location" ? s.dayAbbr : uniteTxt(li.unite, li.qty))}</span>
                        <span className={"mode " + (li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA")}>
                          {li.mode === "location" ? s.modeRental : li.mode === "je-fais" ? s.modeDIY : s.modeHireOut}
                        </span>
                      </>
                    )}
                    {jalon ? (projectId ? <span className="dem">{n.demarche}</span> : <span className="m" />) : <span className="m">{fmt(li.ttc)}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

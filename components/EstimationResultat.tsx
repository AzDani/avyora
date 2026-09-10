"use client";

/**
 * Carte de résultat d'estimation — branchée sur le moteur estimateur (ctx + sel des reponses).
 * Remplace l'ancien RapportEstimation pour les projets au format estimateur. Même esthétique que
 * l'estimateur (hero nuit, Geist Mono, tuiles), + statistiques de travaux « à connaître ».
 */
import { useMemo, useState, useCallback } from "react";
import { EST_CSS } from "./estimateur-styles";
import { CATALOG, buildDevis, PHASES, ICON, visible, visibleTask, key, qtyOf, effPrices, finCoefTask, rate, regionCoef, type Ctx, type Selection } from "@/lib/estimateur";

const fmt = (n: number): string => Math.round(n).toLocaleString("fr-FR") + " €";
// % lisible : entier au-delà de 1 %, une décimale en dessous → jamais « 0 % » pour un lot chiffré.
const pctLabel = (p: number): string => (p >= 1 ? Math.round(p) : Math.round(p * 10) / 10).toLocaleString("fr-FR") + " %";

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
function repereM2(e: number): { label: string; posPct: number } {
  const label = e < 500 ? "Rafraîchissement" : e < 800 ? "Réno partielle" : e < 1500 ? "Réno complète" : "Réno lourde";
  return { label, posPct: Math.max(2, Math.min(98, (e / 2200) * 100)) };
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

export default function EstimationResultat({ reponses, projectId, readOnly }: { reponses: { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; codePostal?: string }; projectId?: string; readOnly?: boolean }) {
  // Sécurité rétro-compat : le code postal (coef régional) était stocké hors ctx dans d'anciens projets.
  const ctx = reponses?.ctx ? { ...reponses.ctx, codePostal: reponses.ctx.codePostal ?? reponses.codePostal } : undefined;
  const sel = (reponses?.sel || {}) as Selection;
  const [statuts, setStatuts] = useState<Record<string, number>>(reponses?.statuts || {});
  const [closedPh, setClosedPh] = useState<Record<string, boolean>>({}); // phases repliées (Suivi / Détail)
  const togglePh = useCallback((ph: string) => setClosedPh((p) => ({ ...p, [ph]: !p[ph] })), []);
  const dv = useMemo(() => (ctx ? buildDevis(CATALOG, ctx, sel) : null), [ctx, sel]);

  // Suivi de chantier : statut par tâche (0 à démarrer, 1 en cours, 2 terminé), sauvegardé côté serveur.
  const cycle = useCallback((k: string) => {
    setStatuts((prev) => {
      const next = ((prev[k] || 0) + 1) % 3;
      const copy = { ...prev };
      if (next === 0) delete copy[k]; else copy[k] = next;
      if (projectId && !readOnly) {
        fetch(`/api/projects/${projectId}/statut`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: k, state: next }),
        }).catch(() => {});
      }
      return copy;
    });
  }, [projectId, readOnly]);

  if (!ctx || !dv) {
    return <div className="card p-5 text-sm text-muted">Estimation indisponible pour ce projet.</div>;
  }
  const { totaux: t, bilan: b, lots, lignes } = dv;
  const pc = (n: number) => (t.ht > 0 ? Math.round((n / t.ht) * 100) : 0); // part du coût HT

  // Stats
  const eurM2 = ctx.surface > 0 ? t.ttc / ctx.surface : 0; // ton coût réel (avec ton bricolage)
  const lo = Math.round((t.ttc * 0.85) / 100) * 100, hi = Math.round((t.ttc * 1.15) / 100) * 100;
  const reg = regionCoef(ctx.codePostal);
  const moPct = Math.round((reg.mo - 1) * 100);

  // Valeur « tout fait faire » (MO incluse partout) → juge l'AMPLEUR réelle du chantier,
  // indépendamment de ce que l'utilisateur pose lui-même (ce qui fait baisser son €/m² sans
  // réduire l'ampleur des travaux). C'est ce qui est comparable aux repères marché.
  let ffHT = 0, ffTVA = 0, ffAleasBase = 0;
  CATALOG.filter((l) => visible(ctx, l)).forEach((l) =>
    l.t.forEach((tk) => {
      const s = sel[key(l.c, tk.n)];
      if (!s || !s.on || !visibleTask(ctx, tk)) return;
      const { fp: fpU, sm: smU } = effPrices(tk, s, ctx);
      if (fpU == null) return;
      const q = qtyOf(ctx, sel, l.c, tk), fc = finCoefTask(ctx, l, tk);
      const ht = (smU != null ? smU * fc + (fpU - smU) : fpU) * q; // finition sur matériaux, MO fixe
      ffHT += ht;
      ffTVA += (ht * (ctx.fiscal === "pro" ? 20 : rate(l, tk))) / 100;
      if (l.c !== "Etudes / Conception") ffAleasBase += ht;
    })
  );
  const ffTTC = ffHT + ffTVA + ffAleasBase * ((ctx.aleas || 0) / 100);
  const eurM2FF = ctx.surface > 0 ? ffTTC / ctx.surface : 0; // ampleur (tout fait faire)
  const rep = repereM2(eurM2FF); // le repère se base sur l'ampleur, pas sur ton coût
  const diyGap = eurM2FF - eurM2 > 30; // écart significatif → tu poses beaucoup toi-même
  const lotsTri = [...lots].sort((a, x) => x.ttc - a.ttc);
  const top = lotsTri[0];
  const topPct = top && t.ttc > 0 ? Math.round((top.ttc / t.ttc) * 100) : 0;
  // Tranches du camembert « Où part le budget » (corps d'état, ordonnés par taille).
  const budgetTotal = lotsTri.reduce((s, l) => s + l.ttc, 0);
  let _acc = 0;
  const slices = lotsTri.map((l, i) => {
    const a0 = budgetTotal > 0 ? (_acc / budgetTotal) * 2 * Math.PI : 0;
    _acc += l.ttc;
    const a1 = budgetTotal > 0 ? (_acc / budgetTotal) * 2 * Math.PI : 0;
    return { corps: l.corps, ttc: l.ttc, color: RAMP[Math.min(i, RAMP.length - 1)], d: arcPath(100, 100, 92, 62, a0, a1), pct: budgetTotal > 0 ? (l.ttc / budgetTotal) * 100 : 0 };
  });

  // Ventilation TVA par taux (depuis les lignes)
  const tvaByRate: Record<number, number> = {};
  lignes.forEach((li) => { if (li.ht > 0) { const r = Math.round((li.tva / li.ht) * 100); tvaByRate[r] = (tvaByRate[r] || 0) + li.tva; } });
  const tauxPresents = Object.keys(tvaByRate).map(Number).sort((a, x) => x - a);

  const budget = ctx.budget || 0;
  const over = budget > 0 && t.ttc > budget;
  const nbLots = lots.length;
  const nbTaches = lignes.length;

  return (
    <div className="av-estim">
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + EXTRA_CSS }} />

      {/* Hero */}
      <div className="hero">
        <span className="glow g1" /><span className="glow g2" />
        <div className="eb"><span className="dot" />Estimation · rénovation</div>
        <div className="four"><span className="num">{lo.toLocaleString("fr-FR")}</span><span className="s">–</span><span className="num">{hi.toLocaleString("fr-FR")}</span> €<small>TTC</small></div>
        <div className="cap">Le plus probable <b>{Math.round(t.ttc).toLocaleString("fr-FR")} €</b> · ≈ <b>{Math.round(eurM2).toLocaleString("fr-FR")} €/m²</b> · marge ±15 %</div>
        {ctx.codePostal && (
          <div className="zone">📍 {reg.zone}{moPct ? ` · main-d’œuvre ${moPct > 0 ? "+" : ""}${moPct} %` : ""}</div>
        )}
        <div className="brk">
          <div className="pill"><span className="k">Travaux HT</span><br /><span className="v num">{fmt(t.ht)}</span></div>
          <div className="pill"><span className="k">TVA {tauxPresents.length ? "(" + tauxPresents.map((r) => (r === 5.5 ? "5,5" : r) + " %").join(" · ") + ")" : ""}</span><br /><span className="v num">{fmt(t.tva)}</span></div>
          <div className="pill"><span className="k">Aléas {ctx.aleas} %</span><br /><span className="v num">{fmt(t.aleas)}</span></div>
          <div className="pill"><span className="k">Finition</span><br /><span className="v" style={{ textTransform: "capitalize" }}>{ctx.finition}</span></div>
          {budget > 0 && (
            <div className="pill"><span className="k">Budget · {over ? "dépassé" : "reste"}</span><br /><span className="v num">{over ? "− " + fmt(t.ttc - budget) : fmt(budget - t.ttc)}</span></div>
          )}
        </div>
        {/* Jauge de budget retirée pour le moment (le pill « Budget · reste » suffit). */}
      </div>

      {/* Stats à connaître */}
      <div className="stats">
        <div className="stat">
          <div className="k">Prix au m²</div>
          <div className="v"><span className="num">{Math.round(eurM2).toLocaleString("fr-FR")}</span> €/m²</div>
          <p className="sub">ton coût réel{diyGap ? " · tu poses beaucoup toi-même" : ""}</p>
          <div className="rep">
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
              Ampleur : {rep.label}
              {diyGap && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · ≈ <span className="num">{Math.round(eurM2FF).toLocaleString("fr-FR")}</span> €/m² tout fait faire</span>}
            </div>
            <div className="bar"><span className="mark" style={{ left: rep.posPct + "%" }} /></div>
            <div className="scale"><span>rafraîch.</span><span>partielle</span><span>complète</span><span>lourde</span></div>
          </div>
        </div>
        <div className="stat">
          <div className="k">Poste le plus lourd</div>
          <div className="v" style={{ fontSize: 20 }}>{top ? `${ICON[top.corps] || ""} ${top.corps}` : "—"}</div>
          <p className="sub">{top ? `${fmt(top.ttc)} · ${topPct} % du budget` : ""}</p>
        </div>
        <div className="stat">
          <div className="k">Le chantier</div>
          <div className="v"><span className="num">{nbLots}</span> corps · <span className="num">{nbTaches}</span> postes</div>
          <p className="sub">{ctx.surface} m² · {ctx.pieces} pièces · plafond {ctx.hauteur} m</p>
        </div>
      </div>

      {/* Bilan fait-faire / je fais / économie */}
      <div className="card qfq">
        <h2>Qui fait quoi <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>(HT)</span></h2>
        <div className="sub">Comment se répartit ton budget entre les artisans et toi.</div>
        <div className="split">
          <i style={{ width: `${t.ht > 0 ? (b.moA / t.ht) * 100 : 0}%`, background: "var(--brand)" }} />
          <i style={{ width: `${t.ht > 0 ? (b.matA / t.ht) * 100 : 0}%`, background: "var(--accent-300)" }} />
          <i style={{ width: `${t.ht > 0 ? (b.achat / t.ht) * 100 : 0}%`, background: "var(--accent-600)" }} />
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "var(--brand)" }} />Main-d&apos;œuvre <b>{fmt(b.moA)}</b> <span className="pct">{pc(b.moA)}&nbsp;%</span></span>
          <span><span className="dot" style={{ background: "var(--accent-300)" }} />Matériaux (pros) <b>{fmt(b.matA)}</b> <span className="pct">{pc(b.matA)}&nbsp;%</span></span>
          <span><span className="dot" style={{ background: "var(--accent-600)" }} />Matériaux (toi) <b>{fmt(b.achat)}</b> <span className="pct">{pc(b.achat)}&nbsp;%</span></span>
        </div>
        <div className="cards">
          <div className="qc"><div className="k">Fait faire <span className="pct">{pc(b.paye)}&nbsp;%</span></div><div className="v">{fmt(b.paye)}</div><div className="d">confié aux artisans<br />MO {fmt(b.moA)} · fournitures {fmt(b.matA)}</div></div>
          <div className="qc"><div className="k">Tu fais toi-même <span className="pct">{pc(b.achat)}&nbsp;%</span></div><div className="v">{fmt(b.achat)}</div><div className="d">fournitures achetées<br />pour les postes que tu réalises</div></div>
          <div className="qc good"><div className="k">Économie</div><div className="v">{fmt(b.eco)}</div><div className="d">main-d&apos;œuvre évitée<br />en réalisant une partie</div></div>
        </div>
        {b.eco > 0 && (
          <div className="eco-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <span>En réalisant une partie toi-même, tu évites <b>{fmt(b.eco)}</b> de main-d&apos;œuvre.</span>
          </div>
        )}
      </div>

      {/* Où part le budget — camembert par corps d'état */}
      <div className="card bud">
        <h2>Où part le budget</h2>
        <div className="sub">Par corps d&apos;état — montants TTC · {slices.length} corps chiffrés</div>
        <div className="chart">
          <div className="donut">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              {slices.map((s) => (
                <path key={s.corps} d={s.d} fill={s.color} stroke="var(--surface)" strokeWidth={2}>
                  <title>{`${s.corps} — ${fmt(s.ttc)} · ${pctLabel(s.pct)}`}</title>
                </path>
              ))}
            </svg>
            <div className="center"><div className="v">{fmt(budgetTotal)}</div><div className="kk">Total TTC</div></div>
          </div>
          <div className="legend">
            {slices.map((s) => (
              <div key={s.corps} className="lg">
                <span className="dot" style={{ background: s.color }} />
                <span className="nm">{ICON[s.corps] || ""} {s.corps}</span>
                <span className="am">{fmt(s.ttc)}</span>
                <span className="pc">{pctLabel(s.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Détail par lot + suivi de chantier (statuts sauvegardés quand projet enregistré) */}
      <div className="card">
        <h2>{projectId ? "Suivi du chantier" : "Le détail"}</h2>
        <div className="sub">{projectId ? "Marque l'avancement de chaque poste : à démarrer → en cours → terminé" : "Chaque poste sélectionné, ligne par ligne"}</div>
        {projectId && (() => {
          const total = lignes.length;
          const done = lignes.filter((li) => statuts[key(li.corps, li.nom)] === 2).length;
          const prog = lignes.filter((li) => statuts[key(li.corps, li.nom)] === 1).length;
          const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
          const pctProg = total > 0 ? Math.round((prog / total) * 100) : 0;
          return (
            <div className="prog">
              <div className="prow">
                <div className="ppct">{pctDone} %<small>terminé</small></div>
                <div className="plbl">{total} poste{total > 1 ? "s" : ""} suivi{total > 1 ? "s" : ""}</div>
              </div>
              <div className="ptrack">
                <span className="pfill" style={{ width: pctDone + "%" }} />
                <span className="pprog" style={{ width: pctProg + "%" }} />
              </div>
              <div className="chips">
                <span className="chip done"><span className="cd" /><b>{done}</b> terminé{done > 1 ? "s" : ""}</span>
                <span className="chip cur"><span className="cd" /><b>{prog}</b> en cours</span>
                <span className="chip wait"><span className="cd" /><b>{total - done - prog}</b> à démarrer</span>
              </div>
              <p className="prognote">Avancement en <b>nombre de postes</b> terminés — pas en temps de travail.</p>
            </div>
          );
        })()}
        {PHASES.map((ph) => {
          const lignesPh = lignes.filter((li) => li.phase === ph);
          if (!lignesPh.length) return null;
          const open = !closedPh[ph];
          const donePh = projectId ? lignesPh.filter((li) => statuts[key(li.corps, li.nom)] === 2).length : 0;
          return (
            <div key={ph}>
              <button type="button" className={"phase-t" + (open ? " open" : "")} onClick={() => togglePh(ph)} aria-expanded={open}>
                <span className="chev" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className="pt-lbl">{ph}</span>
                <span className="pt-meta">{projectId ? `${donePh}/${lignesPh.length}` : `${lignesPh.length} poste${lignesPh.length > 1 ? "s" : ""}`}</span>
              </button>
              {open && lignesPh.map((li, i) => {
                const k = key(li.corps, li.nom);
                const st = statuts[k] || 0;
                const stLabel = st === 2 ? "Terminé" : st === 1 ? "En cours" : "À démarrer";
                return (
                  <div key={i} className={"dtl" + (projectId ? " chant" : "")}>
                    <span>
                      {li.nom}
                      {projectId && li.unite !== "forfait" && (
                        <span style={{ color: "var(--faint)", fontWeight: 400 }}> · {li.qty} {li.mode === "location" ? "j" : li.unite}</span>
                      )}
                    </span>
                    {projectId ? (
                      readOnly ? (
                        <span className={"stbtn st" + st} aria-label={"Statut : " + stLabel}>
                          {st === 2 ? <>✓ Terminé</> : <><span className="ic" />{stLabel}</>}
                        </span>
                      ) : (
                        <button className={"stbtn st" + st} onClick={() => cycle(k)} aria-label={"Statut : " + stLabel + ", cliquer pour changer"}>
                          {st === 2 ? <>✓ Terminé</> : <><span className="ic" />{stLabel}</>}
                        </button>
                      )
                    ) : (
                      <>
                        <span className="q">{li.unite === "forfait" ? "—" : li.qty + " " + (li.mode === "location" ? "j" : li.unite)}</span>
                        <span className={"mode " + (li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA")}>
                          {li.mode === "location" ? "location" : li.mode === "je-fais" ? "je fais" : "fait faire"}
                        </span>
                      </>
                    )}
                    <span className="m">{fmt(li.ttc)}</span>
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

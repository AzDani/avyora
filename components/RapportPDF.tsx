import {
  buildDevis, regionCoef, ICON, customTotals, piecesEff, sdbEff, type Ctx, type Selection, type CustomLine, catalogueDe, estNeuf,
  totauxAvecPerso, persoValidees, lotsAvecPerso, maisonComplete, piecesNeuf, PHASES_NEUF,
} from "@/lib/estimateur";
import { parPhase, INFO_PHASES, premiersCorps } from "@/lib/estimateur/etapes-neuf";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictRapport } from "@/lib/i18n/rapport";
import { dict } from "@/lib/i18n/dictionaries";
import { libelleTypeBien } from "@/lib/i18n/neuf-commun";
import { euros, nombre, pourcent, nfDe } from "@/lib/i18n/nombres";
import { normaliserCles } from "@/lib/estimateur/identite";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import { getLocale } from "@/lib/i18n/server";

const estUrl = (s: string) => /^https?:\/\//i.test(s.trim());

/**
 * Rapport d'estimation imprimable (print-to-PDF). Rendu pur depuis les réponses du projet.
 * Style scopé .av-rapport ; à l'impression, la nav/footer du layout sont masquées et la page passe en A4.
 * Reprend le langage visuel du produit : hero fourchette, camembert par corps d'état, qui-fait-quoi, détail.
 * Textes : `dictRapport` (N14), au tutoiement, en français et en anglais américain ; nombres, montants et
 * date dans la langue de la page (en français, exactement le format d'avant).
 */
// % lisible : entier au-delà de 1 %, une décimale en dessous.
const pctLabel = (locale: string, p: number) => pourcent(locale, p >= 1 ? Math.round(p) : Math.round(p * 10) / 10);

// Camembert : dégradé de marque ordonné par taille (plus gros = plus foncé), jamais un arc-en-ciel.
const RAMP = ["#1E1B4B", "#3b2f96", "#4f46e5", "#635bf0", "#7c3aed", "#9061f2", "#a78bfa", "#bda6fb", "#cdbdfc", "#ddd0fe", "#e7ddfe", "#efe8ff", "#f4eeff", "#f8f4ff"];
function arcPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const r3 = (n: number) => Math.round(n * 1000) / 1000; // coords arrondies → rendu SSR/client identique
  const p = (r: number, a: number): [number, number] => [r3(cx + r * Math.sin(a)), r3(cy - r * Math.cos(a))];
  const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1), [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

const RAPPORT_CSS = `
.av-rapport{--ink:#15172b;--muted:#565a75;--faint:#8a8fa8;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-weak:#eef1ff;--violet:#7c3aed;--accent:#a78bfa;--accent-300:#c4b5fd;--good:#0f9d6b;--good-bg:#e6f6ef;--nuit:#1E1B4B;--nuit-2:#241f5e;--nuit-3:#191640;--surface:#fff;--surface-2:#f6f7fc;color:var(--ink);font-family:var(--font-geist-sans),system-ui,sans-serif;font-size:12px;line-height:1.5;max-width:720px;margin:0 auto;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.av-rapport .num{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums}
.av-rapport .eyebrow{font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--violet);font-weight:600}

.av-rapport .rhead{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--nuit),var(--nuit-2) 60%,var(--nuit-3));color:#fff;border-radius:16px;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.av-rapport .rhead::before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;background:rgba(124,58,237,.4);filter:blur(70px);top:-140px;right:-40px}
.av-rapport .brand{position:relative;z-index:1;display:flex;align-items:center;gap:11px}
.av-rapport .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--brand),var(--accent));display:grid;place-items:center;font-weight:700;font-size:18px;color:#fff}
.av-rapport .wm{font-weight:700;font-size:19px;letter-spacing:.02em}
.av-rapport .wm b{color:var(--accent-300)}
.av-rapport .tag{font-size:8.5px;color:#c9c5ee;margin-top:2px}
.av-rapport .rhead .doc{position:relative;z-index:1;text-align:right}
.av-rapport .rhead .doc .pill{display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-size:9px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:#fff;padding:5px 11px;border-radius:999px}
.av-rapport .rhead .doc .m{font-size:9px;color:#c9c5ee;margin-top:7px}

.av-rapport .bien{margin-top:16px;display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
.av-rapport .bien .ttl{font-size:16px;font-weight:600;margin-top:4px}
.av-rapport .bien .row{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:7px;font-size:11px;color:var(--muted)}
.av-rapport .bien .row b{color:var(--ink);font-weight:600}
.av-rapport .zone{flex:none;display:inline-flex;align-items:center;gap:6px;background:var(--brand-weak);color:var(--brand);font-weight:600;font-size:10px;padding:6px 12px;border-radius:999px}

.av-rapport .hero{position:relative;overflow:hidden;margin-top:14px;background:var(--surface-2);border:1px solid var(--line);border-left:4px solid var(--brand);border-radius:14px;padding:17px 20px;display:flex;justify-content:space-between;align-items:center;gap:18px}
.av-rapport .hero .four{font-family:var(--font-geist-mono),monospace;font-size:27px;font-weight:600;letter-spacing:-.02em;margin-top:4px;line-height:1}
.av-rapport .hero .four .s{color:var(--faint);font-weight:500;margin:0 5px}
.av-rapport .hero .four .u{font-size:14px;color:var(--muted);font-family:var(--font-geist-sans);margin-left:5px}
.av-rapport .hero .cap{font-size:10px;color:var(--muted);margin-top:7px}
.av-rapport .hero .cap b{color:var(--ink);font-weight:600}
.av-rapport .hero .m2{flex:none;text-align:right;padding-left:18px;border-left:1px solid var(--line-strong)}
.av-rapport .hero .m2 .v{font-family:var(--font-geist-mono),monospace;font-size:22px;font-weight:600;color:var(--violet)}
.av-rapport .hero .m2 .k{font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:.1em;margin-top:2px}

.av-rapport .tot{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.av-rapport .tot .c{border:1px solid var(--line);border-radius:12px;padding:11px 13px}
.av-rapport .tot .c .k{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:600}
.av-rapport .tot .c .v{font-family:var(--font-geist-mono),monospace;font-size:15px;font-weight:600;margin-top:5px}
.av-rapport .tot .c.big{background:var(--nuit);border-color:transparent;color:#fff}
.av-rapport .tot .c.big .k{color:var(--accent-300)}

.av-rapport .sec{margin-top:20px}
.av-rapport .sec-t{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:12px}
.av-rapport .sec-t::before{content:"";width:4px;height:15px;background:linear-gradient(var(--brand),var(--violet));border-radius:2px}
.av-rapport .sec-t .hint{margin-left:auto;font-size:9px;font-weight:500;color:var(--faint);text-transform:uppercase;letter-spacing:.06em}

.av-rapport .chart{display:flex;align-items:center;gap:24px}
.av-rapport .donut{position:relative;flex:none;width:184px;height:184px}
.av-rapport .donut svg{width:184px;height:184px}
.av-rapport .donut .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 36px}
.av-rapport .donut .center .v{font-family:var(--font-geist-mono),monospace;font-size:15px;font-weight:600}
.av-rapport .donut .center .k{font-size:8px;color:var(--faint);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}
.av-rapport .legend{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:2px 20px}
.av-rapport .lg{display:grid;grid-template-columns:11px 1fr auto auto;align-items:center;gap:7px;padding:3px 2px;font-size:10px;border-bottom:1px solid var(--line)}
.av-rapport .lg .dot{width:9px;height:9px;border-radius:3px}
.av-rapport .lg .nm{color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rapport .lg .am{font-family:var(--font-geist-mono),monospace;color:var(--muted);text-align:right;font-size:9px}
.av-rapport .lg .pc{font-family:var(--font-geist-mono),monospace;color:var(--ink);font-weight:600;text-align:right;min-width:30px}

.av-rapport .split{display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px;margin-bottom:9px}
.av-rapport .split span{height:100%}
.av-rapport .qlg{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:10px;color:var(--muted);margin-bottom:12px}
.av-rapport .qlg .i{display:inline-flex;align-items:center;gap:6px}
.av-rapport .qlg .d{width:9px;height:9px;border-radius:3px}
.av-rapport .qlg b{color:var(--ink);font-weight:600;font-family:var(--font-geist-mono),monospace}
.av-rapport .qlg .pct{color:var(--faint);font-family:var(--font-geist-mono),monospace}
.av-rapport .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.av-rapport .qc{border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.av-rapport .qc .k{font-size:9px;color:var(--muted);display:flex;justify-content:space-between}
.av-rapport .qc .k .p{font-family:var(--font-geist-mono),monospace;font-weight:600;color:var(--brand)}
.av-rapport .qc .v{font-family:var(--font-geist-mono),monospace;font-size:17px;font-weight:600;margin-top:5px}
.av-rapport .qc .d{font-size:8.5px;color:var(--faint);margin-top:3px}
.av-rapport .qc.good{background:var(--good-bg);border-color:transparent}
.av-rapport .qc.good .v,.av-rapport .qc.good .k .p{color:var(--good)}

.av-rapport table{width:100%;border-collapse:collapse;font-size:10px}
.av-rapport th{text-align:left;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:600;padding:7px 8px;border-bottom:1.5px solid var(--line-strong)}
.av-rapport td{padding:6.5px 8px;border-bottom:1px solid var(--line)}
.av-rapport td.amt,.av-rapport th.amt{text-align:right;font-family:var(--font-geist-mono),monospace}
.av-rapport td .ic{margin-right:6px}
.av-rapport td .ph{font-size:8px;color:var(--faint)}
.av-rapport .barcell{width:120px}
.av-rapport .barcell .t{height:6px;background:var(--line);border-radius:4px;overflow:hidden}
.av-rapport .barcell .f{height:6px;background:linear-gradient(90deg,var(--accent),var(--brand));border-radius:4px}
.av-rapport tr.tot-row td{border-bottom:0;border-top:1.5px solid var(--line-strong);font-weight:600;padding-top:9px;font-size:11px}

.av-rapport .foot{margin-top:18px;padding-top:11px;border-top:1px solid var(--line);font-size:8.5px;color:var(--faint);line-height:1.65}
.av-rapport .foot b{color:var(--muted)}
@media print{
  header,footer,.no-print{display:none !important}
  main{padding:0 !important;max-width:none !important}
  body{background:#fff !important}
  /* Forcer l'impression des fonds/dégradés de marque (sinon en-tête nuit, cartes, camembert sortent en blanc). */
  .av-rapport,.av-rapport *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
  .av-rapport{max-width:none}
  .av-rapport .sec{break-inside:avoid}
  .av-rapport tr{break-inside:avoid}
  @page{size:A4;margin:11mm}
}
`;

// Construction neuve seulement (injecté pour un projet neuf : le rapport rénovation garde le même DOM).
const RAPPORT_NEUF_CSS = `
.av-rapport .tot.t5{grid-template-columns:repeat(5,1fr)}
@media screen and (max-width:560px){.av-rapport .tot.t5{grid-template-columns:repeat(2,minmax(0,1fr))}}
.av-rapport .etapes td{vertical-align:top}
.av-rapport .etapes .dem{margin:3px 0 0;padding:0;list-style:none;font-size:8.5px;color:var(--muted)}
.av-rapport .etapes .dem b{color:var(--ink);font-weight:600}
@media print{.av-rapport .sec.etapes{break-inside:auto}}
`;

export async function RapportPDF({
  reponses,
  nom,
  refCode,
}: {
  reponses: { ctx?: Ctx; sel?: Selection; codePostal?: string; custom?: CustomLine[] };
  nom: string;
  refCode: string;
}) {
  const locale = await getLocale();
  const ctx = reponses?.ctx
    ? { ...reponses.ctx, codePostal: reponses.ctx.codePostal ?? reponses.codePostal }
    : undefined;
  const sel = normaliserCles((reponses?.sel ?? {}) as Selection);
  const customVal: CustomLine[] = persoValidees(reponses?.custom); // lignes perso validées
  if (!ctx) return null;

  const neuf = estNeuf(ctx);
  const n = dictNeuf(locale);
  const r = dictRapport(locale);
  const rapide = dict(locale).rapide;
  const fmt = (v: number) => nombre(locale, v);
  const euro = (v: number) => euros(locale, v);
  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const b = dv.bilan;
  // Totaux = postes par défaut + lignes personnalisées (les aléas s'appliquent aussi au HT perso) :
  // le seul calcul du total, celui de la fiche, de la liste et du devis (`totauxAvecPerso`, D8).
  const cu = customTotals(customVal);
  const t = totauxAvecPerso(dv.totaux, customVal, ctx.aleas);
  const lo = Math.round((t.ttc * 0.85) / 100) * 100;
  const hi = Math.round((t.ttc * 1.15) / 100) * 100;
  const eurM2 = ctx.surface > 0 ? Math.round(t.ttc / ctx.surface) : 0;
  const reg = regionCoef(ctx.codePostal);
  const moPct = Math.round((reg.mo - 1) * 100);
  const appart = ctx.type !== "Maison";
  const dateStr = new Date().toLocaleDateString(nfDe(locale), { day: "numeric", month: "long", year: "numeric" });
  const zone = rapide.zones[reg.zone] ?? reg.zone;
  const finition = (ctx.finition && rapide.finitions[ctx.finition]?.label) || ctx.finition || "";
  const aleas = pourcent(locale, ctx.aleas || 0);

  // Camembert + tableau : un lot par corps d'état (en neuf, un corps revient dans plusieurs phases),
  // lignes perso repliées dans leur corps (`lotsAvecPerso`, le même calcul que la fiche).
  const lots = lotsAvecPerso(dv.lots, customVal).map((l) => ({ corps: l.corps, phase: l.phase, ttc: l.ttc })).sort((a, c) => c.ttc - a.ttc);
  const budgetTotal = lots.reduce((s, l) => s + l.ttc, 0);
  const maxV = lots.length ? lots[0].ttc : 1;

  // Notes & liens matériaux (postes par défaut + lignes perso).
  const notes: { poste: string; note: string; cle?: string }[] = [];
  for (const li of dv.lignes) { const n = sel[li.cle]?.note; if (n) notes.push({ poste: li.nom, note: n, cle: li.cle }); }
  for (const x of customVal) if (x.note) notes.push({ poste: x.nom, note: x.note });
  let acc = 0;
  // Neuf : les 8 plus gros corps, le reste en une part « Autres corps d'état ». Rénovation : tous.
  const lotsDonut = neuf ? premiersCorps(lots, n.autresCorps) : lots;
  const slices = lotsDonut.map((l, i) => {
    const a0 = budgetTotal > 0 ? (acc / budgetTotal) * 2 * Math.PI : 0;
    acc += l.ttc;
    const a1 = budgetTotal > 0 ? (acc / budgetTotal) * 2 * Math.PI : 0;
    return { corps: l.corps, phase: "phase" in l ? l.phase : "", ttc: l.ttc, color: RAMP[Math.min(i, RAMP.length - 1)], d: arcPath(100, 100, 92, 60, a0, a1), pct: budgetTotal > 0 ? (l.ttc / budgetTotal) * 100 : 0 };
  });
  const mid = Math.ceil(slices.length / 2);
  const legendCols = [slices.slice(0, mid), slices.slice(mid)];

  // Qui fait quoi (répartition HT).
  const ht = t.ht || 1;
  const pcHt = (v: number) => Math.round((v / ht) * 100);
  // Construction neuve : la maison décrite, le TTC par phase (+ lignes perso), les étapes.
  const maison = neuf ? maisonComplete(ctx.neuf) : null;
  const phNeuf = neuf ? parPhase(dv) : null;
  const persoTtc = cu.ht + cu.tva;
  const maxPh = phNeuf ? Math.max(1, ...PHASES_NEUF.map((p) => phNeuf[p] ?? 0), persoTtc) : 1;

  return (
    <div className="av-rapport">
      <style dangerouslySetInnerHTML={{ __html: RAPPORT_CSS }} />
      {neuf && <style dangerouslySetInnerHTML={{ __html: RAPPORT_NEUF_CSS }} />}

      {/* En-tête */}
      <div className="rhead">
        <div className="brand">
          <div className="logo">A</div>
          <div>
            <div className="wm">AVY<b>ORA</b></div>
            <div className="tag">{r.tag}</div>
          </div>
        </div>
        <div className="doc">
          <span className="pill">{r.pill}</span>
          <div className="m">{r.ref} {refCode} · {dateStr}</div>
        </div>
      </div>

      {/* Le bien */}
      <div className="bien">
        <div>
          <div className="eyebrow">{r.bien}</div>
          <div className="ttl">{nom}</div>
          {maison ? (
          <div className="row">
            <span><b>{n.maisonNeuve}</b></span><span>·</span>
            <span><b className="num">{maison.surface}</b> {n.pdf.habitables}</span><span>·</span>
            <span>{n.niveauxCourt[maison.niveaux] ?? n.niveauxCourt.pp}</span><span>·</span>
            <span><b className="num">{piecesNeuf(maison).chambres}</b> {piecesNeuf(maison).chambres > 1 ? n.chambres : n.chambre}</span><span>·</span>
            <span>{n.pdf.murs[maison.murs] ?? maison.murs}</span>
            {ctx.codePostal ? <><span>·</span><span className="num">{ctx.codePostal}</span></> : null}
          </div>
          ) : (
          <div className="row">
            <span>{appart ? "🏢" : "🏠"} <b>{libelleTypeBien(locale, ctx.type)}</b></span><span>·</span>
            <span><b className="num">{fmt(ctx.surface)}</b> {r.habitables}</span><span>·</span>
            <span><b className="num">{ctx.niveaux}</b> {r.niveaux(ctx.niveaux)}</span><span>·</span>
            <span><b className="num">{piecesEff(ctx) || ctx.pieces}</b> {r.pieces(piecesEff(ctx) || ctx.pieces)}</span><span>·</span>
            {/* SDB effectives = SDB classiques + suites parentales — c'est ce que le devis chiffre. */}
            <span><b className="num">{sdbEff(ctx)}</b> {r.sdb(sdbEff(ctx))}</span>
            {ctx.codePostal ? <><span>·</span><span className="num">{ctx.codePostal}</span></> : null}
          </div>
          )}
        </div>
        <div className="zone">📍 {zone}{moPct ? ` · ${r.mainOeuvre} ${moPct > 0 ? "+" : ""}${pourcent(locale, moPct, 0)}` : ""}</div>
      </div>

      {/* Hero estimation */}
      <div className="hero">
        <div>
          <div className="eyebrow" style={{ color: "var(--faint)" }}>{r.heroK}</div>
          <div className="four"><span className="num">{fmt(lo)}</span><span className="s">–</span><span className="num">{fmt(hi)}</span> €<span className="u">{r.ttc}</span></div>
          <div className="cap">{r.probable} <b className="num">{euro(t.ttc)}</b> {r.ttc} · {r.finition(finition.toLowerCase())}</div>
        </div>
        <div className="m2"><div className="v"><span className="num">{fmt(eurM2)}</span> €</div><div className="k">{r.parM2}</div></div>
      </div>

      {/* Totaux */}
      <div className={neuf ? "tot t5" : "tot"}>
        <div className="c"><div className="k">{r.travauxHt}</div><div className="v">{euro(neuf ? t.ht - b.frais : t.ht)}</div></div>
        {neuf && <div className="c"><div className="k">{n.pdf.fraisHorsTva}</div><div className="v">{euro(b.frais)}</div></div>}
        <div className="c"><div className="k">{r.tva}</div><div className="v">{euro(t.tva)}</div></div>
        <div className="c"><div className="k">{r.aleas(aleas)}</div><div className="v">{euro(t.aleas)}</div></div>
        <div className="c big"><div className="k">{r.totalTtc}</div><div className="v">{euro(t.ttc)}</div></div>
      </div>

      {/* Où part le budget */}
      <div className="sec">
        <div className="sec-t">{r.budgetT} <span className="hint">{r.budgetHint}</span></div>
        <div className="chart">
          <div className="donut">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              {slices.map((s) => (
                <path key={s.corps} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />
              ))}
            </svg>
            <div className="center"><div className="v num">{euro(budgetTotal)}</div><div className="k">{n.donutTotal}</div></div>
          </div>
          <div className="legend">
            {legendCols.map((col, ci) => (
              <div key={ci}>
                {col.map((s) => (
                  <div key={s.corps} className="lg">
                    <span className="dot" style={{ background: s.color }} />
                    <span className="nm">{ICON[s.corps] || ""} {catT(locale, "corps", s.corps)}</span>
                    <span className="am">{euro(s.ttc)}</span>
                    <span className="pc">{pctLabel(locale, s.pct)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Qui fait quoi */}
      <div className="sec">
        <div className="sec-t">{r.quiT} <span className="hint">{r.quiHint}</span></div>
        <div className="split">
          <span style={{ width: pcHt(b.moA) + "%", background: "var(--brand)" }} />
          <span style={{ width: pcHt(b.matA) + "%", background: "var(--accent-300)" }} />
          <span style={{ width: pcHt(b.achat) + "%", background: "var(--violet)" }} />
          {b.frais > 0 && <span style={{ width: pcHt(b.frais) + "%", background: "var(--line-strong)" }} />}
          {cu.ht > 0 && <span style={{ width: pcHt(cu.ht) + "%", background: "var(--faint)" }} />}
        </div>
        <div className="qlg">
          <span className="i"><span className="d" style={{ background: "var(--brand)" }} />{r.mo} <b>{euro(b.moA)}</b> <span className="pct">{pourcent(locale, pcHt(b.moA), 0)}</span></span>
          <span className="i"><span className="d" style={{ background: "var(--accent-300)" }} />{r.matPros} <b>{euro(b.matA)}</b> <span className="pct">{pourcent(locale, pcHt(b.matA), 0)}</span></span>
          <span className="i"><span className="d" style={{ background: "var(--violet)" }} />{r.matToi} <b>{euro(b.achat)}</b> <span className="pct">{pourcent(locale, pcHt(b.achat), 0)}</span></span>
          {b.frais > 0 && <span className="i"><span className="d" style={{ background: "var(--line-strong)" }} />{n.fraisSeg} <b>{euro(b.frais)}</b> <span className="pct">{pourcent(locale, pcHt(b.frais), 0)}</span></span>}
          {cu.ht > 0 && <span className="i"><span className="d" style={{ background: "var(--faint)" }} />{n.persoSeg} <b>{euro(cu.ht)}</b> <span className="pct">{pourcent(locale, pcHt(cu.ht), 0)}</span></span>}
        </div>
        <div className="cards">
          <div className="qc"><div className="k">{r.faitFaire} <span className="p">{pourcent(locale, pcHt(b.paye), 0)}</span></div><div className="v">{euro(b.paye)}</div><div className="d">{r.moFournitures(euro(b.moA), euro(b.matA))}</div></div>
          <div className="qc"><div className="k">{r.tuRealises} <span className="p">{pourcent(locale, pcHt(b.achat), 0)}</span></div><div className="v">{euro(b.achat)}</div><div className="d">{r.tuRealisesD}</div></div>
          <div className="qc good"><div className="k">{r.economie}</div><div className="v">{euro(b.eco)}</div><div className="d">{r.economieD}</div></div>
        </div>
      </div>

      {/* Construction neuve : détail par phase du chantier (un corps d'état couvre plusieurs phases). */}
      {phNeuf ? (
      <div className="sec">
        <div className="sec-t">{n.pdf.parPhaseT} <span className="hint">{n.pdf.parPhaseHint}</span></div>
        <table>
          <thead><tr><th>{n.pdf.phase}</th><th>{n.pdf.poids}</th><th className="amt">{n.pdf.montant}</th></tr></thead>
          <tbody>
            {PHASES_NEUF.map((p) => (
              <tr key={p}>
                <td>{catT(locale, "phases", p)}</td>
                <td className="barcell"><div className="t"><div className="f" style={{ width: Math.max(6, ((phNeuf[p] ?? 0) / maxPh) * 100) + "%" }} /></div></td>
                <td className="amt">{euro(phNeuf[p] ?? 0)}</td>
              </tr>
            ))}
            {persoTtc > 0 && (
              <tr>
                <td>{n.pdf.perso}</td>
                <td className="barcell"><div className="t"><div className="f" style={{ width: Math.max(6, (persoTtc / maxPh) * 100) + "%" }} /></div></td>
                <td className="amt">{euro(persoTtc)}</td>
              </tr>
            )}
            <tr className="tot-row"><td>{n.pdf.totalHorsAleas}</td><td /><td className="amt">{euro(budgetTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      ) : (
      /* Détail par corps d'état */
      <div className="sec">
        <div className="sec-t">{r.corpsT}</div>
        <table>
          <thead><tr><th>{r.corpsCol}</th><th>{r.phase}</th><th>{r.poids}</th><th className="amt">{r.montant}</th></tr></thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.corps}>
                <td><span className="ic">{ICON[s.corps] || ""}</span>{catT(locale, "corps", s.corps)}</td>
                <td className="ph">{catT(locale, "phases", s.phase)}</td>
                <td className="barcell"><div className="t"><div className="f" style={{ width: Math.max(6, (s.ttc / maxV) * 100) + "%" }} /></div></td>
                <td className="amt">{euro(s.ttc)}</td>
              </tr>
            ))}
            <tr className="tot-row"><td>{r.totalTravaux}</td><td /><td /><td className="amt">{euro(budgetTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      )}

      {/* Construction neuve : étapes et démarches, du permis à la remise des clés. */}
      {neuf && (
        <div className="sec etapes">
          <div className="sec-t">{n.pdf.etapesT} <span className="hint">{n.pdf.etapesHint}</span></div>
          <table>
            <thead><tr><th>{n.pdf.phase}</th><th>{n.pdf.jalon}</th><th>{n.pdf.duree}</th></tr></thead>
            <tbody>
              {PHASES_NEUF.map((p) => {
                const info = INFO_PHASES[p];
                if (!info) return null;
                return (
                  <tr key={p}>
                    <td><b>{catT(locale, "phases", p)}</b></td>
                    <td>
                      {info.jalon[locale]}
                      {info.dem.length > 0 && (
                        <ul className="dem">
                          {info.dem.map((d, i) => <li key={i}><b>{d.quand[locale]}</b> · {d.quoi[locale]}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="ph">{info.duree[locale]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lignes personnalisées */}
      {customVal.length > 0 && (
        <div className="sec">
          <div className="sec-t">{r.persoT} <span className="hint">{r.persoHint}</span></div>
          <table>
            <thead><tr><th>{r.designation}</th><th>{r.detail}</th><th className="amt">{r.montant}</th></tr></thead>
            <tbody>
              {customVal.map((x) => {
                const h = (x.prix || 0) * (x.qte || 0);
                const ttc = h + (h * (x.tva || 0)) / 100;
                return (
                  <tr key={x.id}>
                    <td>{x.nom}</td>
                    {/* Lot : libellé accentué en français (« Électricité »), traduit en anglais (« Electrical »). */}
                    <td className="ph">{nombre(locale, x.qte, 2)} {catT(locale, "unites", x.unite)} × {euro(x.prix)} · {catT(locale, "corps", x.lot)}</td>
                    <td className="amt">{euro(ttc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes & liens matériaux */}
      {notes.length > 0 && (
        <div className="sec">
          <div className="sec-t">{r.notesT} <span className="hint">{r.notesHint}</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notes.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: 1.4, borderBottom: "1px solid #e9eaf3", paddingBottom: 6 }}>
                <span style={{ fontWeight: 600, minWidth: 150, color: "#15172b" }}>{catLigne(locale, n.poste, n.cle)}</span>
                {estUrl(n.note)
                  ? <a href={n.note} style={{ color: "#4f46e5", wordBreak: "break-all" }}>{n.note}</a>
                  : <span style={{ color: "#565a75" }}>{catT(locale, "notes", n.note)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="foot">
        <b>{r.piedGras}</b>{r.pied(zone, finition, aleas)}<br />
        {neuf && <>{n.pdf.pied}<br /></>}
        <b>AVYORA</b>{r.signature}
      </div>
    </div>
  );
}

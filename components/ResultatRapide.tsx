import "server-only";
import Link from "next/link";
import {
  CATALOG, buildDevis, regionCoef,
  type Ctx, type Selection, type Ampleur, type Finition, type QuiRealise,
} from "@/lib/estimateur";
import { getLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dictionaries";

/**
 * Page résultat de l'ESTIMATION RAPIDE : récap des réponses + fourchette, mais PAS le détail
 * poste par poste (ça, c'est le détaillé/Pro). Le détail par corps d'état est affiché flouté +
 * verrouillé (teaser). Choix produit : le rapide reste honnête (ordre de grandeur) et le détail
 * devient un argument pour passer en détaillé.
 */
type Reponses = { ctx?: Ctx; sel?: Selection; codePostal?: string; ampleur?: Ampleur; qui?: QuiRealise };

const euro = (n: number, nf: string) => Math.round(n).toLocaleString(nf) + " €";
const r100 = (n: number) => Math.round(n / 100) * 100;
const SEG_COLORS = ["#4f46e5", "#7c3aed", "#a78bfa", "#c4b5fd", "#dcdeec"];

const CSS = `
.av-rr{--surface:#fff;--surface-2:#f8f9fd;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-50:#eef1ff;--accent:#7c3aed;--accent-300:#c4b5fd;--nuit:#1E1B4B;--nuit-2:#241f5e;--good:#0f9d6b;--good-bg:#e6f7f0;--r:1.15rem;--r-lg:1.5rem;color:var(--ink)}
.av-rr .mono{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.av-rr .hero{background:linear-gradient(140deg,var(--nuit),var(--nuit-2));color:#fff;border-radius:var(--r-lg);padding:22px 24px;box-shadow:0 22px 54px -26px rgba(30,27,75,.6)}
.av-rr .hero .lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-300);font-weight:700}
.av-rr .hero .big{font-family:var(--font-geist-mono),monospace;font-weight:700;font-size:clamp(28px,6vw,40px);line-height:1.1;margin-top:8px}
.av-rr .hero .big small{opacity:.5;font-weight:400}
.av-rr .hero .meta{font-size:13.5px;color:#cfcbef;margin-top:10px;line-height:1.5}
.av-rr .hero .meta b{color:#fff;font-weight:600}
.av-rr .sec{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:26px 0 12px;display:flex;align-items:center;gap:8px}
.av-rr .pro-chip{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);background:#f3ecff;padding:3px 9px;border-radius:999px}
.av-rr .recap{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){.av-rr .recap{grid-template-columns:1fr}}
.av-rr .item{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px;display:flex;align-items:center;gap:12px}
.av-rr .item .ic{width:34px;height:34px;border-radius:10px;background:var(--brand-50);display:flex;align-items:center;justify-content:center;font-size:17px;flex:none}
.av-rr .item .k{font-size:11.5px;color:var(--faint)}
.av-rr .item .v{font-size:14.5px;font-weight:600;margin-top:1px}
.av-rr .badge-eco{margin-left:auto;font-size:11px;font-weight:700;color:var(--good);background:var(--good-bg);padding:2px 8px;border-radius:999px;white-space:nowrap}
.av-rr .teaser{position:relative;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:var(--surface)}
.av-rr .teaser .inside{padding:22px;filter:blur(6px);user-select:none;pointer-events:none}
.av-rr .tt{display:flex;align-items:center;gap:22px}
.av-rr .donut{width:120px;height:120px;flex:none}
.av-rr .legend{flex:1;display:flex;flex-direction:column;gap:9px;min-width:0}
.av-rr .lrow{display:flex;align-items:center;gap:9px;font-size:13.5px}
.av-rr .dot{width:10px;height:10px;border-radius:3px;flex:none}
.av-rr .lrow .lv{margin-left:auto;font-family:var(--font-geist-mono),monospace;font-weight:600}
.av-rr .lock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:11px;padding:20px;background:rgba(248,249,253,.55)}
.av-rr .lock .ico{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid var(--line-strong);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 10px 24px -12px rgba(30,27,75,.3)}
.av-rr .lock h3{font-size:16.5px;font-weight:700}
.av-rr .lock p{font-size:13.5px;color:var(--muted);max-width:40ch}
.av-rr .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.av-rr .note{font-size:12px;color:var(--faint);margin-top:16px;line-height:1.6}
`;

export default async function ResultatRapide({
  reponses, projectId, isPro,
}: { reponses: Reponses; projectId: string; isPro: boolean }) {
  const locale = await getLocale();
  const t = dict(locale).rapide;
  const ctx = (reponses.ctx ?? {}) as Ctx;
  const sel = (reponses.sel ?? {}) as Selection;
  const cp = reponses.codePostal ?? ctx.codePostal ?? "";
  const nf = locale === "en" ? "en-US" : "fr-FR";

  const dv = buildDevis(CATALOG, ctx, sel);
  const ttc = dv.totaux.ttc;
  const lo = r100(ttc * 0.85), hi = r100(ttc * 1.15);
  const m2 = ctx.surface > 0 ? Math.round(ttc / ctx.surface) : 0;

  const reg = regionCoef(cp);
  const moPct = Math.round((reg.mo - 1) * 100);
  const zone = t.zones[reg.zone] ?? reg.zone;

  const ampleur = reponses.ampleur;
  const ampLabel = ampleur
    ? (ampleur === "lourde" && ctx.type !== "Maison" ? t.ampleurs.lourdeAppart.label : t.ampleurs[ampleur]?.label)
    : "—";
  const finLabel = ctx.finition ? t.finitions[ctx.finition as Finition]?.label : "—";
  const quiLabel = reponses.qui ? t.quis[reponses.qui]?.label : "—";
  const typeLabel = ctx.type === "Maison" ? t.typeMaison : t.typeAppart;

  // Donut flouté : vraies proportions par corps d'état (top 5), mais masqué.
  const lots = [...dv.lots].sort((a, b) => b.ttc - a.ttc);
  const top = lots.slice(0, 4);
  const autresTtc = lots.slice(4).reduce((s, l) => s + l.ttc, 0);
  const totalLots = lots.reduce((s, l) => s + l.ttc, 0) || 1;
  const segs = [...top.map((l) => l.ttc), autresTtc].filter((v) => v > 0);
  let off = 25;
  const circles = segs.map((v, i) => {
    const len = (v / totalLots) * 100;
    const c = <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={SEG_COLORS[i] ?? "#dcdeec"} strokeWidth="7" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={off} />;
    off -= len;
    return c;
  });

  const L = locale === "en"
    ? { resume: "Your estimate in brief", where: "Where the budget goes", budget: "Estimated budget · incl. tax",
        typeBien: "Property", loc: "Location", ampleurK: "Scope of work", finitionK: "Finish level", quiK: "Who does the work",
        lockH: "The line-by-line detail is Pro", lockP: "See where every euro goes, adjust each item, choose DIY / hire out, and export a PDF report to compare with contractors.",
        affiner: "Refine in detail →", passPro: "Go Pro for the detail →", refaire: "New estimate",
        margeInfo: `Indicative estimate from the AVYORA price reference (France 2026), adjusted to your ZIP code — a ballpark (±15% margin) to confirm with contractor quotes. The precise, line-by-line breakdown comes with the detailed estimate.`,
        sub: "An instant range from your answers. Refine line by line for a precise quote.",
        others: "+ other trades", labor: "% labor" }
    : { resume: "Ton estimation en résumé", where: "Où va le budget", budget: "Budget estimé · TTC",
        typeBien: "Type de bien", loc: "Localisation", ampleurK: "Ampleur des travaux", finitionK: "Niveau de finition", quiK: "Qui réalise les travaux",
        lockH: "Le détail poste par poste, c'est le Pro", lockP: "Vois où part chaque euro, ajuste chaque poste, choisis « je fais / fait faire », et sors un rapport PDF à comparer avec les artisans.",
        affiner: "Affiner en détaillé →", passPro: "Passer en Pro pour le détail →", refaire: "Refaire une estimation",
        margeInfo: "Estimation indicative basée sur le référentiel de prix AVYORA (France 2026), ajustée à ton code postal — un ordre de grandeur (marge ±15 %) à confirmer par des devis d'artisans. Le détail précis, poste par poste, s'obtient avec l'estimation détaillée.",
        others: "+ autres corps d'état", labor: "% MO" };

  const ctaHref = isPro ? `/projets/${projectId}/modifier` : "/tarifs";
  const ctaLabel = isPro ? L.affiner : L.passPro;

  return (
    <div className="av-rr">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <p className="text-[15px] text-muted -mt-2 mb-2">{L.sub}</p>

      <div className="hero">
        <div className="lbl">{L.budget}</div>
        <div className="big">{euro(lo, nf)} <small>–</small> {euro(hi, nf)}</div>
        <div className="meta">
          ≈ <b className="mono">{m2.toLocaleString(nf)} €/m²</b> · {ampLabel?.toLowerCase()} · {locale === "en" ? "margin" : "marge"} <b>±15 %</b>
          {cp.length >= 2 && reg.zone ? <> · <b>{zone}</b>{moPct ? ` (${moPct > 0 ? "+" : ""}${moPct} ${L.labor})` : ""}</> : null}
        </div>
      </div>

      <div className="sec">{L.resume}</div>
      <div className="recap">
        <div className="item"><span className="ic">🏠</span><div><div className="k">{L.typeBien}</div><div className="v">{typeLabel} · {ctx.surface} m²</div></div></div>
        <div className="item"><span className="ic">📍</span><div><div className="k">{L.loc}</div><div className="v">{cp || "—"}{reg.zone ? ` · ${zone}` : ""}</div></div></div>
        <div className="item"><span className="ic">🛠️</span><div><div className="k">{L.ampleurK}</div><div className="v">{ampLabel}</div></div></div>
        <div className="item"><span className="ic">✨</span><div><div className="k">{L.finitionK}</div><div className="v">{finLabel}</div></div></div>
        <div className="item" style={{ gridColumn: "1 / -1" }}><span className="ic">👷</span><div><div className="k">{L.quiK}</div><div className="v">{quiLabel}</div></div></div>
      </div>

      <div className="sec">{L.where} <span className="pro-chip">Pro</span></div>
      <div className="teaser">
        <div className="inside">
          <div className="tt">
            <svg className="donut" viewBox="0 0 42 42" aria-hidden="true">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e9eaf3" strokeWidth="7" />
              {circles}
            </svg>
            <div className="legend">
              {top.map((l, i) => (
                <div className="lrow" key={l.corps}><span className="dot" style={{ background: SEG_COLORS[i] }} />{l.corps} <span className="lv">{euro(l.ttc, nf)}</span></div>
              ))}
              <div className="lrow"><span className="dot" style={{ background: "#dcdeec" }} />{L.others} <span className="lv">…</span></div>
            </div>
          </div>
        </div>
        <div className="lock">
          <div className="ico">🔒</div>
          <h3>{L.lockH}</h3>
          <p>{L.lockP}</p>
        </div>
      </div>

      <div className="actions">
        <Link href={ctaHref} className="btn btn-primary py-2.5">{ctaLabel}</Link>
        <Link href="/projets/nouveau" className="btn btn-outline py-2.5">{L.refaire}</Link>
      </div>

      <p className="note">{L.margeInfo}</p>
    </div>
  );
}

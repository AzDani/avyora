import Link from "next/link";
import { getT } from "@/lib/i18n/server";

/**
 * Bannière d'upsell Pro affichée aux utilisateurs connectés NON abonnés (tunnel de vente).
 * Positionnement « gestionnaire de travaux » : parcours 4 étapes + valeur élargie, pas juste le prix.
 */
export default async function ProUpsell() {
  const { t: tr } = await getT();
  const t = tr.upsell;
  const feats = [t.f1, t.f2, t.f3, t.f4, t.f5, t.f6];
  return (
    <aside className="av-upsell">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="glow" aria-hidden="true" />
      <div className="content">
        <span className="eb">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="currentColor" /></svg>
          {t.eyebrow}
        </span>
        <h2>{t.titrePre}<span className="hl">{t.titreFort}</span></h2>
        <p className="txt">
          {t.txtA}<b>{t.txtF1}</b>{t.txtM}<b>{t.txtF2}</b>{t.txtEnd}
        </p>

        <div className="journey" aria-hidden="true">
          {t.steps.map((s, i) => (
            <span key={s} className="jgroup">
              <span className="step"><span className="n">{i + 1}</span><span>{s}</span></span>
              {i < t.steps.length - 1 && <span className="arr">→</span>}
            </span>
          ))}
        </div>

        <ul className="feats">
          {feats.map((f) => <li key={f}>{f}</li>)}
        </ul>

        <div className="actions">
          <Link href="/tarifs" className="btn-cta">{t.cta}</Link>
          <span className="rassure">{t.rassure}</span>
        </div>
      </div>
    </aside>
  );
}

const CSS = `
.av-upsell{position:relative;overflow:hidden;border-radius:18px;color:#fff;padding:26px 28px;
  background:linear-gradient(135deg,#1E1B4B,#3a2a86 60%,#4f46e5);
  box-shadow:0 22px 55px -28px rgba(79,70,229,.6)}
.av-upsell .glow{position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(167,139,250,.4);filter:blur(70px);top:-130px;right:-60px;pointer-events:none}
.av-upsell .content{position:relative;z-index:1}
.av-upsell .eb{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;color:#e9e5ff;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);padding:5px 11px;border-radius:999px}
.av-upsell h2{font-size:clamp(21px,3vw,25px);font-weight:600;letter-spacing:-.01em;margin:13px 0 0}
.av-upsell h2 .hl{background:linear-gradient(120deg,#c4b5fd,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-upsell .txt{font-size:14px;line-height:1.6;color:#dcd9f5;margin:9px 0 0;max-width:62ch}
.av-upsell .txt b{color:#fff;font-weight:600}
.av-upsell .journey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:18px 0 2px}
.av-upsell .jgroup{display:inline-flex;align-items:center;gap:8px}
.av-upsell .step{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 13px}
.av-upsell .step .n{font-size:10px;font-weight:700;color:#1E1B4B;background:#c4b5fd;width:17px;height:17px;border-radius:50%;display:grid;place-items:center}
.av-upsell .step span{font-size:12.5px;font-weight:600;color:#efedff}
.av-upsell .arr{color:rgba(196,181,253,.6);font-size:13px}
.av-upsell .feats{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;margin:20px 0 0;padding:0}
.av-upsell .feats li{position:relative;padding-left:22px;font-size:13.5px;color:#e7e4fb;line-height:1.4}
.av-upsell .feats li::before{content:"";position:absolute;left:0;top:4px;width:12px;height:9px;
  border-left:2px solid #a78bfa;border-bottom:2px solid #a78bfa;transform:rotate(-45deg)}
.av-upsell .actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:22px}
.av-upsell .btn-cta{display:inline-flex;align-items:center;background:#fff;color:#332a86;font-weight:600;font-size:14.5px;
  padding:12px 22px;border-radius:12px;text-decoration:none;transition:transform .12s ease,box-shadow .12s ease}
.av-upsell .btn-cta:hover{transform:translateY(-1px);box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
.av-upsell .rassure{font-size:12px;color:#c9c5ef}
@media(max-width:520px){.av-upsell .feats{grid-template-columns:1fr}}
`;

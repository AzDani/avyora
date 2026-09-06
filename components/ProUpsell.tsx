import Link from "next/link";

/**
 * Bannière d'upsell Pro affichée aux utilisateurs connectés NON abonnés (tunnel de vente).
 * Placée sur le portefeuille : rappelle la valeur du Pro et pousse vers /tarifs.
 */
export default function ProUpsell() {
  return (
    <aside className="av-upsell">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="glow" aria-hidden="true" />
      <div className="content">
        <span className="eb">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="currentColor" /></svg>
          AVYORA Pro
        </span>
        <h2>Passe au niveau supérieur</h2>
        <p className="txt">
          Débloque l&apos;<b>estimation détaillée poste par poste</b>, le <b>rapport PDF</b> prêt à comparer avec les
          artisans et le <b>suivi de chantier</b>. Estime juste, négocie mieux.
        </p>
        <ul className="feats">
          <li>Devis précis, poste par poste</li>
          <li>Rapport PDF détaillé</li>
          <li>Suivi de chantier illimité</li>
        </ul>
        <div className="actions">
          <Link href="/tarifs" className="btn-cta">Voir les offres Pro →</Link>
          <span className="rassure">Sans engagement · résiliable en 3 clics</span>
        </div>
      </div>
    </aside>
  );
}

const CSS = `
.av-upsell{position:relative;overflow:hidden;border-radius:18px;color:#fff;padding:24px 26px;
  background:linear-gradient(135deg,#1E1B4B,#3a2a86 60%,#4f46e5);
  box-shadow:0 22px 55px -28px rgba(79,70,229,.6)}
.av-upsell .glow{position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(167,139,250,.4);filter:blur(70px);top:-130px;right:-60px;pointer-events:none}
.av-upsell .content{position:relative;z-index:1}
.av-upsell .eb{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;color:#e9e5ff;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);padding:5px 11px;border-radius:999px}
.av-upsell h2{font-size:clamp(20px,3vw,24px);font-weight:600;letter-spacing:-.01em;margin:13px 0 0}
.av-upsell .txt{font-size:14px;line-height:1.6;color:#dcd9f5;margin:8px 0 0;max-width:60ch}
.av-upsell .txt b{color:#fff;font-weight:600}
.av-upsell .feats{list-style:none;display:flex;flex-wrap:wrap;gap:8px 16px;margin:14px 0 0;padding:0}
.av-upsell .feats li{position:relative;padding-left:20px;font-size:13px;color:#e7e4fb}
.av-upsell .feats li::before{content:"";position:absolute;left:0;top:5px;width:12px;height:9px;
  border-left:2px solid #a78bfa;border-bottom:2px solid #a78bfa;transform:rotate(-45deg)}
.av-upsell .actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:20px}
.av-upsell .btn-cta{display:inline-flex;align-items:center;background:#fff;color:#332a86;font-weight:600;font-size:14.5px;
  padding:11px 20px;border-radius:12px;text-decoration:none;transition:transform .12s ease,box-shadow .12s ease}
.av-upsell .btn-cta:hover{transform:translateY(-1px);box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
.av-upsell .rassure{font-size:12px;color:#c9c5ef}
`;

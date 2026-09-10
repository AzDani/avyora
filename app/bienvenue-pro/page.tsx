import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bienvenue dans AVYORA Pro" };

const FEATS = [
  "Devis détaillé, 200 postes",
  "Rapport PDF à comparer",
  "Carnet matériaux & liens",
  "Suivi de chantier illimité",
  "Multi-projets",
  "Budget piloté de A à Z",
];

/**
 * Page de célébration après un paiement réussi (success_url du checkout Stripe).
 * On exige d'être connecté (personnalisation) ; on ne bloque PAS sur le statut Pro pour éviter
 * la course avec le webhook Stripe — le client vient de payer, on le félicite tout de suite.
 */
export default async function BienvenueProPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/bienvenue-pro");

  return (
    <div className="av-welcome">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wcard">
        <div className="whero">
          <span className="conf c1" /><span className="conf c2" /><span className="conf c3" />
          <span className="conf c4" /><span className="conf c5" /><span className="conf c6" />
          <div className="wbadge">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className="web">Bienvenue dans AVYORA Pro</span>
          <h1>Félicitations, tu es Pro ! 🎉</h1>
          <p>Ton abonnement est actif. Tout le <b>gestionnaire de travaux</b> est débloqué.</p>
        </div>

        <div className="wbody">
          <div className="unlocked">
            <div className="u-t">Ce que tu débloques</div>
            <ul className="wfeats">
              {FEATS.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>

          <div className="wcta">
            <Link href="/projets/nouveau/detaille" className="wbtn wbtn-p">Lancer mon estimation détaillée →</Link>
            <Link href="/projets" className="wbtn wbtn-s">Voir mes projets</Link>
          </div>

          <p className="wnote">
            Un reçu vient de t'être envoyé par e-mail.<br />
            Tu gères ton abonnement à tout moment depuis <Link href="/mon-espace/compte">Mon compte</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.av-welcome{--nuit:#1E1B4B;--brand:#4f46e5;--brand-700:#4338ca;--violet:#7c3aed;--accent:#a78bfa;--accent-300:#c4b5fd;--good:#0f9d6b;display:flex;justify-content:center}
.av-welcome .wcard{position:relative;max-width:600px;width:100%;background:var(--color-surface);border:1px solid var(--color-line);border-radius:26px;padding:0 0 34px;overflow:hidden;box-shadow:0 24px 60px -30px rgba(30,27,75,.4);text-align:center}
.av-welcome .whero{position:relative;background:linear-gradient(150deg,var(--nuit),#2a2270 60%,var(--brand));padding:46px 30px 60px;overflow:hidden}
.av-welcome .whero::before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:rgba(167,139,250,.35);filter:blur(70px);top:-120px;right:-40px}
.av-welcome .conf{position:absolute;width:9px;height:9px;border-radius:2px;opacity:.9}
.av-welcome .c1{background:#c4b5fd;left:12%;top:26%;transform:rotate(20deg)}
.av-welcome .c2{background:#a78bfa;left:82%;top:20%;transform:rotate(-15deg)}
.av-welcome .c3{background:#7c3aed;left:24%;top:60%;transform:rotate(35deg);width:7px;height:7px}
.av-welcome .c4{background:#818cf8;left:70%;top:64%;transform:rotate(10deg)}
.av-welcome .c5{background:#e9d5ff;left:46%;top:14%;transform:rotate(-25deg);width:6px;height:6px}
.av-welcome .c6{background:#c4b5fd;left:90%;top:48%;transform:rotate(40deg);width:7px;height:7px}
.av-welcome .wbadge{position:relative;width:78px;height:78px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#7c3aed);display:grid;place-items:center;box-shadow:0 12px 30px -8px rgba(124,58,237,.7),0 0 0 8px rgba(255,255,255,.08)}
.av-welcome .wbadge svg{width:38px;height:38px}
.av-welcome .web{position:relative;display:inline-block;margin-top:20px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-300)}
.av-welcome .whero h1{position:relative;color:#fff;font-size:clamp(24px,4vw,30px);font-weight:700;letter-spacing:-.02em;margin:10px 0 0}
.av-welcome .whero p{position:relative;color:#d7d4f2;font-size:15px;line-height:1.6;margin:12px auto 0;max-width:42ch}
.av-welcome .whero p b{color:#fff;font-weight:600}
.av-welcome .wbody{padding:0 34px}
.av-welcome .unlocked{margin-top:-26px;background:var(--color-surface);border:1px solid var(--color-line);border-radius:18px;padding:20px 22px;box-shadow:0 10px 30px -18px rgba(30,27,75,.25);text-align:left}
.av-welcome .u-t{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--color-faint);margin-bottom:14px}
.av-welcome .wfeats{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:11px 18px}
.av-welcome .wfeats li{position:relative;padding-left:24px;font-size:13.5px;color:var(--color-ink);line-height:1.4}
.av-welcome .wfeats li::before{content:"";position:absolute;left:0;top:3px;width:15px;height:15px;border-radius:50%;background:var(--good);opacity:.15}
.av-welcome .wfeats li::after{content:"";position:absolute;left:4.5px;top:6px;width:6px;height:3.5px;border-left:2px solid var(--good);border-bottom:2px solid var(--good);transform:rotate(-45deg)}
.av-welcome .wcta{display:flex;flex-direction:column;gap:11px;margin-top:26px}
.av-welcome .wbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:15px;border-radius:999px;padding:14px 24px;text-decoration:none}
.av-welcome .wbtn-p{background:var(--brand);color:#fff;box-shadow:0 14px 30px -12px rgba(79,70,229,.55)}
.av-welcome .wbtn-p:hover{background:var(--brand-700)}
.av-welcome .wbtn-s{background:var(--color-surface);color:var(--color-ink);border:1px solid var(--color-line)}
.av-welcome .wbtn-s:hover{border-color:var(--accent-300)}
.av-welcome .wnote{margin-top:22px;font-size:12.5px;color:var(--color-faint);line-height:1.6}
.av-welcome .wnote a{color:var(--brand-700);text-decoration:none;font-weight:600}
`;

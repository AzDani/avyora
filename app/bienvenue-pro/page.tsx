import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "Welcome to AVYORA Pro" : "Bienvenue dans AVYORA Pro" };
}

const TR = {
  fr: {
    feats: [
      "Devis détaillé, 200 postes",
      "Rapport PDF à comparer",
      "Carnet matériaux & liens",
      "Suivi de chantier illimité",
      "Multi-projets",
      "Budget piloté de A à Z",
    ],
    badge: "Bienvenue dans AVYORA Pro",
    title: "Félicitations, tu es Pro ! 🎉",
    subPre: "Ton abonnement est actif. Tout le ",
    subStrong: "gestionnaire de travaux",
    subPost: " est débloqué.",
    unlockTitle: "Ce que tu débloques",
    ctaPrimary: "Lancer mon estimation détaillée →",
    ctaSecondary: "Voir mes projets",
    notePre: "Un reçu vient de t'être envoyé par e-mail.",
    notePost: "Tu gères ton abonnement à tout moment depuis ",
    noteLink: "Mon compte",
    noteEnd: ".",
  },
  en: {
    feats: [
      "Detailed quote, 200 line items",
      "PDF report to compare",
      "Materials list & links",
      "Unlimited project tracking",
      "Multi-project",
      "Budget managed from A to Z",
    ],
    badge: "Welcome to AVYORA Pro",
    title: "Congratulations, you're Pro! 🎉",
    subPre: "Your subscription is active. The whole ",
    subStrong: "renovation manager",
    subPost: " is unlocked.",
    unlockTitle: "What you unlock",
    ctaPrimary: "Start my detailed estimate →",
    ctaSecondary: "See my projects",
    notePre: "A receipt has just been emailed to you.",
    notePost: "You can manage your subscription anytime from ",
    noteLink: "My account",
    noteEnd: ".",
  },
} as const;

/**
 * Page de célébration après un paiement réussi (success_url du checkout Stripe).
 * On exige d'être connecté (personnalisation) ; on ne bloque PAS sur le statut Pro pour éviter
 * la course avec le webhook Stripe — le client vient de payer, on le félicite tout de suite.
 */
export default async function BienvenueProPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/bienvenue-pro");
  const locale = await getLocale();
  const s = TR[locale];

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
          <span className="web">{s.badge}</span>
          <h1>{s.title}</h1>
          <p>{s.subPre}<b>{s.subStrong}</b>{s.subPost}</p>
        </div>

        <div className="wbody">
          <div className="unlocked">
            <div className="u-t">{s.unlockTitle}</div>
            <ul className="wfeats">
              {s.feats.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>

          <div className="wcta">
            <Link href="/projets/nouveau/detaille" className="wbtn wbtn-p">{s.ctaPrimary}</Link>
            <Link href="/projets" className="wbtn wbtn-s">{s.ctaSecondary}</Link>
          </div>

          <p className="wnote">
            {s.notePre}<br />
            {s.notePost}<Link href="/mon-espace/compte">{s.noteLink}</Link>{s.noteEnd}
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

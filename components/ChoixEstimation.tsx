import Link from "next/link";

/**
 * Écran de choix au lancement d'une estimation : Rapide (gratuit) vs Détaillée (Pro).
 * `isPro` adapte la carte détaillée : accès direct pour les abonnés, upsell vers /tarifs sinon.
 * Point d'entrée du tunnel de vente : la carte Pro est visible par tous.
 */
export default function ChoixEstimation({ isPro }: { isPro: boolean }) {
  return (
    <div className="av-choix">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="animate-rise">
        <p className="eyebrow">Nouvelle estimation</p>
        <h1 className="ttl">Comment veux-tu estimer&nbsp;?</h1>
        <p className="sub">
          Deux façons d&apos;obtenir ton budget travaux. Commence rapide, affine quand tu veux — sans rien ressaisir.
        </p>
      </header>

      <div className="grid">
        {/* RAPIDE — gratuit */}
        <section className="ch-card">
          <div className="row1">
            <span className="ico free" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" /></svg>
            </span>
            <span className="tag gratis">Gratuit</span>
          </div>
          <h2>Estimation rapide</h2>
          <p className="lead">4 questions, une fourchette chiffrée immédiate. Idéal pour un premier ordre de grandeur.</p>
          <ul>
            <Li tone="free">Type de bien, surface, ampleur — en 3 min</Li>
            <Li tone="free">Fourchette ±15 % adaptée à ton code postal</Li>
            <Li tone="free">Sans inscription, résultat instantané</Li>
          </ul>
          <div className="spacer" />
          <Link href="/projets/nouveau/rapide" className="btn btn-outline">Commencer gratuitement →</Link>
          <p className="foot">Aucune carte requise</p>
        </section>

        {/* DÉTAILLÉE — Pro */}
        <section className="ch-card pro">
          <div className="row1">
            <span className="ico pro" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h10M4 12h16M4 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="17.5" cy="7" r="2.2" fill="currentColor" /><circle cx="13.5" cy="17" r="2.2" fill="currentColor" />
              </svg>
            </span>
            <span className="tag propill" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="currentColor" /></svg>
              Pro
            </span>
          </div>
          <h2>Estimation détaillée</h2>
          <p className="lead">Ajuste chaque poste et obtiens un devis précis, prêt à comparer avec les artisans.</p>
          <ul>
            <Li tone="pro">Poste par poste, quantités ajustables en direct</Li>
            <Li tone="pro">Rapport PDF détaillé — qui fait quoi, budget par corps d&apos;état</Li>
            <Li tone="pro">Suivi de chantier et modifications illimitées</Li>
          </ul>
          <div className="spacer" />

          {isPro ? (
            <>
              <Link href="/projets/nouveau/detaille" className="btn btn-pro">Ajuster poste par poste →</Link>
              <p className="foot">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="var(--color-accent-500)" /></svg>
                Inclus dans ton abonnement Pro
              </p>
            </>
          ) : (
            <>
              <Link href="/tarifs" className="btn btn-pro">Débloquer avec Pro →</Link>
              <p className="foot">
                <svg width="12" height="13" viewBox="0 0 14 16" fill="none"><path d="M3.5 7V5a3.5 3.5 0 1 1 7 0v2M2.5 7h9v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7Z" stroke="var(--color-faint)" strokeWidth="1.3" /></svg>
                Fonctionnalité AVYORA Pro · <Link href="/tarifs" className="lien">Voir les offres</Link>
              </p>
            </>
          )}
        </section>
      </div>

      <div className="hint">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" /><path d="M10 9v5M10 6.2v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span>Pas sûr&nbsp;? Commence par l&apos;<b>estimation rapide</b> — tu pourras passer en détaillée à tout moment, tes réponses sont conservées.</span>
      </div>
    </div>
  );
}

function Li({ tone, children }: { tone: "free" | "pro"; children: React.ReactNode }) {
  return (
    <li>
      <svg className={tone === "pro" ? "ck-pro" : "ck-free"} width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="m4 10 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

const CSS = `
.av-choix .ttl{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:6px 0 0}
.av-choix .sub{color:var(--color-muted);font-size:15px;margin:10px 0 0;max-width:52ch;line-height:1.6}
.av-choix .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}
@media (max-width:720px){.av-choix .grid{grid-template-columns:1fr}}
.av-choix .ch-card{position:relative;background:var(--color-surface);border:1px solid var(--color-line);border-radius:20px;
  padding:24px 22px;box-shadow:0 1px 2px rgba(21,23,43,.04),0 12px 30px -22px rgba(21,23,43,.30);display:flex;flex-direction:column}
.av-choix .ch-card.pro{border-color:var(--color-brand-200)}
.av-choix .ch-card.pro::before{content:"";position:absolute;inset:0;border-radius:20px;padding:1px;
  background:linear-gradient(140deg,var(--color-accent-400),var(--color-brand-600));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.5;pointer-events:none}
.av-choix .row1{display:flex;align-items:center;justify-content:space-between;gap:10px}
.av-choix .ico{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;flex:none}
.av-choix .ico.free{background:var(--color-brand-50);color:var(--color-brand-600)}
.av-choix .ico.pro{background:linear-gradient(140deg,#2b2568,var(--color-brand-900));color:var(--color-accent-300)}
.av-choix .tag{font-size:11px;font-weight:600;letter-spacing:.03em;padding:5px 11px;border-radius:999px;white-space:nowrap}
.av-choix .tag.gratis{background:var(--color-positive-soft);color:var(--color-positive)}
.av-choix .tag.propill{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;display:inline-flex;align-items:center;gap:5px}
.av-choix .ch-card h2{font-size:20px;font-weight:600;margin:18px 0 0;letter-spacing:-.01em;color:var(--color-ink)}
.av-choix .lead{color:var(--color-muted);font-size:14px;margin:7px 0 0;line-height:1.6}
.av-choix ul{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:11px}
.av-choix li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--color-ink);line-height:1.5}
.av-choix li svg{flex:none;margin-top:2px}
.av-choix .ck-free{color:var(--color-brand-600)}
.av-choix .ck-pro{color:var(--color-accent-600)}
.av-choix .spacer{flex:1;min-height:18px}
.av-choix .btn{width:100%}
.av-choix .btn-outline{background:var(--color-surface);color:var(--color-brand-700);border:1px solid var(--color-line-strong)}
.av-choix .btn-outline:hover{background:var(--color-surface-2)}
.av-choix .btn-pro{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;border:1px solid transparent}
.av-choix .btn-pro:hover{filter:brightness(1.06)}
.av-choix .foot{font-size:12.5px;color:var(--color-faint);margin-top:9px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.av-choix .foot .lien{color:var(--color-brand-600);text-decoration:none;font-weight:500}
.av-choix .foot .lien:hover{text-decoration:underline}
.av-choix .hint{margin-top:22px;background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:14px;padding:13px 16px;font-size:13px;color:var(--color-muted);display:flex;gap:10px;align-items:center;line-height:1.5}
.av-choix .hint svg{flex:none;color:var(--color-brand-500)}
.av-choix .hint b{color:var(--color-ink);font-weight:600}
`;

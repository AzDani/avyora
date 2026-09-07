import { getT } from "@/lib/i18n/server";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Données structurées (JSON-LD) : aide les moteurs à comprendre qu'AVYORA est une application web.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AVYORA",
  url: siteUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  inLanguage: "fr-FR",
  description:
    "Estime le coût de tes travaux de rénovation au prix du marché français, au poste près et ajusté à ta région — avant de signer.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Première estimation gratuite" },
};

const HOME_CSS = `
.av-home{--canvas:#f5f6fb;--surface:#fff;--surface-2:#f8f9fd;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-700:#4338ca;--brand-weak:#eef1ff;--brand-200:#c7ccfe;--violet:#7c3aed;--accent:#a78bfa;--accent-300:#c4b5fd;--good:#0f9d6b;--good-bg:#e6f6ef;--nuit:#1E1B4B;--nuit-2:#241f5e;--nuit-3:#191640;--r:1.15rem;--r-lg:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);--shadow:0 1px 3px rgba(30,27,75,.05),0 10px 26px -12px rgba(30,27,75,.14);--shadow-hero:0 24px 60px -26px rgba(30,27,75,.55);font-family:var(--font-geist-sans),system-ui,sans-serif;color:var(--ink);line-height:1.5}
.av-home .num{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums}
.av-home .wrap{max-width:100%;margin:0;padding:0}
.av-home .eyebrow{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--brand)}
.av-home h1,.av-home h2,.av-home h3{margin:0;letter-spacing:-.02em;text-wrap:balance}
.av-home a{color:inherit;text-decoration:none}
.av-home .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:15px;border-radius:999px;padding:13px 24px;cursor:pointer;border:0;text-decoration:none;transition:.16s var(--ease)}
.av-home .btn-p{background:var(--brand);color:#fff;box-shadow:0 12px 28px -12px rgba(79,70,229,.5)}
.av-home .btn-p:hover{transform:translateY(-2px)}
.av-home .btn-w{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.22)}
.av-home .btn-w:hover{background:rgba(255,255,255,.18)}
.av-home .btn-o{background:#fff;color:var(--brand);border:0}
.av-home .hero{background:linear-gradient(150deg,var(--nuit),var(--nuit-2) 55%,var(--nuit-3));color:#fff;position:relative;overflow:hidden;box-shadow:var(--shadow-hero);border-radius:var(--r-lg)}
.av-home .hero::before,.av-home .hero::after{content:"";position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
.av-home .hero::before{width:480px;height:480px;background:rgba(124,58,237,.4);top:-170px;right:-100px}
.av-home .hero::after{width:400px;height:400px;background:rgba(79,70,229,.32);bottom:-150px;left:-90px}
.av-home .hero .in{position:relative;padding:60px 24px 66px;text-align:center;max-width:720px;margin:0 auto}
.av-home .hero .eyebrow{color:var(--accent-300)}
.av-home .hero h1{font-size:clamp(32px,5vw,52px);font-weight:700;line-height:1.05;margin-top:16px}
.av-home .hero h1 .hl{background:linear-gradient(120deg,#c4b5fd,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-home .hero p.sub{font-size:clamp(16px,2vw,19px);color:#d7d4f2;margin:20px auto 0;max-width:600px;line-height:1.55}
.av-home .hero .cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:30px}
.av-home .hero .trust{display:flex;gap:10px 26px;justify-content:center;flex-wrap:wrap;margin-top:36px;font-size:13px;color:#b7b3e0}
.av-home .hero .trust b{font-family:var(--font-geist-mono),monospace;color:#fff;font-weight:600}
.av-home .hero .trust span{display:inline-flex;align-items:center;gap:8px}
.av-home .hero .trust span::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--accent)}
.av-home section.blk{padding:60px 0}
.av-home .center{text-align:center;max-width:640px;margin:0 auto 40px}
.av-home .center h2{font-size:clamp(25px,3.4vw,34px);font-weight:700;margin-top:10px}
.av-home .center p{color:var(--muted);font-size:16px;margin-top:12px;line-height:1.6}
.av-home .pains{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.av-home .pain{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:22px;box-shadow:var(--shadow)}
.av-home .pain .ic{width:40px;height:40px;border-radius:11px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted);display:grid;place-items:center;margin-bottom:14px}
.av-home .pain .ic svg{width:20px;height:20px}
.av-home .pain h3{font-size:15.5px;font-weight:600}
.av-home .pain p{font-size:13px;color:var(--muted);margin-top:6px;line-height:1.5}
.av-home .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.av-home .stepc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:26px;box-shadow:var(--shadow)}
.av-home .stepc .n{font-family:var(--font-geist-mono),monospace;font-size:14px;font-weight:700;color:#fff;background:var(--brand);width:34px;height:34px;border-radius:10px;display:grid;place-items:center}
.av-home .stepc h3{font-size:17px;font-weight:600;margin-top:16px}
.av-home .stepc p{font-size:13.5px;color:var(--muted);margin-top:7px;line-height:1.55}
.av-home .roi{background:linear-gradient(150deg,var(--nuit-2),var(--nuit));color:#fff;border-radius:var(--r-lg);overflow:hidden}
.av-home .roi .in{padding:60px 24px;text-align:center}
.av-home .roi .eyebrow{color:var(--accent-300)}
.av-home .roi h2{font-size:clamp(25px,4vw,36px);font-weight:700;margin-top:12px;max-width:780px;margin-inline:auto;line-height:1.14}
.av-home .roi h2 .g{color:var(--accent)}
.av-home .roi .cmp{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;margin-top:38px}
.av-home .roi .cbox{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:var(--r-lg);padding:24px 30px;min-width:200px}
.av-home .roi .cbox .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#b7b3e0}
.av-home .roi .cbox .v{font-family:var(--font-geist-mono),monospace;font-weight:700;font-size:32px;margin-top:6px}
.av-home .roi .cbox.small .v{font-size:25px;color:var(--accent-300)}
.av-home .roi .vs{font-family:var(--font-geist-mono),monospace;font-size:19px;color:#8a86bd;font-weight:600}
.av-home .roi .pct{margin-top:26px;font-size:15px;color:#d7d4f2}
.av-home .roi .pct b{font-family:var(--font-geist-mono),monospace;color:#fff}
.av-home .roi .punch{max-width:640px;margin:28px auto 0;font-size:19px;font-weight:600;line-height:1.4}
.av-home .roi .punch em{color:var(--accent-300);font-style:normal}
.av-home .eco{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.av-home .ecard{display:flex;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px;box-shadow:var(--shadow)}
.av-home .ecard .ic{flex:none;width:42px;height:42px;border-radius:12px;background:var(--good-bg);color:var(--good);display:grid;place-items:center}
.av-home .ecard .ic svg{width:22px;height:22px}
.av-home .ecard h3{font-size:15.5px;font-weight:600}
.av-home .ecard h3 b{font-family:var(--font-geist-mono),monospace;color:var(--good)}
.av-home .ecard p{font-size:13px;color:var(--muted);margin-top:5px;line-height:1.5}
.av-home .cred{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px;box-shadow:var(--shadow);display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center}
.av-home .cred .s .v{font-family:var(--font-geist-mono),monospace;font-weight:700;font-size:30px;color:var(--brand)}
.av-home .cred .s .l{font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.4}
.av-home .price{background:linear-gradient(150deg,var(--brand),var(--violet));color:#fff;border-radius:var(--r-lg);padding:44px;text-align:center;box-shadow:0 30px 60px -30px rgba(79,70,229,.6)}
.av-home .price .lance{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:rgba(255,255,255,.16);padding:6px 14px;border-radius:999px}
.av-home .price h2{font-size:clamp(23px,3.4vw,32px);font-weight:700;margin-top:16px}
.av-home .price .p{margin-top:14px;font-size:16px;color:#e9e7fd}
.av-home .price .p .big{font-family:var(--font-geist-mono),monospace;font-size:30px;font-weight:700;color:#fff}
.av-home .price .p s{color:#c9c5ee;font-size:17px;margin-right:8px}
.av-home .price .cta{margin-top:26px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.av-home .price .reassure{margin-top:22px;font-size:13px;color:#e6e3fd;display:flex;gap:10px 22px;justify-content:center;flex-wrap:wrap}
.av-home .price .reassure span{display:inline-flex;align-items:center;gap:7px}
.av-home .price .reassure svg{width:14px;height:14px}
.av-home .final{text-align:center;max-width:640px;margin:0 auto}
.av-home .final h2{font-size:clamp(25px,3.6vw,36px);font-weight:700}
.av-home .final p{color:var(--muted);font-size:16px;margin-top:12px}
.av-home .promo{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;background:linear-gradient(90deg,var(--brand),var(--violet));color:#fff;border-radius:999px;padding:11px 22px;margin-bottom:16px;font-size:13.5px;font-weight:600;box-shadow:0 14px 30px -16px rgba(124,58,237,.65)}
.av-home .promo .dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:avpulse 2s ease-in-out infinite}
@keyframes avpulse{0%,100%{opacity:.35}50%{opacity:1}}
.av-home .promo b{font-family:var(--font-geist-mono),monospace}
.av-home .promo .arr{opacity:.85}
.av-home a.promo:hover{filter:brightness(1.05)}
.av-home .demo{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);overflow:hidden;max-width:720px;margin:0 auto}
.av-home .demo .top{background:linear-gradient(150deg,var(--nuit),var(--nuit-2));color:#fff;padding:22px 26px}
.av-home .demo .top .lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#c9c5ee}
.av-home .demo .top .big{font-family:var(--font-geist-mono),monospace;font-size:26px;font-weight:700;margin-top:6px}
.av-home .demo .top .meta{font-size:12px;color:#d7d4f2;margin-top:6px}
.av-home .demo .body{padding:22px 26px}
.av-home .demo .sec{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);font-weight:600;margin-bottom:11px}
.av-home .demo .bar{display:grid;grid-template-columns:132px 1fr 82px;align-items:center;gap:10px;margin-bottom:8px;font-size:12.5px;color:var(--ink)}
.av-home .demo .bar .t{height:8px;background:var(--line);border-radius:5px;overflow:hidden}
.av-home .demo .bar .f{height:8px;background:var(--brand);border-radius:5px;display:block}
.av-home .demo .bar .a{text-align:right;font-family:var(--font-geist-mono),monospace;font-weight:600}
.av-home .demo .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}
.av-home .demo .tile{border:1px solid var(--line);border-radius:12px;padding:13px}
.av-home .demo .tile.good{background:var(--good-bg);border-color:transparent}
.av-home .demo .tile .k{font-size:10px;color:var(--muted)}
.av-home .demo .tile .v{font-family:var(--font-geist-mono),monospace;font-size:16px;font-weight:600;margin-top:4px}
.av-home .demo .tile.good .v{color:var(--good)}
.av-home .demo-cta{text-align:center;margin-top:22px}
.av-home .doc{max-width:520px;margin:0 auto;position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line-strong);box-shadow:0 40px 80px -40px rgba(30,27,75,.5);max-height:560px}
.av-home .doc img{display:block;width:100%;height:auto}
.av-home .doc::after{content:"";position:absolute;left:0;right:0;bottom:0;height:160px;background:linear-gradient(transparent,var(--canvas));pointer-events:none}
@media(prefers-reduced-motion:reduce){.av-home .promo .dot{animation:none}}
@media(max-width:560px){.av-home .demo .tiles{grid-template-columns:1fr}.av-home .demo .bar{grid-template-columns:112px 1fr 74px}}
@media(max-width:820px){.av-home .pains{grid-template-columns:1fr 1fr}.av-home .steps{grid-template-columns:1fr}.av-home .eco{grid-template-columns:1fr}.av-home .cred{grid-template-columns:1fr 1fr}.av-home .roi .vs{display:none}}
`;

const HOME_HTML = `
<a href="/tarifs" class="promo"><span class="dot"></span>Offre de lancement — jusqu'à <b>−35&nbsp;%</b> sur AVYORA Pro <span class="arr">· durée limitée →</span></a>
<div class="wrap"><header class="hero"><div class="in">
  <div class="eyebrow">Estimateur de rénovation · France</div>
  <h1>Ne signe plus ta rénovation<br><span class="hl">à l'aveugle.</span></h1>
  <p class="sub">En 3 minutes, sache exactement combien vont coûter tes travaux — au poste près, au prix du marché de ta région. <b style="color:#fff">Avant</b> de dépenser le premier euro.</p>
  <div class="cta">
    <a href="/projets/nouveau" class="btn btn-p">Estimer gratuitement →</a>
    <a href="/tarifs" class="btn btn-w">Voir les tarifs</a>
  </div>
  <div class="trust">
    <span><b>173</b> postes de prix</span><span><b>19</b> corps d'état</span><span>prix marché <b>2026</b></span><span>marge <b>±15 %</b></span>
  </div>
</div></header></div>

<section class="blk"><div class="wrap">
  <div class="center">
    <p class="eyebrow">Le vrai problème</p>
    <h2>Une rénovation, c'est des milliers d'euros engagés dans le flou.</h2>
    <p>Tu signes des devis que tu ne peux pas vraiment vérifier. C'est là que les budgets dérapent — vite, et sans prévenir.</p>
  </div>
  <div class="pains">
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h6M8 17h4"/></svg></span><h3>Devis illisibles</h3><p>Un prix global, aucune façon de savoir s'il est juste.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></span><h3>Postes oubliés</h3><p>Ils réapparaissent en plein chantier — toujours plus cher.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/></svg></span><h3>Budgets qui explosent</h3><p>+20, +30 % en cours de route, sans t'avoir prévenu.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg></span><h3>Zéro comparaison</h3><p>Aucun repère de marché : tu signes en croisant les doigts.</p></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">La solution</p>
    <h2>Sais où tu vas, dès le premier jour.</h2>
  </div>
  <div class="steps">
    <div class="stepc"><div class="n">1</div><h3>Décris ton bien</h3><p>4 questions, moins de 3 minutes. Type, surface, ampleur, finition.</p></div>
    <div class="stepc"><div class="n">2</div><h3>Reçois ta fourchette</h3><p>Un budget immédiat, ±15 %, ajusté au prix du marché de ta région.</p></div>
    <div class="stepc"><div class="n">3</div><h3>Affine au poste près</h3><p>Les 173 postes, fait-faire / je fais, et le rapport PDF — avec AVYORA&nbsp;Pro.</p></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">Aperçu du résultat · AVYORA Pro</p><h2>Le rapport détaillé, avec Pro.</h2><p>Un vrai document chiffré poste par poste, à débloquer avec AVYORA&nbsp;Pro — exemple : maison 145 m² à Bordeaux. L'estimation rapide (ta fourchette), elle, reste gratuite.</p></div>
  <div class="doc"><img src="/exemple-rapport.png" alt="Exemple de rapport d'estimation détaillée AVYORA" width="1680" height="2356" loading="lazy"></div>
  <div class="demo-cta"><a href="/projets/nouveau" class="btn btn-p">Estimer gratuitement →</a></div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap"><div class="roi"><div class="in">
  <p class="eyebrow">Fais le calcul</p>
  <h2>18,85 €/mois pour piloter un chantier à <span class="g">80&nbsp;000&nbsp;€</span>.</h2>
  <div class="cmp">
    <div class="cbox"><div class="k">Ta rénovation</div><div class="v">80&nbsp;000&nbsp;€</div></div>
    <div class="vs">vs</div>
    <div class="cbox small"><div class="k">AVYORA Pro</div><div class="v">18,85 €/mois</div></div>
  </div>
  <div class="pct">Soit <b>0,02 %</b> du budget pour le maîtriser entièrement.</div>
  <div class="punch">Un <em>seul poste oublié</em> dans un devis coûte souvent plus cher qu'une <em>année entière</em> d'AVYORA.</div>
</div></div></div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">Le retour sur investissement</p>
    <h2>AVYORA te fait gagner bien plus qu'il ne coûte.</h2>
    <p>Concrètement, voilà où l'outil se rembourse — dès le premier chantier.</p>
  </div>
  <div class="eco">
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><h3>Chiffre ton économie en bricolant</h3><p>Selon ce que tu fais toi-même, AVYORA t'indique combien tu économises sur la main-d'œuvre — <b>jusqu'à −55 %</b>.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg></div><div><h3>Repère un devis surévalué</h3><p>Compare chaque poste au prix de marché. Un artisan +10 % sur 50&nbsp;000&nbsp;€, c'est 5&nbsp;000&nbsp;€.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div><div><h3>Négocie — et emprunte serein</h3><p>Un rapport PDF chiffré poste par poste : à présenter à tes artisans pour négocier, et à ta banque pour appuyer ton dossier de prêt.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></div><div><h3>Anticipe les imprévus</h3><p>La provision aléas est intégrée : plus de mauvaise surprise en cours de chantier.</p></div></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">Pourquoi c'est fiable</p><h2>Des prix réels, pas une approximation.</h2></div>
  <div class="cred">
    <div class="s"><div class="v">173</div><div class="l">postes de prix chiffrés</div></div>
    <div class="s"><div class="v">19</div><div class="l">corps d'état couverts</div></div>
    <div class="s"><div class="v">2026</div><div class="l">prix du marché français</div></div>
    <div class="s"><div class="v">±15 %</div><div class="l">précision au poste près</div></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="price">
    <span class="lance">Offre de lancement · jusqu'à −35 %</span>
    <h2>Gratuit pour estimer. Pro pour tout débloquer.</h2>
    <div class="p"><s>29 €</s><span class="big">18,85 €</span> / mois — détaillé 173 postes, rapport PDF, sauvegarde et suivi de chantier.</div>
    <div class="cta">
      <a href="/tarifs" class="btn btn-o">Passer Pro</a>
      <a href="/tarifs" class="btn btn-w">Voir tous les plans</a>
    </div>
    <div class="reassure">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Gratuit pour tester</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Sans engagement</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Résiliable à tout moment</span>
    </div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="final">
    <h2>Ta rénovation mérite mieux qu'un devis au feeling.</h2>
    <p>Lance ta première estimation gratuite. En 3 minutes, tu sauras où tu vas.</p>
    <div style="margin-top:26px"><a href="/projets/nouveau" class="btn btn-p" style="font-size:16px;padding:16px 32px">Estimer gratuitement →</a></div>
  </div>
</div></section>
`;

const HOME_HTML_EN = `
<a href="/tarifs" class="promo"><span class="dot"></span>Launch offer — up to <b>−35&nbsp;%</b> on AVYORA Pro <span class="arr">· limited time →</span></a>
<div class="wrap"><header class="hero"><div class="in">
  <div class="eyebrow">Renovation estimator · France</div>
  <h1>Stop signing your renovation<br><span class="hl">blind.</span></h1>
  <p class="sub">In 3 minutes, know exactly what your renovation will cost — line by line, at your region's market price. <b style="color:#fff">Before</b> you spend the first euro.</p>
  <div class="cta">
    <a href="/projets/nouveau" class="btn btn-p">Estimate for free →</a>
    <a href="/tarifs" class="btn btn-w">See pricing</a>
  </div>
  <div class="trust">
    <span><b>173</b> price items</span><span><b>19</b> trades</span><span><b>2026</b> market prices</span><span><b>±15 %</b> margin</span>
  </div>
</div></header></div>

<section class="blk"><div class="wrap">
  <div class="center">
    <p class="eyebrow">The real problem</p>
    <h2>A renovation means thousands of euros committed in the dark.</h2>
    <p>You sign quotes you can't really check. That's where budgets slip — fast, and without warning.</p>
  </div>
  <div class="pains">
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h6M8 17h4"/></svg></span><h3>Unreadable quotes</h3><p>One lump sum, no way to tell if it's fair.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></span><h3>Forgotten items</h3><p>They resurface mid-project — always pricier.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/></svg></span><h3>Budgets that blow up</h3><p>+20, +30 % along the way, with no heads-up.</p></div>
    <div class="pain"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg></span><h3>Zero comparison</h3><p>No market benchmark: you sign and cross your fingers.</p></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">The solution</p>
    <h2>Know where you're going, from day one.</h2>
  </div>
  <div class="steps">
    <div class="stepc"><div class="n">1</div><h3>Describe your property</h3><p>4 questions, under 3 minutes. Type, area, scope, finish.</p></div>
    <div class="stepc"><div class="n">2</div><h3>Get your range</h3><p>An instant budget, ±15 %, adjusted to your region's market price.</p></div>
    <div class="stepc"><div class="n">3</div><h3>Refine line by line</h3><p>All 173 items, DIY vs. hire-out, and the PDF report — with AVYORA&nbsp;Pro.</p></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">Result preview · AVYORA Pro</p><h2>The detailed report, with Pro.</h2><p>A real costed document, line by line, unlocked with AVYORA&nbsp;Pro — example: 145 m² house in Bordeaux. The quick estimate (your range) stays free.</p></div>
  <div class="doc"><img src="/exemple-rapport.png" alt="Example of a detailed AVYORA estimate report" width="1680" height="2356" loading="lazy"></div>
  <div class="demo-cta"><a href="/projets/nouveau" class="btn btn-p">Estimate for free →</a></div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap"><div class="roi"><div class="in">
  <p class="eyebrow">Do the math</p>
  <h2>€18.85/mo to steer an <span class="g">€80,000</span> project.</h2>
  <div class="cmp">
    <div class="cbox"><div class="k">Your renovation</div><div class="v">€80,000</div></div>
    <div class="vs">vs</div>
    <div class="cbox small"><div class="k">AVYORA Pro</div><div class="v">€18.85/mo</div></div>
  </div>
  <div class="pct">That's <b>0.02 %</b> of the budget to control all of it.</div>
  <div class="punch">A <em>single forgotten item</em> in a quote often costs more than a <em>whole year</em> of AVYORA.</div>
</div></div></div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">Return on investment</p>
    <h2>AVYORA saves you far more than it costs.</h2>
    <p>Here's exactly where it pays for itself — from the very first project.</p>
  </div>
  <div class="eco">
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><h3>Quantify your DIY savings</h3><p>Depending on what you do yourself, AVYORA shows how much you save on labor — <b>up to −55 %</b>.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg></div><div><h3>Spot an overpriced quote</h3><p>Compare each item to the market price. A contractor +10 % on €50,000 is €5,000.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div><div><h3>Negotiate — and borrow with confidence</h3><p>A PDF report costed line by line: to negotiate with your contractors, and to back your loan application at the bank.</p></div></div>
    <div class="ecard"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></div><div><h3>Plan for the unexpected</h3><p>A contingency allowance is built in: no more nasty surprises mid-project.</p></div></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">Why it's reliable</p><h2>Real prices, not a guess.</h2></div>
  <div class="cred">
    <div class="s"><div class="v">173</div><div class="l">costed price items</div></div>
    <div class="s"><div class="v">19</div><div class="l">trades covered</div></div>
    <div class="s"><div class="v">2026</div><div class="l">French market prices</div></div>
    <div class="s"><div class="v">±15 %</div><div class="l">line-item accuracy</div></div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="price">
    <span class="lance">Launch offer · up to −35 %</span>
    <h2>Free to estimate. Pro to unlock everything.</h2>
    <div class="p"><s>€29</s><span class="big">€18.85</span> / month — detailed 173 items, PDF report, saving and project tracking.</div>
    <div class="cta">
      <a href="/tarifs" class="btn btn-o">Go Pro</a>
      <a href="/tarifs" class="btn btn-w">See all plans</a>
    </div>
    <div class="reassure">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Free to try</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>No commitment</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Cancel anytime</span>
    </div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="final">
    <h2>Your renovation deserves better than a gut-feel quote.</h2>
    <p>Start your first free estimate. In 3 minutes, you'll know where you're going.</p>
    <div style="margin-top:26px"><a href="/projets/nouveau" class="btn btn-p" style="font-size:16px;padding:16px 32px">Estimate for free →</a></div>
  </div>
</div></section>
`;

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ compte }, { locale }] = await Promise.all([searchParams, getT()]);
  const en = locale === "en";
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {compte === "supprime" && (
        <div className="card mb-8 flex items-center gap-3 border-positive/25 bg-positive-soft p-4 text-sm text-positive">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {en ? "Your account and all your data have been deleted. See you soon!" : "Ton compte et toutes tes données ont bien été supprimés. À bientôt !"}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      <div className="av-home" dangerouslySetInnerHTML={{ __html: en ? HOME_HTML_EN : HOME_HTML }} />
    </>
  );
}

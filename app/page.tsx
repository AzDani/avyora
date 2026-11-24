import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { META_EN, metaSelonLangue } from "@/lib/i18n/meta";
import { FEATURES } from "@/lib/features";
import { betaActive, dateInsecable, libellesBeta, lienInscriptionBeta } from "@/lib/beta";
import { getUser } from "@/lib/auth";
import { og } from "@/lib/seo-og";
import { accueilBeta } from "@/lib/accueil-beta";

// Le canonical de l'accueil vit ici (retiré du layout racine où il contaminait toutes les pages).
// Son aperçu de partage aussi : le layout racine ne porte plus que les valeurs de marque (cf. seoMeta). En anglais
// (cookie av-lang, jamais chez un robot), le titre et l'aperçu de partage suivent la page (lib/i18n/meta.ts).
/* Référencement du 20/11/2026 : l'accueil mène par l'accompagnement (les recherches « accompagnement travaux », « suivi
   de chantier ») ET garde l'estimation (« estimation travaux », le plus gros volume). */
const TITRE_ACCUEIL = "AVYORA — accompagnement et estimation de travaux";
const DESCRIPTION_ACCUEIL =
  "Relecture de devis, avis avant achat, organisation de chantier : un ex-gérant de société de travaux t'accompagne. Et AVYORA chiffre tes travaux.";
const META: Metadata = {
  title: { absolute: TITRE_ACCUEIL },
  description: DESCRIPTION_ACCUEIL,
  alternates: { canonical: "/" },
  openGraph: og({ title: "AVYORA — accompagnement, estimation et plans pour tes travaux", description: DESCRIPTION_ACCUEIL, path: "/", type: "website" }),
  twitter: { card: "summary_large_image", title: TITRE_ACCUEIL, description: DESCRIPTION_ACCUEIL },
};
export async function generateMetadata(): Promise<Metadata> {
  return metaSelonLangue(await getLocale(), META, META_EN.accueil);
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Données structurées (JSON-LD) : aide les moteurs à comprendre qu'AVYORA est une application web.
 *
 * L'offre décrit ce qui est RÉELLEMENT ouvert (cf. lib/beta.ts) : pendant la bêta, tout est gratuit
 * avec un compte ; après, l'estimation rapide reste gratuite. Pas d'offre Pro payante ici tant que le
 * paiement n'est pas ouvert : annoncer un prix inactif aux moteurs serait une donnée structurée fausse.
 * Calculée à la requête (la page est dynamique) : la fin de la bêta la fait basculer d'elle-même.
 * « BusinessApplication », comme la page de la construction neuve : AVYORA n'est pas un outil financier.
 */
function jsonLdAccueil() {
  const beta = betaActive();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Accompagnement travaux",
        serviceType: "Conseil en travaux de rénovation et de construction",
        description: "Relecture de devis, avis avant achat, estimation du budget et organisation du chantier, à distance, par un ancien gérant de société de travaux. Premier appel gratuit.",
        url: `${siteUrl}/accompagnement-travaux`,
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Country", name: "France" },
      },
      jsonLdApplication(beta),
    ],
  };
}

function jsonLdApplication(beta: boolean) {
  return {
    "@type": "WebApplication",
    name: "AVYORA",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    description:
      "Estime le coût de tes travaux de rénovation au prix du marché français, au poste près et ajusté à ta région — avant de signer.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: beta
        ? `Gratuit pendant la bêta, jusqu'au ${libellesBeta("fr").fin}, avec un compte`
        : "Estimation rapide gratuite, sans compte pour une pièce ou tout le bien",
    },
  };
}

/* Puces du héros (.trust) : texte en ligne, sans inline-flex ni gap (le gap s'insérait entre le <b> et le texte voisin :
   « multi -projets »). La police à chasse fixe est réservée aux chiffres (classe .num), plus aux mots en gras (héros,
   bandeau, « Fais le calcul »). --faint suit le jeton du site (#6a6f88, contraste AA sur fond clair). */
const HOME_CSS = `
.av-home{--canvas:#f5f6fb;--surface:#fff;--surface-2:#f8f9fd;--ink:#15172b;--muted:#565a75;--faint:#6a6f88;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-700:#4338ca;--brand-weak:#eef1ff;--brand-200:#c7ccfe;--violet:#7c3aed;--accent:#a78bfa;--accent-300:#c4b5fd;--good:#0f9d6b;--good-bg:#e6f6ef;--nuit:#1E1B4B;--nuit-2:#241f5e;--nuit-3:#191640;--r:1.15rem;--r-lg:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);--shadow:0 1px 3px rgba(30,27,75,.05),0 10px 26px -12px rgba(30,27,75,.14);--shadow-hero:0 24px 60px -26px rgba(30,27,75,.55);font-family:var(--font-geist-sans),system-ui,sans-serif;color:var(--ink);line-height:1.5}
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
.av-home .hero .trust b{color:#fff;font-weight:600}
.av-home .hero .trust span{display:inline-block;white-space:nowrap}
.av-home .hero .trust span::before{content:"";display:inline-block;vertical-align:middle;width:5px;height:5px;border-radius:50%;background:var(--accent);margin:0 8px 2px 0}
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
.av-home .stepc .ico{font-size:22px;margin-top:14px;display:block}
.av-home .steps4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;position:relative}
.av-home .steps4::before{content:"";position:absolute;top:43px;left:12%;right:12%;height:2px;background:linear-gradient(90deg,var(--brand-200),var(--accent));z-index:0}
.av-home .steps4 .stepc{position:relative;z-index:1}
.av-home .strip{margin-top:26px;background:var(--brand-weak);border:1px solid var(--brand-200);border-radius:var(--r-lg);padding:22px 26px;text-align:center}
.av-home .strip .t{font-weight:700;font-size:16px;color:var(--nuit)}
.av-home .strip .d{color:var(--muted);font-size:14px;margin-top:6px;line-height:1.55;max-width:60ch;margin-inline:auto}
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
.av-home .roi .pct b{color:#fff}
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
@media(max-width:820px){.av-home .pains{grid-template-columns:1fr 1fr}.av-home .steps{grid-template-columns:1fr}.av-home .steps4{grid-template-columns:1fr 1fr}.av-home .steps4::before{display:none}.av-home .eco{grid-template-columns:1fr}.av-home .cred{grid-template-columns:1fr 1fr}.av-home .roi .vs{display:none}}
@media (forced-colors: active){.av-home .hero h1 .hl{-webkit-text-fill-color:currentColor;color:CanvasText;background:none}}
@media(max-width:440px){.av-home .steps4,.av-home .pains,.av-home .cred{grid-template-columns:1fr}}
`;

/* Éditeur de plan (C9) : section sombre juste après le hero, insérée seulement quand FEATURES.plans est allumé (éteint :
   HTML d'origine au caractère près, comme NEUF_BAND). Deux vraies captures de l'éditeur (la Maison 94 m², en gratuit,
   2D puis 3D), webp 760 / 1040 et PNG de repli, largeur et hauteur posées. Le hero et ses boutons ne bougent pas : la
   conversion Ads reste « Estimation terminée ». La 3ᵉ puce (le chiffrage depuis le plan) seulement si le neuf est en
   ligne. Ni prix ni emoji ; pour un Plan final, ni « estimer », ni « budget », ni « neuf », ni « travaux » (D75). */
const PLAN_CSS = `<style>.av-home .planb{margin-top:22px;background:linear-gradient(150deg,var(--nuit-2),var(--nuit));color:#fff;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-hero)}.av-home .planb .in{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);gap:40px;align-items:center;padding:48px 40px}.av-home .planb .eyebrow{color:var(--accent-300)}.av-home .planb h2{font-size:clamp(25px,3.4vw,34px);font-weight:700;margin-top:10px;line-height:1.12}.av-home .planb p.d{color:#d7d4f2;font-size:15.5px;margin-top:14px;line-height:1.6}.av-home .planb ul{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:9px}.av-home .planb li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.5}.av-home .planb li::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-top:8px}.av-home .planb .cta{display:flex;gap:12px 20px;flex-wrap:wrap;align-items:center;margin-top:26px}.av-home .planb a.lien{color:var(--accent-300);font-weight:600;font-size:14.5px}.av-home .planb a.lien:hover{color:#fff}.av-home .planb .note{font-size:12.5px;color:#a9a5d6;margin-top:14px}.av-home .planb .vis{position:relative;padding-bottom:16%}.av-home .planb .p2d{display:block;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 60px -30px rgba(0,0,0,.6);background:#fff}.av-home .planb .p3d{display:block;position:absolute;right:-2%;bottom:0;width:60%;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.85);box-shadow:0 26px 50px -20px rgba(0,0,0,.65);background:#fff}.av-home .planb img{display:block;width:100%;height:auto}@media(max-width:820px){.av-home .planb .in{grid-template-columns:1fr;padding:36px 22px;gap:30px}.av-home .planb .p3d{right:0}}.av-home .planb .tel{display:none}@media(max-width:600px){.av-home .planb .bureau{display:none}.av-home .planb .tel{display:inline-flex}}</style>`;
const planVisuels = (alt2d: string, alt3d: string) =>
  `<div class="vis"><picture class="p2d"><source type="image/webp" srcset="/plans/maison-2d-760.webp 760w, /plans/maison-2d-1040.webp 1040w" sizes="(max-width:820px) 92vw, 520px"><img src="/plans/maison-2d.png" width="1040" height="650" loading="eager" decoding="async" alt="${alt2d}"></picture><picture class="p3d"><source type="image/webp" srcset="/plans/maison-3d-760.webp 760w, /plans/maison-3d-1040.webp 1040w" sizes="(max-width:820px) 56vw, 320px"><img src="/plans/maison-3d.png" width="1040" height="650" loading="lazy" decoding="async" alt="${alt3d}"></picture></div>`;
const PLAN_BAND = `
${PLAN_CSS}<section class="planb" aria-labelledby="planb-titre"><div class="in"><div>
  <p class="eyebrow">Éditeur de plan · Gratuit</p>
  <h2 id="planb-titre">Dessine ton plan. Vois-le en 3D.</h2>
  <p class="d">Trace tes murs à la souris : chaque pièce se ferme toute seule et affiche sa surface. Ajoute portes, fenêtres et équipements, puis passe en 3D d'un clic.</p>
  <ul><li>Gratuit avec un compte, sans installation</li><li>Les surfaces calculées pièce par pièce</li>${FEATURES.neuf ? "<li>Ta future maison chiffrée depuis ton plan</li>" : ""}</ul>
  <div class="cta"><a href="/plan" class="btn btn-p bureau" data-clic-plan="accueil">Créer mon plan →</a><a href="/logiciel-plan-maison" class="btn btn-p tel" data-clic-plan="accueil">Créer mon plan →</a><a href="/logiciel-plan-maison" class="lien bureau" data-clic-plan="accueil">Découvrir l'éditeur</a></div>
  <p class="note">Le dessin se fait sur ordinateur ou tablette.</p>
</div>${planVisuels("Plan 2D d'une maison de plain-pied de 94 m² dans l'éditeur AVYORA : pièces nommées, surfaces, cotes et mobilier", "La même maison de 94 m² en 3D dans l'éditeur AVYORA")}</div></section>`;
const PLAN_BAND_EN = `
${PLAN_CSS}<section class="planb" aria-labelledby="planb-titre"><div class="in"><div>
  <p class="eyebrow">Floor plan editor · Free</p>
  <h2 id="planb-titre">Draw your floor plan. See it in 3D.</h2>
  <p class="d">Trace your walls with the mouse: each room closes on its own and shows its floor area. Add doors, windows and fixtures, then switch to 3D in one click.</p>
  <ul><li>Free with an account, nothing to install</li><li>Floor areas worked out room by room</li>${FEATURES.neuf ? "<li>Your future house priced from your plan</li>" : ""}</ul>
  <div class="cta"><a href="/plan" class="btn btn-p bureau" data-clic-plan="accueil">Create my plan →</a><a href="/logiciel-plan-maison" class="btn btn-p tel" data-clic-plan="accueil">Create my plan →</a><a href="/logiciel-plan-maison" class="lien bureau" data-clic-plan="accueil">Discover the editor</a></div>
  <p class="note">Drawing works on a computer or tablet. The editor is in French for now.</p>
</div>${planVisuels("2D plan of a 94 m² single-story house in the AVYORA editor: named rooms, floor areas, dimensions and furniture", "The same 94 m² house in 3D in the AVYORA editor")}</div></section>`;
/* L'éditeur demande un compte (décision de Dani du 12/11/2026) : au bureau, le bouton de la section mène à l'éditeur pour
   une personne connectée ; sans compte (et pour Google), à l'inscription, qui ramène à l'éditeur, et il le dit. Au
   téléphone, il mène à la vitrine (on n'y dessine pas), qui fait de même. */
const CTA_PLAN = {
  fr: '<a href="/plan" class="btn btn-p bureau" data-clic-plan="accueil">Créer mon plan →</a>',
  en: '<a href="/plan" class="btn btn-p bureau" data-clic-plan="accueil">Create my plan →</a>',
};
const HREF_INSCRIPTION_PLAN = lienInscriptionBeta("/plan", "accueil").replace(/&/g, "&amp;");
const CTA_PLAN_ANONYME = {
  fr: `<a href="${HREF_INSCRIPTION_PLAN}" class="btn btn-p bureau" data-clic-plan="accueil">Crée ton compte gratuit pour dessiner →</a>`,
  en: `<a href="${HREF_INSCRIPTION_PLAN}" class="btn btn-p bureau" data-clic-plan="accueil">Create your free account to start drawing →</a>`,
};
/** Le bouton « bureau » de la section de l'éditeur, selon la session. */
function ctaPlanAccueil(html: string, locale: "fr" | "en", connecte: boolean): string {
  return connecte ? html : html.split(CTA_PLAN[locale]).join(CTA_PLAN_ANONYME[locale]);
}

type Beta = { active: boolean; fin: string; inscription: string };

const IC = {
  reno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 11.5h2M12 11.5h2M16 11.5h0M8 15.5h2M12 15.5h2M16 15.5v2"/></svg>',
  neuf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3.5 21 11"/><path d="M5.5 9.5V20.5h13V9.5"/><path d="M10 20.5v-6h4v6"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h8V3M11 16.5v4.5M15 12h6"/></svg>',
  devis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 19.5 5.5v6c0 4.6-3.2 8.3-7.5 10-4.3-1.7-7.5-5.4-7.5-10v-6z"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/></svg>',
  suivi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5h17"/><path d="M6.5 16.5v-5M11 16.5V7M15.5 16.5v-3.5M20 16.5V9.5"/></svg>',
  conseil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13.5v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
};

const ACCUEIL_CSS = `<style>
.av-home .hero .in.h2c{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:44px;align-items:center;text-align:left;max-width:none;padding:56px 48px 60px}
.av-home .hero .h2c .cta{justify-content:flex-start}
.av-home .hero .h2c .trust{justify-content:flex-start;margin-top:28px}
.av-home .hero .h2c p.sub{margin-left:0;max-width:56ch}
.av-home .hero .h2c h1{font-size:clamp(30px,3.8vw,44px);line-height:1.08}
.av-home .expert{background:#fff;color:var(--ink);text-align:left;border-radius:20px;padding:22px;box-shadow:0 30px 60px -28px rgba(0,0,0,.55)}
.av-home .expert .qui{display:flex;align-items:center;gap:14px}
.av-home .expert .av{flex:none;width:80px;height:80px;border-radius:16px;object-fit:cover;background:var(--brand-weak);box-shadow:0 1px 3px rgba(30,27,75,.12)}
.av-home .expert .qui b{display:block;font-size:15.5px;color:var(--nuit)}
.av-home .expert .qui span span{display:block;font-size:12.5px;color:var(--muted)}
.av-home .expert .ans{margin-left:auto;font-size:12px;font-weight:600;color:#0b6e4b;background:var(--good-bg);border-radius:999px;padding:5px 10px;white-space:nowrap}
.av-home .expert .ans b{color:#0b6e4b}
.av-home .expert ol{list-style:none;margin:16px 0 0;padding:0 0 0 14px;border-left:2px solid var(--brand-200);display:grid;gap:12px}
.av-home .expert li{display:grid;grid-template-columns:62px 1fr;gap:10px;position:relative}
.av-home .expert li::before{content:"";position:absolute;left:-20px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 3px #fff}
.av-home .expert li .d{font-size:11.5px;font-weight:700;color:var(--brand-700);letter-spacing:.02em;padding-top:2px}
.av-home .expert li b{display:block;font-size:14px;color:var(--ink)}
.av-home .expert li b+span{display:block;font-size:12.5px;color:var(--muted);line-height:1.45;margin-top:1px}
.av-home .expert ul.pq{list-style:none;margin:16px 0 0;padding:14px 0 0;border-top:1px solid var(--line);display:grid;gap:7px}.av-home .expert ul.pq li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.4}.av-home .expert ul.pq li::before{content:none}.av-home .expert ul.pq svg{flex:none;margin-top:1px;color:var(--brand-700)}
.av-home .expert .cit{margin-top:16px;font-size:13.5px;line-height:1.55;color:var(--ink);background:var(--surface-2);border-radius:12px;padding:12px 14px;font-style:italic}
.av-home .expert .lien{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-size:14px;font-weight:600;color:var(--brand-700);text-decoration:underline;text-underline-offset:3px}
.av-home .svc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.av-home .svc.n4{grid-template-columns:repeat(2,minmax(0,1fr))}
.av-home .svc a{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;box-shadow:var(--shadow);transition:transform .16s var(--ease),border-color .16s}
.av-home .svc a:hover{transform:translateY(-3px);border-color:var(--brand-200)}
.av-home .svc a:focus-visible{outline:3px solid var(--brand-200);outline-offset:3px}
.av-home .svc .tete{display:flex;align-items:center;justify-content:space-between;gap:10px}
.av-home .svc .ic{width:42px;height:42px;border-radius:12px;background:var(--brand-weak);color:var(--brand-700);display:grid;place-items:center}
.av-home .svc .ic svg{width:21px;height:21px}
.av-home .svc .acc{font-size:11.5px;font-weight:600;border-radius:999px;padding:4px 10px;white-space:nowrap}
.av-home .svc .acc.g{background:var(--good-bg);color:#0b6e4b}
.av-home .svc .acc.p{background:var(--nuit);color:#fff}
.av-home .svc .acc.o{background:#fff4dc;color:#8a5300}
.av-home .svc h3{font-size:17px;font-weight:650;margin-top:16px;color:var(--nuit)}
.av-home .svc p{font-size:14px;color:var(--muted);margin-top:6px;line-height:1.55;flex:1}
.av-home .svc .go{margin-top:14px;font-size:14px;font-weight:600;color:var(--brand-700)}
.av-home .rsx{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:center;background:var(--surface);border:1.5px solid var(--brand-200);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:40px}
.av-home .rsx h2{font-size:clamp(24px,3.2vw,32px);font-weight:700;line-height:1.14;margin-top:10px;color:var(--nuit)}
.av-home .rsx p.d{color:var(--muted);font-size:15.5px;line-height:1.6;margin-top:12px;max-width:54ch}
.av-home .rsx .cta{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin-top:22px}
.av-home .rsx .lien{color:var(--brand-700);font-weight:600;font-size:14px;text-decoration:underline;text-underline-offset:3px;min-height:44px;display:inline-flex;align-items:center}
.av-home .rsx .acces{font-size:13px;color:var(--faint);margin-top:12px}
.av-home .rsx ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.av-home .rsx li{display:grid;grid-template-columns:36px 1fr;gap:14px;align-items:start;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.av-home .rsx li .c{width:36px;height:36px;border-radius:10px;background:var(--good-bg);color:var(--good);display:grid;place-items:center}
.av-home .rsx li .c svg{width:17px;height:17px}
.av-home .rsx li .t{font-weight:600;font-size:14.5px;color:var(--ink);display:block}
.av-home .rsx li .s{font-size:13px;color:var(--muted);margin-top:2px;line-height:1.45;display:block}
.av-home .frm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}
.av-home .frm .col{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:28px;box-shadow:var(--shadow);display:flex;flex-direction:column}
.av-home .frm .col.pro{background:linear-gradient(150deg,var(--nuit),var(--nuit-2));color:#fff;border-color:transparent;box-shadow:var(--shadow-hero)}
.av-home .frm .nom{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--brand)}
.av-home .frm .pro .nom{color:var(--accent-300)}
.av-home .frm .px{font-size:26px;font-weight:700;margin-top:8px;color:var(--nuit)}
.av-home .frm .pro .px{color:#fff}
.av-home .frm .px small{font-size:14px;font-weight:500;color:var(--muted)}
.av-home .frm .pro .px small{color:#c9c5ee}
.av-home .frm ul{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:10px;flex:1}
.av-home .frm li{display:grid;grid-template-columns:18px 1fr;gap:10px;font-size:14.5px;line-height:1.45}
.av-home .frm li svg{width:16px;height:16px;margin-top:2px;color:var(--good)}
.av-home .frm .pro li svg{color:var(--accent)}
.av-home .frm .bas{margin-top:22px;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.av-home .frm .note{font-size:13px;color:#d7d4f2;margin-top:14px;line-height:1.5}
.av-home .frm .lien{color:var(--brand-700);font-weight:600;font-size:14px;text-decoration:underline;text-underline-offset:3px;min-height:44px;display:inline-flex;align-items:center}
.av-home .chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:22px}
.av-home .chips a{display:inline-flex;align-items:center;min-height:42px;background:var(--brand-weak);color:var(--brand-700);border-radius:999px;padding:0 16px;font-size:14px;font-weight:600}
.av-home .chips a.tous{background:var(--brand);color:#fff}
.av-home .chips a:hover{filter:brightness(.97)}
.av-home .gap{margin-top:22px}
@media(max-width:900px){.av-home .svc{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){.av-home .hero .in.h2c{grid-template-columns:1fr;padding:40px 22px 44px;gap:30px}.av-home .rsx{grid-template-columns:1fr;padding:28px 22px;gap:24px}}
@media(max-width:620px){.av-home .svc,.av-home .svc.n4,.av-home .frm{grid-template-columns:1fr}.av-home .frm .col{padding:24px 20px}}
@media (prefers-reduced-motion:reduce){.av-home .svc a{transition:none}.av-home .svc a:hover{transform:none}}
</style>`;

/** Une carte de service. `acces` : g (gratuit), p (avec Pro), o (offert). */
const carte = (href: string, ic: string, acces: [string, "g" | "p" | "o"], titre: string, texte: string, go: string, attrs = "") =>
  `<a href="${href}"${attrs}><span class="tete"><span class="ic">${ic}</span><span class="acc ${acces[1]}">${acces[0]}</span></span><h3>${titre}</h3><p>${texte}</p><span class="go">${go} <span aria-hidden="true">→</span></span></a>`;

const preuve = (t: string, s: string) => `<li><span class="c">${IC.ok}</span><span><span class="t">${t}</span><span class="s">${s}</span></span></li>`;
const coche = (t: string) => `<li>${IC.ok}<span>${t}</span></li>`;

const CHIPS_FR = [
  ["renovation-salle-de-bain", "Salle de bain"], ["renovation-cuisine", "Cuisine"], ["refaire-toiture", "Toiture"], ["peinture-interieure", "Peinture"],
  ["renovation-electrique", "Électricité"], ["remplacement-fenetres", "Fenêtres"], ["isolation-combles", "Combles"], ["remplacer-baignoire-par-douche", "Baignoire → douche"],
];
const CHIPS_EN = [
  ["renovation-salle-de-bain", "Bathroom"], ["renovation-cuisine", "Kitchen"], ["refaire-toiture", "Roof"], ["peinture-interieure", "Painting"],
  ["renovation-electrique", "Electrical"], ["remplacement-fenetres", "Windows"], ["isolation-combles", "Attic insulation"], ["remplacer-baignoire-par-douche", "Bath → shower"],
];
const chips = (liste: string[][], tous: string) =>
  `<div class="chips">${liste.map(([s, l]) => `<a href="/prix-travaux/${s}">${l}</a>`).join("")}<a href="/prix-travaux" class="tous">${tous}</a></div>`;

/* ─── L'accueil « trois portes » (24/11/2026, maquette validée par Dani) ─────────────────────────────────────────────
   Celui qui arrive voit tout de suite les TROIS choses proposées et sait pourquoi il est là. Dans l'ordre de la lecture :
   1. le héros : la promesse (« sans les erreurs qui coûtent des milliers d'euros ») et les trois portes, chacune avec
      pour qui elle est, ses prix, ce qu'elle évite et UN bouton : être accompagné par Daniel (mis en avant à sa
      demande : sa société de travaux, ses maisons rénovées et construites, plus « ancien chef de chantier »), le
      logiciel AVYORA, les plans ;
   2. « Où en es-tu ? » : six situations, chacune son parcours conseillé avec les prix, le risque à ce stade et un bouton.
      Onglets en CSS seul (boutons radio + :has, aucun script) ; sans :has, tous les parcours s'affichent ;
   3. « Le calcul est vite fait » : le prix de chaque prestation en face de ce qu'elle évite. Aucun montant d'erreur
      inventé : « souvent des milliers d'euros », les mots de Dani ;
   4. qui t'accompagne, puis comment ça se passe (appel gratuit, proposition écrite au prix ferme, la prochaine étape) ;
   5. l'outil en cartes, le Réseau AVYORA, l'éditeur de plan, gratuit ou Pro, les prix des travaux, l'appel final.
   La bêta (lib/beta.ts) est connue ICI : pendant qu'elle court, ni « AVYORA Pro » ni prix de l'abonnement (le logiciel
   dit « gratuit pendant la bêta ») ; les prestations d'accompagnement restent payantes et affichent leur prix moyen.
   Seul le bandeau du haut passe encore par lib/accueil-beta.ts. Ni emoji ni chiffre inventé. Les pages de prestation
   n'existent qu'en français : en anglais, les lignes mènent à la page d'accompagnement (#aide). */

const PORTES_CSS = `<style>
.av-home .hero .in.h3p{max-width:none;text-align:left;padding:52px 44px 44px}
.av-home .hero .h3p .intro{max-width:800px}
.av-home .hero .h3p h1{font-size:clamp(32px,4.4vw,52px);line-height:1.06}
.av-home .hero .h3p p.sub{margin-left:0;max-width:62ch}
.av-home .hero .h3p p.mot{margin-top:14px;font-size:15.5px;color:#b7b3e0}
.av-home .hero .h3p p.mot b{color:#fff}
.av-home .hero .h3p .trust{justify-content:flex-start;margin-top:22px}
.av-home .portes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:36px}
.av-home .porte{background:#fff;color:var(--ink);border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 60px -28px rgba(0,0,0,.55);border:2px solid transparent}
.av-home .porte.vedette{border-color:var(--accent)}
.av-home .porte .tete{display:flex;align-items:center;justify-content:space-between;gap:10px}
.av-home .porte .ic{flex:none;width:44px;height:44px;border-radius:12px;background:var(--brand-weak);color:var(--brand-700);display:grid;place-items:center}
.av-home .porte .ic svg{width:22px;height:22px}
.av-home .porte .badge{font-size:12px;font-weight:600;line-height:1.3;border-radius:999px;padding:5px 10px;background:var(--brand-weak);color:var(--brand-700);text-align:right}
.av-home .porte .badge.g{background:var(--good-bg);color:#0b6e4b}
.av-home .hero .porte .eyebrow{color:var(--brand)}
.av-home .porte h2{font-size:21px;line-height:1.2;font-weight:700;color:var(--nuit);margin-top:6px}
.av-home .porte .pour{font-size:14.5px;color:var(--muted);margin-top:6px;line-height:1.5}
.av-home .porte ul{list-style:none;margin:0;padding:0}
.av-home .porte .lignes li{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.av-home .porte .lignes li:last-child{border-bottom:0}
.av-home .porte .lignes a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.av-home .porte .lignes a:hover{text-decoration-color:var(--brand)}
.av-home .porte .lignes .num{font-weight:600;white-space:nowrap}
.av-home .porte .coches{display:grid;gap:8px}
.av-home .porte .coches li{display:grid;grid-template-columns:18px 1fr;gap:10px;font-size:14.5px;line-height:1.45}
.av-home .porte .coches svg{width:16px;height:16px;margin-top:2px;color:var(--brand)}
.av-home .porte .aussi{font-size:13px;color:var(--muted);line-height:1.55}
.av-home .porte .aussi a{color:var(--brand-700);text-decoration:underline;text-underline-offset:2px}
.av-home .porte .evite{background:#fdf1e1;color:#5c3a08;border-radius:12px;padding:11px 13px;font-size:13.5px;line-height:1.45}
.av-home .porte .bas{margin-top:auto;display:grid;gap:8px}
.av-home .porte .btn{width:100%;border-radius:12px}
.av-home .btn-n{background:var(--nuit);color:#fff}
.av-home .btn-n:hover{background:var(--nuit-2)}
.av-home .porte .sous{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;font-size:13px;color:var(--muted)}
.av-home .porte .sous a{color:var(--brand-700);font-weight:600}
.av-home .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;padding:0;margin:-1px}
.av-home .titre-g{margin-bottom:22px}
.av-home .titre-g h2{font-size:clamp(25px,3.4vw,34px);font-weight:700;margin-top:10px;color:var(--nuit)}
.av-home .titre-g p{color:var(--muted);font-size:16px;margin-top:10px;max-width:62ch;line-height:1.6}
.av-home .situ{position:relative}
.av-home .situ fieldset{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.av-home .situ label{display:inline-flex;align-items:center;min-height:46px;padding:0 18px;border-radius:999px;border:1px solid var(--line-strong);background:#fff;font-size:15px;font-weight:500;cursor:pointer;transition:border-color .15s}
.av-home .situ label:hover{border-color:var(--brand-200)}
.av-home .situ input:checked+label{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
.av-home .situ input:focus-visible+label{outline:3px solid var(--accent);outline-offset:2px}
.av-home .situ .pan{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;margin-top:18px}
.av-home .situ .parc{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:24px 26px;box-shadow:var(--shadow)}
.av-home .situ .k{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.av-home .situ ol{list-style:none;margin:8px 0 0;padding:0}
.av-home .situ ol li{display:flex;gap:14px;padding:14px 0;border-top:1px solid var(--line)}
.av-home .situ ol li:first-child{border-top:0}
.av-home .situ .n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--brand-weak);color:var(--brand-700);font-weight:700;font-size:13.5px;display:grid;place-items:center}
.av-home .situ .c{flex:1;min-width:0}
.av-home .situ .l{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 14px;align-items:baseline}
.av-home .situ .l a{font-weight:600;font-size:16px;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.av-home .situ .l .p{font-weight:600;color:var(--brand-700);font-size:14.5px}
.av-home .situ .t{display:block;color:var(--muted);font-size:14.5px;margin-top:3px;line-height:1.5}
.av-home .situ .plus{margin-top:6px;padding-top:12px;border-top:1px solid var(--line);font-size:14.5px;color:var(--muted)}
.av-home .situ .plus a{color:var(--brand-700);font-weight:600}
.av-home .situ .risk{background:linear-gradient(150deg,var(--nuit),var(--nuit-2));color:#fff;border-radius:var(--r-lg);padding:24px 26px;display:flex;flex-direction:column;gap:12px}
.av-home .situ .risk .k{color:#fbbf6a}
.av-home .situ .risk .r{font-size:18px;font-weight:600;line-height:1.4}
.av-home .situ .risk .m{font-size:14.5px;color:#d7d4f2;line-height:1.5}
.av-home .situ .risk .btn{margin-top:auto;border-radius:12px}
.av-home .situ .risk .note{font-size:12.5px;color:#b7b3e0;text-align:center}
.av-home .calc{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:40px}
.av-home .calc h2{font-size:clamp(25px,3.4vw,34px);font-weight:700;line-height:1.14;margin-top:10px;color:var(--nuit);max-width:26ch}
.av-home .calc p.d{color:var(--muted);font-size:16.5px;margin-top:12px;line-height:1.6;max-width:62ch}
.av-home .calc .en{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr);gap:8px 32px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);padding-bottom:10px;border-bottom:1px solid var(--line-strong);margin-top:28px}
.av-home .calc .ln{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr);gap:6px 32px;padding:16px 0;border-bottom:1px solid var(--line);align-items:center}
.av-home .calc .px{display:flex;align-items:baseline;gap:14px}
.av-home .calc .px .num{font-size:24px;font-weight:700;color:var(--brand);min-width:110px}
.av-home .calc .px a{font-weight:600;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.av-home .calc .ev{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:15px;line-height:1.45}
.av-home .calc .mil{font-size:12px;font-weight:600;color:#8a4f06;background:#fdf1e1;padding:4px 10px;border-radius:999px;white-space:nowrap}
.av-home .qui2{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:44px;align-items:center}
.av-home .qui2 .ph{width:100%;height:auto;object-fit:cover;border-radius:var(--r-lg);box-shadow:var(--shadow-hero);display:block}
.av-home .qui2 h2{font-size:clamp(25px,3.2vw,34px);font-weight:700;line-height:1.14;margin-top:10px;color:var(--nuit)}
.av-home .qui2 h2 .num{color:var(--brand)}
.av-home .qui2 ul{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}
.av-home .qui2 li{display:grid;grid-template-columns:18px 1fr;gap:10px;font-size:15px;line-height:1.5}
.av-home .qui2 li svg{width:16px;height:16px;margin-top:4px;color:var(--good)}
.av-home .qui2 p.d{color:var(--muted);font-size:16px;margin-top:18px;line-height:1.6;max-width:62ch}
.av-home .qui2 .lien{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;font-weight:600;color:var(--brand-700);text-decoration:underline;text-underline-offset:3px}
.av-home .stepc .q{font-size:12.5px;font-weight:600;color:var(--brand-700);margin-top:14px;letter-spacing:.02em}
.av-home .stepc .q+h3{margin-top:4px}
.av-home .cta-c{text-align:center;margin-top:26px}
.av-home .fin2{background:linear-gradient(150deg,var(--nuit),var(--nuit-2));color:#fff;border-radius:var(--r-lg);padding:44px 40px;display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between;box-shadow:var(--shadow-hero)}
.av-home .fin2>div:first-child{flex:1 1 420px;min-width:0}
.av-home .fin2 h2{font-size:clamp(24px,3.2vw,34px);font-weight:700;line-height:1.14;max-width:30ch}
.av-home .fin2 p{color:#d7d4f2;margin-top:10px;font-size:15.5px;line-height:1.55}
.av-home .fin2 .cta{display:flex;flex-wrap:wrap;gap:12px}
@media(max-width:980px){.av-home .portes{grid-template-columns:1fr;max-width:560px}}
@media(max-width:820px){.av-home .hero .in.h3p{padding:40px 20px 24px}.av-home .situ .pan{grid-template-columns:1fr}.av-home .qui2{grid-template-columns:1fr;gap:24px}.av-home .qui2 .ph{max-width:260px}.av-home .qui2 ul{grid-template-columns:1fr}.av-home .fin2{padding:32px 22px}}
@media(max-width:700px){.av-home .calc{padding:26px 20px}.av-home .calc .en{display:none}.av-home .calc .ln{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.av-home .situ label{transition:none}}
</style>`;

/** Lignes « prestation — prix » d'une porte : [libellé, prix, lien]. */
type Ligne = [string, string, string];
const lignesPrix = (l: Ligne[]) =>
  `<ul class="lignes">${l.map(([t, p, h]) => `<li><a href="${h}">${t}</a><span class="num">${p}</span></li>`).join("")}</ul>`;
const coches = (l: string[]) => `<ul class="coches">${l.map((t) => `<li>${IC.ok}<span>${t}</span></li>`).join("")}</ul>`;

type Porte = { vedette?: boolean; ic: string; badge: string; vert?: boolean; eyebrow: string; id: string; titre: string; pour: string; contenu: string; evite: string; cta: string; sous: string };
const porte = (p: Porte) =>
  `<article class="porte${p.vedette ? " vedette" : ""}" aria-labelledby="${p.id}"><div class="tete"><span class="ic">${p.ic}</span><span class="badge${p.vert ? " g" : ""}">${p.badge}</span></div><div><p class="eyebrow">${p.eyebrow}</p><h2 id="${p.id}">${p.titre}</h2><p class="pour">${p.pour}</p></div>${p.contenu}<p class="evite">${p.evite}</p><div class="bas">${p.cta}<p class="sous">${p.sous}</p></div></article>`;

/** Une étape d'un parcours : [titre, prix, texte, lien]. */
type Etape = [string, string, string, string];
type Situation = { id: string; label: string; etapes: Etape[]; plus?: string; risque: string; cta: [string, string]; note?: string };
type MotsSituations = { legende: string; parcours: string; risque: string; mille: string };
/** « Où en es-tu ? » : des boutons radio et leurs parcours, montrés par :has (la situation « devis » ouverte d'abord). */
function situations(liste: Situation[], m: MotsSituations, defaut = "devis"): string {
  const montrer = liste.map((s) => `.av-home .situ:has(#situ-${s.id}:checked) .pan-${s.id}`).join(",");
  const choix = liste
    .map((s) => `<input type="radio" name="situ" id="situ-${s.id}" class="vh"${s.id === defaut ? " checked" : ""}><label for="situ-${s.id}">${s.label}</label>`)
    .join("");
  const pans = liste
    .map((s) => {
      const etapes = s.etapes
        .map(([t, p, x, h], i) => `<li><span class="n num">${i + 1}</span><span class="c"><span class="l"><a href="${h}">${t}</a><span class="num p">${p}</span></span><span class="t">${x}</span></span></li>`)
        .join("");
      return `<div class="pan pan-${s.id}"><div class="parc"><p class="k">${m.parcours}</p><ol>${etapes}</ol>${s.plus ? `<p class="plus">${s.plus}</p>` : ""}</div><div class="risk"><p class="k">${m.risque}</p><p class="r">${s.risque}</p><p class="m">${m.mille}</p><a href="${s.cta[1]}" class="btn btn-o">${s.cta[0]} →</a>${s.note ? `<p class="note">${s.note}</p>` : ""}</div></div>`;
    })
    .join("");
  return `<style>@supports selector(:has(*)){.av-home .situ .pan{display:none}${montrer}{display:grid}}</style><div class="situ"><fieldset><legend class="vh">${m.legende}</legend>${choix}</fieldset>${pans}</div>`;
}

/** Une ligne du calcul : [prix, prestation, lien, ce qu'elle évite]. */
type LigneCalcul = [string, string, string, string];
const calcul = (l: LigneCalcul[], enTete: [string, string], mille: string) =>
  `<div class="en"><span>${enTete[0]}</span><span>${enTete[1]}</span></div>${l
    .map(([p, n, h, e]) => `<div class="ln"><div class="px"><span class="num">${p}</span><a href="${h}">${n}</a></div><div class="ev"><span>${e}</span><span class="mil">${mille}</span></div></div>`)
    .join("")}`;

function accueilFr(b: Beta): string {
  const pro: [string, "g" | "p" | "o"] = b.active ? ["Gratuit pendant la bêta", "g"] : ["Avec Pro", "p"];
  const cartes = [
    carte("/estimation-travaux", IC.reno, ["Gratuit", "g"], "Estimer ta rénovation", "Une fourchette en 2 minutes, puis le détail poste par poste : 200 postes, aux prix de ta région.", "Estimer"),
    FEATURES.neuf ? carte("/estimation-construction-maison", IC.neuf, ["Gratuit", "g"], "Estimer ta maison neuve", "Du permis à la remise des clés : études, taxes, construction et branchements. Gratuit, en 4 questions.", "Estimer") : "",
    FEATURES.plans ? carte("/logiciel-plan-maison", IC.plan, ["Gratuit avec un compte", "g"], "Dessiner ton plan en 3D", "Trace tes pièces à la souris : les surfaces se calculent seules et partent dans ton estimation.", "Découvrir l'éditeur", ' data-clic-plan="accueil"') : "",
    carte("/trouver-un-artisan", IC.devis, pro, "Recevoir des devis d'artisans vérifiés", "Jusqu'à 3 artisans de ton département : SIRET, assurance décennale et chantiers vérifiés.", "Demander des devis"),
    carte(b.active ? b.inscription : "/tarifs", IC.suivi, pro, "Suivre ton chantier et ton budget", "L'avancement des travaux, tes dépenses réelles face au prévu, et ta rentabilité si tu investis.", b.active ? "Créer mon compte" : "Voir ce que Pro inclut"),
    carte("/accompagnement-travaux", IC.conseil, ["Premier appel offert", "o"], "Te faire accompagner", "Relecture de devis, avis avant achat, organisation du chantier : avec quelqu'un qui a dirigé sa société de travaux.", "Être rappelé"),
  ].filter(Boolean);
  const logiciel = b.active ? "Le logiciel AVYORA" : "AVYORA Pro";
  const detail = b.active ? "Gratuit pendant la bêta" : "Avec Pro";
  const note = "Le prix ferme t'est annoncé par écrit avant de commencer.";
  const sits: Situation[] = [
    {
      id: "achat", label: "J'hésite à acheter un bien",
      etapes: [
        ["Avis avant achat", "99 €", "Tu m'envoies l'annonce et les photos. On en parle 1 h : ce qui est grave, ce qui ne l'est pas, ce qu'il faut vérifier à la visite.", "/avis-travaux-avant-achat"],
        ["Estimation du budget", "≈ 149 €", "Ton budget travaux écrit, poste par poste, pour négocier le prix avec des arguments.", "/estimation-budget-travaux"],
      ],
      plus: `Tu achètes pour revendre ? <a href="/accompagnement-achat-revente">L'accompagnement achat-revente →</a>`,
      risque: "Acheter un bien dont les travaux mangent ta marge, ou tout ton budget.",
      cta: ["Demander mon avis avant achat", "/avis-travaux-avant-achat"], note,
    },
    {
      id: "devis", label: "J'ai reçu des devis",
      etapes: [
        ["Relecture de devis", "≈ 29 €", "Postes oubliés, prix hors marché, acomptes, assurances : je te dis ce qui cloche et quoi demander à l'artisan.", "/relecture-devis-travaux"],
        [logiciel, detail, "Ton estimation poste par poste, aux prix de ta région : tu vois tout de suite si une ligne du devis sort du marché.", "/projets/nouveau"],
      ],
      risque: "Signer un devis incomplet, et payer les oublis en avenants pendant le chantier.",
      cta: ["Faire relire mon devis", "/relecture-devis-travaux"], note,
    },
    {
      id: "budget", label: "Je prépare mon budget",
      etapes: [
        ["L'estimation AVYORA", b.active ? "Gratuit pendant la bêta" : "Gratuit, le détail avec Pro", "Une première fourchette en 2 minutes, puis le détail poste par poste.", "/projets/nouveau"],
        ["Estimation du budget avec moi", "≈ 149 € · ≈ 249 € en neuf", "On reprend ton projet ensemble : tu repars avec un budget écrit, sans oubli.", "/estimation-budget-travaux"],
      ],
      risque: "Lancer les travaux avec un budget sous-estimé, et devoir tout arrêter en cours de route.",
      cta: ["Estimer mes travaux", "/projets/nouveau"],
    },
    {
      id: "technique", label: "J'hésite sur une solution",
      etapes: [
        ["Aide au choix technique", "≈ 99 €", "Isolation, chauffage, structure, matériaux : on compare les options pour ton cas, avec un résumé écrit.", "/conseil-technique-travaux"],
        ["Estimation du budget", "≈ 149 €", "Pour chiffrer la solution retenue avant de demander les devis.", "/estimation-budget-travaux"],
      ],
      risque: "Choisir une solution inadaptée, et devoir la refaire quelques années plus tard.",
      cta: ["Demander mon conseil technique", "/conseil-technique-travaux"], note,
    },
    {
      id: "chantier", label: "Mes travaux commencent",
      etapes: [
        ["Organisation du chantier", "≈ 199 €/mois", "Un lancement (≈ 149 €) et ton carnet de tâches, puis 30 min par semaine et WhatsApp entre deux. Sans engagement.", "/suivi-de-chantier"],
        ["Suivi du budget", "≈ 200 €/mois", "Factures, acomptes et avenants vérifiés au fil du chantier. Sans engagement.", "/suivi-budget-travaux"],
      ],
      risque: "Des artisans mal enchaînés : reprises, attentes, retards, et des factures qui dérapent.",
      cta: ["Organiser mon chantier", "/suivi-de-chantier"], note,
    },
    {
      id: "plan", label: "Je veux un plan",
      etapes: [
        ...(FEATURES.plans ? [["Éditeur de plan en ligne", "Gratuit", "Dessine ton plan : les pièces se ferment toutes seules et affichent leur surface.", "/logiciel-plan-maison"] as Etape] : []),
        ["Ton plan dessiné par moi", "dès ≈ 89 €", "Plan de l'existant et plan du projet, en 2D, prêts à montrer aux artisans.", "/faire-dessiner-plan-maison"],
      ],
      risque: "Découvrir trop tard qu'une cloison, une cuisine ou un meuble ne passe pas.",
      cta: FEATURES.plans ? ["Dessiner mon plan", "/logiciel-plan-maison"] : ["Me faire dessiner mon plan", "/faire-dessiner-plan-maison"],
    },
  ];

  return `
<a href="/tarifs" class="promo"><span class="dot"></span>Estimer est <b>gratuit</b> — AVYORA Pro dès 14,99 €/mois <span class="arr">· sans engagement →</span></a>
${ACCUEIL_CSS}${PORTES_CSS}<div class="wrap"><header class="hero"><div class="in h3p"><div class="intro">
  <div class="eyebrow">Rénovation · Construction neuve · Achat-revente</div>
  <h1>Tes travaux, <span class="hl">sans les erreurs</span> qui coûtent des milliers d'euros.</h1>
  <p class="sub">J'ai dirigé ma société de travaux, rénové et construit mes propres maisons. Aujourd'hui, je t'accompagne sur ton projet, avec AVYORA pour chiffrer et des plans pour te projeter. Choisis ta porte d'entrée.</p>
  <p class="mot"><b>Quelques centaines d'euros</b> pour en éviter des milliers.</p>
  <div class="trust"><span><b>Premier appel</b> gratuit</span><span><b>à distance</b> : visio ou WhatsApp</span><span><b>sans</b> engagement</span></div>
</div><div class="portes">
  ${porte({
    vedette: true, ic: IC.conseil, badge: "Avec Daniel, ex-gérant d'une société de travaux", eyebrow: "Être accompagné", id: "porte-acc",
    titre: "Quelqu'un qui a rénové et construit, à tes côtés", pour: "Tu achètes, tu as reçu des devis ou ton chantier démarre.",
    contenu: `${lignesPrix([["Relecture de devis", "≈ 29 €", "/relecture-devis-travaux"], ["Avis avant achat", "99 €", "/avis-travaux-avant-achat"], ["Organisation du chantier", "≈ 199 €/mois", "/suivi-de-chantier"]])}<p class="aussi">Et aussi : <a href="/estimation-budget-travaux">estimation du budget</a>, <a href="/accompagnement-achat-revente">achat-revente</a>, <a href="/conseil-technique-travaux">choix techniques</a>, <a href="/suivi-budget-travaux">suivi du budget</a>.</p>`,
    evite: "<b>Ce que ça t'évite :</b> un poste oublié dans un devis, un acompte trop élevé, un artisan mal choisi.",
    cta: '<a href="/accompagnement-travaux#demande" class="btn btn-p">Demander mon appel gratuit →</a>',
    sous: '<span>20 min, gratuit, sans engagement</span><a href="/accompagnement-travaux#aide">Toutes les prestations →</a>',
  })}
  ${porte({
    ic: IC.reno, badge: b.active ? "Gratuit pendant la bêta" : "Estimation rapide gratuite", vert: true, eyebrow: "Chiffrer soi-même", id: "porte-logiciel",
    titre: `${logiciel} chiffre tes travaux poste par poste`, pour: "Tu veux un budget fiable avant d'appeler les artisans.",
    contenu: coches(["Rénovation : 200 postes, aux prix de ta région", FEATURES.neuf ? "Construction neuve : du permis à la remise des clés" : "Le rapport PDF détaillé, à montrer aux artisans", "Le suivi de ton chantier et de tes dépenses"]),
    evite: "<b>Ce que ça t'évite :</b> un budget sous-estimé qui bloque le chantier en cours de route.",
    cta: '<a href="/projets/nouveau" class="btn btn-n">Estimer mes travaux →</a>',
    sous: `<span>${b.active ? `Gratuit pendant la bêta, jusqu'au ${b.fin}` : "Estimation rapide gratuite · Pro dès 14,99 €/mois"}</span><a href="/estimation-travaux">Comment ça marche →</a>`,
  })}
  ${porte({
    ic: IC.plan, badge: FEATURES.plans ? "Éditeur gratuit" : "Plans en 2D", vert: FEATURES.plans, eyebrow: "Voir son projet", id: "porte-plans",
    titre: "Ton plan, dessiné par toi ou par moi", pour: "Tu veux voir si ça rentre avant de casser une cloison.",
    contenu: lignesPrix([...(FEATURES.plans ? [["Éditeur de plan en ligne", "Gratuit", "/logiciel-plan-maison"] as Ligne] : []), ["Plan dessiné · une pièce", "≈ 89 €", "/faire-dessiner-plan-maison"], ["Plan dessiné · jusqu'à 100 m²", "≈ 199 €", "/faire-dessiner-plan-maison"]]),
    evite: "<b>Ce que ça t'évite :</b> une cloison au mauvais endroit, une cuisine ou un meuble qui ne passe pas.",
    cta: FEATURES.plans ? '<a href="/logiciel-plan-maison" class="btn btn-n" data-clic-plan="accueil">Dessiner mon plan →</a>' : '<a href="/faire-dessiner-plan-maison" class="btn btn-n">Me faire dessiner mon plan →</a>',
    sous: FEATURES.plans ? '<span>Gratuit avec un compte</span><a href="/faire-dessiner-plan-maison">Me le faire dessiner →</a>' : "<span>Plan de l'existant + plan du projet</span>",
  })}
</div></div></header></div>

<section class="blk" aria-labelledby="ou-titre"><div class="wrap">
  <div class="titre-g"><p class="eyebrow">Pas sûr de la bonne porte ?</p><h2 id="ou-titre">Où en es-tu dans ton projet ?</h2><p>Choisis ta situation : je te montre par où commencer, ce que ça coûte et le risque à éviter.</p></div>
  ${situations(sits, { legende: "Ta situation", parcours: "Ton parcours conseillé", risque: "Le risque à ce stade", mille: "Une erreur à ce moment-là se compte vite en milliers d'euros." })}
</div></section>

<section class="blk" style="padding-top:0" aria-labelledby="calc-titre"><div class="wrap"><div class="calc">
  <p class="eyebrow">Le calcul est vite fait</p>
  <h2 id="calc-titre">Sur un chantier, une petite erreur se compte vite en milliers d'euros.</h2>
  <p class="d">Quelques centaines d'euros pour l'éviter, ce n'est rien à côté. Souvent, la première erreur évitée rembourse tout le reste.</p>
  ${calcul([
    ["≈ 29 €", "Relecture de devis", "/relecture-devis-travaux", "Un poste oublié qui revient en avenant pendant le chantier"],
    ["99 €", "Avis avant achat", "/avis-travaux-avant-achat", "Une toiture, une charpente ou une électricité à refaire, découverte après la signature"],
    ["≈ 149 €", "Estimation du budget", "/estimation-budget-travaux", "Un budget sous-estimé qui bloque le chantier à mi-parcours"],
    ["≈ 199 €", "Un mois d'organisation", "/suivi-de-chantier", "Des artisans mal enchaînés : reprises, attentes et retards"],
  ], ["Tu investis", "Ce que ça t'évite"], "souvent des milliers d'euros")}
</div></div></section>

<section class="blk" style="padding-top:0" aria-labelledby="qui-titre"><div class="wrap"><div class="qui2">
  <img class="ph" src="/accompagnement/daniel-leal-portrait-720.webp" alt="Daniel Leal, fondateur d'AVYORA" width="720" height="900" loading="lazy" decoding="async">
  <div>
    <p class="eyebrow">Qui t'accompagne</p>
    <h2 id="qui-titre">Daniel, <b class="num">8</b> ans de chantier. Et surtout celui qui fait les travaux lui-même.</h2>
    <ul>
      ${coche("3 ans à la tête de notre société de travaux, avec mon frère : du devis jusqu'aux travaux, réalisés nous-mêmes")}
      ${coche("Deux maisons girondines rénovées de nos mains, puis revendues avec une plus-value")}
      ${coche("Une maison neuve construite presque entièrement de nos mains")}
      ${coche("Avant ça : BTS en alternance dans un grand groupe du BTP, puis 3 ans chef de chantier")}
    </ul>
    <p class="d">Gérant d'entreprise, propriétaire, et celui qui tient les outils : j'ai été de chaque côté du chantier. Je sais où ça dérape, et je te le dis avant que ça arrive.</p>
    <a href="/accompagnement-travaux#qui" class="lien">Pourquoi m'appeler →</a>
  </div>
</div></div></section>

<section class="blk" style="padding-top:0" aria-labelledby="comment-titre"><div class="wrap">
  <div class="titre-g"><p class="eyebrow">Comment ça se passe</p><h2 id="comment-titre">Trois étapes, aucune surprise.</h2></div>
  <div class="steps">
    <div class="stepc"><span class="n">1</span><p class="q">Gratuit · 20 min</p><h3>Appel découverte</h3><p>Tu m'expliques ton projet. Je te dis ce dont tu as vraiment besoin, ou rien si tu n'as besoin de rien.</p></div>
    <div class="stepc"><span class="n">2</span><p class="q">Par e-mail</p><h3>Proposition écrite</h3><p>La prestation et son prix ferme, noir sur blanc. Tu décides tranquillement.</p></div>
    <div class="stepc"><span class="n">3</span><p class="q">Ta prochaine étape</p><h3>On avance</h3><p>Je te donne la prochaine tâche à faire, et je te préviens des risques de retard avant qu'ils arrivent.</p></div>
  </div>
  <div class="cta-c"><a href="/accompagnement-travaux#demande" class="btn btn-p">Demander mon appel gratuit →</a></div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">Et l'outil AVYORA</p>
    <h2>Chiffre, compare et suis tes travaux toi-même.</h2>
    <p>Commence gratuitement par l'estimation. Le reste s'ajoute quand tu en as besoin.</p>
  </div>
  <div class="svc">${cartes.join("")}</div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap"><div class="rsx">
  <div>
    <p class="eyebrow">Réseau AVYORA · nouveau</p>
    <h2>Des devis d'artisans vérifiés. Pas un annuaire.</h2>
    <p class="d">Envoie ton projet à 3 artisans de ton département au plus. C'est toi qui choisis, ton estimation leur sert de base, et tes coordonnées ne vont qu'à ceux qui acceptent.</p>
    <div class="cta"><a href="/demandes-devis/nouvelle" class="btn btn-p">Demander des devis →</a><a href="/trouver-un-artisan" class="lien">Comment ça marche</a><a href="/reseau-artisans" class="lien">Tu es artisan ? Rejoins le réseau</a></div>
    <p class="acces">${b.active ? `Gratuit pendant la bêta, jusqu'au ${b.fin}.` : "Inclus dans l'abonnement Pro."}</p>
  </div>
  <ul aria-label="Comment les artisans sont vérifiés">
    ${preuve("SIRET vérifié", "L'entreprise est active, d'après le répertoire officiel des entreprises.")}
    ${preuve("Assurance décennale obligatoire", "L'attestation est contrôlée, et sa date de fin suivie.")}
    ${preuve("Un entretien avec Daniel", "Chaque artisan est appelé par le fondateur avant d'entrer dans le réseau.")}
  </ul>
</div></div></section>
${FEATURES.plans ? PLAN_BAND : ""}

<section class="blk"><div class="wrap">
  <div class="center">
    <p class="eyebrow">${b.active ? `Bêta gratuite · jusqu'au ${b.fin}` : "Gratuit ou Pro"}</p>
    <h2>${b.active ? "Tout est gratuit pendant la bêta." : "Gratuit pour estimer. Pro pour aller jusqu'au bout."}</h2>
  </div>
  <div class="frm">
    <div class="col">
      <p class="nom">Gratuit</p>
      <p class="px">0 € <small>pour toujours</small></p>
      <ul>
        ${coche("L'estimation rapide de ta rénovation ou de ta maison neuve")}
        ${FEATURES.plans ? coche("L'éditeur de plan 2D et 3D") : ""}
        ${coche("Les prix des travaux, poste par poste et par ville")}
        ${coche("Le premier appel d'accompagnement, offert")}
      </ul>
      <div class="bas"><a href="/projets/nouveau" class="btn btn-p">Estimer gratuitement →</a></div>
    </div>
    <div class="col pro">
      <p class="nom">${b.active ? "Inclus pendant la bêta" : "Pro"}</p>
      <p class="px">${b.active ? "0 €" : "14,99 € <small>/ mois, sans engagement</small>"}</p>
      <ul>
        ${coche("L'estimation détaillée : 200 postes et le rapport PDF")}
        ${coche("Les devis d'artisans vérifiés du Réseau AVYORA")}
        ${coche("Le suivi du chantier : avancement, dépenses réelles, alertes")}
        ${coche("La rentabilité de ton investissement locatif")}
        ${coche("Tous tes projets et tes plans, sans limite")}
      </ul>
      ${b.active
        ? `<p class="note">Après la bêta, <b>rien n'est prélevé</b> : tu t'abonnes seulement si tu le veux.</p><div class="bas"><a href="${b.inscription}" class="btn btn-o">Créer mon compte gratuit</a></div>`
        : '<div class="bas"><a href="/tarifs" class="btn btn-o">Passer Pro</a><a href="/tarifs" class="btn btn-w">Voir les tarifs</a></div>'}
    </div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">Combien ça coûte ?</p><h2>Le prix des travaux, poste par poste.</h2><p>Le budget moyen de chaque chantier, détaillé et ajusté à ta région, avant même de te lancer.</p></div>
  ${chips(CHIPS_FR, "Tous les travaux →")}
</div></section>
<section class="blk" style="padding-top:0"><div class="wrap"><div class="fin2">
  <div><h2>Un doute sur ton projet ? 20 minutes pour savoir par où commencer.</h2><p>Gratuit et sans engagement. Si une prestation te sert, tu reçois son prix par écrit avant de commencer.</p></div>
  <div class="cta"><a href="/accompagnement-travaux#demande" class="btn btn-o">Demander mon appel gratuit →</a><a href="/projets/nouveau?nature=reno" class="btn btn-w">Estimer mes travaux</a></div>
</div></div></section>
`;
}

function accueilEn(b: Beta): string {
  const pro: [string, "g" | "p" | "o"] = b.active ? ["Free during the beta", "g"] : ["With Pro", "p"];
  const cartes = [
    carte("/estimation-travaux", IC.reno, ["Free", "g"], "Estimate your renovation", "A price range in 2 minutes, then the full breakdown: 200 line items, at your region's prices.", "Estimate"),
    FEATURES.neuf ? carte("/estimation-construction-maison", IC.neuf, ["Free", "g"], "Estimate a new home", "From building permit to handover: studies, taxes, construction and utility hookups. Free, in 4 questions.", "Estimate") : "",
    FEATURES.plans ? carte("/logiciel-plan-maison", IC.plan, ["Free with an account", "g"], "Draw your floor plan in 3D", "Trace your rooms with the mouse: floor areas are worked out for you and flow into your estimate.", "Discover the editor", ' data-clic-plan="accueil"') : "",
    carte(b.active ? b.inscription : "/tarifs", IC.suivi, pro, "Track your project and budget", "Progress on site, your real spending against the plan, and your return if you invest.", b.active ? "Create my account" : "See what Pro includes"),
  ].filter(Boolean);
  const logiciel = b.active ? "The AVYORA tool" : "AVYORA Pro";
  const detail = b.active ? "Free during the beta" : "With Pro";
  const acc = "/accompagnement-travaux#aide";
  const demande = "/accompagnement-travaux#demande";
  const note = "The firm price is sent to you in writing before we start.";
  const sits: Situation[] = [
    {
      id: "achat", label: "I'm thinking of buying",
      etapes: [
        ["Opinion before you buy", "€99", "Send me the listing and the photos. We talk for 1 hour: what's serious, what isn't, what to check at the viewing.", acc],
        ["Budget estimate", "≈ €149", "Your written works budget, line by line, to negotiate the price with real arguments.", acc],
      ],
      plus: `Buying to resell? <a href="/accompagnement-achat-revente">Buy, renovate, resell (page in French) →</a>`,
      risque: "Buying a property whose works eat up your margin, or your whole budget.",
      cta: ["Request my opinion before buying", demande], note,
    },
    {
      id: "devis", label: "I've received quotes",
      etapes: [
        ["Quote review", "≈ €29", "Missing items, off-market prices, deposits, insurance: I tell you what's wrong and what to ask the contractor.", acc],
        [logiciel, detail, "Your line-by-line estimate at your region's prices: you see at once if a quote line is off the market.", "/projets/nouveau"],
      ],
      risque: "Signing an incomplete quote, and paying for what's missing in change orders during the works.",
      cta: ["Get my quote reviewed", demande], note,
    },
    {
      id: "budget", label: "I'm preparing my budget",
      etapes: [
        ["The AVYORA estimate", b.active ? "Free during the beta" : "Free, details with Pro", "A first price range in 2 minutes, then the line-by-line breakdown.", "/projets/nouveau"],
        ["Budget estimate with me", "≈ €149 · ≈ €249 new build", "We go through your project together: you leave with a written budget, nothing forgotten.", acc],
      ],
      risque: "Starting the works on an underestimated budget, and having to stop halfway.",
      cta: ["Estimate my project", "/projets/nouveau"],
    },
    {
      id: "technique", label: "I'm unsure about a solution",
      etapes: [
        ["Help with technical choices", "≈ €99", "Insulation, heating, structure, materials: we compare the options for your case, with a written summary.", acc],
        ["Budget estimate", "≈ €149", "To price the chosen solution before asking for quotes.", acc],
      ],
      risque: "Choosing an unsuitable solution, and having to redo it a few years later.",
      cta: ["Request my technical advice", demande], note,
    },
    {
      id: "chantier", label: "My works are starting",
      etapes: [
        ["Organising your site", "≈ €199/month", "A kick-off (≈ €149) and your task book, then 30 min a week and WhatsApp in between. No commitment.", acc],
        ["Budget tracking", "≈ €200/month", "Invoices, deposits and change orders checked as the works go. No commitment.", acc],
      ],
      risque: "Poorly sequenced contractors: rework, waiting, delays, and invoices that drift.",
      cta: ["Organise my site", demande], note,
    },
    {
      id: "plan", label: "I want a floor plan",
      etapes: [
        ...(FEATURES.plans ? [["Online floor plan editor", "Free", "Draw your plan: rooms close on their own and show their floor area.", "/logiciel-plan-maison"] as Etape] : []),
        ["Your plan drawn by me", "from ≈ €89", "Existing layout and project plan, in 2D, ready to show contractors.", acc],
      ],
      risque: "Finding out too late that a wall, a kitchen or a piece of furniture doesn't fit.",
      cta: FEATURES.plans ? ["Draw my plan", "/logiciel-plan-maison"] : ["Have my plan drawn", demande],
    },
  ];

  return `
<a href="/tarifs" class="promo"><span class="dot"></span>Estimating is <b>free</b> — AVYORA Pro from €14.99/month <span class="arr">· no commitment →</span></a>
${ACCUEIL_CSS}${PORTES_CSS}<div class="wrap"><header class="hero"><div class="in h3p"><div class="intro">
  <div class="eyebrow">Renovation · New builds · Buy-to-resell</div>
  <h1>Your project, <span class="hl">without the mistakes</span> that cost thousands of euros.</h1>
  <p class="sub">I ran my own building company, and renovated and built my own houses. Today I help you with your project, with AVYORA to price it and floor plans to picture it. Pick your way in.</p>
  <p class="mot"><b>A few hundred euros</b> to avoid losing thousands.</p>
  <div class="trust"><span><b>First call</b> free</span><span><b>remote</b>: video or WhatsApp</span><span><b>no</b> commitment</span></div>
</div><div class="portes">
  ${porte({
    vedette: true, ic: IC.conseil, badge: "With Daniel, former head of a building company", eyebrow: "Get support", id: "porte-acc",
    titre: "Someone who has renovated and built, by your side", pour: "You're buying, you've received quotes, or your works are starting.",
    contenu: `${lignesPrix([["Quote review", "≈ €29", acc], ["Opinion before you buy", "€99", acc], ["Organising your site", "≈ €199/month", acc]])}<p class="aussi">And also: <a href="${acc}">budget estimate</a>, <a href="/accompagnement-achat-revente">buy-to-resell (in French)</a>, <a href="${acc}">technical choices</a>, <a href="${acc}">budget tracking</a>.</p>`,
    evite: "<b>What it saves you:</b> a missing item in a quote, an oversized deposit, the wrong contractor.",
    cta: '<a href="/accompagnement-travaux#demande" class="btn btn-p">Request my free call →</a>',
    sous: `<span>20 min, free, no commitment</span><a href="${acc}">All services →</a>`,
  })}
  ${porte({
    ic: IC.reno, badge: b.active ? "Free during the beta" : "Quick estimate free", vert: true, eyebrow: "Price it yourself", id: "porte-logiciel",
    titre: `${logiciel} prices your project line by line`, pour: "You want a reliable budget before calling contractors.",
    contenu: coches(["Renovation: 200 line items, at your region's prices", FEATURES.neuf ? "New builds: from building permit to handover" : "The detailed PDF report, to show contractors", "Tracking your works and your spending"]),
    evite: "<b>What it saves you:</b> an underestimated budget that stalls the works halfway.",
    cta: '<a href="/projets/nouveau" class="btn btn-n">Estimate my project →</a>',
    sous: `<span>${b.active ? `Free during the beta, through ${b.fin}` : "Quick estimate free · Pro from €14.99/month"}</span><a href="/estimation-travaux">How it works →</a>`,
  })}
  ${porte({
    ic: IC.plan, badge: FEATURES.plans ? "Free editor" : "2D plans", vert: FEATURES.plans, eyebrow: "See your project", id: "porte-plans",
    titre: "Your floor plan, drawn by you or by me", pour: "You want to check it fits before knocking down a wall.",
    contenu: lignesPrix([...(FEATURES.plans ? [["Online floor plan editor", "Free", "/logiciel-plan-maison"] as Ligne] : []), ["Plan drawn for you · one room", "≈ €89", acc], ["Plan drawn for you · up to 100 m²", "≈ €199", acc]]),
    evite: "<b>What it saves you:</b> a wall in the wrong place, a kitchen or a piece of furniture that doesn't fit.",
    cta: FEATURES.plans ? '<a href="/logiciel-plan-maison" class="btn btn-n" data-clic-plan="accueil">Draw my plan →</a>' : '<a href="/accompagnement-travaux#demande" class="btn btn-n">Have my plan drawn →</a>',
    sous: FEATURES.plans ? `<span>Free with an account</span><a href="${acc}">Have it drawn for me →</a>` : "<span>Existing layout + project plan</span>",
  })}
</div></div></header></div>

<section class="blk" aria-labelledby="ou-titre"><div class="wrap">
  <div class="titre-g"><p class="eyebrow">Not sure which way in?</p><h2 id="ou-titre">Where are you in your project?</h2><p>Pick your situation: I'll show you where to start, what it costs and the risk to avoid.</p></div>
  ${situations(sits, { legende: "Your situation", parcours: "Suggested path", risque: "The risk at this stage", mille: "A mistake at this point quickly costs thousands of euros." })}
</div></section>

<section class="blk" style="padding-top:0" aria-labelledby="calc-titre"><div class="wrap"><div class="calc">
  <p class="eyebrow">The maths is quick</p>
  <h2 id="calc-titre">On a building site, a small mistake quickly costs thousands of euros.</h2>
  <p class="d">A few hundred euros to avoid it is nothing in comparison. Often, the first mistake avoided pays for everything else.</p>
  ${calcul([
    ["≈ €29", "Quote review", acc, "A missing item that comes back as a change order during the works"],
    ["€99", "Opinion before you buy", acc, "A roof, a frame or wiring to redo, found after signing"],
    ["≈ €149", "Budget estimate", acc, "An underestimated budget that stalls the works halfway"],
    ["≈ €199", "A month of site organisation", acc, "Poorly sequenced contractors: rework, waiting and delays"],
  ], ["You invest", "What it saves you"], "often thousands of euros")}
</div></div></section>

<section class="blk" style="padding-top:0" aria-labelledby="qui-titre"><div class="wrap"><div class="qui2">
  <img class="ph" src="/accompagnement/daniel-leal-portrait-720.webp" alt="Daniel Leal, founder of AVYORA" width="720" height="900" loading="lazy" decoding="async">
  <div>
    <p class="eyebrow">Who's helping you</p>
    <h2 id="qui-titre">Daniel, <b class="num">8</b> years on site. And above all, hands-on: I do the work myself.</h2>
    <ul>
      ${coche("3 years running our building company with my brother: from the quote to the works, carried out ourselves")}
      ${coche("Two Gironde houses renovated with our own hands, then sold at a profit")}
      ${coche("A new house built almost entirely with our own hands")}
      ${coche("Before that: a work-study building degree in a major construction group, then 3 years as a site manager")}
    </ul>
    <p class="d">Business owner, homeowner, and the one holding the tools: I've been on every side of a build. I know where it goes wrong, and I tell you before it happens.</p>
    <a href="/accompagnement-travaux#qui" class="lien">Why call me →</a>
  </div>
</div></div></section>

<section class="blk" style="padding-top:0" aria-labelledby="comment-titre"><div class="wrap">
  <div class="titre-g"><p class="eyebrow">How it works</p><h2 id="comment-titre">Three steps, no surprises.</h2></div>
  <div class="steps">
    <div class="stepc"><span class="n">1</span><p class="q">Free · 20 min</p><h3>Discovery call</h3><p>You tell me about your project. I tell you what you really need, or nothing if you need nothing.</p></div>
    <div class="stepc"><span class="n">2</span><p class="q">By email</p><h3>Written proposal</h3><p>The service and its firm price, in black and white. You decide calmly.</p></div>
    <div class="stepc"><span class="n">3</span><p class="q">Your next step</p><h3>We move forward</h3><p>I give you the next task to do, and warn you about delay risks before they happen.</p></div>
  </div>
  <div class="cta-c"><a href="/accompagnement-travaux#demande" class="btn btn-p">Request my free call →</a></div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center">
    <p class="eyebrow">And the AVYORA tool</p>
    <h2>Price, plan and track your project yourself.</h2>
    <p>Start for free with the estimate. Add the rest when you need it.</p>
  </div>
  <div class="svc${cartes.length === 4 ? " n4" : ""}">${cartes.join("")}</div>
</div></section>
${FEATURES.plans ? PLAN_BAND_EN : ""}

<section class="blk"><div class="wrap">
  <div class="center">
    <p class="eyebrow">${b.active ? `Free beta · through ${b.fin}` : "Free or Pro"}</p>
    <h2>${b.active ? "Everything is free during the beta." : "Free to estimate. Pro to see it through."}</h2>
  </div>
  <div class="frm">
    <div class="col">
      <p class="nom">Free</p>
      <p class="px">€0 <small>forever</small></p>
      <ul>
        ${coche("The quick estimate for your renovation or new home")}
        ${FEATURES.plans ? coche("The 2D and 3D floor plan editor") : ""}
        ${coche("Renovation prices, line by line and by city")}
        ${coche("Your first advice call, free")}
      </ul>
      <div class="bas"><a href="/projets/nouveau" class="btn btn-p">Estimate for free →</a></div>
    </div>
    <div class="col pro">
      <p class="nom">${b.active ? "Included during the beta" : "Pro"}</p>
      <p class="px">${b.active ? "€0" : "€14.99 <small>/ month, no commitment</small>"}</p>
      <ul>
        ${coche("The detailed estimate: 200 line items and the PDF report")}
        ${coche("Project tracking: progress, real spending, alerts")}
        ${coche("The return on your rental investment")}
        ${coche("All your projects and plans, no limit")}
      </ul>
      ${b.active
        ? `<p class="note">After the beta, <b>nothing is charged</b>: you subscribe only if you want to.</p><div class="bas"><a href="${b.inscription}" class="btn btn-o">Create my free account</a></div>`
        : '<div class="bas"><a href="/tarifs" class="btn btn-o">Go Pro</a><a href="/tarifs" class="btn btn-w">See pricing</a></div>'}
    </div>
  </div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="center"><p class="eyebrow">How much does it cost?</p><h2>Renovation prices, line by line.</h2><p>The average budget for each project, itemized and adjusted to your region, before you even start.</p></div>
  ${chips(CHIPS_EN, "All projects →")}
</div></section>
<section class="blk" style="padding-top:0"><div class="wrap"><div class="fin2">
  <div><h2>Unsure about your project? 20 minutes to know where to start.</h2><p>Free, no commitment. If a service helps you, you get its price in writing before we start.</p></div>
  <div class="cta"><a href="/accompagnement-travaux#demande" class="btn btn-o">Request my free call →</a><a href="/projets/nouveau?nature=reno" class="btn btn-w">Estimate my project</a></div>
</div></div></section>
`;
}

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ compte }, { locale }, user] = await Promise.all([searchParams, getT(), FEATURES.plans ? getUser() : null]);
  const en = locale === "en";
  const beta = betaActive();
  const b: Beta = { active: beta, fin: dateInsecable(libellesBeta(en ? "en" : "fr").fin), inscription: lienInscriptionBeta(undefined, "accueil").replace(/&/g, "&amp;") };
  const gabarit = en ? accueilEn(b) : accueilFr(b);
  // Pendant la bêta, seul le bandeau du haut passe encore par lib/accueil-beta.ts : le reste est écrit selon la bêta ici.
  const html = beta ? accueilBeta(gabarit, locale) : gabarit;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAccueil()) }} />
      {compte === "supprime" && (
        <div className="card mb-8 flex items-center gap-3 border-positive/25 bg-positive-soft p-4 text-sm text-positive">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {en ? "Your account and all your data have been deleted. See you soon!" : "Ton compte et toutes tes données ont bien été supprimés. À bientôt !"}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      {/* Bêta gratuite (lib/beta.ts) : les prix et les « Pro » laissent place à la bêta (lib/accueil-beta.ts). */}
      <div className="av-home" dangerouslySetInnerHTML={{ __html: ctaPlanAccueil(html, en ? "en" : "fr", !!user) }} />
    </>
  );
}

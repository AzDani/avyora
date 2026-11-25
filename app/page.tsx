import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { META_EN, metaSelonLangue } from "@/lib/i18n/meta";
import { FEATURES } from "@/lib/features";
import { betaActive, dateInsecable, libellesBeta, lienInscriptionBeta } from "@/lib/beta";
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

/* ─── L'accueil V2 (24/11/2026, maquette validée par Dani : « go V2 ») ────────────────────────────────────────────
   « Instaurer la confiance, être clair, précis et rapide : les gens n'ont plus le temps. » Dans l'ordre de la lecture :
   1. le héros : la promesse, DEUX boutons (l'appel gratuit, l'estimation) et, à droite, le VISAGE de Daniel dans une
      carte (son nom, ex-gérant d'une société de travaux, ses preuves en chiffres). Au téléphone, la photo ronde et le nom
      passent au-dessus du titre, et le bouton tient dans le premier écran ;
   2. « Ce que je te propose » : les trois portes en version courte (une phrase, un prix, un bouton) ;
   3. « Où en es-tu ? » : six situations, chacune son parcours conseillé avec les prix, le risque et un bouton (onglets
      en CSS seul : boutons radio + :has, aucun script ; sans :has, tous les parcours s'affichent) ;
   4. « Quelques centaines d'euros pour en éviter des milliers » : 4 tuiles, prix moyen et ce que la prestation évite ;
   5. l'appel final (avec la photo) puis une ligne de liens (accompagnement, prix des travaux, logiciel, artisans) qui
      remplace les blocs en double de la version précédente (cartes de l'outil, bandeau de l'éditeur, gratuit ou Pro).
   Animations (demande de Dani) : au survol, les cartes, les tuiles, les boutons et la photo grossissent un peu ; à
   l'arrivée, le héros et les offres glissent un peu vers le haut (sans fondu : rien n'est jamais invisible, même si l'animation ne
   joue pas). Tout est coupé sous prefers-reduced-motion.
   La bêta (lib/beta.ts) est connue ICI : pendant qu'elle court, ni « AVYORA Pro » ni prix de l'abonnement ; les
   prestations d'accompagnement restent payantes et affichent leur prix moyen. Seul le bandeau du haut passe encore par
   lib/accueil-beta.ts. Ni emoji ni chiffre inventé. Les pages de prestation n'existent qu'en français : en anglais, les
   liens mènent à la page d'accompagnement (#aide). */

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

const CHIPS_FR = [
  ["renovation-salle-de-bain", "Salle de bain"], ["renovation-cuisine", "Cuisine"], ["refaire-toiture", "Toiture"], ["peinture-interieure", "Peinture"],
  ["renovation-electrique", "Électricité"], ["remplacement-fenetres", "Fenêtres"], ["isolation-combles", "Combles"], ["remplacer-baignoire-par-douche", "Baignoire → douche"],
];
const CHIPS_EN = [
  ["renovation-salle-de-bain", "Bathroom"], ["renovation-cuisine", "Kitchen"], ["refaire-toiture", "Roof"], ["peinture-interieure", "Painting"],
  ["renovation-electrique", "Electrical"], ["remplacement-fenetres", "Windows"], ["isolation-combles", "Attic insulation"], ["remplacer-baignoire-par-douche", "Bath → shower"],
];

const V2_CSS = `<style>
.av-home .hero .in{z-index:1}
.av-home .hero .in.v2{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:36px;align-items:center;text-align:left;max-width:none;padding:52px 48px 56px}
.av-home .hero .v2 .tags{display:flex;flex-wrap:wrap;gap:8px}
.av-home .hero .v2 .tags span{font-size:12.5px;font-weight:600;color:#c7ccfe;border:1px solid rgba(199,204,254,.3);border-radius:999px;padding:5px 12px}
.av-home .hero .v2 h1{font-size:clamp(30px,3.7vw,44px);line-height:1.06;margin-top:16px}
.av-home .hero .v2 p.sub{margin:16px 0 0;max-width:56ch;font-size:16px}
.av-home .hero .v2 .cta{justify-content:flex-start;margin-top:24px}
.av-home .hero .v2 .trust{justify-content:flex-start;margin-top:22px}
.av-home .fond{background:#fff;color:var(--ink);border-radius:20px;padding:22px;box-shadow:0 30px 60px -28px rgba(0,0,0,.55)}
.av-home .fond .qui{display:flex;align-items:center;gap:16px}
.av-home .fond img{flex:none;width:124px;height:124px;border-radius:18px;object-fit:cover;transition:transform .35s var(--ease)}
.av-home .fond:hover img{transform:scale(1.06)}
.av-home .fond .nom{font-weight:700;font-size:17px;color:var(--nuit)}
.av-home .fond .role{font-size:13.5px;color:var(--muted);line-height:1.35;margin-top:2px}
.av-home .fond .role .tel{display:none}
/* Carte du haut, piste A (25/11/2026) : la pastille BTS sous le nom, quatre tuiles alignées (le chiffre en gros, l'explication
   dessous), le bouton « Mon parcours » sur toute la largeur. Au téléphone : les quatre chiffres sur une ligne (libellés courts). */
.av-home .fond img{width:132px;height:132px;border-radius:20px}
.av-home .fond .nom{font-size:19px}
.av-home .fond .role{font-size:14px}
.av-home .fond .pastilles{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.av-home .fond .pastille{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;line-height:1.2;color:var(--brand-700);background:var(--brand-weak);border-radius:999px;padding:4px 10px;white-space:nowrap}
.av-home .fond .tuiles{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.av-home .fond .tuiles li{background:var(--brand-weak);border-radius:14px;padding:12px 12px 11px}
.av-home .fond .tuiles .v{display:flex;align-items:baseline;gap:5px;color:var(--brand-700)}
.av-home .fond .tuiles .v b{font-size:28px;font-weight:700;line-height:1}
.av-home .fond .tuiles .v small{font-family:var(--font-geist-mono),monospace;font-size:13px;font-weight:600}
.av-home .fond .tuiles .lg{display:block;margin-top:5px;font-size:13px;line-height:1.35;color:var(--ink)}
.av-home .fond .tuiles .ct{display:none}
.av-home .fond .lien{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-weight:600;font-size:14.5px;color:var(--brand-700)}
.av-home .fond .lien:hover{text-decoration:underline;text-underline-offset:3px}
/* « Mon parcours » mis en avant (25/11/2026, demande de Dani) : bouton violet avec le reflet animé du bouton principal. */
.av-home .fond .lien.btn-v{display:flex;width:100%;justify-content:center;margin-top:14px;padding:12px 22px;font-size:14.5px;background:var(--brand);color:#fff;box-shadow:0 10px 24px -12px rgba(79,70,229,.7)}
.av-home .fond .lien.btn-v:hover{background:var(--brand-700);text-decoration:none}
.av-home .titre-s{font-size:clamp(24px,3vw,30px);font-weight:700;color:var(--nuit)}
.av-home .sous-t{color:var(--muted);font-size:16px;margin-top:6px}
.av-home .offres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}
.av-home .offre{background:#fff;border:1px solid var(--line-strong);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow);transition:transform .25s var(--ease),box-shadow .25s var(--ease)}
.av-home .offre.vedette{border:2px solid var(--brand)}
.av-home .offre:hover,.av-home .tuile:hover{transform:translateY(-5px) scale(1.02);box-shadow:0 26px 50px -22px rgba(30,27,75,.38)}
.av-home .offre .t{display:flex;align-items:center;gap:12px}
.av-home .offre .ic{flex:none;width:40px;height:40px;border-radius:11px;background:var(--brand-weak);color:var(--brand-700);display:grid;place-items:center}
.av-home .offre .ic svg{width:21px;height:21px}
.av-home .offre h3{font-size:19px;font-weight:700;color:var(--nuit)}
.av-home .offre p{font-size:15px;color:var(--muted);line-height:1.5}
.av-home .offre p.px{font-size:14.5px}
.av-home .offre .px b{font-size:21px;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums}
.av-home .offre .px b.g{color:var(--good)}
.av-home .offre .btn{margin-top:auto;width:100%;border-radius:12px}
.av-home .offre .mini{font-size:12.5px;color:var(--faint);line-height:1.45;text-align:center}
.av-home .offre .mini a{color:var(--brand-700);font-weight:600}
.av-home .btn{transition:transform .2s var(--ease),box-shadow .2s var(--ease),background-color .2s}
.av-home .btn:hover{transform:translateY(-2px) scale(1.03)}
.av-home .btn-n{background:var(--nuit);color:#fff}
.av-home .btn-n:hover{background:var(--nuit-2)}
.av-home .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;padding:0;margin:-1px}
.av-home .situ{position:relative;margin-top:16px}
.av-home .situ fieldset{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.av-home .situ label{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--line-strong);background:#fff;font-size:15px;font-weight:500;cursor:pointer;transition:transform .15s var(--ease),border-color .15s}
.av-home .situ label:hover{transform:scale(1.04);border-color:var(--brand-200)}
.av-home .situ input:checked+label{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
.av-home .situ input:focus-visible+label{outline:3px solid var(--accent);outline-offset:2px}
.av-home .situ .pan{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,260px);gap:18px 32px;align-items:center;margin-top:14px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 24px;box-shadow:var(--shadow)}
.av-home .situ ol{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.av-home .situ li{display:flex;gap:14px;align-items:baseline}
.av-home .situ .n{flex:none;width:26px;height:26px;border-radius:50%;background:var(--brand-weak);color:var(--brand-700);font-weight:700;font-size:13px;display:inline-grid;place-items:center}
.av-home .situ li a{font-weight:600;font-size:16px;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.av-home .situ li a:hover{text-decoration-color:var(--brand)}
.av-home .situ li .p{font-weight:700;color:var(--brand-700)}
.av-home .situ li .x{display:block;color:var(--muted);font-size:14.5px;margin-top:2px;line-height:1.45}
.av-home .situ .plus{margin-top:12px;font-size:14.5px;color:var(--muted)}
.av-home .situ .plus a{color:var(--brand-700);font-weight:600}
.av-home .situ .risque{margin-top:12px;font-size:14.5px;line-height:1.45;color:#6b3c05;background:#fdf1e1;border-radius:10px;padding:9px 12px}
.av-home .situ .act{display:grid;gap:8px}
.av-home .situ .act .btn{border-radius:12px}
.av-home .situ .act .note{font-size:12.5px;color:var(--faint);text-align:center;line-height:1.45}
.av-home .tuiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}
.av-home .tuile{display:block;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow);transition:transform .25s var(--ease),box-shadow .25s var(--ease)}
.av-home .tuile .v{font-size:26px;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums}
.av-home .tuile .v small{font-size:15px;font-weight:500;color:var(--muted)}
.av-home .tuile .nm{font-weight:600;color:var(--ink);margin-top:2px}
.av-home .tuile .e{color:var(--muted);font-size:14.5px;margin-top:6px;line-height:1.45}
.av-home .note-px{font-size:13px;color:var(--faint);margin-top:10px}
.av-home .fin3{background:linear-gradient(150deg,var(--nuit),var(--nuit-2));color:#fff;border-radius:var(--r-lg);padding:32px;display:flex;flex-wrap:wrap;gap:22px;align-items:center;box-shadow:var(--shadow-hero)}
.av-home .fin3 img{width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid #fff;transition:transform .3s var(--ease)}
.av-home .fin3:hover img{transform:scale(1.08)}
.av-home .fin3 .tx{flex:1 1 380px;min-width:0}
.av-home .fin3 h2{font-size:clamp(22px,2.8vw,28px);font-weight:700;line-height:1.15}
.av-home .fin3 p{color:#c7ccfe;margin-top:6px;line-height:1.5}
.av-home .liens{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:22px;border-top:1px solid var(--line-strong);padding-top:24px;font-size:14.5px}
.av-home .liens h2{font-size:14.5px;font-weight:700;color:var(--nuit);margin-bottom:8px;letter-spacing:0}
.av-home .liens ul{list-style:none;margin:0;padding:0;display:grid;gap:7px;color:var(--muted)}
.av-home .liens a{color:var(--brand-700)}
.av-home .liens a:hover{text-decoration:underline;text-underline-offset:3px}
@keyframes avmonte{from{transform:translateY(12px)}to{transform:none}}
.av-home .monte{animation:avmonte .6s var(--ease) backwards}
.av-home .monte.d1{animation-delay:.1s}.av-home .monte.d2{animation-delay:.18s}.av-home .monte.d3{animation-delay:.26s}
@media(max-width:900px){.av-home .offres{grid-template-columns:1fr}.av-home .tuiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){.av-home .hero .in.v2{grid-template-columns:1fr;padding:26px 20px 30px;gap:0}.av-home .fond{order:-1;background:none;box-shadow:none;padding:0 0 16px;color:#fff}.av-home .fond img{width:100px;height:100px;border-radius:50%;border:2px solid #fff}.av-home .fond .nom{color:#fff}.av-home .fond .role{color:#c7ccfe}.av-home .fond .role .tel{display:inline}.av-home .fond .role .pc,.av-home .hero .v2 .tags{display:none}.av-home .fond .lien.btn-v{display:inline-flex;width:auto;margin-top:12px;padding:9px 18px;min-height:40px;font-size:13.5px;background:#fff;color:var(--brand);box-shadow:none}.av-home .fond .lien.btn-v:hover{background:#fff}.av-home .fond .pastille{background:rgba(255,255,255,.12);color:#ece9ff;font-size:11.5px;padding:3px 9px}.av-home .fond .tuiles{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:14px}.av-home .fond .tuiles li{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);padding:8px 4px;text-align:center}.av-home .fond .tuiles .v{justify-content:center;color:#fff}.av-home .fond .tuiles .v b{font-size:19px}.av-home .fond .tuiles .v small,.av-home .fond .tuiles .lg{display:none}.av-home .fond .tuiles .ct{display:block;margin-top:4px;font-size:10.5px;line-height:1.25;color:#c7ccfe}.av-home .hero .v2 h1{margin-top:6px}.av-home .hero .v2 .cta .btn{width:100%}.av-home .situ .pan{grid-template-columns:1fr;padding:18px}}
@media(max-width:480px){.av-home .tuiles{grid-template-columns:1fr}.av-home .fin3{padding:24px 20px}}
@media (prefers-reduced-motion:reduce){.av-home .monte{animation:none}.av-home .btn,.av-home .offre,.av-home .tuile,.av-home .situ label,.av-home .fond img,.av-home .fin3 img{transition:none}.av-home .btn:hover,.av-home .offre:hover,.av-home .tuile:hover,.av-home .situ label:hover,.av-home .fond:hover img,.av-home .fin3:hover img{transform:none}}
</style>`;

type Offre = { vedette?: boolean; ic: string; titre: string; texte: string; prix: string; cta: string; mini?: string; delai: string };
const offre = (o: Offre) =>
  `<article class="offre monte ${o.delai}${o.vedette ? " vedette" : ""}"><div class="t"><span class="ic">${o.ic}</span><h3>${o.titre}</h3></div><p>${o.texte}</p><p class="px">${o.prix}</p>${o.cta}${o.mini ? `<p class="mini">${o.mini}</p>` : ""}</article>`;

/** Une étape d'un parcours : [titre, prix, texte, lien]. */
type Etape = [string, string, string, string];
type Situation = { id: string; label: string; etapes: Etape[]; plus?: string; risque: string; cta: [string, string]; note?: string };
const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Un lien vers l'éditeur de plan est compté (lib/plans : origine « accueil »). */
const mesure = (h: string) => (h === "/logiciel-plan-maison" ? ' data-clic-plan="accueil"' : "");
/** « Où en es-tu ? » : des boutons radio et leurs parcours, montrés par :has (la situation « devis » ouverte d'abord). */
function situations(liste: Situation[], legende: string, risque: string, defaut = "devis"): string {
  const montrer = liste.map((s) => `.av-home .situ:has(#situ-${s.id}:checked) .pan-${s.id}`).join(",");
  const choix = liste
    .map((s) => `<input type="radio" name="situ" id="situ-${s.id}" class="vh"${s.id === defaut ? " checked" : ""}><label for="situ-${s.id}">${s.label}</label>`)
    .join("");
  const pans = liste
    .map((s) => {
      const etapes = s.etapes
        .map(([t, p, x, h], i) => `<li><span class="n num">${i + 1}</span><span><a href="${h}"${mesure(h)}>${t}</a> <span class="p">· ${p}</span><span class="x">${x}</span></span></li>`)
        .join("");
      return `<div class="pan pan-${s.id}"><div><ol>${etapes}</ol>${s.plus ? `<p class="plus">${s.plus}</p>` : ""}<p class="risque"><b>${risque}</b> ${minuscule(s.risque)}</p></div><div class="act"><a href="${s.cta[1]}" class="btn btn-p"${mesure(s.cta[1])}>${s.cta[0]} →</a>${s.note ? `<p class="note">${s.note}</p>` : ""}</div></div>`;
    })
    .join("");
  return `<style>@supports selector(:has(*)){.av-home .situ .pan{display:none}${montrer}{display:grid}}</style><div class="situ"><fieldset><legend class="vh">${legende}</legend>${choix}</fieldset>${pans}</div>`;
}

/** Une tuile : [prix, prestation, lien, ce qu'elle évite]. */
const tuile = (v: string, nm: string, href: string, e: string) =>
  `<a class="tuile" href="${href}"><span class="v" style="display:block">${v}</span><span class="nm" style="display:block">${nm}</span><span class="e" style="display:block">${e}</span></a>`;

const PHOTO = "/accompagnement/daniel-leal-carre-v2-320.webp";
/** Icône de diplôme de la pastille « Diplômé BTS Bâtiment » (carte du haut, piste A validée par Dani le 25/11/2026). */
const CHAPEAU = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5L2 9z" fill="currentColor"/><path d="M6 11.5v4.2c0 1.3 2.7 2.8 6 2.8s6-1.5 6-2.8v-4.2l-6 3-6-3z" fill="currentColor" opacity=".75"/><path d="M21 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

function accueilFr(b: Beta): string {
  const note = "Le prix ferme t'est annoncé par écrit avant de commencer.";
  const logiciel = b.active ? "Le logiciel AVYORA" : "AVYORA Pro";
  const sits: Situation[] = [
    {
      id: "achat", label: "J'hésite à acheter",
      etapes: [
        ["Avis avant achat", "99 €", "Tu m'envoies l'annonce et les photos, on en parle 1 h : ce qui est grave, ce qui ne l'est pas.", "/avis-travaux-avant-achat"],
        ["Estimation du budget", "≈ 149 €", "Ton budget travaux écrit, poste par poste, pour négocier le prix.", "/estimation-budget-travaux"],
      ],
      plus: `Tu achètes pour revendre ? <a href="/accompagnement-achat-revente">L'accompagnement achat-revente →</a>`,
      risque: "Acheter un bien dont les travaux mangent ta marge, ou tout ton budget.",
      cta: ["Demander mon avis avant achat", "/avis-travaux-avant-achat"], note,
    },
    {
      id: "devis", label: "J'ai reçu des devis",
      etapes: [
        ["Relecture de devis", "≈ 29 €", "Postes oubliés, prix hors marché, acomptes, assurances : je te dis ce qui cloche.", "/relecture-devis-travaux"],
        [logiciel, b.active ? "gratuit pendant la bêta" : "avec Pro", "Ton estimation poste par poste, aux prix de ta région.", "/projets/nouveau"],
      ],
      risque: "Signer un devis incomplet, et payer les oublis en avenants pendant le chantier.",
      cta: ["Faire relire mon devis", "/relecture-devis-travaux"], note,
    },
    {
      id: "budget", label: "Je prépare mon budget",
      etapes: [
        ["L'estimation AVYORA", b.active ? "gratuit pendant la bêta" : "gratuit, le détail avec Pro", "Une fourchette en 2 minutes, puis le détail poste par poste.", "/projets/nouveau"],
        ["Estimation du budget avec moi", "≈ 149 €", "Un budget écrit, sans oubli (≈ 249 € en construction neuve).", "/estimation-budget-travaux"],
      ],
      risque: "Lancer les travaux avec un budget sous-estimé, et devoir tout arrêter en cours de route.",
      cta: ["Estimer mes travaux", "/projets/nouveau"],
    },
    {
      id: "technique", label: "J'hésite sur une solution",
      etapes: [
        ["Aide au choix technique", "≈ 99 €", "Isolation, chauffage, structure, matériaux : on compare les options pour ton cas.", "/conseil-technique-travaux"],
        ["Estimation du budget", "≈ 149 €", "Pour chiffrer la solution retenue avant de demander les devis.", "/estimation-budget-travaux"],
      ],
      risque: "Choisir une solution inadaptée, et devoir la refaire quelques années plus tard.",
      cta: ["Demander mon conseil technique", "/conseil-technique-travaux"], note,
    },
    {
      id: "chantier", label: "Mes travaux commencent",
      etapes: [
        ["Organisation du chantier", "≈ 199 €/mois", "Un lancement (≈ 149 €) et ton carnet de tâches, puis 30 min par semaine. Sans engagement.", "/suivi-de-chantier"],
        ["Suivi du budget", "≈ 200 €/mois", "Factures, acomptes et avenants vérifiés au fil du chantier.", "/suivi-budget-travaux"],
      ],
      risque: "Des artisans mal enchaînés : reprises, attentes, retards, et des factures qui dérapent.",
      cta: ["Organiser mon chantier", "/suivi-de-chantier"], note,
    },
    {
      id: "plan", label: "Je veux un plan",
      etapes: [
        ...(FEATURES.plans ? [["Éditeur de plan en ligne", "gratuit", "Les pièces se ferment toutes seules et affichent leur surface.", "/logiciel-plan-maison"] as Etape] : []),
        ["Ton plan dessiné par moi", "dès ≈ 89 €", "L'existant et le projet, en 2D, prêts à montrer aux artisans.", "/faire-dessiner-plan-maison"],
      ],
      risque: "Découvrir trop tard qu'une cloison, une cuisine ou un meuble ne passe pas.",
      cta: FEATURES.plans ? ["Dessiner mon plan", "/logiciel-plan-maison"] : ["Me faire dessiner mon plan", "/faire-dessiner-plan-maison"],
    },
  ];

  return `
<a href="/tarifs" class="promo"><span class="dot"></span>Estimer est <b>gratuit</b> — AVYORA Pro dès 14,99 €/mois <span class="arr">· sans engagement →</span></a>
${V2_CSS}<div class="wrap"><header class="hero"><div class="in v2"><div class="intro monte">
  <div class="tags"><span>Rénovation</span><span>Construction neuve</span><span>Achat-revente</span></div>
  <h1>Tes travaux, <span class="hl">sans les erreurs</span> qui coûtent des milliers d'euros.</h1>
  <p class="sub">Je m'appelle Daniel. J'ai dirigé ma société de travaux, rénové et construit mes propres maisons. Je relis tes devis et j'organise ton chantier avec toi, à distance.</p>
  <div class="cta"><a href="/accompagnement-travaux#demande" class="btn btn-o brille">Demander mon appel gratuit →</a><a href="/projets/nouveau" class="btn btn-w">Estimer mes travaux</a></div>
  <div class="trust"><span><b>Premier appel</b> gratuit</span><span><b>Prix écrit</b> avant de commencer</span><span><b>sans</b> engagement</span></div>
</div><aside class="fond monte d1" aria-label="Qui t'accompagne">
  <div class="qui"><img src="${PHOTO}" alt="Daniel Leal, fondateur d'AVYORA" width="124" height="124" decoding="async"><div><p class="nom">Daniel Leal</p><p class="role">Ex-gérant d'une société de travaux<span class="tel"> · 8 ans de chantier</span><span class="pc">, fondateur d'AVYORA</span></p><p class="pastilles"><span class="pastille">${CHAPEAU}Diplômé BTS Bâtiment</span></p></div></div>
  <ul class="tuiles">
    <li><span class="v"><b class="num" data-compte="3">3</b><small>ans</small></span><span class="lg">à la tête de notre société de travaux</span><span class="ct">ans de société</span></li>
    <li><span class="v"><b class="num" data-compte="2">2</b><small>maisons</small></span><span class="lg">rénovées de nos mains, puis revendues</span><span class="ct">maisons rénovées</span></li>
    <li><span class="v"><b class="num" data-compte="1">1</b><small>maison neuve</small></span><span class="lg">construite presque entièrement par nous</span><span class="ct">maison neuve</span></li>
    <li><span class="v"><b class="num" data-compte="8">8</b><small>ans</small></span><span class="lg">de chantier au total</span><span class="ct">ans de chantier</span></li>
  </ul>
  <a href="/accompagnement-travaux#qui" class="lien btn btn-v brille">Mon parcours →</a>
</aside></div></header></div>

<section class="blk" style="padding:44px 0 0" aria-labelledby="offres-titre"><div class="wrap">
  <h2 id="offres-titre" class="titre-s">Ce que je te propose</h2>
  <div class="offres">
    ${offre({
      vedette: true, ic: IC.conseil, titre: "Être accompagné", delai: "d1",
      texte: "Relecture de devis, avis avant achat, organisation du chantier. Avec moi, au téléphone ou en visio.",
      prix: "<b>≈ 29 €</b> la relecture · premier appel gratuit",
      cta: '<a href="/accompagnement-travaux#aide" class="btn btn-p">Voir les prestations →</a>',
    })}
    ${offre({
      ic: IC.reno, titre: "Chiffrer mes travaux", delai: "d2",
      texte: `Le logiciel AVYORA : ton budget poste par poste, aux prix de ta région.${FEATURES.neuf ? " Rénovation ou construction neuve." : ""}`,
      prix: b.active ? '<b class="g">Gratuit</b> pendant la bêta' : '<b class="g">Gratuit</b> · le détail avec AVYORA Pro',
      cta: '<a href="/projets/nouveau" class="btn btn-n">Estimer mes travaux →</a>',
      mini: b.active ? "Après la bêta, <b>rien n'est prélevé</b> : tu t'abonnes seulement si tu le veux." : undefined,
    })}
    ${offre({
      ic: IC.plan, titre: "Faire mon plan", delai: "d3",
      texte: FEATURES.plans ? "Dessine-le toi-même dans l'éditeur, ou je te le dessine en 2D : l'existant et le projet." : "Je te dessine ton plan en 2D : l'existant et le projet, prêts pour les artisans.",
      prix: FEATURES.plans ? '<b class="g">Gratuit</b> · ou ≈ 89 € dessiné par moi' : "<b>≈ 89 €</b> une pièce · ≈ 199 € jusqu'à 100 m²",
      cta: FEATURES.plans ? '<a href="/logiciel-plan-maison" class="btn btn-n" data-clic-plan="accueil">Dessiner mon plan →</a>' : '<a href="/faire-dessiner-plan-maison" class="btn btn-n">Me faire dessiner mon plan →</a>',
      mini: FEATURES.plans ? '<a href="/faire-dessiner-plan-maison">Me le faire dessiner →</a>' : undefined,
    })}
  </div>
</div></section>

<section class="blk" style="padding:56px 0 0" aria-labelledby="ou-titre"><div class="wrap">
  <h2 id="ou-titre" class="titre-s">Où en es-tu ? Je te dis par où commencer.</h2>
  ${situations(sits, "Ta situation", "Le risque à ce stade :")}
</div></section>

<section class="blk" style="padding:56px 0 0" aria-labelledby="calc-titre"><div class="wrap">
  <h2 id="calc-titre" class="titre-s">Quelques centaines d'euros pour en éviter des milliers.</h2>
  <p class="sous-t">Sur un chantier, une petite erreur se compte vite en milliers d'euros.</p>
  <div class="tuiles">
    ${tuile('≈ <span data-compte="29">29</span> €', "Relecture de devis", "/relecture-devis-travaux", "t'évite un poste oublié qui revient en avenant.")}
    ${tuile('<span data-compte="99">99</span> €', "Avis avant achat", "/avis-travaux-avant-achat", "t'évite une toiture ou une électricité à refaire, découverte trop tard.")}
    ${tuile('≈ <span data-compte="149">149</span> €', "Estimation du budget", "/estimation-budget-travaux", "t'évite un chantier bloqué à mi-parcours, faute de budget.")}
    ${tuile('≈ <span data-compte="199">199</span> €<small>/mois</small>', "Organisation du chantier", "/suivi-de-chantier", "t'évite les reprises, les attentes et les retards.")}
  </div>
  <p class="note-px">Prix moyens : ils varient selon la taille de ton projet. Le prix ferme t'est annoncé par écrit avant de commencer.</p>
</div></section>

<section class="blk" style="padding:56px 0 0"><div class="wrap"><div class="fin3">
  <img src="${PHOTO}" alt="" width="76" height="76" loading="lazy" decoding="async">
  <div class="tx"><h2>Un doute sur ton projet ? Parlons-en 20 minutes.</h2><p>Gratuit, sans engagement. Je te dis ce dont tu as besoin, ou rien si tu n'as besoin de rien.</p></div>
  <a href="/accompagnement-travaux#demande" class="btn btn-o brille">Demander mon appel gratuit →</a>
</div></div></section>

<section class="blk" style="padding:44px 0 8px" aria-label="Aller plus loin"><div class="wrap"><div class="liens">
  <div><h2>Accompagnement</h2><ul><li><a href="/relecture-devis-travaux">Relecture de devis</a></li><li><a href="/avis-travaux-avant-achat">Avis avant achat</a></li><li><a href="/estimation-budget-travaux">Estimation du budget</a></li><li><a href="/suivi-de-chantier">Organisation du chantier</a></li><li><a href="/accompagnement-achat-revente">Achat-revente</a></li><li><a href="/faire-dessiner-plan-maison">Plans 2D dessinés pour toi</a></li></ul></div>
  <div><h2>Prix des travaux</h2><ul>${CHIPS_FR.slice(0, 6).map(([s, l]) => `<li><a href="/prix-travaux/${s}">${l}</a></li>`).join("")}<li><a href="/prix-travaux">Tous les travaux →</a></li></ul></div>
  <div><h2>Le logiciel</h2><ul><li><a href="/estimation-travaux">Estimer une rénovation</a></li>${FEATURES.neuf ? '<li><a href="/estimation-construction-maison">Estimer une maison neuve</a> · gratuit, en 4 questions</li>' : ""}${FEATURES.plans ? '<li><a href="/logiciel-plan-maison" data-clic-plan="accueil">Éditeur de plan 2D et 3D</a></li>' : ""}<li><a href="${b.active ? b.inscription : "/tarifs"}">${b.active ? "Créer mon compte gratuit" : "Les tarifs"}</a></li></ul></div>
  <div><h2>Artisans</h2><ul><li><a href="/demandes-devis/nouvelle">Recevoir des devis d'artisans vérifiés</a></li><li><a href="/trouver-un-artisan">Comment ça marche</a></li><li><a href="/reseau-artisans">Tu es artisan ? Rejoins le réseau</a></li></ul></div>
</div></div></section>
`;
}

function accueilEn(b: Beta): string {
  const acc = "/accompagnement-travaux#aide";
  const demande = "/accompagnement-travaux#demande";
  const note = "The firm price is sent to you in writing before we start.";
  const logiciel = b.active ? "The AVYORA tool" : "AVYORA Pro";
  const sits: Situation[] = [
    {
      id: "achat", label: "I'm thinking of buying",
      etapes: [
        ["Opinion before you buy", "€99", "Send me the listing and the photos, we talk for 1 hour: what's serious, what isn't.", acc],
        ["Budget estimate", "≈ €149", "Your written works budget, line by line, to negotiate the price.", acc],
      ],
      plus: `Buying to resell? <a href="/accompagnement-achat-revente">Buy, renovate, resell (page in French) →</a>`,
      risque: "Buying a property whose works eat up your margin, or your whole budget.",
      cta: ["Request my opinion before buying", demande], note,
    },
    {
      id: "devis", label: "I've received quotes",
      etapes: [
        ["Quote review", "≈ €29", "Missing items, off-market prices, deposits, insurance: I tell you what's wrong.", acc],
        [logiciel, b.active ? "free during the beta" : "with Pro", "Your line-by-line estimate, at your region's prices.", "/projets/nouveau"],
      ],
      risque: "Signing an incomplete quote, and paying for what's missing in change orders during the works.",
      cta: ["Get my quote reviewed", demande], note,
    },
    {
      id: "budget", label: "I'm preparing my budget",
      etapes: [
        ["The AVYORA estimate", b.active ? "free during the beta" : "free, details with Pro", "A price range in 2 minutes, then the line-by-line breakdown.", "/projets/nouveau"],
        ["Budget estimate with me", "≈ €149", "A written budget, nothing forgotten (≈ €249 for a new build).", acc],
      ],
      risque: "Starting the works on an underestimated budget, and having to stop halfway.",
      cta: ["Estimate my project", "/projets/nouveau"],
    },
    {
      id: "technique", label: "I'm unsure about a solution",
      etapes: [
        ["Help with technical choices", "≈ €99", "Insulation, heating, structure, materials: we compare the options for your case.", acc],
        ["Budget estimate", "≈ €149", "To price the chosen solution before asking for quotes.", acc],
      ],
      risque: "Choosing an unsuitable solution, and having to redo it a few years later.",
      cta: ["Request my technical advice", demande], note,
    },
    {
      id: "chantier", label: "My works are starting",
      etapes: [
        ["Organising your site", "≈ €199/month", "A kick-off (≈ €149) and your task book, then 30 min a week. No commitment.", acc],
        ["Budget tracking", "≈ €200/month", "Invoices, deposits and change orders checked as the works go.", acc],
      ],
      risque: "Poorly sequenced contractors: rework, waiting, delays, and invoices that drift.",
      cta: ["Organise my site", demande], note,
    },
    {
      id: "plan", label: "I want a floor plan",
      etapes: [
        ...(FEATURES.plans ? [["Online floor plan editor", "free", "Rooms close on their own and show their floor area.", "/logiciel-plan-maison"] as Etape] : []),
        ["Your plan drawn by me", "from ≈ €89", "Existing layout and project, in 2D, ready to show contractors.", acc],
      ],
      risque: "Finding out too late that a wall, a kitchen or a piece of furniture doesn't fit.",
      cta: FEATURES.plans ? ["Draw my plan", "/logiciel-plan-maison"] : ["Have my plan drawn", demande],
    },
  ];

  return `
<a href="/tarifs" class="promo"><span class="dot"></span>Estimating is <b>free</b> — AVYORA Pro from €14.99/month <span class="arr">· no commitment →</span></a>
${V2_CSS}<div class="wrap"><header class="hero"><div class="in v2"><div class="intro monte">
  <div class="tags"><span>Renovation</span><span>New builds</span><span>Buy-to-resell</span></div>
  <h1>Your project, <span class="hl">without the mistakes</span> that cost thousands of euros.</h1>
  <p class="sub">My name is Daniel. I ran my own building company, and renovated and built my own houses. I review your quotes and organise your build with you, remotely.</p>
  <div class="cta"><a href="/accompagnement-travaux#demande" class="btn btn-o brille">Request my free call →</a><a href="/projets/nouveau" class="btn btn-w">Estimate my project</a></div>
  <div class="trust"><span><b>First call</b> free</span><span><b>Written price</b> before we start</span><span><b>no</b> commitment</span></div>
</div><aside class="fond monte d1" aria-label="Who's helping you">
  <div class="qui"><img src="${PHOTO}" alt="Daniel Leal, founder of AVYORA" width="124" height="124" decoding="async"><div><p class="nom">Daniel Leal</p><p class="role">Former head of a building company<span class="tel"> · 8 years on site</span><span class="pc">, founder of AVYORA</span></p><p class="pastilles"><span class="pastille">${CHAPEAU}Building degree (BTS Bâtiment)</span></p></div></div>
  <ul class="tuiles">
    <li><span class="v"><b class="num" data-compte="3">3</b><small>yrs</small></span><span class="lg">running our building company</span><span class="ct">yrs company</span></li>
    <li><span class="v"><b class="num" data-compte="2">2</b><small>houses</small></span><span class="lg">renovated with our own hands, then sold</span><span class="ct">houses renovated</span></li>
    <li><span class="v"><b class="num" data-compte="1">1</b><small>new house</small></span><span class="lg">built almost entirely by us</span><span class="ct">new house</span></li>
    <li><span class="v"><b class="num" data-compte="8">8</b><small>yrs</small></span><span class="lg">on site in total</span><span class="ct">yrs on site</span></li>
  </ul>
  <a href="/accompagnement-travaux#qui" class="lien btn btn-v brille">My background →</a>
</aside></div></header></div>

<section class="blk" style="padding:44px 0 0" aria-labelledby="offres-titre"><div class="wrap">
  <h2 id="offres-titre" class="titre-s">What I offer</h2>
  <div class="offres">
    ${offre({
      vedette: true, ic: IC.conseil, titre: "Get support", delai: "d1",
      texte: "Quote reviews, opinions before buying, site organisation. With me, by phone or video call.",
      prix: "<b>≈ €29</b> a quote review · first call free",
      cta: `<a href="${acc}" class="btn btn-p">See the services →</a>`,
    })}
    ${offre({
      ic: IC.reno, titre: "Price my project", delai: "d2",
      texte: `The AVYORA tool: your budget line by line, at your region's prices.${FEATURES.neuf ? " Renovation or new build." : ""}`,
      prix: b.active ? '<b class="g">Free</b> during the beta' : '<b class="g">Free</b> · details with AVYORA Pro',
      cta: '<a href="/projets/nouveau" class="btn btn-n">Estimate my project →</a>',
      mini: b.active ? "After the beta, <b>nothing is charged</b>: you subscribe only if you want to." : undefined,
    })}
    ${offre({
      ic: IC.plan, titre: "Get my floor plan", delai: "d3",
      texte: FEATURES.plans ? "Draw it yourself in the editor, or I draw it for you in 2D: existing layout and project." : "I draw your plan in 2D: existing layout and project, ready for contractors.",
      prix: FEATURES.plans ? '<b class="g">Free</b> · or ≈ €89 drawn by me' : "<b>≈ €89</b> one room · ≈ €199 up to 100 m²",
      cta: FEATURES.plans ? '<a href="/logiciel-plan-maison" class="btn btn-n" data-clic-plan="accueil">Draw my plan →</a>' : `<a href="${demande}" class="btn btn-n">Have my plan drawn →</a>`,
      mini: FEATURES.plans ? `<a href="${acc}">Have it drawn for me →</a>` : undefined,
    })}
  </div>
</div></section>

<section class="blk" style="padding:56px 0 0" aria-labelledby="ou-titre"><div class="wrap">
  <h2 id="ou-titre" class="titre-s">Where are you? I'll tell you where to start.</h2>
  ${situations(sits, "Your situation", "The risk at this stage:")}
</div></section>

<section class="blk" style="padding:56px 0 0" aria-labelledby="calc-titre"><div class="wrap">
  <h2 id="calc-titre" class="titre-s">A few hundred euros to avoid losing thousands.</h2>
  <p class="sous-t">On a building site, a small mistake quickly costs thousands of euros.</p>
  <div class="tuiles">
    ${tuile('≈ €<span data-compte="29">29</span>', "Quote review", acc, "saves you a missing item that comes back as a change order.")}
    ${tuile('€<span data-compte="99">99</span>', "Opinion before you buy", acc, "saves you a roof or wiring to redo, found too late.")}
    ${tuile('≈ €<span data-compte="149">149</span>', "Budget estimate", acc, "saves you works stalled halfway for lack of budget.")}
    ${tuile('≈ €<span data-compte="199">199</span><small>/month</small>', "Site organisation", acc, "saves you rework, waiting and delays.")}
  </div>
  <p class="note-px">Average prices: they vary with the size of your project. The firm price is sent to you in writing before we start.</p>
</div></section>

<section class="blk" style="padding:56px 0 0"><div class="wrap"><div class="fin3">
  <img src="${PHOTO}" alt="" width="76" height="76" loading="lazy" decoding="async">
  <div class="tx"><h2>Unsure about your project? Let's talk for 20 minutes.</h2><p>Free, no commitment. I'll tell you what you need, or nothing if you need nothing.</p></div>
  <a href="/accompagnement-travaux#demande" class="btn btn-o brille">Request my free call →</a>
</div></div></section>

<section class="blk" style="padding:44px 0 8px" aria-label="Go further"><div class="wrap"><div class="liens">
  <div><h2>Renovation advice</h2><ul><li><a href="${acc}">Quote review</a></li><li><a href="${acc}">Opinion before you buy</a></li><li><a href="${acc}">Budget estimate</a></li><li><a href="${acc}">Site organisation</a></li><li><a href="/accompagnement-achat-revente">Buy, renovate, resell (in French)</a></li></ul></div>
  <div><h2>Renovation prices</h2><ul>${CHIPS_EN.slice(0, 6).map(([s, l]) => `<li><a href="/prix-travaux/${s}">${l}</a></li>`).join("")}<li><a href="/prix-travaux">All projects →</a></li></ul></div>
  <div><h2>The tool</h2><ul><li><a href="/estimation-travaux">Estimate a renovation</a></li>${FEATURES.neuf ? '<li><a href="/estimation-construction-maison">Estimate a new home</a> · free, in 4 questions</li>' : ""}${FEATURES.plans ? '<li><a href="/logiciel-plan-maison" data-clic-plan="accueil">2D and 3D floor plan editor</a></li>' : ""}<li><a href="${b.active ? b.inscription : "/tarifs"}">${b.active ? "Create my free account" : "Pricing"}</a></li></ul></div>
</div></div></section>
`;
}

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ compte }, { locale }] = await Promise.all([searchParams, getT()]);
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
      <div className="av-home" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

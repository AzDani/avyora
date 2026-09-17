import type { NextConfig } from "next";
import { VILLES_RETIREES, MATRIX_VILLES_RETIREES } from "./lib/villes";

const isDev = process.env.NODE_ENV !== "production";

// Hôte Supabase (pour autoriser les appels du client navigateur : REST + realtime websocket).
let supabaseHost = "";
try {
  supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
} catch {}
const supabaseHttp = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWs = supabaseHost ? `wss://${supabaseHost}` : "";

/**
 * Content-Security-Policy. En prod : strict (self + Supabase). En dev : on relâche pour le HMR
 * (websocket + eval de Turbopack). NB : script/style gardent 'unsafe-inline' car Next hydrate via
 * des scripts inline ; le durcissement par nonce est prévu (Phase 3). D'ici là, frame-ancestors,
 * object-src, base-uri et un connect-src restreint fournissent déjà une défense significative.
 */
// Google Ads (gtag.js) : le tag est chargé dans app/layout.tsx. Sans ces origines, la CSP bloque le
// script ET les pings de conversion — window.gtag reste indéfini et AUCUNE conversion ne remonte.
// Origines documentées par Google pour le Google tag + conversions Ads.
const gtagScript = "https://www.googletagmanager.com https://www.googleadservices.com";
// Origines de collecte des conversions. Trois pièges rencontrés, chacun constaté en navigateur :
//  1. *.doubleclick.net et NON *.g.doubleclick.net — la collecte passe aussi par ad.doubleclick.net.
//  2. www.googleadservices.com — point de collecte principal (/pagead/conversion et /ccm/conversion).
//     Il n'est couvert par AUCUN joker *.google.com : c'est un domaine distinct.
//  3. www.google.fr — la conversion « first party » (/pagead/1p-conversion) part sur le domaine
//     Google du PAYS du visiteur, pas sur google.com. Le trafic d'AVYORA étant français, google.fr
//     est la variante qui compte ; un visiteur depuis un autre pays verra son ccTLD bloqué, ce qui
//     dégrade la mesure sans casser le site.
// Vérifier après toute modification : ouvrir une page en navigation privée et confirmer ZÉRO
// violation CSP en console. Un blocage ici ne casse rien de visible — il fait juste disparaître
// des conversions, ce qui est exactement le genre de panne qu'on ne remarque pas.
const gtagBeacons =
  "https://www.googletagmanager.com https://*.google.com https://www.google.fr https://www.googleadservices.com https://*.doubleclick.net https://*.google-analytics.com";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com ${gtagScript}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${gtagBeacons}`,
  `font-src 'self'`,
  `connect-src 'self' https://va.vercel-scripts.com ${gtagBeacons} ${supabaseHttp} ${supabaseWs}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `worker-src 'self' blob:`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // HSTS : n'a d'effet qu'en HTTPS (Vercel) ; ignoré sur http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromium charge son binaire Chromium (bin/*.br) via un chemin dynamique : le tracer
  // de Next ne le détecte pas et l'exclut de la fonction serverless (→ « bin does not exist » sur Vercel).
  // On force son inclusion pour la route de génération PDF. (`*` couvre le segment dynamique [id].)
  outputFileTracingIncludes: {
    "/projets/*/rapport/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // L'URL technique Vercel (*.vercel.app) sert le même contenu que getavyora.fr → on la redirige
  // en 308 vers le domaine canonique. On cible l'hôte exact pour NE PAS casser les préversions de
  // branches (avyora-…-git-….vercel.app), qui gardent leur propre URL.
  async redirects() {
    return [
      // L'estimateur a quitté /projets/nouveau/rapide (une URL qui décrivait une action interne de
      // l'application) pour /estimation-travaux (qui décrit son sujet). Fait à J+11 du domaine,
      // c'est-à-dire au moment le moins coûteux : l'ancienne URL était au sitemap, elle ne doit
      // donc jamais tomber en 404. Sortie du préfixe /projets, elle n'a plus besoin de l'exception
      // « Allow » de robots.txt.
      { source: "/projets/nouveau/rapide", destination: "/estimation-travaux", permanent: true },
      {
        source: "/:path*",
        has: [{ type: "host", value: "avyora-chi.vercel.app" }],
        destination: "https://getavyora.fr/:path*",
        permanent: true,
      },
      // Resserrement SEO : les villes dont le coût de main-d'œuvre est pile au niveau national
      // n'ont plus de page (elle aurait répété mot pour mot le hub — doorway page). Leurs URL
      // étaient indexées : on les redirige en 308 au lieu de les laisser tomber en 404.
      // Une route `force-static` ne peut pas rediriger au runtime : c'est forcément ici.
      ...VILLES_RETIREES.map((v) => ({
        source: `/prix-renovation/${v.slug}`,
        destination: "/prix-renovation",
        permanent: true,
      })),
      // Idem pour les villes qui sortent de la matrice « prix [travaux] à [ville] » : on renvoie
      // vers la page nationale du travail, qui contient déjà toute l'information.
      ...MATRIX_VILLES_RETIREES.map((v) => ({
        source: `/prix-travaux/:projet/${v.slug}`,
        destination: "/prix-travaux/:projet",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

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
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self'`,
  `connect-src 'self' ${supabaseHttp} ${supabaseWs}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
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
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

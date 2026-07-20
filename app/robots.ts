import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * robots.txt : on laisse indexer les pages publiques (accueil, funnel, auth), et on bloque
 * l'espace privé + l'API (pas de contenu indexable, données personnelles).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Routes privées gérées par le gating (redirigent vers /connexion pour un crawler) ; on
      // bloque explicitement l'espace perso, l'admin, l'API et les callbacks d'auth.
      disallow: ["/mon-espace", "/artisans", "/admin", "/api/", "/auth/", "/reset/definir"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

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
      // Routes privées gérées par le gating (redirigent vers /connexion pour un crawler) ; on
      // bloque explicitement l'espace perso, l'admin, l'API et les callbacks d'auth.
      //
      // ⚠️ /reset/definir a été RETIRÉ de cette liste : la page porte déjà `noindex`, et un Disallow
      // par-dessus empêche justement Googlebot de lire ce noindex — les deux protections s'annulent.
      // Une page bloquée au crawl mais liée ailleurs peut rester listée sans snippet ; le noindex
      // seul, lui, la fait disparaître de l'index. Ne pas remettre.
      //
      // /projets/ ferme la liste des projets et leur détail (307 vers /connexion, donc du budget
      // d'exploration dépensé pour rien), SANS fermer le funnel public qui vit sous le même préfixe.
      // L'Allow plus spécifique l'emporte chez Googlebot ; /projets/nouveau et /projets/nouveau/rapide
      // sont deux pages du sitemap, les bloquer couperait l'entonnoir.
      allow: ["/", "/projets/nouveau"],
      // « /projets$ » ferme la route EXACTE sans toucher au sous-arbre : le lien « Projets » de
      // l'en-tête reste utile aux humains connectés, mais Googlebot cesse de dépenser une requête
      // par page explorée pour une 307 vers une page noindex (507 pages le portaient).
      disallow: ["/mon-espace", "/artisans", "/admin", "/api/", "/auth/", "/projets$", "/projets/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

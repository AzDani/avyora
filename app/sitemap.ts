import type { MetadataRoute } from "next";
import { VILLES } from "@/lib/villes";
import { GUIDES } from "@/lib/guides";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Sitemap : uniquement les pages publiques (les pages privées sont derrière l'authentification). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const villes: MetadataRoute.Sitemap = VILLES.map((v) => ({
    url: `${siteUrl}/prix-renovation/${v.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const guides: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${siteUrl}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/projets/nouveau`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...guides,
    { url: `${siteUrl}/prix-renovation`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...villes,
    { url: `${siteUrl}/tarifs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/inscription`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/connexion`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}

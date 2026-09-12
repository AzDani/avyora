import type { MetadataRoute } from "next";
import { VILLES } from "@/lib/villes";
import { GUIDES } from "@/lib/guides";
import { PROJETS, projetsMatrix } from "@/lib/seo-projets";

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
  const travaux: MetadataRoute.Sitemap = PROJETS.map((p) => ({
    url: `${siteUrl}/prix-travaux/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  // Matrice « prix [travaux] à [ville] » : projets déclinés × 40 plus grandes villes.
  const matrixVilles = VILLES.slice(0, 40);
  const travauxVilles: MetadataRoute.Sitemap = projetsMatrix().flatMap((p) =>
    matrixVilles.map((v) => ({
      url: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/projets/nouveau`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...guides,
    { url: `${siteUrl}/prix-travaux`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...travaux,
    ...travauxVilles,
    { url: `${siteUrl}/prix-renovation`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...villes,
    { url: `${siteUrl}/tarifs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/inscription`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/connexion`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}

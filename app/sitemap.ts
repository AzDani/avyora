import type { MetadataRoute } from "next";
import { VILLES_SEO } from "@/lib/villes";
import { PRIX_MAJ } from "@/lib/prix-maj";
import { POSTES_PAGES } from "@/lib/seo-postes";
import { GUIDES } from "@/lib/guides";
import { PROJETS, projetsMatrix, MATRIX_VILLES } from "@/lib/seo-projets";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Sitemap : uniquement les pages publiques (les pages privées sont derrière l'authentification). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const villes: MetadataRoute.Sitemap = VILLES_SEO.map((v) => ({
    url: `${siteUrl}/prix-renovation/${v.slug}`,
    lastModified: PRIX_MAJ,
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
    lastModified: PRIX_MAJ,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  /**
   * Matrice « prix [travaux] à [ville] » : 400 pages, restreintes ici aux 8 plus grandes villes.
   *
   * POURQUOI. Search Console (16/09/2026) : sur 511 URL déclarées, 63 indexées et 474 en
   * « Détectée, actuellement non indexée » — soit EXACTEMENT les 400 pages de matrice + les
   * 74 pages villes. Google a vu ces URL dans le sitemap et n'en a exploré aucune en trois mois.
   * Sur un domaine jeune, le budget d'exploration est minuscule : déclarer 400 pages que Google
   * ignore noie les ~110 pages qui méritent vraiment d'être explorées et recrawlées.
   * Les pages restent générées, indexables et liées en interne — seule leur déclaration au
   * sitemap est restreinte. À rouvrir (MATRIX_SITEMAP_CITIES = MATRIX_CITY_COUNT) quand le taux
   * d'indexation des pages déclarées dépassera durablement ~80 %.
   */
  const MATRIX_SITEMAP_CITIES = 8;
  const travauxVilles: MetadataRoute.Sitemap = projetsMatrix().flatMap((p) =>
    MATRIX_VILLES.slice(0, MATRIX_SITEMAP_CITIES).map((v) => ({
      url: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}`,
      lastModified: PRIX_MAJ,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  );
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/projets/nouveau`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/methodologie`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...guides,
    { url: `${siteUrl}/prix-poste`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.8 },
    ...POSTES_PAGES.map((x) => ({
      url: `${siteUrl}/prix-poste/${x.slug}`,
      lastModified: PRIX_MAJ,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${siteUrl}/prix-travaux`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...travaux,
    ...travauxVilles,
    { url: `${siteUrl}/prix-renovation`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...villes,
    { url: `${siteUrl}/tarifs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Pages légales : signal de confiance attendu par Google sur un site qui encaisse un abonnement
    // (E-E-A-T). Elles sont indexables et canoniques depuis le lot 1 — elles ont leur place ici.
    ...["mentions-legales", "cgu", "cgv", "confidentialite", "cookies"].map((slug) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    { url: `${siteUrl}/projets/nouveau/rapide`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];
}

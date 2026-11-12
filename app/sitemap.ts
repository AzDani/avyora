import type { MetadataRoute } from "next";
import { VILLES_SEO } from "@/lib/villes";
import { PRIX_MAJ, SITE_MAJ, LEGAL_MAJ } from "@/lib/prix-maj";
import { POSTES_PAGES } from "@/lib/seo-postes";
import { GUIDES } from "@/lib/guides";
import { PROJETS, projetsMatrix, MATRIX_VILLES, matriceIndexable } from "@/lib/seo-projets";
import { FEATURES } from "@/lib/features";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Sitemap : uniquement les pages publiques (les pages privées sont derrière l'authentification).
 *
 * `lastModified` : JAMAIS `new Date()` (règle de lib/prix-maj.ts). Chaque entrée porte la date de
 * sa dernière modification réelle — PRIX_MAJ pour tout ce qui affiche des prix (guides et hubs
 * compris), LEGAL_MAJ pour la version en vigueur de chaque page légale, SITE_MAJ (mise à jour à la
 * main) pour l'accueil, les estimateurs et /tarifs. Avec la date du build, ~20 URL annonçaient une
 * modification à chaque déploiement, et Google finit par ignorer un lastmod ainsi dilué.
 *
 * /projets/nouveau n'y figure plus : écran de choix sans contenu propre, en `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const villes: MetadataRoute.Sitemap = VILLES_SEO.map((v) => ({
    url: `${siteUrl}/prix-renovation/${v.slug}`,
    lastModified: PRIX_MAJ,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const guides: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${siteUrl}/guides/${g.slug}`,
    lastModified: PRIX_MAJ,
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
   * Matrice « prix [travaux] à [ville] » : seules les villes indexables y figurent.
   *
   * Le MOTIF et le CRITÈRE DE RÉOUVERTURE vivent dans `lib/seo-projets.ts`, avec la règle
   * elle-même (`matriceIndexable`). Ne pas les redupliquer ici : quand ce fichier portait sa
   * propre copie du seuil, les deux ont divergé — le sitemap a déclaré des pages devenues
   * `noindex`, c'est-à-dire le pire des deux mondes.
   */
  const travauxVilles: MetadataRoute.Sitemap = projetsMatrix().flatMap((p) =>
    MATRIX_VILLES.filter((v) => matriceIndexable(v.slug)).map((v) => ({
      url: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}`,
      lastModified: PRIX_MAJ,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  );
  return [
    { url: `${siteUrl}/`, lastModified: SITE_MAJ, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/methodologie`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/guides`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.8 },
    ...guides,
    { url: `${siteUrl}/prix-poste`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.8 },
    ...POSTES_PAGES.map((x) => ({
      url: `${siteUrl}/prix-poste/${x.slug}`,
      lastModified: PRIX_MAJ,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${siteUrl}/prix-travaux`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.9 },
    ...travaux,
    ...travauxVilles,
    { url: `${siteUrl}/prix-renovation`, lastModified: PRIX_MAJ, changeFrequency: "monthly", priority: 0.8 },
    ...villes,
    { url: `${siteUrl}/tarifs`, lastModified: SITE_MAJ, changeFrequency: "monthly", priority: 0.6 },
    // Pages légales : signal de confiance attendu par Google sur un site qui encaisse un abonnement
    // (E-E-A-T). Elles sont indexables et canoniques depuis le lot 1 — elles ont leur place ici.
    ...(Object.keys(LEGAL_MAJ) as (keyof typeof LEGAL_MAJ)[]).map((slug) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: LEGAL_MAJ[slug],
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    { url: `${siteUrl}/estimation-travaux`, lastModified: SITE_MAJ, changeFrequency: "monthly", priority: 0.9 },
    // Construction neuve : seulement quand la fonction est allumée (sinon la page répond 404).
    ...(FEATURES.neuf
      ? [{ url: `${siteUrl}/estimation-construction-maison`, lastModified: SITE_MAJ, changeFrequency: "monthly" as const, priority: 0.9 }]
      : []),
    // Éditeur de plan : la vitrine seulement (`/plan`, l'éditeur, est noindex et n'y figure pas).
    ...(FEATURES.plans
      ? [{ url: `${siteUrl}/logiciel-plan-maison`, lastModified: SITE_MAJ, changeFrequency: "monthly" as const, priority: 0.9 }]
      : []),
  ];
}

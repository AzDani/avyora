/**
 * Guides SEO « pilier » (contenu à gros volume), complémentaires des pages villes.
 * Intention de recherche : par TYPE de bien (appartement / maison) et par POSTE, au niveau national —
 * là où les pages villes ciblent le local. Ils s'inter-lient (cluster : guides ↔ villes ↔ estimateur).
 * Le corps de chaque guide est rendu dans app/guides/[slug]/page.tsx (données chiffrées = moteur).
 */
export type GuideMeta = {
  slug: string;
  /** H1 de la page */
  h1: string;
  /** <title> SEO */
  title: string;
  /** meta description */
  description: string;
  eyebrow: string;
  /** résumé court pour la carte du hub */
  resume: string;
};

export const GUIDES: GuideMeta[] = [
  {
    slug: "prix-renovation-appartement",
    h1: "Prix d'une rénovation d'appartement au m² en 2026",
    title: "Prix rénovation appartement au m² (2026) — coût & exemples",
    description:
      "Combien coûte la rénovation d'un appartement au m² en 2026 ? Prix par ampleur, budgets réels de 30 à 120 m² et ce qui fait varier la facture.",
    eyebrow: "Guide des prix",
    resume: "Coût au m² par ampleur, exemples T2/T3/T4 et postes qui pèsent le plus.",
  },
  {
    slug: "prix-renovation-maison",
    h1: "Prix d'une rénovation de maison au m² en 2026",
    title: "Prix rénovation maison au m² (2026) — coût & exemples",
    description:
      "Combien coûte la rénovation d'une maison au m² en 2026 ? Prix par ampleur, budgets de 80 à 200 m², toiture, façade et charpente comprises.",
    eyebrow: "Guide des prix",
    resume: "Coût au m² maison, enveloppe (toiture/façade/charpente) et exemples 100/150 m².",
  },
  {
    slug: "ordre-travaux-renovation",
    h1: "Dans quel ordre faire ses travaux de rénovation",
    title: "Ordre des travaux de rénovation : le planning complet",
    description:
      "L'ordre des travaux de rénovation étape par étape : démolition, gros œuvre, hors d'eau, hors d'air, finitions. Et les inversions qui coûtent cher.",
    eyebrow: "Guide pratique",
    resume: "Les 9 phases dans l'ordre, ce qui bloque quoi, et les erreurs de séquence qui font tout refaire.",
  },
  {
    slug: "verifier-devis-travaux",
    h1: "Comment lire et vérifier un devis de travaux",
    title: "Vérifier un devis de travaux : la méthode et les prix repères",
    description:
      "Lire un devis de travaux ligne par ligne, repérer un poste surévalué ou absent, comparer deux artisans. Avec des prix repères pour situer chaque ligne.",
    eyebrow: "Guide pratique",
    resume: "Ce que doit contenir un devis, les signaux d'alerte, et des prix repères pour situer chaque ligne.",
  },
  {
    slug: "faire-soi-meme-ou-artisan",
    h1: "Faire ses travaux soi-même : combien on économise vraiment",
    title: "Travaux soi-même ou artisan : combien on économise",
    description:
      "Combien rapporte vraiment l'auto-rénovation ? La part de main-d'œuvre lot par lot, les postes où faire soi-même paie, et ce que l'économie oublie.",
    eyebrow: "Guide pratique",
    resume: "La part de main-d'œuvre lot par lot, où faire soi-même paie vraiment, et ce que l'économie annoncée oublie.",
  }
];

export function guideBySlug(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

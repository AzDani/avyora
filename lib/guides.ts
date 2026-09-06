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
      "Combien coûte la rénovation d'un appartement au m² en 2026 ? Prix par ampleur (rafraîchissement, partielle, complète, totale), exemples chiffrés T2/T3/T4 et ce qui fait varier la facture.",
    eyebrow: "Guide des prix",
    resume: "Coût au m² par ampleur, exemples T2/T3/T4 et postes qui pèsent le plus.",
  },
  {
    slug: "prix-renovation-maison",
    h1: "Prix d'une rénovation de maison au m² en 2026",
    title: "Prix rénovation maison au m² (2026) — coût & exemples",
    description:
      "Combien coûte la rénovation d'une maison au m² en 2026 ? Prix par ampleur, cas de la maison ancienne, postes d'enveloppe (toiture, façade, charpente) et exemples chiffrés 100/150 m².",
    eyebrow: "Guide des prix",
    resume: "Coût au m² maison, enveloppe (toiture/façade/charpente) et exemples 100/150 m².",
  },
];

export function guideBySlug(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

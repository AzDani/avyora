import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Bloc Open Graph d'une page, complété des valeurs de marque.
 *
 * ⚠️ POURQUOI CE HELPER. Next fusionne les `metadata` « à plat » : un objet `openGraph` déclaré dans
 * un `generateMetadata` REMPLACE entièrement celui du layout racine, il ne le complète pas. Les
 * gabarits déclaraient `{ type, title, description, url }` et perdaient donc `siteName`, `locale`
 * et `images` — mesuré sur 424 pages sur 508, soit tous les gabarits SEO. Résultat : aucun aperçu
 * au partage, et aucune image pour les crawlers qui lisent l'Open Graph.
 *
 * `images` pointe vers la route `opengraph-image` de la page quand elle en a une, sinon vers celle
 * de la racine (app/opengraph-image.tsx), qui existe.
 */
export function og(p: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): NonNullable<Metadata["openGraph"]> {
  return {
    type: p.type ?? "article",
    locale: "fr_FR",
    siteName: "AVYORA",
    url: `${siteUrl}${p.path}`,
    title: p.title,
    description: p.description,
    images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: p.title }],
  };
}

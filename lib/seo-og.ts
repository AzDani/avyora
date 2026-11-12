import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Description du site (accueil, Organization, WebSite). Doit décrire ce que le produit fait RÉELLEMENT
 * aujourd'hui (cf. lib/features.ts : devis et rentabilite sont désactivés). Promettre une fonction
 * absente = clic gagné puis retour immédiat. Source unique : le layout racine et l'accueil la lisent.
 */
export const DESCRIPTION_SITE =
  "Estime le coût de tes travaux de rénovation au prix du marché français : 200 postes chiffrés, 18 corps d'état, prix ajustés à ta région — avant de signer.";

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

/** Suffixe ajouté par le gabarit de titre du layout racine (`template: "%s · AVYORA"`). */
export const SUFFIXE_TITRE = " · AVYORA";

/** Longueur maximale d'un <title>, suffixe compris : au-delà, Google le tronque (≈ 580 px). */
export const TITRE_MAX = 60;

/**
 * Titre de page qui tient dans TITRE_MAX caractères, SUFFIXE COMPRIS.
 *
 * On donne les formulations de la plus complète à la plus courte. La première qui tient avec le
 * suffixe « · AVYORA » est rendue telle quelle (le gabarit du layout ajoute le suffixe). Si aucune
 * ne tient avec le suffixe, on sacrifie la marque plutôt que l'information : la plus courte sort en
 * `absolute` (sans suffixe). Ainsi les noms de ville longs (« Boulogne-Billancourt ») raccourcissent
 * leur title au lieu de le faire couper en pleine phrase dans les résultats.
 */
export function titreCourt(...candidats: string[]): string | { absolute: string } {
  for (const c of candidats) if (c.length + SUFFIXE_TITRE.length <= TITRE_MAX) return c;
  return { absolute: candidats[candidats.length - 1] };
}

/** Le texte d'un titre rendu par `titreCourt`, sans le suffixe de marque. */
export const texteTitre = (t: string | { absolute: string }): string => (typeof t === "string" ? t : t.absolute);

/**
 * Métadonnées SEO COMPLÈTES d'une page indexable : title, description, canonical, Open Graph et
 * carte X/Twitter, toutes propres à la page.
 *
 * ⚠️ POURQUOI. Le layout racine ne porte plus que les valeurs de marque (type, locale, siteName,
 * card). Une page qui ne déclarait que `title` et `description` héritait avant de l'Open Graph de
 * l'accueil, `og:url` compris : partagée sur Facebook ou LinkedIn, /tarifs s'affichait (et se
 * comptait) comme l'accueil. Et une page qui déclarait son `openGraph` sans `twitter` gardait le
 * titre X de l'accueil. Ce helper fixe les trois ensemble, pour qu'ils ne divergent plus.
 *
 * `titreSocial` : titre de l'aperçu de partage quand il doit différer du <title> (sinon le même,
 * sans le suffixe de marque — l'aperçu affiche déjà le nom du site).
 */
export function seoMeta(p: {
  title: string | { absolute: string };
  description: string;
  path: string;
  type?: "website" | "article";
  titreSocial?: string;
  descriptionSociale?: string;
}): Metadata {
  const titre = p.titreSocial ?? texteTitre(p.title);
  const desc = p.descriptionSociale ?? p.description;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: p.path },
    openGraph: og({ title: titre, description: desc, path: p.path, type: p.type }),
    twitter: { card: "summary_large_image", title: titre, description: desc },
  };
}

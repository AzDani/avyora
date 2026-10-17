import ChoixEstimation from "@/components/ChoixEstimation";
import ChoixNature from "@/components/ChoixNature";
import { getUser, estPro } from "@/lib/auth";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/features";
import { lireNature } from "@/lib/nature-projet";
import { og } from "@/lib/seo-og";

type SP = { nature?: string | string[] };

const META_RENO: Metadata = {
  title: "Estimer ses travaux de rénovation — gratuit, sans inscription",
  description:
    "Choisis ton mode d'estimation : rapide et gratuite en 4 questions, ou détaillée poste par poste. Prix du marché français ajustés à ta région.",
  alternates: { canonical: "/projets/nouveau" },
};
// Variante construction neuve (`?nature=neuf`, flag allumé seulement). Le canonical ne bouge pas :
// la variante n'est pas une page à indexer à part.
const META_NEUF: Metadata = {
  title: "Estimer la construction de ta maison neuve",
  description:
    "Choisis ton mode d'estimation : rapide et gratuite en 5 questions, ou détaillée lot par lot, du permis à la remise des clés. Prix ajustés à ta région.",
  alternates: { canonical: "/projets/nouveau" },
};
// Pré-page « Quel est ton projet ? » (N2, flag allumé, sans nature) : un titre neutre qui garde
// « rénovation » en tête, et son propre Open Graph (sinon `og:url` resterait celle de l'accueil).
const TITRE_NATURE = "Estimer ta rénovation ou ta maison neuve — gratuit";
const DESCRIPTION_NATURE =
  "Rénovation d'un logement ou construction d'une maison neuve : estime ton projet gratuitement, en rapide ou poste par poste. Prix ajustés à ta région.";
const META_NATURE: Metadata = {
  title: TITRE_NATURE,
  description: DESCRIPTION_NATURE,
  alternates: { canonical: "/projets/nouveau" },
  openGraph: og({ title: TITRE_NATURE, description: DESCRIPTION_NATURE, path: "/projets/nouveau", type: "website" }),
  // Sans lui, X reprendrait le titre et la description du layout, qui ne parlent que de rénovation.
  twitter: { card: "summary_large_image", title: TITRE_NATURE, description: DESCRIPTION_NATURE },
};

/** Flag éteint : exactement la metadata de la rénovation, quel que soit `?nature`. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  if (!FEATURES.neuf) return META_RENO;
  const nature = lireNature((await searchParams).nature);
  return nature === "neuf" ? META_NEUF : nature === "reno" ? META_RENO : META_NATURE;
}
export const dynamic = "force-dynamic";

// Nouvelle estimation, publique : un visiteur non connecté peut lancer la rapide ; la détaillée mène
// au tunnel Pro. Trois états (N2), le canonical reste `/projets/nouveau` dans les trois :
//  (a) flag `FEATURES.neuf` éteint : l'écran de la rénovation, quel que soit `?nature` (le flag est
//      testé AVANT de lire `nature`), comme avant le neuf ;
//  (b) flag allumé, `nature` absente ou inconnue : la pré-page « Quel est ton projet ? », qui ne lit
//      pas la session ;
//  (c) `?nature=reno` ou `?nature=neuf` : l'écran Rapide / Détaillée de cette nature.
export default async function NouveauProjet({ searchParams }: { searchParams: Promise<SP> }) {
  if (!FEATURES.neuf) {
    const user = await getUser();
    return <ChoixEstimation isPro={!!user && estPro(user)} nature="reno" />;
  }
  const nature = lireNature((await searchParams).nature);
  if (!nature) return <ChoixNature />;
  const user = await getUser();
  return <ChoixEstimation isPro={!!user && estPro(user)} nature={nature} />;
}

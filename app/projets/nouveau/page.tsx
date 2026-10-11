import ChoixEstimation from "@/components/ChoixEstimation";
import { getUser, estPro } from "@/lib/auth";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/features";

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
    "Choisis ton mode d'estimation : rapide et gratuite en 5 questions, ou détaillée phase par phase, du permis à la remise des clés. Prix ajustés à ta région.",
  alternates: { canonical: "/projets/nouveau" },
};

/** Flag éteint (ou toute autre valeur de `nature`) : exactement la metadata de la rénovation. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  return FEATURES.neuf && sp.nature === "neuf" ? META_NEUF : META_RENO;
}
export const dynamic = "force-dynamic";

// Écran de choix du type d'estimation (rapide gratuite / détaillée Pro).
// Public : un visiteur non connecté peut lancer la rapide ; la détaillée mène au tunnel Pro.
// `?nature=neuf` (flag allumé seulement) : les cartes de la construction neuve. Toute autre valeur
// donne l'écran rénovation. Le canonical reste `/projets/nouveau` : une variante, pas une page.
export default async function NouveauProjet({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, user] = await Promise.all([searchParams, getUser()]);
  const isPro = !!user && estPro(user);
  const nature = FEATURES.neuf && sp.nature === "neuf" ? "neuf" : "reno";
  return <ChoixEstimation isPro={isPro} nature={nature} />;
}

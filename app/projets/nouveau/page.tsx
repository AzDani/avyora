import ChoixEstimation from "@/components/ChoixEstimation";
import { getUser, estPro } from "@/lib/auth";
import { FEATURES } from "@/lib/features";

export const metadata = {
  title: "Estimer ses travaux de rénovation — gratuit, sans inscription",
  description:
    "Choisis ton mode d'estimation : rapide et gratuite en 4 questions, ou détaillée poste par poste. Prix du marché français ajustés à ta région.",
  alternates: { canonical: "/projets/nouveau" },
};
export const dynamic = "force-dynamic";

// Écran de choix du type d'estimation (rapide gratuite / détaillée Pro).
// Public : un visiteur non connecté peut lancer la rapide ; la détaillée mène au tunnel Pro.
// `?nature=neuf` (flag allumé seulement) : les cartes de la construction neuve. Toute autre valeur
// donne l'écran rénovation. Le canonical reste `/projets/nouveau` : une variante, pas une page.
export default async function NouveauProjet({ searchParams }: { searchParams: Promise<{ nature?: string | string[] }> }) {
  const [sp, user] = await Promise.all([searchParams, getUser()]);
  const isPro = !!user && estPro(user);
  const nature = FEATURES.neuf && sp.nature === "neuf" ? "neuf" : "reno";
  return <ChoixEstimation isPro={isPro} nature={nature} />;
}

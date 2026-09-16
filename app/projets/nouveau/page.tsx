import ChoixEstimation from "@/components/ChoixEstimation";
import { getUser, estPro } from "@/lib/auth";

export const metadata = {
  title: "Estimer ses travaux de rénovation — gratuit, sans inscription",
  description:
    "Choisis ton mode d'estimation : rapide et gratuite en 4 questions, ou détaillée poste par poste. Prix du marché français ajustés à ta région.",
  alternates: { canonical: "/projets/nouveau" },
};
export const dynamic = "force-dynamic";

// Écran de choix du type d'estimation (rapide gratuite / détaillée Pro).
// Public : un visiteur non connecté peut lancer la rapide ; la détaillée mène au tunnel Pro.
export default async function NouveauProjet() {
  const user = await getUser();
  const isPro = !!user && estPro(user);
  return <ChoixEstimation isPro={isPro} />;
}

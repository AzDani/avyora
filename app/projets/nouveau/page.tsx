import ChoixEstimation from "@/components/ChoixEstimation";
import { getUser, estPro } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Écran de choix du type d'estimation (rapide gratuite / détaillée Pro).
// Public : un visiteur non connecté peut lancer la rapide ; la détaillée mène au tunnel Pro.
export default async function NouveauProjet() {
  const user = await getUser();
  const isPro = !!user && estPro(user);
  return <ChoixEstimation isPro={isPro} />;
}

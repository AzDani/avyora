import { redirect } from "next/navigation";
import Estimateur from "@/components/Estimateur";
import { getUser, estPro } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Estimation détaillée (poste par poste) — réservée aux abonnés Pro.
// Non connecté → connexion ; connecté mais free → page de prix.
export default async function NouveauProjetDetaille() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/projets/nouveau/detaille");
  if (!estPro(user)) redirect("/tarifs");

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="eyebrow">Estimation détaillée</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Ajuster poste par poste</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Coche les travaux, ajuste les quantités — ton devis se construit en direct.
        </p>
      </header>
      <Estimateur />
    </div>
  );
}

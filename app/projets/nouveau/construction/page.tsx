import { notFound, redirect } from "next/navigation";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import { getUser, estPro } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { FEATURES } from "@/lib/features";

// noindex : page gatée, comme le détaillé de la rénovation (`/projets/nouveau/detaille`). La
// redirection arrive après le début du streaming : un robot recevrait une coquille vide.
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Estimation DÉTAILLÉE d'une construction neuve (« Affiner ma maison ») — réservée au Pro.
 * Même garde que `/projets/nouveau/detaille` : un anonyme ou un gratuit va sur /tarifs, qui
 * explique l'offre et propose de créer un compte ou de se connecter. Le proxy laisse passer
 * `/projets/nouveau*` : la page se garde elle-même. Derrière `FEATURES.neuf` (éteint → 404).
 * `?new=1` (« Affiner » du rapide, nouveau projet) est lu par le composant, côté client.
 */
export default async function NouveauProjetConstruction() {
  if (!FEATURES.neuf) notFound();
  const user = await getUser();
  if (!user) redirect("/tarifs");
  if (!estPro(user)) redirect("/tarifs");
  const d = dictNeuf(await getLocale()).detail;

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="eyebrow">{d.pageEyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{d.pageTitre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{d.pageSous}</p>
      </header>
      <EstimateurNeuf />
    </div>
  );
}

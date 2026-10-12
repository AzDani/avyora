import { notFound } from "next/navigation";
import TesPlans from "@/components/plans/TesPlans";
import { FEATURES } from "@/lib/features";
import { getLocale } from "@/lib/i18n/server";
import { dictPlans } from "@/lib/i18n/plans";
import { og } from "@/lib/seo-og";

// Longueurs pour la page de résultats : titre ≤ 51 caractères (le gabarit ajoute « · AVYORA »),
// description ≤ 155. Le contenu SEO reste en français (règle du site) ; l'interface suit la langue.
const TITRE = "Logiciel de plan de maison gratuit, en 2D et 3D";
const DESCRIPTION =
  "Dessine le plan de ta maison en ligne, gratuitement : murs, pièces et surfaces calculées, portes et fenêtres, vue 3D en un clic. Sans installation.";

export const metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: "/logiciel-plan-maison" },
  openGraph: og({ title: TITRE, description: DESCRIPTION, path: "/logiciel-plan-maison", type: "website" }),
  twitter: { card: "summary_large_image" as const, title: TITRE, description: DESCRIPTION },
};

/**
 * La vitrine de l'éditeur de plan, et le hub « Mes plans » (C5). Derrière `FEATURES.plans` : interrupteur
 * éteint → 404.
 *
 * Page serveur SANS lecture de session : le contenu indexé est celui d'un visiteur sans compte. Ce qui
 * dépend de la personne (ses plans du compte, ou ceux de ce navigateur) vit dans l'îlot client
 * `TesPlans`, en tête, à hauteur réservée. Le reste du contenu de la vitrine (« En trois gestes », ce que
 * l'éditeur sait faire, Gratuit / Pro, FAQ, JSON-LD) arrive avec la mise en avant (C9).
 */
export default async function LogicielPlanMaison() {
  if (!FEATURES.plans) notFound();
  const locale = await getLocale();
  const t = dictPlans(locale).page;
  return (
    <div className="space-y-8">
      <header className="animate-rise">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-1.5 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t.titre}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{t.sous}</p>
        {t.enFrancais && (
          <p className="mt-2 text-[13px] text-faint" lang="en">
            {t.enFrancais}
          </p>
        )}
      </header>
      <TesPlans />
    </div>
  );
}

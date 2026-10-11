import Link from "next/link";
import { notFound } from "next/navigation";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import { getLocale } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { getUser, estPro } from "@/lib/auth";
import { FEATURES } from "@/lib/features";
import { og } from "@/lib/seo-og";
import { contexteNeuf } from "@/lib/neuf-contexte";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const TITRE = "Estimation construction maison neuve — gratuit, en 5 questions";
const DESCRIPTION =
  "Estime gratuitement le prix de construction de ta maison neuve : 5 questions, un budget complet du permis à la remise des clés (études, taxes, construction, branchements), ajusté à ton code postal. Sans inscription.";

// Le titre ne répète pas « AVYORA » : le gabarit du layout l'ajoute.
export const metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: "/estimation-construction-maison" },
  openGraph: og({ title: TITRE, description: DESCRIPTION, path: "/estimation-construction-maison", type: "website" }),
};
export const dynamic = "force-dynamic";

/**
 * Estimation rapide d'une CONSTRUCTION NEUVE, publique et gratuite. Page sœur de
 * `/estimation-travaux` (rénovation, non touchée) : une intention de recherche distincte, avec son
 * canonical et son JSON-LD. Derrière `FEATURES.neuf` : interrupteur éteint → 404.
 *
 * `?cp=&surface=&niveaux=&src=` amorcent le formulaire, validés par `contexteNeuf` (tout ce qui
 * n'est pas reconnu est ignoré). Ils n'amorcent pas le chiffre : cliquer un lien n'est pas
 * décrire sa maison.
 */
export default async function EstimationConstructionMaison({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!FEATURES.neuf) notFound();
  const [locale, user, sp] = await Promise.all([getLocale(), getUser(), searchParams]);
  const t = dictNeuf(locale).saisie;
  const isPro = !!user && estPro(user);
  const initial = contexteNeuf(sp);

  /**
   * Balisage de l'outil, calqué sur `/estimation-travaux`. Pas d'`aggregateRating` (AVYORA n'a pas
   * d'avis réels). `offers` à 0 : l'estimation rapide est gratuite et sans inscription.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Estimateur de construction de maison AVYORA",
        url: `${siteUrl}/estimation-construction-maison`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
        isAccessibleForFree: true,
        description:
          "Estime gratuitement le budget de construction d'une maison neuve : cinq questions, un budget complet du permis à la remise des clés, ajusté à ton code postal, sans inscription.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Estimation construction maison", item: `${siteUrl}/estimation-construction-maison` },
        ],
      },
    ],
  };
  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="animate-rise">
        <p className="mb-1 text-[13px]">
          <Link href="/projets/nouveau?nature=neuf" className="text-muted hover:text-brand-700">{t.pageBack}</Link>
        </p>
        <p className="eyebrow">{t.pageEyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{t.pageTitre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{t.pageSous}</p>
      </header>
      <EstimateurRapideNeuf isPro={isPro} initial={initial} />
    </div>
  );
}

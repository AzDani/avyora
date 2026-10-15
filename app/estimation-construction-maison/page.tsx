import Link from "next/link";
import { notFound } from "next/navigation";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import { getLocale } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { getUser, estPro } from "@/lib/auth";
import { betaActive } from "@/lib/beta";
import { FEATURES } from "@/lib/features";
import { og } from "@/lib/seo-og";
import { contexteNeuf } from "@/lib/neuf-contexte";
import { dictPlans } from "@/lib/i18n/plans";
import { clicPlan } from "@/lib/plans/mesure";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Longueurs pour la page de résultats : titre ≤ 51 caractères (le gabarit ajoute « · AVYORA »,
// 60 au total), description ≤ 155. Le titre ne répète pas « AVYORA ».
const TITRE = "Estimation construction maison neuve gratuite";
const DESCRIPTION =
  "Estime le prix de construction de ta maison neuve en 5 questions : un budget complet, du permis à la remise des clés, ajusté à ton code postal. Gratuit.";

export const metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: "/estimation-construction-maison" },
  openGraph: og({ title: TITRE, description: DESCRIPTION, path: "/estimation-construction-maison", type: "website" }),
  // Sans lui, X reprendrait le titre et la description du layout, qui parlent de rénovation.
  twitter: { card: "summary_large_image" as const, title: TITRE, description: DESCRIPTION },
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
        {/* Éditeur de plan (C9) : la boucle neuf ↔ plan, seulement interrupteur allumé, et pas quand on ARRIVE du plan
            (`?source=editeur-plan` → src « plan ») : « Pas encore de plan ? » contredirait « Ta maison est reprise de ton plan ». */}
        {FEATURES.plans && initial.src !== "plan" && <LignePlan locale={locale} />}
      </header>
      <EstimateurRapideNeuf isPro={isPro} beta={betaActive()} initial={initial} />
    </div>
  );
}

/**
 * « Pas encore de plan ? Dessine ta maison : l'estimation reprend ses pièces et sa surface. » → un Plan final.
 * Une balise `<a>` et non `next/link` : `/plan` est une autre application (route handler) que le routeur préchargerait
 * en entier (1,3 Mo) dès que le lien est visible. Au téléphone, une note dit que le dessin se fait sur ordinateur.
 */
function LignePlan({ locale }: { locale: Awaited<ReturnType<typeof getLocale>> }) {
  const d = dictPlans(locale);
  const t = d.neuf;
  return (
    <p className="mt-3 text-[14px] text-muted" data-ligne-plan="">
      {t.avant}
      <a href="/plan?type=final" className="font-medium text-brand-700 hover:underline" {...clicPlan("neuf")}>
        {t.lien}
      </a>
      {t.apres}
      <span className="mt-1 hidden text-[13px] text-faint max-[600px]:block">{d.hub.dessinNote}</span>
    </p>
  );
}

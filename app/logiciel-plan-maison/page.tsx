import Link from "next/link";
import { notFound } from "next/navigation";
import TesPlans from "@/components/plans/TesPlans";
import BoutonCreerPlan from "@/components/plans/BoutonCreerPlan";
import { FEATURES } from "@/lib/features";
import { getLocale } from "@/lib/i18n/server";
import { dictPlans } from "@/lib/i18n/plans";
import { clicPlan } from "@/lib/plans/mesure";
import { og } from "@/lib/seo-og";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Longueurs pour la page de résultats : titre ≤ 51 caractères (le gabarit ajoute « · AVYORA »),
// description ≤ 155. Le contenu SEO reste en français (règle du site) ; l'interface suit la langue.
const TITRE = "Logiciel de plan de maison gratuit, en 2D et 3D";
const DESCRIPTION =
  "Dessine le plan de ta maison en ligne, gratuitement : murs, pièces et surfaces calculées, portes et fenêtres, vue 3D en un clic. Sans installation.";
/** L'image de partage : la vraie capture 2D et 3D de la Maison 94 m², composée en 1200 × 630 (C9). */
const IMAGE_OG = { url: `${siteUrl}/plans/og-plan.png`, width: 1200, height: 630, alt: TITRE };

export const metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: "/logiciel-plan-maison" },
  openGraph: { ...og({ title: TITRE, description: DESCRIPTION, path: "/logiciel-plan-maison", type: "website" }), images: [IMAGE_OG] },
  twitter: { card: "summary_large_image" as const, title: TITRE, description: DESCRIPTION, images: [IMAGE_OG.url] },
};

const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Une vraie capture de l'éditeur : webp 760 / 1040, PNG de repli, largeur et hauteur posées (convention du dépôt). */
function Capture({ nom, alt, legende }: { nom: string; alt: string; legende: string }) {
  return (
    <figure className="min-w-0">
      <picture>
        <source
          type="image/webp"
          srcSet={`/plans/${nom}-760.webp 760w, /plans/${nom}-1040.webp 1040w`}
          sizes="(max-width: 640px) 92vw, 480px"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/plans/${nom}.png`}
          alt={alt}
          width={1040}
          height={650}
          loading="lazy"
          decoding="async"
          className="w-full rounded-panel border border-line bg-surface shadow-card"
        />
      </picture>
      <figcaption className="mt-2 text-[13px] text-muted">{legende}</figcaption>
    </figure>
  );
}

function Coche({ pro = false }: { pro?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true"
      className={"mt-0.5 shrink-0 " + (pro ? "text-accent-600" : "text-brand-600")}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * La vitrine de l'éditeur de plan, et le hub « Mes plans » (C5, contenu C9). Derrière `FEATURES.plans` :
 * interrupteur éteint → 404.
 *
 * Page serveur SANS lecture de session : le contenu indexé est celui d'un visiteur sans compte. Ce qui
 * dépend de la personne (ses plans du compte, ou ceux de ce navigateur) vit dans l'îlot client
 * `TesPlans`, en tête, à hauteur réservée. Le reste ne dit que ce que l'éditeur sait faire ; les colonnes
 * Gratuit / Pro reprennent les mots de l'éditeur (`DROITS`, coherence.mjs § 9). Aucun avis, aucune note,
 * aucun compteur, aucun prix.
 */
export default async function LogicielPlanMaison() {
  if (!FEATURES.plans) notFound();
  const locale = await getLocale();
  const d = dictPlans(locale);
  const t = d.page;
  const v = d.vitrine;

  /* JSON-LD : l'application (gratuite, sans note ni avis : AVYORA n'a pas d'avis réels), le fil d'Ariane, et la
     FAQ telle qu'elle est affichée (mêmes questions, mêmes réponses). */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Éditeur de plan de maison AVYORA",
        url: `${siteUrl}/logiciel-plan-maison`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
        isAccessibleForFree: true,
        description: DESCRIPTION,
        screenshot: `${siteUrl}/plans/maison-2d.png`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Logiciel de plan de maison", item: `${siteUrl}/logiciel-plan-maison` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: v.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.r },
        })),
      },
    ],
  };

  return (
    <div className="space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
          <p className="mt-3 text-[14px]">
            <a href="#comment" className="font-medium text-brand-700 hover:underline">
              {v.comment} ↓
            </a>
          </p>
        </header>
        <TesPlans />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Capture nom="maison-2d" alt={v.alt2d} legende={v.legende2d} />
        <Capture nom="maison-3d" alt={v.alt3d} legende={v.legende3d} />
      </div>

      <section id="comment" aria-labelledby="gestes-titre" className="scroll-mt-24">
        <p className="eyebrow">{v.comment}</p>
        <h2 id="gestes-titre" className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{v.gestesTitre}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {v.gestes.map((g, i) => (
            <li key={g.titre} className="card p-5">
              <span className="data grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-[14px] font-semibold text-white">{i + 1}</span>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{g.titre}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{g.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="capacites-titre">
        <h2 id="capacites-titre" className="text-2xl font-semibold tracking-tight text-ink">{v.capacitesTitre}</h2>
        <p className="mt-1.5 text-[14px] text-muted">{v.capacitesSous}</p>
        <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {v.capacites.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-ink">
              <Coche />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="apres-titre">
        <h2 id="apres-titre" className="text-2xl font-semibold tracking-tight text-ink">{v.apresTitre}</h2>
        <div className={"mt-5 grid gap-4 " + (FEATURES.neuf ? "md:grid-cols-2" : "")}>
          {FEATURES.neuf && (
            <div className="card flex flex-col p-6">
              <p className="flex items-center gap-2">
                <span className="text-[17px] font-semibold text-ink">{v.construireTitre}</span>
                <span className="rounded-full bg-positive-soft px-2.5 py-1 text-[11px] font-semibold text-positive">{v.gratuit}</span>
              </p>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{v.construireTexte}</p>
              <Link href="/plan?type=final" className="mt-4 text-[14px] font-medium text-brand-700 hover:underline" {...clicPlan("vitrine_bas")}>
                {v.construireLien} →
              </Link>
            </div>
          )}
          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2">
              <span className="text-[17px] font-semibold text-ink">{v.renoverTitre}</span>
              <span className="rounded-full bg-gradient-to-r from-accent-600 to-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">{v.pro}</span>
            </p>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{v.renoverTexte}</p>
            <a href="#offres" className="mt-4 text-[14px] font-medium text-brand-700 hover:underline">
              {v.renoverLien} ↓
            </a>
          </div>
        </div>
      </section>

      <section id="offres" aria-labelledby="offres-titre" className="scroll-mt-24">
        <h2 id="offres-titre" className="text-2xl font-semibold tracking-tight text-ink">{v.offresTitre}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border border-line bg-surface p-6" data-colonne="gratuit">
            <p className="text-[15px] font-semibold text-ink">{v.gratuit}</p>
            <p className="mt-1 text-[13px] text-muted">{v.offresGratuitSous}</p>
            <ul className="mt-4 space-y-2.5">
              {v.gratuitListe.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
                  <Coche />
                  {maj(x)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-panel border border-brand-600 bg-surface p-6 shadow-card ring-1 ring-brand-600/15" data-colonne="pro">
            <p className="text-[15px] font-semibold text-ink">{v.pro}</p>
            <p className="mt-1 text-[13px] text-muted">{v.offresProSous}</p>
            <ul className="mt-4 space-y-2.5">
              {v.proListe.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
                  <Coche pro />
                  {maj(x)}
                </li>
              ))}
            </ul>
            <Link href="/tarifs?source=editeur-plan" className="btn btn-outline mt-5 py-2.5">
              {v.offresVoir}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-titre">
        <h2 id="faq-titre" className="text-2xl font-semibold tracking-tight text-ink">{v.faqTitre}</h2>
        <div className="mt-5 divide-y divide-line rounded-panel border border-line bg-surface">
          {v.faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-[15px] font-medium text-ink marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-faint transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">{v.basTitre}</h2>
          <p className="mt-1 text-[14px] text-muted">{v.basSous}</p>
        </div>
        <BoutonCreerPlan label={v.basCta} />
      </section>
    </div>
  );
}

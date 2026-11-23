import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { metaSelonLangue } from "@/lib/i18n/meta";
import { seoMeta, titreCourt } from "@/lib/seo-og";
import { FEATURES } from "@/lib/features";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";
import FormulaireAccompagnement from "@/components/accompagnement/FormulaireAccompagnement";
import { creerJeton } from "@/lib/accompagnement/jeton";
import { CHEMIN_ACCOMPAGNEMENT, DESTINATAIRE_DEFAUT, sourceAccompagnementValide } from "@/lib/accompagnement/constantes";
import { META_ACCOMPAGNEMENT, PHOTO_FONDATEUR, PORTRAIT_FONDATEUR, VIDEO_PRESENTATION, contenuAccompagnement } from "@/lib/accompagnement/contenu";

/**
 * Accompagnement travaux (décisions du fondateur du 16/11/2026) : le conseil de Daniel Leal, ancien chef de chantier
 * (8 ans de chantier, de chef de chantier à chef d'entreprise), pour attirer du trafic sur « accompagnement / conseil travaux » et recueillir des demandes de rappel.
 * AUCUN prix (les tarifs se discutent pendant l'appel), aucun chiffre inventé, pas de maîtrise d'œuvre (dit sur la
 * page). Textes : lib/accompagnement/contenu.ts. Envoi : lib/actions/accompagnement.ts.
 *
 * Dynamique (langue du visiteur, jeton du formulaire signé à la requête). Les robots, sans cookie av-lang, reçoivent
 * le français.
 */
export const dynamic = "force-dynamic";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const M = META_ACCOMPAGNEMENT;
const META = seoMeta({
  title: titreCourt(...M.fr.titres),
  description: M.fr.description,
  path: CHEMIN_ACCOMPAGNEMENT,
  type: "website",
  titreSocial: M.fr.titreSocial,
});

export async function generateMetadata(): Promise<Metadata> {
  return metaSelonLangue(await getLocale(), META, { ...M.en, path: CHEMIN_ACCOMPAGNEMENT });
}

const PRIX_MAJ_EN = new Date(PRIX_MAJ).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

const h2 = "text-[22px] font-semibold tracking-tight text-ink sm:text-2xl";
const section = "scroll-mt-28";

export default async function AccompagnementTravaux({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  const t = contenuAccompagnement(locale);
  const en = locale === "en";
  const srcBrut = Array.isArray(sp.src) ? sp.src[0] : sp.src;
  const src = sourceAccompagnementValide(srcBrut);
  const url = `${siteUrl}${CHEMIN_ACCOMPAGNEMENT}`;

  /**
   * Données structurées : Service (fourni par l'Organization, qui déclare son fondateur dans app/layout.tsx),
   * FAQPage (le MÊME tableau que la FAQ visible) et fil d'Ariane. Une seule offre chiffrée, parce qu'elle est vraie :
   * l'appel découverte, gratuit. Ni avis, ni note, ni LocalBusiness (pas d'accueil physique), ni autre prix.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: t.nomPage,
        serviceType: en ? "Renovation and construction advice" : "Conseil en travaux de rénovation et de construction",
        description: en ? M.en.description : M.fr.description,
        url,
        inLanguage: en ? "en" : "fr-FR",
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Country", name: "France" },
        availableChannel: { "@type": "ServiceChannel", serviceUrl: `${url}#demande`, availableLanguage: "fr" },
        offers: { "@type": "Offer", name: t.aide.services[0].titre, price: "0", priceCurrency: "EUR" },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: t.aide.h2,
          itemListElement: t.aide.services.slice(1).map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.titre } })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: t.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.fil, item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: t.nomPage, item: url },
        ],
      },
    ],
  };

  const coche = (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const croix = (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  const lienProse = "font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700";

  return (
    <div className="space-y-14 sm:space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ── Héros : la promesse, un seul bouton, la carte du fondateur ── */}
      <header className="animate-rise overflow-hidden rounded-panel bg-gradient-to-br from-brand-900 to-[#2b2470] text-white shadow-hero">
        <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent-300">{t.hero.eyebrow}</p>
            <h1 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-4xl">{t.hero.h1}</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-[#d7d4f2]">{t.hero.chapo}</p>
            <a
              href="#demande"
              className="btn mt-6 min-h-12 w-full whitespace-normal bg-white px-6 py-3 text-[15px] leading-snug text-brand-800 shadow-sm hover:bg-brand-50 sm:w-auto"
            >
              {t.hero.cta}
            </a>
            <p className="mt-3 text-[13px] leading-relaxed text-[#c9c5ec]">{t.hero.rassurance}</p>
          </div>

          <div className="rounded-card border border-white/15 bg-white/[0.07] p-5">
            <div className="flex items-center gap-4">
              {PHOTO_FONDATEUR ? (
                <img src={PHOTO_FONDATEUR} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/25" />
              ) : (
                <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-300 text-xl font-semibold text-brand-900">
                  DL
                </span>
              )}
              <div>
                <p className="text-[17px] font-semibold">{t.carte.nom}</p>
                <p className="mt-0.5 text-[13.5px] leading-snug text-[#d7d4f2]">{t.carte.role}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {t.carte.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-[14.5px] leading-snug text-[#ece9ff]">
                  <span className="text-accent-300">{coche}</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* ── Qui je suis (+ la vidéo de présentation, quand elle existera) ── */}
      <section id="qui" aria-labelledby="qui-titre" className={section}>
        <div
          className={
            VIDEO_PRESENTATION
              ? "grid gap-8 lg:grid-cols-2 lg:items-center"
              : PORTRAIT_FONDATEUR
                ? "grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"
                : "max-w-3xl"
          }
        >
          <div>
            <h2 id="qui-titre" className={h2}>{t.qui.h2}</h2>
            {t.qui.paragraphes.map((p) => (
              <p key={p} className="mt-3 text-[16px] leading-relaxed text-muted">{p}</p>
            ))}
            <h3 className="mt-6 text-[15px] font-semibold text-ink">{t.qui.parcoursTitre}</h3>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              {t.qui.parcours.map((e) => (
                <li key={e.titre} className="rounded-field border border-line bg-surface p-4">
                  <p className="font-mono text-[12.5px] font-semibold uppercase tracking-wide text-brand-700">{e.duree}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{e.titre}</p>
                  <p className="mt-1 text-[14px] leading-snug text-muted">{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
          {VIDEO_PRESENTATION && (
            <figure className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <video controls preload="none" playsInline poster={VIDEO_PRESENTATION.poster} className="aspect-video w-full bg-brand-900" aria-label={t.qui.videoTitre}>
                <source src={VIDEO_PRESENTATION.src} type="video/mp4" />
                {VIDEO_PRESENTATION.sousTitres && <track kind="captions" src={VIDEO_PRESENTATION.sousTitres} srcLang="fr" label="Français" default />}
              </video>
              <figcaption className="px-4 py-3 text-[13px] text-faint">{t.qui.videoTitre}</figcaption>
            </figure>
          )}
          {/* Le portrait, tant qu'il n'y a pas de vidéo : un visage avant le premier appel. */}
          {!VIDEO_PRESENTATION && PORTRAIT_FONDATEUR && (
            <figure className="order-first mx-auto w-full max-w-[320px] md:order-none md:max-w-none md:sticky md:top-24">
              <img
                src={PORTRAIT_FONDATEUR.src}
                srcSet={PORTRAIT_FONDATEUR.srcSet}
                sizes="(min-width: 1024px) 380px, (min-width: 768px) 320px, 320px"
                width={PORTRAIT_FONDATEUR.largeur}
                height={PORTRAIT_FONDATEUR.hauteur}
                alt={t.carte.nom}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-card border border-line object-cover shadow-card"
              />
              <figcaption className="mt-2.5 text-[13px] leading-snug text-faint">
                <span className="font-semibold text-ink">{t.carte.nom}</span> · {t.carte.role}
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* ── Comment je peux t'aider : les accompagnements, sans prix ── */}
      <section id="aide" aria-labelledby="aide-titre" className={section}>
        <h2 id="aide-titre" className={h2}>{t.aide.h2}</h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-muted">{t.aide.intro}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.aide.services.map((s, i) => (
            <li key={s.id} className={"card flex flex-col p-5" + (i === 0 ? " border-brand-200 bg-brand-50/60" : "")}>
              <p className="eyebrow">{s.eyebrow}</p>
              <h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{s.titre}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{s.texte}</p>
              {s.lien && (
                <Link href={s.lien.href} className={"mt-2 inline-flex min-h-11 items-center self-start text-[14px] " + lienProse}>
                  {s.lien.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-faint">
          {t.referentiel.replace("{date}", en ? PRIX_MAJ_EN : PRIX_MAJ_FR)}
          {" · "}
          <Link href="/methodologie" className={lienProse}>{t.methodologie}</Link>
        </p>
      </section>

      {/* ── En quoi c'est différent : France Rénov', maître d'œuvre, conseil ── */}
      <section id="difference" aria-labelledby="diff-titre" className={section}>
        <h2 id="diff-titre" className={h2}>{t.difference.h2}</h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-muted">{t.difference.intro}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.difference.acteurs.map((a) => (
            <div key={a.nom} className={"rounded-card border p-5 " + (a.moi ? "border-brand-600 bg-surface shadow-card" : "border-line bg-surface-2")}>
              <h3 className="text-[16px] font-semibold text-ink">{a.nom}</h3>
              <dl className="mt-3 space-y-3">
                {(["paie", "perimetre", "suivi", "responsabilite"] as const).map((k) => (
                  <div key={k}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{t.difference.criteres[k]}</dt>
                    <dd className="mt-0.5 text-[14.5px] leading-snug text-ink">{a[k]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl rounded-card border border-line bg-surface p-4 text-[15px] leading-relaxed text-muted">
          {t.difference.mar}{" "}
          <a href="https://france-renov.gouv.fr" target="_blank" rel="noopener noreferrer" className={"py-2 " + lienProse}>
            {t.difference.lienFranceRenov}
          </a>
        </p>
      </section>

      {/* ── Comment ça se passe : 3 étapes ── */}
      <section id="etapes" aria-labelledby="etapes-titre" className={section}>
        <h2 id="etapes-titre" className={h2}>{t.etapes.h2}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {t.etapes.liste.map((e, i) => (
            <li key={e.titre} className="card p-5">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-[15px] font-semibold text-white">{i + 1}</span>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{e.titre}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Ce que je fais / ne fais pas : pas de maîtrise d'œuvre ── */}
      <section id="perimetre" aria-labelledby="perimetre-titre" className={section}>
        <h2 id="perimetre-titre" className={h2}>{t.perimetre.h2}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-positive/25 bg-positive-soft p-5">
            <h3 className="text-[16px] font-semibold text-ink">{t.perimetre.fais.titre}</h3>
            <ul className="mt-3 space-y-2">
              {t.perimetre.fais.liste.map((x) => (
                <li key={x} className="flex gap-2.5 text-[15px] leading-snug text-ink"><span className="text-positive">{coche}</span>{x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line-strong bg-surface-2 p-5">
            <h3 className="text-[16px] font-semibold text-ink">{t.perimetre.faisPas.titre}</h3>
            <ul className="mt-3 space-y-2">
              {t.perimetre.faisPas.liste.map((x) => (
                <li key={x} className="flex gap-2.5 text-[15px] leading-snug text-ink"><span className="text-muted">{croix}</span>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Le formulaire : « Comment puis-je t'aider ? » (#demande) ── */}
      <section id="demande" aria-labelledby="demande-titre" className={section + " relative"}>
        <div className="card mx-auto max-w-3xl p-5 sm:p-8">
          <p className="eyebrow">{t.hero.cta}</p>
          <h2 id="demande-titre" className={h2 + " mt-1.5"}>{t.formulaire.h2}</h2>
          <p className="mb-6 mt-2 text-[15.5px] leading-relaxed text-muted">{t.formulaire.intro}</p>
          <FormulaireAccompagnement t={t.formulaire} jeton={creerJeton()} src={src} />
        </div>
      </section>

      {/* ── FAQ (source unique du FAQPage) ── */}
      <section id="faq" aria-labelledby="faq-titre" className={section + " max-w-3xl"}>
        <h2 id="faq-titre" className={h2}>{t.faq.h2}</h2>
        <div className="mt-5 space-y-2.5">
          {t.faq.items.map((f) => (
            <details key={f.q} className="group rounded-card border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-faint transition-transform group-open:rotate-180">
                  <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="px-4 pb-4 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Avant l'appel : maillage vers l'estimateur et les guides ── */}
      <section id="preparer" aria-labelledby="preparer-titre" className={section}>
        <h2 id="preparer-titre" className={h2}>{t.preparer.h2}</h2>
        <p className="mt-3 text-[16px] text-muted">{t.preparer.intro}</p>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {[
            { href: "/estimation-travaux", label: t.preparer.liens.estimation },
            ...(FEATURES.neuf ? [{ href: "/estimation-construction-maison", label: t.preparer.liens.construction }] : []),
            { href: "/guides/verifier-devis-travaux", label: t.preparer.liens.devis },
            { href: "/guides/calculer-budget-travaux", label: t.preparer.liens.budget },
            ...(FEATURES.plans ? [{ href: "/logiciel-plan-maison", label: t.preparer.liens.plan }] : []),
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center rounded-full bg-brand-50 px-4 py-2 text-[14px] font-semibold text-brand-700 transition-colors hover:bg-brand-100">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 border-t border-line pt-5 text-[13px] leading-relaxed text-faint">
          {t.note}{" "}
          <Link href="/mentions-legales" className={lienProse}>{t.mentions}</Link>
          {" · "}
          {t.contact} <a href={`mailto:${DESTINATAIRE_DEFAUT}`} className={lienProse}>{DESTINATAIRE_DEFAUT}</a>
        </p>
      </section>
    </div>
  );
}

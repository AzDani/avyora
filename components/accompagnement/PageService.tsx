import Link from "next/link";
import { CHEMIN_ACCOMPAGNEMENT } from "@/lib/accompagnement/constantes";
import { PHOTO_FONDATEUR } from "@/lib/accompagnement/contenu";
import { NOTE_PRIX_FIXE, NOTE_PRIX_MOYEN, PARCOURS_COURT, type PageService as Contenu } from "@/lib/accompagnement/pages-services";

/**
 * Le gabarit des pages de service de l'accompagnement (/relecture-devis-travaux, /suivi-de-chantier,
 * /accompagnement-achat-revente). Un seul appel à
 * l'action, partout : « Demander à être rappelé », vers le formulaire de /accompagnement-travaux (URL canonique, sans
 * paramètre : ce sont des pages indexables). JSON-LD : le service (fourni par l'Organization du layout), la FAQ (le MÊME
 * tableau que la FAQ visible) et le fil d'Ariane ; une offre chiffrée seulement pour un prix FIXE (un prix moyen n'est
 * pas un prix d'offre). Ni avis, ni note. Parcours de vente (24/11/2026) : le prix dès le haut de page, puis « Ce que tu
 * y gagnes », ce que je fais, comment ça se passe, et le bouton de rappel à chaque étape.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const h2 = "text-[22px] font-semibold tracking-tight text-ink sm:text-2xl";
const lienProse = "font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700";
const CTA = `${CHEMIN_ACCOMPAGNEMENT}#demande`;

function Coche() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-[#0b7a53]">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tarif({ t }: { t: NonNullable<Contenu["tarif"]> }) {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-5" data-tarif="">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-faint">{t.fixe ? "Prix" : "Prix moyen"}</p>
      <p className="num mt-1 text-[22px] font-bold leading-tight text-ink">{t.prix}</p>
      <p className="mt-1 text-[14.5px] text-ink">{t.detail}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-faint">{t.fixe ? NOTE_PRIX_FIXE : NOTE_PRIX_MOYEN}</p>
    </div>
  );
}

export default function PageService({ c }: { c: Contenu }) {
  const url = `${siteUrl}${c.chemin}`;
  const cta = c.cta ?? { href: CTA, label: "Demander à être rappelé →", note: "Premier appel gratuit, sans engagement · visio ou WhatsApp" };
  const parent = c.parent === undefined ? { href: CHEMIN_ACCOMPAGNEMENT, nom: "Accompagnement travaux" } : c.parent;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: c.nomService,
        serviceType: c.serviceType,
        description: c.description,
        url,
        inLanguage: "fr-FR",
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Country", name: "France" },
        availableChannel: { "@type": "ServiceChannel", serviceUrl: `${siteUrl}${cta.href}`, availableLanguage: "fr" },
        ...(c.tarif?.fixe && c.tarif.montantFixe
          ? { offers: { "@type": "Offer", price: String(c.tarif.montantFixe), priceCurrency: "EUR", url } }
          : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          ...(parent ? [{ "@type": "ListItem", position: 2, name: parent.nom, item: `${siteUrl}${parent.href}` }] : []),
          { "@type": "ListItem", position: parent ? 3 : 2, name: c.nomService, item: url },
        ],
      },
    ],
  };

  return (
    <article lang="fr" className="mx-auto max-w-3xl space-y-12 py-2" data-page-service={c.chemin}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header>
        <nav aria-label="Fil d'Ariane" className="text-[13px] text-muted">
          <Link href="/" className="hover:text-brand-700">Accueil</Link>
          <span aria-hidden="true"> › </span>
          {parent && (
            <>
              <Link href={parent.href} className="hover:text-brand-700">{parent.nom}</Link>
              <span aria-hidden="true"> › </span>
            </>
          )}
          <span aria-current="page">{c.nomService}</span>
        </nav>
        <p className="eyebrow mt-5">{c.eyebrow ?? "Accompagnement travaux · à distance"}</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.12] tracking-tight text-ink [text-wrap:balance] sm:text-[40px]">{c.h1}</h1>
        <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-muted">{c.intro}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={cta.href} className="btn btn-primary min-h-12 px-6 text-[15px]">{cta.label}</Link>
          <span className="text-[13.5px] text-muted">{cta.note}</span>
        </div>
        {c.tarif && <Tarif t={c.tarif} />}
      </header>

      {c.pourQui && (
        <section aria-labelledby="pour-qui">
          <h2 id="pour-qui" className={h2}>{c.pourQui.titre}</h2>
          <ul className="mt-4 space-y-2.5">
            {c.pourQui.items.map((x) => <li key={x} className="flex gap-3 text-[16px] leading-relaxed text-ink"><Coche />{x}</li>)}
          </ul>
        </section>
      )}

      {c.gains && (
        <section aria-labelledby="gains" className="rounded-3xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8">
          <h2 id="gains" className={h2}>{c.gains.titre}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {c.gains.items.map((x) => (
              <li key={x.t} className="flex gap-3">
                <Coche />
                <span>
                  <span className="block text-[16px] font-semibold leading-snug text-ink">{x.t}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-muted">{x.s}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={cta.href} className="btn btn-primary min-h-12 px-6 text-[15px]">{cta.label}</Link>
            <span className="text-[13.5px] text-muted">{cta.note}</span>
          </div>
        </section>
      )}

      <section aria-labelledby="liste">
        <h2 id="liste" className={h2}>{c.liste.titre}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {c.liste.items.map((x) => (
            <div key={x.t} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-[16px] font-semibold text-ink">{x.t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{x.s}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="etapes" className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="etapes" className={h2}>Comment ça se passe</h2>
        <ol className="mt-5 space-y-4">
          {c.etapes.map((x, i) => (
            <li key={x} className="flex gap-4">
              <span className="num inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[14px] font-bold text-white" aria-hidden="true">{i + 1}</span>
              <span className="pt-1 text-[16px] leading-relaxed text-ink">{x}</span>
            </li>
          ))}
        </ol>
        <h3 className="mt-7 text-[17px] font-semibold text-ink">{c.obtiens.titre}</h3>
        <ul className="mt-3 space-y-2">
          {c.obtiens.items.map((x) => <li key={x} className="flex gap-3 text-[15.5px] leading-relaxed text-ink"><Coche />{x}</li>)}
        </ul>
        {c.tarif && <Tarif t={c.tarif} />}
        <Link href={cta.href} className="btn btn-primary mt-7 min-h-12 px-6 text-[15px]">{cta.label}</Link>
      </section>

      {!c.sansBio && (
      <section aria-labelledby="qui">
        <h2 id="qui" className={h2}>Qui je suis</h2>
        <div className="mt-3 flex items-start gap-4">
        {PHOTO_FONDATEUR && (
          <img src={PHOTO_FONDATEUR} alt="" width={80} height={80} loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
        )}
        <p className="max-w-[64ch] text-[16px] leading-relaxed text-ink">
          {`Je m'appelle Daniel Leal, fondateur d'AVYORA. ${PARCOURS_COURT} J'ai vu un chantier sous tous ses angles : l'entreprise qui exécute, le chef de chantier qui coordonne, le propriétaire qui paie, et surtout celui qui fait les travaux lui-même.`}{" "}
          <Link href={CHEMIN_ACCOMPAGNEMENT} className={lienProse}>Tout l&apos;accompagnement</Link>
        </p>
        </div>
      </section>
      )}

      <section aria-labelledby="a-savoir" className="rounded-3xl bg-surface-2 p-6 sm:p-8">
        <h2 id="a-savoir" className={h2}>Bon à savoir</h2>
        <ul className="mt-4 space-y-3">
          {c.aSavoir.map((x) => <li key={x} className="text-[15.5px] leading-relaxed text-ink">{x}</li>)}
        </ul>
        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
          {c.liens.map((l) => <Link key={l.href} href={l.href} className={"inline-flex min-h-11 items-center " + lienProse}>{l.label}</Link>)}
        </p>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className={h2}>Questions fréquentes</h2>
        <div className="mt-5 divide-y divide-line rounded-3xl border border-line bg-surface">
          {c.faq.map((f) => (
            <details key={f.q} className="group px-5 py-4 sm:px-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-ink">
                {f.q}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-faint transition-transform group-open:rotate-180"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-[#1E1B4B] px-6 py-10 text-center sm:px-10">
        <h2 className="text-[24px] font-semibold tracking-tight text-white [text-wrap:balance] sm:text-[28px]">{c.titreFinal ?? "Parle-moi de ton projet."}</h2>
        <p className="mx-auto mt-2 max-w-[50ch] text-[15px] leading-relaxed text-[#c7c3f4]">{c.texteFinal ?? "Le premier appel est gratuit et sans engagement. Je te rappelle sous 48 h ouvrées, en visio ou sur WhatsApp."}</p>
        <Link href={cta.href} className="btn mt-6 min-h-12 bg-white px-6 text-[15px] text-[#1E1B4B] hover:bg-brand-50">{cta.label}</Link>
      </section>
    </article>
  );
}

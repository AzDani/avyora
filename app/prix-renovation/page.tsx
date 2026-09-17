import Link from "next/link";
import type { Metadata } from "next";
import { VILLES_SEO } from "@/lib/villes";
import { PROJETS } from "@/lib/seo-projets";
import { prixNational } from "@/lib/seo-prix";
import { PRIX_MAJ_FR } from "@/lib/prix-maj";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Prix d'une rénovation par ville en France (2026)",
  description:
    "Coût d'une rénovation au m² selon votre ville : Paris, Lyon, Marseille, Bordeaux… Prix par type de travaux et estimation gratuite en 3 minutes.",
  alternates: { canonical: "/prix-renovation" },
};


// Fil d'Ariane balise : aide Google a comprendre la hierarchie du site et enrichit le resultat.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Prix d'une rénovation par ville", item: `${siteUrl}/prix-renovation` },
      ],
    },
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/prix-renovation#page`,
      url: `${siteUrl}/prix-renovation`,
      name: "Prix d'une rénovation par ville",
      inLanguage: "fr-FR",
      description: "Coût d'une rénovation au m² selon votre ville en France.",
    },
  ],
};

export default function PrixRenovationHub() {
  const grille = prixNational();
  return (
    <div className="av-hub mx-auto max-w-3xl">
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="animate-rise">
        <p className="eyebrow">Guide des prix</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Prix d&apos;une rénovation par ville</h1>
        <p className="mt-2 text-[15px] text-muted">
          Les prix de la rénovation varient selon la région, surtout la main-d&apos;œuvre. Choisis ta ville
          pour voir les coûts au m² par type de travaux — ou lance directement ton estimation.
        </p>
        <Link href="/projets/nouveau/rapide" className="btn btn-primary mt-4 min-h-[48px] py-2.5">Estimer mes travaux →</Link>
      </header>

      <p className="mt-4 rounded-field border border-line bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-muted">
        <strong className="text-ink">Ta ville n&apos;est pas dans la liste ?</strong> C&apos;est normal, et
        c&apos;est volontaire : nous ne publions une page dédiée que là où le coût de la main-d&apos;œuvre
        s&apos;écarte réellement de la moyenne française. Partout ailleurs, cette page dirait exactement la
        même chose — autant t&apos;envoyer directement au prix national, qui s&apos;applique tel quel chez toi.{" "}
        <Link href="/methodologie" className="font-medium text-brand-600 hover:underline">
          Comment nous calculons l&apos;écart régional
        </Link>
        {" "}·{" "}
        <Link href="/projets/nouveau/rapide" className="font-medium text-brand-600 hover:underline">
          estimer avec mon code postal
        </Link>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VILLES_SEO.map((v) => (
          <Link
            key={v.slug}
            href={`/prix-renovation/${v.slug}`}
            className="card card-interactive flex items-center justify-between p-4 text-sm font-medium text-ink"
          >
            {v.nom}
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0 text-faint" aria-hidden="true">
              <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      <h2>Combien coûte une rénovation en France en 2026 ?</h2>
      <p>
        Avant de regarder le prix dans ta ville, voici le repère national. Ces montants sont calculés
        par le moteur AVYORA sur un appartement type de 70 m² et une maison type de 100 m², finition
        standard, travaux confiés à des artisans — TTC, fourchette ±15 %.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Ampleur des travaux</th><th>Appartement</th><th>Maison</th></tr></thead>
          <tbody>
            {grille.map((g) => (
              <tr key={g.v}>
                <td>{g.label}</td>
                <td className="num">{g.appartM2.toLocaleString("fr-FR")} €/m²</td>
                <td className="num">{g.maisonM2.toLocaleString("fr-FR")} €/m²</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Prix mis à jour le {PRIX_MAJ_FR} ·{" "}
        <Link href="/methodologie">comment ces prix sont établis</Link>
      </p>

      <h2>Pourquoi le prix change d&apos;une ville à l&apos;autre</h2>
      <p>
        Une rénovation, c&apos;est deux choses : des <strong>fournitures</strong> et de la{" "}
        <strong>main-d&apos;œuvre</strong>. Les fournitures s&apos;achètent à peu près au même prix
        partout en France — un sac de ciment ou un radiateur ne coûte pas deux fois plus cher parce
        qu&apos;il traverse la Loire. C&apos;est la main-d&apos;œuvre qui fait l&apos;écart : elle suit
        la tension du marché local, le coût de la vie et la disponibilité des artisans.
      </p>
      <p>
        C&apos;est pourquoi AVYORA applique un coefficient au seul coût de pose, par département.
        Il va de <strong>−10 %</strong> dans les zones rurales à <strong>+20 %</strong> à Paris et en
        petite couronne. Sur une rénovation complète de 100 m², cet écart représente plusieurs
        milliers d&apos;euros — assez pour changer un projet.
      </p>
      <p>
        Ce barème est un <strong>indice interne</strong>, pas un indice public : nous préférons
        l&apos;écrire. La{" "}
        <Link href="/methodologie">page méthodologie</Link> détaille comment il est construit et ce
        qu&apos;il ne prétend pas faire.
      </p>

      <h2>Et si ta ville n&apos;est pas dans la liste ?</h2>
      <p>
        Les {VILLES_SEO.length} villes ci-dessus sont celles où le coût de la main-d&apos;œuvre
        s&apos;écarte réellement de la moyenne. Partout ailleurs, le prix national du tableau
        s&apos;applique tel quel — une page dédiée n&apos;aurait rien de plus à t&apos;apprendre.
        L&apos;estimateur, lui, accepte <strong>n&apos;importe quel code postal français</strong> et
        applique le coefficient de ton département.
      </p>

      <h2>Aller plus loin</h2>
      <p>
        Prix au m² par type de bien :{" "}
        <Link href="/guides/prix-renovation-appartement">rénovation d&apos;appartement</Link> ·{" "}
        <Link href="/guides/prix-renovation-maison">rénovation de maison</Link>.
      </p>
      <p>
        Prix par type de travaux : <Link href="/prix-travaux">cuisine, salle de bain, toiture,
        électricité et {PROJETS.length - 4} autres postes</Link>.
      </p>
      <p>
        Guides pratiques :{" "}
        <Link href="/guides/verifier-devis-travaux">vérifier un devis de travaux</Link> ·{" "}
        <Link href="/guides/ordre-travaux-renovation">dans quel ordre faire ses travaux</Link>.
      </p>
    </div>
  );
}

const HUB_CSS = `
.av-hub h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px;letter-spacing:-.01em}
.av-hub p{font-size:15px;line-height:1.7;color:var(--color-muted);margin:10px 0}
.av-hub strong{color:var(--color-ink);font-weight:600}
.av-hub .note{font-size:12.5px;color:var(--color-faint)}
.av-hub a{color:var(--color-brand-700);font-weight:500}
.av-hub p a{text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent)}
.av-hub .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0;border:1px solid var(--color-line);border-radius:12px}
.av-hub table{width:100%;border-collapse:collapse;font-size:14px;min-width:420px}
.av-hub th{text-align:left;background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;padding:10px 12px}
.av-hub td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted)}
.av-hub td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);font-weight:600;white-space:nowrap}
@media(max-width:560px){.av-hub p{font-size:16px}}
`;

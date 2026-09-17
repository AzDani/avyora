import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "@/lib/guides";
import { PROJETS } from "@/lib/seo-projets";
import { prixNational } from "@/lib/seo-prix";
import { PRIX_MAJ_FR } from "@/lib/prix-maj";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Guides des prix de la rénovation en France (2026)",
  description:
    "Combien coûte une rénovation en 2026 ? Guides des prix au m² par type de bien, budgets chiffrés par surface et facteurs de prix.",
  alternates: { canonical: "/guides" },
};


// Fil d'Ariane balise : aide Google a comprendre la hierarchie du site et enrichit le resultat.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Guides des prix de la rénovation", item: `${siteUrl}/guides` },
      ],
    },
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/guides#page`,
      url: `${siteUrl}/guides`,
      name: "Guides des prix de la rénovation",
      inLanguage: "fr-FR",
      description: "Guides des prix de la rénovation au m² par type de bien et de travaux.",
    },
  ],
};

export default function GuidesHub() {
  const grille = prixNational();
  return (
    <div className="av-hub mx-auto max-w-3xl">
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="animate-rise">
        <p className="eyebrow">Guides des prix</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Combien coûte une rénovation en 2026 ?
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Des repères de prix au m² fiables, calculés avec le référentiel AVYORA (France 2026), par type de bien
          et par type de travaux. Puis affine gratuitement pour ton projet.
        </p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-4 py-2.5">Estimer mes travaux →</Link>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="card card-interactive flex flex-col p-5"
          >
            <span className="text-[15px] font-semibold text-ink">{g.h1.replace(" en 2026", "")}</span>
            <span className="mt-1.5 text-sm text-muted">{g.resume}</span>
            <span className="mt-3 text-sm font-medium text-brand-600">Lire le guide →</span>
          </Link>
        ))}
      </div>

      <h2>Le repère national, en un coup d&apos;œil</h2>
      <p>
        Avant d&apos;entrer dans le détail, voici l&apos;ordre de grandeur. Appartement type de 70 m²,
        maison type de 100 m², finition standard, travaux confiés à des artisans — TTC, fourchette ±15 %.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Ampleur</th><th>Appartement</th><th>Maison</th></tr></thead>
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
        <Link href="/methodologie">d&apos;où viennent ces prix</Link>
      </p>

      <h2>Trois choses à savoir avant de lire un prix au m²</h2>
      <p>
        <strong>Un prix au m² n&apos;est qu&apos;un point de départ.</strong> Deux maisons de 100 m² du
        même âge peuvent coûter du simple au double selon ce que cachent les murs : réseaux hors normes,
        humidité, plancher à reprendre. Le m² sert à cadrer un budget, pas à le figer.
      </p>
      <p>
        <strong>L&apos;ampleur pèse plus que la surface.</strong> Entre un rafraîchissement et une
        rénovation lourde, le coût au m² est multiplié par cinq environ. Avant de chercher « le prix au
        m² », il faut donc savoir ce qu&apos;on refait réellement — et c&apos;est souvent là que le
        budget se décide.
      </p>
      <p>
        <strong>La main-d&apos;œuvre décide de l&apos;écart régional.</strong> Les fournitures coûtent à
        peu près pareil partout ; la pose, non. C&apos;est pourquoi un même chantier ne se chiffre pas
        pareil à Paris et dans la Creuse — voir les{" "}
        <Link href="/prix-renovation">prix ville par ville</Link>.
      </p>

      <h2>Par où commencer selon ta situation</h2>
      <p>
        <strong>Tu veux un ordre de grandeur pour ton bien</strong> → commence par le guide{" "}
        <Link href="/guides/prix-renovation-maison">rénovation de maison</Link> ou{" "}
        <Link href="/guides/prix-renovation-appartement">rénovation d&apos;appartement</Link>.
      </p>
      <p>
        <strong>Tu as un devis sur la table</strong> → lis{" "}
        <Link href="/guides/verifier-devis-travaux">comment lire et vérifier un devis</Link> : les
        postes absents coûtent plus cher que les postes chers.
      </p>
      <p>
        <strong>Tu passes à l&apos;action</strong> →{" "}
        <Link href="/guides/ordre-travaux-renovation">dans quel ordre faire tes travaux</Link>, pour ne
        pas payer deux fois le même poste.
      </p>
      <p>
        <strong>Tu hésites à mettre la main à la pâte</strong> →{" "}
        <Link href="/guides/faire-soi-meme-ou-artisan">faire soi-même ou faire faire</Link> : la part
        de main-d&apos;œuvre lot par lot, et ce que l&apos;économie annoncée oublie.
      </p>
      <p>
        <strong>Tu cherches le prix d&apos;un travail précis</strong> → les{" "}
        <Link href="/prix-travaux">prix par type de travaux</Link> (cuisine, salle de bain, toiture,
        électricité et {PROJETS.length - 4} autres).
      </p>
    </div>
  );
}

const HUB_CSS = `
.av-hub h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px;letter-spacing:-.01em}
.av-hub p{font-size:15px;line-height:1.7;color:var(--color-muted);margin:10px 0}
.av-hub strong{color:var(--color-ink);font-weight:600}
.av-hub .note{font-size:12.5px;color:var(--color-faint)}
.av-hub p a{color:var(--color-brand-700);font-weight:500;text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent)}
.av-hub .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0;border:1px solid var(--color-line);border-radius:12px}
.av-hub table{width:100%;border-collapse:collapse;font-size:14px;min-width:420px}
.av-hub th{text-align:left;background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;padding:10px 12px}
.av-hub td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted)}
.av-hub td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);font-weight:600;white-space:nowrap}
@media(max-width:560px){.av-hub p{font-size:16px}}
`;

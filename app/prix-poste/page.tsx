import Link from "next/link";
import type { Metadata } from "next";
import { POSTES_PAGES } from "@/lib/seo-postes";
import { partMainOeuvreParLot, catalogueStats } from "@/lib/seo-prix";
import { PRIX_MAJ_FR } from "@/lib/prix-maj";

export const dynamic = "force-static";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Prix des travaux par corps d'état",
  description:
    "Le prix de chaque corps d'état, poste par poste : fourni-posé et fourniture seule, pour comprendre ce que contient une ligne de devis.",
  alternates: { canonical: "/prix-poste" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Prix par corps d'état", item: `${siteUrl}/prix-poste` },
      ],
    },
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/prix-poste#page`,
      url: `${siteUrl}/prix-poste`,
      name: "Prix des travaux par corps d'état",
      inLanguage: "fr-FR",
      description: "Prix détaillés par corps d'état, poste par poste, fourni-posé et fourniture seule.",
    },
  ],
};

export default function PrixPosteHub() {
  const stats = catalogueStats();
  const parLot = partMainOeuvreParLot();
  const dispo = new Set(POSTES_PAGES.map((p) => p.lot));

  return (
    <div className="av-hub mx-auto max-w-3xl">
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="fil">
        <Link href="/">Accueil</Link> <span aria-hidden="true">›</span> Prix par corps d&apos;état
      </p>

      <h1>Prix des travaux par corps d&apos;état</h1>
      <p className="lead">
        Une ligne de devis regroupe souvent plusieurs ouvrages qui n&apos;ont ni le même prix ni le
        même temps de pose. Ces pages ouvrent chaque corps d&apos;état poste par poste, avec le prix
        posé et le prix des seules fournitures.
      </p>
      <p className="prixmaj">
        Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link>
      </p>

      <div className="cards">
        {POSTES_PAGES.map((p) => (
          <Link key={p.slug} href={`/prix-poste/${p.slug}`} className="card">
            <span className="t">{p.h1.split(" :")[0]}</span>
            <span className="d">{p.resume}</span>
            <span className="go">Voir le détail →</span>
          </Link>
        ))}
      </div>

      <h2>Où part l&apos;argent : la part de main-d&apos;œuvre par corps d&apos;état</h2>
      <p>
        Le référentiel AVYORA compte {stats.postes} postes répartis sur {stats.lots} corps
        d&apos;état, dont {stats.avecFourniture} portent à la fois un prix posé et un prix de
        fourniture seule. L&apos;écart entre les deux, c&apos;est la main-d&apos;œuvre — et sa part
        varie énormément d&apos;un métier à l&apos;autre.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Corps d&apos;état</th><th>Part main-d&apos;œuvre</th><th>Page</th></tr></thead>
          <tbody>
            {parLot.map((l) => {
              const page = POSTES_PAGES.find((p) => p.lot === l.lot);
              return (
                <tr key={l.lot}>
                  <td>{l.lot}</td>
                  <td className="num">{l.partMO} %</td>
                  <td>{page ? <Link href={`/prix-poste/${page.slug}`}>voir</Link> : <span className="soon">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        {dispo.size} corps d&apos;état détaillés pour l&apos;instant ; les autres sont chiffrés dans
        l&apos;estimateur et dans les <Link href="/prix-travaux">pages par type de travaux</Link>.
      </p>

      <h2>Aller plus loin</h2>
      <p>
        <Link href="/guides/faire-soi-meme-ou-artisan">Faire soi-même ou faire faire</Link> : ce que
        la part de main-d&apos;œuvre change vraiment au budget ·{" "}
        <Link href="/guides/verifier-devis-travaux">vérifier un devis de travaux</Link> ·{" "}
        <Link href="/prix-travaux">prix par type de travaux</Link> ·{" "}
        <Link href="/prix-renovation">prix par ville</Link>
      </p>
    </div>
  );
}

const HUB_CSS = `
.av-hub .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:12px}
.av-hub .fil a{color:var(--color-muted)}
.av-hub h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-hub .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-hub .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-hub h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px;letter-spacing:-.01em}
.av-hub p{font-size:15px;line-height:1.7;color:var(--color-muted);margin:10px 0}
.av-hub .note{font-size:12.5px;color:var(--color-faint)}
.av-hub p a,.av-hub td a{color:var(--color-brand-700);font-weight:500}
.av-hub p a{text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent)}
.av-hub .cards{display:grid;gap:12px;margin-top:20px}
@media(min-width:640px){.av-hub .cards{grid-template-columns:1fr 1fr}}
.av-hub .card{display:flex;flex-direction:column;border:1px solid var(--color-line);border-radius:14px;padding:18px;background:var(--color-surface);text-decoration:none;transition:.15s}
.av-hub .card:hover{border-color:var(--color-brand-200)}
.av-hub .card .t{font-size:15px;font-weight:600;color:var(--color-ink)}
.av-hub .card .d{font-size:13.5px;color:var(--color-muted);margin-top:6px;line-height:1.55}
.av-hub .card .go{font-size:13.5px;font-weight:600;color:var(--color-brand-600);margin-top:12px}
.av-hub .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0;border:1px solid var(--color-line);border-radius:12px}
.av-hub table{width:100%;border-collapse:collapse;font-size:14px;min-width:420px}
.av-hub th{text-align:left;background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;padding:10px 12px}
.av-hub td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted)}
.av-hub td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);font-weight:600;white-space:nowrap}
.av-hub .soon{color:var(--color-faint)}
@media(max-width:560px){.av-hub p{font-size:16px}}
`;

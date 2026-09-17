import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { POSTES_PAGES, postePageBySlug } from "@/lib/seo-postes";
import { posteRef, partMainOeuvreParLot } from "@/lib/seo-prix";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";
import { og } from "@/lib/seo-og";
import { CtaEstimation } from "@/components/CtaEstimation";

export const dynamic = "force-static";
// Ensemble fini : tout slug hors liste renvoie un vrai 404 (pas de soft-404 à 200).
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTES_PAGES.map((p) => ({ slug: p.slug }));
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const unite = (u: string) => (u === "m2" ? "m²" : u === "u" ? "unité" : u);
const euro = (n: number) => n.toLocaleString("fr-FR") + " €";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = postePageBySlug(slug);
  if (!p) return { title: "Prix par corps d'état" };
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/prix-poste/${p.slug}` },
    openGraph: og({ title: p.title, description: p.description, path: `/prix-poste/${p.slug}` }),
  };
}

export default async function PrixPostePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = postePageBySlug(slug);
  if (!p) notFound();

  // Les prix sont LUS dans le catalogue : une révision se propage sans toucher au contenu.
  const groupes = p.groupes.map((g) => ({
    ...g,
    lignes: g.postes.map((nom) => posteRef(nom)).filter((x): x is NonNullable<typeof x> => x != null),
  }));
  const partMO = partMainOeuvreParLot().find((l) => l.lot === p.lot);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Prix par corps d'état", item: `${siteUrl}/prix-poste` },
          { "@type": "ListItem", position: 3, name: p.h1, item: `${siteUrl}/prix-poste/${p.slug}` },
        ],
      },
      {
        "@type": "Article",
        headline: p.h1,
        description: p.description,
        image: [`${siteUrl}/opengraph-image`],
        inLanguage: "fr-FR",
        datePublished: PRIX_MAJ,
        dateModified: PRIX_MAJ,
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@type": "Organization", name: "AVYORA", url: siteUrl },
        mainEntityOfPage: `${siteUrl}/prix-poste/${p.slug}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="av-poste mx-auto max-w-3xl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="fil">
        <Link href="/">Accueil</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/prix-poste">Prix par corps d&apos;état</Link>
      </p>

      <h1>{p.h1}</h1>
      <p className="lead">{p.lead}</p>
      <p className="prixmaj">
        Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link>
      </p>

      {groupes.map((g) => (
        <section key={g.titre}>
          <h2>{g.titre}</h2>
          <p>{g.intro}</p>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Poste</th><th>Fourni-posé</th><th>Fourniture seule</th></tr>
              </thead>
              <tbody>
                {g.lignes.map((l) => (
                  <tr key={l.nom}>
                    <td>{l.nom}</td>
                    <td className="num">{euro(l.fp)} / {unite(l.unite)}</td>
                    <td className="num">{l.sm != null ? `${euro(l.sm)} / ${unite(l.unite)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="note">
        Prix HT, fourni-posé, finition standard, au niveau national. La colonne « fourniture seule »
        donne le coût des matériaux si vous posez vous-même : l&apos;écart entre les deux colonnes
        correspond à la main-d&apos;œuvre.
        {partMO && (
          <> Sur ce lot, elle représente environ <strong>{partMO.partMO} %</strong> du prix posé.</>
        )}
      </p>

      {p.sections.map((s) => (
        <section key={s.titre}>
          <h2>{s.titre}</h2>
          {s.corps.map((c, i) => <p key={i}>{c}</p>)}
        </section>
      ))}

      <CtaEstimation titre="Besoin du chiffre pour ton projet ?" sousTitre="L&apos;estimation rapide est gratuite et sans inscription : quatre questions, une fourchette ajustée à ton code postal." />

      <h2>Questions fréquentes</h2>
      <div className="faq">
        {p.faq.map((f, i) => (
          <details key={i} open>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <h2>Aller plus loin</h2>
      <p>
        {p.liens.map((l, i) => (
          <span key={l.href}>{i > 0 ? " · " : ""}<Link href={l.href}>{l.texte}</Link></span>
        ))}
      </p>
      <p>
        Autres corps d&apos;état :{" "}
        {POSTES_PAGES.filter((x) => x.slug !== p.slug).map((x, i) => (
          <span key={x.slug}>{i > 0 ? " · " : ""}<Link href={`/prix-poste/${x.slug}`}>{x.h1.split(" :")[0].toLowerCase()}</Link></span>
        ))}
        {" "}· <Link href="/prix-travaux">tous les prix par type de travaux</Link>
      </p>
    </div>
  );
}

const CSS = `
.av-poste .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:12px}
.av-poste .fil a{color:var(--color-muted)}
.av-poste h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-poste .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-poste .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-poste h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:32px 0 10px;letter-spacing:-.01em}
.av-poste p{font-size:15px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-poste strong{color:var(--color-ink);font-weight:600}
.av-poste .note{font-size:12.5px;color:var(--color-faint);line-height:1.6}
.av-poste p a{color:var(--color-brand-700);font-weight:500}
.av-poste .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:12px 0;border:1px solid var(--color-line);border-radius:12px}
.av-poste table{width:100%;border-collapse:collapse;font-size:14px;min-width:460px}
.av-poste th{text-align:left;background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;padding:10px 12px}
.av-poste td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted)}
.av-poste td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);font-weight:600;white-space:nowrap}
.av-poste .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-poste .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-poste .faq p{margin:8px 0 0}
.av-poste .cta{margin:32px 0 10px;padding:20px;border:1px solid var(--color-line);border-radius:16px;background:var(--color-surface-2)}
.av-poste .cta p{margin:0 0 12px}
.av-poste .cta .btn{display:inline-flex;align-items:center;background:var(--color-brand-600);color:#fff;font-weight:600;font-size:14px;border-radius:999px;padding:11px 20px;text-decoration:none}
@media(max-width:560px){.av-poste p{font-size:16px}}
`;

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VILLES, villeBySlug } from "@/lib/villes";
import { prixVille, regionCoef } from "@/lib/seo-prix";

export const dynamic = "force-static";
// Ensemble fini de villes : tout slug hors liste renvoie un vrai 404 (pas de soft-404 à 200).
export const dynamicParams = false;

export function generateStaticParams() {
  return VILLES.map((v) => ({ ville: v.slug }));
}

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";

export async function generateMetadata({ params }: { params: Promise<{ ville: string }> }): Promise<Metadata> {
  const { ville } = await params;
  const v = villeBySlug(ville);
  if (!v) return { title: "Prix rénovation — AVYORA" };
  const grille = prixVille(v.cp);
  const complete = grille.find((g) => g.v === "complete")?.appartM2 ?? 0;
  return {
    title: `Prix rénovation à ${v.nom} (2026) — coût au m² | AVYORA`,
    description: `Combien coûte une rénovation à ${v.nom} ? Prix au m² par type de travaux : à partir de ${euro(complete)}/m² pour une réno complète. Estimation gratuite en 3 minutes.`,
    alternates: { canonical: `/prix-renovation/${v.slug}` },
  };
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px}
.av-seo p{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-seo strong{color:var(--color-ink);font-weight:600}
.av-seo table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
.av-seo th,.av-seo td{border:1px solid var(--color-line);padding:10px 12px;text-align:left}
.av-seo th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.av-seo td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink)}
.av-seo .faq{margin-top:10px}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-seo .faq p{margin:8px 0 0}
.av-seo .villes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .villes a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .villes a:hover{background:var(--color-brand-100)}
`;

export default async function PrixVille({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const v = villeBySlug(ville);
  if (!v) notFound();

  const grille = prixVille(v.cp);
  const reg = regionCoef(v.cp);
  const moPct = Math.round((reg.mo - 1) * 100);
  const complete = grille.find((g) => g.v === "complete")!;
  const partielle = grille.find((g) => g.v === "partielle")!;
  const lourde = grille.find((g) => g.v === "lourde")!;
  const totalCompletAppart = complete.appartM2 * 70;

  const coefPhrase =
    moPct > 0
      ? `la main-d'œuvre y est environ ${moPct} % plus chère que la moyenne nationale`
      : moPct < 0
        ? `la main-d'œuvre y est environ ${Math.abs(moPct)} % moins chère que la moyenne nationale`
        : `la main-d'œuvre y est dans la moyenne nationale`;

  const faq = [
    {
      q: `Combien coûte une rénovation complète à ${v.nom} ?`,
      a: `Comptez environ ${euro(complete.appartM2)}/m² pour un appartement, soit à peu près ${euro(totalCompletAppart)} pour 70 m² (fourchette ±15 %, finition standard, travaux confiés à des artisans).`,
    },
    {
      q: `Pourquoi les prix diffèrent-ils à ${v.nom} ?`,
      a: `Les fournitures sont à un prix national, mais la main-d'œuvre varie selon la zone : à ${v.nom} (${reg.zone}), ${coefPhrase}.`,
    },
    {
      q: `Rénover un appartement ou une maison, quelle différence de prix ?`,
      a: `La maison porte des postes que l'appartement n'a pas (toiture, façade, charpente), donc son coût au m² est généralement plus élevé sur les rénovations lourdes.`,
    },
    {
      q: `Comment obtenir une estimation précise pour mon bien à ${v.nom} ?`,
      a: `Utilisez l'estimateur AVYORA : en 3 minutes, vous obtenez une fourchette chiffrée adaptée à votre surface, vos travaux et votre code postal.`,
    },
  ];

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Prix rénovation par ville", item: `${siteUrl}/prix-renovation` },
          { "@type": "ListItem", position: 3, name: v.nom, item: `${siteUrl}/prix-renovation/${v.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-4 text-[13px]">
        <Link href="/prix-renovation" className="text-muted hover:text-brand-700">← Prix rénovation par ville</Link>
      </p>

      <h1>Prix d&apos;une rénovation à {v.nom} en 2026</h1>
      <p className="lead">
        À {v.nom} ({reg.zone}), une <strong>rénovation complète</strong> coûte en moyenne{" "}
        <strong>{euro(complete.appartM2)}/m²</strong> pour un appartement — de{" "}
        <strong>{euro(partielle.appartM2)}/m²</strong> pour une réno partielle à{" "}
        <strong>{euro(lourde.maisonM2)}/m²</strong> pour une réno lourde de maison. Ici, {coefPhrase}.
      </p>

      <h2>Prix au m² par type de travaux à {v.nom}</h2>
      <table>
        <thead>
          <tr><th>Type de travaux</th><th>Appartement (€/m²)</th><th>Maison (€/m²)</th></tr>
        </thead>
        <tbody>
          {grille.map((g) => (
            <tr key={g.v}>
              <td>{g.label}</td>
              <td className="num">{euro(g.appartM2)}</td>
              <td className="num">{euro(g.maisonM2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12.5, color: "var(--color-faint)" }}>
        Prix TTC indicatifs, travaux confiés à des artisans, finition standard, marge ±15 %. Base :
        appartement 70 m² / maison 100 m². À affiner selon l&apos;état du bien.
      </p>

      <h2>Pourquoi ces prix à {v.nom} ?</h2>
      <p>
        Le coût d&apos;une rénovation dépend surtout de deux choses : le <strong>prix des matériaux</strong>{" "}
        (globalement national) et le <strong>coût de la main-d&apos;œuvre</strong>, qui varie selon la région.
        À {v.nom} (zone « {reg.zone} »), {coefPhrase}. C&apos;est pourquoi AVYORA ajuste automatiquement
        l&apos;estimation à ton code postal.
      </p>

      <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
        <p className="font-semibold text-ink">Estime ton projet à {v.nom} en 3 minutes</p>
        <p className="mt-1 text-sm text-muted">Gratuit, sans inscription — une fourchette chiffrée adaptée à ton bien.</p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-3 py-2.5">Estimer mes travaux →</Link>
      </div>

      <h2>Questions fréquentes</h2>
      <div className="faq">
        {faq.map((f, i) => (
          <details key={i} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <h2>Aller plus loin</h2>
      <p>
        Prix au m² par type de bien :{" "}
        <Link href="/guides/prix-renovation-appartement" className="font-medium text-brand-600 hover:underline">rénovation d&apos;appartement</Link>{" "}
        ·{" "}
        <Link href="/guides/prix-renovation-maison" className="font-medium text-brand-600 hover:underline">rénovation de maison</Link>.
      </p>

      <h2>Prix rénovation dans d&apos;autres villes</h2>
      <div className="villes">
        {VILLES.filter((x) => x.slug !== v.slug).slice(0, 16).map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
      </div>
    </div>
  );
}

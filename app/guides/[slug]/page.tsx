import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { VILLES } from "@/lib/villes";
import { prixNational, estim } from "@/lib/seo-prix";

export const dynamic = "force-static";
// Ensemble fini de pages : tout slug hors liste renvoie un vrai 404 (pas de soft-404 à 200).
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";
/** Fourchette ±15 % arrondie à la centaine, pour les exemples chiffrés. */
const four = (ttc: number) => {
  const r = (n: number) => Math.round(n / 100) * 100;
  return { lo: r(ttc * 0.85), hi: r(ttc * 1.15) };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return { title: "Guide des prix — AVYORA" };
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `${siteUrl}/guides/${g.slug}` },
  };
}

const CSS = `
.av-guide{max-width:760px;margin:0 auto}
.av-guide h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-guide .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-guide h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px}
.av-guide h3{font-size:15.5px;font-weight:600;color:var(--color-ink);margin:20px 0 6px}
.av-guide p{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-guide strong{color:var(--color-ink);font-weight:600}
.av-guide ul{margin:10px 0;padding-left:18px}
.av-guide li{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:5px 0}
.av-guide table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
.av-guide th,.av-guide td{border:1px solid var(--color-line);padding:10px 12px;text-align:left}
.av-guide th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.av-guide td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink)}
.av-guide .note{font-size:12.5px;color:var(--color-faint)}
.av-guide .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-guide .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-guide .faq p{margin:8px 0 0}
.av-guide .villes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-guide .villes a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-guide .villes a:hover{background:var(--color-brand-100)}
`;

function Cta({ label }: { label: string }) {
  return (
    <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-1 text-sm text-muted">Gratuit, sans inscription — une fourchette chiffrée adaptée à ton bien et ton code postal.</p>
      <Link href="/projets/nouveau" className="btn btn-primary mt-3 py-2.5">Estimer mes travaux →</Link>
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <>
      <h2>Questions fréquentes</h2>
      <div className="faq">
        {items.map((f, i) => (
          <details key={i} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}

function VillesLink() {
  return (
    <>
      <h2>Prix de la rénovation ville par ville</h2>
      <p>
        La main-d&apos;œuvre varie selon la région. Consulte le prix ajusté à ta ville :
      </p>
      <div className="villes">
        {VILLES.slice(0, 16).map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href="/prix-renovation">Toutes les villes →</Link>
      </div>
    </>
  );
}

/** Corps « appartement ». */
function BodyAppartement() {
  const grille = prixNational();
  const g = (v: string) => grille.find((x) => x.v === v)!;
  const complete = g("complete");
  const exemples = [
    { label: "Studio / T2", surface: 45 },
    { label: "T3", surface: 70 },
    { label: "T4", surface: 90 },
  ].map((e) => ({ ...e, ...estim("", "T3", e.surface, "complete") }));

  const faq = [
    {
      q: "Combien coûte la rénovation complète d'un appartement au m² ?",
      a: `En moyenne nationale, comptez environ ${euro(complete.appartM2)}/m² pour une rénovation complète d'appartement (finition standard, travaux confiés à des artisans), soit une fourchette de ±15 % selon l'état du bien.`,
    },
    {
      q: "Rafraîchissement ou rénovation complète : quelle différence de prix ?",
      a: `Un simple rafraîchissement (peinture + sols) tourne autour de ${euro(g("rafraich").appartM2)}/m², contre ${euro(complete.appartM2)}/m² pour une réno complète (électricité, plomberie, cloisons, cuisine, SDB refaits).`,
    },
    {
      q: "Qu'est-ce qui fait grimper la facture ?",
      a: "Le niveau de finition (premium ≈ +25 à +40 %), l'état initial (réseaux hors normes, humidité), la redistribution des pièces (abattre des murs), et la région (main-d'œuvre).",
    },
    {
      q: "Comment avoir un chiffre précis pour mon appartement ?",
      a: "Utilise l'estimateur AVYORA : en 3 minutes, tu obtiens une fourchette chiffrée adaptée à ta surface, tes travaux et ton code postal.",
    },
  ];

  return (
    <>
      <p className="lead">
        En 2026, rénover un appartement coûte en moyenne <strong>{euro(g("rafraich").appartM2)}/m²</strong> pour un
        rafraîchissement et jusqu&apos;à <strong>{euro(complete.appartM2)}/m²</strong> pour une{" "}
        <strong>rénovation complète</strong> (finition standard, tout confié à des artisans). Le prix dépend surtout de
        l&apos;ampleur des travaux, de la finition et de la région.
      </p>

      <h2>Prix au m² d&apos;une rénovation d&apos;appartement par ampleur</h2>
      <table>
        <thead>
          <tr><th>Ampleur des travaux</th><th>Prix au m² (TTC)</th></tr>
        </thead>
        <tbody>
          {grille.map((l) => (
            <tr key={l.v}><td>{l.label}</td><td className="num">{euro(l.appartM2)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="note">Prix TTC indicatifs, moyenne nationale, finition standard, marge ±15 %. Base : appartement 70 m².</p>

      <h2>Exemples chiffrés par surface (rénovation complète)</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Surface</th><th>Budget estimé (TTC)</th></tr>
        </thead>
        <tbody>
          {exemples.map((e) => {
            const f = four(e.ttc);
            return (
              <tr key={e.label}>
                <td>{e.label}</td>
                <td className="num">{e.surface} m²</td>
                <td className="num">{euro(f.lo)} – {euro(f.hi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">Fourchettes ±15 %, rénovation complète, finition standard, artisans. À affiner selon l&apos;état réel.</p>

      <Cta label="Estime ton appartement en 3 minutes" />

      <h2>Ce qui est inclus selon l&apos;ampleur</h2>
      <ul>
        <li><strong>Rafraîchissement</strong> — peinture murs/plafonds, sols (stratifié, PVC), petites reprises.</li>
        <li><strong>Réno partielle</strong> — le rafraîchissement + cuisine ou salle de bain, carrelage, quelques fenêtres, mise aux normes du tableau électrique.</li>
        <li><strong>Réno complète</strong> — tous les lots refaits : électricité complète, plomberie, cloisons/plâtrerie, chauffage/VMC, portes, cuisine et SDB — distribution conservée.</li>
        <li><strong>Réno totale</strong> — mise à nu (curage) puis redistribution des pièces et tout à neuf.</li>
      </ul>

      <h2>Ce qui fait varier le prix</h2>
      <p>
        À surface égale, deux appartements peuvent afficher des budgets très différents. Les principaux facteurs :
        le <strong>niveau de finition</strong> (le premium ajoute facilement 25 à 40 %), l&apos;<strong>état initial</strong>{" "}
        (réseaux vétustes, humidité, amiante avant 1997), la <strong>redistribution</strong> (abattre des cloisons ou un
        mur porteur), et la <strong>région</strong>.
      </p>

      <VillesLink />

      <h2>Et une maison ?</h2>
      <p>
        La maison porte des postes que l&apos;appartement n&apos;a pas (toiture, façade, charpente).{" "}
        <Link href="/guides/prix-renovation-maison" className="font-medium text-brand-600 hover:underline">
          Voir le prix d&apos;une rénovation de maison au m²
        </Link>.
      </p>

      <Faq items={faq} />
    </>
  );
}

/** Corps « maison ». */
function BodyMaison() {
  const grille = prixNational();
  const g = (v: string) => grille.find((x) => x.v === v)!;
  const complete = g("complete");
  const lourde = g("lourde");
  const exemples = [
    { label: "Maison de plain-pied", surface: 100, ampleur: "complete" as const },
    { label: "Maison à étage", surface: 150, ampleur: "complete" as const },
    { label: "Maison ancienne (réno lourde)", surface: 120, ampleur: "lourde" as const },
  ].map((e) => ({ ...e, ...estim("", "Maison", e.surface, e.ampleur) }));

  const faq = [
    {
      q: "Combien coûte la rénovation complète d'une maison au m² ?",
      a: `En moyenne nationale, comptez environ ${euro(complete.maisonM2)}/m² pour une rénovation complète de maison, et jusqu'à ${euro(lourde.maisonM2)}/m² pour une rénovation lourde (avec enveloppe : toiture, façade, charpente).`,
    },
    {
      q: "Pourquoi une maison coûte-t-elle plus cher qu'un appartement au m² ?",
      a: "Parce qu'elle porte l'enveloppe complète : toiture, façade, charpente, isolation des combles, menuiseries extérieures plus nombreuses — des postes absents en appartement (gérés par la copropriété).",
    },
    {
      q: "Quel budget pour rénover une maison ancienne ?",
      a: `Une maison ancienne cumule souvent isolation à reprendre, réseaux à refaire et parfois humidité/assainissement : on est plutôt sur une réno lourde, autour de ${euro(lourde.maisonM2)}/m².`,
    },
    {
      q: "Comment obtenir un chiffre précis pour ma maison ?",
      a: "L'estimateur AVYORA calcule une fourchette adaptée à ta surface, ton type de travaux et ton code postal en 3 minutes.",
    },
  ];

  return (
    <>
      <p className="lead">
        En 2026, rénover une maison coûte en moyenne <strong>{euro(complete.maisonM2)}/m²</strong> pour une{" "}
        <strong>rénovation complète</strong>, et jusqu&apos;à <strong>{euro(lourde.maisonM2)}/m²</strong> pour une{" "}
        <strong>rénovation lourde</strong> incluant l&apos;enveloppe (toiture, façade, charpente). Plus cher qu&apos;un
        appartement, car la maison porte tout le bâti.
      </p>

      <h2>Prix au m² d&apos;une rénovation de maison par ampleur</h2>
      <table>
        <thead>
          <tr><th>Ampleur des travaux</th><th>Prix au m² (TTC)</th></tr>
        </thead>
        <tbody>
          {grille.map((l) => (
            <tr key={l.v}><td>{l.label}</td><td className="num">{euro(l.maisonM2)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="note">Prix TTC indicatifs, moyenne nationale, finition standard, marge ±15 %. Base : maison 100 m².</p>

      <h2>Exemples chiffrés</h2>
      <table>
        <thead>
          <tr><th>Cas</th><th>Surface</th><th>Budget estimé (TTC)</th></tr>
        </thead>
        <tbody>
          {exemples.map((e) => {
            const f = four(e.ttc);
            return (
              <tr key={e.label}>
                <td>{e.label}</td>
                <td className="num">{e.surface} m²</td>
                <td className="num">{euro(f.lo)} – {euro(f.hi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">Fourchettes ±15 %, finition standard, artisans. À affiner selon l&apos;état réel du bien.</p>

      <Cta label="Estime ta maison en 3 minutes" />

      <h2>Les postes spécifiques à la maison</h2>
      <p>Ce sont eux qui creusent l&apos;écart avec l&apos;appartement, surtout en rénovation lourde :</p>
      <ul>
        <li><strong>Toiture</strong> — réfection de couverture, démoussage, gouttières.</li>
        <li><strong>Charpente</strong> — traitement ou remplacement.</li>
        <li><strong>Façade</strong> — enduit, crépi, peinture, parfois isolation extérieure (ITE).</li>
        <li><strong>Isolation des combles</strong> — le meilleur rapport gain/€ sur une maison.</li>
        <li><strong>Menuiseries extérieures</strong> — plus nombreuses qu&apos;en appartement.</li>
      </ul>

      <h2>Cas de la maison ancienne</h2>
      <p>
        Une maison ancienne (avant 1975, souvent non isolée) cumule les chantiers : <strong>isolation</strong> à reprendre,{" "}
        <strong>réseaux</strong> électriques et de plomberie à refaire, parfois <strong>humidité</strong> ou assainissement.
        On bascule vite sur une réno lourde — mais c&apos;est aussi là que les <strong>aides</strong> (MaPrimeRénov&apos;,
        CEE) réduisent le plus la note sur les postes énergétiques.
      </p>

      <VillesLink />

      <h2>Et un appartement ?</h2>
      <p>
        <Link href="/guides/prix-renovation-appartement" className="font-medium text-brand-600 hover:underline">
          Voir le prix d&apos;une rénovation d&apos;appartement au m²
        </Link>.
      </p>

      <Faq items={faq} />
    </>
  );
}

const BODIES: Record<string, () => React.ReactElement> = {
  "prix-renovation-appartement": BodyAppartement,
  "prix-renovation-maison": BodyMaison,
};

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  const Body = BODIES[slug];
  if (!g || !Body) notFound();

  // Reconstitue la FAQ pour le JSON-LD (identique à celle rendue par le corps).
  const grille = prixNational();
  const cpl = grille.find((x) => x.v === "complete")!;
  const raf = grille.find((x) => x.v === "rafraich")!;
  const lourde = grille.find((x) => x.v === "lourde")!;
  const faq =
    slug === "prix-renovation-appartement"
      ? [
          { q: "Combien coûte la rénovation complète d'un appartement au m² ?", a: `En moyenne nationale, environ ${euro(cpl.appartM2)}/m² (finition standard, artisans), fourchette ±15 %.` },
          { q: "Rafraîchissement ou rénovation complète : quelle différence de prix ?", a: `Un rafraîchissement tourne autour de ${euro(raf.appartM2)}/m², contre ${euro(cpl.appartM2)}/m² pour une réno complète.` },
          { q: "Qu'est-ce qui fait grimper la facture ?", a: "La finition, l'état initial, la redistribution des pièces et la région." },
          { q: "Comment avoir un chiffre précis pour mon appartement ?", a: "L'estimateur AVYORA donne une fourchette adaptée en 3 minutes." },
        ]
      : [
          { q: "Combien coûte la rénovation complète d'une maison au m² ?", a: `Environ ${euro(cpl.maisonM2)}/m² pour une réno complète, jusqu'à ${euro(lourde.maisonM2)}/m² en réno lourde (enveloppe comprise).` },
          { q: "Pourquoi une maison coûte-t-elle plus cher au m² ?", a: "Elle porte l'enveloppe : toiture, façade, charpente, combles, plus de menuiseries." },
          { q: "Quel budget pour rénover une maison ancienne ?", a: `Plutôt une réno lourde, autour de ${euro(lourde.maisonM2)}/m².` },
          { q: "Comment obtenir un chiffre précis ?", a: "L'estimateur AVYORA calcule une fourchette adaptée en 3 minutes." },
        ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.h1,
        description: g.description,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/guides/${g.slug}`,
        datePublished: "2026-09-06",
        dateModified: "2026-09-06",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl}/guides` },
          { "@type": "ListItem", position: 3, name: g.h1, item: `${siteUrl}/guides/${g.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="av-guide">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-4 text-[13px]">
        <Link href="/guides" className="text-muted hover:text-brand-700">← Guides des prix</Link>
      </p>

      <h1>{g.h1}</h1>
      <Body />
    </div>
  );
}

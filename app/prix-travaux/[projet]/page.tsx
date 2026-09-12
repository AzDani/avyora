import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROJETS, projetBySlug, estimProjet, MATRIX_SLUGS } from "@/lib/seo-projets";
import { VILLES } from "@/lib/villes";

export const dynamic = "force-static";
// Ensemble fini de pages : tout slug hors liste renvoie un vrai 404 (pas de soft-404 à 200).
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJETS.map((p) => ({ projet: p.slug }));
}

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";
/** Fourchette ±15 % arrondie à la centaine. */
const four = (ttc: number) => {
  const r = (n: number) => Math.round(n / 100) * 100;
  return { lo: r(ttc * 0.85), hi: r(ttc * 1.15) };
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Villes-repères pour la variation régionale (code postal → moteur).
const REGIONS = [
  { nom: "Moyenne France", cp: "" },
  { nom: "Paris", cp: "75001" },
  { nom: "Lyon", cp: "69001" },
  { nom: "Bordeaux", cp: "33000" },
  { nom: "Lille", cp: "59000" },
];

export async function generateMetadata({ params }: { params: Promise<{ projet: string }> }): Promise<Metadata> {
  const { projet } = await params;
  const p = projetBySlug(projet);
  if (!p) return { title: "Prix des travaux — AVYORA" };
  const { ttc } = estimProjet(p, "");
  const f = four(ttc);
  return {
    title: `${p.h1.replace(" en 2026", "")} — coût moyen 2026`,
    description: `Combien coûte ${p.nom} ? Budget moyen ${euro(f.lo)} à ${euro(f.hi)}, détaillé poste par poste. Estimation gratuite adaptée à ton bien en 3 minutes.`,
    alternates: { canonical: `/prix-travaux/${p.slug}` },
    openGraph: { type: "article", title: p.h1, description: `Combien coûte ${p.nom} ? Budget détaillé poste par poste.`, url: `${siteUrl}/prix-travaux/${p.slug}` },
  };
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px}
.av-seo p{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-seo strong{color:var(--color-ink);font-weight:600}
.av-seo ul{margin:10px 0;padding-left:18px}
.av-seo li{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:5px 0}
.av-seo table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
.av-seo th,.av-seo td{border:1px solid var(--color-line);padding:9px 12px;text-align:left}
.av-seo th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.av-seo td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);white-space:nowrap}
.av-seo tr.lot td{background:var(--color-brand-50);font-weight:600;color:var(--color-ink)}
.av-seo tr.lot td.num{color:var(--color-brand-700)}
.av-seo tr.line td:first-child{padding-left:22px;color:var(--color-muted)}
.av-seo .big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:6px 0 2px}
.av-seo .big .v{font-family:var(--font-geist-mono),monospace;font-size:30px;font-weight:700;color:var(--color-ink);letter-spacing:-.02em}
.av-seo .big .sub{font-size:13px;color:var(--color-faint)}
.av-seo .note{font-size:12.5px;color:var(--color-faint)}
.av-seo .astuce{border-left:3px solid var(--color-brand-600);background:var(--color-brand-50);border-radius:0 10px 10px 0;padding:12px 16px;margin:16px 0;font-size:14px;color:var(--color-ink)}
.av-seo .astuce b{color:var(--color-brand-700)}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-seo .faq p{margin:8px 0 0}
.av-seo .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .chips a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .chips a:hover{background:var(--color-brand-100)}
`;

export default async function PrixTravaux({ params }: { params: Promise<{ projet: string }> }) {
  const { projet } = await params;
  const p = projetBySlug(projet);
  if (!p) notFound();

  const est = estimProjet(p, "");
  const f = four(est.ttc);
  const m2 = est.surface > 0 ? Math.round(est.ttc / est.surface) : 0;
  const regions = REGIONS.map((r) => ({ ...r, ttc: estimProjet(p, r.cp).ttc }));

  const faq = [
    {
      q: `Combien coûte ${p.nom} en 2026 ?`,
      a: `Comptez en moyenne ${euro(f.lo)} à ${euro(f.hi)} pour ${p.base} (finition standard, travaux confiés à des artisans, marge ±15 %). Le prix exact dépend de la surface, des équipements et de la région.`,
    },
    {
      q: `Qu'est-ce qui fait varier le prix ?`,
      a: `${p.facteurs.slice(0, 3).join(" ")} La main-d'œuvre varie aussi selon la région.`,
    },
    {
      q: `Le budget change-t-il selon la ville ?`,
      a: `Oui : les fournitures sont à un prix national, mais la main-d'œuvre varie. Pour ${p.base}, comptez environ ${euro(regions.find((r) => r.nom === "Paris")!.ttc)} à Paris contre ${euro(regions.find((r) => r.nom === "Moyenne France")!.ttc)} en moyenne nationale.`,
    },
    {
      q: `Comment obtenir un chiffre précis pour mon projet ?`,
      a: `Utilise l'estimateur AVYORA : en 3 minutes, tu obtiens une fourchette chiffrée adaptée à ta surface, tes travaux et ton code postal.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: p.h1,
        description: `Prix de ${p.nom} en 2026, détaillé poste par poste.`,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/prix-travaux/${p.slug}`,
        datePublished: "2026-09-12",
        dateModified: "2026-09-12",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Prix des travaux", item: `${siteUrl}/prix-travaux` },
          { "@type": "ListItem", position: 3, name: p.titre, item: `${siteUrl}/prix-travaux/${p.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-4 text-[13px]">
        <Link href="/prix-travaux" className="text-muted hover:text-brand-700">← Prix des travaux par type</Link>
      </p>

      <h1>{p.emoji} {p.h1}</h1>
      <p className="lead">{p.lead}</p>

      <div className="big">
        <span className="v">{euro(f.lo)} – {euro(f.hi)}</span>
        <span className="sub">budget moyen · {p.base}</span>
      </div>
      <p className="note">Prix TTC indicatifs, finition standard, travaux confiés à des artisans, marge ±15 %{m2 > 0 ? ` — soit environ ${euro(m2)}/m²` : ""}. Base de calcul : moteur AVYORA.</p>

      <h2>Le détail du budget, poste par poste</h2>
      <p>Voici comment se répartit le budget pour {p.base}, corps d&apos;état par corps d&apos;état :</p>
      <table>
        <thead>
          <tr><th>Poste</th><th>Quantité</th><th>Budget (TTC)</th></tr>
        </thead>
        <tbody>
          {est.lots.map((lot) => (
            <Fragment key={lot.corps}>
              <tr className="lot">
                <td>{lot.corps}</td>
                <td></td>
                <td className="num">{euro(lot.ttc)}</td>
              </tr>
              {lot.lignes.map((li, i) => (
                <tr className="line" key={lot.corps + i}>
                  <td>{li.nom}</td>
                  <td className="num" style={{ textAlign: "left", fontFamily: "inherit", color: "var(--color-faint)" }}>{li.qty} {li.unite}</td>
                  <td className="num">{euro(li.ttc)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
          <tr className="lot">
            <td>Total estimé</td>
            <td></td>
            <td className="num">{euro(est.ttc)}</td>
          </tr>
        </tbody>
      </table>
      <p className="note">Panier représentatif calculé par le moteur AVYORA (le même que l&apos;estimateur). Ton projet réel s&apos;ajuste selon tes choix.</p>

      <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
        <p className="font-semibold text-ink">Estime ton projet en 3 minutes</p>
        <p className="mt-1 text-sm text-muted">Gratuit, sans inscription — une fourchette chiffrée adaptée à ton bien et ton code postal.</p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-3 py-2.5">Estimer mes travaux →</Link>
      </div>

      <h2>Ce qui est compris</h2>
      <ul>{p.inclus.map((x, i) => <li key={i}>{x}</li>)}</ul>

      <h2>Ce qui fait varier le prix</h2>
      <ul>{p.facteurs.map((x, i) => <li key={i}>{x}</li>)}</ul>

      <div className="astuce"><b>Astuce :</b> {p.astuce}</div>

      {p.aides && (
        <>
          <h2>Aides financières</h2>
          <p>{p.aides}</p>
        </>
      )}

      <h2>Prix selon la région</h2>
      <p>Les fournitures sont à un prix national, mais le coût de la main-d&apos;œuvre change selon la zone. Pour {p.base} :</p>
      <table>
        <thead>
          <tr><th>Zone</th><th>Budget estimé (TTC)</th></tr>
        </thead>
        <tbody>
          {regions.map((r) => {
            const rf = four(r.ttc);
            return (
              <tr key={r.nom}>
                <td>{r.nom}</td>
                <td className="num">{euro(rf.lo)} – {euro(rf.hi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">Fourchettes ±15 %. Consulte le prix ajusté à ta ville ci-dessous.</p>

      {MATRIX_SLUGS.has(p.slug) && (
        <>
          <h2>Prix {p.titre} ville par ville</h2>
          <p>Le prix exact dépend du coût de la main-d&apos;œuvre locale. Consulte la page dédiée à ta ville :</p>
          <div className="chips">
            {VILLES.slice(0, 24).map((x) => (
              <Link key={x.slug} href={`/prix-travaux/${p.slug}/${x.slug}`}>{x.nom}</Link>
            ))}
          </div>
        </>
      )}

      <h2>Questions fréquentes</h2>
      <div className="faq">
        {faq.map((x, i) => (
          <details key={i} open={i === 0}>
            <summary>{x.q}</summary>
            <p>{x.a}</p>
          </details>
        ))}
      </div>

      <h2>Autres types de travaux</h2>
      <div className="chips">
        {p.liens.map((slug) => {
          const rp = projetBySlug(slug);
          return rp ? <Link key={slug} href={`/prix-travaux/${slug}`}>{rp.emoji} {rp.titre}</Link> : null;
        })}
        <Link href="/prix-travaux">Tous les travaux →</Link>
      </div>

      <h2>Prix de la rénovation dans ta ville</h2>
      <p>La main-d&apos;œuvre varie selon la région. Consulte le prix ajusté à ta ville :</p>
      <div className="chips">
        {VILLES.slice(0, 14).map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href="/prix-renovation">Toutes les villes →</Link>
      </div>

      <h2>Aller plus loin</h2>
      <p>
        Prix par type de bien :{" "}
        <Link href="/guides/prix-renovation-appartement" className="font-medium text-brand-600 hover:underline">rénovation d&apos;appartement</Link>{" "}
        ·{" "}
        <Link href="/guides/prix-renovation-maison" className="font-medium text-brand-600 hover:underline">rénovation de maison</Link>.
      </p>
    </div>
  );
}

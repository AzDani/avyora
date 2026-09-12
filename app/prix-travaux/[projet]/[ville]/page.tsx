import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projetBySlug, projetsMatrix, estimProjet, MATRIX_SLUGS } from "@/lib/seo-projets";
import { VILLES, villeBySlug } from "@/lib/villes";
import { deptInfo } from "@/lib/geo";
import { regionCoef } from "@/lib/estimateur";

export const dynamic = "force-static";
export const dynamicParams = false;

/** Nombre de villes déclinées par projet (les plus gros volumes de recherche). */
const MATRIX_CITY_COUNT = 40;
const MATRIX_VILLES = VILLES.slice(0, MATRIX_CITY_COUNT);

export function generateStaticParams() {
  const out: { projet: string; ville: string }[] = [];
  for (const p of projetsMatrix()) {
    for (const v of MATRIX_VILLES) out.push({ projet: p.slug, ville: v.slug });
  }
  return out;
}

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";
const four = (ttc: number) => {
  const r = (n: number) => Math.round(n / 100) * 100;
  return { lo: r(ttc * 0.85), hi: r(ttc * 1.15) };
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const titreSansPrefixe = (h1: string) =>
  h1.replace("Prix d'une ", "").replace("Prix d'un ", "").replace("Prix pour ", "").replace("Prix de ", "").replace("Prix ", "").replace(" en 2026", "");

export async function generateMetadata({ params }: { params: Promise<{ projet: string; ville: string }> }): Promise<Metadata> {
  const { projet, ville } = await params;
  const p = projetBySlug(projet);
  const v = villeBySlug(ville);
  if (!p || !v) return { title: "Prix des travaux — AVYORA" };
  const { ttc } = estimProjet(p, v.cp);
  const f = four(ttc);
  const sujet = titreSansPrefixe(p.h1);
  return {
    title: `Prix ${sujet} à ${v.nom} (2026)`,
    description: `Combien coûte ${p.nom} à ${v.nom} ? Budget ${euro(f.lo)} à ${euro(f.hi)}, ajusté au coût de la main-d'œuvre locale, détaillé poste par poste. Estimation gratuite en 3 minutes.`,
    alternates: { canonical: `/prix-travaux/${p.slug}/${v.slug}` },
    openGraph: { type: "article", title: `Prix ${sujet} à ${v.nom}`, description: `Budget détaillé poste par poste à ${v.nom}.`, url: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}` },
  };
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(23px,4vw,31px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
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

export default async function PrixTravauxVille({ params }: { params: Promise<{ projet: string; ville: string }> }) {
  const { projet, ville } = await params;
  const p = projetBySlug(projet);
  const v = villeBySlug(ville);
  if (!p || !v) notFound();

  const est = estimProjet(p, v.cp);
  const estNat = estimProjet(p, "");
  const f = four(est.ttc);
  const reg = regionCoef(v.cp);
  const dep = deptInfo(v.cp);
  const moPct = Math.round((reg.mo - 1) * 100);
  const sujet = titreSansPrefixe(p.h1);
  const ecart = est.ttc - estNat.ttc;

  const coefPhrase =
    moPct > 0
      ? `la main-d'œuvre y est environ ${moPct} % plus chère que la moyenne nationale`
      : moPct < 0
        ? `la main-d'œuvre y est environ ${Math.abs(moPct)} % moins chère que la moyenne nationale`
        : `la main-d'œuvre y est dans la moyenne nationale`;

  const faq = [
    {
      q: `Combien coûte ${p.nom} à ${v.nom} en 2026 ?`,
      a: `À ${v.nom}, comptez en moyenne ${euro(f.lo)} à ${euro(f.hi)} pour ${p.base} (finition standard, artisans, marge ±15 %). Ce budget tient compte du coût local de la main-d'œuvre.`,
    },
    {
      q: `Pourquoi le prix est-il différent à ${v.nom} ?`,
      a: `Les fournitures sont à un prix national, mais la main-d'œuvre varie selon la zone. À ${v.nom} (zone « ${reg.zone} »), ${coefPhrase}.`,
    },
    {
      q: `Qu'est-ce qui fait varier ce budget ?`,
      a: `${p.facteurs.slice(0, 3).join(" ")}`,
    },
    {
      q: `Comment obtenir un chiffre précis pour mon projet à ${v.nom} ?`,
      a: `Utilise l'estimateur AVYORA : en 3 minutes, tu obtiens une fourchette adaptée à ta surface, tes travaux et ton code postal (${v.cp.slice(0, 2)}...).`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `Prix ${sujet} à ${v.nom} en 2026`,
        description: `Prix de ${p.nom} à ${v.nom}, ajusté à la main-d'œuvre locale et détaillé poste par poste.`,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}`,
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
          { "@type": "ListItem", position: 4, name: v.nom, item: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}` },
        ],
      },
    ],
  };

  const autresVilles = MATRIX_VILLES.filter((x) => x.slug !== v.slug).slice(0, 14);

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-4 text-[13px]">
        <Link href={`/prix-travaux/${p.slug}`} className="text-muted hover:text-brand-700">← {p.emoji} {sujet.charAt(0).toUpperCase() + sujet.slice(1)}</Link>
      </p>

      <h1>{p.emoji} Prix {sujet} à {v.nom} en 2026</h1>
      <p className="lead">
        À {dep.nom ? `${v.nom} (${dep.num} · ${dep.nom})` : v.nom}{dep.region ? `, en ${dep.region}` : ""}, {p.lead.charAt(0).toLowerCase() + p.lead.slice(1)}
      </p>

      <div className="big">
        <span className="v">{euro(f.lo)} – {euro(f.hi)}</span>
        <span className="sub">budget moyen à {v.nom} · {p.base}</span>
      </div>
      <p className="note">
        Prix TTC indicatifs, finition standard, artisans, marge ±15 %. Zone « {reg.zone} » : {coefPhrase}.
        {ecart !== 0 ? ` Soit ${ecart > 0 ? "environ " + euro(Math.abs(ecart)) + " de plus" : "environ " + euro(Math.abs(ecart)) + " de moins"} qu'en moyenne nationale.` : ""}
      </p>

      <h2>Le détail du budget à {v.nom}, poste par poste</h2>
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
            <td>Total estimé à {v.nom}</td>
            <td></td>
            <td className="num">{euro(est.ttc)}</td>
          </tr>
        </tbody>
      </table>
      <p className="note">Panier représentatif calculé par le moteur AVYORA, ajusté au code postal de {v.nom}. Ton projet réel s&apos;ajuste selon tes choix.</p>

      <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
        <p className="font-semibold text-ink">Estime ton projet à {v.nom} en 3 minutes</p>
        <p className="mt-1 text-sm text-muted">Gratuit, sans inscription — une fourchette chiffrée adaptée à ton bien et ton code postal.</p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-3 py-2.5">Estimer mes travaux →</Link>
      </div>

      <h2>Ce qui est compris</h2>
      <ul>{p.inclus.map((x, i) => <li key={i}>{x}</li>)}</ul>

      <h2>Ce qui fait varier le prix à {v.nom}</h2>
      <ul>{p.facteurs.map((x, i) => <li key={i}>{x}</li>)}</ul>

      <div className="astuce"><b>Astuce :</b> {p.astuce}</div>

      {p.aides && (
        <>
          <h2>Aides financières</h2>
          <p>{p.aides}</p>
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

      <h2>{sujet.charAt(0).toUpperCase() + sujet.slice(1)} dans d&apos;autres villes</h2>
      <div className="chips">
        {autresVilles.map((x) => (
          <Link key={x.slug} href={`/prix-travaux/${p.slug}/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href={`/prix-travaux/${p.slug}`}>Prix moyen (France) →</Link>
      </div>

      <h2>Autres travaux à {v.nom}</h2>
      <div className="chips">
        {p.liens.map((slug) => {
          const rp = projetBySlug(slug);
          if (!rp) return null;
          // Lien vers la page ville si le projet est décliné par ville, sinon vers sa page nationale.
          const href = MATRIX_SLUGS.has(slug) ? `/prix-travaux/${slug}/${v.slug}` : `/prix-travaux/${slug}`;
          return <Link key={slug} href={href}>{rp.emoji} {rp.titre}</Link>;
        })}
        <Link href={`/prix-renovation/${v.slug}`}>Prix rénovation à {v.nom} →</Link>
      </div>
    </div>
  );
}

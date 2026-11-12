import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projetBySlug, projetsMatrix, estimProjet, MATRIX_SLUGS, MATRIX_VILLES, liensDe, titreSansPrefixe, matriceIndexable } from "@/lib/seo-projets";
import { PRIX_MAJ, PRIX_MAJ_FR, ANNEE_PRIX } from "@/lib/prix-maj";
import { villeBySlug } from "@/lib/villes";
import { deptInfo } from "@/lib/geo";
import { regionCoef } from "@/lib/estimateur";
import { seoMeta, titreCourt } from "@/lib/seo-og";
import { phraseCoef, coefCourt, phraseFournitures, raisonFournitures, lieuVille } from "@/lib/seo-textes";
import { CtaEstimation } from "@/components/CtaEstimation";
import { PIECES_ESTIMATEUR } from "@/lib/seo-projets";
import type { PieceKey } from "@/lib/estimateur";
import { catT } from "@/lib/estimateur/catalog-i18n";

export const dynamic = "force-static";
// Ensemble fini : hors matrice = 404. Les couples retirés sont redirigés en 308 par next.config.ts.
export const dynamicParams = false;

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

/**
 * Renvoie la version longue si elle tient dans la limite d'affichage d'une SERP, sinon la courte.
 * Les combinaisons projet + ville les plus longues (« remplacement d'une baignoire par une douche »
 * à « Boulogne-Billancourt ») débordaient de 160 car. malgré une base déjà resserrée.
 */
const descCourte = (longue: string, courte: string) => (longue.length <= 160 ? longue : courte);

export async function generateMetadata({ params }: { params: Promise<{ projet: string; ville: string }> }): Promise<Metadata> {
  const { projet, ville } = await params;
  const p = projetBySlug(projet);
  const v = villeBySlug(ville);
  if (!p || !v) return { title: "Prix des travaux" };
  const { ttc } = estimProjet(p, v.cp);
  const f = four(ttc);
  // `titreSeo` d'abord : dérivé de `h1`, le sujet est parfois un GROUPE VERBAL, et « Prix refaire une
  // toiture à Strasbourg » est agrammatical. Constaté sur 120 des 400 pages ville.
  const sujet = p.titreSeo ?? titreSansPrefixe(p.h1);
  return {
    ...seoMeta({
      // ≤ 60 caractères avec « · AVYORA » (sinon Google coupe) : on retire d'abord l'année, puis la marque.
      title: titreCourt(`Prix ${sujet} à ${v.nom} (${ANNEE_PRIX})`, `Prix ${sujet} à ${v.nom}`, `Prix ${sujet} ${v.nom}`),
      description: descCourte(
        `Combien coûte ${p.nomQuestion ?? p.nom} à ${v.nom} ? Budget ${euro(f.lo)} à ${euro(f.hi)}, ajusté à la main-d'œuvre locale et détaillé poste par poste.`,
        `Combien coûte ${p.nomQuestion ?? p.nom} à ${v.nom} ? Budget ${euro(f.lo)} à ${euro(f.hi)}, ajusté à la main-d'œuvre locale.`,
      ),
      path: `/prix-travaux/${p.slug}/${v.slug}`,
      titreSocial: `Prix ${sujet} à ${v.nom}`,
      descriptionSociale: `Budget détaillé poste par poste à ${v.nom}.`,
    }),
    // Description : longueur visée ≤ 160 car. — au-delà, Google tronque en pleine phrase. Les noms de
    // ville longs (Boulogne-Billancourt, Saint-Étienne) pèsent jusqu'à 20 car., d'où une base courte.
    // `noindex, follow` hors des villes déclarées au sitemap : ces pages sont identiques à 96,7 %
    // à celles de la même zone de main-d'œuvre (cf. matriceIndexable). `follow` est délibéré —
    // on veut que Google continue de suivre leurs liens vers le hub et la page nationale.
    ...(matriceIndexable(v.slug) ? {} : { robots: { index: false, follow: true } }),
  };
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(23px,4vw,31px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .tw,.av-guide .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
.av-seo .tw table,.av-guide .tw table{margin:0;min-width:420px}
@media(max-width:480px){.av-seo .tw table{min-width:0}.av-seo th,.av-seo td{padding:8px 6px}.av-seo th{text-transform:none;letter-spacing:0;font-size:12px}}
.av-seo .titre{display:flex;align-items:baseline;gap:.4em}
.av-seo .titre .emo{font-size:clamp(23px,4vw,31px);line-height:1.2;flex:none}
.av-seo .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:12px}
.av-seo .fil a{color:var(--color-muted)}
.av-seo .fil a:hover{color:var(--color-brand-700)}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-seo .prixmaj a{color:var(--color-brand-700);font-weight:500}
.av-seo .prixmaj a:hover{text-decoration:underline}
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
.av-seo .big .v{font-family:var(--font-geist-mono),monospace;font-size:clamp(23px,6.5vw,30px);font-weight:700;color:var(--color-ink);letter-spacing:-.02em}
.av-seo .big .sub{font-size:13px;color:var(--color-faint)}
.av-seo .note{font-size:12.5px;color:var(--color-faint)}
.av-seo .astuce{border-left:3px solid var(--color-brand-600);background:var(--color-brand-50);border-radius:0 10px 10px 0;padding:12px 16px;margin:16px 0;font-size:14px;color:var(--color-ink)}
.av-seo .astuce b{color:var(--color-brand-700)}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px;padding:12px 16px}
.av-seo .faq p{margin:-4px 0 0;padding:0 16px 12px}
.av-seo .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .chips a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:10px 14px;text-decoration:none}
.av-seo .chips a:hover{background:var(--color-brand-100)}
/* Mobile : le corps de texte passe a 16px (defaut navigateur) — ces pages sont faites pour etre
   lues longuement sur un telephone, et 14,5px y est inutilement fatigant. */
@media(max-width:560px){
.av-seo p,.av-seo li{font-size:16px}
.av-seo .note{font-size:13.5px}
.av-seo .lead{font-size:16.5px}
}
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
  // `titreSeo` d'abord : dérivé de `h1`, le sujet est parfois un GROUPE VERBAL, et « Prix refaire une
  // toiture à Strasbourg » est agrammatical. Constaté sur 120 des 400 pages ville.
  const sujet = p.titreSeo ?? titreSansPrefixe(p.h1);
  const pieceEstimateur = PIECES_ESTIMATEUR.has(p.espace ?? "") ? (p.espace as PieceKey) : undefined;
  const ecart = est.ttc - estNat.ttc;

  // Ce que le barème AVYORA APPLIQUE (indice interne, cf. /methodologie), jamais un fait de marché :
  // « la main-d'œuvre y est 10 % plus chère » affirmait ce qu'aucune source publique n'établit.
  const coefPhrase = phraseCoef(reg);

  const faq = [
    {
      q: `Combien coûte ${p.nomQuestion ?? p.nom} à ${v.nom} en ${ANNEE_PRIX} ?`,
      // `p.base` finit souvent par sa propre parenthèse : la précision suit un tiret, pas « ) ( ».
      a: `À ${v.nom}, compte en moyenne ${euro(f.lo)} à ${euro(f.hi)} pour ${p.base} — finition standard, artisans, marge ±15\u00a0%. Ce budget tient compte du coût local de la main-d'œuvre.`,
    },
    {
      q: `Pourquoi le prix est-il différent à ${v.nom} ?`,
      a: `${phraseFournitures(reg)} Pour ${v.nom}, classée « ${reg.zone} » dans le barème régional AVYORA (un indice interne) : ${coefCourt(reg)}${reg.mat !== 1 ? ` (${raisonFournitures(reg)})` : ""}.`,
    },
    {
      q: `Qu'est-ce qui fait varier ce budget ?`,
      a: `${p.facteurs.slice(0, 3).join(" ")}`,
    },
    {
      q: `Comment obtenir un chiffre précis pour mon projet à ${v.nom} ?`,
      a: `Utilise l'estimateur AVYORA : en 2 minutes, tu obtiens une fourchette adaptée à ta surface, tes travaux et ton code postal (${v.cp.slice(0, 2)}...).`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        // Google demande une image pour le résultat enrichi Article (et pour Discover).
        // On réutilise l'image OG générée par app/opengraph-image.tsx : 1200×630, ratio 1.91:1.
        image: [`${siteUrl}/opengraph-image`],
        headline: `Prix ${sujet} à ${v.nom} en ${ANNEE_PRIX}`,
        description: `Prix de ${p.nomQuestion ?? p.nom} à ${v.nom}, ajusté à la main-d'œuvre locale et détaillé poste par poste.`,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/prix-travaux/${p.slug}/${v.slug}`,
        // PRIX_MAJ est la source de vérité de la fraîcheur des prix (lib/prix-maj.ts). Une date figée
        // ici annonçait 2026-09-12 sur 400 pages alors que le catalogue disait autre chose.
        datePublished: PRIX_MAJ,
        dateModified: PRIX_MAJ,
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

  // Villes voisines : on ne propose que des pages INDEXABLES. Lier une page déclarée au sitemap
  // vers ses jumelles en noindex dépensait du budget d'exploration pour des cibles à jeter
  // (mesuré : 560 arêtes indexable → noindex, toutes émises depuis ces 80 pages).
  const autresVilles = MATRIX_VILLES.filter((x) => x.slug !== v.slug && matriceIndexable(x.slug));

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Fil d'Ariane visible : le BreadcrumbList JSON-LD existait déjà juste au-dessus, mais ces
          400 pages étaient la seule famille sans fil visible — et sans aucun lien vers le hub
          /prix-travaux, soit 79 % du site qui n'alimentait pas son propre pilier. */}
      <p className="fil">
        <Link href="/">Accueil</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/prix-travaux">Prix des travaux</Link> <span aria-hidden="true">›</span>{" "}
        <Link href={`/prix-travaux/${p.slug}`}>{sujet.charAt(0).toUpperCase() + sujet.slice(1)}</Link>{" "}
        <span aria-hidden="true">›</span> {v.nom}
      </p>

      {/* L'emoji hors du h1 : il était lu en premier par les lecteurs d'écran et entrait dans le titre. */}
      <div className="titre">
        <span className="emo" aria-hidden="true">{p.emoji}</span>
        <h1>Prix {sujet} à {v.nom} en {ANNEE_PRIX}</h1>
      </div>
      <p className="lead">
        À {lieuVille(v.nom, dep)}, {p.lead.charAt(0).toLowerCase() + p.lead.slice(1)}
      </p>
      {/* Provenance et fraîcheur des prix : ces 400 pages sont la famille la plus volumineuse du site
          et n'en portaient aucune trace, alors que les pages villes et projets l'affichent. */}
      <p className="prixmaj">
        Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link>
      </p>

      <div className="big">
        <span className="v">{euro(f.lo)} – {euro(f.hi)}</span>
        <span className="sub">budget moyen à {v.nom} · {p.base}</span>
      </div>
      <p className="note">
        Prix TTC indicatifs, finition standard, artisans, marge ±15&nbsp;%. Classement « {reg.zone} » : {coefPhrase} (barème interne).
        {ecart !== 0 ? ` Soit ${ecart > 0 ? "environ " + euro(Math.abs(ecart)) + " de plus" : "environ " + euro(Math.abs(ecart)) + " de moins"} qu'en moyenne nationale.` : ""}
      </p>

      <h2>Le détail du budget à {v.nom}, poste par poste</h2>
      <div className="tw">
      <table>
        <thead>
          <tr><th>Poste</th><th>Quantité</th><th>Budget (TTC)</th></tr>
        </thead>
        <tbody>
          {est.lots.map((lot) => (
            <Fragment key={lot.corps}>
              <tr className="lot">
                <td>{catT("fr", "corps", lot.corps)}</td>
                <td></td>
                <td className="num">{euro(lot.ttc)}</td>
              </tr>
              {lot.lignes.map((li, i) => (
                <tr className="line" key={lot.corps + i}>
                  <td>{li.nom}</td>
                  <td className="num" style={{ textAlign: "left", fontFamily: "inherit", color: "var(--color-faint)" }}>{li.qty} {catT("fr", "unites", li.unite)}</td>
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
      </div>
      <p className="note">Panier représentatif calculé par le moteur AVYORA, ajusté au code postal de {v.nom}. Ton projet réel s&apos;ajuste selon tes choix.</p>

      <CtaEstimation
        src="matrice"
        titre={`Estime ${p.nom} à ${v.nom} en 2 minutes`}
        cp={v.cp}
        piece={pieceEstimateur}
        surface={pieceEstimateur ? p.surface : undefined}
        libelle={`Estimer ${p.nom} à ${v.nom}`}
        sousTitre={`Gratuit, sans inscription — l'estimation part déjà ajustée à la main-d'œuvre de ${v.nom}.`}
      />

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
          <details key={i} open>
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
        {liensDe(p.slug).map((slug) => {
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

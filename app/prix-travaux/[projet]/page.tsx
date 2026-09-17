import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROJETS, projetBySlug, estimProjet, MATRIX_SLUGS, MATRIX_VILLES, liensDe, titreSansPrefixe, panierVariante } from "@/lib/seo-projets";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";
import { VILLES_SEO } from "@/lib/villes";
import { og } from "@/lib/seo-og";
import { CtaEstimation } from "@/components/CtaEstimation";
import { PIECES_ESTIMATEUR } from "@/lib/seo-projets";
import type { PieceKey } from "@/lib/estimateur";

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
  if (!p) return { title: "Prix des travaux" };
  const { ttc } = estimProjet(p, "");
  const f = four(ttc);
  const s = p.surfaces;
  // Les requêtes réelles portent une surface (« … salle de bain 6m2 »), et les pages concurrentes
  // qui ressortent sur ces requêtes listent les surfaces DANS LEUR TITLE. On s'aligne sur ce format,
  // mais uniquement pour les projets qui ont un barème : les 13 autres gardent leur title à l'octet.
  // Trois surfaces repères seulement (mini, référence, maxi) : les lister toutes pousserait le title
  // au-delà de 70 caractères avec le suffixe « · AVYORA » et le ferait tronquer en SERP.
  const reperes = s && s.length > 1 ? [...new Set([s[0], p.surface, s[s.length - 1]])].sort((a, b) => a - b) : [];
  const liste = reperes.length > 1 ? `${reperes.slice(0, -1).join(", ")} et ${reperes[reperes.length - 1]}` : "";
  const parSurf = s && s.length > 1 ? ` Barème de ${s[0]} à ${s[s.length - 1]} m².` : "";
  return {
    title: liste
      ? `Prix ${p.titreSeo ?? titreSansPrefixe(p.h1)} 2026 — ${liste} m²`
      : `${p.h1.replace(" en 2026", "")} — coût moyen 2026`,
    description: `Combien coûte ${p.nomQuestion ?? p.nom} ? Budget moyen ${euro(f.lo)} à ${euro(f.hi)}, poste par poste.${parSurf} Estimation gratuite en 3 minutes.`,
    alternates: { canonical: `/prix-travaux/${p.slug}` },
    openGraph: og({ title: p.h1, description: `Combien coûte ${p.nomQuestion ?? p.nom} ? Budget détaillé poste par poste.`, path: `/prix-travaux/${p.slug}` }),
  };
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .tw,.av-guide .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
.av-seo .tw table,.av-guide .tw table{margin:0;min-width:420px}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-seo .prixmaj a{color:var(--color-brand-700);font-weight:500}
.av-seo .prixmaj a:hover{text-decoration:underline}
.av-seo h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px}
.av-seo h3{font-size:15.5px;font-weight:600;color:var(--color-ink);margin:22px 0 6px;letter-spacing:-.01em}
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
.av-seo td .sub{font-size:12px;color:var(--color-faint);line-height:1.45}
.av-seo .note{font-size:12.5px;color:var(--color-faint)}
/* Barème par surface : 3 colonnes courtes — il doit tenir en entier sur un écran de 360 px
   (l'essentiel du trafic est mobile), sans scroll horizontal comme les tables de détail. */
.av-seo .tw.surf table{min-width:0}
@media(max-width:480px){
  .av-seo .tw.surf th,.av-seo .tw.surf td{padding:8px 7px;font-size:13px}
  .av-seo .tw.surf th{font-size:10.5px;letter-spacing:.03em}
}
.av-seo .astuce{border-left:3px solid var(--color-brand-600);background:var(--color-brand-50);border-radius:0 10px 10px 0;padding:12px 16px;margin:16px 0;font-size:14px;color:var(--color-ink)}
.av-seo .astuce b{color:var(--color-brand-700)}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-seo .faq p{margin:8px 0 0}
.av-seo .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .chips a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .chips a:hover{background:var(--color-brand-100)}
/* Mobile : le corps de texte passe a 16px (defaut navigateur) — ces pages sont faites pour etre
   lues longuement sur un telephone, et 14,5px y est inutilement fatigant. */
@media(max-width:560px){
.av-seo p,.av-seo li{font-size:16px}
.av-seo .note{font-size:13.5px}
.av-seo .lead{font-size:16.5px}
.av-seo h3{font-size:16.5px}
}
`;

export default async function PrixTravaux({ params }: { params: Promise<{ projet: string }> }) {
  const { projet } = await params;
  const p = projetBySlug(projet);
  if (!p) notFound();

  // `nom` est fait pour « Estime … » ; comme objet d'une question il casse. Cf. Projet.nomQuestion.
  const nomQ = p.nomQuestion ?? p.nom;
  const est = estimProjet(p, "");
  const f = four(est.ttc);
  // Décomposition du total. Base = travaux + provision : `totaux.ht` EXCLUT les aléas
  // (core.ts : ttc = ht + tva + aleas), donc rapporter la provision à `ht` donnerait 107 %.
  // La dernière part est le RESTE, pour que la colonne fasse exactement 100 % malgré les arrondis.
  const baseHT = est.ht + est.aleas;
  const pctMat = baseHT > 0 ? Math.round((est.materiaux / baseHT) * 100) : 0;
  const pctMo = baseHT > 0 ? Math.round((est.mainOeuvre / baseHT) * 100) : 0;
  const pctAleas = Math.max(0, 100 - pctMat - pctMo);
  // Ratio « soit environ X €/u » : seulement quand `uniteBase` déclare une unité qui a un sens, et
  // sur une quantité LUE dans `tasks`. Sans `uniteBase`, aucun ratio n'est affiché — l'absence de
  // ratio coûte moins cher qu'un ratio faux (un poêle n'a pas de prix au m²).
  const u = p.uniteBase;
  const qtyBase = !u ? 0 : u.tache ? (p.tasks.find((t) => t[1] === u.tache)?.[2] ?? 0) : est.surface;
  const ratio = qtyBase > 0 ? Math.round(est.ttc / qtyBase) : 0;
  const ratioTexte =
    ratio > 0 && u
      ? u.label.startsWith("m²")
        ? ` — soit environ ${euro(ratio)}/${u.label}`
        : ` — soit environ ${euro(ratio)} par ${u.label}`
      : "";
  // Seuls 5 projets ont un `espace` qui correspond à une pièce de l'estimateur rapide. Pour les
  // autres (toiture, façade, fenêtres…), on ne préremplit RIEN plutôt que de deviner une pièce.
  const pieceEstimateur = PIECES_ESTIMATEUR.has(p.espace ?? "") ? (p.espace as PieceKey) : undefined;
  const regions = REGIONS.map((r) => ({ ...r, ttc: estimProjet(p, r.cp).ttc }));
  // Barème par surface : le même panier rejoué sur chaque taille de pièce (cf. qtyPourSurface).
  const parSurface = (p.surfaces ?? []).map((s) => {
    const ttc = estimProjet(p, "", s).ttc;
    return { s, ...four(ttc), m2: Math.round(ttc / s) };
  });
  const equipFixes =
    p.equipFixes ??
    (p.espace === "sdb"
      ? "douche, WC, meuble-vasque"
      : p.espace === "cuisine"
        ? "meubles, électroménager, évier"
        : "électricité, placards");
  // Deux surfaces développées en H3 seulement — la référence et la plus grande. Les pages qui
  // ressortent sur ces requêtes traitent chaque surface en sous-titre, pas en ligne de tableau ;
  // mais en développer six produirait six paragraphes templatisés, c'est-à-dire exactement le
  // motif « contenu généré pour Google » qu'on s'interdit.
  // Configurations et options : le moteur rejoue le panier muté, l'écart est CALCULÉ, jamais écrit.
  const refTtc = est.ttc;
  const variantes = (p.variantes ?? []).map((v) => {
    const ttc = estimProjet(p, "", undefined, panierVariante(p, v)).ttc;
    return { ...v, ttc, ecart: ttc - refTtc };
  });
  // Constat DÉRIVÉ de l'écart mesuré, jamais affirmé en dur : si le catalogue évolue et que la
  // baignoire cesse d'être au même prix que la douche, la phrase disparaît au lieu de devenir fausse.
  const quasiEgales = variantes.filter((v, i) => i > 0 && Math.abs(v.ecart) < refTtc * 0.02);
  const options = (p.options ?? []).map((v) => {
    const ttc = estimProjet(p, "", undefined, panierVariante(p, v)).ttc;
    return { ...v, ttc, ecart: ttc - refTtc };
  });
  const cles = parSurface.length > 1
    ? [...new Set([p.surface, parSurface[parSurface.length - 1].s])]
        .map((s) => parSurface.find((r) => r.s === s))
        .filter((r): r is (typeof parSurface)[number] => r != null)
    : [];

  const faq = [
    {
      q: `Combien coûte ${nomQ} en 2026 ?`,
      a: `Comptez en moyenne ${euro(f.lo)} à ${euro(f.hi)} pour ${p.base} (finition standard, travaux confiés à des artisans, marge ±15 %). Le prix exact dépend de la surface, des équipements et de la région.`,
    },
    ...(parSurface.length > 1
      ? [
          {
            q: `Quel budget pour ${nomQ} de ${parSurface[0].s} m² ou de ${parSurface[parSurface.length - 1].s} m² ?`,
            a: `Comptez environ ${euro(parSurface[0].lo)} à ${euro(parSurface[0].hi)} pour ${parSurface[0].s} m², et ${euro(parSurface[parSurface.length - 1].lo)} à ${euro(parSurface[parSurface.length - 1].hi)} pour ${parSurface[parSurface.length - 1].s} m². Le prix au m² baisse quand la pièce s'agrandit : les équipements coûtent la même chose quelle que soit la surface, seuls les revêtements suivent.`,
          },
        ]
      : []),
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
        // Google demande une image pour le résultat enrichi Article (et pour Discover).
        // On réutilise l'image OG générée par app/opengraph-image.tsx : 1200×630, ratio 1.91:1.
        image: [`${siteUrl}/opengraph-image`],
        headline: p.h1,
        description: `Prix de ${nomQ} en 2026, détaillé poste par poste.`,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/prix-travaux/${p.slug}`,
        // Source de vérité de la fraîcheur des prix : lib/prix-maj.ts. Une date figée ici
        // contredisait la date affichée dans le texte visible de la page.
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
      <p className="prixmaj">Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link></p>

      <div className="big">
        <span className="v">{euro(f.lo)} – {euro(f.hi)}</span>
        <span className="sub">budget moyen · {p.base}</span>
      </div>
      <p className="note">Prix TTC indicatifs, finition standard, travaux confiés à des artisans, marge ±15 %{ratioTexte}. Base de calcul : moteur AVYORA.</p>

      <h2>Le détail du budget, poste par poste</h2>
      <p>Voici comment se répartit le budget pour {p.base}, corps d&apos;état par corps d&apos;état :</p>
      <div className="tw">
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
      </div>
      <p className="note">Panier représentatif calculé par le moteur AVYORA (le même que l&apos;estimateur). Ton projet réel s&apos;ajuste selon tes choix.</p>

      {parSurface.length > 0 && (
        <>
          <h2>Prix {p.titre} selon la surface</h2>
          <p>
            Le budget ne suit pas la surface au mètre carré près : les équipements ({equipFixes})
            coûtent la même chose dans une petite pièce que dans une grande. C&apos;est pour ça que le prix au m² baisse quand la pièce s&apos;agrandit.
          </p>
          <div className="tw surf">
            <table>
              <thead>
                <tr><th>Surface</th><th>Budget estimé (TTC)</th><th>Soit au m²</th></tr>
              </thead>
              <tbody>
                {parSurface.map((r) => (
                  <tr key={r.s} className={r.s === p.surface ? "lot" : undefined}>
                    <td>{r.s} m²{r.s === p.surface ? " (référence)" : ""}</td>
                    <td className="num">{euro(r.lo)} – {euro(r.hi)}</td>
                    <td className="num">{euro(r.m2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            Chaque ligne rejoue le même panier de travaux sur la surface indiquée : les ouvrages de
            sol et de plafond suivent la surface, la faïence et la peinture murale suivent le
            périmètre (donc la racine de la surface), et les équipements restent à l&apos;unité.
            Fourchettes ±15 %, finition standard, moyenne nationale.
          </p>

          {cles.map((r) => (
            <Fragment key={`s${r.s}`}>
              <h3>Combien coûte {nomQ} de {r.s} m² ?</h3>
              <p>
                Pour {nomQ} de {r.s} m², le moteur AVYORA situe le budget entre{" "}
                <strong>{euro(r.lo)}</strong> et <strong>{euro(r.hi)}</strong> TTC, soit environ{" "}
                {euro(r.m2)}/m².{" "}
                {r.s === p.surface
                  ? `C'est la configuration détaillée poste par poste plus haut sur cette page.`
                  : `L'écart avec ${p.surface} m² tient presque entièrement aux revêtements : ${equipFixes} coûtent la même chose dans les deux cas.`}
              </p>
            </Fragment>
          ))}
        </>
      )}

      <CtaEstimation
        src="projet"
        titre={`Estime ${p.nom} en 3 minutes`}
        piece={pieceEstimateur}
        surface={pieceEstimateur ? p.surface : undefined}
        libelle={pieceEstimateur ? `Estimer ${p.nom}` : "Estimer mes travaux"}
      />

      {variantes.length > 1 && (
        <>
          <h2>Douche, baignoire ou italienne : ce que change chaque choix</h2>
          <p>
            C&apos;est l&apos;arbitrage sur lequel tout le monde hésite, et celui que les grilles de
            prix chiffrent le moins. Voici le même chantier, à la même surface, avec seulement
            l&apos;équipement qui change :
          </p>
          <div className="tw surf">
            <table>
              <thead>
                <tr><th>Configuration</th><th>Budget total (TTC)</th><th>Écart</th></tr>
              </thead>
              <tbody>
                {variantes.map((v, i) => (
                  <tr key={v.label} className={i === 0 ? "lot" : undefined}>
                    <td>{v.label}{v.detail ? <><br /><span className="sub">{v.detail}</span></> : null}</td>
                    <td className="num">{euro(v.ttc)}</td>
                    <td className="num">{v.ecart === 0 ? "référence" : `${v.ecart > 0 ? "+" : "−"}${euro(Math.abs(v.ecart))}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quasiEgales.length > 0 && (
            <p>
              <strong>Le résultat surprend souvent :</strong>{" "}
              {quasiEgales.map((v) => v.label.toLowerCase()).join(", ")} ne change presque rien au
              budget — {quasiEgales.map((v) => euro(Math.abs(v.ecart))).join(" et ")}{" "}
              d&apos;écart sur un chantier à {euro(refTtc)}. Ce qui coûte cher dans une salle de bain, ce n&apos;est pas
              l&apos;appareil sanitaire : c&apos;est tout ce qu&apos;il y a autour, et qui ne change
              pas d&apos;une configuration à l&apos;autre.
            </p>
          )}
          <p className="note">
            Chaque ligne rejoue le même panier de travaux : seul l&apos;équipement indiqué change — la
            surface, la faïence, le sol et l&apos;électricité restent identiques. Montants TTC hors
            marge ±15 %, pour que l&apos;écart entre deux lignes reste lisible ; finition standard,
            moyenne nationale. Pour un chantier limité à ce seul poste, voir{" "}
            <Link href="/prix-travaux/douche-italienne">le prix d&apos;une douche à l&apos;italienne</Link>{" "}
            et <Link href="/prix-travaux/remplacer-baignoire-par-douche">le remplacement d&apos;une baignoire par une douche</Link>.
          </p>
        </>
      )}

      {options.length > 0 && (
        <>
          <h2>Les options qui font monter la note</h2>
          <p>
            À partir de la configuration de référence, voici ce que coûte réellement chaque montée en
            gamme, prise une par une :
          </p>
          <div className="tw surf">
            <table>
              <thead>
                <tr><th>Option</th><th>Budget total (TTC)</th><th>Écart</th></tr>
              </thead>
              <tbody>
                {options.map((o) => (
                  <tr key={o.label}>
                    <td>{o.label}</td>
                    <td className="num">{euro(o.ttc)}</td>
                    <td className="num">+{euro(o.ecart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            Montants TTC sans la marge ±15 %, pour que l&apos;écart entre deux lignes reste lisible.
            Chaque option est une variante du référentiel AVYORA appliquée au panier de référence
            ({euro(refTtc)}) — l&apos;écart est calculé, pas estimé à la louche.
          </p>
        </>
      )}

      <h2>Ce que contient ce total</h2>
      <p>
        Une fourchette ne dit pas grand-chose si on ignore ce qu&apos;il y a dedans. Voici la
        décomposition que le moteur calcule pour {nomQ}, avant TVA :
      </p>
      <div className="tw surf">
        <table>
          <thead>
            <tr><th>Poste</th><th>Montant HT</th><th>Part</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Matériaux et fournitures</td>
              <td className="num">{euro(est.materiaux)}</td>
              <td className="num">{pctMat} %</td>
            </tr>
            <tr>
              <td>Main-d&apos;œuvre</td>
              <td className="num">{euro(est.mainOeuvre)}</td>
              <td className="num">{pctMo} %</td>
            </tr>
            <tr>
              <td>Provision pour imprévus</td>
              <td className="num">{euro(est.aleas)}</td>
              <td className="num">{pctAleas} %</td>
            </tr>
            <tr className="lot">
              <td>Total HT, provision comprise</td>
              <td className="num">{euro(baseHT)}</td>
              <td className="num">100 %</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        La provision pour imprévus est <strong>déjà incluse</strong> dans le budget affiché en haut
        de page : un chantier de rénovation réserve des surprises une fois les cloisons ouvertes, et
        un chiffrage qui les ignore est faux par construction. La TVA s&apos;ajoute ensuite au taux
        applicable à chaque poste (5,5 %, 10 % ou 20 %) — voir <Link href="/methodologie">la méthode</Link>.
      </p>
      <p className="note">
        L&apos;écart entre matériaux et main-d&apos;œuvre est aussi ce qui décide si faire soi-même
        vaut le coup : <Link href="/guides/faire-soi-meme-ou-artisan">le calcul lot par lot</Link>.
      </p>

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
      <div className="tw">
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
      </div>
      <p className="note">Fourchettes ±15 %. Consulte le prix ajusté à ta ville ci-dessous.</p>

      {MATRIX_SLUGS.has(p.slug) && (
        <>
          <h2>Prix {p.titre} ville par ville</h2>
          <p>Le prix exact dépend du coût de la main-d&apos;œuvre locale. Consulte la page dédiée à ta ville :</p>
          <div className="chips">
            {MATRIX_VILLES.map((x) => (
              <Link key={x.slug} href={`/prix-travaux/${p.slug}/${x.slug}`}>{x.nom}</Link>
            ))}
          </div>
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

      <h2>Autres types de travaux</h2>
      <div className="chips">
        {liensDe(p.slug).map((slug) => {
          const rp = projetBySlug(slug);
          return rp ? <Link key={slug} href={`/prix-travaux/${slug}`}>{rp.emoji} {rp.titre}</Link> : null;
        })}
        <Link href="/prix-travaux">Tous les travaux →</Link>
      </div>

      <h2>Prix de la rénovation dans ta ville</h2>
      <p>La main-d&apos;œuvre varie selon la région. Consulte le prix ajusté à ta ville :</p>
      <div className="chips">
        {VILLES_SEO.slice(0, 14).map((x) => (
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
      <p>
        Guides pratiques :{" "}
        <Link href="/guides/verifier-devis-travaux" className="font-medium text-brand-600 hover:underline">vérifier un devis de travaux</Link>{" "}
        ·{" "}
        <Link href="/guides/ordre-travaux-renovation" className="font-medium text-brand-600 hover:underline">dans quel ordre faire ses travaux</Link>{" "}
        ·{" "}
        <Link href="/guides/faire-soi-meme-ou-artisan" className="font-medium text-brand-600 hover:underline">faire soi-même ou faire faire</Link>.
      </p>
    </div>
  );
}

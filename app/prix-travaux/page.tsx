import Link from "next/link";
import type { Metadata } from "next";
import { PROJETS, estimProjet, titreSansPrefixe } from "@/lib/seo-projets";
import { VILLES_SEO } from "@/lib/villes";
import { PRIX_MAJ_FR } from "@/lib/prix-maj";
import { CtaEstimation } from "@/components/CtaEstimation";

export const dynamic = "force-static";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";
const four = (ttc: number) => {
  const r = (n: number) => Math.round(n / 100) * 100;
  return { lo: r(ttc * 0.85), hi: r(ttc * 1.15) };
};

export const metadata: Metadata = {
  title: "Prix des travaux de rénovation par type (2026)",
  description:
    "Combien coûtent vos travaux ? Prix moyens 2026, poste par poste : salle de bain, cuisine, toiture, façade, isolation, électricité, peinture.",
  alternates: { canonical: "/prix-travaux" },
};

const CSS = `
.av-seo{max-width:860px;margin:0 auto}
.av-seo h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:32px 0 12px}
.av-seo p{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:14px}
.av-card{display:block;border:1px solid var(--color-line);border-radius:14px;padding:16px;text-decoration:none;background:var(--color-surface);transition:border-color .15s,transform .15s}
.av-card:hover{border-color:var(--color-brand-300);transform:translateY(-1px)}
.av-card .e{font-size:22px}
.av-card .t{font-weight:600;color:var(--color-ink);margin-top:6px;font-size:15px}
.av-card .p{font-family:var(--font-geist-mono),monospace;color:var(--color-brand-700);font-size:13.5px;margin-top:2px}
.av-card .s{font-size:12.5px;color:var(--color-faint);margin-top:4px;line-height:1.5}
.av-seo .note{font-size:12.5px;color:var(--color-faint)}
.av-seo p a{color:var(--color-brand-700);font-weight:500}
@media(max-width:560px){.av-seo p{font-size:16px}}
.av-seo .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
.av-seo table{width:100%;border-collapse:collapse;margin:0;font-size:14px}
.av-seo th,.av-seo td{border:1px solid var(--color-line);padding:9px 12px;text-align:left}
.av-seo th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.av-seo td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink);white-space:nowrap}
.av-seo .tw.surf table{min-width:0}
@media(max-width:480px){.av-seo .tw.surf th,.av-seo .tw.surf td{padding:8px 7px;font-size:13px}
.av-seo .tw.surf th{font-size:10.5px;letter-spacing:.03em}}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-seo .faq p{margin:8px 0 0}
.av-seo .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .chips a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .chips a:hover{background:var(--color-brand-100)}
`;

export default function PrixTravauxHub() {
  const cards = PROJETS.map((p) => {
    const f = four(estimProjet(p, "").ttc);
    return { ...p, lo: f.lo, hi: f.hi };
  });

  // Répartition matériaux / main-d'œuvre par projet, TRIÉE : c'est ce qui fait de ce tableau une
  // information et non une répétition des cartes. Tout est lu du moteur (`bilan()`), rien n'est figé.
  const repartition = PROJETS.map((p) => {
    const e = estimProjet(p, "");
    const base = e.materiaux + e.mainOeuvre;
    return {
      slug: p.slug,
      // Même dérivation que les <title> : `titre` seul donne « peinture », « façade »,
      // trop maigre en libellé de ligne à côté d'« aménagement de combles ».
      nom: p.titreSeo ?? titreSansPrefixe(p.h1),
      ttc: e.ttc,
      partMo: base > 0 ? Math.round((e.mainOeuvre / base) * 100) : 0,
    };
  }).sort((a, b) => b.partMo - a.partMo);

  const plusMo = repartition[0];
  const moinsMo = repartition[repartition.length - 1];
  const cher = [...cards].sort((a, b) => b.hi - a.hi)[0];
  const pasCher = [...cards].sort((a, b) => a.lo - b.lo)[0];

  // SOURCE UNIQUE de la FAQ : corps de page ET JSON-LD. Deux copies finissent toujours par
  // diverger, et le balisage devient alors inéligible au rich result.
  const faq = [
    {
      q: "Quels travaux coûtent le plus cher ?",
      a: `Parmi les ${PROJETS.length} projets chiffrés ici, le budget le plus élevé est ${cher.nom} (jusqu'à ${euro(cher.hi)} TTC pour ${cher.base}), le plus bas ${pasCher.nom} (à partir de ${euro(pasCher.lo)}). Mais un projet cher au total peut être bon marché au m² : tout dépend de la surface concernée.`,
    },
    {
      q: "Quelle part du prix est de la main-d'œuvre ?",
      a: `Elle varie du simple au double selon le métier : environ ${plusMo.partMo} % pour ${plusMo.nom}, contre ${moinsMo.partMo} % pour ${moinsMo.nom}, où ce sont les fournitures qui pèsent. C'est ce rapport qui décide si faire soi-même vaut le coup.`,
    },
    {
      q: "Ces prix incluent-ils la TVA et les imprévus ?",
      a: "Oui. Les budgets affichés sont TTC, avec le taux de TVA travaux applicable à chaque poste (5,5 %, 10 % ou 20 %), et ils intègrent une provision de 7 % pour imprévus — un chantier de rénovation réserve des surprises une fois les cloisons ouvertes.",
    },
    {
      q: "Le prix change-t-il selon ma ville ?",
      a: "Les fournitures sont à un prix national, mais le coût de la main-d'œuvre varie selon la zone. L'estimateur applique cet écart dès que tu renseignes ton code postal, et chaque page projet montre l'écart entre Paris, Lyon, Bordeaux et Lille.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Prix des travaux de rénovation par type",
        inLanguage: "fr-FR",
        url: `${siteUrl}/prix-travaux`,
        // ItemList : dit explicitement à Google ce que ce hub RÉPERTORIE. Sans elle, une
        // CollectionPage n'annonce qu'un type, pas son contenu. Les entrées sont dérivées de la
        // même source que la page affiche — elles ne peuvent pas diverger du rendu.
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: PROJETS.length,
          itemListElement: PROJETS.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.h1.replace(" en 2026", ""),
            url: `${siteUrl}/prix-travaux/${p.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Prix des travaux", item: `${siteUrl}/prix-travaux` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((x) => ({
          "@type": "Question",
          name: x.q,
          acceptedAnswer: { "@type": "Answer", text: x.a },
        })),
      },
    ],
  };

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1>Prix des travaux de rénovation en 2026</h1>
      <p className="lead">
        Combien coûtent vos travaux ? Retrouvez le budget moyen de chaque projet, <strong>détaillé poste par poste</strong>,
        calculé avec le moteur AVYORA. Puis affinez l&apos;estimation à votre bien et votre code postal, gratuitement.
      </p>

      <div className="av-grid">
        {cards.map((c) => (
          <Link key={c.slug} href={`/prix-travaux/${c.slug}`} className="av-card">
            <div className="e">{c.emoji}</div>
            <div className="t">{c.h1.replace("Prix ", "").replace("d'une ", "").replace("d'un ", "").replace("pour ", "").replace(" en 2026", "")}</div>
            <div className="p">{euro(c.lo)} – {euro(c.hi)}</div>
            <div className="s">{c.base}</div>
          </Link>
        ))}
      </div>

      <CtaEstimation
        src="hub"
        titre="Ton projet n&apos;est pas dans la liste ?"
        sousTitre="L&apos;estimateur AVYORA chiffre n&apos;importe quel projet, pièce par pièce, en 3 minutes — gratuit."
      />

      <h2>Quels travaux sont surtout de la main-d&apos;œuvre ?</h2>
      <p>
        À budget égal, deux chantiers n&apos;ont pas la même structure de coût. Ce tableau classe les
        {" "}{PROJETS.length} projets par part de main-d&apos;œuvre — c&apos;est elle qui décide si
        faire soi-même a un intérêt, et pourquoi le prix bouge d&apos;une région à l&apos;autre.
      </p>
      <div className="tw surf">
        <table>
          <thead>
            <tr><th>Travaux</th><th>Budget TTC</th><th>Part main-d&apos;œuvre</th></tr>
          </thead>
          <tbody>
            {repartition.map((r) => (
              <tr key={r.slug}>
                <td><Link href={`/prix-travaux/${r.slug}`}>{r.nom}</Link></td>
                <td className="num">{euro(r.ttc)}</td>
                <td className="num">{r.partMo} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Parts calculées sur le coût des travaux hors taxes, provision d&apos;imprévus exclue, par le
        moteur AVYORA. Une part de main-d&apos;œuvre élevée veut dire deux choses : le prix dépend
        beaucoup de la région, et l&apos;auto-rénovation peut faire économiser gros — voir{" "}
        <Link href="/guides/faire-soi-meme-ou-artisan">faire soi-même ou faire faire</Link> ·{" "}
        <Link href="/guides/calculer-budget-travaux">calculer un budget travaux</Link>.
      </p>

      <h2>Comment lire ces prix</h2>
      <p>
        Chaque page donne une <strong>fourchette TTC</strong> pour un projet type, décomposée corps
        d&apos;état par corps d&apos;état. Trois choses à garder en tête avant de comparer avec un devis.
      </p>
      <p>
        <strong>Le prix dépend d&apos;abord de l&apos;ampleur, pas de la surface.</strong> Refaire les
        joints d&apos;une salle de bain ou la reprendre à nu n&apos;ont rien à voir, à surface égale.
        C&apos;est pourquoi chaque page décrit précisément le projet chiffré.
      </p>
      <p>
        <strong>Fournitures et main-d&apos;œuvre ne varient pas de la même façon.</strong> Les
        matériaux coûtent à peu près pareil partout en France ; la pose suit le marché local. Nos pages
        affichent les deux séparément quand la donnée existe, ce qui permet aussi de chiffrer ce
        qu&apos;on ferait soi-même.
      </p>
      <p>
        <strong>Une fourchette n&apos;est pas un devis.</strong> Elle cadre un budget avant de
        rencontrer des artisans. Pour confronter un devis reçu ligne à ligne, lis{" "}
        <Link href="/guides/verifier-devis-travaux">comment vérifier un devis de travaux</Link>.
      </p>
      <p className="note">
        Prix mis à jour le {PRIX_MAJ_FR} ·{" "}
        <Link href="/methodologie">d&apos;où viennent ces prix</Link>
      </p>

      <h2>Questions fréquentes</h2>
      <div className="faq">
        {faq.map((x, i) => (
          <details key={i} open>
            <summary>{x.q}</summary>
            <p>{x.a}</p>
          </details>
        ))}
      </div>

      <h2>Prix par type de bien</h2>
      <div className="chips">
        <Link href="/guides/prix-renovation-appartement">Rénovation d&apos;appartement</Link>
        <Link href="/guides/prix-renovation-maison">Rénovation de maison</Link>
        <Link href="/guides/verifier-devis-travaux">Vérifier un devis</Link>
        <Link href="/guides/ordre-travaux-renovation">Ordre des travaux</Link>
        <Link href="/guides/faire-soi-meme-ou-artisan">Faire soi-même ou pas</Link>
      </div>

      <h2>Prix par corps d&apos;état</h2>
      <p>
        Pour ouvrir une ligne de devis poste par poste — cloison, doublage, réseau, appareils —
        consulte les <Link href="/prix-poste">prix par corps d&apos;état</Link>.
      </p>

      <h2>Prix de la rénovation par ville</h2>
      <div className="chips">
        {VILLES_SEO.slice(0, 16).map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href="/prix-renovation">Toutes les villes →</Link>
      </div>
    </div>
  );
}

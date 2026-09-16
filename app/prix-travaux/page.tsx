import Link from "next/link";
import type { Metadata } from "next";
import { PROJETS, estimProjet } from "@/lib/seo-projets";
import { VILLES_SEO } from "@/lib/villes";
import { PRIX_MAJ_FR } from "@/lib/prix-maj";

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
    "Combien coûtent vos travaux ? Prix moyens 2026 détaillés poste par poste : salle de bain, cuisine, toiture, façade, isolation, électricité, peinture. Estimation gratuite en 3 minutes.",
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
.av-seo .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .chips a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .chips a:hover{background:var(--color-brand-100)}
`;

export default function PrixTravauxHub() {
  const cards = PROJETS.map((p) => {
    const f = four(estimProjet(p, "").ttc);
    return { ...p, lo: f.lo, hi: f.hi };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Prix des travaux de rénovation par type",
        inLanguage: "fr-FR",
        url: `${siteUrl}/prix-travaux`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Prix des travaux", item: `${siteUrl}/prix-travaux` },
        ],
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

      <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
        <p className="font-semibold text-ink">Ton projet n&apos;est pas dans la liste ?</p>
        <p className="mt-1 text-sm text-muted">L&apos;estimateur AVYORA chiffre n&apos;importe quel projet, pièce par pièce, en 3 minutes — gratuit.</p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-3 py-2.5">Estimer mes travaux →</Link>
      </div>

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

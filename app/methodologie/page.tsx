import Link from "next/link";
import type { Metadata } from "next";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";

export const dynamic = "force-static";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Méthodologie — d'où viennent les prix AVYORA",
  description:
    "Comment AVYORA calcule le coût de tes travaux : 200 postes chiffrés sur 18 corps d'état, coefficient de finition, ajustement régional de la main-d'œuvre, TVA et provision pour aléas. Ce que l'estimation couvre — et ce qu'elle ne couvre pas.",
  alternates: { canonical: "/methodologie" },
};

/* Tout ce qui est affiché ici décrit le moteur RÉEL (lib/estimateur/core.ts + catalog.json).
   Aucune source externe n'est revendiquée : le barème régional est un indice interne, et le dire
   franchement vaut mieux qu'une référence institutionnelle qu'on ne pourrait pas justifier. */

const LOTS = [
  "Études / Conception", "Annexes de chantier", "Location de matériel", "Raccordements aux réseaux",
  "Démolition", "Maçonnerie", "Charpente, couverture & structure bois", "Façade",
  "Menuiseries extérieures", "Isolation", "Cloisons / Plâtrerie", "Électricité", "Plomberie",
  "Chauffage / VMC", "Carrelage / Revêtements", "Peinture", "Menuiseries intérieures", "Cuisine",
];

const FINITIONS = [
  { lot: "Études, démolition, location, raccordements", eco: "—", std: "—", prem: "—", note: "aucun écart : une benne coûte le même prix quelle que soit la finition" },
  { lot: "Maçonnerie, charpente, isolation, électricité, chauffage", eco: "−17 %", std: "−12 %", prem: "référence", note: "écart faible : le technique varie peu" },
  { lot: "Façade, cloisons, plomberie, menuiseries", eco: "−25 %", std: "−17 %", prem: "référence", note: "écart moyen" },
  { lot: "Carrelage, peinture, cuisine", eco: "−33 %", std: "−22 %", prem: "référence", note: "écart fort : c'est là que le choix des matériaux pèse le plus" },
];

const REGIONS = [
  { zone: "Paris & petite couronne", dep: "75, 92, 93, 94", mo: "+20 %" },
  { zone: "Zone tendue", dep: "77, 78, 91, 95, 06, 83, 13, 69, 74, 73", mo: "+10 %" },
  { zone: "Grande agglomération", dep: "33, 31, 44, 35, 59, 67, 34, 38, 21, 54, 68, 64, 63, 76", mo: "+4 %" },
  { zone: "Moyenne nationale", dep: "tous les autres départements", mo: "référence" },
  { zone: "Zone rurale", dep: "23, 15, 58, 55, 52, 08, 36, 48, 32, 46, 09, 88, 70, 03, 43, 12, 19, 89, 05, 53, 61", mo: "−10 %" },
  { zone: "Corse", dep: "20", mo: "+8 % (et +5 % sur les matériaux)" },
  { zone: "Outre-mer", dep: "971 à 974", mo: "+5 % (et +15 % sur les matériaux)" },
];

export default function MethodologiePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Méthodologie", item: `${siteUrl}/methodologie` },
      ],
    }, {
    "@type": "TechArticle",
    headline: "Méthodologie d'estimation AVYORA",
    description: metadata.description,
    url: `${siteUrl}/methodologie`,
    inLanguage: "fr-FR",
    dateModified: PRIX_MAJ,
    publisher: { "@type": "Organization", name: "AVYORA", url: siteUrl },
    }],
  };

  return (
    <div className="av-metho mx-auto max-w-3xl py-4 sm:py-8">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Fil d'Ariane" className="fil">
        <Link href="/">Accueil</Link> <span aria-hidden="true">›</span> Méthodologie
      </nav>

      <header>
        <p className="eyebrow">Transparence</p>
        <h1>D&apos;où viennent les prix AVYORA</h1>
        <p className="lead">
          Une estimation de travaux n&apos;a de valeur que si l&apos;on sait comment elle est faite. Cette page
          décrit exactement le calcul, ce qu&apos;il couvre, et ce sur quoi il ne t&apos;engage à rien.
        </p>
        <p className="maj">Référentiel de prix revu le <strong>{PRIX_MAJ_FR}</strong>.</p>
      </header>

      <h2>Le référentiel : 200 postes, 18 corps d&apos;état</h2>
      <p>
        Tout part d&apos;un catalogue de <strong>200 postes de travaux</strong> répartis sur{" "}
        <strong>18 corps d&apos;état</strong>. Chaque poste porte son unité de mesure — au m² (77 postes),
        à l&apos;unité (60), au forfait (33), au mètre linéaire (19) ou à la journée (11).
      </p>
      <div className="chips">{LOTS.map((l) => <span key={l}>{l}</span>)}</div>
      <p>
        Chaque poste porte <strong>deux prix</strong> : le prix <em>fourni-posé</em> (matériaux + pose par un
        artisan) et le prix <em>fourniture seule</em>, utilisé quand tu déclares faire le travail toi-même.
        Certains postes n&apos;ont pas de prix fourniture : ce sont des prestations pures, comme une étude ou
        une dépose — il n&apos;y a rien à acheter, seulement du temps de travail.
      </p>

      <h2>Les quatre ajustements appliqués à chaque poste</h2>

      <h3>1. Le niveau de finition</h3>
      <p>
        Le catalogue est calé sur la finition <strong>premium</strong>, qui sert de référence. Les niveaux
        éco et standard appliquent une décote, plus ou moins forte selon le corps d&apos;état — parce que le
        choix des matériaux ne pèse pas du tout de la même façon selon le lot.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Corps d&apos;état</th><th>Éco</th><th>Standard</th><th>Premium</th></tr></thead>
          <tbody>
            {FINITIONS.map((f) => (
              <tr key={f.lot}>
                <td>{f.lot}<small>{f.note}</small></td>
                <td className="n">{f.eco}</td><td className="n">{f.std}</td><td className="n">{f.prem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>2. La région</h3>
      <p>
        La main-d&apos;œuvre est ce qui varie le plus d&apos;un territoire à l&apos;autre ; les matériaux, eux,
        sont à peu près nationaux. AVYORA applique donc un coefficient au <strong>coût de pose</strong>,
        déterminé par les deux premiers chiffres de ton code postal.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Zone</th><th>Départements</th><th>Main-d&apos;œuvre</th></tr></thead>
          <tbody>
            {REGIONS.map((r) => (
              <tr key={r.zone}><td>{r.zone}</td><td><small>{r.dep}</small></td><td className="n">{r.mo}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="franc">
        <strong>Ce qu&apos;il faut savoir sur ce barème.</strong> C&apos;est un <strong>indice interne AVYORA</strong>,
        établi par département et volontairement modéré. Il n&apos;est adossé à aucun indice public officiel,
        et nous préférons l&apos;écrire plutôt que de laisser croire le contraire. Conséquence directe : pour une
        grande partie des départements, le coefficient vaut exactement 1 — le prix affiché y est donc le prix
        national, sans ajustement. C&apos;est aussi pour cette raison que nous ne publions une page « prix par
        ville » que là où l&apos;écart est réel.
      </div>

      <h3>3. La TVA</h3>
      <p>
        Les prix affichés sont <strong>TTC</strong>. Le taux appliqué dépend du poste et de la nature du
        logement : <strong>10 %</strong> pour la rénovation d&apos;un logement achevé depuis plus de deux ans,
        <strong> 5,5 %</strong> sur les travaux d&apos;amélioration énergétique (isolation, chauffage performant),
        et <strong>20 %</strong> pour le neuf, un logement de moins de deux ans ou un local professionnel.
        Les matériaux que tu achètes seul restent à 20 % dans tous les cas.
      </p>

      <h3>4. La provision pour aléas</h3>
      <p>
        Une rénovation réserve des surprises : réseau hors normes découvert en ouvrant un mur, plancher à
        reprendre, humidité. Une provision de <strong>7 % par défaut</strong> est ajoutée au total, ajustable
        dans l&apos;estimateur. Elle ne s&apos;applique pas au lot Études, dont le montant est connu à
        l&apos;avance.
      </p>

      <h2>Ce que l&apos;estimation ne fait pas</h2>
      <ul className="nope">
        <li><strong>Ce n&apos;est pas un devis.</strong> Aucun artisan n&apos;a vu ton logement. Seule une visite permet de chiffrer fermement.</li>
        <li><strong>Elle ne remplace pas une étude technique.</strong> Ouvrir un mur porteur, reprendre une charpente ou traiter de l&apos;humidité demande l&apos;avis d&apos;un professionnel — l&apos;estimation les chiffre à titre indicatif.</li>
        <li><strong>Elle ne connaît pas l&apos;état réel de ton bien.</strong> Deux maisons de 100 m² du même âge peuvent différer du simple au double selon ce que cachent les murs.</li>
        <li><strong>Elle n&apos;inclut ni les aides, ni le foncier, ni les frais annexes</strong> (notaire, assurance dommages-ouvrage, déménagement, relogement).</li>
        <li><strong>Une fourchette reste une fourchette.</strong> AVYORA annonce ±15 % : c&apos;est un ordre de grandeur pour décider, pas un engagement de prix.</li>
      </ul>

      <h2>Comment les prix évoluent</h2>
      <p>
        Le référentiel est revu manuellement, poste par poste, à mesure que les prix du marché bougent. La
        date de la dernière révision est affichée sur cette page et sur chaque page de prix — si elle
        commence à dater, tu le vois. Nous ne republions pas de « mise à jour » automatique qui ne
        correspondrait à aucun changement réel.
      </p>

      <div className="cta">
        <p><strong>Tu veux un chiffre pour ton projet ?</strong> L&apos;estimation rapide est gratuite et sans inscription : quatre questions, une fourchette ajustée à ton code postal.</p>
        <Link href="/projets/nouveau/rapide" className="btn">Estimer mes travaux →</Link>
      </div>

      <p className="voir">
        À lire aussi : <Link href="/prix-travaux">prix des travaux par type</Link> ·{" "}
        <Link href="/prix-renovation">prix de la rénovation par ville</Link> ·{" "}
        <Link href="/guides">guides des prix</Link>
      </p>
    </div>
  );
}

const CSS = `
.av-metho .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:14px}
.av-metho .fil a{color:var(--color-muted);text-decoration:none}
.av-metho .fil a:hover{color:var(--color-brand-700)}
.av-metho h1{font-size:30px;font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin-top:6px}
.av-metho .lead{font-size:16px;line-height:1.65;color:var(--color-muted);margin-top:10px}
.av-metho .maj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-metho h2{font-size:20px;font-weight:600;color:var(--color-ink);margin:34px 0 10px;letter-spacing:-.01em}
.av-metho h3{font-size:15.5px;font-weight:600;color:var(--color-ink);margin:24px 0 6px}
.av-metho p{font-size:14.5px;line-height:1.7;color:var(--color-muted);margin:8px 0}
.av-metho .chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
.av-metho .chips span{font-size:12.5px;font-weight:500;color:var(--color-muted);background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:999px;padding:5px 11px}
.av-metho .tw{overflow-x:auto;margin:12px 0;border:1px solid var(--color-line);border-radius:12px}
.av-metho table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:520px}
.av-metho th{text-align:left;font-weight:600;color:var(--color-ink);background:var(--color-surface-2);padding:10px 12px;font-size:12.5px}
.av-metho td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted);vertical-align:top}
.av-metho td.n{font-family:var(--font-geist-mono),monospace;font-weight:600;color:var(--color-ink);white-space:nowrap}
.av-metho td small{display:block;color:var(--color-faint);font-size:11.5px;margin-top:3px;line-height:1.5}
.av-metho .franc{border:1px solid #f0d9a8;background:#fdf8ec;border-radius:12px;padding:13px 16px;margin:16px 0;font-size:13.5px;line-height:1.7;color:#6b5320}
.av-metho .nope{margin:10px 0;padding-left:20px}
.av-metho .nope li{font-size:14.5px;line-height:1.7;color:var(--color-muted);margin:7px 0}
.av-metho .nope strong{color:var(--color-ink)}
.av-metho .cta{margin:32px 0 10px;padding:20px;border:1px solid var(--color-line);border-radius:16px;background:var(--color-surface-2)}
.av-metho .cta p{margin:0 0 12px}
.av-metho .cta .btn{display:inline-flex;align-items:center;background:var(--color-brand-600,#4F46E5);color:#fff;font-weight:600;font-size:14px;border-radius:999px;padding:11px 20px;text-decoration:none}
.av-metho .voir{font-size:13px;color:var(--color-faint);margin-top:22px}
.av-metho .voir a{color:var(--color-brand-700);font-weight:500}
`;

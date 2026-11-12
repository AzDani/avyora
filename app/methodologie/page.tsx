import Link from "next/link";
import type { Metadata } from "next";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";
import { ALEAS_RENO, ALEAS_NEUF } from "@/lib/estimateur/core";
import { CATALOG } from "@/lib/estimateur";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { catalogueStats, postesParUnite } from "@/lib/seo-prix";
import { getLocale } from "@/lib/i18n/server";
import { seoMeta } from "@/lib/seo-og";
import MethodologieEN, { metaEN } from "./contenu-en";
import { CSS } from "./style";

/* Plus de `force-static` : la page suit la langue choisie (cookie av-lang, lu par getLocale). Un robot,
   sans cookie, reçoit toujours la version française — la seule indexée (canonical unique). */

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Description, avec les compteurs LUS dans le catalogue (jamais écrits en dur). */
function descriptionFR(): string {
  const s = catalogueStats();
  return `Comment AVYORA calcule le coût de tes travaux : ${s.postes} postes sur ${s.lots} corps d'état, finition, main-d'œuvre régionale, TVA et aléas. Et ses limites.`;
}

export async function generateMetadata(): Promise<Metadata> {
  if ((await getLocale()) === "en") return metaEN();
  return seoMeta({ title: "Méthodologie — d'où viennent les prix AVYORA", description: descriptionFR(), path: "/methodologie" });
}

/** « au m² (80 postes), à l'unité (63), au forfait (33)… » : lu dans le catalogue, du plus fréquent au moins fréquent. */
const UNITES_FR: Record<string, string> = {
  m2: "au m²", u: "à l'unité", forfait: "au forfait", ml: "au mètre linéaire", jour: "à la journée",
};
function phraseUnites(): string {
  const parts = postesParUnite().map((x, i) => `${UNITES_FR[x.unite] ?? x.unite} (${x.n}${i === 0 ? " postes" : ""})`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ou ${parts[parts.length - 1]}` : parts.join("");
}

/* Tout ce qui est affiché ici décrit le moteur RÉEL (lib/estimateur/core.ts + catalog.json).
   Aucune source externe n'est revendiquée : le barème régional est un indice interne, et le dire
   franchement vaut mieux qu'une référence institutionnelle qu'on ne pourrait pas justifier. */

/* Les corps d'état, dans l'ordre du catalogue et avec leurs libellés affichés : la liste suit le
   catalogue au lieu d'en être une copie. */
const LOTS = CATALOG.map((l) => catT("fr", "corps", l.c));

const FINITIONS = [
  { lot: "Études, démolition, location, raccordements", eco: "—", std: "—", prem: "—", note: "aucun écart : une benne coûte le même prix quelle que soit la finition" },
  { lot: "Maçonnerie, charpente, isolation, électricité, chauffage", eco: "−17\u00a0%", std: "−12\u00a0%", prem: "référence", note: "écart faible : le technique varie peu" },
  { lot: "Façade, cloisons, plomberie, menuiseries", eco: "−25\u00a0%", std: "−17\u00a0%", prem: "référence", note: "écart moyen" },
  { lot: "Carrelage, peinture, cuisine", eco: "−33\u00a0%", std: "−22\u00a0%", prem: "référence", note: "écart fort : c'est là que le choix des matériaux pèse le plus" },
];

const REGIONS = [
  { zone: "Paris & petite couronne", dep: "75, 92, 93, 94", mo: "+20\u00a0%" },
  { zone: "Secteur très demandé", dep: "77, 78, 91, 95, 06, 83, 13, 69, 74, 73", mo: "+10\u00a0%" },
  { zone: "Grande agglomération", dep: "33, 31, 44, 35, 59, 67, 34, 38, 21, 54, 68, 64, 63, 76", mo: "+4\u00a0%" },
  { zone: "Moyenne nationale", dep: "tous les autres départements", mo: "référence" },
  { zone: "Zone rurale", dep: "23, 15, 58, 55, 52, 08, 36, 48, 32, 46, 09, 88, 70, 03, 43, 12, 19, 89, 05, 53, 61", mo: "−10\u00a0%" },
  // La majoration des matériaux passe sous le taux (balise small) : sur une seule ligne insécable,
  // elle sortait du cadre du tableau sur téléphone.
  { zone: "Corse", dep: "20", mo: "+8\u00a0%", mat: "et +5\u00a0% sur les matériaux" },
  { zone: "Outre-mer", dep: "971 à 974", mo: "+5\u00a0%", mat: "et +15\u00a0% sur les matériaux" },
] as { zone: string; dep: string; mo: string; mat?: string }[];

export default async function MethodologiePage() {
  if ((await getLocale()) === "en") return <MethodologieEN />;
  const stats = catalogueStats();
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
    description: descriptionFR(),
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

      {/* Compteurs LUS dans le catalogue (lib/seo-prix.ts) : écrits en dur, ils annonçaient un total et
          une répartition par unité périmés de plusieurs postes — sur la page qui dit décrire
          « exactement le calcul ». */}
      <h2>Le référentiel : {stats.postes} postes, {stats.lots} corps d&apos;état</h2>
      <p>
        Tout part d&apos;un catalogue de <strong>{stats.postes} postes de travaux</strong> répartis sur{" "}
        <strong>{stats.lots} corps d&apos;état</strong>. Chaque poste porte son unité de mesure —{" "}
        {phraseUnites()}.
      </p>
      <div className="chips">{LOTS.map((l) => <span key={l}>{l}</span>)}</div>
      <p>
        Chaque poste porte <strong>deux prix</strong> : le prix <em>fourni-posé</em> (matériaux + pose par un
        artisan) et le prix <em>fourniture seule</em>, utilisé quand tu déclares faire le travail toi-même.
        Certains postes n&apos;ont pas de prix fourniture : ce sont des prestations pures, comme une étude ou
        une dépose — il n&apos;y a rien à acheter, seulement du temps de travail.
      </p>

      <h2>Faire soi-même : ce que l&apos;estimation propose</h2>
      <p>
        « Je le fais » est proposé sur chaque poste qui a un prix fourniture et n&apos;est pas réservé aux
        pros, en rénovation comme en construction neuve : électricité, plomberie, mur porteur, charpente
        ou pompe à chaleur compris.
        C&apos;est à toi de juger ce que tu sais faire. Trois rappels accompagnent ce choix :
      </p>
      <ul className="nope">
        <li><strong>Hors garantie décennale.</strong>{" "}Un poste de maçonnerie, de charpente, de couverture ou de menuiseries extérieures fait soi-même n&apos;est couvert par aucune garantie décennale. Pour un mur porteur ou une charpente, une étude est conseillée.</li>
        <li><strong>Fluide frigorigène.</strong>{" "}Une pompe à chaleur ou une climatisation se pose soi-même ; dès qu&apos;il faut raccorder ou charger le circuit de fluide frigorigène (modèle split), la mise en service demande un professionnel titulaire de l&apos;attestation de capacité.</li>
        <li><strong>Pro obligatoire.</strong>{" "}Quelques postes restent réservés aux professionnels et l&apos;affichent : les raccordements faits par le gestionnaire du réseau, les contrôles et attestations, les études (géomètre, architecte, bureau d&apos;études).</li>
      </ul>
      <p>
        Dans l&apos;estimation rapide d&apos;une rénovation, « Je fais un max moi-même » met en
        « Je le fais » tout ce qui peut l&apos;être, électricité et structure comprises. En construction neuve,
        le même choix laisse par défaut aux pros la structure, le toit, les menuiseries
        extérieures, les branchements, la pompe à chaleur, la climatisation et la borne de recharge : tu peux
        les reprendre poste par poste
        dans l&apos;estimation détaillée.
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
      <p>
        En <strong>construction neuve</strong>, la finition éco s&apos;écarte deux fois plus du standard
        (−22&nbsp;%, −33&nbsp;% et −44&nbsp;% au lieu de −17&nbsp;%, −25&nbsp;% et −33&nbsp;%) : le total d&apos;une
        maison porte aussi les études, les taxes, les branchements et le gros œuvre, que la finition ne touche pas.
      </p>

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
              <tr key={r.zone}><td>{r.zone}</td><td><small>{r.dep}</small></td><td className="n">{r.mo}{r.mat && <small>{r.mat}</small>}</td></tr>
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
        logement : <strong>10&nbsp;%</strong>{" "}
        pour la rénovation d&apos;un logement achevé depuis plus de deux ans, <strong>5,5&nbsp;%</strong>{" "}
        sur les travaux d&apos;amélioration énergétique (isolation, chauffage performant),
        et <strong>20&nbsp;%</strong>{" "}
        pour le neuf, un logement de moins de deux ans ou un local professionnel.
        Les matériaux que tu achètes seul restent à 20&nbsp;% dans tous les cas.
      </p>

      <h3>4. La provision pour aléas</h3>
      <p>
        Une rénovation réserve des surprises : réseau hors normes découvert en ouvrant un mur, plancher à
        reprendre, humidité. Une provision de <strong>{ALEAS_RENO}&nbsp;% par défaut</strong>{" "}
        est ajoutée au total d&apos;une rénovation ({ALEAS_NEUF}&nbsp;% pour une construction neuve, dont le
        chantier part de zéro), ajustable dans l&apos;estimateur. Elle ne s&apos;applique ni au lot Études,
        dont le montant est connu à l&apos;avance, ni aux taxes et à l&apos;assurance d&apos;une construction.
      </p>

      <h2>Ce que l&apos;estimation ne fait pas</h2>
      <ul className="nope">
        <li><strong>Ce n&apos;est pas un devis.</strong> Aucun artisan n&apos;a vu ton logement. Seule une visite permet de chiffrer fermement.</li>
        <li><strong>Elle ne remplace pas une étude technique.</strong> Ouvrir un mur porteur, reprendre une charpente ou traiter de l&apos;humidité demande l&apos;avis d&apos;un professionnel — l&apos;estimation les chiffre à titre indicatif.</li>
        <li><strong>Elle ne connaît pas l&apos;état réel de ton bien.</strong> Deux maisons de 100 m² du même âge peuvent différer du simple au double selon ce que cachent les murs.</li>
        <li><strong>Elle n&apos;inclut ni les aides, ni le foncier, ni les frais annexes</strong> (notaire, assurance dommages-ouvrage, déménagement, relogement).</li>
        <li><strong>Une fourchette reste une fourchette.</strong> AVYORA annonce ±15&nbsp;% : c&apos;est un ordre de grandeur pour décider, pas un engagement de prix.</li>
      </ul>

      <h2>Comment les prix évoluent</h2>
      <p>
        Le référentiel est revu manuellement, poste par poste, à mesure que les prix du marché bougent. La
        date de la dernière révision est affichée sur cette page et sur chaque page de prix — si elle
        commence à dater, tu le vois. Nous ne republions pas de « mise à jour » automatique qui ne
        correspondrait à aucun changement réel.
      </p>

      <div className="cta">
        <p><strong>Tu veux un chiffre pour ton projet ?</strong> L&apos;estimation rapide est gratuite, sans compte pour une pièce ou tout le bien : quatre questions, une fourchette ajustée à ton code postal.</p>
        <Link href="/estimation-travaux" className="btn">Estimer mes travaux →</Link>
      </div>

      <p className="voir">
        À lire aussi : <Link href="/prix-travaux">prix des travaux par type</Link> ·{" "}
        <Link href="/prix-renovation">prix de la rénovation par ville</Link> ·{" "}
        <Link href="/guides">guides des prix</Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { VILLES_SEO } from "@/lib/villes";
import { PRIX_MAJ, PRIX_MAJ_FR } from "@/lib/prix-maj";
import { prixNational, estim, posteRef, partMainOeuvreParLot, postesSansFourniture, catalogueStats } from "@/lib/seo-prix";
import { og } from "@/lib/seo-og";

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
  if (!g) return { title: "Guide des prix" };
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: og({ title: g.title, description: g.description, path: `/guides/${g.slug}` }),
  };
}

const CSS = `
.av-guide{max-width:760px;margin:0 auto}
.av-guide h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .tw,.av-guide .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
.av-seo .tw table,.av-guide .tw table{margin:0;min-width:420px}
.av-guide .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-guide .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-guide .prixmaj a{color:var(--color-brand-700);font-weight:500}
.av-guide .prixmaj a:hover{text-decoration:underline}
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
/* Matrice surface x ampleur : 5 colonnes, elle ne peut pas tenir sur un telephone.
   On assume le scroll horizontal dans son propre conteneur — le corps de page, lui, ne
   deborde jamais. min-width explicite pour que les en-tetes ne se cassent pas en 3 lignes. */
.av-guide .tw.matrice table{min-width:580px}
.av-guide .tw.matrice th,.av-guide .tw.matrice td{padding:9px 10px}
.av-guide .tw.matrice td.num{white-space:nowrap}
.av-guide .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-guide .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-guide .faq p{margin:8px 0 0}
.av-guide .phase{border-left:2px solid var(--color-brand-100,#e0e7ff);padding-left:14px;margin:16px 0}
.av-guide .phase h3{margin-top:0}
.av-guide .villes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-guide .villes a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-guide .villes a:hover{background:var(--color-brand-100)}
/* Mobile : le corps de texte passe a 16px (defaut navigateur) — ces pages sont faites pour etre
   lues longuement sur un telephone, et 14,5px y est inutilement fatigant. */
@media(max-width:560px){
.av-guide p,.av-guide li{font-size:16px}
.av-guide .note{font-size:13.5px}
.av-guide .lead{font-size:16.5px}
}
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
          <details key={i} open>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}

function GuidesPratiques({ sauf }: { sauf?: string }) {
  const tous = [
    { slug: "verifier-devis-travaux", txt: "vérifier un devis de travaux" },
    { slug: "ordre-travaux-renovation", txt: "dans quel ordre faire ses travaux" },
    { slug: "faire-soi-meme-ou-artisan", txt: "faire soi-même ou faire faire" },
  ].filter((g) => g.slug !== sauf);
  return (
    <p>
      À lire aussi :{" "}
      {tous.map((g, i) => (
        <span key={g.slug}>
          {i > 0 ? " · " : ""}
          <Link href={`/guides/${g.slug}`}>{g.txt}</Link>
        </span>
      ))}
      {" "}·{" "}
      <Link href="/methodologie">d&apos;où viennent nos prix</Link>
    </p>
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
        {VILLES_SEO.slice(0, 16).map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href="/prix-renovation">Toutes les villes →</Link>
      </div>
    </>
  );
}

/** Corps « appartement ». */
/**
 * FAQ des guides — SOURCE DE VÉRITÉ UNIQUE, consommée à la fois par le corps de la page et par le
 * JSON-LD FAQPage. Google exige que question et réponse balisées figurent TELLES QUELLES dans le
 * rendu : deux copies manuelles finissent toujours par diverger, et le balisage devient inéligible.
 */
function faqAppartement() {
  const grille = prixNational();
  const g = (v: string) => grille.find((x) => x.v === v)!;
  const complete = g("complete");
  return [
    {
      q: "Combien coûte la rénovation complète d'un appartement au m² ?",
      a: `En moyenne nationale, comptez environ ${euro(complete.appartM2)}/m² pour une rénovation complète d'appartement (finition standard, travaux confiés à des artisans), soit une fourchette de ±15 % selon l'état du bien.`,
    },
    {
      q: "Combien coûte la rénovation d'un appartement de 50 m² ?",
      a: `Pour un appartement de 50 m², comptez environ ${euro(estim("", "T3", 50, "rafraich").ttc)} pour un rafraîchissement, ${euro(estim("", "T3", 50, "complete").ttc)} pour une rénovation complète et ${euro(estim("", "T3", 50, "lourde").ttc)} pour une rénovation totale (curage et redistribution). Budgets TTC, finition standard, marge ±15 %.`,
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
}

function faqMaison() {
  const grille = prixNational();
  const g = (v: string) => grille.find((x) => x.v === v)!;
  const complete = g("complete");
  const lourde = g("lourde");
  return [
    {
      q: "Combien coûte la rénovation complète d'une maison au m² ?",
      a: `En moyenne nationale, comptez environ ${euro(complete.maisonM2)}/m² pour une rénovation complète de maison, et jusqu'à ${euro(lourde.maisonM2)}/m² pour une rénovation lourde (avec enveloppe : toiture, façade, charpente).`,
    },
    {
      q: "Combien coûte la rénovation d'une maison de 120 m² ?",
      a: `Pour une maison de 120 m², comptez environ ${euro(estim("", "Maison", 120, "complete").ttc)} pour une rénovation complète et ${euro(estim("", "Maison", 120, "lourde").ttc)} pour une rénovation lourde incluant l'enveloppe (toiture, façade, charpente). Budgets TTC, finition standard, marge ±15 %.`,
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
}

function faqDuGuide(slug: string) {
  if (slug === "prix-renovation-appartement") return faqAppartement();
  if (slug === "ordre-travaux-renovation") return faqOrdre();
  if (slug === "verifier-devis-travaux") return faqDevis();
  if (slug === "faire-soi-meme-ou-artisan") return faqDIY();
  return faqMaison();
}

/* Section partagée par les deux guides de prix : les leviers qui font réellement bouger la facture.
   Tout est adossé au moteur — coefficients de finition de lib/estimateur/core.ts et prix
   « fourniture seule » du catalogue — donc rien d'inventé, et personne d'autre ne peut l'écrire. */
function LeviersPrix() {
  const peinture = posteRef("Peinture des murs");
  const carrelage = posteRef("Carrelage au sol");
  return (
    <>
      <h2>Trois leviers pour faire baisser la facture</h2>
      <p>
        À projet identique, le montant final peut varier fortement selon trois décisions. Les voici
        par ordre d&apos;impact, chiffrés à partir du référentiel AVYORA.
      </p>

      <h3>1. Le niveau de finition</h3>
      <p>
        C&apos;est le levier le plus puissant, et le plus indolore. Passer du premium au standard fait
        baisser la facture d&apos;environ <strong>12 %</strong> sur les lots techniques (maçonnerie,
        électricité, isolation) et jusqu&apos;à <strong>22 %</strong> sur les lots où le choix des
        matériaux domine — carrelage, peinture, cuisine. En éco, l&apos;écart monte respectivement à
        <strong> 17 %</strong> et <strong>33 %</strong>.
      </p>
      <p>
        Autrement dit : l&apos;essentiel de l&apos;économie se joue sur ce qui se voit, pas sur ce qui
        tient le bâtiment. C&apos;est plutôt une bonne nouvelle — on peut réduire le budget sans
        toucher à la qualité technique.
      </p>

      <h3>2. Ce que vous faites vous-même</h3>
      <p>
        Chaque poste du référentiel porte deux prix : fourni-posé, et fourniture seule. L&apos;écart,
        c&apos;est la main-d&apos;œuvre — et il est spectaculaire sur les postes accessibles.
        {peinture && (
          <> La peinture des murs revient à <strong>{peinture.fp} €/m²</strong> posée contre{" "}
          <strong>{peinture.sm} €/m²</strong> en fournitures seules.</>
        )}
        {carrelage && (
          <> Le carrelage au sol : <strong>{carrelage.fp} €/m²</strong> posé contre{" "}
          <strong>{carrelage.sm} €/m²</strong> de matériaux.</>
        )}
      </p>
      <p>
        Attention à ne pas confondre économie et illusion : peindre soi-même est à la portée de
        beaucoup, refaire une installation électrique ne l&apos;est pas, et certains travaux engagent
        votre responsabilité comme votre assurance. L&apos;estimateur permet de trancher poste par
        poste et de voir l&apos;économie réelle avant de s&apos;engager.
      </p>

      <h3>3. L&apos;ampleur, décidée tôt</h3>
      <p>
        Entre un rafraîchissement et une rénovation lourde, le coût au m² est multiplié par environ
        cinq. La vraie question n&apos;est donc pas « combien coûte le m² » mais « qu&apos;est-ce que je
        refais vraiment ». Repousser un poste d&apos;un an coûte presque toujours moins cher que de le
        faire à moitié — sauf s&apos;il faudra rouvrir ce qu&apos;on vient de fermer, et c&apos;est là
        que{" "}
        <Link href="/guides/ordre-travaux-renovation">l&apos;ordre des travaux</Link> devient décisif.
      </p>
      <p className="note">
        Coefficients et prix issus du référentiel AVYORA, mis à jour le {PRIX_MAJ_FR} —{" "}
        <Link href="/methodologie">voir la méthode</Link>.
      </p>
    </>
  );
}

function BodyAppartement() {
  const grille = prixNational();
  const g = (v: string) => grille.find((x) => x.v === v)!;
  const complete = g("complete");
  // Matrice surface × ampleur : chaque cellule est une estimation complète rejouée par le moteur.
  // Totaux TTC et non €/m² — les paliers de presetRapide (pièces, niveaux) font localement remonter
  // le ratio au m² quand la surface augmente, ce qui se lirait comme une erreur de calcul.
  const matrice = [30, 50, 70, 90, 120].map((surface) => ({
    surface,
    cells: grille.map((l) => estim("", "T3", surface, l.v).ttc),
  }));

  const faq = faqAppartement();

  return (
    <>
      <p className="lead">
        En 2026, rénover un appartement coûte en moyenne <strong>{euro(g("rafraich").appartM2)}/m²</strong>{" "}pour un
        rafraîchissement et jusqu&apos;à <strong>{euro(complete.appartM2)}/m²</strong>{" "}pour une{" "}
        <strong>rénovation complète</strong> (finition standard, tout confié à des artisans). Le prix dépend surtout de
        l&apos;ampleur des travaux, de la finition et de la région.
      </p>

      <h2>Prix au m² d&apos;une rénovation d&apos;appartement par ampleur</h2>
      <div className="tw">
      <table>
        <thead>
          <tr><th>Ampleur des travaux</th><th>Prix au m² (TTC)</th></tr>
        </thead>
        <tbody>
          {grille.map((l) => (
            <tr key={l.v}><td>{l.labelAppart}</td><td className="num">{euro(l.appartM2)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="note">Prix TTC indicatifs, moyenne nationale, finition standard, marge ±15 %. Base : appartement 70 m².</p>

      <h2>Budget total selon la surface et l&apos;ampleur</h2>
      <p>
        Le tableau ci-dessus donne un prix au m² calculé sur un appartement de 70 m². Mais ce ratio
        baisse quand la surface augmente : certains postes (tableau électrique, cuisine, salle de
        bain) coûtent la même chose à 40 m² qu&apos;à 120 m². Voici donc les budgets totaux, croisés
        avec l&apos;ampleur des travaux.
      </p>
      <div className="tw matrice">
      <table>
        <thead>
          <tr>
            <th>Surface</th>
            {grille.map((l) => <th key={l.v}>{l.labelAppart}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrice.map((r) => (
            <tr key={r.surface}>
              <td>{r.surface} m²</td>
              {r.cells.map((c, i) => <td key={i} className="num">{euro(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="note">
        Budgets TTC, finition standard, travaux confiés à des artisans, marge ±15 % sur chaque
        montant. Calculés par le moteur AVYORA, pas recopiés : chaque cellule est une estimation
        complète rejouée sur la surface et l&apos;ampleur de sa ligne.
      </p>

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

      <LeviersPrix />

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
  // Matrice surface × ampleur (mêmes contraintes que le guide appartement : totaux TTC, pas de €/m²).
  const matrice = [80, 100, 120, 150, 200].map((surface) => ({
    surface,
    cells: grille.map((l) => estim("", "Maison", surface, l.v).ttc),
  }));

  const faq = faqMaison();

  return (
    <>
      <p className="lead">
        En 2026, rénover une maison coûte en moyenne <strong>{euro(complete.maisonM2)}/m²</strong>{" "}pour une{" "}
        <strong>rénovation complète</strong>, et jusqu&apos;à <strong>{euro(lourde.maisonM2)}/m²</strong>{" "}pour une{" "}
        <strong>rénovation lourde</strong> incluant l&apos;enveloppe (toiture, façade, charpente). Plus cher qu&apos;un
        appartement, car la maison porte tout le bâti.
      </p>

      <h2>Prix au m² d&apos;une rénovation de maison par ampleur</h2>
      <div className="tw">
      <table>
        <thead>
          <tr><th>Ampleur des travaux</th><th>Prix au m² (TTC)</th></tr>
        </thead>
        <tbody>
          {grille.map((l) => (
            <tr key={l.v}><td>{l.labelMaison}</td><td className="num">{euro(l.maisonM2)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="note">Prix TTC indicatifs, moyenne nationale, finition standard, marge ±15 %. Base : maison 100 m².</p>

      <h2>Budget total selon la surface et l&apos;ampleur</h2>
      <p>
        Le prix au m² ci-dessus est calculé sur une maison de 100 m². Il baisse quand la surface
        augmente, parce qu&apos;une partie du budget (cuisine, salles de bain, tableau électrique,
        chaudière) ne dépend pas de la surface. Voici les budgets totaux, croisés avec l&apos;ampleur.
      </p>
      <div className="tw matrice">
      <table>
        <thead>
          <tr>
            <th>Surface</th>
            {grille.map((l) => <th key={l.v}>{l.labelMaison}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrice.map((r) => (
            <tr key={r.surface}>
              <td>{r.surface} m²</td>
              {r.cells.map((c, i) => <td key={i} className="num">{euro(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="note">
        Budgets TTC, finition standard, travaux confiés à des artisans, marge ±15 % sur chaque
        montant. Chaque cellule est une estimation complète rejouée par le moteur AVYORA sur la
        surface et l&apos;ampleur de sa ligne.
      </p>

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

      <LeviersPrix />

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


/* ── Guide : ordre des travaux ───────────────────────────────────────────────── */
/* Les 9 phases suivent l'ordre des lots du moteur (lib/seo-projets / chantierTasks) : démolition →
   gros œuvre → hors d'eau → hors d'air → second œuvre → finitions. Rien d'inventé ici, c'est la
   séquence que le chiffrage utilise déjà. */
const PHASES_TRAVAUX = [
  { n: 1, titre: "Démolition et curage", quoi: "Déposer cloisons, revêtements, anciens réseaux, sanitaires.", pourquoi: "On ne construit rien tant qu'on n'a pas vu ce qu'il y a derrière. C'est là que les mauvaises surprises apparaissent — et il vaut mieux qu'elles apparaissent avant d'avoir commandé la cuisine." },
  { n: 2, titre: "Gros œuvre et maçonnerie", quoi: "Ouvertures dans les murs, linteaux, reprises de structure, dalle, chape.", pourquoi: "Tout ce qui touche à la structure passe en premier : percer un mur porteur après avoir posé le parquet, c'est refaire le parquet." },
  { n: 3, titre: "Charpente et couverture", quoi: "Réparer ou refaire la charpente, la couverture, les gouttières.", pourquoi: "C'est la mise hors d'eau. Tant que le toit fuit, tout ce qu'on pose en dessous est menacé." },
  { n: 4, titre: "Menuiseries extérieures", quoi: "Fenêtres, portes-fenêtres, porte d'entrée, volets.", pourquoi: "C'est la mise hors d'air. Le chantier devient chauffable et sécurisé — condition pour que les enduits et peintures sèchent correctement." },
  { n: 5, titre: "Cloisons et distribution", quoi: "Monter les nouvelles cloisons, créer les faux plafonds.", pourquoi: "On fige les volumes avant de passer les réseaux : les prises se posent dans des murs qui existent." },
  { n: 6, titre: "Réseaux et isolation", quoi: "Électricité, plomberie, ventilation, puis isolation et doublage.", pourquoi: "Les gaines passent avant d'être refermées. Une fois le placo posé, chaque oubli devient une saignée." },
  { n: 7, titre: "Sols", quoi: "Chape, ragréage, carrelage, parquet, sol souple.", pourquoi: "Après les travaux salissants, avant les finitions. Poser le sol trop tôt, c'est le protéger — puis l'abîmer quand même." },
  { n: 8, titre: "Façade et extérieur", quoi: "Ravalement, enduit, isolation par l'extérieur, bardage.", pourquoi: "Souvent groupé avec la toiture pour mutualiser l'échafaudage — c'est là qu'on économise le plus en anticipant." },
  { n: 9, titre: "Finitions et équipements", quoi: "Peinture, menuiseries intérieures, cuisine, sanitaires, nettoyage.", pourquoi: "En dernier, quand plus personne ne traverse la pièce avec une disqueuse." },
];

const ERREURS_ORDRE = [
  { err: "Poser les sols avant les réseaux", cout: "Saignées dans un sol neuf, ou faux plafond pour rattraper. On refait le sol." },
  { err: "Peindre avant la fin des travaux salissants", cout: "Reprises généralisées. La peinture est le dernier poste, toujours." },
  { err: "Installer la cuisine avant la mise hors d'air", cout: "Meubles exposés à l'humidité, panneaux qui gonflent." },
  { err: "Isoler avant d'avoir traité l'humidité", cout: "L'isolant s'imbibe et perd son efficacité. Il faut le déposer et recommencer." },
  { err: "Refaire la façade avant la toiture", cout: "Deux échafaudages au lieu d'un, et une façade neuve salie par le chantier du toit." },
];

function BodyOrdre() {
  return (
    <>
      <p className="lead">
        L&apos;ordre des travaux n&apos;est pas une question de confort : c&apos;est ce qui décide si vous
        payez chaque poste une fois ou deux. La règle tient en une phrase — <strong>on va du plus
        structurel au plus fragile</strong>, et on ne referme jamais un mur avant d&apos;avoir fait passer
        ce qui doit y passer.
      </p>

      <h2>Les 9 phases, dans l&apos;ordre</h2>
      <p>
        C&apos;est la séquence que suit le chiffrage AVYORA lot par lot. Selon votre projet, certaines
        phases sautent — mais leur ordre relatif, lui, ne change pas.
      </p>
      {PHASES_TRAVAUX.map((p) => (
        <div key={p.n} className="phase">
          <h3>{p.n}. {p.titre}</h3>
          <p><strong>Ce qu&apos;on fait :</strong> {p.quoi}</p>
          <p><strong>Pourquoi à ce moment :</strong> {p.pourquoi}</p>
        </div>
      ))}

      <h2>Les inversions qui coûtent cher</h2>
      <div className="tw">
      <table>
        <thead><tr><th>L&apos;erreur</th><th>Ce qu&apos;elle coûte</th></tr></thead>
        <tbody>
          {ERREURS_ORDRE.map((e) => (
            <tr key={e.err}><td><strong>{e.err}</strong></td><td>{e.cout}</td></tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Les trois jalons à retenir</h2>
      <p>
        Si vous ne retenez qu&apos;une chose, retenez ces trois portes que le chantier franchit dans
        cet ordre :
      </p>
      <ul>
        <li><strong>Hors d&apos;eau</strong> — le toit ne fuit plus (phase 3). Rien d&apos;intérieur ne commence sérieusement avant.</li>
        <li><strong>Hors d&apos;air</strong> — les menuiseries sont posées (phase 4). Le bâtiment devient chauffable, les enduits peuvent sécher.</li>
        <li><strong>Avant fermeture</strong> — le dernier moment pour faire passer un câble ou un tuyau (phase 6). Après, chaque oubli se paie en démolition.</li>
      </ul>

      <Cta label="Chiffrer votre rénovation, lot par lot" />

      <h2>Et si vous faites une partie vous-même ?</h2>
      <p>
        L&apos;auto-rénovation change le calendrier, pas l&apos;ordre. Deux points d&apos;attention :
        les postes que vous gardez doivent s&apos;insérer <strong>sans bloquer les artisans</strong> —
        un plaquiste qui attend votre isolation pendant trois week-ends, c&apos;est un planning qui
        dérape. Et l&apos;électricité comme le gaz relèvent d&apos;obligations de conformité :
        l&apos;estimateur vous laisse choisir poste par poste entre « fait faire » et « je le fais »,
        mais ce choix-là mérite réflexion.
      </p>

      <Faq items={faqOrdre()} />
      <GuidesPratiques sauf="ordre-travaux-renovation" />
      <VillesLink />
    </>
  );
}

function faqOrdre() {
  return [
    { q: "Par quoi commencer une rénovation complète ?", a: "Par la démolition et le curage : déposer cloisons, revêtements et anciens réseaux. C'est ce qui révèle l'état réel du bien, avant d'avoir engagé des commandes." },
    { q: "Quand poser les fenêtres dans une rénovation ?", a: "Après la toiture et avant le second œuvre intérieur. Les menuiseries assurent la mise hors d'air : le chantier devient chauffable et les enduits peuvent sécher correctement." },
    { q: "Faut-il isoler avant ou après l'électricité ?", a: "Après. Les gaines électriques et les réseaux passent en premier, l'isolation et le doublage viennent les refermer. L'inverse oblige à rouvrir." },
    { q: "Quand poser le carrelage ou le parquet ?", a: "En phase 7, après les réseaux et l'isolation, avant les finitions. Assez tard pour ne pas subir les travaux salissants, assez tôt pour que les plinthes et les portes s'ajustent dessus." },
    { q: "Combien de temps dure une rénovation complète ?", a: "Cela dépend entièrement de l'ampleur et de la coordination des corps d'état. AVYORA chiffre le budget, pas la durée : demandez un planning à chaque artisan et vérifiez qu'ils s'enchaînent." },
  ];
}

/* ── Guide : vérifier un devis ───────────────────────────────────────────────── */
/* Les prix repères sont LUS dans le catalogue via posteRef() (finition standard, HT, fourni-posé).
   Ils ne peuvent donc pas diverger du moteur. */
const REPERES = [
  "Peinture des murs", "Peinture des plafonds", "Sol stratifié (imitation bois)", "Carrelage au sol",
  "Faïence / carrelage mural", "Monter une cloison", "Isolation des murs par l'intérieur",
  "Isolation des combles perdus (soufflage)", "Rénovation électrique complète",
  "Changer / mettre aux normes le tableau", "Porte intérieure battante", "Enlever un revêtement de sol",
];

const ALERTES = [
  { t: "Un prix global, sans détail", d: "« Rénovation complète : 48 000 € ». Impossible à vérifier, impossible à comparer, et impossible de retirer un poste pour faire baisser la note. Exigez le détail par poste, avec quantité et prix unitaire." },
  { t: "Des quantités absentes ou rondes", d: "« Peinture : forfait ». Une peinture se chiffre au m². Si la surface n'apparaît pas, vous ne pouvez pas savoir si elle est juste — et un écart de 30 m² passe inaperçu." },
  { t: "Un poste que vous n'avez pas demandé", d: "Ça arrive, et c'est parfois justifié (un support à reprendre). Mais cela doit être dit et expliqué, pas glissé dans la liste." },
  { t: "Un poste manquant", d: "Plus dangereux qu'un poste cher : la dépose de l'ancien sol, l'évacuation des gravats, les raccords après percement. Absents du devis, ils reviendront en cours de chantier au prix fort." },
  { t: "Un acompte élevé", d: "Un acompte se pratique, mais un artisan qui réclame la moitié avant d'avoir commencé mérite au minimum une question." },
  { t: "Une TVA à 20 % sur tout", d: "En rénovation d'un logement de plus de deux ans, la plupart des postes relèvent de 10 %, et les travaux d'amélioration énergétique de 5,5 %. Une TVA uniformément à 20 % doit être justifiée." },
];

function BodyDevis() {
  const reperes = REPERES.map((n) => posteRef(n)).filter((x): x is NonNullable<typeof x> => x != null);
  return (
    <>
      <p className="lead">
        Un devis de travaux n&apos;est pas qu&apos;un prix : c&apos;est la description de ce qui sera fait.
        La plupart des mauvaises surprises ne viennent pas d&apos;une ligne trop chère, mais d&apos;une
        <strong> ligne absente</strong>. Voici comment lire un devis, et des prix repères pour situer
        chaque ligne.
      </p>

      <h2>Ce qu&apos;un devis doit contenir</h2>
      <p>
        Avant même de regarder les montants, vérifiez que le document vous permet de comparer. Un devis
        exploitable identifie clairement l&apos;entreprise (raison sociale, adresse, SIRET, assurance
        décennale pour les travaux qui la requièrent) et détaille&nbsp;:
      </p>
      <ul>
        <li>chaque poste <strong>décrit précisément</strong> — « peinture murs, 2 couches, acrylique mate » et non « peinture » ;</li>
        <li>la <strong>quantité et l&apos;unité</strong> (m², ml, unité, forfait) ;</li>
        <li>le <strong>prix unitaire</strong>, et pas seulement le total de la ligne ;</li>
        <li>le <strong>taux de TVA</strong> appliqué par poste ;</li>
        <li>ce qui est <strong>fourni par l&apos;entreprise</strong> et ce qui reste à votre charge ;</li>
        <li>les <strong>conditions</strong> : durée de validité, délai d&apos;exécution, échéancier de paiement.</li>
      </ul>
      <p className="note">
        Cette liste vous sert à comparer et à vous protéger ; elle ne remplace pas un conseil juridique.
        Les obligations légales exactes dépendent de la nature et du montant des travaux.
      </p>

      <h2>Prix repères par poste</h2>
      <p>
        Ces montants viennent du référentiel AVYORA : <strong>fourni-posé, hors taxes, finition
        standard</strong>, au niveau national. Ils servent à situer une ligne — pas à contester un
        devis au centime. Un écart de 20 % s&apos;explique très bien (accès difficile, support à
        reprendre, région). Un écart de 200 % mérite une question.
      </p>
      <div className="tw">
      <table>
        <thead><tr><th>Poste</th><th>Prix repère</th><th>Fourniture seule</th></tr></thead>
        <tbody>
          {reperes.map((r) => (
            <tr key={r.nom}>
              <td>{r.nom}<br /><span className="note">{r.lot}</span></td>
              <td className="num">{euro(r.fp)} / {r.unite === "m2" ? "m²" : r.unite}</td>
              <td className="num">{r.sm != null ? `${euro(r.sm)} / ${r.unite === "m2" ? "m²" : r.unite}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="note">
        Colonne « fourniture seule » : le coût des matériaux si vous posez vous-même. L&apos;écart avec
        le fourni-posé vous donne la part de main-d&apos;œuvre. Pour le détail d&apos;un corps d&apos;état,
        voir les <Link href="/prix-poste">prix par corps d&apos;état</Link>. Prix mis à jour le {PRIX_MAJ_FR} —{" "}
        <Link href="/methodologie">comment ils sont établis</Link>.
      </p>

      <h2>Les six signaux d&apos;alerte</h2>
      {ALERTES.map((a) => (
        <div key={a.t} className="phase">
          <h3>{a.t}</h3>
          <p>{a.d}</p>
        </div>
      ))}

      <Cta label="Chiffrer votre projet pour comparer les devis" />

      <h2>Comparer plusieurs devis sans se tromper</h2>
      <p>
        Comparer deux totaux ne veut rien dire tant que les deux devis ne couvrent pas le même
        périmètre. La méthode qui marche&nbsp;:
      </p>
      <ul>
        <li><strong>Alignez les périmètres d&apos;abord.</strong> Listez les postes du devis le plus détaillé, puis cherchez-les dans l&apos;autre. Les lignes manquantes expliquent souvent tout l&apos;écart.</li>
        <li><strong>Comparez poste à poste, pas totaux à totaux.</strong> Un devis peut être moins cher sur la peinture et bien plus cher sur l&apos;électricité.</li>
        <li><strong>Vérifiez qui fournit quoi.</strong> Un devis « pose seule » sera toujours moins cher — et ce n&apos;est pas le même service.</li>
        <li><strong>Demandez les postes absents par écrit.</strong> « La dépose de l&apos;ancien carrelage est-elle comprise ? » Une réponse écrite vaut engagement.</li>
        <li><strong>Méfiez-vous du devis nettement le moins cher.</strong> Neuf fois sur dix, il ne contient pas la même chose — le reste arrive en avenant.</li>
      </ul>

      <Faq items={faqDevis()} />
      <GuidesPratiques sauf="verifier-devis-travaux" />
      <VillesLink />
    </>
  );
}

function faqDevis() {
  return [
    { q: "Comment savoir si un devis de travaux est trop cher ?", a: "Comparez poste par poste à des prix repères plutôt que le total à un autre total. Un écart de 20 % sur une ligne s'explique souvent (accès, support, région) ; un écart de 200 % mérite une explication écrite." },
    { q: "Que doit obligatoirement contenir un devis ?", a: "L'identification de l'entreprise, le détail de chaque poste avec quantité, unité et prix unitaire, le taux de TVA, ce qui est fourni, la durée de validité et les conditions de paiement. Sans prix unitaires, un devis n'est pas comparable." },
    { q: "Un devis est-il payant ?", a: "Le plus souvent il est gratuit, mais un devis impliquant un déplacement long ou une étude technique peut être facturé. Cela doit vous être annoncé avant." },
    { q: "Quel est le poste le plus souvent oublié dans un devis ?", a: "La dépose et l'évacuation : enlever l'ancien sol, sortir les gravats, reboucher après percement. Ces postes existent bel et bien et reviennent en cours de chantier s'ils ne sont pas chiffrés au départ." },
    { q: "Peut-on négocier un devis de travaux ?", a: "On négocie plus efficacement le périmètre que le prix : retirer un poste, en réaliser un soi-même, décaler une phase. Demander « un geste » sur un total détaillé aboutit rarement." },
  ];
}


/* ── Guide : faire soi-même ou faire faire ─────────────────────────────────────
   Toutes les valeurs sont LUES dans le catalogue à l'exécution (part de MO par lot, nombre de
   postes, prix repères). Aucun chiffre en dur : un nombre figé mentirait à la première révision. */
function BodyDIY() {
  const stats = catalogueStats();
  const parLot = partMainOeuvreParLot();
  const sansF = postesSansFourniture();
  const top = parLot.slice(0, 6);
  const bas = parLot.slice(-4).reverse();
  const peinture = posteRef("Peinture des murs");
  const carrelage = posteRef("Carrelage au sol");
  const cuisine = posteRef("Cuisine complète neuve — tout compris");
  const lotsSansF = [...new Set(sansF.map((x) => x.lot))];

  return (
    <>
      <p className="lead">
        On lit partout qu&apos;on économise « environ 30 % » en faisant ses travaux soi-même. Ce
        chiffre ne veut rien dire : l&apos;économie dépend entièrement du poste. Sur certains, la
        main-d&apos;œuvre représente les trois quarts de la facture ; sur d&apos;autres, à peine le
        tiers. Voici le calcul, lot par lot.
      </p>

      <h2>La vraie question : quelle part du prix est du geste</h2>
      <p>
        Un prix de travaux se décompose en deux choses : ce qu&apos;on achète et ce qu&apos;on fait.
        Le référentiel AVYORA porte les deux pour <strong>{stats.avecFourniture} postes sur{" "}
        {stats.postes}</strong> ({stats.pctAvec} %) : un prix fourni-posé et un prix fourniture seule.
        L&apos;écart entre les deux, c&apos;est exactement ce que vous ne payez pas si vous le faites
        vous-même.
      </p>
      <p>
        Les {stats.sansFourniture} postes restants n&apos;ont pas de prix fourniture parce
        qu&apos;il n&apos;y a rien à acheter : ce sont des prestations pures — études, diagnostics,
        démarches, raccordements. Faire soi-même n&apos;y a aucun sens.
      </p>

      <h2>La part de main-d&apos;œuvre, lot par lot</h2>
      <p>
        Part du prix fourni-posé qui correspond à la pose, calculée sur l&apos;ensemble des postes du
        lot. Plus le pourcentage est élevé, plus faire soi-même rapporte.
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Corps d&apos;état</th><th>Part main-d&apos;œuvre</th><th>Postes concernés</th></tr></thead>
          <tbody>
            {parLot.map((l) => (
              <tr key={l.lot}>
                <td>{l.lot}</td>
                <td className="num">{l.partMO} %</td>
                <td className="num">{l.avecFourniture} / {l.postes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Calculé depuis le référentiel AVYORA, mis à jour le {PRIX_MAJ_FR} —{" "}
        <Link href="/methodologie">voir la méthode</Link>.
      </p>

      <h2>Les postes où faire soi-même rapporte le plus</h2>
      <p>
        En tête : {top.map((l, i) => <span key={l.lot}>{i > 0 ? ", " : ""}<strong>{l.lot.toLowerCase()}</strong> ({l.partMO} %)</span>)}.
        Ce sont des travaux à faible technicité et à forte intensité de temps — exactement ce
        qu&apos;un particulier motivé peut absorber.
      </p>
      <p>
        Concrètement :{" "}
        {peinture && <>la peinture des murs revient à <strong>{peinture.fp} €/m²</strong> posée contre <strong>{peinture.sm} €/m²</strong> de fournitures. </>}
        {carrelage && <>Le carrelage au sol : <strong>{carrelage.fp} €/m²</strong> posé contre <strong>{carrelage.sm} €/m²</strong> de matériaux. </>}
        Sur un logement entier, l&apos;écart se compte en milliers d&apos;euros — au prix de vos
        week-ends.
      </p>

      <h2>Ceux où ça ne rapporte presque rien</h2>
      <p>
        À l&apos;autre bout : {bas.map((l, i) => <span key={l.lot}>{i > 0 ? ", " : ""}<strong>{l.lot.toLowerCase()}</strong> ({l.partMO} %)</span>)}.
        Ici le prix est dominé par le produit, pas par la pose.
        {cuisine && <> Une cuisine complète est chiffrée <strong>{cuisine.fp} €/ml</strong> posée contre <strong>{cuisine.sm} €/ml</strong> de meubles : monter soi-même ne déplace qu&apos;une petite part du total.</>}
      </p>
      <p>
        La conclusion est contre-intuitive mais solide : <strong>plus un poste est cher, moins il est
        rentable de le faire soi-même</strong>. On économise sur le temps, pas sur la matière.
      </p>

      <h2>Les lots à ne pas toucher</h2>
      <p>
        Certains travaux ne relèvent pas de l&apos;arbitrage économique. L&apos;électricité et le gaz
        engagent votre sécurité et la conformité de l&apos;installation ; toucher à la structure
        (mur porteur, charpente) sans étude met le bâtiment en jeu ; l&apos;amiante et le plomb
        relèvent d&apos;entreprises certifiées et d&apos;une évacuation réglementée. Ce guide ne
        donne volontairement aucun mode opératoire sur ces sujets.
      </p>
      <p>
        Point rarement dit : <strong>un poste que vous réalisez vous-même n&apos;est couvert par
        aucune garantie décennale</strong>. Si le sinistre vient de là, vous en répondez seul, et
        votre assureur peut vous opposer un défaut de couverture. Cela vaut d&apos;être vérifié
        auprès de lui avant de commencer, pas après.
      </p>
      <p className="note">
        Lots sans prix fourniture dans le référentiel, donc non basculables en « je le fais » :{" "}
        {lotsSansF.join(", ")}. Détail poste par poste : <Link href="/prix-poste">prix par corps d&apos;état</Link>.
      </p>

      <h2>Ce que l&apos;économie annoncée oublie</h2>
      <ul>
        <li>
          <strong>La TVA.</strong> C&apos;est le coût caché le plus systématiquement ignoré. Sur une
          facture d&apos;artisan en rénovation, les travaux relèvent d&apos;un taux réduit. Les
          matériaux que vous achetez seul sont, eux, à <strong>20 %</strong>. L&apos;estimateur
          applique cette règle automatiquement : une partie de l&apos;économie de main-d&apos;œuvre
          est reprise par l&apos;écart de TVA.
        </li>
        <li><strong>La location de matériel.</strong> Ponceuse, échafaudage roulant, carrelette, malaxeur : facturés à la journée, ils s&apos;accumulent sur un chantier qui dure.</li>
        <li><strong>L&apos;évacuation.</strong> Benne, déchetterie, allers-retours : un artisan l&apos;inclut dans son prix, vous non.</li>
        <li><strong>Les reprises.</strong> Un travail à reprendre coûte deux fois — et un artisan appelé pour rattraper facture plus cher qu&apos;un artisan appelé dès le départ.</li>
        <li><strong>Votre temps.</strong> Il n&apos;a pas de prix au bilan, mais il en a un dans votre vie. Un logement entier repeint, c&apos;est des dizaines d&apos;heures.</li>
      </ul>

      <h2>Comment arbitrer, poste par poste</h2>
      <p>
        La bonne méthode n&apos;est pas de choisir « tout soi-même » ou « tout artisan », mais de
        trancher ligne par ligne. Trois critères suffisent : la part de main-d&apos;œuvre du poste
        (le tableau ci-dessus), votre capacité réelle à le faire proprement, et l&apos;effet sur le
        planning — un poste que vous retardez bloque les artisans qui viennent après, et{" "}
        <Link href="/guides/ordre-travaux-renovation">l&apos;ordre des travaux</Link> ne se négocie pas.
      </p>
      <p>
        L&apos;estimateur AVYORA permet exactement cet arbitrage : pour chaque poste, vous choisissez
        « fait faire » ou « je le fais », et le total se recalcule avec la bonne TVA et la bonne part
        de main-d&apos;œuvre.
      </p>

      <Cta label="Comparer les deux scénarios sur votre projet" />

      <Faq items={faqDIY()} />
      <GuidesPratiques sauf="faire-soi-meme-ou-artisan" />
      <VillesLink />
    </>
  );
}

function faqDIY() {
  const s = catalogueStats();
  const parLot = partMainOeuvreParLot();
  const meilleur = parLot[0], pire = parLot[parLot.length - 1];
  return [
    { q: "Combien économise-t-on en faisant ses travaux soi-même ?", a: `Cela dépend entièrement du poste. Sur le référentiel AVYORA, la part de main-d'œuvre va d'environ ${pire.partMO} % (${pire.lot.toLowerCase()}) à ${meilleur.partMO} % (${meilleur.lot.toLowerCase()}). Un pourcentage unique d'économie n'a donc aucun sens : il faut raisonner poste par poste.` },
    { q: "Quels travaux peut-on faire soi-même sans risque ?", a: "La peinture, la pose de sols souples ou stratifiés, la dépose et le curage sont accessibles à un particulier soigneux. L'électricité, le gaz, la structure porteuse, la charpente, l'amiante et le plomb ne relèvent pas d'un arbitrage économique : ils engagent la sécurité et la conformité." },
    { q: "Paie-t-on plus de TVA quand on achète les matériaux soi-même ?", a: "Oui, et c'est le coût caché le plus souvent oublié. Les travaux facturés par un artisan en rénovation relèvent d'un taux réduit, tandis que les matériaux achetés directement par un particulier sont à 20 %. Une partie de l'économie de main-d'œuvre est donc reprise par l'écart de TVA." },
    { q: "Un travail fait soi-même est-il couvert par la garantie décennale ?", a: "Non. La garantie décennale couvre l'entreprise qui a réalisé l'ouvrage : un poste que vous réalisez vous-même n'est couvert par personne. En cas de sinistre lié à ce poste, vous en répondez seul. Vérifiez votre situation auprès de votre assureur avant de commencer." },
    { q: "Sur quels postes faire soi-même rapporte-t-il le moins ?", a: `Sur ceux où le prix est dominé par le produit et non par la pose : ${parLot.slice(-3).map((l) => l.lot.toLowerCase()).join(", ")}. Plus un poste est cher à l'achat, moins le faire soi-même déplace le total.` },
    { q: "Combien de postes du référentiel peut-on basculer en « je le fais » ?", a: `${s.avecFourniture} sur ${s.postes} (${s.pctAvec} %) portent un prix fourniture seule et peuvent donc être arbitrés. Les ${s.sansFourniture} autres sont des prestations pures — études, diagnostics, démarches, raccordements — où il n'y a rien à acheter.` },
  ];
}

const BODIES: Record<string, () => React.ReactElement> = {
  "prix-renovation-appartement": BodyAppartement,
  "prix-renovation-maison": BodyMaison,
  "ordre-travaux-renovation": BodyOrdre,
  "verifier-devis-travaux": BodyDevis,
  "faire-soi-meme-ou-artisan": BodyDIY,
};

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  const Body = BODIES[slug];
  if (!g || !Body) notFound();

  // Même FAQ que celle rendue par le corps (source unique) — exigence Google pour FAQPage.
  const faq = faqDuGuide(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        // Google demande une image pour le résultat enrichi Article (et pour Discover).
        // On réutilise l'image OG générée par app/opengraph-image.tsx : 1200×630, ratio 1.91:1.
        image: [`${siteUrl}/opengraph-image`],
        headline: g.h1,
        description: g.description,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "AVYORA" },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/guides/${g.slug}`,
        // Source de vérité de la fraîcheur des prix : lib/prix-maj.ts. Une date figée ici
        // contredisait la date affichée dans le texte visible de la page.
        datePublished: PRIX_MAJ,
        dateModified: PRIX_MAJ,
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
      <p className="prixmaj">Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link></p>
      <Body />
    </div>
  );
}

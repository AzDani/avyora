import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VILLES_SEO, villeBySlug, villesProches, RAYON_PROCHES_KM } from "@/lib/villes";
import { prixVille, regionCoef } from "@/lib/seo-prix";
import { deptInfo } from "@/lib/geo";
import { PRIX_MAJ_FR, ANNEE_PRIX } from "@/lib/prix-maj";
import { seoMeta, titreCourt } from "@/lib/seo-og";
import { phraseCoef, coefCourt, phraseFournitures, raisonFournitures, lieuVille, regionParenthese, situationVille } from "@/lib/seo-textes";
import { MATRIX_SLUGS, MATRIX_VILLES, matriceIndexable } from "@/lib/seo-projets";
import { CtaEstimation } from "@/components/CtaEstimation";

export const dynamic = "force-static";
// Ensemble fini de villes : tout slug hors liste renvoie un vrai 404 (pas de soft-404 à 200).
// Ensemble fini : tout slug hors liste renvoie un vrai 404. Les villes retirées du SEO sont, elles,
// redirigées en 308 par next.config.ts (avant le routage) — une route force-static ne peut pas
// rediriger au runtime.
export const dynamicParams = false;

export function generateStaticParams() {
  return VILLES_SEO.map((v) => ({ ville: v.slug }));
}

const euro = (n: number) => n.toLocaleString("fr-FR") + " €";

export async function generateMetadata({ params }: { params: Promise<{ ville: string }> }): Promise<Metadata> {
  const { ville } = await params;
  const v = villeBySlug(ville);
  if (!v) return { title: "Prix rénovation" };
  const grille = prixVille(v.cp);
  const complete = grille.find((g) => g.v === "complete")?.appartM2 ?? 0;
  const zone = regionParenthese(deptInfo(v.cp));
  return seoMeta({
    // ≤ 60 caractères avec « · AVYORA » : les noms longs (Boulogne-Billancourt) perdent « — coût au m² ».
    title: titreCourt(
      `Prix rénovation à ${v.nom} (${ANNEE_PRIX}) — coût au m²`,
      `Prix rénovation à ${v.nom} (${ANNEE_PRIX})`,
      `Prix rénovation ${v.nom} ${ANNEE_PRIX}`,
    ),
    // ≤ 160 car. : « Estimation gratuite en 3 minutes » poussait toutes les pages au-delà, donc
    // tronquait la seule information locale — le prix au m². On garde le chiffre, on coupe le slogan.
    description: `Combien coûte une rénovation à ${v.nom}${zone} ? Prix au m² par ampleur de travaux, à partir de ${euro(complete)}/m² en réno complète.`,
    path: `/prix-renovation/${v.slug}`,
  });
}

const CSS = `
.av-seo{max-width:760px;margin:0 auto}
.av-seo h1{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:0}
.av-seo .tw,.av-guide .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
.av-seo .tw table,.av-guide .tw table{margin:0}
.av-seo .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:12px}
.av-seo .fil a{color:var(--color-muted)}
.av-seo .lead{font-size:15px;color:var(--color-muted);margin-top:12px;line-height:1.7}
.av-seo .prixmaj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-seo .prixmaj a{color:var(--color-brand-700);font-weight:500}
.av-seo .prixmaj a:hover{text-decoration:underline}
.av-seo h2{font-size:19px;font-weight:600;color:var(--color-ink);margin:34px 0 10px}
.av-seo p{font-size:14.5px;color:var(--color-muted);line-height:1.7;margin:10px 0}
.av-seo strong{color:var(--color-ink);font-weight:600}
.av-seo table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
.av-seo th,.av-seo td{border:1px solid var(--color-line);padding:10px 12px;text-align:left}
.av-seo th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.av-seo td.num{font-family:var(--font-geist-mono),monospace;text-align:right;color:var(--color-ink)}
.av-seo .faq{margin-top:10px}
.av-seo .faq details{border:1px solid var(--color-line);border-radius:12px;padding:12px 16px;margin-bottom:10px;background:var(--color-surface)}
.av-seo .faq summary{font-weight:600;color:var(--color-ink);cursor:pointer;font-size:14.5px}
.av-seo .faq p{margin:8px 0 0}
.av-seo .villes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.av-seo .villes a{font-size:13px;color:var(--color-brand-600);background:var(--color-brand-50);border-radius:999px;padding:5px 12px;text-decoration:none}
.av-seo .villes a:hover{background:var(--color-brand-100)}
/* Mobile : le corps de texte passe a 16px (defaut navigateur) — ces pages sont faites pour etre
   lues longuement sur un telephone, et 14,5px y est inutilement fatigant. */
@media(max-width:560px){
.av-seo p,.av-seo li{font-size:16px}
.av-seo .note{font-size:13.5px}
.av-seo .lead{font-size:16.5px}
}
/* Mobile : les trois colonnes tiennent dans 358 px (avant : min-width 420 px, la colonne « Maison »
   sortait du cadre sans aucun signe qu'on pouvait faire défiler). Le conteneur .tw garde son
   overflow-x:auto en dernier recours. */
@media(max-width:480px){
.av-seo th,.av-seo td{padding:8px 6px}
.av-seo th{text-transform:none;letter-spacing:0;font-size:12px}
.av-seo td.num{white-space:nowrap}
}
`;

export default async function PrixVille({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const v = villeBySlug(ville);
  if (!v) notFound();

  const grille = prixVille(v.cp);
  // Maillage : région d'abord, puis rotation déterministe. Sans la rotation, chaque page listait
  // les 16 mêmes métropoles et 34 villes sur 74 n'avaient qu'un seul lien entrant.
  const { autour, ailleurs } = villesProches(v.slug);
  const reg = regionCoef(v.cp);
  const dep = deptInfo(v.cp);
  // Jonction du silo géographique vers la matrice — mais UNIQUEMENT vers une page indexable.
  // L'argument d'origine (« ça désorpheline la matrice ») est mort depuis que 320 de ces pages
  // sont en noindex : y envoyer un lien depuis une page indexable et déclarée au sitemap dépense
  // du budget d'exploration pour une cible que Google doit jeter. On retombe alors sur la page
  // nationale du travail, qui est indexable et contient la même information.
  const lienTravaux = (slug: string) =>
    matriceIndexable(v.slug) && MATRIX_SLUGS.has(slug) ? `/prix-travaux/${slug}/${v.slug}` : `/prix-travaux/${slug}`;
  const complete = grille.find((g) => g.v === "complete")!;
  const partielle = grille.find((g) => g.v === "partielle")!;
  const lourde = grille.find((g) => g.v === "lourde")!;
  const totalCompletAppart = complete.appartM2 * 70;

  // Formulation honnête : ce coefficient est un indice INTERNE AVYORA, sans source publique
  // (cf. /methodologie). On décrit donc ce que l'outil applique, sans affirmer un fait de marché.
  // Phrases partagées avec la matrice : lib/seo-textes.ts.
  const coefPhrase = phraseCoef(reg);
  const pourquoi = `Pour ${v.nom}, classée « ${reg.zone} », ${coefPhrase}${reg.mat !== 1 ? ` (${raisonFournitures(reg)})` : ""}.`;

  const faq = [
    {
      q: `Combien coûte une rénovation complète à ${v.nom} ?`,
      a: `Compte environ ${euro(complete.appartM2)}/m² pour un appartement, soit à peu près ${euro(totalCompletAppart)} pour 70 m² (fourchette ±15\u00a0%, finition standard, travaux confiés à des artisans).`,
    },
    {
      q: `Pourquoi les prix diffèrent-ils à ${v.nom} ?`,
      a: `${phraseFournitures(reg)} ${v.nom} est classée « ${reg.zone} » dans le barème régional AVYORA, un indice interne établi par département : ${coefCourt(reg)}. La méthode est détaillée sur la page Méthodologie.`,
    },
    {
      q: `Rénover un appartement ou une maison, quelle différence de prix ?`,
      a: `La maison porte des postes que l'appartement n'a pas (toiture, façade, charpente), donc son coût au m² est généralement plus élevé sur les rénovations lourdes.`,
    },
    {
      q: `Comment obtenir une estimation précise pour mon bien à ${v.nom} ?`,
      a: `Utilise l'estimateur AVYORA : en 2 minutes, tu obtiens une fourchette chiffrée adaptée à ta surface, tes travaux et ton code postal.`,
    },
  ];

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Prix rénovation par ville", item: `${siteUrl}/prix-renovation` },
          { "@type": "ListItem", position: 3, name: v.nom, item: `${siteUrl}/prix-renovation/${v.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="av-seo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-4 text-[13px]">
        <Link href="/prix-renovation" className="text-muted hover:text-brand-700">← Prix rénovation par ville</Link>
      </p>

      <p className="fil">
        <Link href="/">Accueil</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/prix-renovation">Prix par ville</Link> <span aria-hidden="true">›</span> {v.nom}
      </p>
      <h1>Prix d&apos;une rénovation à {v.nom} en {ANNEE_PRIX}</h1>
      <p className="lead">
        À {lieuVille(v.nom, dep)}, une <strong>rénovation complète</strong> coûte en
        moyenne <strong>{euro(complete.appartM2)}/m²</strong> pour un appartement — de{" "}
        <strong>{euro(partielle.appartM2)}/m²</strong> pour une réno partielle à{" "}
        <strong>{euro(lourde.maisonM2)}/m²</strong> pour une réno lourde de maison. Classement tarifaire :{" "}
        « {reg.zone} » — {coefPhrase} (<Link href="/methodologie">barème interne, méthode détaillée ici</Link>).
      </p>
      <p className="prixmaj">Prix mis à jour le {PRIX_MAJ_FR} · <Link href="/methodologie">d&apos;où viennent ces prix ?</Link></p>

      <h2>Prix au m² par type de travaux à {v.nom}</h2>
      <div className="tw">
      <table>
        <thead>
          <tr><th>Type de travaux</th><th>Appart. (€/m²)</th><th>Maison (€/m²)</th></tr>
        </thead>
        <tbody>
          {grille.map((g) => (
            <tr key={g.v}>
              <td>{g.label}</td>
              <td className="num">{euro(g.appartM2)}</td>
              <td className="num">{euro(g.maisonM2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--color-faint)" }}>
        Prix TTC indicatifs, travaux confiés à des artisans, finition standard, marge ±15&nbsp;%. Base :
        appartement 70 m² / maison 100 m². À affiner selon l&apos;état du bien.
      </p>

      <h2>Pourquoi ces prix à {v.nom} ?</h2>
      <p>
        Le coût d&apos;une rénovation dépend surtout de deux choses : le <strong>prix des matériaux</strong>{" "}
        ({reg.mat === 1 ? "globalement national" : "majoré ici par rapport à la métropole continentale"}) et le{" "}
        <strong>coût de la main-d&apos;œuvre</strong>, qui varie selon la région.{" "}
        {pourquoi}{" "}C&apos;est pourquoi l&apos;estimation s&apos;ajuste automatiquement à ton code postal.
      </p>
      {dep.nom && (
        <p>
          {situationVille(v.nom, dep)}{" "}Le barème AVYORA classe chaque département dans une zone : c&apos;est
          ce classement, un indice interne et non une mesure du tarif horaire local, qui explique
          l&apos;écart de prix avec d&apos;autres villes.
        </p>
      )}

      <CtaEstimation
        src="ville"
        titre={`Estime ton projet à ${v.nom} en 2 minutes`}
        cp={v.cp}
        libelle={`Estimer mes travaux à ${v.nom}`}
        sousTitre={`Gratuit, sans inscription — l'estimation part déjà ajustée à la main-d'œuvre de ${v.nom}.`}
      />

      <h2>Questions fréquentes</h2>
      <div className="faq">
        {faq.map((f, i) => (
          <details key={i} open>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <h2>Aller plus loin</h2>
      <p>
        Prix au m² par type de bien :{" "}
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
        <Link href="/guides/faire-soi-meme-ou-artisan" className="font-medium text-brand-600 hover:underline">faire soi-même ou faire faire</Link>{" "}·{" "}
        <Link href="/guides/calculer-budget-travaux" className="font-medium text-brand-600 hover:underline">calculer un budget travaux</Link>.
      </p>
      <p>
        Prix par type de travaux :{" "}
        <Link href={lienTravaux("renovation-salle-de-bain")} className="font-medium text-brand-600 hover:underline">salle de bain</Link>{" "}·{" "}
        <Link href={lienTravaux("renovation-cuisine")} className="font-medium text-brand-600 hover:underline">cuisine</Link>{" "}·{" "}
        <Link href={lienTravaux("refaire-toiture")} className="font-medium text-brand-600 hover:underline">toiture</Link>{" "}·{" "}
        <Link href="/prix-travaux" className="font-medium text-brand-600 hover:underline">tous les travaux</Link>.
      </p>

      {/* Deux blocs (lib/villes.ts, villesProches) : « autour de » ne liste que des villes à moins de
          RAYON_PROCHES_KM ; la rotation de maillage, elle, est titrée honnêtement « ailleurs en France ». */}
      {autour.length > 0 && (
        <>
          <h2>Prix de la rénovation autour de {v.nom}</h2>
          <p>
            {`Villes à moins de ${RAYON_PROCHES_KM} km de ${v.nom} : des repères plus proches que ceux d'une métropole à l'autre bout du pays.`}
          </p>
          <div className="villes">
            {autour.map((x) => (
              <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
            ))}
          </div>
        </>
      )}
      <h2>Prix de la rénovation ailleurs en France</h2>
      <p>{`Quelques repères ailleurs en France, pour situer ${v.nom} dans l'échelle des prix.`}</p>
      <div className="villes">
        {ailleurs.map((x) => (
          <Link key={x.slug} href={`/prix-renovation/${x.slug}`}>{x.nom}</Link>
        ))}
        <Link href="/prix-renovation">Toutes les villes →</Link>
      </div>
    </div>
  );
}

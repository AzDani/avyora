import Link from "next/link";
import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";

/**
 * Page publique du Réseau AVYORA pour les artisans (décisions de Dani du 17/11/2026) : ce qu'ils y gagnent, comment on
 * entre (SIRET, décennale, photos, appel avec Daniel), et les CRITÈRES DE RÉFÉRENCEMENT (#criteres) qu'une plateforme
 * de mise en relation doit publier (art. L111-7 du Code de la consommation). Aucun chiffre inventé : pas de volume de
 * demandes promis, pas d'avis. En français : le réseau est en France.
 */
export const metadata: Metadata = seoMeta({
  title: "Artisans : rejoignez le Réseau AVYORA",
  description:
    "Recevez des demandes de devis de clients qui ont déjà estimé leurs travaux. Réseau fermé d'artisans vérifiés (SIRET, décennale, entretien), 3 artisans maximum par demande, gratuit pendant le lancement.",
  path: "/reseau-artisans",
  type: "website",
});

const h2 = "text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]";

const ATOUTS = [
  { t: "Des demandes déjà préparées", d: "Le client arrive avec son estimation AVYORA : les postes, les quantités, un budget. Tu sais tout de suite si le chantier est pour toi." },
  { t: "Trois artisans au plus", d: "Une demande n'est jamais envoyée à dix entreprises. C'est le client qui choisit, jusqu'à trois artisans, et ses coordonnées ne sont jamais revendues." },
  { t: "Ta zone, tes métiers", d: "Tu ne vois que les demandes de tes départements, pour les métiers que tu as cochés. Tu acceptes ou tu refuses, librement." },
  { t: "Gratuit pendant le lancement", d: "Aucun abonnement, aucune commission sur tes travaux. Si cela change un jour, tu seras prévenu 30 jours avant, libre de partir." },
];

const ETAPES = [
  { t: "Tu postules", d: "SIRET, attestation décennale, quelques photos de chantiers. Compte une dizaine de minutes." },
  { t: "Daniel examine ton dossier", d: "Le SIRET est vérifié auprès du répertoire officiel des entreprises, l'assurance et les photos à la main." },
  { t: "Un appel pour se connaître", d: "Daniel, le fondateur, ancien chef de chantier, t'appelle : ta façon de travailler, tes délais, ta zone." },
  { t: "Tu reçois des demandes", d: "Les clients de ta zone te choisissent. Leurs coordonnées s'affichent quand tu acceptes une demande." },
];

export default function ReseauArtisans() {
  return (
    <div lang="fr" className="space-y-14 py-2 sm:space-y-20">
      {/* Accroche + exemple de demande reçue */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="eyebrow">Réseau AVYORA · pour les artisans</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-tight text-ink [text-wrap:balance] sm:text-[44px]">
            Des clients qui savent ce qu&apos;ils veulent, et combien ça coûte.
          </h1>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            Sur AVYORA, particuliers et investisseurs estiment leurs travaux poste par poste avant de signer. Quand ils
            sont prêts, ils demandent des devis à des artisans <strong className="font-semibold text-ink">vérifiés</strong> de
            leur département : ceux du Réseau AVYORA.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/espace-artisan" className="btn btn-primary min-h-12 px-6 text-[15px]">Rejoindre le réseau</Link>
            <a href="#criteres" className="btn btn-outline min-h-12 px-5 text-[15px]">Nos critères</a>
          </div>
          <p className="mt-3 text-[13px] text-muted">Gratuit pendant le lancement · réseau sur sélection</p>
        </div>

        <figure className="rounded-3xl border border-line bg-surface p-5 shadow-[0_18px_40px_-24px_rgba(30,27,75,.35)] sm:p-6" aria-label="Exemple de demande de devis reçue par un artisan">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-700">Nouvelle demande</span>
            <span className="text-[12px] text-faint">Exemple</span>
          </div>
          <p className="mt-3 text-[17px] font-semibold text-ink">Rénovation d&apos;une salle de bain</p>
          <p className="text-[13.5px] text-muted">Gironde (33) · appartement · 6 m²</p>
          <dl className="mt-4 divide-y divide-line rounded-2xl border border-line text-[13.5px]">
            {[
              ["Dépose et évacuation", "1 forfait"],
              ["Douche à l'italienne", "1 u"],
              ["Carrelage mural", "18 m²"],
              ["Meuble vasque + robinetterie", "1 u"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-2">
                <dt className="text-ink">{k}</dt>
                <dd className="num text-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] text-faint">Estimation AVYORA</p>
              <p className="num text-[22px] font-bold tracking-tight text-ink">8 900 € – 11 400 €</p>
            </div>
            <span className="text-[12px] text-faint">3 artisans au plus</span>
          </div>
          <figcaption className="sr-only">Une demande type : la nature des travaux, les postes et les quantités, la fourchette estimée par AVYORA.</figcaption>
        </figure>
      </section>

      {/* Ce que tu y gagnes */}
      <section aria-labelledby="atouts">
        <h2 id="atouts" className={h2}>Ce que le réseau t&apos;apporte</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ATOUTS.map((a) => (
            <div key={a.t} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-[16px] font-semibold text-ink">{a.t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment on entre */}
      <section aria-labelledby="etapes">
        <h2 id="etapes" className={h2}>Comment on entre dans le réseau</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((e, i) => (
            <li key={e.t} className="rounded-2xl border border-line bg-surface p-5">
              <span className="num inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1E1B4B] text-[14px] font-bold text-white" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{e.t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Critères de référencement (L111-7 du Code de la consommation) */}
      <section id="criteres" aria-labelledby="criteres-titre" className="scroll-mt-28 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="criteres-titre" className={h2}>Nos critères de référencement</h2>
        <p className="mt-2 max-w-[66ch] text-[14.5px] leading-relaxed text-muted">
          Ce que nous vérifions avant qu&apos;un artisan soit proposé aux clients d&apos;AVYORA, et comment il leur est proposé.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Pour entrer dans le réseau</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-muted">
              <li>Un établissement actif, vérifié par son SIRET auprès du répertoire des entreprises.</li>
              <li>Une assurance de responsabilité décennale en cours de validité, couvrant les métiers déclarés, attestation à l&apos;appui.</li>
              <li>Des photos de chantiers réalisés par l&apos;artisan ou son équipe.</li>
              <li>Un entretien téléphonique avec le fondateur d&apos;AVYORA, qui valide chaque candidature lui-même.</li>
            </ul>
            <h3 className="mt-5 text-[15px] font-semibold text-ink">Pour y rester</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-muted">
              <li>Une assurance à jour : une attestation expirée suspend la participation jusqu&apos;à son renouvellement.</li>
              <li>Des informations exactes, et le respect des clients et de leurs données.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Comment les artisans sont proposés</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-muted">
              <li>Le client voit les artisans du réseau qui interviennent dans son département et exercent le métier demandé.</li>
              <li>C&apos;est le client qui choisit, jusqu&apos;à trois artisans par demande.</li>
              <li>Ils lui sont affichés en commençant par ceux qui ont reçu le moins de demandes, pour répartir équitablement ; à égalité, dans un ordre propre à chaque client.</li>
              <li>Aucun artisan ne paie pour être mieux placé ou plus souvent proposé.</li>
            </ul>
            <h3 className="mt-5 text-[15px] font-semibold text-ink">Rémunération et rôle d&apos;AVYORA</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              La participation est gratuite pendant le lancement ; AVYORA ne prend aucune commission sur les travaux. AVYORA
              met en relation : il n&apos;est pas partie au contrat entre le client et l&apos;artisan et ne garantit pas les
              travaux. Le détail figure dans les <Link href="/conditions-reseau" className="font-semibold text-brand-700 underline">conditions du Réseau AVYORA</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Appel final */}
      <section className="rounded-3xl bg-[#1E1B4B] px-6 py-10 text-center sm:px-10">
        <h2 className="text-[24px] font-semibold tracking-tight text-white [text-wrap:balance] sm:text-[28px]">Tu fais du bon travail ? Montre-le.</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-[15px] leading-relaxed text-[#c7c3f4]">
          Postule maintenant : Daniel examine chaque dossier lui-même et te rappelle.
        </p>
        <Link href="/espace-artisan" className="btn mt-6 min-h-12 bg-white px-6 text-[15px] text-[#1E1B4B] hover:bg-brand-50">Rejoindre le réseau</Link>
      </section>
    </div>
  );
}

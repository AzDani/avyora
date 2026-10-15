import Link from "next/link";
import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import BoutonAbo from "@/components/BoutonAbo";
import BoutonCheckout from "@/components/BoutonCheckout";
import { getUser, estPro, estAbonne } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { dict, type Dict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { SuiviVue } from "@/components/SuiviVue";
import { FEATURES } from "@/lib/features";
import { lireNature, lireSourceNature, natureDeSource, lienDetaillePro, type NatureProjet } from "@/lib/nature-projet";
import { PLANS_MAX_BETA, betaActive, dateInsecable, estMembreFondateur, libellesBeta, lienInscriptionBeta, lireSourceBeta } from "@/lib/beta";

const META: Metadata = {
  title: "Passer Pro — estimation détaillée poste par poste",
  description:
    "Débloque l'estimateur détaillé AVYORA : 200 postes chiffrés, quantités ajustables, rapport PDF et sauvegarde de tes projets. Dès 18,85 €/mois, sans engagement.",
  alternates: { canonical: "/tarifs" },
};

/** Hors bêta, la metadata d'avant ; pendant la bêta gratuite (lib/beta.ts), elle dit la bêta (en français, règle SEO du site). */
export async function generateMetadata(): Promise<Metadata> {
  if (!betaActive()) return META;
  const b = dict("fr").beta;
  return { ...META, title: b.tarifsMetaTitre, description: b.tarifsMetaDescription(libellesBeta("fr").fin) };
}
export const dynamic = "force-dynamic";

/**
 * Plans réellement en vente, dans l'ordre d'affichage.
 *
 * `annuel-mois` (engagement 12 mois facturé au mois) existe dans le dictionnaire et dans
 * lib/stripe.ts mais n'est délibérément PAS vendu : Stripe n'a pas de verrou natif « durée
 * minimale » sur un abonnement mensuel. L'entrée est conservée inutilisée, pas oubliée.
 */
const PLANS_AFFICHES = ["mensuel", "annuel"] as const;
/** Plan mis en avant quand le visiteur n'en a choisi aucun. */
const PLAN_PAR_DEFAUT: (typeof PLANS_AFFICHES)[number] = "annuel";
/**
 * Éditeur de plan (C9, derrière FEATURES.plans) : d'où vient le visiteur. Liste fermée, comme `SOURCES_SEO` :
 * tout autre `?source=` est ignoré. `editeur-plan` vient de l'éditeur (TARIFS_URL) et de la vitrine ;
 * `choix-plan` du bandeau « Partir de mon plan » de l'écran de choix.
 */
const SOURCES_PLAN = ["editeur-plan", "choix-plan"] as const;
/*
 * N2 : les autres sources, celles qui disent la nature du projet (`affiner-reno`, `affiner-neuf`, `choix-reno`,
 * `choix-neuf` ; liste fermée `SOURCES_NATURE` de lib/nature-projet.ts), quel que soit l'interrupteur des plans.
 * La nature vient de la source, sinon de `?nature=` (retour d'inscription ou paiement abandonné). Elle part avec
 * le paiement (`BoutonCheckout`) et choisit le lien « déjà Pro » : la maison du neuf ou le détaillé rénovation.
 */

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; abo?: string; source?: string; nature?: string }>;
}) {
  const [{ plan: planDemande, abo, source: sourceDemandee, nature: natureDemandee }, user, { t: tr, locale }] = await Promise.all([searchParams, getUser(), getT()]);
  const t = tr.tarifs;
  const dejaPro = estPro(user);
  // Un visiteur qui revient d'une inscription arrive avec le plan qu'il avait choisi AVANT de
  // créer son compte (components/BoutonAbo.tsx pose ce paramètre). On met SON plan en avant
  // plutôt que celui de la maison : il retrouve son choix au lieu de devoir le refaire.
  const misEnAvant = PLANS_AFFICHES.find((k) => k === planDemande) ?? PLAN_PAR_DEFAUT;
  const sourceNature = lireSourceNature(sourceDemandee);
  const source = (FEATURES.plans ? SOURCES_PLAN.find((s) => s === sourceDemandee) : undefined) ?? sourceNature;
  const nature = natureDeSource(sourceNature) ?? lireNature(natureDemandee);

  // Bêta gratuite (lib/beta.ts) : une autre page, rendue à part. Hors bêta, le HTML ci-dessous, inchangé.
  if (betaActive()) return <TarifsBeta user={user} t={tr} locale={locale} source={source} nature={nature} />;

  return (
    <div className="animate-rise mx-auto max-w-4xl py-4 sm:py-8">
      {/* Le mur payant : sans cette mesure, on ignore combien de visiteurs y parviennent. */}
      <SuiviVue
        evenement="vue_tarifs"
        props={{ connecte: !!user, deja_pro: dejaPro, venu_pour: planDemande ?? "aucun", ...(source ? { source } : {}) }}
      />
      <header className="text-center">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">{t.titre}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {t.subAvant}<b className="text-ink">{t.subFort}</b>{t.subApres}
        </p>
      </header>

      <div className="mt-6 overflow-hidden rounded-panel bg-gradient-to-r from-[#4F46E5] via-[#6d5cf0] to-[#7C3AED] px-6 py-5 text-center text-white shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100/90">{t.lancTag}</div>
        <div className="mt-1 text-[20px] font-semibold tracking-tight">{t.lancTitre}</div>
        <div className="mt-1 text-[13.5px] text-indigo-100/85">{t.lancSous}</div>
      </div>

      {dejaPro && (
        <p className="mx-auto mt-6 max-w-md rounded-field border border-positive/25 bg-positive-soft px-4 py-3 text-center text-sm text-positive">
          {t.dejaProAvant}<Link href={lienDetaillePro(nature)} className="font-semibold underline">{t.dejaProLien}</Link>.
        </p>
      )}

      {/* Retour d'un paiement abandonné : `cancel_url` de Stripe renvoie ici avec ?abo=annule
          (app/api/stripe/checkout/route.ts). La page n'en faisait rien — le visiteur revenait
          sur un écran muet, sans savoir si quelque chose avait été débité. */}
      {abo === "annule" && !dejaPro && (
        <p className="mx-auto mt-6 max-w-md rounded-field border border-line bg-surface-2 px-4 py-3 text-center text-sm text-muted">
          {t.aboAnnule}
        </p>
      )}

      {/* Venu de l'éditeur de plan (D48, D58) : ce que Pro y ajoute, avec les mots de l'éditeur (DROITS). Aucun prix. */}
      {source === "editeur-plan" && !dejaPro && (
        <div className="mx-auto mt-6 max-w-2xl rounded-field border border-brand-200 bg-brand-50 px-5 py-4 text-[14px] text-ink" data-depuis-editeur="">
          <p className="font-semibold">{t.depuisEditeur}</p>
          <ul className="mt-2 space-y-1.5">
            {t.depuisEditeurDroits.map((d) => (
              <li key={d} className="flex items-start gap-2.5 leading-relaxed">
                <Check />
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-auto mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
        {PLANS_AFFICHES.map((key) => {
          const featured = key === misEnAvant;
          const p = t.plans[key];
          return (
            <div
              key={key}
              className={
                "relative flex flex-col rounded-panel border bg-surface p-6 " +
                (featured ? "border-brand-600 shadow-card ring-1 ring-brand-600/15" : "border-line")
              }
            >
              {p.tag && (
                <span
                  className={
                    "absolute -top-2.5 right-5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide " +
                    (featured ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700")
                  }
                >
                  {p.tag}
                </span>
              )}
              <div className="text-sm font-semibold text-ink">{p.nom}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="data text-3xl font-semibold text-ink">{p.prix}</span>
                <span className="text-sm text-muted">{p.unite}</span>
              </div>
              {/* PAS de prix barré ici. Le « 29 € » affiché jusqu'au 17 septembre n'avait jamais
                  été pratiqué : en droit français un prix de référence dans une réduction annoncée
                  doit être un prix réellement pratiqué, et un détecteur de fausses promotions y voit
                  exactement ce qu'il cherche (compte Instagram restreint le 17 sept. pour
                  « pratiques commerciales interdites »). L'argument de lancement est désormais une
                  promesse vérifiable — le tarif ne bouge pas pour les premiers abonnés — et non une
                  remise sur un prix fictif. Ne pas réintroduire d'ancrage sans prix réel à l'appui. */}
              <div className="mt-2 text-xs text-faint">{p.note}</div>
              <div className="mt-5">{user ? <BoutonCheckout plan={key} nature={nature} /> : <BoutonAbo plan={key} nature={nature} />}</div>
            </div>
          );
        })}
      </div>

      {/* « Inclus dans Pro » : la liste de ce qu'on vend — et, à côté, la preuve.
          Cette page demandait 18,85 € en ne montrant du produit payant que cinq puces de texte.
          La capture du vrai rapport existait pourtant, et ne servait que sur l'accueil : un clic
          publicitaire arrivé sur une page ville ne la voyait jamais.
          Elle est ICI plutôt qu'au-dessus des prix : en portrait, elle repoussait les cartes
          d'un écran entier sur une page dont l'action EST le prix. À côté de la liste, elle ne
          coûte aucune hauteur et se trouve exactement en regard de ce qu'elle prouve.
          Convention du dépôt suivie (webp pré-générés + <picture>), pas next/image : les trois
          variantes sont déjà dans public/ et rien ici n'a besoin d'être transformé. */}
      <div className="mx-auto mt-8 grid max-w-3xl gap-6 rounded-panel border border-line bg-surface p-6 sm:grid-cols-[1fr_240px] sm:items-start sm:gap-8">
        <div>
          <div className="eyebrow mb-3">{t.inclus}</div>
          <ul className="space-y-2.5">
            {/* Construction neuve : 6ᵉ puce, seulement flag allumé (prix et offres inchangés). */}
            {/* Éditeur de plan : 7ᵉ puce, après le neuf, seulement interrupteur allumé. */}
            {[...t.features, ...(FEATURES.neuf ? [t.featureNeuf] : []), ...(FEATURES.plans ? [t.featurePlan] : [])].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
                <Check />
                {f}
              </li>
            ))}
          </ul>
          {FEATURES.plans && <p className="mt-4 text-[13px] text-muted">{t.planGratuit}</p>}
        </div>
        <figure className="mx-auto w-full max-w-[240px]">
          <picture>
            <source
              type="image/webp"
              srcSet="/exemple-rapport-760.webp 760w, /exemple-rapport-1040.webp 1040w"
              sizes="240px"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/exemple-rapport.png"
              alt={t.apercuAlt}
              width={1040}
              height={1458}
              loading="lazy"
              decoding="async"
              className="w-full rounded-field border border-line shadow-card"
            />
          </picture>
          <figcaption className="mt-2.5 text-center text-[11px] leading-snug text-faint">{t.apercuLegende}</figcaption>
        </figure>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        {user ? (
          <>{t.paiementBientot}</>
        ) : (
          <>{t.dejaCompteAvant}<Link href="/connexion" className="font-medium text-brand-600 hover:underline">{t.seConnecter}</Link>{t.ou}</>
        )}
        <Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">{t.continuerGratuit}</Link>.
      </p>
    </div>
  );
}

/**
 * /tarifs pendant la bêta gratuite (lib/beta.ts). En tête, la bêta : tout est offert jusqu'à la fin, il suffit
 * d'un compte ; aucun moyen de paiement demandé, rien ne sera prélevé. Puis la promesse des membres fondateurs, SANS
 * CHIFFRE (décision de Dani du 16/10/2026 : « un tarif préférentiel garanti à vie, annoncé avant la fin de la bêta »),
 * ce qui est inclus, et AUCUNE grille d'offres ni aucun prix d'après la bêta. Un seul bouton, « Créer mon compte
 * gratuit » ; aucun bouton de paiement (aucune vente pendant la bêta, CGV) :
 *  - anonyme → « Créer mon compte gratuit », qui emporte son intention (`next`) : l'éditeur de plan, ou le
 *    détaillé de sa nature ; sinon l'inscription mène aux questions de profil puis à ses projets ;
 *  - connecté → « Tout est inclus pour toi jusqu'au … », et le lien vers le détaillé ;
 *  - abonné payant → son abonnement se gère toujours depuis Mon compte (portail Stripe).
 */
function TarifsBeta({ user, t: tr, locale, source, nature }: {
  user: User | null;
  t: Dict;
  locale: Locale;
  source: string | undefined;
  nature: NatureProjet | undefined;
}) {
  const t = tr.tarifs;
  const b = tr.beta;
  const l = libellesBeta(locale);
  const abonne = !!user && estAbonne(user);
  const fondateur = estMembreFondateur(user);
  const intention =
    source === "editeur-plan" ? "/plan" : source === "choix-plan" ? "/plan?type=renovation" : nature ? lienDetaillePro(nature) : undefined;
  const inscription = lienInscriptionBeta(intention, lireSourceBeta(source) ?? "tarifs");
  const connexion = intention ? `/connexion?next=${encodeURIComponent(intention)}` : "/connexion";
  // Les plans d'un inscrit pendant la bêta : PLANS_MAX_BETA, pas « sans limite » (le droit d'un abonné, lib/plans/droits.ts).
  const plansBeta = b.plansEnregistres(PLANS_MAX_BETA);

  return (
    <div className="animate-rise mx-auto max-w-4xl py-4 sm:py-8" data-tarifs-beta="">
      <SuiviVue
        evenement="vue_tarifs"
        props={{ connecte: !!user, deja_pro: abonne, venu_pour: "aucun", beta: true, ...(source ? { source } : {}) }}
      />
      <header className="text-center">
        <p className="eyebrow">{b.tarifsEyebrow}</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">{b.tarifsTitre(dateInsecable(l.fin))}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{b.tarifsSous}</p>
      </header>

      <div className="mx-auto mt-6 max-w-md text-center">
        {!user ? (
          <>
            <Link href={inscription} className="btn btn-primary w-full justify-center py-3 text-[15px]">{b.creerCompte}</Link>
            <p className="mt-3 text-[13px] text-muted">
              {t.dejaCompteAvant}<Link href={connexion} className="font-medium text-brand-600 hover:underline">{t.seConnecter}</Link>
            </p>
          </>
        ) : (
          <p className="rounded-field border border-positive/25 bg-positive-soft px-4 py-3 text-sm text-positive">
            {/* Un abonné payant garde son abonnement (et sa gestion, portail Stripe) : on ne lui dit pas « jusqu'au 31 décembre ». */}
            {abonne ? (
              <>{b.tarifsAbonneAvant}<Link href="/mon-espace/compte" className="font-semibold underline">{b.tarifsAbonneLien}</Link></>
            ) : (
              b.tarifsConnecte(l.fin)
            )}
            {" — "}<Link href={lienDetaillePro(nature)} className="font-semibold underline">{b.tarifsConnecteLien}</Link>
          </p>
        )}
      </div>

      {/* La promesse des membres fondateurs : à un anonyme, ce qu'il gagne à s'inscrire maintenant ; à un inscrit de la
          bêta (il l'est déjà), ce qu'il garde. */}
      {(!user || fondateur) && (
        <div className="mt-6 overflow-hidden rounded-panel bg-gradient-to-r from-[#4F46E5] via-[#6d5cf0] to-[#7C3AED] px-6 py-5 text-center text-white shadow-card" data-tarifs-fondateur="">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100/90">{user ? b.tarifsFondateurTagConnecte : b.tarifsFondateurTag}</div>
          {user ? (
            <div className="mt-1 text-[18px] font-semibold tracking-tight">{b.membreFondateurTitre}</div>
          ) : (
            <>
              <div className="mt-1 text-[20px] font-semibold tracking-tight">{b.tarifsFondateurTitre}</div>
              <div className="mt-1 text-[13.5px] text-indigo-100/85">{b.tarifsFondateurSous}</div>
            </>
          )}
          <div className="mx-auto mt-2 max-w-xl text-[12.5px] text-indigo-100/75">{b.tarifsFondateurNote}</div>
        </div>
      )}

      {/* Venu de l'éditeur de plan : ce que le compte y ajoute pendant la bêta, avec les mots de l'éditeur (DROITS). */}
      {source === "editeur-plan" && (
        <div className="mx-auto mt-6 max-w-2xl rounded-field border border-brand-200 bg-brand-50 px-5 py-4 text-[14px] text-ink" data-depuis-editeur="">
          <p className="font-semibold">{b.tarifsDepuisEditeur}</p>
          <ul className="mt-2 space-y-1.5">
            {[plansBeta, ...t.depuisEditeurDroits.slice(1)].map((d) => (
              <li key={d} className="flex items-start gap-2.5 leading-relaxed">
                <Check />
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-auto mt-8 grid max-w-3xl gap-6 rounded-panel border border-line bg-surface p-6 sm:grid-cols-[1fr_240px] sm:items-start sm:gap-8">
        <div>
          <div className="eyebrow mb-3">{b.tarifsInclus}</div>
          <ul className="space-y-2.5">
            {[...t.features, ...(FEATURES.neuf ? [t.featureNeuf] : []), ...(FEATURES.plans ? [t.featurePlan.replace(t.depuisEditeurDroits[0], plansBeta)] : [])].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
                <Check />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <figure className="mx-auto w-full max-w-[240px]">
          <picture>
            <source
              type="image/webp"
              srcSet="/exemple-rapport-760.webp 760w, /exemple-rapport-1040.webp 1040w"
              sizes="240px"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/exemple-rapport.png"
              alt={t.apercuAlt}
              width={1040}
              height={1458}
              loading="lazy"
              decoding="async"
              className="w-full rounded-field border border-line shadow-card"
            />
          </picture>
          <figcaption className="mt-2.5 text-center text-[11px] leading-snug text-faint">{t.apercuLegende}</figcaption>
        </figure>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        {user ? (
          <>{b.tarifsBasConnecte}</>
        ) : (
          <>{t.dejaCompteAvant}<Link href={connexion} className="font-medium text-brand-600 hover:underline">{t.seConnecter}</Link>{t.ou}</>
        )}
        <Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">{t.continuerGratuit}</Link>.
      </p>
    </div>
  );
}

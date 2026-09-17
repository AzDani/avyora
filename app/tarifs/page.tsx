import Link from "next/link";
import BoutonAbo from "@/components/BoutonAbo";
import BoutonCheckout from "@/components/BoutonCheckout";
import { getUser, estPro } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { SuiviVue } from "@/components/SuiviVue";

export const metadata = {
  title: "Passer Pro — estimation détaillée poste par poste",
  description:
    "Débloque l'estimateur détaillé AVYORA : 200 postes chiffrés, quantités ajustables, rapport PDF et sauvegarde de tes projets. Dès 18,85 €/mois, sans engagement.",
  alternates: { canonical: "/tarifs" },
};
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
  searchParams: Promise<{ plan?: string; abo?: string }>;
}) {
  const [{ plan: planDemande, abo }, user, { t: tr }] = await Promise.all([searchParams, getUser(), getT()]);
  const t = tr.tarifs;
  const dejaPro = estPro(user);
  // Un visiteur qui revient d'une inscription arrive avec le plan qu'il avait choisi AVANT de
  // créer son compte (components/BoutonAbo.tsx pose ce paramètre). On met SON plan en avant
  // plutôt que celui de la maison : il retrouve son choix au lieu de devoir le refaire.
  const misEnAvant = PLANS_AFFICHES.find((k) => k === planDemande) ?? PLAN_PAR_DEFAUT;

  return (
    <div className="animate-rise mx-auto max-w-4xl py-4 sm:py-8">
      {/* Le mur payant : sans cette mesure, on ignore combien de visiteurs y parviennent. */}
      <SuiviVue
        evenement="vue_tarifs"
        props={{ connecte: !!user, deja_pro: dejaPro, venu_pour: planDemande ?? "aucun" }}
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
          {t.dejaProAvant}<Link href="/projets/nouveau/detaille?new=1" className="font-semibold underline">{t.dejaProLien}</Link>.
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
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[16px] font-semibold text-muted line-through decoration-[1.5px]">{p.base}</span>
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{p.off} {t.offSuffix}</span>
              </div>
              <div className="mt-1.5 text-xs text-faint">{p.note}</div>
              <div className="mt-5">{user ? <BoutonCheckout plan={key} /> : <BoutonAbo plan={key} />}</div>
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
            {t.features.map((f) => (
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
          <>{t.paiementBientot}</>
        ) : (
          <>{t.dejaCompteAvant}<Link href="/connexion" className="font-medium text-brand-600 hover:underline">{t.seConnecter}</Link>{t.ou}</>
        )}
        <Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">{t.continuerGratuit}</Link>.
      </p>
    </div>
  );
}

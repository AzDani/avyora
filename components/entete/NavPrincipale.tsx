import Link from "next/link";
import type { ReactNode } from "react";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { FEATURES } from "@/lib/features";
import { etatArtisanEntete } from "@/lib/data/reseau";
import { estComptePro } from "@/lib/compte/type";
import OngletPlan, { VITRINE_PLAN } from "@/components/plans/OngletPlan";
import OngletAccompagnement from "@/components/accompagnement/OngletAccompagnement";
import Volet from "./Volet";

/**
 * La partie gauche de l'en-tête v2 (décision de Dani du 26/11/2026) : ce qu'AVYORA propose, pareil pour tout le monde.
 * Estimer (volet : rénovation, neuf, depuis mon plan, repères de prix), Plan 3D, Artisans (volet, France seulement :
 * trouver un artisan, les avis, rejoindre le réseau ou son espace artisan) et Accompagnement. Ce qui est À MOI (projets,
 * devis, espace artisan, compte) est à droite, dans « Mon espace » (components/auth/AuthNav.tsx).
 */
export default async function NavPrincipale() {
  const [{ t, locale }, user] = await Promise.all([getT(), getUser()]);
  const fr = locale === "fr";
  const artisan = user && fr ? await etatArtisanEntete(user.id, estComptePro(user)).catch(() => ({ artisan: false, aRepondre: 0, candidature: false })) : null;
  const n = t.nav;
  return (
    <>
      <Volet data="estimer" bouton={n.estimer} largeur={fr ? "w-[620px]" : "w-[340px]"}>
        <div className={fr ? "grid grid-cols-[1.25fr_1fr] gap-1.5" : ""}>
          <div className="flex flex-col gap-0.5">
            <Titre>{n.estimerTitre}</Titre>
            <Ligne href="/projets/nouveau?nature=reno" titre={n.renovation} sous={n.renovationSous} icone={<IcMaison />} />
            <Ligne href="/projets/nouveau?nature=neuf" titre={n.neuf} sous={n.neufSous} icone={<IcNeuf />} />
            {FEATURES.plans && <Ligne href={VITRINE_PLAN} titre={n.depuisPlan} sous={n.depuisPlanSous} icone={<IcPlan />} ton="violet" />}
          </div>
          {fr && (
            <div className="flex flex-col gap-0.5 border-l border-line pl-2">
              <Titre>{n.reperesPrix}</Titre>
              <LigneSimple href="/prix-travaux">{n.prixPoste}</LigneSimple>
              <LigneSimple href="/prix-renovation">{n.prixVille}</LigneSimple>
              <LigneSimple href="/guides">{n.guides}</LigneSimple>
              <LigneSimple href="/methodologie">{n.methodo}</LigneSimple>
            </div>
          )}
        </div>
        {!fr && <LigneSimple href="/methodologie">{n.methodo}</LigneSimple>}
        <p className="mt-1.5 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] text-muted">{n.estimerPied}</p>
      </Volet>
      {FEATURES.plans && <OngletPlan label={n.plan} pastille={n.planPastille} />}
      {fr && (
        <Volet data="artisans" bouton="Artisans" largeur="w-[380px]">
          <Ligne href="/trouver-un-artisan" titre="Trouver un artisan vérifié" sous="SIRET actif, décennale, appel avec Daniel" icone={<IcBouclier />} ton="vert" />
          <Ligne href="/avis-artisans" titre={<>Avis sur les artisans <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-700">PRO</span></>} sous="Laissés par de vrais clients du réseau" icone={<IcEtoile />} ton="ambre" />
          <div className="mx-2.5 my-1.5 border-t border-line" />
          {artisan?.artisan ? (
            <Link href="/espace-artisan" className="flex items-center gap-3 rounded-xl bg-[#f3efff] px-3 py-2.5 text-[14px] font-semibold text-[#5b21b6] transition-colors hover:bg-[#ebe4ff]">
              <IcEspace />
              <span className="flex-1">Mon espace artisan</span>
              {artisan.aRepondre > 0 && <span className="num rounded-full bg-[#f59e0b] px-1.5 text-[11.5px] font-bold leading-5 text-[#1e1b4b]">{artisan.aRepondre}<span className="sr-only"> à répondre</span></span>}
            </Link>
          ) : (
            <Link href="/reseau-artisans" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-semibold text-brand-700 transition-colors hover:bg-surface-2">
              Tu es artisan ? Rejoins le réseau <span aria-hidden="true">→</span>
            </Link>
          )}
        </Volet>
      )}
      <OngletAccompagnement label={n.accompagnementCourt} />
    </>
  );
}

function Titre({ children }: { children: ReactNode }) {
  return <p className="mx-3 mb-1 mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">{children}</p>;
}

const TONS = { indigo: "bg-brand-50 text-brand-700", violet: "bg-[#f3efff] text-[#6d28d9]", vert: "bg-[#e3f5ed] text-[#0b7a53]", ambre: "bg-[#fff4dc] text-[#8a5300]" } as const;

function Ligne({ href, titre, sous, icone, ton = "indigo" }: { href: string; titre: ReactNode; sous: string; icone: ReactNode; ton?: keyof typeof TONS }) {
  return (
    <Link href={href} className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2">
      <span className={"grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] " + TONS[ton]}>{icone}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-ink">{titre}</span>
        <span className="text-[12.5px] leading-snug text-muted">{sous}</span>
      </span>
    </Link>
  );
}

function LigneSimple({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded-lg px-3 py-2 text-[14px] text-ink transition-colors hover:bg-surface-2">{children}</Link>;
}

const Ic = ({ d }: { d: string }) => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IcMaison = () => <Ic d="M2.5 7.2 8 2.8l5.5 4.4M4 6v7.2h8V6M6.6 13.2V9.8h2.8v3.4" />;
const IcNeuf = () => <Ic d="M2 13.5h12M3.5 13.5V6.5h5v7M8.5 9h4v4.5M5 8.5h2M5 10.8h2M2.8 3.5h6.5M6 3.5v3" />;
const IcPlan = () => <Ic d="M2.5 2.5h11v11h-11zM2.5 8h5V2.5M7.5 8v5.5M10 8h3.5" />;
const IcBouclier = () => <Ic d="M8 1.8 13 3.7v4c0 3-2.1 5.3-5 6.5-2.9-1.2-5-3.5-5-6.5v-4L8 1.8ZM5.8 8l1.6 1.6 3-3" />;
const IcEtoile = () => <Ic d="M8 1.9l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.9z" />;
const IcEspace = () => <Ic d="M2.5 13.5h11M4 13.5V7.2L8 4l4 3.2v6.3M6.6 13.5V10h2.8v3.5" />;

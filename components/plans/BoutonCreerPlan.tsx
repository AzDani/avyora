"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { EnvoyerLien } from "@/components/plans/TesPlans";
import { dictPlans } from "@/lib/i18n/plans";
import { clicPlan } from "@/lib/plans/mesure";
import { lienEditeurPlan } from "@/lib/beta";

/**
 * L'appel du bas de la vitrine (C9). Au serveur (et sur ordinateur ou tablette) : l'éditeur demande un compte
 * (décision de Dani du 12/11/2026), donc « Crée ton compte gratuit pour dessiner » vers l'inscription (retour à
 * l'éditeur) pour un visiteur sans compte, « Ouvrir l'éditeur » vers `/plan` pour une personne connectée. Au
 * téléphone, où l'on ne dessine pas, il devient « M'envoyer le lien », comme l'îlot « Tes plans ».
 */
export default function BoutonCreerPlan({ connecte }: { connecte: boolean }) {
  const t = dictPlans(useLocale());
  const [telephone, setTelephone] = useState(false);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(max-width: 600px)");
      setTelephone(mq.matches);
    } catch {
      mq = null;
    }
    const suivre = (e: MediaQueryListEvent) => setTelephone(e.matches);
    mq?.addEventListener?.("change", suivre);
    return () => mq?.removeEventListener?.("change", suivre);
  }, []);
  if (telephone) return <EnvoyerLien t={t} />;
  return (
    <a href={lienEditeurPlan("/plan", connecte, "vitrine-plan")} className="btn btn-primary max-w-full whitespace-normal px-5 py-3 text-center text-[15px] leading-snug" {...clicPlan("vitrine_bas")}>
      {connecte ? t.hub.ouvrirEditeur : t.hub.creer}
    </a>
  );
}

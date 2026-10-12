"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LangProvider";
import { EnvoyerLien } from "@/components/plans/TesPlans";
import { dictPlans } from "@/lib/i18n/plans";

/**
 * L'appel du bas de la vitrine (C9). Au serveur (et sur ordinateur ou tablette) : « Créer mon plan » vers
 * `/plan`. Au téléphone, où l'on ne dessine pas, il devient « M'envoyer le lien », comme l'îlot « Tes plans ».
 */
export default function BoutonCreerPlan({ label }: { label: string }) {
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
    <Link href="/plan" className="btn btn-primary px-5 py-3 text-[15px]">
      {label}
    </Link>
  );
}

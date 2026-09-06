"use client";

import Link from "next/link";
import { suivre } from "@/lib/track";
import { useT } from "@/components/i18n/LangProvider";

/** CTA d'abonnement (page Tarifs) — trace l'intention « clic_sabonner » puis mène à l'inscription. */
export default function BoutonAbo({ plan }: { plan: string }) {
  const t = useT();
  return (
    <Link
      href="/inscription"
      onClick={() => suivre("clic_sabonner", { plan })}
      className="btn btn-primary w-full justify-center py-2.5"
    >
      {t.boutons.creerCompte}
    </Link>
  );
}

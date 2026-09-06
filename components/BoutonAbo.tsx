"use client";

import Link from "next/link";
import { suivre } from "@/lib/track";

/** CTA d'abonnement (page Tarifs) — trace l'intention « clic_sabonner » puis mène à l'inscription. */
export default function BoutonAbo({ plan }: { plan: string }) {
  return (
    <Link
      href="/inscription"
      onClick={() => suivre("clic_sabonner", { plan })}
      className="btn btn-primary w-full justify-center py-2.5"
    >
      Créer mon compte
    </Link>
  );
}

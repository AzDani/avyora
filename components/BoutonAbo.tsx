"use client";

import Link from "next/link";
import { suivre } from "@/lib/track";
import { useT } from "@/components/i18n/LangProvider";

/**
 * CTA d'abonnement pour un visiteur NON connecté (page Tarifs).
 *
 * Il mène à l'inscription — mais en EMPORTANT l'intention d'achat. Sans ce `next`, le parcours
 * était : clic sur un plan → /inscription → /onboarding → /projets. Le plan choisi était jeté
 * en route (il ne servait qu'à l'événement de mesure) et le visiteur atterrissait dans la liste
 * de ses projets sans avoir jamais vu d'écran de paiement ; pour payer, il devait retrouver
 * /tarifs tout seul, au pied de page. C'était le trou le plus coûteux du tunnel : on perdait
 * les gens exactement au moment où ils venaient de dire oui.
 */
export default function BoutonAbo({ plan }: { plan: string }) {
  const t = useT();
  const retour = `/tarifs?plan=${encodeURIComponent(plan)}`;
  return (
    <Link
      href={`/inscription?next=${encodeURIComponent(retour)}`}
      onClick={() => suivre("clic_sabonner", { plan })}
      className="btn btn-primary w-full justify-center py-2.5"
    >
      {t.boutons.creerCompte}
    </Link>
  );
}

/**
 * Un abonnement Stripe « en cours » : celui qu'un nouveau paiement doublerait. Module pur (testé dans
 * tests/abonnement.test.ts), lu par /api/stripe/checkout avant de créer une session de paiement.
 *
 * - `active`, `trialing` : l'abonnement court ;
 * - `past_due`, `unpaid` : un prélèvement a échoué, l'abonnement existe toujours : la carte se met à jour depuis le
 *   portail (Mon compte), pas en souscrivant une deuxième fois.
 * Pas `incomplete` (le premier paiement n'a pas abouti, 3-D Secure abandonné : Stripe l'expire seul en 23 h ; la
 * personne doit pouvoir réessayer tout de suite), ni `incomplete_expired`, `canceled`, `paused`.
 */
export const STATUTS_ABONNEMENT_EN_COURS = ["active", "trialing", "past_due", "unpaid"] as const;

export function abonnementEnCours(statut: string | null | undefined): boolean {
  return (STATUTS_ABONNEMENT_EN_COURS as readonly string[]).includes(statut ?? "");
}

/** Où un abonné gère son abonnement (portail Stripe : `app/api/abonnement/portail`, depuis Mon compte). */
export const PAGE_GESTION_ABONNEMENT = "/mon-espace/compte";

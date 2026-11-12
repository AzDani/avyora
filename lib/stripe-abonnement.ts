/**
 * Règles d'abonnement lues par le webhook Stripe (app/api/stripe/webhook/route.ts). Pures : testées sans Stripe.
 *
 * past_due : un prélèvement a échoué et Stripe le retente (Billing › Revenue recovery). Le client paie : il
 * garde le Pro pendant cette période de grâce. Le Pro tombe quand Stripe abandonne (unpaid, canceled), quand
 * le premier paiement n'a jamais abouti (incomplete, incomplete_expired) ou quand l'abonnement est en pause.
 */
const STATUTS_PRO: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

export function planDuStatut(statut: string | null | undefined): "pro" | "free" {
  return statut && STATUTS_PRO.has(statut) ? "pro" : "free";
}

/**
 * Une session Checkout payée : `paid`, ou `no_payment_required` (essai gratuit, code promo à 100 %).
 * `unpaid` = paiement différé (prélèvement SEPA…) : le Pro attend `checkout.session.async_payment_succeeded`.
 */
export function sessionPayee(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

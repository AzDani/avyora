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

/**
 * Date de fin d'un abonnement résilié qui court encore (22/11/2026) : Mon compte dit « résilié, tu gardes le Pro
 * jusqu'au … » au lieu de laisser croire que tout continue. `cancel_at` quand Stripe l'a posé, sinon la fin de la
 * période en cours (portée par les lignes de l'abonnement depuis les versions 2025 de l'API). `null` : pas de fin
 * prévue (abonnement qui se renouvelle, réactivé, ou déjà terminé).
 */
export function finPrevue(sub: {
  status: string;
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  items?: { data: { current_period_end?: number | null }[] };
}): string | null {
  if (planDuStatut(sub.status) !== "pro") return null;
  const finPeriode = Math.max(0, ...(sub.items?.data ?? []).map((i) => i.current_period_end ?? 0));
  const fin = sub.cancel_at ?? (sub.cancel_at_period_end && finPeriode > 0 ? finPeriode : null);
  return fin ? new Date(fin * 1000).toISOString() : null;
}

/**
 * /bienvenue-pro : la page ne félicite et ne compte une conversion « Abonnement » qu'après un VRAI paiement. Stripe
 * renvoie sur `/bienvenue-pro?session_id=cs_…` (lib/nature-projet.ts, retoursStripe) ; la page relit cette session
 * côté serveur et ne la retient que si elle est terminée, payée et faite par le compte connecté.
 *
 * Module pur (aucune dépendance à Stripe ni à Next) : la décision se teste sans réseau.
 */

/** Ce qu'on lit d'une session Stripe Checkout (sous-ensemble de `Stripe.Checkout.Session`). */
export type SessionCheckout = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  currency?: string | null;
};

/** Ce que la page reçoit d'un paiement vérifié : de quoi déclarer la conversion (montant réel, dédoublonnage). */
export type PaiementVerifie = { transactionId: string; valeur: number | null; devise: string };

/** Forme d'un identifiant de session Checkout (`cs_test_…` / `cs_live_…`) : on n'interroge pas Stripe pour n'importe quoi. */
export function idSessionValide(v: unknown): v is string {
  return typeof v === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(v);
}

/**
 * La session prouve-t-elle un paiement du compte `userId` ? Terminée (`complete`), payée (`paid`, ou
 * `no_payment_required` pour un essai ou un code à 100 %), et rattachée à ce compte (client_reference_id posé par
 * /api/stripe/checkout, ou à défaut metadata.supabase_user_id). Sinon `null`.
 */
export function paiementVerifie(s: SessionCheckout | null | undefined, userId: string): PaiementVerifie | null {
  if (!s || !userId) return null;
  if (s.status !== "complete") return null;
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return null;
  const proprietaire = s.client_reference_id || s.metadata?.supabase_user_id || null;
  if (proprietaire !== userId) return null;
  const valeur = typeof s.amount_total === "number" && Number.isFinite(s.amount_total) ? s.amount_total / 100 : null;
  return { transactionId: s.id, valeur, devise: (s.currency || "eur").toUpperCase() };
}

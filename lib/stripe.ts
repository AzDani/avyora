import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Client Stripe (serveur). Init paresseuse → ne casse pas le build si la clé n'est pas encore posée. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant dans .env.local");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export type PlanKey = "mensuel" | "annuel-mois" | "annuel";

/** ID de tarif Stripe (price_…) pour un plan, depuis les variables d'environnement. */
export function priceIdForPlan(plan: PlanKey): string | undefined {
  const map: Record<PlanKey, string | undefined> = {
    mensuel: process.env.STRIPE_PRICE_MENSUEL,
    "annuel-mois": process.env.STRIPE_PRICE_ANNUEL_MENSUALISE,
    annuel: process.env.STRIPE_PRICE_ANNUEL,
  };
  return map[plan];
}

/* ── Résiliation à la suppression du compte (RGPD) ─────────────────────────────────────────────── */

/** Statuts d'un abonnement qui peut encore prélever : on le résilie. `canceled` et `incomplete_expired` : rien à faire. */
const STATUTS_A_RESILIER = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

/** Ce que la résiliation utilise de Stripe (le client réel, ou un faux dans les tests). */
export type StripeResiliation = {
  subscriptions: {
    retrieve(id: string): Promise<{ id: string; status: string }>;
    list(p: { customer: string; status: "all"; limit: number }): Promise<{ data: { id: string; status: string }[] }>;
    search(p: { query: string; limit: number }): Promise<{ data: { id: string; status: string }[] }>;
    cancel(id: string): Promise<{ id: string; status: string }>;
  };
};

/**
 * Résilie TOUS les abonnements Stripe encore actifs d'un utilisateur, avant la suppression de son compte :
 * sans cela, un abonné Pro qui supprimait son compte continuait d'être prélevé (l'abonnement et ses
 * identifiants Stripe disparaissaient avec l'utilisateur). Les abonnements sont retrouvés par
 * `app_metadata` (posé par le webhook : stripe_subscription_id, stripe_customer_id) et par la métadonnée
 * `supabase_user_id` des abonnements (au cas où le webhook n'aurait rien écrit). Résiliation immédiate :
 * le compte n'existera plus.
 *
 * Renvoie les abonnements résiliés. JETTE si un abonnement connu n'a pas pu être résilié, ou si l'on ne
 * peut pas vérifier alors que l'utilisateur a des traces Stripe : la suppression doit alors s'arrêter.
 * Sans clé Stripe (`stripe` null) et sans aucune trace Stripe : rien à résilier.
 */
export async function resilierAbonnementsUtilisateur(
  stripe: StripeResiliation | null,
  user: { id: string; app_metadata?: Record<string, unknown> | null },
): Promise<string[]> {
  const meta = user.app_metadata ?? {};
  const subId = typeof meta.stripe_subscription_id === "string" && meta.stripe_subscription_id ? meta.stripe_subscription_id : null;
  const custId = typeof meta.stripe_customer_id === "string" && meta.stripe_customer_id ? meta.stripe_customer_id : null;
  const traces = !!(subId || custId);
  if (!stripe) {
    if (traces) throw new Error("Stripe non configuré : impossible de résilier l'abonnement");
    return [];
  }

  const aResilier = new Set<string>();
  const garder = (s: { id: string; status: string }) => { if (STATUTS_A_RESILIER.has(s.status)) aResilier.add(s.id); };
  if (subId) garder(await stripe.subscriptions.retrieve(subId));
  if (custId) (await stripe.subscriptions.list({ customer: custId, status: "all", limit: 100 })).data.forEach(garder);
  // Recherche par métadonnée : un filet. L'identifiant est un UUID (aucun guillemet possible dans la requête).
  if (/^[0-9a-f-]{36}$/i.test(user.id)) {
    try {
      (await stripe.subscriptions.search({ query: `metadata['supabase_user_id']:'${user.id}'`, limit: 100 })).data.forEach(garder);
    } catch (e) {
      // Recherche indisponible : sans trace Stripe, l'utilisateur n'a jamais rien acheté ; avec des
      // traces, la liste par client ci-dessus les couvre déjà.
      console.warn("Recherche d'abonnements Stripe indisponible :", e);
    }
  }

  const resilies: string[] = [];
  for (const id of aResilier) {
    await stripe.subscriptions.cancel(id); // une erreur ici arrête tout : le compte n'est pas supprimé
    resilies.push(id);
  }
  return resilies;
}

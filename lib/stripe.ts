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

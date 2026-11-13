import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getLocale } from "@/lib/i18n/server";

const MSG = {
  fr: {
    aucun: "Aucun abonnement en cours à gérer. (La gestion en ligne s'active dès ton premier abonnement.)",
    introuvable: "Aucun abonnement actif n'a été trouvé chez Stripe pour ce compte. Si tu penses que c'est une erreur, écris-nous à contact@getavyora.fr.",
    panne: "La gestion de l'abonnement ne s'ouvre pas pour le moment. Réessaie dans quelques minutes, ou écris-nous à contact@getavyora.fr.",
  },
  en: {
    aucun: "No subscription to manage. (Online management turns on with your first subscription.)",
    introuvable: "No active subscription was found at Stripe for this account. If you think this is a mistake, email us at contact@getavyora.fr.",
    panne: "Subscription management won't open right now. Try again in a few minutes, or email us at contact@getavyora.fr.",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Portail de gestion d'abonnement Stripe (résiliation « en 3 clics »).
 * Ouvre le portail client Stripe pour l'utilisateur ; message d'attente s'il n'a pas d'abonnement.
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const m = MSG[(await getLocale()) === "en" ? "en" : "fr"];
  const customerId = (user.app_metadata as { stripe_customer_id?: string } | undefined)?.stripe_customer_id;
  if (!customerId || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ message: m.aucun });

  try {
    const origin = new URL(req.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/mon-espace/compte`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe portal error:", e);
    // Client inconnu de Stripe (ex. un identifiant resté des tests) : ce n'est pas une panne, on le dit clairement.
    if ((e as { code?: string })?.code === "resource_missing") return NextResponse.json({ message: m.introuvable });
    return NextResponse.json({ error: m.panne, message: m.panne }, { status: 500 });
  }
}

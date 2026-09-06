import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Portail de gestion d'abonnement Stripe (résiliation « en 3 clics »).
 * Ouvre le portail client Stripe pour l'utilisateur ; message d'attente s'il n'a pas d'abonnement.
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const customerId = (user.app_metadata as { stripe_customer_id?: string } | undefined)?.stripe_customer_id;
  if (!customerId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      message: "Aucun abonnement en cours à gérer. (La gestion en ligne s'active dès ton premier abonnement.)",
    });
  }

  try {
    const origin = new URL(req.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/mon-espace/compte`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe portal error:", e);
    return NextResponse.json({ error: "Ouverture du portail impossible." }, { status: 500 });
  }
}

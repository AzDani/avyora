import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getStripe, priceIdForPlan, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Crée une session Stripe Checkout (abonnement) pour l'utilisateur connecté et renvoie l'URL. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: undefined }));
  const priceId = priceIdForPlan(plan as PlanKey);
  if (!priceId) {
    return NextResponse.json({ error: "Cette offre n'est pas encore configurée." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const customerId = (user.app_metadata as { stripe_customer_id?: string } | undefined)?.stripe_customer_id;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      // On propage l'id Supabase sur l'abonnement → le webhook sait à qui attribuer le Pro.
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
      // Conformité conso FR : acceptation obligatoire des CGV (Stripe horodate le consentement)
      // + mention de la renonciation au droit de rétractation (service numérique fourni immédiatement).
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "J'accepte les conditions générales de vente et je demande l'exécution immédiate du service. AVYORA étant un service numérique fourni dès la souscription, je reconnais renoncer à mon droit de rétractation une fois le service exécuté (art. L221-28 du Code de la consommation).",
        },
      },
      success_url: `${origin}/bienvenue-pro`,
      cancel_url: `${origin}/tarifs?abo=annule`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: "Impossible de démarrer le paiement." }, { status: 500 });
  }
}

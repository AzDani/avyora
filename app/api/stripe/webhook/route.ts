import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { envoyerEmail, emailConfirmation } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Met à jour app_metadata.plan de l'utilisateur (fusionne avec l'existant). */
async function majPlan(userId: string, plan: "pro" | "free", extra?: Record<string, unknown>) {
  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.getUserById(userId);
  const current = (data.user?.app_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...current, plan, ...extra } });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook non configuré (STRIPE_WEBHOOK_SECRET manquant)" }, { status: 400 });
  }

  const body = await req.text(); // corps brut requis pour vérifier la signature
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.supabase_user_id || s.client_reference_id || undefined;
        if (userId) {
          await majPlan(userId, "pro", {
            stripe_customer_id: typeof s.customer === "string" ? s.customer : undefined,
            stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : undefined,
          });
        }
        // E-mail de confirmation de commande (obligation d'information + réassurance).
        const emailClient = s.customer_details?.email || s.customer_email || undefined;
        if (emailClient) {
          const montant =
            s.amount_total != null
              ? (s.amount_total / 100).toLocaleString("fr-FR", { style: "currency", currency: (s.currency || "eur").toUpperCase() })
              : undefined;
          const { subject, html } = emailConfirmation({ montant, espaceUrl: `${new URL(req.url).origin}/mon-espace` });
          await envoyerEmail(emailClient, subject, html);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          const actif = sub.status === "active" || sub.status === "trialing";
          await majPlan(userId, actif ? "pro" : "free", {
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : undefined,
            stripe_subscription_id: sub.id,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

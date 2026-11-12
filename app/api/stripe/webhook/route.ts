import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { envoyerEmail, emailConfirmation } from "@/lib/email";
import { planDuStatut, sessionPayee } from "@/lib/stripe-abonnement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof supabaseAdmin>;

/** Met à jour app_metadata.plan de l'utilisateur (fusionne avec l'existant). */
async function majPlan(admin: Admin, userId: string, plan: "pro" | "free", extra?: Record<string, unknown>) {
  const { data, error: lecture } = await admin.auth.admin.getUserById(userId);
  if (lecture && lecture.status !== 404) throw lecture; // panne passagère : Stripe relivrera
  if (!data?.user) {
    // Compte supprimé entre-temps : rien à mettre à jour (et Stripe ne doit pas relivrer pendant trois jours).
    console.warn("[stripe webhook] utilisateur introuvable :", userId);
    return;
  }
  const current = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...current, plan, ...extra } });
  if (error) throw error; // 500 : Stripe relivrera l'événement
}

/** Au-delà, un id inscrit mais jamais marqué traité est repris : son traitement a été coupé net (délai dépassé,
 * instance arrêtée) sans passer par le `catch` qui l'aurait retiré du registre. */
const REPRISE_MS = 10 * 60_000;

/**
 * Idempotence : Stripe peut livrer plusieurs fois le même événement (timeout, 5xx). Son id est inscrit dans
 * `stripe_events` (migration 0005) AVANT le traitement, et marqué `traite_le` APRÈS. Une relivraison tombe sur
 * la clé primaire :
 *   « pris »          : premier passage (ou reprise d'un traitement coupé net depuis REPRISE_MS) : on traite ;
 *   « deja »          : déjà traité : on répond 200 sans rien refaire (ni Pro réattribué, ni e-mail renvoyé) ;
 *   « en-cours »      : inscrit mais pas encore marqué traité : on répond 409 pour que Stripe relivre plus tard
 *                       (un 200 ici perdrait l'événement si le premier passage échoue ensuite) ;
 *   « sans-registre » : table absente (migration pas encore appliquée) ou panne : on traite quand même,
 *                       comme avant la migration, plutôt que de perdre un paiement.
 */
async function prendreEvenement(
  admin: Admin,
  event: Stripe.Event,
): Promise<"pris" | "deja" | "en-cours" | "sans-registre"> {
  const { error } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (!error) return "pris";
  if (error.code !== "23505") {
    console.warn("[stripe webhook] registre des événements indisponible, traitement sans idempotence :", error.code);
    return "sans-registre";
  }
  /* Reprise atomique d'un traitement coupé net : une seule relivraison concurrente obtient la ligne. */
  const limite = new Date(Date.now() - REPRISE_MS).toISOString();
  const { data: repris } = await admin
    .from("stripe_events")
    .update({ recu_le: new Date().toISOString() })
    .eq("id", event.id)
    .is("traite_le", null)
    .lt("recu_le", limite)
    .select("id");
  if ((repris ?? []).length === 1) return "pris";
  const { data: ligne, error: lecture } = await admin
    .from("stripe_events")
    .select("traite_le")
    .eq("id", event.id)
    .maybeSingle();
  if (!lecture && ligne?.traite_le) return "deja";
  return "en-cours";
}

/** Traitement réussi : l'id est marqué, toute relivraison répondra 200 sans rien refaire. */
async function marquerEvenement(admin: Admin, id: string) {
  const { error } = await admin.from("stripe_events").update({ traite_le: new Date().toISOString() }).eq("id", id);
  if (error) console.error("[stripe webhook] id non marqué traité :", id, error.code);
}

/** Traitement en échec : l'id repart du registre pour que la relivraison de Stripe soit traitée. */
async function rendreEvenement(admin: Admin, id: string) {
  const { error } = await admin.from("stripe_events").delete().eq("id", id);
  if (error) console.error("[stripe webhook] id non retiré du registre :", id, error.code);
}

/**
 * Pro accordé à la fin d'un Checkout : seulement si la session est payée ET si l'abonnement, relu chez Stripe
 * (son état COURANT, pas celui d'un événement peut-être livré en retard), donne le Pro. Sinon rien n'est écrit :
 * `customer.subscription.updated` accordera le Pro quand le paiement aboutira. E-mail seulement si Pro accordé.
 */
async function finCheckout(admin: Admin, s: Stripe.Checkout.Session, origine: string) {
  const userId = s.metadata?.supabase_user_id || s.client_reference_id || undefined;
  const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
  let pro = sessionPayee(s.payment_status);
  if (pro && subId) pro = planDuStatut((await getStripe().subscriptions.retrieve(subId)).status) === "pro";
  if (!pro) return;

  if (userId) {
    await majPlan(admin, userId, "pro", {
      stripe_customer_id: typeof s.customer === "string" ? s.customer : undefined,
      stripe_subscription_id: subId,
    });
  }
  // E-mail de confirmation de commande (obligation d'information + réassurance).
  const emailClient = s.customer_details?.email || s.customer_email || undefined;
  if (emailClient) {
    const montant =
      s.amount_total != null
        ? (s.amount_total / 100).toLocaleString("fr-FR", { style: "currency", currency: (s.currency || "eur").toUpperCase() })
        : undefined;
    const { subject, html } = emailConfirmation({ montant, espaceUrl: `${origine}/mon-espace` });
    await envoyerEmail(emailClient, subject, html);
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET absent : événement refusé.");
    return NextResponse.json({ error: "Webhook indisponible" }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  const body = await req.text(); // corps brut requis pour vérifier la signature
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const prise = await prendreEvenement(admin, event);
  if (prise === "deja") return NextResponse.json({ received: true, deja: true });
  if (prise === "en-cours") return NextResponse.json({ error: "Traitement en cours" }, { status: 409 });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        await finCheckout(admin, event.data.object as Stripe.Checkout.Session, new URL(req.url).origin);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // L'ordre de livraison n'est pas garanti : on relit l'abonnement chez Stripe et on décide sur son état
        // COURANT (un vieil « incomplete » livré après « active » ne retire plus le Pro).
        const sub = event.data.object as Stripe.Subscription;
        const courant = await getStripe().subscriptions.retrieve(sub.id);
        const userId = courant.metadata?.supabase_user_id || sub.metadata?.supabase_user_id;
        if (userId) {
          await majPlan(admin, userId, planDuStatut(courant.status), {
            stripe_customer_id: typeof courant.customer === "string" ? courant.customer : undefined,
            stripe_subscription_id: courant.id,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    if (prise === "pris") await rendreEvenement(admin, event.id);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  if (prise === "pris") await marquerEvenement(admin, event.id);
  return NextResponse.json({ received: true });
}

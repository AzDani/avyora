import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { envoyerEmail, emailChatel } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rappel loi Chatel (L215-1) : prévient les abonnés annuels ~1 mois avant la reconduction
 * qu'ils peuvent ne pas renouveler. Déclenché quotidiennement par Vercel Cron (voir vercel.json).
 */
export async function GET(req: Request) {
  // Sécurité : Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> » si la variable est définie.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 400 });
  }

  const stripe = getStripe();
  const now = Math.floor(Date.now() / 1000);
  const min = now + 27 * 86400; // fenêtre ~1 mois avant l'échéance
  const max = now + 33 * 86400;
  let envoyes = 0;

  try {
    for await (const sub of stripe.subscriptions.list({ status: "active", limit: 100 })) {
      const item = sub.items.data[0];
      const interval = item?.price?.recurring?.interval;
      if (interval !== "year") continue; // seulement l'annuel

      // current_period_end : selon la version d'API, au niveau item ou subscription.
      const cpe = (item as unknown as { current_period_end?: number })?.current_period_end
        ?? (sub as unknown as { current_period_end?: number }).current_period_end;
      if (!cpe || cpe < min || cpe > max) continue;
      if (sub.metadata?.chatel_sent === String(cpe)) continue; // déjà prévenu pour cette échéance

      const cust = await stripe.customers.retrieve(sub.customer as string);
      const email = (cust as Stripe.Customer).deleted ? null : (cust as Stripe.Customer).email;
      if (!email) continue;

      const dateReconduction = new Date(cpe * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const { subject, html } = emailChatel({ dateReconduction, gererUrl: `${new URL(req.url).origin}/mon-espace/compte` });
      await envoyerEmail(email, subject, html);
      await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, chatel_sent: String(cpe) } });
      envoyes++;
    }
  } catch (e) {
    console.error("Cron Chatel error:", e);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rappels_envoyes: envoyes });
}

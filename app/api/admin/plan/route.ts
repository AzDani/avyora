import { NextResponse } from "next/server";
import { gardeAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Attribuer / retirer le statut Pro à un utilisateur (réservé admin).
 * Écrit `app_metadata.plan` = "pro" | "free" en fusionnant l'existant (garde stripe_customer_id, etc.).
 * ⚠️ Un abonné Stripe verra son plan re-synchronisé par le webhook à sa prochaine (dé)souscription.
 */
export async function POST(req: Request) {
  const refus = await gardeAdmin();
  if (refus) return refus;

  const { userId, plan } = await req.json().catch(() => ({}));
  if (!userId || (plan !== "pro" && plan !== "free")) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.getUserById(String(userId));
  if (!data.user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  const current = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(String(userId), { app_metadata: { ...current, plan } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await journaliser("action_admin", { payload: { action: "set_plan", userId, plan } });
  return NextResponse.json({ ok: true, plan });
}

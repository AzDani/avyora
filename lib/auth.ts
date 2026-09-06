import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { journaliser } from "@/lib/audit";

/**
 * Utilisateur authentifié courant (server components / route handlers), ou null.
 * Passe par la session cookie → RLS. À utiliser pour gater l'accès et scoper les données.
 */
export async function getUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Allow-list d'administrateurs (emails), configurée via ADMIN_EMAILS (séparés par des virgules).
 * Les tables globales (référentiel de prix, questionnaire) sont partagées entre tous les tenants :
 * seul un admin doit pouvoir les modifier. Sans ADMIN_EMAILS défini → personne n'est admin (fail-safe).
 */
export function estAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(user.email.toLowerCase());
}

export async function getAdmin() {
  const user = await getUser();
  return estAdmin(user) ? user : null;
}

/**
 * Statut Pro (abonné) — débloque l'estimateur détaillé, l'export PDF, la sauvegarde et le suivi.
 * Ordre : plan Stripe (`app_metadata.plan === 'pro'`, futur webhook) → allow-list PRO_EMAILS
 * (accès manuel en attendant Stripe) → admins Pro d'office. Sans rien → free (fail-safe).
 */
export function estPro(user: User | null): boolean {
  if (!user) return false;
  if (estAdmin(user)) return true;
  const plan = (user.app_metadata as { plan?: string } | undefined)?.plan;
  if (plan === "pro") return true;
  const allow = (process.env.PRO_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!user.email && allow.includes(user.email.toLowerCase());
}

/**
 * Garde pour les route handlers admin : renvoie une réponse 401/403 à retourner tel quel,
 * ou null si l'appelant est bien administrateur. Génériques (pas de fuite d'info).
 */
export async function gardeAdmin(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estAdmin(user)) {
    await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin" } });
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return null;
}

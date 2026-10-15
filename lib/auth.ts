import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { journaliser } from "@/lib/audit";
import { betaActive } from "@/lib/beta";

/**
 * Utilisateur authentifié courant (server components / route handlers), ou null.
 * Passe par la session cookie → RLS. À utiliser pour gater l'accès et scoper les données.
 *
 * Enveloppé dans cache() de React : la coque appelle getUser() deux fois (AuthNav pour la nav
 * desktop, MobileNav pour la nav mobile), et chaque page protégée l'appelle encore. Sans
 * mémoïsation, un même rendu payait plusieurs allers-retours vers l'auth Supabase, en série
 * avant l'envoi du HTML. cache() déduplique à l'échelle d'UNE requête — aucun partage entre
 * utilisateurs, donc aucun risque de fuite de session.
 */
export const getUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

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
 * Abonné (payant ou accès manuel) : le statut Pro d'avant la bêta, qui reste après elle.
 * Ordre : plan Stripe (`app_metadata.plan === 'pro'`, posé par le webhook) → allow-list PRO_EMAILS
 * (accès manuel) → admins Pro d'office. Sans rien → free (fail-safe). Sert aussi à reconnaître, pendant
 * la bêta, celui qui a un abonnement à gérer (Mon compte, Tarifs).
 */
export function estAbonne(user: User | null): boolean {
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
 * Droits Pro — l'estimateur détaillé, l'export PDF, la sauvegarde illimitée, le suivi, les plans sans
 * limite. Un abonné les a toujours ; PENDANT LA BÊTA (lib/beta.ts, jusqu'à la fin du 31/12/2026 heure de
 * Paris), tout utilisateur connecté les a aussi : un compte n'existe qu'une fois son e-mail confirmé
 * (confirmation obligatoire côté Supabase), c'est donc l'adresse qu'on voulait. Après la bêta, sans
 * redéploiement, on retombe sur `estAbonne` : exactement le comportement d'avant. Anonyme → jamais Pro.
 */
export function estPro(user: User | null, maintenant: Date = new Date()): boolean {
  if (!user) return false;
  return estAbonne(user) || betaActive(maintenant);
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

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

/** État renvoyé aux formulaires (useActionState). */
export type AuthState = { error?: string; message?: string } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

function cleanEmail(v: FormDataEntryValue | null) {
  return String(v ?? "").trim().toLowerCase();
}

// ── Connexion ──
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/mon-espace");
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message === "Invalid login credentials"
      ? "Email ou mot de passe incorrect."
      : error.message };
  }
  redirect(next.startsWith("/") ? next : "/mon-espace");
}

// ── Inscription ──
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom }, emailRedirectTo: `${await origin()}/auth/callback?next=/mon-espace` },
  });
  if (error) return { error: error.message };

  // Selon la config Supabase : si la confirmation email est requise, pas de session tout de suite.
  if (data.session) redirect("/mon-espace");
  return { message: "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi." };
}

// ── Demande de réinitialisation (envoie l'email) ──
export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  if (!email) return { error: "Renseigne ton email." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset/definir`,
  });
  if (error) return { error: error.message };
  return { message: "Si un compte existe pour cet email, tu recevras un lien pour définir ton mot de passe." };
}

// ── Définition du nouveau mot de passe (après clic sur le lien de l'email) ──
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message.includes("session")
      ? "Lien expiré ou invalide. Redemande un email de réinitialisation."
      : error.message };
  }
  redirect("/mon-espace");
}

// ── Déconnexion ──
export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}

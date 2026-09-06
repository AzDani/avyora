"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { validerMotDePasse } from "@/lib/password";
import { journaliser } from "@/lib/audit";

/** État renvoyé aux formulaires (useActionState). */
export type AuthState = { error?: string; message?: string } | undefined;

const TROP_DE_TENTATIVES = "Trop de tentatives. Patiente une minute avant de réessayer.";

/** Anti-brute-force : limite les actions d'auth par IP. true si autorisé. */
async function limiteAuthOk(): Promise<boolean> {
  return verifierLimite("auth", await clientIp());
}

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
  const next = String(formData.get("next") ?? "/projets");
  const remember = String(formData.get("remember") ?? "") === "on"; // case cochée par défaut
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  if (!(await limiteAuthOk())) return { error: TROP_DE_TENTATIVES };

  const supabase = await supabaseServer({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await journaliser("connexion_echouee", { email });
    return { error: error.message === "Invalid login credentials"
      ? "Email ou mot de passe incorrect."
      : error.message };
  }
  // Mémorise la préférence pour que le middleware garde la même politique de cookies au refresh.
  const cookieStore = await cookies();
  if (remember) cookieStore.delete("av-remember");
  else cookieStore.set("av-remember", "0", { path: "/", httpOnly: true, sameSite: "lax" }); // cookie de session

  await journaliser("connexion_reussie", { userId: data.user?.id, email });
  redirect(cheminInterneSur(next));
}

/**
 * Anti open-redirect : n'accepte qu'un chemin interne (commence par « / » mais pas « // » ni « /\ »,
 * qui seraient interprétés comme une URL absolue vers un domaine externe). Sinon → /projets.
 */
function cheminInterneSur(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/projets";
}

// ── Inscription ──
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  if (!(await limiteAuthOk())) return { error: TROP_DE_TENTATIVES };
  const faible = validerMotDePasse(password);
  if (faible) return { error: faible };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom }, emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };

  await journaliser("inscription", { userId: data.user?.id, email });
  // Selon la config Supabase : si la confirmation email est requise, pas de session tout de suite.
  if (data.session) redirect("/onboarding");
  return { message: "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi." };
}

// ── Demande de réinitialisation (envoie l'email) ──
export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  if (!email) return { error: "Renseigne ton email." };
  if (!(await limiteAuthOk())) return { error: TROP_DE_TENTATIVES };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset/definir`,
  });
  if (error) return { error: error.message };
  await journaliser("reset_demande", { email });
  return { message: "Si un compte existe pour cet email, tu recevras un lien pour définir ton mot de passe." };
}

// ── Définition du nouveau mot de passe (après clic sur le lien de l'email) ──
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const faible = validerMotDePasse(password);
  if (faible) return { error: faible };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message.includes("session")
      ? "Lien expiré ou invalide. Redemande un email de réinitialisation."
      : error.message };
  }
  await journaliser("mot_de_passe_change", { userId: data.user?.id, email: data.user?.email });
  redirect("/projets");
}

// ── Déconnexion ──
export async function logout() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  await journaliser("deconnexion", { userId: data.user?.id, email: data.user?.email });
  await supabase.auth.signOut();
  redirect("/");
}

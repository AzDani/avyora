"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { validerMotDePasse } from "@/lib/password";
import { journaliser } from "@/lib/audit";
import { cheminInterne } from "@/lib/next-url";
import { suivreServeur } from "@/lib/track-server";
import { destinationLien, emailValide, issueEnvoi, lirePageAcces, metadonneesInscription } from "@/lib/auth-lien";

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
  redirect(cheminInterne(next));
}

// ── Inscription ──
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const newsletter = String(formData.get("newsletter") ?? "") === "on"; // case facultative, non cochée par défaut
  // Où l'on envoie l'inscrit. Par défaut /onboarding : les six questions de profil, avec un
  // bouton « Passer ». Mais quand l'inscription vient d'une INTENTION D'ACHAT (le visiteur a
  // cliqué un plan sur /tarifs, donc `next=/tarifs?plan=…`), on ne lui inflige pas un
  // questionnaire entre son oui et l'écran de paiement : on l'emmène là où il allait.
  const dest = cheminInterne(String(formData.get("next") ?? ""), "/onboarding");
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  if (!(await limiteAuthOk())) return { error: TROP_DE_TENTATIVES };
  const faible = validerMotDePasse(password);
  if (faible) return { error: faible };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Le lien de confirmation doit ramener le visiteur À SON INTENTION, pas au questionnaire :
    // /auth/callback échange le code puis redirige sur ce `next` (app/auth/callback/route.ts:11).
    // L'acceptation des CGU (case obligatoire du formulaire) et le consentement aux nouveautés, datés (B2).
    options: {
      data: { nom, ...metadonneesInscription({ methode: "mot_de_passe", newsletter }) },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(dest)}`,
    },
  });
  if (error) return { error: error.message };

  await journaliser("inscription", { userId: data.user?.id, email });
  // `compte_cree` part d'ICI, là où le fait est établi, et non d'une page d'atterrissage.
  // `confirme` distingue les deux issues ci-dessous : compte utilisable tout de suite, ou
  // compte en attente d'un clic dans un email — c'est-à-dire un visiteur qui quitte le site.
  await suivreServeur("compte_cree", { confirme: !!data.session, destination: dest, methode: "mot_de_passe" });
  // Selon la config Supabase : si la confirmation email est requise, pas de session tout de suite.
  if (data.session) redirect(dest);
  // La confirmation d'email étant active, cet écran est la pièce maîtresse du parcours d'achat :
  // c'est le seul moment où le visiteur doit quitter le site. Le lien de l'email OUVRE la session
  // et le ramène à `dest` (cf. emailRedirectTo ci-dessus) — lui dire « puis connecte-toi »
  // l'envoyait faire une étape dont il n'a pas besoin, juste avant de payer.
  const suite = dest.startsWith("/tarifs")
    ? "Le lien te ramènera directement à ton abonnement."
    : "Le lien te connectera directement.";
  return { message: `Compte créé ! Ouvre ta boîte mail pour confirmer ton adresse. ${suite}` };
}

// ── Lien d'accès : inscription et connexion sans mot de passe (B2) ──

/**
 * Ce que le formulaire « Recevoir mon lien d'accès » reçoit : l'adresse à rappeler sur l'écran « C'est envoyé »,
 * ou un code d'erreur qu'il traduit (FR / EN). `renvoi` : la demande venait du bouton « Renvoyer ».
 */
export type LienState =
  | { envoye: true; email: string; renvoi: boolean }
  | { erreur: "email" | "limite" | "envoi" }
  | undefined;

/**
 * Envoie le lien d'accès (Supabase `signInWithOtp`). Une adresse inconnue reçoit un lien qui CRÉE le compte
 * (`shouldCreateUser`) ; une adresse connue, un lien de connexion : le clic confirme l'adresse et ouvre la session,
 * puis /auth/callback ramène à l'intention (`next`, assaini). La réponse est la même que l'adresse ait un compte
 * ou non (pas d'énumération). Limites : catégorie `auth`, par IP et par adresse. Les métadonnées (CGU datées,
 * nouveautés) ne s'écrivent qu'à la création du compte.
 */
export async function envoyerLienAcces(_prev: LienState, formData: FormData): Promise<LienState> {
  const email = cleanEmail(formData.get("email"));
  const page = lirePageAcces(formData.get("page"));
  const dest = destinationLien(String(formData.get("next") ?? ""), page);
  // La case des nouveautés n'existe que sur /inscription ; une connexion ne consent à rien.
  const newsletter = page === "inscription" && String(formData.get("newsletter") ?? "") === "on";
  const renvoi = String(formData.get("renvoi") ?? "") === "1";
  if (!emailValide(email)) return { erreur: "email" };
  // Deux compteurs : l'IP (un robot qui essaie mille adresses) et l'adresse (une boîte bombardée depuis mille IP).
  if (!(await limiteAuthOk()) || !(await verifierLimite("auth", `lien:${email}`))) return { erreur: "limite" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(dest)}`,
      data: metadonneesInscription({ methode: "lien", newsletter }),
    },
  });
  const issue = issueEnvoi(error);
  await journaliser("lien_acces_demande", { email, payload: { page, issue, ...(error?.code ? { code: error.code } : {}) } });
  if (issue !== "envoye") return { erreur: issue };
  return { envoye: true, email, renvoi };
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

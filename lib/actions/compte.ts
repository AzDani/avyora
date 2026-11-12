"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { getStripe, resilierAbonnementsUtilisateur } from "@/lib/stripe";
import { getLocale } from "@/lib/i18n/server";

export type CompteState = { error?: string } | undefined;

/** Messages renvoyés à l'écran, dans la langue de l'interface (ils s'affichaient en français en anglais). */
const TR = {
  fr: {
    confirmation: "Tape SUPPRIMER (en majuscules) pour confirmer la suppression définitive.",
    abonnement: "Ton abonnement n'a pas pu être résilié, donc ton compte n'a pas été supprimé (pour ne pas te laisser prélevé sans compte). Réessaie dans un instant ou contacte le support.",
    echec: "La suppression a échoué. Réessaie ou contacte le support.",
  },
  en: {
    confirmation: "Type SUPPRIMER (in capitals) to confirm permanent deletion.",
    abonnement: "Your subscription couldn't be canceled, so your account was not deleted (so you aren't left being charged without an account). Try again shortly or contact support.",
    echec: "Deletion failed. Try again or contact support.",
  },
} as const;

/**
 * Suppression RGPD du compte : résilie d'abord tout abonnement Stripe encore actif (sinon l'abonné
 * continuait d'être prélevé pour un compte qui n'existe plus), puis supprime l'utilisateur (auth.users)
 * → CASCADE FK sur profiles, projects (+ enfants), artisans, etc. Irréversible → exige la confirmation
 * « SUPPRIMER ». Si la résiliation échoue, rien n'est supprimé et un message le dit.
 */
export async function supprimerCompte(_prev: CompteState, formData: FormData): Promise<CompteState> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const t = TR[await getLocale()] ?? TR.fr;
  if (String(formData.get("confirmation") ?? "").trim() !== "SUPPRIMER") {
    return { error: t.confirmation };
  }

  let abonnementsResilies: string[] = [];
  try {
    const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;
    abonnementsResilies = await resilierAbonnementsUtilisateur(stripe, user);
  } catch (e) {
    console.error("Résiliation Stripe avant suppression du compte échouée :", e);
    return { error: t.abonnement };
  }

  await journaliser("compte_supprime", { userId: user.id, email: user.email, payload: { abonnementsResilies } });

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id); // cascade sur toutes les données
  if (error) return { error: t.echec };

  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/?compte=supprime");
}

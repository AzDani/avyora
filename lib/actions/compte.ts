"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";

export type CompteState = { error?: string } | undefined;

/**
 * Suppression RGPD du compte : supprime l'utilisateur (auth.users) → CASCADE FK sur profiles,
 * projects (+ enfants), artisans, etc. Irréversible → exige la confirmation « SUPPRIMER ».
 */
export async function supprimerCompte(_prev: CompteState, formData: FormData): Promise<CompteState> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  if (String(formData.get("confirmation") ?? "").trim() !== "SUPPRIMER") {
    return { error: "Tape SUPPRIMER (en majuscules) pour confirmer la suppression définitive." };
  }

  await journaliser("compte_supprime", { userId: user.id, email: user.email });

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id); // cascade sur toutes les données
  if (error) return { error: "La suppression a échoué. Réessaie ou contacte le support." };

  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/?compte=supprime");
}

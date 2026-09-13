"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type UsernameResult =
  | { ok: true; username: string }
  | { ok: false; error: "format" | "pris" | "auth" | "serveur" };

// 3 à 20 caractères : lettres, chiffres, point, tiret, underscore.
const RE = /^[a-zA-Z0-9_.-]{3,20}$/;

/**
 * Définit le pseudo public de l'utilisateur (user_metadata.username).
 * Unicité insensible à la casse, vérifiée via le client service-role (aucun doublon possible).
 */
export async function definirUsername(input: string): Promise<UsernameResult> {
  const username = (input ?? "").trim();
  if (!RE.test(username)) return { ok: false, error: "format" };

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, error: "auth" };

  // Unicité : personne d'autre ne doit avoir ce pseudo (comparaison en minuscules).
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return { ok: false, error: "serveur" };
  const lc = username.toLowerCase();
  const pris = data.users.some(
    (u) =>
      u.id !== user.id &&
      String((u.user_metadata as { username?: string } | undefined)?.username ?? "").toLowerCase() === lc,
  );
  if (pris) return { ok: false, error: "pris" };

  const { error: upErr } = await sb.auth.updateUser({ data: { username } });
  if (upErr) return { ok: false, error: "serveur" };
  return { ok: true, username };
}

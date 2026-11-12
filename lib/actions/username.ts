"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifierLimite } from "@/lib/ratelimit";
import { pseudoPris } from "@/lib/pseudo";

export type UsernameResult =
  | { ok: true; username: string }
  | { ok: false; error: "format" | "pris" | "auth" | "serveur" | "limite" };

// 3 à 20 caractères : lettres, chiffres, point, tiret, underscore.
const RE = /^[a-zA-Z0-9_.-]{3,20}$/;

/**
 * Définit le pseudo public de l'utilisateur (user_metadata.username).
 * Unicité insensible à la casse, vérifiée via le client service-role sur tous les comptes. Limite de débit par
 * compte : chaque appel parcourt la liste des inscrits. Reste possible (rare) : deux comptes qui prennent le même
 * pseudo à la même seconde ; seule une colonne unique en base (profiles.username) l'empêcherait.
 */
export async function definirUsername(input: string): Promise<UsernameResult> {
  const username = (input ?? "").trim();
  if (!RE.test(username)) return { ok: false, error: "format" };

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, error: "auth" };
  if (!(await verifierLimite("auth", `pseudo:${user.id}`))) return { ok: false, error: "limite" };

  // Unicité : personne d'autre ne doit avoir ce pseudo (comparaison en minuscules).
  const pris = await pseudoPris(supabaseAdmin(), user.id, username.toLowerCase());
  if (pris === null) return { ok: false, error: "serveur" };
  if (pris) return { ok: false, error: "pris" };

  const { error: upErr } = await sb.auth.updateUser({ data: { username } });
  if (upErr) return { ok: false, error: "serveur" };
  return { ok: true, username };
}

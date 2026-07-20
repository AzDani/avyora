import { supabaseServer } from "@/lib/supabase/server";

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

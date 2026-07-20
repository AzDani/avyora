import { createClient } from "@supabase/supabase-js";

/**
 * Client SERVICE ROLE — bypasse la RLS. SERVEUR uniquement (migration de données, tâches admin).
 * NE JAMAIS exposer la clé service_role au navigateur.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

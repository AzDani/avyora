import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase côté SERVEUR (server components, route handlers). Lié à la session de
 * l'utilisateur via les cookies → les requêtes passent par la RLS (tenancy imposée).
 */
/** Retire la persistance d'un cookie → cookie de session (effacé à la fermeture du navigateur). */
export function versCookieSession<T extends { maxAge?: number; expires?: unknown }>(options: T): T {
  const o = { ...options };
  delete o.maxAge;
  delete o.expires;
  return o;
}

/**
 * `remember` (défaut true) : si false, les cookies d'auth deviennent des cookies de session
 * (« Rester connecté » décoché → déconnexion à la fermeture du navigateur).
 */
export async function supabaseServer(opts?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const remember = opts?.remember ?? true;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, remember ? options : versCookieSession(options))
            );
          } catch {
            // appelé depuis un server component (lecture seule) : ignoré, le middleware rafraîchit la session
          }
        },
      },
    }
  );
}

import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase côté NAVIGATEUR (composants client : connexion, inscription, realtime…). */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

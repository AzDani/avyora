import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Callback des liens email (confirmation d'inscription, réinitialisation de mot de passe).
 * Supabase renvoie ?code=… → on l'échange contre une session (cookies), puis on redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projets";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/projets"}`);
    }
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
}

import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cheminInterne } from "@/lib/next-url";
import { noterArrivee } from "@/lib/auth-arrivee";

/**
 * Callback des liens email (lien d'accès, confirmation d'inscription, réinitialisation de mot de passe) et de
 * Google. Supabase renvoie ?code=… → on l'échange contre une session (cookies), puis on redirige vers `next`,
 * l'intention (chemin interne seulement).
 *
 * Flux PKCE : la clé de l'échange est un cookie posé par le navigateur qui a DEMANDÉ le lien. Ouvert dans un
 * autre navigateur, ou une deuxième fois, le lien échoue : /connexion dit pourquoi (`erreur=lien_invalide`) et
 * garde l'intention, pour qu'un nouveau lien y ramène.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = cheminInterne(searchParams.get("next") ?? undefined);

  if (code) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await noterArrivee(supabase, data.user, next);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  const retour = new URLSearchParams({ erreur: "lien_invalide" });
  if (next !== "/projets") retour.set("next", next);
  return NextResponse.redirect(`${origin}/connexion?${retour}`);
}

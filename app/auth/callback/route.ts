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
 * autre navigateur, ou une deuxième fois, le lien échoue ; pour une adresse NOUVELLE, il échoue aussi plus de
 * 5 minutes après la demande (l'état PKCE d'une inscription expire au bout de 300 s chez Supabase, quel que soit le
 * réglage de validité du lien). /connexion dit pourquoi (`erreur=lien_invalide`) et garde l'intention, pour qu'un
 * nouveau lien y ramène. Les modèles d'e-mail au format token_hash (/auth/confirm, docs/beta.md §6) n'ont aucune de
 * ces limites : ils ne passent plus par ici, sauf Google.
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

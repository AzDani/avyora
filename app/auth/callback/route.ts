import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { cheminInterne } from "@/lib/next-url";
import { controlerArrivee, noterArrivee } from "@/lib/auth-arrivee";
import { COOKIE_DEMANDE, COOKIE_VERIFIER, trouverDemande } from "@/lib/auth-lien";
import { empreinteAdresse } from "@/lib/empreinte";

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
 *
 * L'arrivée est contrôlée (`controlerArrivee` : le mot de passe à la confirmation de l'adresse, les nouveautés cochées
 * dans ce navigateur). Pas de vérification « ce navigateur a-t-il demandé ce lien ? » ici : le flux PKCE l'impose déjà
 * (la clé de l'échange ne vit que dans le navigateur qui a demandé le lien, ou lancé Google) ; un lien relayé par un
 * tiers échoue. Une arrivée « à vérifier » d'avant ne concerne donc plus ce navigateur.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = cheminInterne(searchParams.get("next") ?? undefined);

  if (code) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = await cookies();
      const email = data.user?.email;
      await controlerArrivee(supabase, data.user, email ? trouverDemande(cookieStore.get(COOKIE_DEMANDE)?.value, empreinteAdresse(email)) : null);
      await noterArrivee(supabase, data.user, next);
      cookieStore.set(COOKIE_VERIFIER, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  const retour = new URLSearchParams({ erreur: "lien_invalide" });
  if (next !== "/projets") retour.set("next", next);
  return NextResponse.redirect(`${origin}/connexion?${retour}`);
}

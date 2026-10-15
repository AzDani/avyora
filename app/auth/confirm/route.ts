import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_LIEN, DUREE_COOKIE_LIEN_S, ecrireLienEnAttente, intentionDuLien, jetonValide, lireTypeLien } from "@/lib/auth-lien";

/**
 * Les liens e-mail au format token_hash (modèles de Supabase, docs/beta.md §6) :
 * `/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.
 *
 * Cette route NE CONSOMME PAS le jeton : les messageries qui ouvrent les liens pour les vérifier (Outlook, antivirus
 * d'entreprise) le brûleraient avant la personne. Elle range le lien dans un cookie httpOnly et renvoie vers
 * /auth/confirmer, une adresse sans le jeton, où le bouton « Entrer dans AVYORA » appelle `verifyOtp`. Pas de flux
 * PKCE ici : le lien marche sur n'importe quel appareil, pendant la durée réglée dans Supabase.
 *
 * `next` est l'`emailRedirectTo` de l'envoi (une URL absolue du site, souvent /auth/callback?next=<intention>) ou un
 * chemin interne : `intentionDuLien` en tire l'intention, assainie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const jeton = searchParams.get("token_hash");
  const type = lireTypeLien(searchParams.get("type"));
  // Nos origines : celle de la requête et l'adresse publique du site (les liens des e-mails la portent).
  const origines = [origin, process.env.NEXT_PUBLIC_SITE_URL].flatMap((o) => {
    try {
      return o ? [new URL(o).origin] : [];
    } catch {
      return [];
    }
  });
  const next = intentionDuLien(searchParams.get("next"), origines);

  if (!jetonValide(jeton) || !type) {
    const retour = new URLSearchParams({ erreur: "lien_invalide" });
    if (next !== "/projets") retour.set("next", next);
    return NextResponse.redirect(`${origin}/connexion?${retour}`, 303);
  }
  const res = NextResponse.redirect(`${origin}/auth/confirmer`, 303);
  res.cookies.set(COOKIE_LIEN, ecrireLienEnAttente({ jeton, type, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/auth",
    maxAge: DUREE_COOKIE_LIEN_S,
  });
  return res;
}

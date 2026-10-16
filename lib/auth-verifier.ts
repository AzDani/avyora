/**
 * Une arrivée « à vérifier » (lien ouvert dans un navigateur qui ne l'avait pas demandé, ou par-dessus une autre
 * session) : un cookie httpOnly (`av-verifier`) que le proxy lit. Tant qu'il est là, toute page mène à /auth/verifier,
 * qui montre l'adresse du compte ouvert : « Oui, c'est mon compte » ou « Ce n'est pas moi ». Rien n'est rangé dans le
 * compte (estimation, plan de ce navigateur) avant ce choix, et toute écriture /api y est refusée (un onglet resté
 * ouvert, l'éditeur de plan, n'enregistre rien dans ce compte).
 *
 * La marque vit AUSSI LONGTEMPS QUE LA SESSION qu'elle garde : un choix laissé en suspens (onglet fermé sans répondre)
 * ne doit pas laisser, une heure plus tard, ClaimDraft ranger l'estimation de ce navigateur dans le compte d'un autre.
 * Elle dure donc autant que les cookies de session de @supabase/ssr (400 jours, `DEFAULT_COOKIE_OPTIONS.maxAge`), et le
 * proxy la renouvelle à chaque page qu'il ramène à la vérification. Elle porte l'identifiant du compte ouvert : elle ne
 * vaut que pour CETTE session (une autre session ouverte ensuite dans ce navigateur ne la voit pas). Effacée seulement
 * par « Oui, c'est mon compte », « Ce n'est pas moi », une connexion (mot de passe, lien attendu, retour PKCE ou
 * Google), une inscription qui ouvre la session, une déconnexion.
 *
 * Module à part, sans dépendance : le proxy (proxy.ts) l'importe sans tirer le reste de lib/auth-lien.ts.
 */
export const COOKIE_VERIFIER = "av-verifier";
/** 400 jours : la durée des cookies de session de @supabase/ssr. */
export const DUREE_VERIFIER_S = 400 * 24 * 3600;

/** La marque vaut-elle pour la session ouverte (`userId`) ? */
export function verificationEnAttente(marque: string | null | undefined, userId: string | null | undefined): boolean {
  return !!marque && !!userId && marque === userId;
}

/** Les options du cookie de la marque. */
export function optionsMarque(secure: boolean) {
  return { path: "/", maxAge: DUREE_VERIFIER_S, httpOnly: true, sameSite: "lax" as const, secure };
}

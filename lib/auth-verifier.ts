/**
 * Une arrivée « à vérifier » (lien ouvert dans un navigateur qui ne l'avait pas demandé, ou par-dessus une autre
 * session) : un cookie httpOnly (`av-verifier`, 1 h) que le proxy lit. Tant qu'il est là, toute page mène à
 * /auth/verifier, qui montre l'adresse du compte ouvert : « Continuer » ou « Ce n'est pas moi ». Rien n'est rangé
 * dans le compte (estimation, plan de ce navigateur) avant ce choix.
 *
 * Module à part, sans dépendance : le proxy (proxy.ts) l'importe sans tirer le reste de lib/auth-lien.ts.
 */
export const COOKIE_VERIFIER = "av-verifier";
export const DUREE_VERIFIER_S = 3600;

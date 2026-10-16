import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { journaliser } from "@/lib/audit";
import { suivreServeur } from "@/lib/track-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  MARQUE_COMPTE_CREE, MARQUE_MDP, MARQUE_MDP_EMAIL, consentementNouveautes, controleMdpAFaire, metadonneesEffacees, metadonneesInscription,
  methodeNouveauCompte, type Demande,
} from "@/lib/auth-lien";

/**
 * Au retour d'un lien e-mail ou de Google (/auth/callback, le bouton de /auth/confirmer), la session vient d'être
 * ouverte : si le compte vient de naître (`methodeNouveauCompte`), c'est ici que la création est établie. `compte_cree`
 * part donc d'ici pour le lien et pour Google (l'inscription au mot de passe le mesure dans son action), avec l'entrée
 * « inscription » du journal de sécurité, UNE fois : la marque `compte_cree_le` est posée dans `user_metadata` (un
 * deuxième lien demandé dans la foulée ne compte pas un second compte). Un compte Google n'a pas pu passer de
 * métadonnées à sa création : l'acceptation des CGU (mention « En continuant… » sous le bouton) est datée ici.
 *
 * Best-effort : rien ici ne doit empêcher la redirection vers l'intention.
 */
export async function noterArrivee(supabase: SupabaseClient, user: User | null | undefined, destination: string): Promise<void> {
  try {
    const methode = methodeNouveauCompte(user);
    if (!user || !methode) return;
    const le = new Date().toISOString();
    const cgu = methode === "google" && !user.user_metadata?.cgu_acceptees_le ? metadonneesInscription({ methode: "google" }) : {};
    await supabase.auth.updateUser({ data: { ...cgu, [MARQUE_COMPTE_CREE]: le } });
    await journaliser("inscription", { userId: user.id, email: user.email, payload: { methode } });
    await suivreServeur("compte_cree", { confirme: true, destination, methode });
  } catch {
    /* mesure ou métadonnées indisponibles : la session est ouverte, on n'interrompt pas le retour */
  }
}

/**
 * Un mot de passe que personne ne connaît : 32 octets aléatoires, plus de quoi satisfaire toute règle de complexité
 * réglée dans Supabase (minuscule, majuscule, chiffre, symbole), 48 caractères (bcrypt en lit 72).
 */
export function motDePasseAleatoire(): string {
  return `${randomBytes(32).toString("base64url")}-Aa1!`;
}

/**
 * Le contrôle de l'arrivée, juste après l'ouverture de la session par un lien (ou Google), AVANT `noterArrivee` :
 *
 * 1. Le mot de passe (`controleMdpAFaire`, lib/auth-lien.ts).
 *    - À la CONFIRMATION de l'adresse (prise de compte préparée à l'avance) : un tiers peut inscrire l'adresse de
 *      quelqu'un d'autre avec SON mot de passe ; le compte reste non confirmé, et Supabase ne modifie pas un compte non
 *      confirmé quand la vraie personne s'inscrit à son tour ; le clic sur son lien confirme le compte SANS toucher au
 *      mot de passe du tiers, qui entrerait ensuite avec. Donc, à la première arrivée qui suit la confirmation (dans
 *      l'heure), si ce navigateur n'a pas choisi le mot de passe lui-même (demande `mdp` dans `av-demande`), il est
 *      remplacé par un aléa et les autres sessions sont fermées. Prix à payer : un inscrit au mot de passe qui confirme
 *      sur un AUTRE appareil passe ensuite par le lien de connexion ou « mot de passe oublié ».
 *    - À un CHANGEMENT d'adresse (un compte passé à l'adresse d'un autre) : toujours remplacé, autres sessions fermées.
 *    Quand le mot de passe est remplacé, ce qu'un tiers a pu écrire d'avance dans `user_metadata` (nom affiché, pseudo,
 *    profil) est effacé aussi, et, au changement d'adresse, le consentement aux nouveautés donné pour l'ANCIENNE adresse
 *    (`app_metadata`). Puis la marque (`app_metadata`, que seul le serveur écrit) : l'heure du contrôle et l'adresse
 *    contrôlée. Un compte qui n'a rien à contrôler mais pas encore d'adresse retenue la reçoit, sans rien toucher
 *    d'autre (`noter`).
 * 2. Les nouveautés : la case cochée n'est enregistrée qu'ici, à l'arrivée confirmée dans le navigateur qui l'a cochée
 *    (`n` dans `av-demande`), datée du moment où elle l'a été, dans `app_metadata` (`consentementNouveautes`) : ni le
 *    formulaire ni un appel direct à Supabase ne peuvent abonner l'adresse d'un autre.
 *
 * Best-effort, comme `noterArrivee` : un échec ne bloque pas l'arrivée ; sans la marque, le contrôle est refait à
 * l'arrivée suivante (dans l'heure, ou tant que l'adresse diffère de l'adresse contrôlée).
 */
export async function controlerArrivee(
  supabase: SupabaseClient,
  user: User | null | undefined,
  demande: Demande | null,
  maintenant: number = Date.now(),
): Promise<void> {
  if (!user) return;
  let abonne = user.app_metadata?.newsletter === true;
  try {
    const controle = controleMdpAFaire(user, maintenant);
    if (controle) {
      const garder = controle === "noter" || (controle === "confirmation" && demande?.m === "mdp");
      if (!garder) {
        const { error } = await supabase.auth.updateUser({ password: motDePasseAleatoire() });
        if (error) throw error;
        await supabase.auth.signOut({ scope: "others" });
        await journaliser("mot_de_passe_neutralise", { userId: user.id, ...(controle === "changement" ? { payload: { raison: "changement_adresse" } } : {}) });
      }
      const marque = controle === "noter" && user.app_metadata?.[MARQUE_MDP] ? {} : { [MARQUE_MDP]: new Date(maintenant).toISOString() };
      // Au changement d'adresse, le consentement donné pour l'ancienne ne vaut pas pour la nouvelle (`null` retire la clé).
      const ancienConsentement = controle === "changement" ? { newsletter: null, newsletter_le: null } : {};
      const { error } = await supabaseAdmin().auth.admin.updateUserById(user.id, {
        app_metadata: { ...marque, [MARQUE_MDP_EMAIL]: (user.email ?? "").trim().toLowerCase(), ...ancienConsentement },
        ...(garder ? {} : { user_metadata: metadonneesEffacees() }),
      });
      if (error) throw error;
      if (controle === "changement") abonne = false;
    }
  } catch {
    /* contrôle refait à la prochaine arrivée (pas de marque) */
  }
  try {
    if (demande?.n && !abonne) {
      const { error } = await supabaseAdmin().auth.admin.updateUserById(user.id, {
        app_metadata: consentementNouveautes(new Date(demande.t * 1000)),
      });
      if (error) throw error;
    }
  } catch {
    /* consentement non enregistré : la case reste à cocher plus tard */
  }
}

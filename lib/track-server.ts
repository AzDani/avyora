import "server-only";
import { track } from "@vercel/analytics/server";
import { headers } from "next/headers";
import type { EvenementAvyora } from "./track";

/**
 * Émet un événement de funnel depuis le SERVEUR (action serveur, route handler).
 *
 * POURQUOI un pendant serveur. `compte_cree` était émis par une page d'atterrissage
 * (/onboarding). C'est une approximation : l'événement ne partait que si le nouvel inscrit
 * atteignait cette page. Or il ne l'atteint pas quand son email doit être confirmé — il n'a
 * alors même pas de session — et le parcours d'achat ne la traverse plus du tout, puisqu'on
 * n'inflige pas six questions de profil à quelqu'un qui vient de cliquer « je m'abonne ».
 * La création du compte n'est connue avec certitude qu'à un seul endroit : l'action qui la
 * fait. L'événement part donc de là.
 *
 * Silencieux par construction : hors Vercel (dev), le SDK journalise et n'envoie rien ; toute
 * erreur est avalée. Une mesure ne doit jamais faire échouer une inscription.
 */
export async function suivreServeur(
  nom: EvenementAvyora,
  props?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    // On passe les en-têtes explicitement : le SDK sait les retrouver seul via le contexte de
    // requête Vercel, mais il lève « No session context found » quand il ne les trouve pas,
    // et c'est précisément par les cookies + user-agent que l'événement est rattaché à la
    // session du visiteur. Sans eux, il serait compté comme un visiteur distinct.
    await track(nom, props, { headers: await headers() });
  } catch {
    /* mesure indisponible : on n'interrompt pas le parcours pour ça */
  }
}

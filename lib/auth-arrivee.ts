import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { journaliser } from "@/lib/audit";
import { suivreServeur } from "@/lib/track-server";
import { metadonneesInscription, methodeNouveauCompte } from "@/lib/auth-lien";

/**
 * Au retour d'un lien e-mail ou de Google (/auth/callback, /auth/confirm), la session vient d'être ouverte : si le
 * compte vient de naître (`methodeNouveauCompte`), c'est ici que la création est établie. `compte_cree` part donc
 * d'ici pour le lien et pour Google (l'inscription au mot de passe le mesure dans son action), avec l'entrée
 * « inscription » du journal de sécurité. Un compte Google n'a pas pu passer de métadonnées à sa création :
 * l'acceptation des CGU (mention « En continuant… » sous le bouton) est datée ici.
 *
 * Best-effort : rien ici ne doit empêcher la redirection vers l'intention.
 */
export async function noterArrivee(supabase: SupabaseClient, user: User | null | undefined, destination: string): Promise<void> {
  try {
    const methode = methodeNouveauCompte(user);
    if (!user || !methode) return;
    if (methode === "google" && !user.user_metadata?.cgu_acceptees_le) {
      await supabase.auth.updateUser({ data: metadonneesInscription({ methode: "google", newsletter: false }) });
    }
    await journaliser("inscription", { userId: user.id, email: user.email, payload: { methode } });
    await suivreServeur("compte_cree", { confirme: true, destination, methode });
  } catch {
    /* mesure ou métadonnées indisponibles : la session est ouverte, on n'interrompt pas le retour */
  }
}

import { getUser, estAdmin, estPro } from "@/lib/auth";
import { etatArtisanEntete } from "@/lib/data/reseau";
import { estComptePro } from "@/lib/compte/type";
import MobileMenu from "./MobileMenu";

/** Wrapper serveur : récupère l'utilisateur et passe l'état d'auth au menu mobile (client). */
export async function MobileNav() {
  const user = await getUser();
  const prenom = (user?.user_metadata?.nom as string) || user?.email?.split("@")[0] || undefined;
  const artisan = user ? await etatArtisanEntete(user.id, estComptePro(user)).catch(() => ({ artisan: false, aRepondre: 0 })) : { artisan: false, aRepondre: 0 };
  return <MobileMenu isLoggedIn={!!user} prenom={prenom} isAdmin={estAdmin(user)} isPro={estPro(user)} artisan={artisan.artisan ? { aRepondre: artisan.aRepondre } : undefined} />;
}

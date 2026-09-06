import { getUser } from "@/lib/auth";
import MobileMenu from "./MobileMenu";

/** Wrapper serveur : récupère l'utilisateur et passe l'état d'auth au menu mobile (client). */
export async function MobileNav() {
  const user = await getUser();
  const prenom = (user?.user_metadata?.nom as string) || user?.email?.split("@")[0] || undefined;
  return <MobileMenu isLoggedIn={!!user} prenom={prenom} />;
}

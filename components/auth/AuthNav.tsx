import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

/** Bloc de navigation lié à l'auth : Connexion (déconnecté) ou prénom + déconnexion (connecté). */
export async function AuthNav() {
  const user = await getUser();

  if (!user) {
    return (
      <Link
        href="/connexion"
        className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        Connexion
      </Link>
    );
  }

  const prenom = (user.user_metadata?.nom as string) || user.email?.split("@")[0] || "Mon compte";
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/mon-espace"
        className="hidden max-w-[10rem] truncate rounded-lg px-3 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white sm:inline-block"
        title="Mon espace"
      >
        {prenom}
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
          title="Se déconnecter"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}

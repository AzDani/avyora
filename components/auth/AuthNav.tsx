import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { getT } from "@/lib/i18n/server";

/** Bloc de navigation lié à l'auth : Connexion (déconnecté) ou prénom + déconnexion (connecté). */
export async function AuthNav() {
  const [user, { t }] = await Promise.all([getUser(), getT()]);

  if (!user) {
    return (
      <Link
        href="/connexion"
        className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        {t.nav.connexion}
      </Link>
    );
  }

  const prenom = (user.user_metadata?.nom as string) || user.email?.split("@")[0] || t.nav.monCompte;
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/mon-espace/compte"
        className="hidden max-w-[10rem] items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
        title={t.nav.monCompte}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 13.2a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="truncate">{prenom}</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
          title={t.nav.deconnexion}
        >
          {t.nav.deconnexion}
        </button>
      </form>
    </div>
  );
}

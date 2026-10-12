import Link from "next/link";
import { getUser, estAdmin, estPro } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { getT } from "@/lib/i18n/server";
import { FEATURES } from "@/lib/features";

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
  /* Éditeur de plan allumé (C9) : l'onglet « Plan 3D » prend de la place. Mesuré à 768 et 1 024 px : le prénom passe
     en icône seule sous xl, « Admin » et « Déconnexion » sous lg (leur nom reste dans aria-label et title). Éteint :
     le bloc d'avant, au caractère près. */
  const compact = FEATURES.plans;
  return (
    <div className="flex items-center gap-1">
      {/* Un inscrit non abonné n'avait aucun chemin vers le paiement depuis l'en-tête : /tarifs
          n'était qu'au pied de page. La bannière de /projets (components/ProUpsell.tsx) couvrait
          cette page-là, et elle seule — d'où ce lien, visible uniquement pour qui peut s'abonner. */}
      {!estPro(user) && (
        <Link
          href="/tarifs"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#C4B5FD] transition-colors hover:bg-white/10 hover:text-white"
        >
          {t.nav.passerPro}
        </Link>
      )}
      {estAdmin(user) && (
        <Link
          href="/admin"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[#C4B5FD] transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
          title="Espace admin"
          aria-label={compact ? "Admin" : undefined}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M8 1.6 13 3.5v4.2c0 3-2.1 5.4-5 6.7-2.9-1.3-5-3.7-5-6.7V3.5L8 1.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          {compact ? <span className="hidden lg:inline">Admin</span> : "Admin"}
        </Link>
      )}
      <Link
        href="/mon-espace/compte"
        className="hidden max-w-[10rem] items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
        title={t.nav.monCompte}
        aria-label={compact ? `${t.nav.monCompte} · ${prenom}` : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 13.2a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className={compact ? "hidden truncate xl:inline" : "truncate"}>{prenom}</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className={
            compact
              ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
              : "rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
          }
          title={t.nav.deconnexion}
          aria-label={compact ? t.nav.deconnexion : undefined}
        >
          {compact ? (
            <>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 lg:hidden">
                <path d="M6.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2.5M10.5 11 13.5 8l-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden lg:inline">{t.nav.deconnexion}</span>
            </>
          ) : (
            t.nav.deconnexion
          )}
        </button>
      </form>
    </div>
  );
}

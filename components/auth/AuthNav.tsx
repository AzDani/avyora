import Link from "next/link";
import { getUser, estAdmin, estPro } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { getT } from "@/lib/i18n/server";
import { FEATURES } from "@/lib/features";
import { betaActive, lienInscriptionBeta } from "@/lib/beta";
import { etatArtisanEntete } from "@/lib/data/reseau";

/** Le compte est-il un artisan du réseau (et combien de demandes l'attendent) ? Une panne n'affiche rien. */
async function etatArtisan(userId: string) {
  try {
    return await etatArtisanEntete(userId);
  } catch {
    return { artisan: false, aRepondre: 0 };
  }
}

/** Bloc de navigation lié à l'auth : Connexion (déconnecté) ou prénom + déconnexion (connecté). */
export async function AuthNav() {
  const [user, { t }] = await Promise.all([getUser(), getT()]);

  if (!user) {
    /* Un visiteur sans compte voyait seulement « Connexion » : l'offre du moment (pendant la bêta, tout AVYORA offert
       avec un compte, lib/beta.ts) passe par l'inscription, d'où ce bouton secondaire (contour : « Nouveau projet » reste
       le seul bouton plein). Il n'apparaît qu'à partir de lg (le menu, en dessous, porte la même ligne). */
    const beta = betaActive();
    return (
      <>
        <Link
          href={beta ? lienInscriptionBeta(undefined, "entete") : "/inscription"}
          className="hidden whitespace-nowrap rounded-lg border border-white/25 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/10 lg:inline-flex"
        >
          {/* Le mot « gratuit » reste dans le menu, le bandeau bêta et la pastille du plan : dans l'en-tête, la place
              manquait depuis l'onglet « Accompagnement » (16/11/2026). */}
          {t.boutons.creerCompte}
        </Link>
        <Link
          href="/connexion"
          className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
        >
          {t.nav.connexion}
        </Link>
      </>
    );
  }

  const prenom = (user.user_metadata?.nom as string) || user.email?.split("@")[0] || t.nav.monCompte;
  const artisan = await etatArtisan(user.id);
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
      {/* Les avis sur les artisans du réseau (25/11/2026) : réservés aux membres Pro, la page le dit aux autres. */}
      <Link
        href="/avis-artisans"
        className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white xl:inline-flex"
      >
        Avis artisans
      </Link>
      {/* L'espace artisan (25/11/2026) : pour un artisan du réseau, avec le nombre de demandes à répondre. */}
      {artisan.artisan && (
        <Link
          href="/espace-artisan"
          data-espace-artisan=""
          title="Espace artisan"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#a78bfa]/20 px-2.5 py-1.5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,.55)] transition-colors hover:bg-[#a78bfa]/30"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M2.5 13.5h11M4 13.5V7.2L8 4l4 3.2v6.3M6.6 13.5V10h2.8v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={compact ? "hidden xl:inline" : ""}>Espace artisan</span>
          {artisan.aRepondre > 0 && (
            <span className="num inline-flex min-w-[19px] items-center justify-center rounded-full bg-[#f59e0b] px-1.5 text-[11.5px] font-bold leading-[19px] text-[#1e1b4b]">
              {artisan.aRepondre > 99 ? "99+" : artisan.aRepondre}
              <span className="sr-only"> demande{artisan.aRepondre > 1 ? "s" : ""} à répondre</span>
            </span>
          )}
        </Link>
      )}
      <Link
        href="/mon-espace/compte"
        className={"hidden " + (compact ? "max-w-[8.5rem]" : "max-w-[10rem]") + " items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"}
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
              {/* Icône seule à toutes les largeurs depuis l'onglet « Accompagnement » (16/11/2026) : le nom reste dans
                  aria-label et title. */}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M6.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2.5M10.5 11 13.5 8l-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          ) : (
            t.nav.deconnexion
          )}
        </button>
      </form>
    </div>
  );
}

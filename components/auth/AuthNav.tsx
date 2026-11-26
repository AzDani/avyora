import Link from "next/link";
import { getUser, estAdmin, estPro } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { betaActive, lienInscriptionBeta } from "@/lib/beta";
import { etatArtisanEntete, resumeDevisDuClient } from "@/lib/data/reseau";
import MenuCompte from "@/components/auth/MenuCompte";
import { estComptePro } from "@/lib/compte/type";

/** Le compte est-il un artisan du réseau (et combien de demandes l'attendent) ? Une panne n'affiche rien. */
async function etatArtisan(userId: string, pro: boolean) {
  try {
    return await etatArtisanEntete(userId, pro);
  } catch {
    return { artisan: false, aRepondre: 0 };
  }
}

/** Les demandes de devis du client (lien « Mes devis ») ; une panne n'affiche pas le lien. */
async function resumeDevis(userId: string) {
  try {
    return await resumeDevisDuClient(userId);
  } catch {
    return null;
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
  const [artisan, devis] = await Promise.all([etatArtisan(user.id, estComptePro(user)), resumeDevis(user.id)]);
  /* L'en-tête connecté (26/11/2026, décision de Dani) : il débordait de 73 px pour un artisan à 1 280 px (Avis artisans,
     Espace artisan, prénom) et « Mes devis » n'avait pas de place. En haut restent les liens d'action (Passer Pro,
     Mes devis, Espace artisan) ; Mon compte, Avis artisans, Admin et Déconnexion passent dans le menu du compte.
     « Espace artisan » : libellé à partir de xl (comme avant) ; en icône seule pour un artisan qui a aussi des demandes de
     devis, pour que tout tienne (mesuré). */
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
      {/* Les demandes de devis du client (26/11/2026) : avant, seule une ligne grise de « Mes projets » y menait. Le lien
          n'apparaît qu'à qui a déjà fait une demande ; la pastille compte ce qui l'attend (avis à donner ou à corriger). */}
      {devis && (
        <Link
          href="/demandes-devis"
          data-mes-devis-entete=""
          title="Mes demandes de devis"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M4 1.8h5.2L12.5 5v9.2H4V1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M9 1.8V5h3.5M6.2 8.2h4.1M6.2 10.8h4.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Mes devis
          {devis.aFaire > 0 && <Pastille n={devis.aFaire} quoi={devis.aFaire > 1 ? "choses à faire" : "chose à faire"} />}
        </Link>
      )}
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
          <span className={devis ? "sr-only" : "hidden xl:inline"}>Espace artisan</span>
          {artisan.aRepondre > 0 && <Pastille n={artisan.aRepondre} quoi={artisan.aRepondre > 1 ? "demandes à répondre" : "demande à répondre"} />}
        </Link>
      )}
      <MenuCompte prenom={prenom} isAdmin={estAdmin(user)} />
    </div>
  );
}

/** La pastille orange de l'en-tête (demandes à répondre, choses à faire). */
function Pastille({ n, quoi }: { n: number; quoi: string }) {
  return (
    <span className="num inline-flex min-w-[19px] items-center justify-center rounded-full bg-[#f59e0b] px-1.5 text-[11.5px] font-bold leading-[19px] text-[#1e1b4b]">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> {quoi}</span>
    </span>
  );
}

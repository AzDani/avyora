import Link from "next/link";
import { getUser, estAdmin, estPro } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { getT } from "@/lib/i18n/server";
import { etatArtisanEntete, resumeDevisDuClient } from "@/lib/data/reseau";
import { estComptePro } from "@/lib/compte/type";
import { photoDuCompte } from "@/lib/compte/photo";
import Volet from "@/components/entete/Volet";

/**
 * La partie droite de l'en-tête v2 (décision de Dani du 26/11/2026) : ce qui est À MOI, et une seule action.
 * - Visiteur : « Connexion » et le bouton « Estimer gratuitement ».
 * - Connecté : « Mon espace » (initiale, prénom, UNE pastille qui additionne ce qui l'attend : avis à donner ou à
 *   corriger, demandes d'artisan à répondre) ouvre un volet (Mes projets et mes plans, Mes demandes de devis, Espace
 *   artisan, puis Mon compte, Passer Pro, Admin, Déconnexion) ; puis « Nouveau projet ».
 * Une lecture en panne (artisan, devis) n'affiche simplement pas la ligne.
 */
export async function AuthNav() {
  const [user, { t, locale }] = await Promise.all([getUser(), getT()]);
  const n = t.nav;

  if (!user) {
    return (
      <>
        <Link href="/connexion" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white">
          {n.connexion}
        </Link>
        <Link href="/projets/nouveau" className="btn btn-primary ml-1 whitespace-nowrap py-2" data-cta-entete="">
          {n.estimerGratuitement}
        </Link>
      </>
    );
  }

  const fr = locale === "fr";
  const prenom = (user.user_metadata?.nom as string) || user.email?.split("@")[0] || n.monCompte;
  const initiale = (prenom.trim()[0] ?? "?").toUpperCase();
  // La photo de profil (26/11/2026), sinon l'initiale.
  const photo = photoDuCompte(user);
  const [artisan, devis] = await Promise.all([
    fr ? etatArtisanEntete(user.id, estComptePro(user)).catch(() => null) : Promise.resolve(null),
    fr ? resumeDevisDuClient(user.id).catch(() => null) : Promise.resolve(null),
  ]);
  const aRepondre = artisan?.artisan ? artisan.aRepondre : 0;
  const pastille = (devis?.aFaire ?? 0) + aRepondre;
  const ligne = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-ink transition-colors hover:bg-surface-2";

  return (
    <>
      <Volet
        data="mon-espace"
        aligne="droite"
        largeur="w-[300px]"
        etiquette={`${n.monEspace} · ${prenom}${pastille ? ` (${pastille} à faire)` : ""}`}
        classeBouton="inline-flex items-center gap-2 rounded-xl bg-white/5 py-1 pl-1.5 pr-2.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
        bouton={
          <>
            <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#a78bfa] text-[13px] font-bold text-[#1e1b4b]" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- petite image publique déjà réduite */}
              {photo ? <img src={photo} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" /> : initiale}
              {pastille > 0 && (
                <span className="num absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-[#f59e0b] px-1 text-center text-[11px] font-bold leading-[18px] text-[#1e1b4b] ring-2 ring-[#1E1B4B]" data-pastille-espace="">
                  {pastille > 99 ? "99+" : pastille}
                </span>
              )}
            </span>
            <span className="hidden flex-col items-start leading-tight xl:flex" aria-hidden="true">
              <span className="text-[11px] text-[#c4b5fd]">{n.monEspace}</span>
              <span className="max-w-[9rem] truncate text-[14px] font-semibold text-white">{prenom}</span>
            </span>
          </>
        }
      >
        <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-1.5">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-[#a78bfa] text-[14px] font-bold text-[#1e1b4b]" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- petite image publique déjà réduite */}
            {photo ? <img src={photo} alt="" width={34} height={34} className="h-full w-full object-cover" /> : initiale}
          </span>
          <span className="min-w-0 truncate text-[14.5px] font-semibold">{prenom}</span>
        </div>
        <p className="mx-2.5 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">{n.monEspace}</p>
        <Link href="/projets" className={ligne}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-muted"><path d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          <span className="flex-1">{n.mesProjets}</span>
        </Link>
        {devis && (
          <Link href="/demandes-devis" className={ligne} data-mes-devis-entete="">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-muted"><path d="M4 1.8h5.2L12.5 5v9.2H4V1.8ZM9 1.8V5h3.5M6.2 8.2h4.1M6.2 10.8h4.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="flex-1">Mes demandes de devis</span>
            {devis.avisARevoir > 0 && <Puce>{devis.avisARevoir} avis à corriger</Puce>}
            {devis.avisARevoir === 0 && devis.avisADonner > 0 && <Puce>{devis.avisADonner} avis à donner</Puce>}
          </Link>
        )}
        {artisan?.artisan && (
          <Link href="/espace-artisan" className={ligne + " font-semibold text-[#5b21b6]"} data-espace-artisan="">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M2.5 13.5h11M4 13.5V7.2L8 4l4 3.2v6.3M6.6 13.5V10h2.8v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="flex-1">Espace artisan</span>
            {aRepondre > 0 && <Puce>{aRepondre} à répondre</Puce>}
          </Link>
        )}
        <div className="mx-2.5 my-1.5 border-t border-line" />
        <Link href="/mon-espace/compte" className={ligne}>{n.monCompte}</Link>
        {!estPro(user) && <Link href="/tarifs" className={ligne + " font-semibold text-brand-700"}>{n.passerPro}</Link>}
        {estAdmin(user) && <Link href="/admin" className={ligne + " font-semibold text-brand-700"}>Admin</Link>}
        <form action={logout}>
          <button type="submit" className={ligne + " w-full text-left text-muted"}>{n.deconnexion}</button>
        </form>
      </Volet>
      <Link href="/projets/nouveau" className="btn btn-primary ml-1.5 whitespace-nowrap py-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        {n.nouveauProjet}
      </Link>
    </>
  );
}

function Puce({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-[#fff4dc] px-2 py-0.5 text-[11.5px] font-semibold text-[#8a5300]">{children}</span>;
}

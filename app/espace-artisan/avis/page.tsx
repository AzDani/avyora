import type { Metadata } from "next";
import { artisanValideOuRetour } from "@/lib/reseau/espace";
import { avisRecus } from "@/lib/data/reseau";
import { resumeNotes } from "@/lib/reseau/avis";
import { BlocNote, CarteAvis, ControleAvis } from "@/components/reseau/avis/Affichage";
import ReponseAvis from "@/components/reseau/espace/ReponseAvis";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes avis · Espace artisan", robots: { index: false, follow: false } };

/** Les avis publiés sur l'artisan, sa note, et sous chaque avis sa réponse publique ou un signalement. */
export default async function PageMesAvis() {
  const { artisan } = await artisanValideOuRetour();
  const avis = await avisRecus(artisan.id).catch(() => null);
  const nom = artisan.nomCommercial || artisan.raisonSociale;
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Mes avis</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Ce que tes clients disent de toi. Les membres AVYORA Pro les voient sur ta fiche et quand ils choisissent leurs artisans.
        </p>
      </div>
      {!avis ? (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Tes avis ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>
      ) : (
        <>
          <section className="rounded-3xl border border-line bg-surface p-5"><BlocNote r={resumeNotes(avis.publies.map((x) => x.note))} /></section>
          {avis.enAttente > 0 && (
            <p className="rounded-2xl bg-brand-50 px-4 py-3 text-[13.5px] text-brand-900">
              {avis.enAttente} avis {avis.enAttente > 1 ? "sont" : "est"} en cours de vérification par Daniel : {avis.enAttente > 1 ? "ils apparaîtront" : "il apparaîtra"} ici une fois publié{avis.enAttente > 1 ? "s" : ""}.
            </p>
          )}
          <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="avis-publies">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="avis-publies" className="text-[16px] font-semibold text-ink">Avis publiés</h2>
              <span className="text-[12.5px] text-faint">du plus récent au plus ancien</span>
            </div>
            {avis.publies.length === 0 ? (
              <p className="py-3 text-[14px] text-muted">Pas encore d&apos;avis. Après une demande acceptée, le client peut donner son avis depuis le suivi de sa demande.</p>
            ) : (
              avis.publies.map((a) => (
                <CarteAvis key={a.id} a={a} nomArtisan={nom}>
                  <ReponseAvis a={a} />
                </CarteAvis>
              ))
            )}
          </section>
          <p className="text-[13px] leading-relaxed text-muted">
            Un avis ne peut pas être supprimé par l&apos;artisan. Si un avis enfreint les règles (faux avis, insultes, données personnelles), signale-le : Daniel tranche.
          </p>
          <ControleAvis />
        </>
      )}
    </div>
  );
}

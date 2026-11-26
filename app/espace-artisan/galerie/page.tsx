import type { Metadata } from "next";
import { artisanValideOuRetour } from "@/lib/reseau/espace";
import { realisationsDe } from "@/lib/data/reseau";
import Galerie from "@/components/reseau/espace/Galerie";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ma galerie · Espace artisan", robots: { index: false, follow: false } };

/** La galerie de l'artisan : ses réalisations, publiées sur sa fiche sans validation. */
export default async function PageGalerie() {
  const { artisan } = await artisanValideOuRetour();
  const reals = await realisationsDe(artisan.id, { toutes: true }).catch(() => null);
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Ma galerie</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Montre ton travail : chaque réalisation a un titre, une description et ses photos. Elle apparaît sur ta fiche, que les clients consultent avant de te choisir.
        </p>
      </div>
      {reals ? <Galerie realisations={reals} /> : (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Ta galerie ne s&apos;affiche pas pour l&apos;instant. Recharge la page dans un instant.</p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { artisanValideOuRetour } from "@/lib/reseau/espace";
import { demandesRecues } from "@/lib/data/reseau";
import DemandesRecues, { type Onglet } from "@/components/reseau/DemandesRecues";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes demandes · Espace artisan", robots: { index: false, follow: false } };

/** Les demandes de devis reçues par l'artisan validé, en trois onglets : À répondre, En cours, Terminées. */
export default async function PageDemandes({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { artisan } = await artisanValideOuRetour();
  const { onglet: o } = await searchParams;
  const onglet: Onglet = o === "cours" || o === "fin" ? o : "rep";
  const demandes = await demandesRecues(artisan.id).catch(() => null);
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Tes demandes de devis</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Accepte une demande pour recevoir les coordonnées du client. Préviens-nous quand ton devis est parti : le client suit tout de son côté.
        </p>
      </div>
      {demandes ? <DemandesRecues demandes={demandes} onglet={onglet} /> : (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Tes demandes ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>
      )}
    </div>
  );
}

import { corpsLabel, ORDRE_TRAVAUX } from "@/lib/estimation";
import { listArtisans } from "@/lib/data/artisans";
import CarnetArtisans from "@/components/CarnetArtisans";

export const dynamic = "force-dynamic";

export default async function ArtisansPage() {
  const artisans = await listArtisans();
  const corpsOptions = [...ORDRE_TRAVAUX.filter((c) => c !== "construction_neuve"), "divers"].map(
    (c) => ({ value: c, label: corpsLabel(c) })
  );

  return (
    <div className="space-y-8">
      <header className="animate-rise">
        <p className="eyebrow">Réseau</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Carnet artisans</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Ton réseau classé par corps d&apos;état — sous la main pour chaque chantier.
        </p>
      </header>
      <CarnetArtisans artisans={artisans} corpsOptions={corpsOptions} />
    </div>
  );
}

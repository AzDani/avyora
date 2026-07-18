import { db } from "@/lib/db";
import { corpsLabel, ORDRE_TRAVAUX } from "@/lib/estimation";
import CarnetArtisans, { type ArtisanRow } from "@/components/CarnetArtisans";

export const dynamic = "force-dynamic";

export default function ArtisansPage() {
  const artisans = db
    .prepare("SELECT * FROM artisans ORDER BY corps_etat, nom")
    .all() as ArtisanRow[];
  const corpsOptions = [...ORDRE_TRAVAUX.filter((c) => c !== "construction_neuve"), "divers"].map(
    (c) => ({ value: c, label: corpsLabel(c) })
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#1E1B4B] text-white p-6">
        <h1 className="text-xl font-semibold">Carnet artisans</h1>
        <p className="mt-1 text-indigo-200/80 text-sm">
          Ton réseau, classé par corps d&apos;état — la base du futur réseau
          AVYORA.
        </p>
      </section>
      <CarnetArtisans artisans={artisans} corpsOptions={corpsOptions} />
    </div>
  );
}

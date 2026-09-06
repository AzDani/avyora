import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "@/lib/guides";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Guides des prix de la rénovation en France (2026)",
  description:
    "Combien coûte une rénovation en 2026 ? Guides des prix au m² par type de bien (appartement, maison), exemples chiffrés et facteurs de prix. Estimation gratuite en 3 minutes.",
  alternates: { canonical: "/guides" },
};

export default function GuidesHub() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="animate-rise">
        <p className="eyebrow">Guides des prix</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Combien coûte une rénovation en 2026 ?
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Des repères de prix au m² fiables, calculés avec le référentiel AVYORA (France 2026), par type de bien
          et par type de travaux. Puis affine gratuitement pour ton projet.
        </p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-4 py-2.5">Estimer mes travaux →</Link>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="card card-interactive flex flex-col p-5"
          >
            <span className="text-[15px] font-semibold text-ink">{g.h1.replace(" en 2026", "")}</span>
            <span className="mt-1.5 text-sm text-muted">{g.resume}</span>
            <span className="mt-3 text-sm font-medium text-brand-600">Lire le guide →</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <p className="text-[15px] font-semibold text-ink">Cherches-tu un prix par ville ?</p>
        <p className="mt-1 text-sm text-muted">
          Les prix varient selon la région. Consulte le{" "}
          <Link href="/prix-renovation" className="font-medium text-brand-600 hover:underline">
            coût de la rénovation ville par ville
          </Link>{" "}
          (Paris, Lyon, Marseille, Bordeaux…).
        </p>
      </div>
    </div>
  );
}

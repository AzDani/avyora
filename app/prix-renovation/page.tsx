import Link from "next/link";
import type { Metadata } from "next";
import { VILLES } from "@/lib/villes";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Prix d'une rénovation par ville en France (2026) | AVYORA",
  description:
    "Coût d'une rénovation au m² selon votre ville : Paris, Lyon, Marseille, Bordeaux… Prix par type de travaux et estimation gratuite en 3 minutes.",
  alternates: { canonical: "/prix-renovation" },
};

export default function PrixRenovationHub() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="animate-rise">
        <p className="eyebrow">Guide des prix</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Prix d&apos;une rénovation par ville</h1>
        <p className="mt-2 text-[15px] text-muted">
          Les prix de la rénovation varient selon la région (surtout la main-d&apos;œuvre). Choisis ta ville
          pour voir les coûts au m² par type de travaux — ou lance directement ton estimation.
        </p>
        <Link href="/projets/nouveau" className="btn btn-primary mt-4 py-2.5">Estimer mes travaux →</Link>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VILLES.map((v) => (
          <Link
            key={v.slug}
            href={`/prix-renovation/${v.slug}`}
            className="card card-interactive flex items-center justify-between p-4 text-sm font-medium text-ink"
          >
            {v.nom}
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0 text-faint" aria-hidden="true">
              <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">
        Ta ville n&apos;est pas listée ? L&apos;<Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">estimateur</Link>{" "}
        s&apos;adapte à n&apos;importe quel code postal en France.
      </p>

      <p className="mt-3 text-sm text-muted">
        Ou consulte le prix par type de bien :{" "}
        <Link href="/guides/prix-renovation-appartement" className="font-medium text-brand-600 hover:underline">rénovation d&apos;appartement</Link>{" "}
        ·{" "}
        <Link href="/guides/prix-renovation-maison" className="font-medium text-brand-600 hover:underline">rénovation de maison</Link>.
      </p>
    </div>
  );
}

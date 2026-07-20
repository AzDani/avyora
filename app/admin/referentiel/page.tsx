import Link from "next/link";
import { getKbCategories, getKbPostes, seedKb, ecrireSnapshot, kbEstVide } from "@/lib/kb-db";
import CatalogueEditor from "@/components/CatalogueEditor";

export const dynamic = "force-dynamic";

export default async function ReferentielPage() {
  if (await kbEstVide()) {
    await seedKb();
    await ecrireSnapshot();
  }
  const [categories, postes] = await Promise.all([getKbCategories(), getKbPostes()]);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/parcours" className="font-medium text-muted transition-colors hover:text-brand-700">Questionnaire</Link>
        <span className="text-line-strong">·</span>
        <span className="font-semibold text-brand-700">Catalogue de prix</span>
      </nav>
      <header className="animate-rise">
        <p className="eyebrow">Base de connaissances</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Catalogue de prix</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Le savoir de chiffrage d&apos;AVYORA — chaque prix modifié met à jour les estimations instantanément.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="card px-4 py-3">
            <div className="text-xs font-medium text-faint">Postes de travaux</div>
            <div className="data mt-1 text-lg font-semibold text-ink">{postes.length}</div>
          </div>
          <div className="card px-4 py-3">
            <div className="text-xs font-medium text-faint">Corps d&apos;état</div>
            <div className="data mt-1 text-lg font-semibold text-ink">{categories.length}</div>
          </div>
        </div>
      </header>

      <CatalogueEditor categories={categories} postes={postes} />
    </div>
  );
}

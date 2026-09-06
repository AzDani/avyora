import Link from "next/link";
import EstimateurRapide from "@/components/EstimateurRapide";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Estimation rapide (< 3 min), gratuite. « Affiner » ouvre le détaillé (/detaille).
export default async function NouveauProjetRapide() {
  const { t: tr } = await getT();
  const t = tr.rapide;
  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="mb-1 text-[13px]">
          <Link href="/projets/nouveau" className="text-muted hover:text-brand-700">{t.pageBack}</Link>
        </p>
        <p className="eyebrow">{t.pageEyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{t.pageTitre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{t.pageSous}</p>
      </header>
      <EstimateurRapide />
    </div>
  );
}

import Link from "next/link";
import EstimateurRapide from "@/components/EstimateurRapide";
import { getT } from "@/lib/i18n/server";
import { getUser, estPro } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Estimation rapide (< 3 min), gratuite. « Affiner » ouvre le détaillé (/detaille).
// L'assemblage multi-pièces (2 types de pièces différents) est réservé au Pro.
export default async function NouveauProjetRapide() {
  const [{ t: tr }, user] = await Promise.all([getT(), getUser()]);
  const t = tr.rapide;
  const isPro = !!user && estPro(user);
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
      <EstimateurRapide isPro={isPro} />
    </div>
  );
}

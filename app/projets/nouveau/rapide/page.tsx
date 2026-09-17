import Link from "next/link";
import EstimateurRapide from "@/components/EstimateurRapide";
import { getT } from "@/lib/i18n/server";
import { getUser, estPro } from "@/lib/auth";
import type { PieceKey } from "@/lib/estimateur";

export const metadata = {
  title: "Estimation travaux gratuite — budget rénovation en 3 minutes",
  description:
    "Calcule gratuitement le budget de tes travaux de rénovation : 4 questions, une fourchette chiffrée ajustée à ton code postal. Sans inscription.",
  alternates: { canonical: "/projets/nouveau/rapide" },
};
export const dynamic = "force-dynamic";

// Estimation rapide (< 3 min), gratuite. « Affiner » ouvre le détaillé (/detaille).
// L'assemblage multi-pièces (2 types de pièces différents) est réservé au Pro.
/**
 * Contexte transmis par les pages SEO (?cp=&piece=&surface=), VALIDÉ ICI.
 *
 * C'est une entrée publique : tout ce qui n'est pas explicitement reconnu est ignoré, jamais
 * « corrigé ». Une pièce hors liste, un code postal mal formé ou une surface aberrante ne doivent
 * pas pouvoir amorcer l'estimateur avec une valeur inventée — mieux vaut un formulaire vierge.
 */
const PIECES_OK = new Set<PieceKey>(["cuisine", "sdb", "chambre", "salon", "suite", "buanderie"]);

function contexte(sp: Record<string, string | string[] | undefined>) {
  const lire = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const cpBrut = lire("cp");
  const pieceBrut = lire("piece");
  const surfBrut = Number(lire("surface"));
  return {
    // 01000–98999 : la plage réelle des codes postaux français. « 99999 » passait un \d{5} naïf et
    // amorçait le formulaire avec une valeur qui n'existe pas.
    cp: typeof cpBrut === "string" && /^(0[1-9]|[1-8]\d|9[0-8])\d{3}$/.test(cpBrut) ? cpBrut : undefined,
    piece: PIECES_OK.has(pieceBrut as PieceKey) ? (pieceBrut as PieceKey) : undefined,
    surface: Number.isFinite(surfBrut) && surfBrut >= 1 && surfBrut <= 500 ? surfBrut : undefined,
  };
}

export default async function NouveauProjetRapide({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ t: tr }, user, sp] = await Promise.all([getT(), getUser(), searchParams]);
  const t = tr.rapide;
  const isPro = !!user && estPro(user);
  const initial = contexte(sp);
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
      <EstimateurRapide isPro={isPro} initial={initial} />
    </div>
  );
}

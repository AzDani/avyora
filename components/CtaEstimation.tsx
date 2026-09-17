import Link from "next/link";
import type { PieceKey } from "@/lib/estimateur";

/**
 * Appel à l'action des pages SEO, SOURCE UNIQUE (le même bloc était recopié dans 6 gabarits).
 *
 * Deux corrections par rapport à ce qui existait :
 *
 * 1. DESTINATION. Les CTA pointaient sur `/projets/nouveau`, un écran de choix entre l'estimation
 *    rapide (gratuite) et l'estimation détaillée (payante). Un visiteur venu d'une page de prix
 *    n'a rien demandé d'autre qu'un chiffre : on l'envoie directement sur l'estimateur gratuit.
 *
 * 2. CONTEXTE. La page connaissait le projet ET la ville du visiteur, et le formulaire repartait
 *    vierge. Les paramètres transmis ici réamorcent l'estimateur (cf. la page `rapide`, qui les
 *    valide strictement avant de les utiliser).
 *
 * ⚠️ Ne PAS confondre avec la règle « un nouveau projet démarre vierge » : celle-ci interdit de
 * traîner l'état d'un projet PRÉCÉDENT. Ici le contexte est explicite — il vient du lien sur
 * lequel le visiteur vient de cliquer.
 */
export function CtaEstimation({
  titre,
  cp,
  piece,
  surface,
  libelle,
  sousTitre,
}: {
  titre: string;
  /** Code postal de la ville de la page : l'estimation sort ajustée à la main-d'œuvre locale. */
  cp?: string;
  /** Pièce concernée — seuls les projets dont l'espace existe côté estimateur en passent une. */
  piece?: PieceKey;
  surface?: number;
  libelle?: string;
  sousTitre?: string;
}) {
  const q = new URLSearchParams();
  if (cp) q.set("cp", cp);
  if (piece) q.set("piece", piece);
  if (surface && surface > 0) q.set("surface", String(surface));
  const qs = q.toString();

  return (
    <div className="card mt-6 border-brand-100 bg-brand-50/40 p-5">
      <p className="font-semibold text-ink">{titre}</p>
      <p className="mt-1 text-sm text-muted">
        {sousTitre ?? "Gratuit, sans inscription — une fourchette chiffrée adaptée à ton bien et ton code postal."}
      </p>
      <Link
        href={`/projets/nouveau/rapide${qs ? `?${qs}` : ""}`}
        className="btn btn-primary mt-3 min-h-[48px] py-2.5"
      >
        {libelle ?? "Estimer mes travaux"} →
      </Link>
    </div>
  );
}

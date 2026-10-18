import type { Locale } from "@/lib/i18n/config";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

/**
 * Les deux pastilles d'un projet enregistré (revue rénovation / neuf, N14) : sa nature (« Rénovation »
 * ou « Construction neuve ») et son mode (« Rapide » ou « Détaillée »). Fiche projet, liste des projets
 * et admin les affichent de la même façon. Sans état ni effet : utilisable côté serveur comme dans un
 * composant client (la liste des projets), la langue est passée par l'appelant.
 */
export default function PastillesProjet({ nature, mode, locale }: { nature: "reno" | "neuf"; mode: "rapide" | "detaille"; locale: Locale }) {
  const n = dictNeufCommun(locale);
  return (
    <>
      <span className="chip border-brand-200 bg-brand-50 text-brand-700" data-nature={nature}>{nature === "neuf" ? n.badge : n.badgeReno}</span>
      <span className="chip" data-mode={mode}>{mode === "rapide" ? n.modeRapide : n.modeDetaille}</span>
    </>
  );
}

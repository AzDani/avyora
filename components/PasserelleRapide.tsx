import Link from "next/link";
import { dictNeuf } from "@/lib/i18n/neuf";
import type { Locale } from "@/lib/i18n/config";

/**
 * Passerelle entre les deux estimations rapides (chantier N13 de la revue rénovation / neuf) : « Tu fais
 * construire ? » en bas du rapide de la rénovation, « Un logement existant ? » en bas de celui du neuf.
 * Composant serveur, posé par les pages publiques seulement (jamais dans l'édition d'un projet), et
 * derrière `FEATURES.neuf` : interrupteur éteint, le rapide de la rénovation n'en affiche aucune.
 * En bas de page, sous la barre du chiffre : le visiteur venu d'une annonce n'est pas détourné avant
 * d'avoir répondu.
 */
export default function PasserelleRapide({ vers, locale }: { vers: "neuf" | "reno"; locale: Locale }) {
  const p = dictNeuf(locale).passerelles;
  const versNeuf = vers === "neuf";
  const href = versNeuf ? "/estimation-construction-maison" : "/estimation-travaux";
  return (
    <p className="text-center text-[14px] text-muted" data-passerelle={vers}>
      {versNeuf ? p.versNeuf : p.versReno}{" "}
      <Link href={href} className="font-medium text-brand-700 hover:underline">
        {versNeuf ? p.versNeufLien : p.versRenoLien}
      </Link>
    </p>
  );
}

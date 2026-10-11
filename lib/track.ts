import { track } from "@vercel/analytics";

/** Événements clés du funnel AVYORA (côté client). No-op silencieux si l'analytics n'est pas chargé. */
export type EvenementAvyora =
  | "estimation_terminee"
  | "compte_cree"
  | "clic_nouveau_projet"
  | "clic_sabonner"
  | "clic_telecharger_rapport"
  /** Arrivée sur la page de tarifs — le mur payant. Sans elle, on ignore combien y parviennent. */
  | "vue_tarifs"
  /**
   * Arrivée par le lien d'un Plan final (construction neuve). Props : `ok`, `niveaux`,
   * `tranche_surface` — jamais le contenu du plan, ni la surface exacte.
   */
  | "neuf_depuis_plan";

type Props = Record<string, string | number | boolean | null>;

export function suivre(nom: EvenementAvyora, props?: Props): void {
  try {
    track(nom, props);
  } catch {
    /* analytics indisponible (dev, bloqueur…) : on ignore */
  }
}

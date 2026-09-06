import { track } from "@vercel/analytics";

/** Événements clés du funnel AVYORA (côté client). No-op silencieux si l'analytics n'est pas chargé. */
export type EvenementAvyora =
  | "estimation_terminee"
  | "compte_cree"
  | "clic_nouveau_projet"
  | "clic_sabonner"
  | "clic_telecharger_rapport";

type Props = Record<string, string | number | boolean | null>;

export function suivre(nom: EvenementAvyora, props?: Props): void {
  try {
    track(nom, props);
  } catch {
    /* analytics indisponible (dev, bloqueur…) : on ignore */
  }
}

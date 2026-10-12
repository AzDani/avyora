import { track } from "@vercel/analytics";

/** Événements clés du funnel AVYORA (côté client). No-op silencieux si l'analytics n'est pas chargé. */
export type EvenementAvyora =
  /** Props : `action`, `type`, `src`, et `nature` (reno | neuf), que les deux rapides envoient (N2). */
  | "estimation_terminee"
  | "compte_cree"
  /**
   * Un clic sur une carte de la pré-page « Quel est ton projet ? » (N2). Props : `nature` (reno | neuf),
   * liste fermée de `lib/nature-projet.ts`. Entonnoir : vue de /projets/nouveau → clic_nouveau_projet{nature}
   * → estimation_terminee{nature}.
   */
  | "clic_nouveau_projet"
  | "clic_sabonner"
  | "clic_telecharger_rapport"
  /**
   * Arrivée sur la page de tarifs — le mur payant. Sans elle, on ignore combien y parviennent. Props :
   * `connecte`, `deja_pro`, `venu_pour`, et `source` quand elle est connue (éditeur de plan, ou la nature :
   * `affiner-reno`, `affiner-neuf`, `choix-reno`, `choix-neuf`).
   */
  | "vue_tarifs"
  /**
   * Arrivée par le lien d'un Plan final (construction neuve). Props : `ok`, `niveaux`,
   * `tranche_surface` — jamais le contenu du plan, ni la surface exacte.
   */
  | "neuf_depuis_plan"
  /*
   * Éditeur de plan (C10), émis seulement interrupteur `FEATURES.plans` allumé, par `lib/plans/mesure.ts` (qui en
   * fixe les propriétés, toutes fermées). Jamais de nom de plan, de code postal ni de surface.
   */
  /** Un clic vers la vitrine ou l'éditeur. Props : `origine` (nav, nav_mobile, accueil, vitrine_haut, vitrine_bas, choix, projets, neuf, pied). */
  | "clic_plan"
  /** L'îlot « Tes plans » de la vitrine a trouvé son état. Props : `connecte`, `a_des_plans`, `telephone`. */
  | "vue_vitrine_plan"
  /** Un plan entre dans le compte. Props : `source` (reclamation | editeur), `pro`. L'éditeur l'émet aussi, par son relais. */
  | "plan_enregistre_compte"
  /** La limite gratuite refuse un plan. Props : `moment` (reclamation | nouveau). L'éditeur l'émet aussi, par son relais. */
  | "plan_limite_gratuit"
  /** Une estimation créée depuis un plan. Props : `nature` (neuf | reno), `mode` (rapide | detaille). */
  | "estimation_depuis_plan";

type Props = Record<string, string | number | boolean | null>;

export function suivre(nom: EvenementAvyora, props?: Props): void {
  try {
    track(nom, props);
  } catch {
    /* analytics indisponible (dev, bloqueur…) : on ignore */
  }
}

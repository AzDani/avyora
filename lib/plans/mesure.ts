/**
 * La mesure de l'éditeur de plan côté site (chantier C10).
 *
 * Cinq événements de `lib/track.ts`, chacun avec des propriétés FERMÉES : des codes, des booléens, jamais un nom de
 * plan, un code postal ni une surface (D48 § 10). Les fonctions `mesure…` sont pures (elles disent quoi émettre, ou
 * `null`) ; `mesurerPlan` émet, et seulement interrupteur `FEATURES.plans` allumé : éteint, rien ne part (la rénovation
 * et le neuf mesurent exactement ce qu'ils mesuraient avant).
 *
 * L'éditeur, lui, émet par son relais (`window.AVYORA_TRACK`, `lib/editeur/heberger.ts`), filtré par deux listes
 * fermées (noms et propriétés). Aucune conversion Google Ads n'est ajoutée : les enchères restent sur
 * « Estimation terminée » (`lib/gtag.ts`).
 *
 * Entonnoir : clic_plan → plan_ouvert → premiere_piece → vue_3d → clic_chiffrer_construction → neuf_depuis_plan →
 * estimation_terminee → plan_enregistre_compte → clic_passer_pro → vue_tarifs{source:"editeur-plan"}.
 */
import { FEATURES } from "@/lib/features";
import { suivre } from "@/lib/track";
import type { ResultatReprise } from "@/lib/plans/local";

/** D'où part un clic vers la vitrine ou l'éditeur (attribut `data-clic-plan` du lien). */
export const ORIGINES_CLIC_PLAN = [
  "nav",
  "nav_mobile",
  "accueil",
  "vitrine_haut",
  "vitrine_bas",
  "choix",
  "projets",
  "neuf",
  "pied",
] as const;
export type OrigineClicPlan = (typeof ORIGINES_CLIC_PLAN)[number];

/** L'attribut posé sur chaque lien vers la vitrine ou l'éditeur ; `SuiviClicsPlan` l'écoute par délégation. */
export const ATTRIBUT_CLIC_PLAN = "data-clic-plan";

/** Les props JSX d'un lien mesuré : `<Link {...clicPlan("nav")} …>`. */
export function clicPlan(origine: OrigineClicPlan): { "data-clic-plan": OrigineClicPlan } {
  return { "data-clic-plan": origine };
}

export type MesurePlan =
  | readonly ["clic_plan", { origine: OrigineClicPlan }]
  | readonly ["vue_vitrine_plan", { connecte: boolean; a_des_plans: boolean; telephone: boolean }]
  | readonly ["plan_enregistre_compte", { source: "reclamation" | "editeur"; pro: boolean }]
  | readonly ["plan_limite_gratuit", { moment: "reclamation" | "nouveau" }]
  | readonly ["estimation_depuis_plan", { nature: "neuf" | "reno"; mode: "rapide" | "detaille" }];

/** Émet une mesure, interrupteur allumé seulement. */
export function mesurerPlan(m: MesurePlan | null): void {
  if (!m || !FEATURES.plans) return;
  suivre(m[0], m[1]);
}

/** Un clic : seulement une origine de la liste fermée (un attribut inconnu ou vide est ignoré). */
export function mesureClic(origine: string | null | undefined): MesurePlan | null {
  return typeof origine === "string" && (ORIGINES_CLIC_PLAN as readonly string[]).includes(origine)
    ? ["clic_plan", { origine: origine as OrigineClicPlan }]
    : null;
}

/** L'élément cliqué (ou son ancêtre) qui porte `data-clic-plan`, et la mesure qu'il donne. */
export function mesureDepuisCible(cible: EventTarget | null): MesurePlan | null {
  const el = cible as { closest?: (s: string) => { getAttribute(n: string): string | null } | null } | null;
  if (!el || typeof el.closest !== "function") return null;
  const lien = el.closest(`[${ATTRIBUT_CLIC_PLAN}]`);
  return lien ? mesureClic(lien.getAttribute(ATTRIBUT_CLIC_PLAN)) : null;
}

/** L'îlot « Tes plans » : connecté (liste du compte) ou non ; des plans au compte ou sur l'appareil ; au téléphone. */
export function mesureVitrine(v: { connecte: boolean; plans: number; telephone: boolean }): MesurePlan {
  return ["vue_vitrine_plan", { connecte: v.connecte, a_des_plans: v.plans > 0, telephone: v.telephone }];
}

/**
 * La reprise d'un plan local par `ClaimPlan` : un plan entré dans le compte (pas celui que le compte avait déjà,
 * `deja`), ou la limite gratuite. Tout autre résultat ne mesure rien.
 */
export function mesureReprise(r: ResultatReprise, pro: boolean): MesurePlan | null {
  if (r.etat === "ajoute") return r.deja ? null : ["plan_enregistre_compte", { source: "reclamation", pro }];
  if (r.etat === "limite") return ["plan_limite_gratuit", { moment: "reclamation" }];
  return null;
}

/**
 * Une estimation NEUVE créée (POST, pas une modification) depuis un plan : son origine dit `source: "plan"`.
 * `mode` vient du brouillon (rapide ou détaillé).
 */
export function mesureEstimationNeuf(b: { mode: "rapide" | "detaille"; origine?: { source?: unknown } | null }): MesurePlan | null {
  return b.origine?.source === "plan" ? ["estimation_depuis_plan", { nature: "neuf", mode: b.mode }] : null;
}

/** Une estimation de RÉNOVATION créée depuis un plan (`/projets/depuis-plan`) : la création seulement, pas la mise à jour. */
export function mesureEstimationReno(cree: unknown): MesurePlan | null {
  return cree === true ? ["estimation_depuis_plan", { nature: "reno", mode: "detaille" }] : null;
}

import { sourceSeoValide, type SourceSeo } from "./seo-source";
import { FEATURES } from "./features";
import { editeurIdSchema, planIdSchema } from "./plans/schema";
import { surfaceNeufValide } from "./estimateur/bornes-neuf";

/** Contexte d'amorçage du rapide neuf, venu de l'URL (`?cp=&surface=&niveaux=&src=`), déjà validé. */
export type InitialNeuf = {
  cp?: string; surface?: number; niveaux?: "pp" | "etage"; src?: SourceSeo;
  /** Plan du compte d'où vient le lien (`&pid=`, « Mes plans », C6). Seulement si `FEATURES.plans`. */
  planId?: string;
  /** Plan de l'appareil d'où vient le lien (`&pl=`, id local de l'éditeur). Seulement si `FEATURES.plans`. */
  planLocal?: string;
};

/**
 * Valide les paramètres publics de `/estimation-construction-maison`.
 *
 * Même règle que `contexte()` de `/estimation-travaux` : tout ce qui n'est pas explicitement
 * reconnu est IGNORÉ, jamais « corrigé ». Code postal dans la plage réelle française
 * (01000-98999), surface dans les bornes du neuf (`BORNES_NEUF`, 30-400 m²), niveaux en liste fermée,
 * source en liste fermée (`SOURCES_SEO`). Le lien de l'éditeur de plan porte
 * `?source=editeur-plan` (convention D48 de l'éditeur, comme son lien vers les tarifs) : il devient
 * la source « plan ». Un `src` reconnu passe avant.
 *
 * « Mes plans » (C6), interrupteur allumé seulement : `pid` (uuid d'un plan du compte) et `pl` (id
 * local de l'éditeur) disent de quel plan vient le lien. Ils ne relient rien seuls : le rapide ne les
 * garde que si un plan `#plan=` est appliqué, et le serveur résout le plan sous RLS.
 */
export function contexteNeuf(sp: Record<string, string | string[] | undefined>): InitialNeuf {
  const lire = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const cp = lire("cp");
  const surface = Number(lire("surface"));
  const niveaux = lire("niveaux");
  return {
    cp: typeof cp === "string" && /^(0[1-9]|[1-8]\d|9[0-8])\d{3}$/.test(cp) ? cp : undefined,
    surface: surfaceNeufValide(surface) ? Math.round(surface) : undefined,
    niveaux: niveaux === "pp" || niveaux === "etage" ? niveaux : undefined,
    src: sourceSeoValide(lire("src")) ?? (lire("source") === "editeur-plan" ? "plan" : undefined),
    ...(FEATURES.plans ? liensPlan(lire("pid"), lire("pl")) : {}),
  };
}

/** `pid` et `pl` validés (un invalide est ignoré, jamais corrigé). Clés absentes plutôt que `undefined`. */
function liensPlan(pid: string | undefined, pl: string | undefined): Pick<InitialNeuf, "planId" | "planLocal"> {
  const id = planIdSchema.safeParse(pid);
  const local = editeurIdSchema.safeParse(pl);
  return {
    ...(id.success ? { planId: id.data.toLowerCase() } : {}),
    ...(local.success ? { planLocal: local.data } : {}),
  };
}

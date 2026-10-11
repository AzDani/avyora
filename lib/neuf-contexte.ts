import { sourceSeoValide, type SourceSeo } from "./seo-source";

/** Contexte d'amorçage du rapide neuf, venu de l'URL (`?cp=&surface=&niveaux=&src=`), déjà validé. */
export type InitialNeuf = { cp?: string; surface?: number; niveaux?: "pp" | "etage"; src?: SourceSeo };

/**
 * Valide les paramètres publics de `/estimation-construction-maison`.
 *
 * Même règle que `contexte()` de `/estimation-travaux` : tout ce qui n'est pas explicitement
 * reconnu est IGNORÉ, jamais « corrigé ». Code postal dans la plage réelle française
 * (01000-98999), surface dans les bornes du formulaire (30-400 m²), niveaux en liste fermée,
 * source en liste fermée (`SOURCES_SEO`). Le lien de l'éditeur de plan porte
 * `?source=editeur-plan` (convention D48 de l'éditeur, comme son lien vers les tarifs) : il devient
 * la source « plan ». Un `src` reconnu passe avant.
 */
export function contexteNeuf(sp: Record<string, string | string[] | undefined>): InitialNeuf {
  const lire = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const cp = lire("cp");
  const surface = Number(lire("surface"));
  const niveaux = lire("niveaux");
  return {
    cp: typeof cp === "string" && /^(0[1-9]|[1-8]\d|9[0-8])\d{3}$/.test(cp) ? cp : undefined,
    surface: Number.isFinite(surface) && surface >= 30 && surface <= 400 ? Math.round(surface) : undefined,
    niveaux: niveaux === "pp" || niveaux === "etage" ? niveaux : undefined,
    src: sourceSeoValide(lire("src")) ?? (lire("source") === "editeur-plan" ? "plan" : undefined),
  };
}

/**
 * Familles de pages SEO, reportées sur les événements du tunnel via `?src=`.
 *
 * Le brief (point 26) demande que chaque page SEO ait un rôle dans le parcours ET qu'on puisse
 * mesurer lequel. Sans cette étiquette, l'analytics montre des estimations terminées sans jamais
 * dire d'où venait le visiteur — donc aucune boucle d'amélioration possible.
 *
 * Liste FERMÉE : la page `rapide` rejette tout ce qui n'y figure pas, pour qu'un paramètre
 * bricolé dans une URL ne pollue pas les statistiques.
 */
export const SOURCES_SEO = [
  "projet",   // /prix-travaux/[projet]
  "matrice",  // /prix-travaux/[projet]/[ville]
  "ville",    // /prix-renovation/[ville]
  "guide",    // /guides/[slug]
  "poste",    // /prix-poste/[slug]
  "hub",      // les pages d'index de ces familles
] as const;

export type SourceSeo = (typeof SOURCES_SEO)[number];

export function sourceSeoValide(v: unknown): SourceSeo | undefined {
  return typeof v === "string" && (SOURCES_SEO as readonly string[]).includes(v) ? (v as SourceSeo) : undefined;
}

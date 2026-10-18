/*
 * Libellés FRANÇAIS d'AFFICHAGE des chaînes du catalogue (corps d'état restés sans accents, unités).
 *
 * Les noms de corps d'état sont des CLÉS du moteur : `catalog.json`, `catalog-neuf.json`, les paniers
 * (`presets.ts`, `pieces.ts`, `seo-projets.ts`), les correspondances du plan, et surtout les projets
 * déjà enregistrés en base (`reponses.sel` est indexé par « corps|poste », les lignes perso portent
 * leur `lot`). Les renommer casserait ces projets et ces correspondances : on ne touche donc PAS aux
 * clés, on corrige seulement ce qui s'affiche. Même chose pour les unités (« m2 » reste la clé).
 *
 * Tout passe par `catT(locale, kind, clé)` (catalog-i18n.ts), qui appelle `libelleFr` en français.
 * Cette table vit dans son propre fichier pour rester indépendante des traductions anglaises.
 *
 * Règle : une entrée de `FR_AFFICHAGE` = la clé EXACTE du catalogue → la même chaîne avec ses accents,
 * rien d'autre (tests/catalogue-accents.test.ts le vérifie). Une clé absente s'affiche telle quelle.
 */
import type { CatKind } from "./catalog-i18n";

export const FR_AFFICHAGE: Partial<Record<CatKind, Record<string, string>>> = {
  corps: {
    "Etudes / Conception": "Études / Conception",
    "Menuiseries exterieures": "Menuiseries extérieures",
    "Cloisons / Platrerie": "Cloisons / Plâtrerie",
    "Electricite": "Électricité",
    "Carrelage / Revetements": "Carrelage / Revêtements",
    "Menuiseries interieures": "Menuiseries intérieures",
  },
  /* Unités écrites à l'écran : « m² » et « m³ » (la clé reste « m2 » / « m3 »), « % » pour un
     pourcentage du projet (construction neuve). « forfait », « jour », « ml », « u » restent telles quelles. */
  unites: { m2: "m²", m3: "m³", pct: "%" },
};

/** Libellé français d'affichage d'une chaîne du catalogue : sa forme corrigée, sinon la chaîne elle-même. Dans
 *  une note, « % » suit une espace insécable (« TVA 10 % ») pour ne jamais passer seul à la ligne (F1) : la
 *  chaîne du catalogue, qui sert de clé aux traductions, ne change pas. */
export function libelleFr(kind: CatKind, fr: string): string {
  const v = FR_AFFICHAGE[kind]?.[fr] ?? fr;
  return kind === "notes" ? v.replace(/(\d) %/g, "$1\u00a0%") : v;
}

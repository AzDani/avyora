export * from "./core";
export * from "./projet";
export * from "./presets";
export * from "./pieces";
export { CATALOG } from "./catalog";
export { CATALOG_NEUF, PHASES_NEUF, IDS_NEUF, POSTE_NEUF, ANOMALIES_NEUF, catalogueDe } from "./catalogue-neuf";
export * from "./neuf";
export * from "./presets-neuf";
// `etapes-neuf`, `questions-neuf`, `brouillon-neuf`, `detaille-neuf` et `plan-neuf` ne passent PAS
// par ce baril : ils ne servent qu'aux écrans du neuf, et un module à effets de bord (un `new Set`
// au chargement) entrerait dans le bundle de chaque page de la rénovation qui importe le baril.
// On les importe par leur chemin.

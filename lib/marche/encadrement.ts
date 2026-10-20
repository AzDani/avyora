/**
 * Communes où le niveau des loyers est encadré (loi ELAN art. 140, expérimentation prolongée par la loi 3DS) : le
 * loyer ne peut pas dépasser le loyer de référence majoré fixé par arrêté préfectoral, quel que soit le marché.
 * Liste limitée aux territoires certains (Paris, Lille, Plaine Commune, Est Ensemble, Lyon-Villeurbanne,
 * Montpellier, Bordeaux) ; le Pays basque et Grenoble Alpes Métropole n'y sont pas encore.
 */
const COMMUNES = new Set<string>([
  // Paris et ses 20 arrondissements
  "75056", ...Array.from({ length: 20 }, (_, i) => String(75101 + i)),
  // Lille (avec Hellemmes et Lomme, communes associées)
  "59350",
  // Plaine Commune
  "93001", "93027", "93031", "93039", "93059", "93066", "93070", "93072", "93079",
  // Est Ensemble
  "93006", "93008", "93010", "93045", "93048", "93053", "93055", "93061", "93063",
  // Lyon (et ses arrondissements), Villeurbanne
  "69123", ...Array.from({ length: 9 }, (_, i) => String(69381 + i)), "69266",
  // Montpellier, Bordeaux
  "34172", "33063",
]);

export function loyersEncadres(insee: string): boolean {
  return COMMUNES.has(insee);
}

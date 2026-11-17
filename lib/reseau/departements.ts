/**
 * Les départements français (métropole, Corse, outre-mer), rangés par région. L'artisan du Réseau AVYORA coche ceux où
 * il intervient ; en phase 2, la demande d'un client est rattachée au département de son code postal
 * (`departementDuCodePostal`). Décision de Dani du 17/11/2026 : France entière, par départements (pas de rayon en km).
 */
export const REGIONS: { nom: string; departements: [string, string][] }[] = [
  { nom: "Auvergne-Rhône-Alpes", departements: [["01", "Ain"], ["03", "Allier"], ["07", "Ardèche"], ["15", "Cantal"], ["26", "Drôme"], ["38", "Isère"], ["42", "Loire"], ["43", "Haute-Loire"], ["63", "Puy-de-Dôme"], ["69", "Rhône"], ["73", "Savoie"], ["74", "Haute-Savoie"]] },
  { nom: "Bourgogne-Franche-Comté", departements: [["21", "Côte-d'Or"], ["25", "Doubs"], ["39", "Jura"], ["58", "Nièvre"], ["70", "Haute-Saône"], ["71", "Saône-et-Loire"], ["89", "Yonne"], ["90", "Territoire de Belfort"]] },
  { nom: "Bretagne", departements: [["22", "Côtes-d'Armor"], ["29", "Finistère"], ["35", "Ille-et-Vilaine"], ["56", "Morbihan"]] },
  { nom: "Centre-Val de Loire", departements: [["18", "Cher"], ["28", "Eure-et-Loir"], ["36", "Indre"], ["37", "Indre-et-Loire"], ["41", "Loir-et-Cher"], ["45", "Loiret"]] },
  { nom: "Corse", departements: [["2A", "Corse-du-Sud"], ["2B", "Haute-Corse"]] },
  { nom: "Grand Est", departements: [["08", "Ardennes"], ["10", "Aube"], ["51", "Marne"], ["52", "Haute-Marne"], ["54", "Meurthe-et-Moselle"], ["55", "Meuse"], ["57", "Moselle"], ["67", "Bas-Rhin"], ["68", "Haut-Rhin"], ["88", "Vosges"]] },
  { nom: "Hauts-de-France", departements: [["02", "Aisne"], ["59", "Nord"], ["60", "Oise"], ["62", "Pas-de-Calais"], ["80", "Somme"]] },
  { nom: "Île-de-France", departements: [["75", "Paris"], ["77", "Seine-et-Marne"], ["78", "Yvelines"], ["91", "Essonne"], ["92", "Hauts-de-Seine"], ["93", "Seine-Saint-Denis"], ["94", "Val-de-Marne"], ["95", "Val-d'Oise"]] },
  { nom: "Normandie", departements: [["14", "Calvados"], ["27", "Eure"], ["50", "Manche"], ["61", "Orne"], ["76", "Seine-Maritime"]] },
  { nom: "Nouvelle-Aquitaine", departements: [["16", "Charente"], ["17", "Charente-Maritime"], ["19", "Corrèze"], ["23", "Creuse"], ["24", "Dordogne"], ["33", "Gironde"], ["40", "Landes"], ["47", "Lot-et-Garonne"], ["64", "Pyrénées-Atlantiques"], ["79", "Deux-Sèvres"], ["86", "Vienne"], ["87", "Haute-Vienne"]] },
  { nom: "Occitanie", departements: [["09", "Ariège"], ["11", "Aude"], ["12", "Aveyron"], ["30", "Gard"], ["31", "Haute-Garonne"], ["32", "Gers"], ["34", "Hérault"], ["46", "Lot"], ["48", "Lozère"], ["65", "Hautes-Pyrénées"], ["66", "Pyrénées-Orientales"], ["81", "Tarn"], ["82", "Tarn-et-Garonne"]] },
  { nom: "Pays de la Loire", departements: [["44", "Loire-Atlantique"], ["49", "Maine-et-Loire"], ["53", "Mayenne"], ["72", "Sarthe"], ["85", "Vendée"]] },
  { nom: "Provence-Alpes-Côte d'Azur", departements: [["04", "Alpes-de-Haute-Provence"], ["05", "Hautes-Alpes"], ["06", "Alpes-Maritimes"], ["13", "Bouches-du-Rhône"], ["83", "Var"], ["84", "Vaucluse"]] },
  { nom: "Outre-mer", departements: [["971", "Guadeloupe"], ["972", "Martinique"], ["973", "Guyane"], ["974", "La Réunion"], ["976", "Mayotte"]] },
];

export const DEPARTEMENTS: [string, string][] = REGIONS.flatMap((r) => r.departements).sort((a, b) => a[0].localeCompare(b[0]));
export const CODES_DEPARTEMENTS = DEPARTEMENTS.map(([c]) => c);
const NOMS = new Map(DEPARTEMENTS);
export const nomDepartement = (code: string) => NOMS.get(code) ?? code;

/** Le département d'un code postal français (Corse : 200-201 → 2A, 202-206 → 2B ; outre-mer sur 3 chiffres). null sinon. */
export function departementDuCodePostal(cp: string): string | null {
  const c = String(cp ?? "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return null;
  if (c.startsWith("20")) return Number(c.slice(0, 3)) <= 201 ? "2A" : "2B";
  if (c.startsWith("97")) return NOMS.has(c.slice(0, 3)) ? c.slice(0, 3) : null;
  return NOMS.has(c.slice(0, 2)) ? c.slice(0, 2) : null;
}

/** « Gironde (33), Landes (40) » ; au-delà de `max`, « … et 12 autres ». La France entière se dit en un mot. */
export function resumeDepartements(codes: string[], max = 4): string {
  if (codes.length >= DEPARTEMENTS.length) return "France entière";
  const noms = codes.map((c) => `${nomDepartement(c)} (${c})`);
  return noms.length > max ? `${noms.slice(0, max).join(", ")} et ${noms.length - max} autre${noms.length - max > 1 ? "s" : ""}` : noms.join(", ");
}

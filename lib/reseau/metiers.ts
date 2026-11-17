/**
 * Les métiers du Réseau AVYORA (décisions de Dani du 17/11/2026). Calés sur les lots du catalogue de l'estimateur
 * (`lots` : les catégories `c` de lib/estimateur/catalog.json et catalog-neuf.json) : en phase 2, la demande de devis
 * d'un client (ses lots) trouvera les artisans qui les font. L'ordre suit celui d'un chantier.
 */
export const METIERS = [
  { cle: "conception", label: "Plans, maîtrise d'œuvre", lots: ["Etudes / Conception"] },
  { cle: "demolition", label: "Démolition, curage", lots: ["Démolition"] },
  { cle: "terrassement", label: "Terrassement, VRD, raccordements", lots: ["Terrassement", "Réseaux enterrés (VRD)", "Raccordements aux réseaux"] },
  { cle: "maconnerie", label: "Maçonnerie, gros œuvre", lots: ["Maçonnerie", "Fondations & soubassement"] },
  { cle: "charpente", label: "Charpente, ossature bois", lots: ["Charpente, couverture & structure bois"] },
  { cle: "couverture", label: "Couverture, zinguerie", lots: ["Couverture & zinguerie", "Charpente, couverture & structure bois"] },
  { cle: "facade", label: "Façade, ravalement", lots: ["Façade"] },
  { cle: "menuiseries_ext", label: "Fenêtres, portes, volets", lots: ["Menuiseries exterieures"] },
  { cle: "isolation", label: "Isolation", lots: ["Isolation"] },
  { cle: "platrerie", label: "Plâtrerie, cloisons, plafonds", lots: ["Cloisons / Platrerie"] },
  { cle: "electricite", label: "Électricité", lots: ["Electricite"] },
  { cle: "plomberie", label: "Plomberie, sanitaire", lots: ["Plomberie"] },
  { cle: "chauffage", label: "Chauffage, clim, VMC", lots: ["Chauffage / VMC"] },
  { cle: "carrelage", label: "Carrelage, sols", lots: ["Carrelage / Revetements"] },
  { cle: "peinture", label: "Peinture, revêtements muraux", lots: ["Peinture"] },
  { cle: "menuiseries_int", label: "Menuiserie intérieure, placards, escaliers", lots: ["Menuiseries interieures"] },
  { cle: "cuisine", label: "Pose de cuisine", lots: ["Cuisine"] },
  { cle: "tce", label: "Rénovation tous corps d'état", lots: [] },
] as const;

export type CleMetier = (typeof METIERS)[number]["cle"];
export const CLES_METIERS = METIERS.map((m) => m.cle) as readonly CleMetier[];
const PAR_CLE = new Map<string, string>(METIERS.map((m) => [m.cle, m.label]));
export const labelMetier = (cle: string) => PAR_CLE.get(cle) ?? cle;

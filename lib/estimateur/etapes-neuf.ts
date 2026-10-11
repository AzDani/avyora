/**
 * CONSTRUCTION NEUVE — repères du chantier et lectures du devis, pour l'affichage.
 *
 * Données pures sorties de la maquette validée (`maquettes/neuf/app.js`), sans JSX : la fiche
 * projet, le résultat rapide et le PDF les lisent toutes au même endroit. Aucun calcul de prix
 * ici : tout montant vient du moteur (`buildDevis`) ou d'une constante sourcée de ce fichier.
 */
import { buildDevis, type Devis, type Finition } from "./core";
import { catalogueDe, PHASES_NEUF } from "./catalogue-neuf";
import { presetMaison } from "./presets-neuf";
import type { QuiRealise } from "./presets";
import type { MaisonNeuve } from "./neuf";

/** Un texte en français et en anglais. */
export type TexteFrEn = { fr: string; en: string };

export interface InfoPhase {
  /** Ce qui se fait pendant la phase. */
  quoi: TexteFrEn;
  /** Le jalon qui la clôt (et la part des appels de fonds en contrat de construction). */
  jalon: TexteFrEn;
  duree: TexteFrEn;
  /** Démarches de la phase : quand, et quoi. */
  dem: { quand: TexteFrEn; quoi: TexteFrEn }[];
}

/** Repères de chaque phase du chantier neuf (conception v1, § a). Clés = `PHASES_NEUF`. */
export const INFO_PHASES: Record<string, InfoPhase> = {
  "Études & permis": {
    quoi: {
      fr: "Plan topo, étude de sol G2, plans et dossier de permis (architecte obligatoire au-delà de 150 m² de surface de plancher), étude thermique RE2020. Dépôt, instruction, affichage et purge du permis. Étude béton armé si besoin, devis des lots, assurance dommages-ouvrage.",
      en: "Topographic survey, G2 soil study, plans and permit application (an architect is mandatory above 150 m² of floor area), RE2020 thermal study. Filing, review, posting and clearance of the permit. Reinforced-concrete study if needed, quotes for each trade, structural defects insurance.",
    },
    jalon: { fr: "Permis purgé + DO souscrite + DOC déposée : chantier ouvert", en: "Permit cleared + defects insurance taken out + start-of-works notice filed: site open" },
    duree: { fr: "5 à 6 mois (permis + purge)", en: "5 to 6 months (permit + clearance)" },
    dem: [
      { quand: { fr: "Avant", en: "Before" }, quoi: { fr: "Dépôt du permis de construire en mairie : instruction ≈ 2 mois", en: "Building permit filed at the town hall: review ≈ 2 months" } },
      { quand: { fr: "Permis obtenu", en: "Permit granted" }, quoi: { fr: "Affichage du permis sur le terrain, constaté par un commissaire de justice : recours des tiers 2 mois, retrait 3 mois", en: "Permit posted on the plot, recorded by a bailiff: third-party appeals 2 months, withdrawal 3 months" } },
      { quand: { fr: "Permis obtenu", en: "Permit granted" }, quoi: { fr: "Demandes de raccordement Enedis, eau et égout tout de suite (délai Enedis 2 à 6 mois)", en: "Request the electricity, water and sewer connections right away (Enedis takes 2 to 6 months)" } },
      { quand: { fr: "Avant travaux", en: "Before works" }, quoi: { fr: "Assurance dommages-ouvrage souscrite, puis déclaration d'ouverture de chantier (DOC) en mairie", en: "Structural defects insurance taken out, then start-of-works notice (DOC) filed at the town hall" } },
    ],
  },
  "Terrain & terrassement": {
    quoi: {
      fr: "Déclaration de travaux (DT) aux exploitants de réseaux, implantation par un géomètre, installation du chantier, électricité provisoire et compteur d'eau, décapage, fouilles, évacuation des terres.",
      en: "Works notice (DT) to network operators, setting-out by a surveyor, site set-up, temporary power and water meter, topsoil stripping, excavation, soil removal.",
    },
    jalon: { fr: "Fond de fouille réceptionné", en: "Excavation bottom approved" },
    duree: { fr: "Gros œuvre : 4 à 6 mois pour les phases 2 à 5", en: "Structural work: 4 to 6 months for phases 2 to 5" },
    dem: [
      { quand: { fr: "Avant de creuser", en: "Before digging" }, quoi: { fr: "DT sur le guichet unique des réseaux (gratuit)", en: "DT on the national networks portal (free)" } },
    ],
  },
  "Fondations & plancher bas": {
    quoi: {
      fr: "Semelles, boucle de terre, réseaux sous dallage posés et testés par le plombier et l'électricien, soubassement et dalle (ou vide sanitaire, ou sous-sol).",
      en: "Footings, earthing loop, under-slab pipes and ducts laid and tested by the plumber and electrician, base walls and slab (or crawl space, or basement).",
    },
    jalon: { fr: "Plancher bas coulé (≈ 25 % des appels de fonds en contrat de construction)", en: "Ground floor poured (≈ 25% of stage payments under a building contract)" },
    duree: { fr: "Compris dans les 4 à 6 mois du gros œuvre", en: "Within the 4 to 6 months of structural work" },
    dem: [
      { quand: { fr: "Avant le coulage", en: "Before pouring" }, quoi: { fr: "Réseaux sous dallage posés et testés", en: "Under-slab pipes and ducts laid and tested" } },
    ],
  },
  "Murs & planchers": {
    quoi: {
      fr: "Élévation des murs (maçonnerie ou ossature bois), linteaux, chaînages, appuis, plancher d'étage et ses rupteurs, escalier béton.",
      en: "Walls raised (masonry or timber frame), lintels, ring beams, sills, upper floor and its thermal breaks, concrete staircase.",
    },
    jalon: { fr: "Murs et pignons arasés (≈ 40 %)", en: "Walls and gables topped out (≈ 40%)" },
    duree: { fr: "Compris dans les 4 à 6 mois du gros œuvre", en: "Within the 4 to 6 months of structural work" },
    dem: [],
  },
  "Clos & couvert": {
    quoi: {
      fr: "Charpente, couverture et zinguerie, puis pose des menuiseries extérieures.",
      en: "Roof frame, roofing and flashings, then exterior windows and doors.",
    },
    jalon: { fr: "Hors d'eau (≈ 60 %) puis hors d'air", en: "Watertight (≈ 60%) then airtight" },
    duree: { fr: "Fin des 4 à 6 mois du gros œuvre", en: "End of the 4 to 6 months of structural work" },
    dem: [],
  },
  "Réseaux & façade": {
    quoi: {
      fr: "Tranchées, fourreaux, tube d'eau, regards, eaux pluviales et remblai au pied des murs, branchements définitifs (électricité, égout ou assainissement individuel), puis enduit ou bardage.",
      en: "Trenches, ducts, water pipe, inspection chambers, rainwater and backfill along the walls, permanent connections (electricity, sewer or private septic system), then render or cladding.",
    },
    jalon: { fr: "Branchements faits + façade finie", en: "Connections done + façade finished" },
    duree: { fr: "Pendant le second œuvre (pas de durée propre dans la conception)", en: "During the interior work (no separate duration in the design)" },
    dem: [
      { quand: { fr: "Branchements", en: "Connections" }, quoi: { fr: "Les concessionnaires posent les branchements définitifs demandés dès le permis", en: "The utilities install the permanent connections requested at permit stage" } },
    ],
  },
  "Second œuvre": {
    quoi: {
      fr: "1re passe électricité, plomberie, chauffage et VMC, doublages et pare-vapeur, test d'étanchéité intermédiaire, plafonds et cloisons, soufflage des combles, chapes et séchage.",
      en: "First fix for electrics, plumbing, heating and ventilation, wall linings and vapour barrier, interim airtightness test, ceilings and partitions, blown loft insulation, screeds and drying.",
    },
    jalon: { fr: "Cloisons finies + chape sèche (≈ 75 %)", en: "Partitions finished + screed dry (≈ 75%)" },
    duree: {
      fr: "3 à 4 mois, dont le séchage de la chape (≈ 1 semaine par cm, au moins 7 semaines) : c'est le chemin critique",
      en: "3 to 4 months, including screed drying (≈ 1 week per cm, at least 7 weeks): this is the critical path",
    },
    dem: [
      { quand: { fr: "Avant les plafonds", en: "Before the ceilings" }, quoi: { fr: "Test d'étanchéité à l'air intermédiaire", en: "Interim airtightness test" } },
    ],
  },
  "Finitions & équipements": {
    quoi: {
      fr: "Carrelage et faïence, peinture, sols et plinthes, portes, escalier bois et garde-corps, sanitaires, cuisine.",
      en: "Floor and wall tiling, painting, floors and skirting, doors, wooden staircase and railings, bathroom fittings, kitchen.",
    },
    jalon: { fr: "Équipements posés (≈ 95 %)", en: "Fittings installed (≈ 95%)" },
    duree: { fr: "1 à 2 mois", en: "1 to 2 months" },
    dem: [],
  },
  "Réception & achèvement": {
    quoi: {
      fr: "Consuel puis mise en service du compteur, contrôles RE2020 (test final, VMC, attestation n° 2), attestations argile ou parasismique selon le terrain, nettoyage, réception avec chaque artisan, levée des réserves.",
      en: "Electrical safety certificate (Consuel) then meter activation, RE2020 checks (final test, ventilation, certificate no. 2), clay-soil or seismic certificates depending on the plot, cleaning, handover with each tradesperson, snagging cleared.",
    },
    jalon: { fr: "PV de réception (départ des garanties) puis DAACT déposée", en: "Handover report (warranties start) then completion declaration (DAACT) filed" },
    duree: { fr: "Conformité acquise 3 mois après la DAACT", en: "Compliance granted 3 months after the DAACT" },
    dem: [
      { quand: { fr: "Fin des travaux", en: "End of works" }, quoi: { fr: "Consuel, puis mise en service du compteur définitif", en: "Consuel, then activation of the permanent meter" } },
      { quand: { fr: "Réception", en: "Handover" }, quoi: { fr: "Procès-verbal de réception avec chaque artisan : les garanties démarrent", en: "Handover report signed with each tradesperson: the warranties start" } },
      { quand: { fr: "Après la réception", en: "After handover" }, quoi: { fr: "Déclaration d'achèvement et de conformité (DAACT) en mairie", en: "Completion and compliance declaration (DAACT) filed at the town hall" } },
      { quand: { fr: "Sous 90 jours", en: "Within 90 days" }, quoi: { fr: "Déclaration des éléments d'imposition sur impots.gouv", en: "Property tax declaration on impots.gouv" } },
      { quand: { fr: "Après l'achèvement", en: "After completion" }, quoi: { fr: "Taxe d'aménagement, puis PFAC (égout) ou redevances SPANC", en: "Development tax, then sewer connection levy (PFAC) or septic inspection fees (SPANC)" } },
    ],
  },
};

/** Lots qui ne sont pas « la construction » : études, taxes, assurance, branchements. */
export const LOTS_ANNEXES: ReadonlySet<string> = new Set([
  "Etudes / Conception", "Assurance & ouverture du chantier", "Taxes & participations", "Raccordements aux réseaux",
]);

/** Le TTC en trois morceaux : la construction, les annexes (études, taxes, assurance,
 *  branchements) et la provision pour aléas. `constr + annexes + aleas = totaux.ttc`. */
export function decoupe(devis: Devis): { constr: number; annexes: number; aleas: number } {
  let constr = 0, annexes = 0;
  for (const li of devis.lignes) { if (LOTS_ANNEXES.has(li.corps)) annexes += li.ttc; else constr += li.ttc; }
  return { constr, annexes, aleas: devis.totaux.aleas };
}

/** TTC par phase du chantier neuf (hors aléas), dans l'ordre de `PHASES_NEUF`, à 0 si vide. */
export function parPhase(devis: Devis): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of PHASES_NEUF) m[p] = 0;
  for (const li of devis.lignes) m[li.phase] = (m[li.phase] ?? 0) + li.ttc;
  return m;
}

/**
 * Surcoût d'un sol argileux (aléa moyen) quand la maison est décrite « sans argile » : la MÊME
 * maison, avec `argile: "moyen"`, chiffrée par le moteur, moins le total de départ (TTC). C'est
 * l'avertissement « sans étude de sol » du résultat rapide. Si la maison est déjà décrite sur un
 * sol argileux, le surcoût est déjà compté : 0.
 */
export function surcoutArgile(maison: MaisonNeuve, opts: { finition?: Finition; qui?: QuiRealise; codePostal?: string; aleas?: number } = {}): number {
  if (maison.argile !== "non") return 0;
  const ttc = (m: MaisonNeuve) => { const p = presetMaison(m, opts); return buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc; };
  return ttc({ ...maison, argile: "moyen" }) - ttc(maison);
}

/**
 * Aménagements extérieurs (allée, terrasse, clôture définitive, portail, engazonnement) : hors
 * périmètre de l'estimation, mais on donne l'ordre de grandeur. Montants TTC en euros, pour un
 * terrain de `terrainMin` à `terrainMax` m². L'affichage les formate, aucune page ne les écrit.
 */
export const EXTERIEURS_HORS_PERIMETRE = {
  min: 8000, max: 20000, terrainMin: 600, terrainMax: 800,
  source: "docs/construction-neuve/decisions.md § 5 (recherche « calibrage », décision Dani)",
} as const;

/** Nom par défaut d'un projet neuf : défini dans `brouillon-neuf.ts` (module sans moteur, lu par
 *  `ClaimDraft`), réexporté ici pour la fiche, le PDF et les tests. */
export { nomProjetNeuf } from "./brouillon-neuf";

/** Espace insécable : le nombre et son unité ne se séparent jamais à la ligne. */
const NBSP = " ";
const UNITE_NEUF: Record<"fr" | "en", Record<string, [string, string]>> = {
  // [singulier, pluriel]
  fr: { m2: ["m²", "m²"], m3: ["m³", "m³"], ml: ["ml", "ml"], jour: ["jour", "jours"], u: ["u", "u"] },
  en: { m2: ["m²", "m²"], m3: ["m³", "m³"], ml: ["lin. m", "lin. m"], jour: ["day", "days"], u: ["unit", "units"] },
};

/**
 * Quantité d'une ligne du neuf, lisible : séparateur décimal de la langue, pas de décimale au-delà
 * de 10 (une seule en dessous), unité écrite (« m² », pas « m2 ») et accordée (« 270 jours »),
 * espace insécable. Les quantités du neuf sortent de la géométrie (219,29 m²) : la rénovation,
 * aux quantités saisies, garde son affichage. `location` : la ligne se compte en jours.
 */
export function qteNeuf(locale: string, qty: number, unite: string, location = false): string {
  const l = locale === "en" ? "en" : "fr";
  const q = Number(qty) || 0;
  const txt = q.toLocaleString(l === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: Math.abs(q) >= 10 ? 0 : 1 });
  const u = location ? "jour" : unite;
  const formes = UNITE_NEUF[l][u];
  if (!formes) return txt + NBSP + u;
  // Français : pluriel à partir de 2 (« 1,5 jour ») ; anglais : dès que ce n'est pas 1.
  const pluriel = l === "fr" ? Math.abs(q) >= 2 : Math.round(Math.abs(q) * 10) !== 10;
  return txt + NBSP + formes[pluriel ? 1 : 0];
}

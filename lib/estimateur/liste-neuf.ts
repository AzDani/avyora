/**
 * CONSTRUCTION NEUVE — la liste des postes du détaillé, rangée par CORPS D'ÉTAT comme la rénovation
 * (revue rénovation / neuf, chantier N10 ; décision D1 de Dani du 13/10/2026).
 *
 * Le catalogue du neuf reste écrit dans l'ordre du chantier (`catalog-neuf.json` : 37 blocs pour 24
 * lots, la maçonnerie y revient aux fondations, aux murs puis aux chapes). Le regroupement se fait À
 * L'AFFICHAGE seulement :
 * - chaque lot n'apparaît qu'UNE fois, rangé dans une des 4 grandes phases de la rénovation ;
 * - un lot présent à plusieurs étapes du chantier garde ses postes dans l'ordre du chantier, sous un
 *   sous-titre d'étape (« Fondations & plancher bas », « Murs & planchers »…) ;
 * - les postes qui s'excluent dans un même lot (`GROUPES_EXCLUSIFS_NEUF`) tiennent sur UNE ligne de
 *   choix : la ligne du poste retenu, et ses alternatives en boutons ;
 * - les démarches gratuites sortent de la liste (liste « Démarches », tirée de `INFO_PHASES`), les
 *   taxes, participations et l'assurance aussi (carte « Taxes, assurance et frais ») : les compteurs
 *   de postes ne comptent que les travaux. Une démarche à laquelle on a donné un prix redevient une
 *   ligne de son lot : aucun montant n'est caché.
 *
 * Les clés `key(lot, nom)` ne changent pas : aucune sélection enregistrée ne bouge, aucun total non
 * plus. La chronologie en 9 phases reste là où elle sert : « Mon devis », la fiche et le PDF.
 *
 * Données pures, sans React ni effet : l'écran (`components/neuf/EstimateurNeuf.tsx`) et les tests les
 * lisent. Un groupe exclusif réparti sur plusieurs lots (les murs : l'ossature bois est en charpente ;
 * l'escalier : béton, bois quart tournant, bois) garde chaque poste dans le lot de son corps d'état :
 * le montant d'un lot reste celui de « Mon devis », et cocher l'un décoche toujours l'autre.
 */
import { key, lineHT, visibleTask, type Ctx, type CustomLine, type Lot, type Selection, type Tache } from "./core";
import { CATALOG_NEUF } from "./catalogue-neuf";
import { geometrieNeuf, parpaingAuChoixDesMurs, reponseDuPoste, ID_PARPAING, SEUIL_ARCHITECTE_M2, type MaisonNeuve } from "./neuf";
import { estJalon } from "./projet";
import type { TexteFrEn } from "./etapes-neuf";

/** Un poste du neuf avec SON bloc du catalogue (lot et étape du chantier) : le moteur le chiffre ainsi. */
export interface PosteListeNeuf { l: Lot; t: Tache }

/**
 * Les 4 grandes phases de la rénovation (`PHASES`, même ordre, mêmes noms ; la dernière dit aussi la
 * réception), et les lots du neuf que chacune range, dans l'ordre de la rénovation pour les lots
 * communs. Les noms sont des clés d'affichage (`catT(locale, "phases", nom)`). « Assurance &
 * ouverture du chantier » et « Taxes & participations » ne s'affichent que s'il leur reste une ligne
 * (une démarche à laquelle on a donné un prix, une ligne perso) : leurs frais vont dans la carte.
 */
export const GRANDES_PHASES_NEUF: { nom: string; lots: string[] }[] = [
  { nom: "Préparation", lots: ["Etudes / Conception", "Assurance & ouverture du chantier", "Annexes de chantier", "Location de matériel", "Raccordements aux réseaux"] },
  { nom: "Gros œuvre & clos-couvert", lots: ["Terrassement", "Fondations & soubassement", "Maçonnerie", "Charpente, couverture & structure bois",
    "Couverture & zinguerie", "Menuiseries exterieures", "Réseaux enterrés (VRD)", "Façade"] },
  { nom: "Second œuvre", lots: ["Isolation", "Cloisons / Platrerie", "Electricite", "Plomberie", "Chauffage / VMC", "Carrelage / Revetements", "Peinture", "Menuiseries interieures"] },
  { nom: "Équipements & réception", lots: ["Cuisine", "Contrôles & réception", "Taxes & participations"] },
];

/** Chaque lot du neuf, une seule fois : ses postes de tous ses blocs, dans l'ordre du chantier. */
export const LOTS_NEUF: { c: string; postes: PosteListeNeuf[] }[] = (() => {
  const m = new Map<string, PosteListeNeuf[]>();
  for (const l of CATALOG_NEUF) {
    const postes = m.get(l.c) ?? [];
    for (const t of l.t) postes.push({ l, t });
    m.set(l.c, postes);
  }
  return [...m].map(([c, postes]) => ({ c, postes }));
})();
const PAR_LOT = new Map(LOTS_NEUF.map((x) => [x.c, x.postes]));

/** La première étape du chantier où ce lot intervient (la phase d'une ligne perso ajoutée au lot). */
export function premiereEtapeNeuf(lot: string): string {
  return PAR_LOT.get(lot)?.[0]?.l.p ?? "";
}

/** Une démarche gratuite (dépôt du permis, DT, DAACT…) : hors de la liste des postes. */
export const estDemarcheNeuf = (t: Tache): boolean => estJalon(t);
/** Une taxe, une participation ou l'assurance dommages-ouvrage : un frais qui a un prix. Carte à part. */
export const estFraisNeuf = (t: Tache): boolean => !!t.frais && !estJalon(t);

/** Clés d'ouverture des deux cartes hors liste, à côté des noms de lot (`open`, brouillon). */
export const CARTE_FRAIS = "$frais";
export const CARTE_DEMARCHES = "$demarches";

/** Les postes de la carte « Taxes, assurance et frais », dans l'ordre du catalogue. */
export const POSTES_FRAIS_NEUF: PosteListeNeuf[] = CATALOG_NEUF.flatMap((l) => l.t.filter(estFraisNeuf).map((t) => ({ l, t })));

// ── Lignes de choix ──────────────────────────────────────────────────────────────────────────────
export interface AlternativeNeuf { id: string; court: TexteFrEn }
/** Une ligne de choix : les postes d'un groupe exclusif rangés dans le MÊME lot, dans l'ordre des boutons. */
export interface LigneChoixNeuf { cle: string; lot: string; titre: TexteFrEn; alternatives: AlternativeNeuf[] }

const alt = (id: string, fr: string, en: string): AlternativeNeuf => ({ id, court: { fr, en } });

/**
 * Une ligne par groupe exclusif et par lot (`GROUPES_EXCLUSIFS_NEUF`, vérifié par
 * `tests/neuf-corps-etat.test.ts`) : 16 lignes pour 17 groupes, l'escalier n'ayant qu'un poste par lot.
 * Les libellés courts des boutons sont ceux du questionnaire quand la réponse existe. Une alternative
 * hors groupe : le parpaing des murs (la réponse par défaut), qui porte aussi le garage — quand il ne
 * porte que lui, il est une ligne à part et son bouton choisit les murs en parpaing (`elementsLotNeuf`).
 */
export const LIGNES_CHOIX_NEUF: LigneChoixNeuf[] = [
  { cle: "etude-sol", lot: "Etudes / Conception", titre: { fr: "Étude de sol", en: "Soil study" }, alternatives: [
    alt("etu-etude-de-sol-g2-avp", "G2 avant-projet", "G2 pre-design"), alt("etu-etude-de-sol-g1", "G1 préalable", "G1 preliminary")] },
  { cle: "permis", lot: "Etudes / Conception", titre: { fr: "Plans et permis", en: "Plans and permit" }, alternatives: [
    alt("etu-dossier-permis-dessinateur", "Dessinateur", "Draftsperson"), alt("etu-architecte-mission-permis", "Architecte", "Architect"),
    alt("etu-maitrise-d-oeuvre-complete", "Maîtrise d'œuvre complète", "Full project management")] },
  { cle: "eaux-usees", lot: "Raccordements aux réseaux", titre: { fr: "Eaux usées", en: "Wastewater" }, alternatives: [
    alt("rac-raccordement-au-tout-a-l-egout", "Tout-à-l'égout", "Mains sewer"), alt("rac-assainissement-fosse-toutes-eaux-5-eh", "Fosse toutes eaux", "Septic tank"),
    alt("rac-assainissement-micro-station-5-eh", "Micro-station", "Micro treatment plant")] },
  { cle: "plancher-bas", lot: "Fondations & soubassement", titre: { fr: "Plancher bas", en: "Ground floor" }, alternatives: [
    alt("fon-dalle-terre-plein-isolee", "Dalle sur terre-plein", "Slab on grade"), alt("fon-vide-sanitaire-complet", "Vide sanitaire", "Crawl space"),
    alt("fon-sous-sol-enterre", "Sous-sol", "Basement"), alt("fon-radier-general", "Radier général", "Raft foundation")] },
  { cle: "murs", lot: "Maçonnerie", titre: { fr: "Murs extérieurs", en: "Exterior walls" }, alternatives: [
    alt(ID_PARPAING, "Parpaing", "Concrete block"), alt("mac-monter-un-mur-en-brique", "Brique", "Brick"), alt("mac-mur-brique-monomur", "Brique monomur", "Insulating brick"),
    alt("mac-mur-beton-cellulaire-20-cm", "Béton cellulaire 20 cm", "Aerated concrete 20 cm"), alt("mac-mur-beton-cellulaire-30-cm", "Béton cellulaire 30 cm", "Aerated concrete 30 cm")] },
  { cle: "chape", lot: "Maçonnerie", titre: { fr: "Chape", en: "Screed" }, alternatives: [
    alt("mac-chape-liquide", "Liquide", "Self-leveling"), alt("mac-chape-traditionnelle", "Traditionnelle", "Traditional")] },
  { cle: "charpente", lot: "Charpente, couverture & structure bois", titre: { fr: "Charpente", en: "Roof frame" }, alternatives: [
    alt("toi-charpente-en-fermettes-hors-couverture", "Fermettes", "Trusses"), alt("toi-charpente-traditionnelle-hors-couverture", "Traditionnelle", "Traditional")] },
  { cle: "couverture", lot: "Couverture & zinguerie", titre: { fr: "Couverture", en: "Roofing" }, alternatives: [
    alt("cou-couverture-tuiles-terre-cuite", "Tuiles terre cuite", "Clay tiles"), alt("cou-couverture-tuiles-beton", "Tuiles béton", "Concrete tiles"),
    alt("cou-couverture-ardoise-naturelle", "Ardoise", "Slate"), alt("cou-couverture-ardoise-fibres-ciment", "Ardoise fibres-ciment", "Fiber-cement slate"),
    alt("cou-couverture-bac-acier", "Bac acier", "Steel sheet"), alt("cou-couverture-zinc-joint-debout", "Zinc", "Zinc"),
    alt("cou-toiture-terrasse-isolee", "Toit-terrasse", "Flat roof")] },
  { cle: "gouttieres", lot: "Couverture & zinguerie", titre: { fr: "Gouttières", en: "Gutters" }, alternatives: [
    alt("cou-gouttiere-zinc", "Zinc", "Zinc"), alt("cou-gouttiere-pvc", "PVC", "PVC"), alt("cou-gouttiere-alu-continu", "Alu continu", "Seamless aluminum")] },
  { cle: "sous-face", lot: "Couverture & zinguerie", titre: { fr: "Sous-face des débords", en: "Eave soffits" }, alternatives: [
    alt("cou-sous-face-pvc", "PVC", "PVC"), alt("cou-sous-face-bois", "Bois", "Wood")] },
  { cle: "volets", lot: "Menuiseries exterieures", titre: { fr: "Volets", en: "Shutters" }, alternatives: [
    alt("mex-volets-roulants", "Roulants", "Roller"), alt("mex-volets-battants", "Battants", "Hinged")] },
  { cle: "facade", lot: "Façade", titre: { fr: "Façade", en: "Façade" }, alternatives: [
    alt("fac-enduit-monocouche-machine", "Enduit", "Render"), alt("fac-bardage", "Bardage bois", "Wood cladding"),
    alt("fac-bardage-composite", "Bardage composite", "Composite cladding"), alt("fac-isolation-par-l-exterieur-ite", "Isolation par l'extérieur", "Exterior insulation")] },
  { cle: "isolation-murs", lot: "Isolation", titre: { fr: "Isolation des murs", en: "Wall insulation" }, alternatives: [
    alt("iso-doublage-isolant-colle", "Doublage collé", "Bonded lining"), alt("iso-isolation-des-murs-par-l-interieur", "Par l'intérieur (ITI)", "Interior insulation")] },
  { cle: "chauffage", lot: "Chauffage / VMC", titre: { fr: "Pompe à chaleur", en: "Heat pump" }, alternatives: [
    alt("cha-pompe-a-chaleur-air-eau", "Air/eau", "Air-to-water"), alt("cha-climatisation-gainable-reversible", "Air/air gainable", "Ducted air-to-air")] },
  { cle: "sols", lot: "Carrelage / Revetements", titre: { fr: "Sols des pièces sèches", en: "Dry-room floors" }, alternatives: [
    alt("rev-sol-stratifie-imitation-bois", "Stratifié", "Laminate"), alt("rev-parquet-bois", "Parquet", "Hardwood"), alt("rev-sol-souple-pvc-lino", "Sol souple", "Vinyl")] },
  { cle: "douche", lot: "Plomberie", titre: { fr: "Douche", en: "Shower" }, alternatives: [
    alt("plo-bac-de-douche", "Bac", "Tray"), alt("plo-douche-a-l-italienne", "À l'italienne", "Walk-in")] },
];

const LIGNE_DE = new Map<string, LigneChoixNeuf>();
for (const g of LIGNES_CHOIX_NEUF) for (const a of g.alternatives) LIGNE_DE.set(a.id, g);
/** La ligne de choix d'un poste, s'il en a une. */
export const ligneChoixDe = (id: string): LigneChoixNeuf | undefined => LIGNE_DE.get(id);

const TOIT_PLAT = "cou-toiture-terrasse-isolee";
const COUVERTURES_EN_PENTE = new Set((LIGNES_CHOIX_NEUF.find((g) => g.cle === "couverture")?.alternatives ?? []).map((a) => a.id).filter((id) => id !== TOIT_PLAT));

/** Pourquoi l'alternative ne peut pas être choisie pour cette maison : le dossier de permis par un
 *  dessinateur au-delà de 150 m² de surface de plancher (l'architecte y est obligatoire) ; une couverture
 *  qui ne va pas avec la toiture décrite (le toit-terrasse sur un toit à pans, des tuiles sur un toit
 *  plat : la toiture se change dans le questionnaire, elle décide aussi de la charpente et des combles). */
export function raisonIndisponibleNeuf(m: MaisonNeuve, id: string): "architecte" | "toiture" | null {
  if (id === "etu-dossier-permis-dessinateur" && geometrieNeuf(m).SP > SEUIL_ARCHITECTE_M2) return "architecte";
  if (id === TOIT_PLAT ? m.toiture !== "plat" : COUVERTURES_EN_PENTE.has(id) && m.toiture === "plat") return "toiture";
  return null;
}
export const alternativeIndisponibleNeuf = (m: MaisonNeuve, id: string): boolean => raisonIndisponibleNeuf(m, id) != null;

/** Le poste qu'une ligne de choix montre quand aucune alternative n'est cochée (sa case le cocherait) :
 *  parmi celles possibles pour cette maison, celle que la réponse de la maison désigne (la couverture
 *  décrite, les murs…), sinon la première. Jamais le dessinateur au-delà de 150 m² : c'est alors
 *  l'architecte ; jamais une couverture qui ne va pas avec la toiture. */
export function alternativeMontreeNeuf(m: MaisonNeuve, membres: PosteListeNeuf[]): PosteListeNeuf {
  const possibles = membres.filter(({ t }) => !alternativeIndisponibleNeuf(m, t.id));
  const reponse = possibles.find(({ t }) => { const r = reponseDuPoste(t.id); return !!r && (m as unknown as Record<string, unknown>)[r.k] === r.v; });
  return reponse ?? possibles[0] ?? membres[0];
}

// ── Ce qu'un lot affiche ─────────────────────────────────────────────────────────────────────────
export type ElementLotNeuf =
  | { type: "etape"; phase: string }
  | { type: "note"; l: Lot }
  | { type: "poste"; p: PosteListeNeuf }
  /** `membres` : les postes de la ligne (ses rangées, son compte) ; `boutons` : toutes ses alternatives,
   *  le parpaing compris quand il est une ligne à part (il ne porte alors que le garage). */
  | { type: "choix"; ligne: LigneChoixNeuf; membres: PosteListeNeuf[]; boutons: PosteListeNeuf[] };

/** Le poste reste-t-il dans la liste des travaux ? Ni frais (carte), ni démarche gratuite (liste
 *  « Démarches ») ; une démarche à laquelle on a donné un prix redevient une ligne. */
export function posteDansListeNeuf(ctx: Ctx, sel: Selection, { l, t }: PosteListeNeuf): boolean {
  if (!visibleTask(ctx, t) || estFraisNeuf(t)) return false;
  return !estDemarcheNeuf(t) || lineHT(ctx, sel, l, t) > 0;
}

/**
 * Les éléments d'un lot, dans l'ordre du chantier : ses postes, une ligne par groupe d'alternatives (à
 * la place de sa première alternative), la note de chaque bloc du catalogue devant ses postes, et un
 * sous-titre d'étape devant chaque étape quand le lot en a plusieurs. Un lot sans poste n'a aucun
 * élément : il ne s'affiche pas (sauf s'il a des lignes perso). Le parpaing qui ne porte que le garage
 * d'une maison aux autres murs (`parpaingAuChoixDesMurs`) est une ligne à part ; la ligne des murs garde
 * son bouton.
 */
export function elementsLotNeuf(ctx: Ctx, sel: Selection, lot: string): ElementLotNeuf[] {
  const m = ctx.neuf as MaisonNeuve | undefined;
  const surLaLigne = (id: string) => id !== ID_PARPAING || !m || parpaingAuChoixDesMurs(m);
  const postes = (PAR_LOT.get(lot) ?? []).filter((p) => posteDansListeNeuf(ctx, sel, p));
  const plusieursEtapes = new Set(postes.map((p) => p.l.p)).size > 1;
  const out: ElementLotNeuf[] = [];
  const vues = new Set<string>();
  let bloc: Lot | null = null;
  for (const p of postes) {
    const ligne = ligneChoixDe(p.t.id);
    const dansLigne = !!ligne && ligne.lot === lot && surLaLigne(p.t.id);
    if (dansLigne && vues.has(ligne.cle)) continue;
    if (p.l !== bloc) {
      if (plusieursEtapes && p.l.p !== bloc?.p) out.push({ type: "etape", phase: p.l.p });
      if (p.l.note) out.push({ type: "note", l: p.l });
      bloc = p.l;
    }
    if (dansLigne) {
      vues.add(ligne.cle);
      const boutons = ligne.alternatives.map((a) => postes.find((x) => x.t.id === a.id)).filter((x): x is PosteListeNeuf => !!x);
      const membres = boutons.filter((x) => surLaLigne(x.t.id));
      out.push(boutons.length > 1 ? { type: "choix", ligne, membres, boutons } : { type: "poste", p });
    } else out.push({ type: "poste", p });
  }
  return out;
}

/**
 * Où vont les notes des blocs d'un lot (N11) : elles ne s'écrivent plus dans la liste, elles sont en
 * infobulle. Chaque note va au sous-titre d'étape qui la précède (un lot présent à plusieurs étapes), sinon
 * à l'en-tête du lot (un lot d'une seule étape, même s'il a plusieurs blocs : l'isolation, les sols). Les
 * notes sont les chaînes du catalogue (clés de traduction, `catT(locale, "notes", note)`).
 */
export function notesDuLotNeuf(elements: ElementLotNeuf[]): { entete: string[]; etapes: Record<string, string[]> } {
  const entete: string[] = [];
  const etapes: Record<string, string[]> = {};
  let etape: string | null = null;
  for (const e of elements) {
    if (e.type === "etape") etape = e.phase;
    else if (e.type === "note" && e.l.note) (etape ? (etapes[etape] ??= []) : entete).push(e.l.note);
  }
  return { entete, etapes };
}

/** Les postes d'éléments de lot (une ligne de choix : toutes ses alternatives). */
export function postesDesElements(elements: ElementLotNeuf[]): PosteListeNeuf[] {
  return elements.flatMap((e) => (e.type === "poste" ? [e.p] : e.type === "choix" ? e.membres : []));
}

/** Postes cochés d'éléments de lot : le compteur d'un lot (les travaux seulement). */
export function postesCochesNeuf(sel: Selection, elements: ElementLotNeuf[]): number {
  return postesDesElements(elements).filter(({ l, t }) => !!sel[key(l.c, t.n)]?.on).length;
}

/** Les lots qui s'affichent, dans l'ordre du catalogue : ceux qui ont une ligne (un poste de travaux, une
 *  démarche à laquelle on a donné un prix) ou une ligne perso. */
export function lotsAffichesNeuf(ctx: Ctx, sel: Selection, custom: CustomLine[]): string[] {
  return LOTS_NEUF.map(({ c }) => c).filter((c) => elementsLotNeuf(ctx, sel, c).length > 0 || custom.some((x) => x.lot === c));
}

/** Ce que « Tout déplier » ouvre : les lots affichés et les deux cartes. */
export function ouvrablesNeuf(ctx: Ctx, sel: Selection, custom: CustomLine[]): string[] {
  return [...lotsAffichesNeuf(ctx, sel, custom), CARTE_FRAIS, CARTE_DEMARCHES];
}

/**
 * Brouillon d'avant N10 : ses lots ouverts étaient des INDEX de bloc (`open: { 3: true }`) ; ils
 * deviennent le nom de leur lot. Les noms de lot connus et les deux cartes (`$frais`, `$demarches`)
 * passent tels quels ; le reste (phases ouvertes de N3, valeurs absurdes) est oublié.
 */
export function ouvertsDepuisBrouillon(open: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!open || typeof open !== "object" || Array.isArray(open)) return out;
  for (const [k, v] of Object.entries(open as Record<string, unknown>)) {
    if (v !== true) continue;
    if (/^\d+$/.test(k)) { const l = CATALOG_NEUF[Number(k)]; if (l) out[l.c] = true; }
    else if (PAR_LOT.has(k) || k === CARTE_FRAIS || k === CARTE_DEMARCHES) out[k] = true;
  }
  return out;
}

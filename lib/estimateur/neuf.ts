/**
 * CONSTRUCTION NEUVE — la maison à construire, et ce qu'on en déduit.
 *
 * Un projet de construction ne part pas d'un logement existant qu'on mesure : il part d'une
 * DESCRIPTION (surface, niveaux, forme, garage, plancher bas, murs, toiture, chauffage…). Ce
 * fichier en tire, de façon déterministe :
 *
 * 1. la GÉOMÉTRIE de la maison (`geometrieNeuf`) : emprise, périmètre, surfaces de murs, de
 *    toiture, de façade, longueur de fondations, nombre de menuiseries… ;
 * 2. la QUANTITÉ de chaque poste (`quantitesNeuf`) — c'est l'`autoQty` du neuf ;
 * 3. les postes que la description COCHE ou DÉCOCHE (`decisionsNeuf`) : un plancher bas en dalle
 *    coche la dalle et décoche le vide sanitaire, des murs en ossature bois décochent les linteaux.
 *
 * Les formules et leurs justifications sont dans le dossier de conception du neuf (ratios sourcés
 * ou raisonnés, marqués comme tels). Aucun prix ici : les prix sont au catalogue, lus par le moteur.
 *
 * Ce fichier n'importe RIEN du moteur à l'exécution (seulement des types) : le moteur l'appelle
 * depuis `autoQty`, et l'inverse créerait un cycle.
 */
import { POSTE_NEUF } from "./catalogue-neuf";
import type { Ctx, Selection } from "./core";

export type Niveaux = "pp" | "etage" | "combles";
export interface MaisonNeuve {
  surface: number;                 // surface habitable (m²)
  niveaux: Niveaux;                // plain-pied, à étage, combles aménagés
  forme: "rect" | "L" | "complexe";
  garage: number;                  // surface intérieure du garage accolé (m²), 0 = sans garage
  chambres: number; sdb: number; wc: number;
  plancherBas: "terre-plein" | "vide-sanitaire" | "sous-sol";
  murs: "parpaing" | "brique" | "monomur" | "cellulaire" | "ossature";
  toiture: "2pans" | "4pans" | "plat";
  penteFaible: boolean;            // toit peu pentu (≈ 17°, tuiles canal du Sud) au lieu de ≈ 35°
  couverture: "terre-cuite" | "beton" | "ardoise" | "ardoise-fibro" | "bac-acier" | "zinc";
  gouttiere: "zinc" | "pvc" | "alu";
  facade: "enduit" | "bardage-bois" | "bardage-composite";
  chauffage: "pac-eau" | "pac-air" | "poele";
  vmc: "simple" | "double";
  escalier: "bois" | "beton";
  assainissement: "collectif" | "fosse" | "micro";
  eauxPluviales: "infiltration" | "reseau";
  terrain: "plat" | "pente";
  argile: "non" | "moyen" | "fort";   // aléa retrait-gonflement des argiles (Géorisques)
  sismique: 1 | 2 | 3 | 4 | 5;        // zone sismique de la commune (Géorisques)
  viabilise: boolean;              // les réseaux arrivent devant le terrain
  distanceReseaux: number;         // de la rue (réseaux) à la maison, en mètres
  lotissement: boolean;            // terrain de lotissement : plan topo et bornage fournis par le lotisseur
  borne: boolean;                  // terrain déjà borné (sinon : bornage par un géomètre-expert)
  evacTerreVegetale: boolean;      // évacuer la terre végétale décapée (sinon gardée en tas sur le terrain)
  cuisine: boolean;                // cuisine équipée comprise
  pilotage: "moi" | "moe";         // je coordonne les artisans / je confie une mission complète
  codePostal?: string;
}

/** Description par défaut : la maison la plus courante (plain-pied, parpaing, dalle, tuiles, PAC). */
export function maisonParDefaut(surface = 100): MaisonNeuve {
  const s = Math.max(30, surface || 100);
  return {
    surface: s, niveaux: s > 110 ? "etage" : "pp", forme: "rect", garage: 0,
    chambres: Math.min(5, Math.max(2, Math.round(s / 30))), sdb: s > 110 ? 2 : 1, wc: s > 110 ? 2 : 1,
    plancherBas: "terre-plein", murs: "parpaing", toiture: "2pans", penteFaible: false, couverture: "terre-cuite", gouttiere: "zinc",
    facade: "enduit", chauffage: "pac-eau", vmc: "simple", escalier: "bois", assainissement: "collectif", eauxPluviales: "infiltration",
    terrain: "plat", argile: "non", sismique: 1, viabilise: true, distanceReseaux: 15, lotissement: false, borne: true,
    evacTerreVegetale: false, cuisine: true, pilotage: "moi",
  };
}

/** Bornes des réponses chiffrées, celles du détaillé (garage 10-80 m², distance 0-200 m). Une
 *  valeur venue d'un plan, d'un brouillon ou de l'API ne les dépasse pas. */
export const GARAGE_MAX = 80;
export const DISTANCE_RESEAUX_MAX = 200;

/** Réponses à choix : une valeur hors liste (brouillon trafiqué, ancienne version) garde le défaut. */
const CHOIX: Partial<Record<keyof MaisonNeuve, readonly unknown[]>> = {
  niveaux: ["pp", "etage", "combles"], forme: ["rect", "L", "complexe"],
  plancherBas: ["terre-plein", "vide-sanitaire", "sous-sol"], murs: ["parpaing", "brique", "monomur", "cellulaire", "ossature"],
  toiture: ["2pans", "4pans", "plat"], couverture: ["terre-cuite", "beton", "ardoise", "ardoise-fibro", "bac-acier", "zinc"],
  gouttiere: ["zinc", "pvc", "alu"], facade: ["enduit", "bardage-bois", "bardage-composite"], chauffage: ["pac-eau", "pac-air", "poele"],
  vmc: ["simple", "double"], escalier: ["bois", "beton"], assainissement: ["collectif", "fosse", "micro"],
  eauxPluviales: ["infiltration", "reseau"], terrain: ["plat", "pente"], argile: ["non", "moyen", "fort"], pilotage: ["moi", "moe"],
};

/**
 * Complète une description partielle (anciens projets, saisie en cours) avec les valeurs par défaut.
 * Une réponse vide (undefined, NaN — un champ effacé) ne remplace jamais une valeur par défaut :
 * sinon les quantités qui en dépendent passeraient à NaN et sortiraient du total sans rien dire.
 * Une réponse d'un autre type que le défaut (texte au lieu d'un nombre…), hors des choix possibles,
 * ou une clé inconnue est ignorée ; les nombres sont ramenés dans les bornes du formulaire.
 * Pour toute saisie faite par les formulaires, le résultat est le même qu'avant ces contrôles.
 */
export function maisonComplete(h: Partial<MaisonNeuve> | undefined | null): MaisonNeuve {
  const surfaceSaisie = h?.surface != null && Number.isFinite(h.surface) ? h.surface : undefined;
  const d = maisonParDefaut(surfaceSaisie);
  const m = { ...d } as MaisonNeuve & Record<string, unknown>;
  const src = h && typeof h === "object" ? h : {};
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null || (typeof v === "number" && !Number.isFinite(v))) continue;
    if (k === "codePostal") { if (typeof v === "string") m.codePostal = v; continue; }
    if (!Object.hasOwn(d, k) || typeof v !== typeof (d as unknown as Record<string, unknown>)[k]) continue;
    const choix = CHOIX[k as keyof MaisonNeuve];
    if (choix && !choix.includes(v)) continue;
    m[k] = v;
  }
  const entier = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));
  m.surface = Math.min(1000, Math.max(30, m.surface));
  m.chambres = entier(m.chambres, 0, 10);
  m.sdb = entier(m.sdb, 1, 6);
  m.wc = entier(m.wc, 1, 6);
  m.garage = Math.min(GARAGE_MAX, Math.max(0, m.garage));
  m.distanceReseaux = Math.min(DISTANCE_RESEAUX_MAX, Math.max(0, m.distanceReseaux));
  m.sismique = entier(m.sismique, 1, 5) as MaisonNeuve["sismique"];
  if (m.murs === "ossature" && !(src as Partial<MaisonNeuve>).facade) m.facade = "bardage-bois";
  // Des combles aménagés supposent un toit en pente : sous un toit plat, l'étage est un vrai étage.
  if (m.toiture === "plat" && m.niveaux === "combles") m.niveaux = "etage";
  return m;
}

export interface GeometrieNeuf {
  SH: number; SP: number; shRdc: number; shHaut: number;
  E: number; L: number; l: number; P: number; angles: number;
  G: number; gw: number; gd: number; Lg3: number; Etot: number; Ptot: number;
  toiture: number; pente: number; proj: number; pignons: number; rampantsPignons: number; raccords: number;
  egout: number; hEgout: number; nDesc: number; mlDesc: number;
  nBaie: number; nPF: number; nFen: number; nVR: number; aOuv: number;
  mursExtNet: number; refends: number; Lref: number; mursGarage: number; Lsem: number; nNivMac: number;
  Pint: number; doublage: number; plafonds: number; rampants: number; shSousComblesPerdus: number;
  hydro: number; cloisons: number; faience: number; facadeBrute: number; facadeNette: number;
  piecesEff: number; nPortesInt: number; decapage: number; plancherEtage: number; dalleInt: number; moisChantier: number;
}

/** Géométrie de la maison (voir le modèle géométrique du dossier de conception). */
export function geometrieNeuf(h: MaisonNeuve): GeometrieNeuf {
  const SH = Math.max(1, h.surface);
  const niv = h.niveaux;
  const shRdc = niv === "pp" ? SH : niv === "etage" ? SH / 2 : SH / 1.7;
  const shHaut = niv === "pp" ? 0 : SH - shRdc;
  const E = shRdc / 0.86;                                   // emprise extérieure (murs + cloisons ≈ 14 %)
  const kP = { rect: 1, L: 1.12, complexe: 1.25 }[h.forme];
  const l = Math.sqrt(E / 1.3), L = 1.3 * l;                // rectangle équivalent 1,3 : 1
  const P = kP * 2 * (L + l);
  const angles = { rect: 4, L: 6, complexe: 8 }[h.forme];
  const SP = (SH * 0.875) / 0.86;                           // surface de plancher ≈ 1,017 × surface habitable
  const G = Math.max(0, h.garage || 0);
  const Eg = G * 1.1, gw = 4.4, gd = G ? Eg / gw : 0, Lg3 = G ? 2 * gd + gw : 0; // 3 murs, le 4ᵉ est la maison
  const Etot = E + Eg, Ptot = P + 2 * gd;
  const plat = h.toiture === "plat";
  const pente = plat ? 0 : niv === "combles" ? 45 : h.penteFaible ? 17 : 35;
  const rad = (pente * Math.PI) / 180, tan = Math.tan(rad), cos = Math.cos(rad);
  const d = plat ? 0 : 0.4;                                 // débord de toit
  const proj = Etot + d * Ptot + 4 * d * d;
  const toiture = plat ? Etot : proj / cos;                 // m² de rampants, débords compris
  const pignons = h.toiture === "2pans" ? (2 * (l * l * tan)) / 4 : 0;
  const rampantsPignons = h.toiture === "2pans" ? (4 * (l / 2)) / cos : 0;
  const arete = Math.sqrt(2 * (l / 2) ** 2 + ((l / 2) * tan) ** 2);
  const noues = { rect: 0, L: 2, complexe: 4 }[h.forme];
  const solinGarage = G && niv !== "pp" && !plat ? gw : 0;  // garage d'un niveau en appentis contre une maison à étage
  const raccords = plat ? 0 : (h.toiture === "4pans" ? L - l + 4 * arete : 0) + noues * arete + solinGarage;
  const egout = plat ? 0 : h.toiture === "4pans" ? Ptot + 8 * d : 0.565 * Ptot + 4 * d;
  const hEgout = niv === "pp" ? 3.0 : niv === "etage" ? 5.7 : 4.0;
  const nDesc = plat ? 2 : Math.max(2, Math.ceil(egout / 11));
  const mlDesc = G && niv !== "pp" ? (nDesc - 1) * hEgout + 2.6 : nDesc * hEgout; // la descente du garage fait 2,6 m
  const ch = h.chambres, sdb = h.sdb, wc = h.wc;
  const nBaie = 1 + (SH >= 130 ? 1 : 0);
  const nPF = niv === "pp" ? Math.max(1, Math.round(ch / 2)) : 1;
  const aOuv = 0.18 * SH;                                    // surface vitrée ≈ 18 % de la surface habitable
  const nFenMin = sdb + wc + 1 + Math.max(0, ch - nPF);      // une fenêtre par pièce sans porte-fenêtre ni baie
  const nFen = Math.max(nFenMin, Math.round((aOuv - 2.2 - 5.16 * nBaie - 2.58 * nPF) / 1.25));
  const nVR = Math.max(0, nFen + nPF + nBaie - (sdb + wc));
  const hMur = niv === "pp" ? 2.7 : niv === "etage" ? 5.4 : 3.7;
  const acroteres = plat ? 0.6 * P : 0;
  const mursExtNet = P * hMur + pignons + acroteres - aOuv;
  const Lref = niv === "pp" ? 0 : L;                          // refend porteur sous le plancher d'étage
  const refends = Lref * 2.7;
  const mursGarage = G ? Lg3 * 2.6 - 4.8 : 0;
  const Lsem = P + Lref + Lg3;
  const nNivMac = niv === "etage" ? 2 : 1;
  const Pint = P - 8 * 0.33;                                  // périmètre intérieur : 8 épaisseurs de mur en moins
  const doublage = niv === "combles" ? Pint * 3.5 + 0.9 * pignons - aOuv : Pint * 2.5 * (niv === "etage" ? 2 : 1) - aOuv;
  const shCombles = niv === "combles" ? shHaut : 0;
  const plafonds = (SH - shCombles) * 1.03 + shCombles * 0.3;
  const rampants = niv === "combles" && !plat ? toiture * 0.75 : 0;
  const shSousComblesPerdus = plat || niv === "combles" ? 0 : niv === "etage" ? shHaut : SH;
  const hydro = 12 * sdb;
  const cloisons = Math.max(0, 0.8 * SH - hydro);
  const faience = 12 * sdb;
  const facadeBrute = P * hEgout + pignons + (G ? Lg3 * 2.8 : 0);
  const grandesOuv = 5.16 * nBaie + 2.58 * nPF + 2.2 + (G ? 4.8 : 0);
  const facadeNette = facadeBrute - grandesOuv;
  const piecesEff = 3 + ch;                                   // séjour + cuisine + couloir + chambres
  const nPortesInt = ch + sdb + wc + 1;
  const decapage = Etot + 2 * Ptot + 16;                      // la maison + 2 m autour
  const plancherEtage = niv === "pp" ? 0 : niv === "etage" ? shHaut / 0.9 : shRdc / 0.9;
  const dalleInt = E - 0.2 * P;
  const moisChantier = h.murs === "ossature" ? 7 : niv === "pp" ? 9 : 10;
  return { SH, SP, shRdc, shHaut, E, L, l, P, angles, G, gw, gd, Lg3, Etot, Ptot, toiture, pente, proj, pignons, rampantsPignons, raccords,
    egout, hEgout, nDesc, mlDesc, nBaie, nPF, nFen, nVR, aOuv, mursExtNet, refends, Lref, mursGarage, Lsem, nNivMac, Pint, doublage, plafonds,
    rampants, shSousComblesPerdus, hydro, cloisons, faience, facadeBrute, facadeNette, piecesEff, nPortesInt, decapage, plancherEtage, dalleInt, moisChantier };
}

/**
 * Surface taxable de la taxe d'aménagement : toutes les surfaces closes et couvertes de plus de
 * 1,80 m sous plafond (art. L331-10 du code de l'urbanisme) — la maison, le garage clos, et un
 * sous-sol, même s'il n'est pas une surface de plancher pour le seuil de l'architecte.
 */
export function surfaceTaxable(h: MaisonNeuve, g: GeometrieNeuf): number {
  return g.SP + g.G + (h.plancherBas === "sous-sol" ? 0.875 * g.E : 0);
}

/** Ce que la description décide pour un poste : coché ou non, et ses variantes. */
export interface DecisionNeuf { on: boolean; vsel?: Record<string, string>; tai?: "petit" | "grand" }

const r2 = (x: number) => Math.max(0, Math.round(x * 100) / 100);
const maconnes = (h: MaisonNeuve) => h.murs !== "ossature";
const etageDe = (h: MaisonNeuve) => h.niveaux !== "pp";
const argileMF = (h: MaisonNeuve) => h.argile === "moyen" || h.argile === "fort";
const idMur = (h: MaisonNeuve) =>
  ({ parpaing: "mac-monter-un-mur-en-parpaings", brique: "mac-monter-un-mur-en-brique", monomur: "mac-mur-brique-monomur", cellulaire: "mac-mur-beton-cellulaire-20-cm", ossature: "" })[h.murs];
const COUVERTURES = { "terre-cuite": "cou-couverture-tuiles-terre-cuite", beton: "cou-couverture-tuiles-beton", ardoise: "cou-couverture-ardoise-naturelle",
  "ardoise-fibro": "cou-couverture-ardoise-fibres-ciment", "bac-acier": "cou-couverture-bac-acier", zinc: "cou-couverture-zinc-joint-debout" } as const;
const GOUTTIERES = { zinc: "cou-gouttiere-zinc", pvc: "cou-gouttiere-pvc", alu: "cou-gouttiere-alu-continu" } as const;
const FACADES = { enduit: "fac-enduit-monocouche-machine", "bardage-bois": "fac-bardage", "bardage-composite": "fac-bardage-composite" } as const;
const idfCp = (cp?: string) => /^(75|77|78|91|92|93|94|95)/.test((cp || "").replace(/\D/g, ""));

/**
 * Quantité de chaque poste du neuf, par identifiant. Une quantité ne dépend que de la maison —
 * jamais de ce qui est coché — : un poste que l'utilisateur coche lui-même (une gouttière PVC à la
 * place du zinc, une isolation sous chape) arrive avec la bonne quantité.
 */
export function quantitesNeuf(h: MaisonNeuve): Record<string, number> {
  const g = geometrieNeuf(h);
  const Q: Record<string, number> = {};
  const q = (id: string, v: number) => { Q[id] = r2(v); };
  const SH = g.SH, sdb = h.sdb, collectif = h.assainissement === "collectif", D = Math.max(0, h.distanceReseaux);
  const etage = etageDe(h), ssol = h.plancherBas === "sous-sol";
  // Études & permis
  q("etu-architecte-mission-permis", g.SP);
  // Terrain & terrassement
  q("anx-wc-de-chantier", g.moisChantier * 30);
  for (const id of ["ter-debroussaillage", "ter-decapage-terre-vegetale"]) q(id, g.decapage);
  q("ter-fouilles-en-rigole", g.Lsem);
  q("ter-fouilles-en-pleine-masse", 0.5 * g.Etot);                // décaissement d'un terrain en pente (le sous-sol comprend le sien)
  const vFouilles = 0.4 * (ssol ? g.Lg3 : g.Lsem);
  q("ter-evacuation-des-terres", 1.3 * 0.5 * vFouilles + (h.evacTerreVegetale ? 1.3 * 0.25 * g.decapage : 0));
  q("ter-remblai-peripherique", 0.25 * g.Ptot);
  q("ter-apport-remblai-grave", 0.3 * g.Etot);
  // Fondations & plancher bas
  q("mac-semelle-de-fondation-50-25-30-cm", ssol ? g.Lg3 : g.Lsem);
  for (const id of ["fon-beton-de-proprete", "fon-semelle-filante-beton-arme-seul", "fon-mur-de-soubassement", "fon-arase-etanche"]) q(id, g.Lsem);
  q("fon-drain-peripherique", g.Ptot);
  for (const id of ["fon-dalle-terre-plein-isolee", "fon-vide-sanitaire-complet"]) q(id, g.dalleInt);
  for (const id of ["fon-sous-sol-enterre", "fon-radier-general"]) q(id, g.E);
  q("fon-dalle-garage-non-isolee", g.G);
  // Murs & planchers
  const mursMaison = g.mursExtNet + g.refends;
  for (const id of ["mac-monter-un-mur-en-brique", "mac-mur-brique-monomur", "mac-mur-beton-cellulaire-20-cm", "mac-mur-beton-cellulaire-30-cm"]) q(id, mursMaison);
  q("mac-monter-un-mur-en-parpaings", (h.murs === "parpaing" ? mursMaison : 0) + g.mursGarage); // le garage est toujours en parpaing
  if (maconnes(h)) {
    q("mac-chainage-horizontal", g.P + g.rampantsPignons + g.Lg3 + g.Lref + (etage ? g.P : 0));     // + ceinture du plancher d'étage
    q("mac-raidisseur-chainage-vertical", g.angles * g.nNivMac + 2 * g.nBaie + (g.G ? 4 : 0) + (h.sismique >= 3 ? Math.ceil(g.P / 5) * g.nNivMac : 0));
    q("mac-linteau-beton-arme", g.nFen + g.nPF + 2 * g.nBaie + 1 + (g.G ? 2 : 0) + (etage ? 2 : 0)); // baie = 2 ; garage : porte + communication
  } else {
    // maison en ossature bois : seul le garage est maçonné — ses chaînages, ses angles, ses deux portes
    q("mac-chainage-horizontal", g.Lg3);
    q("mac-raidisseur-chainage-vertical", g.G ? 4 : 0);
    q("mac-linteau-beton-arme", g.G ? 2 : 0);
  }
  q("mac-appui-fenetre-seuil-prefabrique", g.nFen + g.nPF + 2 * g.nBaie + 1);
  q("mac-rupteurs-thermiques-plancher", g.P);
  q("mac-plancher-beton-etage-cree", (maconnes(h) && etage ? g.plancherEtage : 0) + (h.toiture === "plat" && maconnes(h) ? g.Etot : 0) + (ssol ? g.dalleInt : 0));
  q("toi-mur-ossature-bois-isole", g.mursExtNet);
  q("toi-mur-en-ossature-bois", g.refends);
  // plancher d'étage en bois ; en ossature bois sous un toit plat, il porte aussi la toiture-terrasse
  q("toi-creer-un-plancher-bois", g.plancherEtage + (!maconnes(h) && h.toiture === "plat" ? g.Etot : 0));
  q("toi-garde-corps", 3);
  // Clos & couvert
  for (const id of ["toi-charpente-en-fermettes-hors-couverture", "toi-charpente-traditionnelle-hors-couverture", ...Object.values(COUVERTURES)]) q(id, g.toiture);
  q("toi-fenetre-de-toit-velux", Math.ceil(g.shHaut / 15));
  q("toi-raccords-faitage-noues-solins", g.raccords);
  q("cou-toiture-terrasse-isolee", g.Etot);
  q("toi-toit-plat-etancheite", g.G * 1.1);                    // option : garage à toit plat, non chauffé, non isolé
  q("cou-couvertine-acrotere", g.Ptot);
  for (const id of Object.values(GOUTTIERES)) q(id, g.egout);
  q("cou-descente-eaux-pluviales", g.mlDesc);
  for (const id of ["cou-sous-face-pvc", "cou-sous-face-bois"]) q(id, g.egout * 0.45);
  q("mex-fenetres", g.nFen); q("mex-portes-fenetres", g.nPF); q("mex-baie-vitree", g.nBaie);
  q("mex-volets-roulants", g.nVR); q("mex-volets-battants", g.nVR);
  // Réseaux & façade
  const infiltration = h.eauxPluviales === "infiltration";
  const Deu = collectif ? D : 12;
  q("vrd-tranchee-reseaux", D + Deu + 0.5 * g.Ptot + (infiltration ? 10 : D));
  q("vrd-fourreaux-arrivees", D);
  q("vrd-tube-pehd-eau-potable", D);
  q("vrd-canalisation-pvc-enterree", Deu + 0.5 * g.Ptot + (infiltration ? 10 : D));
  q("vrd-regard-de-visite", g.nDesc + (collectif ? 2 : 3));     // en tout-à-l'égout, le regard en limite est dans le branchement
  q("vrd-puits-infiltration", g.proj > 160 ? 2 : 1);
  q("rac-extension-reseau-electrique-au-metre", Math.max(0, D - 15));
  q("fac-echafaudage-de-facade", h.niveaux === "pp" ? g.pignons : g.facadeBrute); // plain-pied : seuls les pignons
  for (const id of [...Object.values(FACADES), "fac-isolation-par-l-exterieur-ite"]) q(id, g.facadeNette);
  // Second œuvre
  q("ele-installation-electrique-maison-neuve", SH);
  q("plo-reseaux-plomberie-maison-neuve", SH);
  q("plo-chauffe-eau-thermodynamique", 1);
  q("cha-plancher-chauffant-eau-hors-chape", SH);
  for (const id of ["mac-chape-liquide", "mac-chape-traditionnelle"]) q(id, SH);
  q("cha-conduit-de-fumee-isole", etage ? 8.5 : 6);
  q("cha-radiateurs-electriques", h.chambres);
  q("cha-ventilation-vmc", 1);
  q("cha-seche-serviette", sdb);
  for (const id of ["iso-doublage-isolant-colle", "iso-isolation-des-murs-par-l-interieur"]) q(id, g.doublage);
  q("clo-doubler-un-mur", (maconnes(h) ? 0 : g.doublage) + 2 * g.refends);     // parement de l'ossature bois + 2 faces du refend
  for (const id of ["iso-pose-d-un-pare-vapeur", "iso-isolation-des-combles-perdus-soufflage"]) q(id, g.shSousComblesPerdus * 1.03);
  q("iso-isolation-des-combles-amenages-rampants", g.rampants);
  q("iso-isolant-sous-chape", g.shRdc);
  q("clo-faux-plafond", g.plafonds);
  q("clo-monter-une-cloison", g.cloisons);
  q("clo-cloison-piece-humide-hydrofuge", g.hydro);
  q("clo-trappe-de-visite", 1);
  q("clo-cacher-tuyaux-gaines-coffrage", 2 * 2.7);               // gaine technique (chute, VMC) qui traverse l'étage
  // Finitions & équipements
  q("rev-carrelage-au-sol", 0.6 * SH);
  for (const id of ["rev-sol-stratifie-imitation-bois", "rev-parquet-bois", "rev-sol-souple-pvc-lino"]) q(id, 0.4 * SH);
  q("rev-faience-carrelage-mural", g.faience);
  q("rev-etancheite-sous-carrelage-spec-douche", 6.5 * sdb);
  q("rev-plinthes", 4 * Math.sqrt(SH * g.piecesEff));
  q("pei-peinture-murs-plaques-neuves", g.doublage + 2 * g.refends + 2 * (g.cloisons + g.hydro) - g.faience - 3.4 * g.nPortesInt);
  q("pei-peinture-plafonds-plaques-neuves", g.plafonds + g.rampants);
  q("min-porte-interieure-battante", g.nPortesInt);
  q("plo-wc", h.wc);
  for (const id of ["plo-meuble-vasque", "plo-robinetterie-lavabo", "plo-bac-de-douche", "plo-paroi-de-douche", "plo-colonne-de-douche", "plo-miroir"]) q(id, sdb);
  q("cui-cuisine-complete-neuve-tout-compris", Math.max(2.5, Math.round((SH / 28) * 10) / 10));
  // Réception & taxes
  q("anx-nettoyage-de-fin-de-chantier", SH + g.G);
  const ST = surfaceTaxable(h, g);
  q("tax-taxe-amenagement-100-premiers-m2", Math.min(ST, 100));
  q("tax-taxe-amenagement-au-dela-100-m2", Math.max(0, ST - 100));
  q("tax-taxe-amenagement-stationnement", g.G ? 1 : 2);
  // Ouvrages à l'unité, un par maison
  for (const id of ["etu-panneau-affichage-permis", "mex-porte-d-entree", "mex-porte-de-garage", "mac-escalier-en-beton",
    "min-escalier-bois-quart-tournant", "toi-escalier-en-bois", "cha-poele-a-bois-granules", "min-porte-interieure-ame-pleine"]) q(id, 1);
  return Q;
}

/**
 * Ce que la description coche et décoche. Chaque poste « gouverné » par une réponse apparaît ici
 * avec `on` vrai ou faux : changer une réponse peut donc décocher ce qu'une autre avait coché
 * (passer du parpaing à l'ossature bois retire les linteaux). Les postes absents (options :
 * spots, placards, moquette…) ne sont jamais touchés par la description.
 */
export function decisionsNeuf(h: MaisonNeuve): Record<string, DecisionNeuf> {
  const D: Record<string, DecisionNeuf> = {};
  const regle = (id: string, on: boolean, extra: Omit<DecisionNeuf, "on"> = {}) => { D[id] = { on, ...extra }; };
  const tous = (ids: string[], on = true) => { for (const id of ids) regle(id, on); };
  const g = geometrieNeuf(h);
  const SH = g.SH, mac = maconnes(h), etage = etageDe(h), collectif = h.assainissement === "collectif";
  const moe = h.pilotage === "moe", toitPente = h.toiture !== "plat", ssol = h.plancherBas === "sous-sol";
  const zone = { zone: idfCp(h.codePostal) ? "idf" : "hors-idf" };
  // Études & permis
  regle("etu-plan-topographique", !h.lotissement);
  regle("etu-bornage-du-terrain", !h.lotissement && !h.borne);
  regle("etu-etude-de-sol-g2-avp", true);
  regle("etu-etude-de-sol-g2-pro", h.argile === "fort" || h.terrain === "pente" || ssol);
  regle("etu-maitrise-d-oeuvre-complete", moe);
  regle("etu-architecte-mission-permis", !moe && g.SP > 150);
  regle("etu-dossier-permis-dessinateur", !moe && g.SP <= 150);
  regle("etu-etude-beton-arme", etage || ssol || !toitPente || argileMF(h) || h.sismique >= 3);
  regle("etu-etude-assainissement-individuel-spanc", !collectif);
  tous(["etu-etude-thermique-re2020", "etu-depot-du-permis-de-construire", "etu-panneau-affichage-permis", "etu-demandes-de-raccordement",
    "ass-assurance-dommages-ouvrage", "ass-declaration-ouverture-de-chantier"]);
  // Terrain & terrassement
  tous(["anx-declaration-dt-reseaux", "anx-implantation-par-geometre", "anx-installation-de-chantier", "anx-wc-de-chantier",
    "anx-benne-evacuation-des-gravats", "anx-benne-second-oeuvre", "rac-coffret-tableau-de-chantier-provisoire",
    "rac-mise-en-service-provisoire-enedis", "rac-raccordement-eau-potable", "ter-decapage-terre-vegetale", "ter-remblai-peripherique"]);
  // le prix du sous-sol comprend l'évacuation de ses terres : il ne reste que celles des fondations du garage
  regle("ter-evacuation-des-terres", !ssol || g.G > 0 || h.evacTerreVegetale);
  regle("ter-apport-remblai-grave", h.terrain === "pente");
  regle("ter-fouilles-en-pleine-masse", h.terrain === "pente" && !ssol);
  // Fondations & plancher bas
  regle("mac-semelle-de-fondation-50-25-30-cm", !ssol || g.G > 0);
  tous(["ele-mise-a-la-terre", "fon-reseaux-sous-dallage-poses"]);
  regle("fon-mur-de-soubassement", h.plancherBas === "terre-plein");
  regle("fon-dalle-terre-plein-isolee", h.plancherBas === "terre-plein");
  regle("fon-vide-sanitaire-complet", h.plancherBas === "vide-sanitaire");
  regle("fon-sous-sol-enterre", ssol);
  regle("fon-dalle-garage-non-isolee", g.G > 0);
  regle("fon-drain-peripherique", !ssol && (h.terrain === "pente" || h.argile !== "non"));
  regle("fon-surcout-sol-argileux", argileMF(h), argileMF(h) ? { vsel: { alea: h.argile } } : {});
  // Murs & planchers
  for (const id of ["mac-monter-un-mur-en-brique", "mac-mur-brique-monomur", "mac-mur-beton-cellulaire-20-cm"]) regle(id, mac && idMur(h) === id);
  regle("mac-monter-un-mur-en-parpaings", h.murs === "parpaing" || g.G > 0);
  tous(["mac-chainage-horizontal", "mac-raidisseur-chainage-vertical", "mac-linteau-beton-arme"], mac || g.G > 0);
  regle("mac-appui-fenetre-seuil-prefabrique", mac);
  regle("mac-rupteurs-thermiques-plancher", mac && etage && ["parpaing", "brique", "cellulaire"].includes(h.murs));
  regle("mac-plancher-beton-etage-cree", (mac && etage) || (mac && !toitPente) || ssol);
  regle("toi-mur-ossature-bois-isole", !mac);
  regle("toi-mur-en-ossature-bois", !mac && g.Lref > 0);
  regle("toi-creer-un-plancher-bois", !mac && (etage || !toitPente));
  regle("mac-escalier-en-beton", etage && h.escalier === "beton");
  regle("min-escalier-bois-quart-tournant", etage && h.escalier !== "beton");
  regle("toi-garde-corps", etage);
  // Clos & couvert
  regle("toi-charpente-en-fermettes-hors-couverture", toitPente && h.niveaux !== "combles");
  regle("toi-charpente-traditionnelle-hors-couverture", toitPente && h.niveaux === "combles");
  for (const [k, id] of Object.entries(COUVERTURES)) regle(id, toitPente && k === h.couverture);
  regle("toi-raccords-faitage-noues-solins", toitPente && g.raccords > 0);
  for (const [k, id] of Object.entries(GOUTTIERES)) regle(id, toitPente && k === h.gouttiere);
  regle("cou-sous-face-pvc", toitPente);
  regle("toi-fenetre-de-toit-velux", toitPente && h.niveaux === "combles");
  regle("cou-toiture-terrasse-isolee", !toitPente);
  regle("cou-couvertine-acrotere", !toitPente);
  tous(["cou-descente-eaux-pluviales", "mex-fenetres", "mex-portes-fenetres", "mex-baie-vitree", "mex-porte-d-entree", "mex-volets-roulants"]);
  regle("mex-porte-de-garage", g.G > 0);
  // Réseaux & façade
  const infiltration = h.eauxPluviales === "infiltration";
  tous(["vrd-tranchee-reseaux", "vrd-fourreaux-arrivees", "vrd-tube-pehd-eau-potable", "vrd-canalisation-pvc-enterree", "vrd-regard-de-visite",
    "rac-raccordement-electrique-enedis"]);
  regle("vrd-puits-infiltration", infiltration);
  regle("rac-extension-reseau-electrique-part-fixe", !h.viabilise);
  regle("rac-extension-reseau-electrique-au-metre", !h.viabilise && h.distanceReseaux > 15);
  regle("rac-raccordement-au-tout-a-l-egout", collectif);
  regle("rac-assainissement-fosse-toutes-eaux-5-eh", h.assainissement === "fosse");
  regle("rac-assainissement-micro-station-5-eh", h.assainissement === "micro");
  regle("fac-echafaudage-de-facade", (h.niveaux === "pp" ? g.pignons : g.facadeBrute) > 0);
  for (const [k, id] of Object.entries(FACADES)) regle(id, k === h.facade);
  // Second œuvre
  tous(["ele-installation-electrique-maison-neuve", "plo-reseaux-plomberie-maison-neuve", "cha-seche-serviette", "rec-test-etancheite-intermediaire",
    "clo-faux-plafond", "clo-monter-une-cloison", "clo-cloison-piece-humide-hydrofuge"]);
  regle("plo-chauffe-eau-thermodynamique", true, { tai: h.chambres >= 4 ? "grand" : "petit" });
  const pacEau = h.chauffage === "pac-eau";
  tous(["cha-pompe-a-chaleur-air-eau", "cha-plancher-chauffant-eau-hors-chape", "mac-chape-liquide"], pacEau);
  regle("mac-chape-traditionnelle", !pacEau);
  regle("cha-climatisation-gainable-reversible", h.chauffage === "pac-air", { vsel: { maison: SH > 100 ? "grande" : "moy" } });
  tous(["cha-poele-a-bois-granules", "cha-conduit-de-fumee-isole", "cha-radiateurs-electriques"], h.chauffage === "poele");
  regle("cha-ventilation-vmc", true, { vsel: { flux: h.vmc === "double" ? "double" : "simple" } });
  regle("iso-doublage-isolant-colle", mac && h.murs !== "monomur");
  regle("clo-doubler-un-mur", !mac || g.refends > 0);
  const comblesPerdus = g.shSousComblesPerdus > 0;
  tous(["iso-pose-d-un-pare-vapeur", "iso-isolation-des-combles-perdus-soufflage", "clo-trappe-de-visite"], comblesPerdus);
  regle("iso-isolation-des-combles-amenages-rampants", g.rampants > 0);
  regle("clo-cacher-tuyaux-gaines-coffrage", etage);
  // Finitions & équipements
  tous(["rev-carrelage-au-sol", "rev-faience-carrelage-mural", "rev-etancheite-sous-carrelage-spec-douche", "pei-peinture-murs-plaques-neuves",
    "pei-peinture-plafonds-plaques-neuves", "rev-sol-stratifie-imitation-bois", "rev-plinthes", "min-porte-interieure-battante",
    "plo-wc", "plo-meuble-vasque", "plo-robinetterie-lavabo", "plo-bac-de-douche", "plo-paroi-de-douche", "plo-colonne-de-douche"]);
  regle("min-porte-interieure-ame-pleine", g.G > 0);              // porte pleine entre le garage et la maison
  regle("cui-cuisine-complete-neuve-tout-compris", h.cuisine);
  // Réception & achèvement
  tous(["ele-consuel-attestation-de-conformite", "rec-controles-re2020-fin-de-chantier", "rec-proces-verbal-de-reception",
    "rec-declaration-achevement-daact", "anx-nettoyage-de-fin-de-chantier", "tax-declaration-elements-imposition"]);
  regle("rec-attestation-argile-daact", argileMF(h));
  regle("rec-attestations-parasismiques", h.sismique >= 3);
  regle("tax-taxe-amenagement-100-premiers-m2", true, { vsel: zone });
  regle("tax-taxe-amenagement-au-dela-100-m2", surfaceTaxable(h, g) > 100, { vsel: zone });
  regle("tax-taxe-amenagement-stationnement", true, { vsel: zone });
  regle("tax-pfac-participation-tout-a-l-egout", collectif);
  regle("tax-redevances-spanc-controles", !collectif);
  /* Une réponse limite (aucune distance aux réseaux, aucune chambre avec un poêle) peut donner une
     quantité nulle à un poste que la règle coche : on ne coche pas une ligne vide. */
  const Q = quantitesNeuf(h);
  for (const [id, d] of Object.entries(D)) {
    const u = POSTE_NEUF.get(id)?.t.u;
    if (d.on && u !== "forfait" && u !== "pct" && Q[id] === 0) d.on = false;
  }
  return D;
}

/**
 * Postes qui s'excluent : un seul à la fois dans chaque groupe (conception, § g). Cocher l'un
 * décoche les autres. Le parpaing n'est pas dans le groupe des murs : il porte aussi le garage.
 */
export const GROUPES_EXCLUSIFS_NEUF: string[][] = [
  ["fon-dalle-terre-plein-isolee", "fon-vide-sanitaire-complet", "fon-sous-sol-enterre", "fon-radier-general"],
  ["mac-monter-un-mur-en-brique", "mac-mur-brique-monomur", "mac-mur-beton-cellulaire-20-cm", "mac-mur-beton-cellulaire-30-cm", "toi-mur-ossature-bois-isole"],
  ["toi-charpente-en-fermettes-hors-couverture", "toi-charpente-traditionnelle-hors-couverture"],
  [...Object.values(COUVERTURES), "cou-toiture-terrasse-isolee"],
  Object.values(GOUTTIERES),
  ["cou-sous-face-pvc", "cou-sous-face-bois"],
  ["mex-volets-roulants", "mex-volets-battants"],
  [...Object.values(FACADES), "fac-isolation-par-l-exterieur-ite"],
  ["iso-doublage-isolant-colle", "iso-isolation-des-murs-par-l-interieur"],
  ["etu-dossier-permis-dessinateur", "etu-architecte-mission-permis", "etu-maitrise-d-oeuvre-complete"],
  ["mac-escalier-en-beton", "min-escalier-bois-quart-tournant", "toi-escalier-en-bois"],
  ["rac-raccordement-au-tout-a-l-egout", "rac-assainissement-fosse-toutes-eaux-5-eh", "rac-assainissement-micro-station-5-eh"],
  ["mac-chape-liquide", "mac-chape-traditionnelle"],
  ["rev-sol-stratifie-imitation-bois", "rev-parquet-bois", "rev-sol-souple-pvc-lino"],
  ["plo-bac-de-douche", "plo-douche-a-l-italienne"],
  ["etu-etude-de-sol-g1", "etu-etude-de-sol-g2-avp"],
  ["cha-pompe-a-chaleur-air-eau", "cha-climatisation-gainable-reversible"],
];
/** Les autres postes du (des) groupe(s) exclusif(s) d'un poste. */
export function exclusifsDe(id: string): string[] {
  return GROUPES_EXCLUSIFS_NEUF.filter((g) => g.includes(id)).flat().filter((x) => x !== id);
}

/* La géométrie et les quantités sont recalculées à chaque ligne affichée : on les garde pour une
   description donnée. La clé est la description COMPLÈTE réellement utilisée (surface et code
   postal compris, même s'ils viennent du contexte) : modifier la maison, sur place ou par copie,
   change toujours la clé. */
const CACHE = new Map<string, Record<string, number>>();
const CLE_VERS_ID = new Map<string, string>();
for (const [id, p] of POSTE_NEUF) CLE_VERS_ID.set(p.c + "|" + p.n, id);

/** `autoQty` du neuf : la quantité d'un poste tirée de la maison décrite dans `ctx.neuf`. */
export function autoQtyNeuf(ctx: Ctx, c: string, n: string, _sel: Selection): number | null {
  const id = CLE_VERS_ID.get(c + "|" + n);
  if (!id) return null;
  const h = ctx.neuf ?? null;
  const m = maisonComplete({ ...(h ?? {}), surface: h?.surface ?? ctx.surface, codePostal: h?.codePostal ?? ctx.codePostal });
  const cle = JSON.stringify(m);
  let Q = CACHE.get(cle);
  if (!Q) {
    Q = quantitesNeuf(m);
    if (CACHE.size > 200) CACHE.clear();
    CACHE.set(cle, Q);
  }
  const v = Q[id];
  return v == null ? null : v;
}

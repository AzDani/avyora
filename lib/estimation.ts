import { getPoste, coefRegional } from "./referentiel";
import type { Metre } from "./metre";
import { computeCustomLines, computeSdbLines, CORPS_ORDRE, CORPS_LABEL, type FormConfig, type CustomAnswers, type CustomLine } from "./customq";

export type Reponses = {
  // Type de projet (défaut : rénovation, pour compatibilité anciens projets)
  typeProjet?: "renovation" | "neuf";

  finition: "locatif" | "standard" | "premium" | "luxe";
  curage: "aucun" | "leger" | "complet";
  electricite: "ok" | "partielle" | "totale";
  spotsLumieres?: "non" | "spots" | "luminaires";
  nbPointsLumineux?: number;
  plomberie: "ok" | "reprise" | "complete";
  sdb: "aucune" | "rafraichir" | "complete";
  cuisine: "aucune" | "rafraichir" | "complete";
  sols: "aucun" | "partiel" | "complet";
  solsType: "stratifie" | "carrelage" | "massif" | "beton_cire" | "pvc";
  // Sols détaillés : plusieurs revêtements avec leur surface (mode détaillé)
  solsDetail?: { type: "carrelage" | "stratifie" | "massif" | "beton_cire" | "pvc"; m2: number }[];
  plintheMateriau?: "assorti" | "bois" | "pvc" | "mdf" | "carrelage" | "aucune";
  peinture: "aucune" | "partielle" | "complete";
  fenetres: number;
  menuiserieMateriauFenetre?: "pvc" | "bois" | "alu";
  porteEntree?: "aucune" | "pvc" | "alu" | "bois";
  nbPortesInt?: number;
  cloisons: "aucune" | "quelques" | "beaucoup";
  chauffage: "aucun" | "radiateurs" | "chaudiere" | "pac";
  vmc: boolean;
  nbVmc?: number;
  vmcType?: "simple" | "double";
  reseauxEvac?: boolean;
  nouvelleSurfaceM2?: number;
  plancherType?: "bois" | "beton";
  // Volets roulants intégrés aux fenêtres
  voletRoulant?: boolean;
  voletType?: "manuel" | "electrique" | "solaire";
  // Raccordements / compteurs à créer
  alimElec?: boolean;
  alimEau?: boolean;
  alimGaz?: boolean;

  // Questionnaire expert (l'expérience BTP encodée) — optionnels pour compatibilité
  solSupport?: "dalle_ok" | "carrelage_existant" | "plancher_bois" | "terre_battue";
  mursEtat?: "ok" | "platre_abime" | "pierre_nue";
  humidite?: boolean;

  // ── Diagnostic « état actuel du bien » (réno) — le constat pilote les travaux ──
  // Structure / gros œuvre
  fissuresStructure?: "aucune" | "microfissures" | "traversantes" | "evolutives";
  // Toiture / charpente / couverture
  toitureEtat?: "inconnu" | "bon" | "entretien" | "reprise_partielle" | "refaire";
  charpenteEtat?: "saine" | "traiter" | "renforcer" | "refaire";
  zinguerieAFaire?: boolean; // gouttières / descentes / solins à reprendre
  toitureM2?: number; // emprise couverture (si connue), sinon estimée depuis la surface
  isolationToiture?: boolean; // rampants / sous-toiture à isoler par l'intérieur
  // Enveloppe extérieure — état constaté de l'enduit / du revêtement
  enduitExtEtat?: "sain" | "encrasse" | "microfissures" | "a_piquer" | "brut_sans_revetement";
  // Menuiseries existantes
  menuiseriesEtat?: "bon" | "simple_vitrage" | "vetuste" | "absentes";
  encadrementsEtat?: "bon" | "reprise" | "creer";
  nbEncadrementsReprise?: number; // ouvertures dont l'encadrement/appui/linteau est à reprendre
  // Sols / niveaux
  niveauARattraper?: number; // cm de rehausse jusqu'au niveau fini
  isolationSol?: boolean; // isolation à prévoir sous chape / dalle
  // Humidité — origine constatée
  humiditeSource?: "inconnue" | "remontees" | "infiltration" | "condensation" | "toiture";

  // Doublage isolant des murs par l'intérieur
  doublageMl?: number; // linéaire de murs à doubler (0 = auto selon état des murs)
  isolantType?: "laine_verre" | "laine_roche" | "polystyrene" | "polyurethane" | "biosource";
  isolantEpaisseur?: 100 | 120 | 140 | 160 | 200; // mm

  // Module 2 — avant achat (déterministe : réglementation + diagnostics)
  dpe?: "inconnu" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
  anneeConstruction?: "inconnue" | "avant_1949" | "1949_1974" | "1975_1997" | "apres_1997";

  // Eau chaude sanitaire (réno + neuf)
  ecs?: "inchange" | "ballon_elec" | "thermo" | "chaudiere" | "solaire";

  // Programme du logement (réno détaillée + neuf)
  nbChambres?: number;
  nbSdb?: number;
  nbWc?: number;
  cellier?: boolean;
  buanderie?: boolean;

  // Travaux extérieurs / façade (réno)
  facadeAFaire?: boolean;
  murExtType?: "pierre" | "parpaing" | "brique" | "beton" | "autre";
  murExtEtat?: "bon" | "encrasse" | "fissure" | "degrade";
  facadeReno?: "nettoyage" | "peinture" | "enduit" | "ite";
  facadeM2?: number;

  // Assainissement (réno + neuf)
  assainissement?: "raccorde" | "tout_egout" | "individuel_fosse" | "individuel_micro";

  // Métré manuel optionnel (mode détaillé) — pour être 100 % précis
  cloisonMlManuel?: number;
  facadeMlNote?: string;

  // Niveau d'estimation : rapide (défaut) ou détaillé (fourchettes resserrées ±15 %)
  modeEstimation?: "rapide" | "detaille";

  // Mode détaillé — rénovation
  chapeType?: "traditionnelle" | "liquide";
  carrelageFormat?: "standard" | "grand";
  menuiserieMateriau?: "pvc" | "bois" | "alu";
  cuisineGamme?: "entree" | "milieu" | "haut";
  sdbCarrelageTouteHauteur?: boolean;
  sdbWc?: "suspendu" | "classique" | "aucun";
  sdbVasque?: "simple" | "double";
  sdbDouche?: "italienne" | "standard" | "baignoire" | "douche_et_baignoire";
  sdbPlomberie?: "encastree" | "apparente";
  sdbSecheServiettes?: boolean;
  // Configurateur par salle de bain (mode détaillé) : chaque SDB avec sa taille et son équipement
  sdbConfigs?: {
    surface?: number;
    douche: "italienne" | "standard" | "baignoire" | "douche_et_baignoire";
    wc: "suspendu" | "classique" | "aucun";
    vasque: "simple" | "double";
    plomberie: "encastree" | "apparente";
    faienceTouteHauteur: boolean;
    secheServiettes: boolean;
    // Réponses aux options SDB personnalisées (ex. « Type de miroir »)
    custom?: Record<string, string | string[] | number>;
  }[];

  // Construction neuve
  gammeNeuf?: "entree" | "standard" | "haut" | "luxe";
  garageM2?: number;
  terrainAViabiliser?: boolean;
  niveaux?: "plain_pied" | "etage";
  terrasseM2?: number;
  cuisineIncluse?: boolean;

  // Réponses aux questions personnalisées (éditeur additif)
  custom?: CustomAnswers;
};

export type LigneEstimation = {
  corpsEtat: string;
  poste: string;
  quantite: number;
  unite: string;
  bas: number;
  haut: number;
  // Décomposition fait-faire : part main d'œuvre vs fournitures
  moBas: number;
  moHaut: number;
  fournBas: number;
  fournHaut: number;
};

export type Estimation = {
  lignes: LigneEstimation[];
  totalBas: number;
  totalHaut: number;
  totalMedian: number;
  totalMoBas: number;
  totalMoHaut: number;
  totalFournBas: number;
  totalFournHaut: number;
  region: string;
  dureeSemaines: [number, number];
  conseils: string[]; // accompagnement technique : le "pourquoi" de chaque décision
  metreUtilise: boolean;
  mode: "rapide" | "detaille";
};

// Part typique de main d'œuvre dans un prix fourniture+pose, par corps d'état.
// Sert à séparer « je fais faire » (total) de « je fais moi-même » (fournitures seules).
const PART_MO: Record<string, number> = {
  demolition_curage: 0.9,
  gros_oeuvre: 0.55,
  couverture: 0.55,
  construction_neuve: 0.45,
  facade: 0.55,
  assainissement: 0.5,
  raccordements: 0.4,
  platrerie: 0.55,
  electricite: 0.55,
  plomberie: 0.55,
  chauffage_ventilation: 0.35,
  isolation: 0.5,
  menuiseries_ext: 0.3,
  menuiseries_int: 0.45,
  sols: 0.5,
  peinture: 0.65,
  cuisine: 0.3,
  salle_de_bain: 0.45,
  divers: 0.5,
};

const COEF_FINITION = { locatif: 0.95, standard: 1, premium: 1.2, luxe: 1.45 };

// Libellés des corps d'état : source unique dans customq.ts (CORPS_LABEL, client-safe).
export function corpsLabel(code: string): string {
  return CORPS_LABEL[code] ?? code;
}

const UNITE_LABELS: Record<string, string> = {
  m2: "m²",
  m2_habitable: "m²",
  m2_surface_traitee: "m²",
  ml: "ml",
  unite: "u.",
  forfait: "forfait",
  heure: "h",
};

export function uniteLabel(code: string): string {
  return UNITE_LABELS[code] ?? code;
}

type Ctx = {
  coef: number;
  lignes: LigneEstimation[];
  conseils: string[];
  serrage: boolean; // mode détaillé : la spec est connue → fourchette médian ±15 %
};

function makeAdd(ctx: Ctx) {
  return (
    corpsEtat: string,
    posteFragment: string,
    quantite: number,
    opts?: { poste?: string; coefPoste?: number }
  ) => {
    const p = getPoste(corpsEtat, posteFragment);
    const c = ctx.coef * (opts?.coefPoste ?? 1);
    const [pb, ph] = ctx.serrage
      ? [p.prix_median * 0.85, p.prix_median * 1.15]
      : [p.prix_bas, p.prix_haut];
    const bas = Math.round(pb * quantite * c);
    const haut = Math.round(ph * quantite * c);
    // Part MO : override par poste (référentiel) sinon défaut par corps d'état
    const part = p.part_mo ?? PART_MO[corpsEtat] ?? 0.5;
    ctx.lignes.push({
      corpsEtat,
      poste: opts?.poste ?? p.poste,
      quantite: Math.round(quantite * 10) / 10,
      unite: p.unite,
      bas,
      haut,
      moBas: Math.round(bas * part),
      moHaut: Math.round(haut * part),
      fournBas: Math.round(bas * (1 - part)),
      fournHaut: Math.round(haut * (1 - part)),
    });
  };
}

export function estimer(
  surface: number,
  codePostal: string,
  r: Reponses,
  metre?: Metre | null,
  formConfig?: FormConfig
): Estimation {
  const reponses = appliquerMasques(r, formConfig); // masqué ⇒ neutre ⇒ pas chiffré
  if (reponses.typeProjet === "neuf") return estimerNeuf(surface, codePostal, reponses, formConfig);
  return estimerRenovation(surface, codePostal, reponses, metre ?? null, formConfig);
}

/** Pousse des lignes personnalisées (prix fixé par l'utilisateur) dans le chiffrage, avec le split MO/fournitures. */
function pushLignesCustom(ctx: Ctx, lignes: CustomLine[]) {
  for (const l of lignes) {
    const part = PART_MO[l.corps] ?? 0.5;
    ctx.lignes.push({
      corpsEtat: l.corps,
      poste: l.poste,
      quantite: 1,
      unite: "forfait",
      bas: l.montant,
      haut: l.montant,
      moBas: Math.round(l.montant * part),
      moHaut: Math.round(l.montant * part),
      fournBas: Math.round(l.montant * (1 - part)),
      fournHaut: Math.round(l.montant * (1 - part)),
    });
  }
}

/** Ajoute au chiffrage les lignes issues des personnalisations de section. */
function ajouterLignesCustom(ctx: Ctx, r: Reponses, surface: number, formConfig?: FormConfig) {
  pushLignesCustom(ctx, computeCustomLines(formConfig, r.custom, surface));
}

/**
 * Réponses neutres des blocs intégrés masquables : un bloc que l'utilisateur a retiré
 * du formulaire ne doit RIEN chiffrer, même si le projet porte une ancienne réponse
 * (ou un défaut non neutre comme peinture = "complete").
 */
const NEUTRE_PAR_BLOC: Record<string, Partial<Reponses>> = {
  curage: { curage: "aucun" },
  electricite: { electricite: "ok" },
  elec_spots: { spotsLumieres: "non", nbPointsLumineux: 0 },
  plomberie: { plomberie: "ok" },
  sdb: { sdb: "aucune" },
  sdb_config: { sdbConfigs: [] },
  cuisine: { cuisine: "aucune" },
  sols: { sols: "aucun" },
  plinthes: { plintheMateriau: "aucune" },
  doublage: { doublageMl: 0 },
  peinture: { peinture: "aucune" },
  fenetres_portes: { fenetres: 0, nbPortesInt: 0 },
  porteEntree: { porteEntree: "aucune" },
  volets: { voletRoulant: false },
  cloisons: { cloisons: "aucune" },
  chauffage: { chauffage: "aucun" },
  vmc: { vmc: false },
  ecs: { ecs: "inchange" },
  reseauxEvac: { reseauxEvac: false },
  nouvelleSurface: { nouvelleSurfaceM2: 0 },
  assainissement: { assainissement: "raccorde" },
  raccordements: { alimElec: false, alimEau: false, alimGaz: false },
  facade: { facadeAFaire: false },
  programme: { cellier: false, buanderie: false },
  // Diagnostic (état actuel) — masqué = état sain, rien à chiffrer
  solSupport: { solSupport: "dalle_ok" },
  mursEtat: { mursEtat: "ok" },
  humidite: { humidite: false },
  fissuresStructure: { fissuresStructure: "aucune" },
  toitureEtat: { toitureEtat: "bon" },
  charpenteEtat: { charpenteEtat: "saine" },
  zinguerie_isolToit: { zinguerieAFaire: false, isolationToiture: false },
  enduitExtEtat: { enduitExtEtat: "sain" },
  menuiseriesEtat: { menuiseriesEtat: "bon" },
  encadrementsEtat: { encadrementsEtat: "bon" },
  niveau_isolSol: { niveauARattraper: 0, isolationSol: false },
};

/** Neutralise les réponses des blocs masqués par l'utilisateur : masqué ⇒ pas chiffré. */
function appliquerMasques(r: Reponses, formConfig?: FormConfig): Reponses {
  const masques = formConfig?.hiddenBlocs ?? [];
  if (masques.length === 0) return r;
  let res = r;
  for (const id of masques) {
    const neutre = NEUTRE_PAR_BLOC[id];
    if (neutre) res = { ...res, ...neutre };
  }
  return res;
}

function estimerRenovation(
  surface: number,
  codePostal: string,
  r: Reponses,
  metre: Metre | null,
  formConfig?: FormConfig
): Estimation {
  const { coef: coefRegion, label: region } = coefRegional(codePostal);
  const detaille = r.modeEstimation === "detaille";
  const ctx: Ctx = {
    coef: coefRegion * COEF_FINITION[r.finition],
    lignes: [],
    conseils: [],
    serrage: detaille,
  };
  const add = makeAdd(ctx);
  const metreUtilise = !!metre && metre.pieces.length > 0;

  if (detaille) {
    ctx.conseils.push(
      "Mode détaillé : tes réponses précisent la nature exacte de chaque poste, les fourchettes sont donc resserrées à ±15 % autour du prix marché médian."
    );
  }

  // Surfaces de référence : métré réel si disponible, sinon ratios métier
  const sMurs = metreUtilise ? metre!.totalMurs : surface * 2.6 * 0.62; // murs ≈ 62 % de la surface développée
  const sPlafonds = metreUtilise ? metre!.totalPlafonds : surface;
  const sSol = metreUtilise ? metre!.totalSol : surface;

  if (metreUtilise) {
    ctx.conseils.push(
      `Métré calculé depuis tes ${metre!.pieces.length} pièces : ${sSol.toFixed(0)} m² de sol, ${metre!.totalMurs.toFixed(0)} m² de murs, ${metre!.totalPlafonds.toFixed(0)} m² de plafonds, ${metre!.totalPlinthesMl.toFixed(0)} ml de plinthes${metre!.totalFaienceM2 > 0 ? `, ${metre!.totalFaienceM2.toFixed(0)} m² de faïence` : ""} — l'estimation utilise ces quantités réelles au lieu de ratios.`
    );
  }

  // Démolition / curage
  if (r.curage === "leger") add("demolition_curage", "Curage léger", sSol);
  if (r.curage === "complet") add("demolition_curage", "Curage complet", sSol);

  // ── Questionnaire expert : le support de sol commande la suite ──
  const solSupport = r.solSupport ?? "dalle_ok";
  if (r.sols !== "aucun" || solSupport === "terre_battue") {
    if (solSupport === "terre_battue") {
      add("gros_oeuvre", "Hérisson + dalle", sSol);
      add(
        "sols",
        detaille
          ? r.chapeType === "liquide"
            ? "Chape liquide"
            : "Chape traditionnelle"
          : "Chape",
        sSol
      );
      ctx.conseils.push(
        "Sol en terre battue → il faut reconstruire le support complet, dans cet ordre : 1) hérisson de cailloux compacté, 2) film polyane, 3) dalle béton armée, 4) chape de finition. Ce n'est qu'après qu'on pose le revêtement. Tout est chiffré ci-dessus — ne laisse aucun artisan sauter une étape."
      );
    }
    if (solSupport === "plancher_bois") {
      add("gros_oeuvre", "Reprise plancher bois", sSol);
      ctx.conseils.push(
        "Plancher bois fatigué → on reprend le solivage et on pose des panneaux avant tout revêtement. Fais vérifier l'état des poutres (insectes, humidité) au passage : c'est le moment ou jamais."
      );
    }
    if (solSupport === "carrelage_existant") {
      ctx.conseils.push(
        "Carrelage existant → deux options : poser par-dessus après ragréage fibré (économique, mais +1 cm de hauteur, attention aux portes), ou déposer l'ancien (prévu dans le curage). On a chiffré le ragréage ; si tu déposes, garde le budget curage."
      );
    }
  }

  // Cloisons — mètres linéaires estimés depuis la surface et le programme, puis convertis en m² (× hauteur 2,5 m)
  if (r.cloisons !== "aucune" || (detaille && (r.cloisonMlManuel ?? 0) > 0)) {
    const hauteur = 2.5;
    const ml = estimerCloisonsMl(r, surface, metreUtilise ? metre : null);
    if (ml > 0)
      add("platrerie", "Cloison placo standard", Math.round(ml * hauteur), {
        poste: `Cloisons placo (~${ml} ml)`,
      });
  }

  // ── Questionnaire expert : état des murs ──
  const mursEtat = r.mursEtat ?? "ok";
  if (mursEtat === "platre_abime") {
    add("platrerie", "Enduit plâtre rénovation", sMurs);
    ctx.conseils.push(
      "Plâtre abîmé → un enduit de rénovation sur l'ensemble des murs avant peinture. Peindre sur un support dégradé, c'est refaire dans 2 ans : l'enduit d'abord, toujours."
    );
  }
  // Doublage isolant des murs par l'intérieur (ml manuel prioritaire, sinon auto si pierre nue)
  const doublageMl = detaille ? (r.doublageMl ?? 0) : 0;
  const surfaceDoublage = doublageMl > 0 ? doublageMl * 2.5 : mursEtat === "pierre_nue" ? sMurs : 0;
  if (surfaceDoublage > 0) {
    const coefIso = coefIsolant(r.isolantType, r.isolantEpaisseur);
    const labelIso = LABEL_ISOLANT[r.isolantType ?? "laine_verre"];
    add("platrerie", "Doublage murs placo", surfaceDoublage, {
      coefPoste: coefIso,
      poste: `Doublage murs + isolant ${labelIso} ${r.isolantEpaisseur ?? 120} mm${doublageMl > 0 ? ` (~${doublageMl} ml)` : ""}`,
    });
    if (mursEtat === "pierre_nue")
      ctx.conseils.push(
        "Murs en pierre nue → doublage placo + isolant sur l'ensemble : tu gagnes l'isolation thermique ET des murs droits prêts à peindre. Laisse une lame d'air si la pierre est humide."
      );
    const epOk = (r.isolantEpaisseur ?? 120) >= 120;
    ctx.conseils.push(
      `Doublage isolant : vise R ≥ 3,7 m².K/W pour l'éligibilité aux aides (MaPrimeRénov', CEE)${epOk ? "" : " — attention, une épaisseur < 120 mm risque de ne pas y suffire selon l'isolant"}. Laine de verre = le plus courant et économique ; laine de roche = meilleur confort acoustique/feu (+10-20 %) ; biosourcé = plus sain mais plus cher.`
    );
  }

  // ── Questionnaire expert : humidité ──
  if (r.humidite) {
    add("gros_oeuvre", "Traitement humidité", 1);
    ctx.conseils.push(
      "Humidité détectée → on traite la CAUSE avant tout (injection résine ou drainage selon diagnostic), sinon chaque euro de finition est perdu. Exige un diagnostic humidité avant de signer ce poste, et ne ferme pas les murs tant que ce n'est pas sec."
    );
    const srcHum: Record<string, string> = {
      remontees:
        "Origine : remontées capillaires → traitement durable = arrêt de la capillarité (injection de résine hydrophobe en pied de mur, parfois drainage périphérique). Une peinture « anti-humidité » ne fait que masquer le symptôme.",
      infiltration:
        "Origine : infiltration → trouve et traite le point d'entrée (façade fissurée, joint, appui de fenêtre, terrasse) AVANT l'intérieur. Le point d'entrée relève de la façade ou de la toiture, pas du mur qu'on voit mouillé.",
      condensation:
        "Origine : condensation → c'est un défaut de ventilation, pas de maçonnerie. Une VMC performante + une bonne isolation résolvent la plupart des cas ; traiter les murs sans ventiler ne suffira pas.",
      toiture:
        "Origine : toiture → priorité absolue à la couverture (voir ci-dessous). Tant que le toit prend l'eau, tout le reste est perdu.",
    };
    if (r.humiditeSource && srcHum[r.humiditeSource]) ctx.conseils.push(srcHum[r.humiditeSource]);
  }

  // ── Diagnostic : fissures / structure ──
  if (r.fissuresStructure === "microfissures")
    ctx.conseils.push(
      "Microfissures superficielles → le plus souvent esthétiques (retrait d'enduit) : on les ouvre, on ponte/rebouche au mortier avant peinture ou ravalement. À surveiller — si elles s'allongent ou s'ouvrent, elles deviennent « évolutives »."
    );
  if (r.fissuresStructure === "traversantes" || r.fissuresStructure === "evolutives") {
    // NB : fragment « expertise fissures » (pas « étude structure ») — « Ouverture mur
    // porteur (avec IPN, hors étude structure) » matcherait en premier dans le référentiel.
    add("gros_oeuvre", "expertise fissures", 1);
    ctx.conseils.push(
      r.fissuresStructure === "evolutives"
        ? "Fissures ÉVOLUTIVES (elles bougent, en escalier, > 2 mm) → signal d'alerte structurel : ne lance AUCUNE finition avant une expertise (bureau d'études / expert fissures). La cause (fondations, retrait d'argile, surcharge) doit être identifiée et stabilisée d'abord. Étude chiffrée ci-dessus ; le confortement éventuel (reprise en sous-œuvre, agrafage) se chiffre après diagnostic."
        : "Fissures traversantes (visibles des deux côtés du mur) → fais confirmer par un bureau d'études qu'elles sont stabilisées avant de refermer les murs. Étude chiffrée ci-dessus."
    );
  }

  // ── Diagnostic : toiture / charpente / couverture (le « hors d'eau ») ──
  const toitureRenseignee = (r.toitureM2 ?? 0) > 0;
  const toitureM2 = toitureRenseignee ? r.toitureM2! : Math.round(surface * 1.2);
  const noteToit = toitureRenseignee
    ? ""
    : ` (surface de toiture estimée à ${toitureM2} m² ≈ emprise × 1,2 pour la pente — saisis la vraie surface pour affiner)`;
  if (r.toitureEtat === "entretien" || r.toitureEtat === "reprise_partielle")
    add("couverture", "Reprise couverture partielle", toitureM2);
  if (r.toitureEtat === "refaire") {
    add("couverture", "Réfection couverture complète", toitureM2);
    ctx.conseils.push(
      `Toiture à refaire → c'est le poste « hors d'eau » prioritaire : on met le bien à l'abri AVANT d'engager quoi que ce soit à l'intérieur${noteToit}. La dépose est l'occasion idéale de vérifier la charpente.`
    );
  }
  if (r.charpenteEtat === "traiter") {
    add("couverture", "Traitement charpente", toitureM2);
    ctx.conseils.push(
      "Charpente à traiter → traitement curatif (insectes xylophages / champignons) par bûchage puis pulvérisation/injection. Fais identifier l'agent : capricorne/vrillette = traitement classique, mais la mérule impose une procédure lourde et, dans certains départements, une déclaration."
    );
  }
  if (r.charpenteEtat === "renforcer") add("couverture", "Renforcement", toitureM2);
  if (r.charpenteEtat === "refaire") {
    add("couverture", "Réfection complète de charpente", toitureM2);
    ctx.conseils.push(
      "Charpente à refaire → poste lourd, à coordonner avec la couverture (on ouvre le toit de toute façon). Fais valider le dimensionnement (section des bois, entraxe) par un pro : la charpente porte tout le reste."
    );
  }
  if (r.zinguerieAFaire) add("couverture", "Zinguerie", Math.round(Math.sqrt(surface) * 3));
  if (r.isolationToiture) {
    add("couverture", "Isolation toiture", toitureRenseignee ? toitureM2 : surface);
    ctx.conseils.push(
      "Isolation de toiture par l'intérieur (rampants) → gros levier thermique (jusqu'à 30 % des pertes passent par le toit) et éligible aux aides si R ≥ 6. À faire tant que les rampants sont ouverts."
    );
  }

  // ── Diagnostic : menuiseries existantes ──
  if (r.menuiseriesEtat === "simple_vitrage")
    ctx.conseils.push(
      "Menuiseries en simple vitrage → thermiquement disqualifiantes et pénalisantes pour le DPE. Pour du locatif performant, budgète leur remplacement (renseigne le nombre de fenêtres et la porte d'entrée à l'étape Travaux)."
    );
  if (r.menuiseriesEtat === "vetuste")
    ctx.conseils.push(
      "Menuiseries vétustes → prévois leur remplacement (fenêtres + porte d'entrée à l'étape Travaux). Vérifie au passage l'état des appuis et linteaux (voir « encadrements »)."
    );
  if (r.menuiseriesEtat === "absentes")
    ctx.conseils.push(
      "Ouvertures sans menuiserie → à créer entièrement : compte fenêtres et porte d'entrée à l'étape Travaux, et vérifie que les encadrements sont prêts à les recevoir (ci-dessous)."
    );

  // ── Diagnostic : encadrements (aptitude à recevoir les menuiseries) ──
  if (r.encadrementsEtat === "reprise" || r.encadrementsEtat === "creer") {
    const nbEnc =
      (r.nbEncadrementsReprise ?? 0) > 0
        ? r.nbEncadrementsReprise!
        : Math.max(1, r.fenetres || Math.round(surface / 20));
    add("gros_oeuvre", "Reprise encadrement", nbEnc);
    ctx.conseils.push(
      r.encadrementsEtat === "creer"
        ? `Encadrements à créer (${nbEnc} ouverture${nbEnc > 1 ? "s" : ""}) → percement, linteau et tableaux d'aplomb avant toute pose de menuiserie. Travaux de gros œuvre, jamais après les finitions.`
        : `Encadrements à reprendre (${nbEnc} ouverture${nbEnc > 1 ? "s" : ""}) → appuis, tableaux et linteaux à remettre sains et d'équerre avant de poser les menuiseries neuves. Une fenêtre posée sur un tableau dégradé ne sera jamais étanche.`
    );
  }

  // ── Diagnostic : niveau de sol à rattraper + isolation du sol ──
  const rattrap = r.niveauARattraper ?? 0;
  if (rattrap > 0 && solSupport !== "terre_battue") {
    add("gros_oeuvre", "Remblai", sSol);
    ctx.conseils.push(
      `Sol à rehausser d'environ ${rattrap} cm pour atteindre le niveau fini → forme/remblai compacté sous la future chape. Au-delà de ~15 cm, un hérisson ventilé ou du béton allégé (billes d'argile) est souvent plus pertinent qu'un simple remblai : à valider selon la hauteur.`
    );
  }
  if (r.isolationSol) {
    add("gros_oeuvre", "Isolation sous chape", sSol);
    ctx.conseils.push(
      "Isolation du sol → panneaux isolants (PSE/PU) sous la chape ou la dalle. Quasi indispensable sur terre-plein / vide sanitaire pour le confort et le DPE ; intègre son épaisseur dans le calcul du niveau fini (elle rehausse le sol)."
    );
  }

  // ── Module 2 : avant achat — réglementation énergie + diagnostics selon l'âge ──
  if (r.dpe === "G")
    ctx.conseils.push(
      "DPE G → location interdite depuis janvier 2025. Pour du locatif, la rénovation énergétique (isolation, menuiseries, chauffage) n'est pas une option : c'est le prérequis. Bonne nouvelle : c'est un levier de négociation majeur à l'achat."
    );
  if (r.dpe === "F")
    ctx.conseils.push(
      "DPE F → interdiction de location au 1er janvier 2028. Si tu vises du locatif, intègre la rénovation énergétique au budget dès maintenant — et négocie le prix en conséquence."
    );
  if (r.dpe === "E")
    ctx.conseils.push(
      "DPE E → interdiction de location prévue en 2034. Pas d'urgence, mais anticipe : profite des travaux prévus pour améliorer l'isolation tant que le chantier est ouvert."
    );
  if (r.anneeConstruction === "avant_1949")
    ctx.conseils.push(
      "Bien d'avant 1949 → diagnostic plomb (CREP) obligatoire, et réseaux souvent d'origine : budgète électricité et plomberie complètes si elles n'ont jamais été refaites."
    );
  if (r.anneeConstruction === "avant_1949" || r.anneeConstruction === "1949_1974" || r.anneeConstruction === "1975_1997")
    ctx.conseils.push(
      "Permis de construire antérieur à juillet 1997 → repérage amiante obligatoire AVANT travaux (RAT). Un désamiantage non anticipé peut coûter plusieurs milliers d'euros : fais-le chiffrer avant de signer tes devis."
    );

  // Électricité
  if (r.electricite === "partielle") add("electricite", "partielle", surface);
  if (r.electricite === "totale") {
    add("electricite", "totale", surface);
    ctx.conseils.push(
      "Électricité « à refaire entièrement » = de A à Z : dépose, tableau neuf aux normes NF C 15-100, câblage complet, prises, interrupteurs, points lumineux (DCL) raccordés, mise à la terre et attestation Consuel. En revanche les LUMINAIRES/SPOTS eux-mêmes ne sont pas compris par défaut (souvent fournis par toi) — ajoute-les ci-dessous si tu veux les chiffrer."
    );
  }
  // Luminaires / spots (non compris dans le prix élec au m²)
  if (r.spotsLumieres && r.spotsLumieres !== "non" && (r.nbPointsLumineux ?? 0) > 0) {
    add(
      "electricite",
      r.spotsLumieres === "spots" ? "Spots LED encastrés" : "Luminaire / point lumineux équipé",
      r.nbPointsLumineux!
    );
  }

  // Plomberie
  if (r.plomberie === "reprise")
    add("plomberie", "Rénovation plomberie", 0.5, { poste: "Reprise partielle plomberie" });
  if (r.plomberie === "complete") {
    add("plomberie", "Rénovation plomberie", 1);
    ctx.conseils.push(
      "Plomberie « à refaire » = les réseaux : arrivées d'eau (chaud/froid) et évacuations refaits pour toute la maison. Les appareils sanitaires (WC, lavabos, douche, baignoire) sont chiffrés à part dans la configuration des salles de bain — vérifie de ne pas les compter deux fois."
    );
  }

  // Salle de bain — priorité au nombre saisi (mode détaillé), sinon au métré, sinon 1
  const nbSdb = detaille && (r.nbSdb ?? 0) > 0
    ? r.nbSdb!
    : metreUtilise
      ? Math.max(1, metre!.nbSallesDeBain)
      : 1;
  if (r.sdb === "rafraichir")
    add("salle_de_bain", "Rénovation complète", 0.35 * nbSdb, {
      poste: `Rafraîchissement salle${nbSdb > 1 ? "s" : ""} de bain${nbSdb > 1 ? ` (×${nbSdb})` : ""}`,
    });
  if (r.sdb === "complete") {
    if (detaille) {
      // Une config par salle de bain (chacune sa taille + équipement), sinon config unique ×nbSdb
      const configs: NonNullable<Reponses["sdbConfigs"]> =
        r.sdbConfigs && r.sdbConfigs.length > 0
          ? r.sdbConfigs
          : Array.from({ length: nbSdb }, () => ({
              surface: 0,
              douche: r.sdbDouche ?? "standard",
              wc: r.sdbWc ?? "suspendu",
              vasque: r.sdbVasque ?? "simple",
              plomberie: r.sdbPlomberie ?? "encastree",
              faienceTouteHauteur: !!r.sdbCarrelageTouteHauteur,
              secheServiettes: r.sdbSecheServiettes !== false,
            }));
      // Champs SDB masqués (personnalisation) → on saute leur chiffrage.
      const masqueSdb = (id: string) => (formConfig?.hiddenBlocs ?? []).includes(`sdb:${id}`);
      configs.forEach((c, i) => {
        const n = configs.length > 1 ? ` #${i + 1}` : "";
        if (!masqueSdb("plomberie"))
          add("salle_de_bain", c.plomberie === "apparente" ? "apparents" : "encastrés", 1, {
            poste: `Réseaux plomberie SDB${n} (${c.plomberie === "apparente" ? "apparents" : "encastrés"})`,
          });
        if (!masqueSdb("douche")) {
          if (c.douche === "italienne") add("salle_de_bain", "italienne", 1, { poste: `Douche à l'italienne SDB${n}` });
          if (c.douche === "standard") add("salle_de_bain", "Douche standard", 1, { poste: `Douche standard SDB${n}` });
          if (c.douche === "baignoire") add("salle_de_bain", "Baignoire", 1, { poste: `Baignoire SDB${n}` });
          if (c.douche === "douche_et_baignoire") {
            add("salle_de_bain", "Douche standard", 1, { poste: `Douche SDB${n}` });
            add("salle_de_bain", "Baignoire", 1, { poste: `Baignoire SDB${n}` });
          }
        }
        if (!masqueSdb("wc")) {
          if (c.wc === "suspendu") add("salle_de_bain", "WC suspendu", 1, { poste: `WC suspendu SDB${n}` });
          if (c.wc === "classique") add("salle_de_bain", "WC classique", 1, { poste: `WC classique SDB${n}` });
        }
        if (!masqueSdb("vasque"))
          add("salle_de_bain", c.vasque === "double" ? "double vasque" : "simple vasque", 1, {
            poste: `Meuble ${c.vasque === "double" ? "double" : "simple"} vasque SDB${n}`,
          });
        if (!masqueSdb("seche") && c.secheServiettes) add("salle_de_bain", "Sèche-serviettes", 1, { poste: `Sèche-serviettes SDB${n}` });
        // Faïence : depuis la taille de la SDB si renseignée, sinon forfait par hauteur
        if (!masqueSdb("faience")) {
          const perim = c.surface && c.surface > 0 ? 4 * Math.sqrt(c.surface) : 0;
          const faienceM2 = perim > 0
            ? Math.round(perim * (c.faienceTouteHauteur ? 2.4 : 1.3))
            : c.faienceTouteHauteur ? 16 : 9;
          add("sols", "Faïence murale (fournie-posée)", faienceM2, {
            poste: `Faïence SDB${n} — ${c.faienceTouteHauteur ? "toute hauteur" : "mi-hauteur + douche"}${c.surface ? ` (${c.surface} m²)` : ""}`,
          });
        }
      });
      // Options SDB personnalisées (ex. « Type de miroir »), par salle de bain
      // (le mode €/m² s'applique à la surface de chaque SDB, pas du logement)
      pushLignesCustom(ctx, computeSdbLines(formConfig?.sdbQuestions, configs));
      ctx.conseils.push(
        `${configs.length} salle${configs.length > 1 ? "s" : ""} de bain chiffrée${configs.length > 1 ? "s" : ""} pièce par pièce (équipements + faïence selon leur taille) — compare chaque ligne à tes propres prix.`
      );
    } else {
      add("salle_de_bain", "Rénovation complète", nbSdb, {
        poste: nbSdb > 1 ? `Rénovation complète salles de bain (×${nbSdb})` : undefined,
      });
    }
  }

  // WC séparés (hors salle de bain) — chiffrés si l'on refait la plomberie
  if (detaille && (r.nbWc ?? 0) > 0 && r.plomberie !== "ok") {
    const wcDansSdb = r.sdb === "complete" && r.sdbWc !== "aucun" ? nbSdb : 0;
    const wcSepares = Math.max(0, (r.nbWc ?? 0) - wcDansSdb);
    if (wcSepares > 0)
      add("salle_de_bain", "WC classique", wcSepares, {
        poste: `WC séparé${wcSepares > 1 ? `s (×${wcSepares})` : ""}`,
      });
  }

  // Cuisine
  if (r.cuisine === "rafraichir")
    add("cuisine", "Cuisine équipée", 0.3, { poste: "Rafraîchissement cuisine" });
  if (r.cuisine === "complete") {
    if (detaille) {
      const g = r.cuisineGamme ?? "milieu";
      add("cuisine", g === "entree" ? "— entrée" : g === "haut" ? "— haut" : "— milieu", 1);
    } else {
      add("cuisine", "Cuisine équipée", 1);
    }
  }

  // Sols — revêtement au choix (carrelage, stratifié, massif, béton ciré, PVC)
  const carrelageFragment =
    detaille && r.carrelageFormat === "grand"
      ? "Carrelage sol grand format"
      : "Carrelage sol (fourni-posé)";
  const fragmentPour = (type: string): string => {
    switch (type) {
      case "carrelage": return carrelageFragment;
      case "massif": return "Parquet massif (fourni-posé)";
      case "beton_cire": return "Béton ciré (fourni-posé)";
      case "pvc": return "Sol PVC / vinyle (fourni-posé)";
      default: return "Parquet stratifié";
    }
  };
  const revetementFragment = () => fragmentPour(r.solsType);
  const solsDetail = (r.solsDetail ?? []).filter((s) => s.m2 > 0);
  const multiSol = detaille && solsDetail.length > 0;
  if (r.sols !== "aucun" || multiSol) {
    const coefPartiel = r.sols === "partiel" && !metreUtilise && !multiSol ? 0.5 : 1;
    if (multiSol) {
      // Plusieurs revêtements avec leurs surfaces exactes
      const surfaceARagreer = solsDetail
        .filter((s) => s.type !== "beton_cire")
        .reduce((sum, s) => sum + s.m2, 0);
      if (solSupport !== "terre_battue" && surfaceARagreer > 0)
        add("sols", "Ragréage", surfaceARagreer);
      for (const s of solsDetail) add("sols", fragmentPour(s.type), s.m2);
    } else {
      if (solSupport !== "terre_battue" && r.solsType !== "beton_cire")
        add("sols", "Ragréage", sSol * coefPartiel);
      if (metreUtilise && (metre!.totalSolCarrelage > 0 || metre!.totalSolAutre > 0)) {
        if (metre!.totalSolCarrelage > 0)
          add("sols", carrelageFragment, metre!.totalSolCarrelage);
        if (metre!.totalSolAutre > 0)
          add("sols", revetementFragment(), metre!.totalSolAutre);
      } else {
        add("sols", revetementFragment(), sSol * coefPartiel);
      }
    }
    // Plinthes au ml — matériau au choix, le béton ciré n'en a pas
    const plinthe = r.plintheMateriau ?? "assorti";
    if (plinthe !== "aucune" && r.solsType !== "beton_cire") {
      const plintheFragment =
        plinthe === "bois" ? "Plinthes bois"
        : plinthe === "pvc" ? "Plinthes PVC"
        : plinthe === "mdf" ? "Plinthes MDF"
        : plinthe === "carrelage" ? "Plinthes carrelage"
        : r.solsType === "carrelage" ? "Plinthes carrelage" : "Plinthes MDF"; // assorti
      const ml = metreUtilise && metre!.totalPlinthesMl > 0
        ? metre!.totalPlinthesMl
        : Math.round(Math.sqrt(sSol) * 4 * coefPartiel); // périmètre approx si pas de métré
      if (ml > 0) add("sols", plintheFragment, ml);
    }
  }

  // Faïence murale (métré) — hors mode détaillé (le configurateur SDB la chiffre déjà)
  if (metreUtilise && metre!.totalFaienceM2 > 0 && r.sdb !== "aucune" && !(detaille && r.sdb === "complete")) {
    if (!detaille)
      ctx.conseils.push(
        `Faïence : ${metre!.totalFaienceM2.toFixed(0)} m² calculés depuis tes salles d'eau — déjà comprise dans le forfait salle de bain si rénovation complète ; en rafraîchissement, compte-la à part.`
      );
    if (r.sdb === "rafraichir")
      add("sols", "Faïence murale (fournie-posée)", metre!.totalFaienceM2);
  }

  // Peinture — surfaces réelles si métré
  if (r.peinture !== "aucune") {
    const coefP = r.peinture === "partielle" ? 0.6 : 1;
    add("peinture", "fourni-posé", (sMurs + sPlafonds) * coefP);
  }

  // Fenêtres — matériau précisé en mode détaillé (menuiserieMateriauFenetre ou fallback menuiserieMateriau)
  const matFen = detaille ? (r.menuiserieMateriauFenetre ?? r.menuiserieMateriau ?? "pvc") : "pvc";
  if (r.fenetres > 0) {
    add(
      "menuiseries_ext",
      matFen === "bois" ? "Fenêtre bois" : matFen === "alu" ? "Fenêtre alu" : "Fenêtre PVC",
      r.fenetres
    );
  }

  // Volets roulants intégrés (par fenêtre)
  if (r.fenetres > 0 && r.voletRoulant) {
    const vt = r.voletType ?? "electrique";
    add(
      "menuiseries_ext",
      vt === "manuel" ? "Volet roulant intégré manuel" : vt === "solaire" ? "Volet roulant intégré solaire" : "Volet roulant intégré électrique",
      r.fenetres
    );
  }

  // Porte d'entrée (menuiserie extérieure, distincte des blocs-portes intérieurs)
  if (r.porteEntree && r.porteEntree !== "aucune") {
    const p = r.porteEntree;
    add(
      "menuiseries_ext",
      p === "alu" ? "Porte d'entrée aluminium" : p === "bois" ? "Porte d'entrée bois" : "Porte d'entrée PVC",
      1
    );
  }

  // Blocs-portes intérieurs (distincts de la porte d'entrée)
  if ((r.nbPortesInt ?? 0) > 0) add("menuiseries_int", "Bloc-porte intérieur", r.nbPortesInt!);
  else if (metreUtilise && metre!.totalPortes > 0)
    add("menuiseries_int", "Bloc-porte intérieur", metre!.totalPortes, {
      poste: `Blocs-portes intérieurs (${metre!.totalPortes} d'après le métré)`,
    });

  // Chauffage / ventilation
  if (r.chauffage === "radiateurs")
    add("chauffage_ventilation", "Radiateur électrique", Math.max(2, Math.round(surface / 15)));
  if (r.chauffage === "chaudiere") add("chauffage_ventilation", "Chaudière gaz", 1);
  if (r.chauffage === "pac") add("chauffage_ventilation", "PAC air-eau", 1);
  if (r.vmc) {
    const nbVmc = Math.max(1, r.nbVmc ?? 1);
    const vmcFrag = r.vmcType === "double" ? "VMC double flux" : "VMC simple flux";
    add("chauffage_ventilation", vmcFrag, nbVmc, {
      poste: nbVmc > 1 ? `${vmcFrag === "VMC double flux" ? "VMC double flux" : "VMC simple flux"} (×${nbVmc})` : undefined,
    });
    if (r.vmcType === "double")
      ctx.conseils.push(
        "VMC double flux : récupère la chaleur de l'air extrait (gain énergétique réel) mais coûte 4-6× une simple flux et demande des gaines isolées — pertinent surtout sur un bien bien isolé."
      );
  }

  // Eau chaude sanitaire
  if (r.ecs === "ballon_elec") add("chauffage_ventilation", "Ballon électrique", 1);
  if (r.ecs === "thermo") {
    add("chauffage_ventilation", "thermodynamique", 1);
    ctx.conseils.push(
      "Chauffe-eau thermodynamique : ~3× moins d'électricité qu'un ballon classique, éligible aux aides. Prévois un volume d'air suffisant (garage, buanderie) ou un modèle sur air extérieur."
    );
  }
  if (r.ecs === "solaire") add("chauffage_ventilation", "solaire CESI", 1);
  if (r.ecs === "chaudiere" && r.chauffage !== "chaudiere")
    ctx.conseils.push(
      "Tu as choisi l'eau chaude par la chaudière, mais aucune chaudière n'est prévue dans les travaux — vérifie la cohérence, ou choisis un ballon/thermodynamique."
    );

  // Buanderie / cellier (arrivée + évacuation)
  if (r.buanderie) add("plomberie", "buanderie", 1);

  // Réseaux d'évacuation (eaux usées + eaux vannes)
  if (r.reseauxEvac) add("plomberie", "Création réseaux d'évacuation", 1);

  // Raccordements / compteurs
  if (r.alimElec) add("raccordements", "compteur électrique", 1);
  if (r.alimEau) add("raccordements", "compteur eau", 1);
  if (r.alimGaz) add("raccordements", "Raccordement gaz", 1);

  // Création de nouvelle surface (extension) → plancher
  if ((r.nouvelleSurfaceM2 ?? 0) > 0) {
    if (r.plancherType === "beton") {
      add("gros_oeuvre", "Hérisson + dalle", r.nouvelleSurfaceM2!, {
        poste: `Dalle béton — création ${r.nouvelleSurfaceM2} m²`,
      });
    } else {
      add("sols", "Plancher bois neuf", r.nouvelleSurfaceM2!);
    }
    ctx.conseils.push(
      `Création de ${r.nouvelleSurfaceM2} m² de surface : une extension/surélévation change souvent la structure et la surface de plancher — vérifie le PLU (déclaration préalable > 5 m², permis > 20-40 m²) et l'impact sur la RE2020.`
    );
  }

  // ── Travaux extérieurs / façade ──
  if (r.facadeAFaire) {
    const surfaceFacade =
      (r.facadeM2 ?? 0) > 0 ? r.facadeM2! : Math.round(surface * 1.4); // ~1,4 × surface habitable si non renseigné
    const besoinPiquage =
      r.enduitExtEtat === "a_piquer" || r.murExtEtat === "fissure" || r.murExtEtat === "degrade";
    if (besoinPiquage) add("facade", "Reprise fissures", surfaceFacade);
    if (r.enduitExtEtat === "a_piquer")
      ctx.conseils.push(
        "Enduit extérieur à piquer → l'ancien enduit sonne creux / se décolle : on le pique jusqu'au support sain avant de ré-enduire, sinon le neuf tombera avec l'ancien. Piquage chiffré ci-dessus."
      );
    if (r.enduitExtEtat === "brut_sans_revetement")
      ctx.conseils.push(
        "Façade brute (pierre / parpaing sans revêtement) → pas de piquage à prévoir, mais un gobetis d'accroche avant l'enduit de corps. Sur pierre, privilégie un enduit à la chaux (respirant)."
      );
    if (r.enduitExtEtat === "encrasse" && (r.facadeReno ?? "peinture") !== "nettoyage")
      ctx.conseils.push(
        "Enduit encrassé mais sain → un nettoyage + hydrofuge suffit souvent, inutile de tout refaire. Compare le coût d'un simple ravalement à celui d'un nouvel enduit."
      );
    const reno = r.facadeReno ?? "peinture";
    if (reno === "nettoyage") add("facade", "Nettoyage + hydrofuge", surfaceFacade);
    if (reno === "peinture") add("facade", "Peinture / ravalement", surfaceFacade);
    if (reno === "enduit") add("facade", "Enduit / crépi", surfaceFacade);
    if (reno === "ite") {
      add("facade", "Isolation thermique", surfaceFacade);
      ctx.conseils.push(
        "Isolation par l'extérieur (ITE) : le meilleur gain énergétique, éligible MaPrimeRénov' et CEE. Attention aux règles d'urbanisme (déclaration préalable, aspect en secteur protégé) et à la gestion des points singuliers (appuis de fenêtres, débords de toit)."
      );
    }
    if (r.murExtType === "pierre" && reno === "ite")
      ctx.conseils.push(
        "Mur en pierre + ITE : attention, isoler par l'extérieur une pierre peut piéger l'humidité. Un enduit chaux respirant ou une isolation intérieure adaptée est parfois préférable — fais valider par un pro."
      );
    if (r.murExtEtat === "degrade")
      ctx.conseils.push(
        "Façade dégradée : fais diagnostiquer la cause (infiltrations, fissures structurelles) avant l'embellissement. Un ravalement sur un support qui bouge se refera dans 3 ans."
      );
  } else if (r.enduitExtEtat === "a_piquer" || r.enduitExtEtat === "microfissures") {
    ctx.conseils.push(
      "Tu as signalé un enduit extérieur dégradé à l'état des lieux, mais aucun travail de façade n'est coché à l'étape Travaux : active « façade à refaire » pour le chiffrer (piquage + ré-enduit)."
    );
  }

  ajouterAssainissement(ctx, add, r);
  ajouterLignesCustom(ctx, r, surface, formConfig);

  return finaliser(ctx, region, metreUtilise, r);
}

/**
 * Estime les mètres linéaires de cloison à créer.
 * Priorité : saisie manuelle → métré réel → surface + programme.
 * Règle métier : une redistribution complète crée ~0,5 ml de cloison par m² habitable.
 */
function estimerCloisonsMl(r: Reponses, surface: number, metre: Metre | null): number {
  if (r.modeEstimation === "detaille" && (r.cloisonMlManuel ?? 0) > 0)
    return r.cloisonMlManuel!;
  if (metre && metre.nbCloisonsMl > 0) {
    // le métré donne le linéaire réel ; "quelques" = ~1/3 d'une redistribution
    return Math.round(metre.nbCloisonsMl * (r.cloisons === "quelques" ? 0.35 : 1));
  }
  // Nombre de pièces estimé depuis le programme (ou la surface)
  const nbPieces =
    r.modeEstimation === "detaille"
      ? (r.nbChambres ?? 0) + Math.max(1, r.nbSdb ?? 1) + (r.nbWc ?? 0) + 2 + (r.cellier ? 1 : 0) + (r.buanderie ? 1 : 0)
      : Math.max(3, Math.round(surface / 18));
  if (r.cloisons === "beaucoup")
    return Math.max(Math.round(surface * 0.5), nbPieces * 5);
  if (r.cloisons === "quelques")
    return Math.max(8, Math.round(surface * 0.12));
  return 0;
}

// Isolants : coefficient de prix relatif à la laine de verre 120 mm (référence R≈3,7).
const COEF_ISOLANT_TYPE: Record<string, number> = {
  laine_verre: 1.0,
  polystyrene: 1.0,
  laine_roche: 1.12,
  polyurethane: 1.25,
  biosource: 1.35,
};
const COEF_ISOLANT_EP: Record<number, number> = {
  100: 0.95,
  120: 1.0,
  140: 1.08,
  160: 1.15,
  200: 1.25,
};
const LABEL_ISOLANT: Record<string, string> = {
  laine_verre: "laine de verre",
  laine_roche: "laine de roche",
  polystyrene: "polystyrène",
  polyurethane: "polyuréthane",
  biosource: "biosourcé (laine de bois/ouate)",
  fibre_bois: "fibre de bois",
};

function coefIsolant(type?: string, ep?: number): number {
  return (COEF_ISOLANT_TYPE[type ?? "laine_verre"] ?? 1) * (COEF_ISOLANT_EP[ep ?? 120] ?? 1);
}

/** Assainissement dimensionné en équivalents-habitants (EH ≈ nb chambres + 1 séjour, min 3). */
function ajouterAssainissement(
  ctx: Ctx,
  add: ReturnType<typeof makeAdd>,
  r: Reponses
) {
  if (!r.assainissement || r.assainissement === "raccorde") return;
  const eh = Math.max(3, (r.nbChambres ?? 3) + 1);

  if (r.assainissement === "tout_egout") {
    add("assainissement", "Raccordement au tout-à-l'égout", 1);
    ctx.conseils.push(
      "Raccordement au tout-à-l'égout : obligatoire sous 2 ans si le réseau passe devant chez toi. Ajoute la taxe de raccordement (PFAC) de la commune, souvent 1 000-3 000 € en plus des travaux."
    );
    return;
  }

  // Assainissement individuel (non collectif)
  const base =
    r.assainissement === "individuel_micro"
      ? "Microstation"
      : "Fosse toutes eaux";
  add("assainissement", base, 1, {
    poste: `${base === "Microstation" ? "Microstation d'épuration" : "Fosse toutes eaux + épandage"} — dimensionnée ${eh} EH`,
  });
  if (eh > 5) add("assainissement", "EH supplémentaire", eh - 5);
  ctx.conseils.push(
    `Assainissement individuel dimensionné à ${eh} équivalents-habitants (≈ ${r.nbChambres ?? 3} chambres + séjour). Une étude de sol et de filière (~300-600 €) est obligatoire, et le SPANC doit valider ton projet AVANT travaux puis contrôler la conformité.`
  );
  if (r.assainissement === "individuel_micro")
    ctx.conseils.push(
      "Microstation : plus compacte qu'un épandage classique (idéal petit terrain) mais demande de l'électricité et un entretien annuel — vérifie que ta commune l'autorise."
    );
}

function estimerNeuf(
  surface: number,
  codePostal: string,
  r: Reponses,
  formConfig?: FormConfig
): Estimation {
  const { coef: coefRegion, label: region } = coefRegional(codePostal);
  const detaille = r.modeEstimation === "detaille";
  const ctx: Ctx = { coef: coefRegion, lignes: [], conseils: [], serrage: detaille };
  const add = makeAdd(ctx);

  if (detaille) {
    ctx.conseils.push(
      "Mode détaillé : la configuration de la maison est connue, fourchettes resserrées à ±15 % autour du prix marché médian."
    );
  }

  const gamme = r.gammeNeuf ?? "standard";
  const fragment =
    gamme === "entree" ? "entrée de gamme"
    : gamme === "haut" ? "haut de gamme"
    : gamme === "luxe" ? "prestige / luxe"
    : "— standard";
  add("construction_neuve", fragment, surface);

  // Configuration : chambres, salles de bain, WC
  const nbChambres = r.nbChambres ?? 0;
  const nbSdb = Math.max(1, r.nbSdb ?? 1);
  if (nbSdb > 1)
    add("construction_neuve", "Salle de bain supplémentaire", nbSdb - 1);
  if (detaille && (r.nbWc ?? 1) > 1)
    add("construction_neuve", "WC supplémentaire", (r.nbWc ?? 1) - 1);
  if (detaille && (r.terrasseM2 ?? 0) > 0)
    add("construction_neuve", "Terrasse extérieure", r.terrasseM2!);
  if (detaille && r.cuisineIncluse) {
    const g = gamme === "entree" ? "— entrée" : gamme === "haut" || gamme === "luxe" ? "— haut" : "— milieu";
    add("cuisine", g, 1);
  }

  // Eau chaude sanitaire : l'ECS standard est incluse, seuls thermo/solaire sont des surcoûts
  if (r.ecs === "thermo") add("construction_neuve", "eau chaude thermodynamique", 1);
  if (r.ecs === "solaire") add("construction_neuve", "eau chaude solaire", 1);

  // Buanderie / cellier — plomberie supplémentaire
  if (r.buanderie) add("plomberie", "buanderie", 1);

  // Cohérence surface / programme
  if (nbChambres > 0) {
    const surfaceMini = 35 + nbChambres * 11 + nbSdb * 5;
    if (surface < surfaceMini)
      ctx.conseils.push(
        `Attention : ${nbChambres} chambre${nbChambres > 1 ? "s" : ""} et ${nbSdb} salle${nbSdb > 1 ? "s" : ""} de bain sur ${surface} m², c'est serré — compte plutôt ~${surfaceMini} m² minimum pour un plan confortable.`
      );
  }
  if (detaille && r.niveaux === "plain_pied")
    ctx.conseils.push(
      "Plain-pied : plus d'emprise au sol donc plus de fondations et de toiture qu'un étage à surface égale — vérifie que le terrain le permet (le prix au m² affiché reste valable en moyenne)."
    );
  if (detaille && r.menuiserieMateriau && r.menuiserieMateriau !== "pvc")
    ctx.conseils.push(
      `Menuiseries ${r.menuiserieMateriau === "alu" ? "aluminium" : "bois"} : comprises dans le prix au m² en gamme ${gamme === "haut" ? "haut de gamme" : "supérieure"}, sinon compte +2 à +4 % du budget total vs PVC.`
    );

  if (r.terrainAViabiliser) {
    add("construction_neuve", "Terrassement + VRD", 1);
    ctx.conseils.push(
      "Terrain non viabilisé → prévois les raccordements (eau, électricité, assainissement) et le terrassement AVANT de signer : c'est le poste le plus sous-estimé en construction neuve."
    );
  }
  if ((r.garageM2 ?? 0) > 0) add("construction_neuve", "Garage", r.garageM2!);

  ctx.conseils.push(
    "Ordre de marche construction neuve : 1) étude de sol G2 (obligatoire), 2) permis de construire (~2-3 mois d'instruction), 3) contrat CCMI de préférence (garantie livraison prix et délais), 4) assurance dommages-ouvrage AVANT ouverture du chantier — elle n'est pas optionnelle.",
    "La RE2020 impose isolation renforcée et chauffage bas carbone (souvent PAC) : c'est inclus dans les prix au m² affichés, un devis nettement plus bas doit t'alerter."
  );

  ajouterAssainissement(ctx, add, r);
  ajouterLignesCustom(ctx, r, surface, formConfig);

  const est = finaliser(ctx, region, false, r);
  // Durée réaliste d'une construction : 12 à 18 mois permis inclus
  est.dureeSemaines = [52, 78];
  return est;
}

// ── Ancienneté du bâtiment : coût RÉEL accru sur les lots structurels (rénovation) ──
// Le bâti ancien coûte plus cher à démolir/reprendre (murs non standard, supports d'origine,
// dépose plus lourde). Appliqué uniquement aux lots concernés (une cuisine neuve coûte pareil
// quel que soit l'âge). Valeurs modérées, dérivées des normes de rénovation FR.
const LOTS_ANCIENNETE = new Set([
  "demolition_curage", "gros_oeuvre", "maconnerie", "platrerie", "couverture", "charpente",
]);
function coefAnciennete(age?: string): number {
  switch (age) {
    case "avant_1949": return 1.12;
    case "1949_1974": return 1.08;
    case "1975_1997": return 1.03;
    case "apres_1997": return 1.0;
    default: return 1.04; // inconnue → prudence modérée (l'inconnu est un risque)
  }
}

// ── Provision pour imprévus : DYNAMIQUE selon le risque réel du chantier ──
// Remplace le forfait 10 % fixe. Plus il y a d'inconnues (bâti ancien, curage lourd, humidité,
// fissures, terre battue) plus la provision monte ; plus on a d'info (détaillé + métré) plus elle
// baisse. N'utilise QUE des réponses déjà collectées → aucune donnée inventée. Bornée [7 %, 25 %].
function tauxImprevus(r: Reponses, metreUtilise: boolean, estReno: boolean): number {
  let t = 0.08;
  if (estReno) {
    switch (r.anneeConstruction) {
      case "avant_1949": t += 0.07; break;
      case "1949_1974": t += 0.05; break;
      case "1975_1997": t += 0.02; break;
      case "apres_1997": break;
      default: t += 0.03; // inconnue / absente → risque
    }
    if (r.curage === "complet") t += 0.04;
    else if (r.curage === "leger") t += 0.02;
    if (r.humidite) t += 0.02;
    if (r.fissuresStructure === "evolutives" || r.fissuresStructure === "traversantes") t += 0.03;
    if (r.solSupport === "terre_battue") t += 0.02;
  }
  if (r.modeEstimation === "detaille") t -= 0.02; // spec connue → moins d'aléa
  if (metreUtilise) t -= 0.02;                    // quantités mesurées → moins d'aléa
  return Math.min(0.25, Math.max(0.07, Math.round(t * 100) / 100));
}

function finaliser(ctx: Ctx, region: string, metreUtilise: boolean, r: Reponses): Estimation {
  const mode: "rapide" | "detaille" = ctx.serrage ? "detaille" : "rapide";
  const estReno = r.typeProjet !== "neuf";

  // 1) Prime d'ancienneté sur les lots structurels (rénovation uniquement).
  const coefAge = estReno ? coefAnciennete(r.anneeConstruction) : 1;
  if (coefAge !== 1) {
    for (const l of ctx.lignes) {
      if (!LOTS_ANCIENNETE.has(l.corpsEtat)) continue;
      l.bas = Math.round(l.bas * coefAge);
      l.haut = Math.round(l.haut * coefAge);
      l.moBas = Math.round(l.moBas * coefAge);
      l.moHaut = Math.round(l.moHaut * coefAge);
      l.fournBas = Math.round(l.fournBas * coefAge);
      l.fournHaut = Math.round(l.fournHaut * coefAge);
    }
  }

  // 2) Sommes (après prime d'ancienneté), puis provision imprévus dynamique.
  const sousBas = ctx.lignes.reduce((s, l) => s + l.bas, 0);
  const sousHaut = ctx.lignes.reduce((s, l) => s + l.haut, 0);
  const sousMoBas = ctx.lignes.reduce((s, l) => s + l.moBas, 0);
  const sousMoHaut = ctx.lignes.reduce((s, l) => s + l.moHaut, 0);
  const sousFournBas = ctx.lignes.reduce((s, l) => s + l.fournBas, 0);
  const sousFournHaut = ctx.lignes.reduce((s, l) => s + l.fournHaut, 0);

  const taux = tauxImprevus(r, metreUtilise, estReno);
  if (ctx.lignes.length > 0) {
    ctx.lignes.push({
      corpsEtat: "divers",
      poste: `Aléas & imprévus (${Math.round(taux * 100)} %)`,
      quantite: 1,
      unite: "forfait",
      bas: Math.round(sousBas * taux),
      haut: Math.round(sousHaut * taux),
      moBas: Math.round(sousMoBas * taux),
      moHaut: Math.round(sousMoHaut * taux),
      fournBas: Math.round(sousFournBas * taux),
      fournHaut: Math.round(sousFournHaut * taux),
    });
    if (taux >= 0.16)
      ctx.conseils.push(
        `Provision imprévus portée à ${Math.round(taux * 100)} %${estReno && (r.anneeConstruction === "avant_1949" || r.anneeConstruction === "1949_1974") ? " (bâti ancien)" : ""} : sur ce type de chantier, les surprises (réseaux, supports, reprises) sont la règle — garde ce matelas jusqu'à la réception.`
      );
  }
  const f = 1 + taux;
  const totalBas = Math.round(sousBas * f);
  const totalHaut = Math.round(sousHaut * f);
  const totalMedian = Math.round((totalBas + totalHaut) / 2);
  const semaines = Math.max(2, Math.round(totalMedian / 10000));
  return {
    lignes: ctx.lignes,
    totalBas,
    totalHaut,
    totalMedian,
    totalMoBas: Math.round(sousMoBas * f),
    totalMoHaut: Math.round(sousMoHaut * f),
    totalFournBas: Math.round(sousFournBas * f),
    totalFournHaut: Math.round(sousFournHaut * f),
    region,
    dureeSemaines: [semaines, Math.round(semaines * 1.5)],
    conseils: ctx.conseils,
    metreUtilise,
    mode,
  };
}

/** Ordre conseillé des corps d'état pour le planning. */
// Source unique : CORPS_ORDRE (customq.ts). « divers » en est exclu — les pages
// qui en ont besoin (artisans, projet) l'ajoutent explicitement en fin de liste.
export const ORDRE_TRAVAUX = CORPS_ORDRE.filter((c) => c !== "divers");

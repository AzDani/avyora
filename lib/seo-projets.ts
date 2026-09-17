import "server-only";
import {
  CATALOG,
  buildDevis,
  defaultCtx,
  key,
  ESPACES,
  type Ctx,
  type Selection,
  type TypeBien,
  type DevisLigne,
  regionCoef,
} from "@/lib/estimateur";
import { VILLES_SEO, type Ville } from "./villes";

/**
 * Options d'une tâche du panier. Un seul 4ᵉ élément partagé, pour que l'ajout d'un régime d'échelle
 * et l'ajout d'une variante de catalogue ne se marchent pas dessus.
 */
export type TacheOpts = {
  /** Régime d'échelle quand une surface est passée à estimProjet. Absent = inférence par défaut. */
  regime?: "sol" | "murs" | "unite";
  /** Variante de catalogue (`LigneSel.vsel`). Absent = option par défaut du poste. */
  vsel?: Record<string, string>;
};

/**
 * Une tâche du panier représentatif : [corps, nom exact du catalogue, quantité, options].
 *
 * ⚠️ PIÈGE SILENCIEUX : si `nom` ne correspond pas EXACTEMENT à un poste du catalogue, la ligne est
 * ignorée sans lever d'erreur — le total est faux et rien ne le signale. Vérifier tout panier écrit
 * à la main contre `catalog.json`, et re-vérifier après un renommage de poste.
 */
export type TacheSel = [corps: string, nom: string, qty: number, opts?: TacheOpts];

export interface Projet {
  slug: string;
  /** Nom en minuscules pour insérer dans une phrase : « une salle de bain ». */
  nom: string;
  /** Nom pour titres. */
  titre: string;
  h1: string;
  emoji: string;
  /** "piece" = mode pièce (surface d'un espace) ; "maison"/"appart" = un lot précis sur un bien. */
  kind: "piece" | "maison" | "appart";
  espace?: string;
  surface: number;
  type: TypeBien;
  /** Unité de référence affichée sous le budget (ex. "une salle de bain de 6 m²"). */
  base: string;
  lead: string;
  inclus: string[];
  facteurs: string[];
  astuce: string;
  aides?: string;
  /** Slugs de projets liés (maillage interne). */
  liens: string[];
  tasks: TacheSel[];
  /**
   * Surfaces déclinées dans le barème « prix selon la surface ». Renseigné uniquement pour les
   * projets où la surface de la pièce change réellement le devis (pièce entière), pas pour un lot
   * ponctuel. `surface` doit figurer dans la liste : c'est la ligne de référence.
   */
  surfaces?: number[];
  /**
   * Unité dans laquelle un ratio « soit environ X €/u » a un sens. **Omis = aucun ratio affiché.**
   *
   * Sans ce champ, la page divisait le total par `surface`, qui décrit pour la moitié des projets
   * LE LOGEMENT et non l'ouvrage : aménagement de combles affichait 185 €/m² au lieu de 463,
   * et un projet de 8 fenêtres ou d'un poêle affichait un « €/m² » dépourvu de sens.
   *
   * `tache` = nom EXACT d'une tâche de `tasks` ; la quantité est **lue** dans `tasks`, jamais
   * recopiée. Si le libellé du catalogue change, `find` échoue et la mention **disparaît** au lieu
   * d'afficher un faux chiffre — c'est la bonne défaillance, ne pas la « réparer » en figeant un
   * nombre. Omettre `tache` pour utiliser la surface du projet.
   */
  uniteBase?: { tache?: string; label: string };
  /**
   * Équipements à prix fixe cités dans le texte du barème par surface. Omis = repli sur `espace`.
   */
  equipFixes?: string;
  /**
   * Libellé court inséré dans le `<title>` quand un barème par surface est publié.
   * Renseigné À LA MAIN plutôt que dérivé de `h1` : `titreSansPrefixe` produit un groupe verbal sur
   * certains projets (« Prix pour aménager des combles » → « Prix aménager des combles 2026 »,
   * agrammatical). Omis = repli sur `titreSansPrefixe(h1)`.
   */
  titreSeo?: string;
  /**
   * Libellé utilisé UNIQUEMENT comme objet d'une tournure interrogative (« Combien coûte … ? »,
   * « Prix de … »). `nom` sert à des tournures verbales (« Estime … ») où il fonctionne bien, mais
   * comme objet d'une question il produisait du français cassé ou trompeur sur 12 projets :
   * « Combien coûte des combles ? », « … de la peinture ? », « … une façade ? » (le mur, pas le
   * ravalement), « … une toiture ? ». Ces phrases partent dans la meta description, la FAQ visible
   * ET le JSON-LD : c'est ce que l'internaute lit dans Google. Omis = repli sur `nom`.
   */
  nomQuestion?: string;
  /** Configurations alternatives du même chantier (bac / baignoire / italienne). */
  variantes?: PanierVariante[];
  /** Options qui s'ajoutent à la configuration de référence, une par ligne. */
  options?: PanierVariante[];
}

/**
 * Panier alternatif exprimé comme une MUTATION du panier de référence, jamais réécrit en entier :
 * un panier recopié à la main diverge du jour où on touche à `tasks`, et une faute de frappe dans un
 * nom de poste se traduit par une ligne silencieusement absente (donc un total faux sans erreur).
 * `panierVariante()` lève à la place — l'échec devient une erreur de build, pas un chiffre faux.
 */
export type PanierVariante = {
  label: string;
  /** Détail affiché sous le libellé (facultatif). */
  detail?: string;
  /** Noms EXACTS de tâches du panier de référence à retirer. */
  retirer?: string[];
  /** Tâches ajoutées (mêmes règles de nommage que `tasks`). */
  ajouter?: TacheSel[];
  /** Variante de catalogue appliquée à une tâche existante : nom de tâche → `vsel`. */
  choix?: Record<string, Record<string, string>>;
};

/** Applique une mutation au panier de référence. Lève si un nom de poste ne s'y trouve pas. */
export function panierVariante(p: Projet, v: PanierVariante): TacheSel[] {
  const noms = new Set(p.tasks.map((t) => t[1]));
  for (const n of v.retirer ?? [])
    if (!noms.has(n)) throw new Error(`Variante « ${v.label} » de ${p.slug} : poste à retirer introuvable — « ${n} »`);
  for (const n of Object.keys(v.choix ?? {}))
    if (!noms.has(n)) throw new Error(`Variante « ${v.label} » de ${p.slug} : poste à décliner introuvable — « ${n} »`);

  const retire = new Set(v.retirer ?? []);
  const out: TacheSel[] = p.tasks
    .filter((t) => !retire.has(t[1]))
    .map((t) => {
      const vsel = v.choix?.[t[1]];
      return vsel ? ([t[0], t[1], t[2], { ...t[3], vsel }] as TacheSel) : t;
    });
  return [...out, ...(v.ajouter ?? [])];
}

export const PROJETS: Projet[] = [
  {
    slug: "renovation-salle-de-bain",
    nom: "une salle de bain",
    titre: "salle de bain",
    h1: "Prix d'une rénovation de salle de bain en 2026",
    emoji: "🛁",
    kind: "piece",
    espace: "sdb",
    surface: 6,
    surfaces: [3, 4, 5, 6, 8, 10],
    type: "T3",
    nomQuestion: "la rénovation d'une salle de bain",
    titreSeo: "rénovation salle de bain",
    uniteBase: { label: "m²" },
    base: "une salle de bain de 6 m² refaite entièrement (douche, meuble-vasque, WC, faïence, sol)",
    lead:
      "Refaire entièrement une salle de bain est l'un des postes de rénovation les plus denses : sur seulement quelques m², on cumule plomberie, électricité, carrelage, étanchéité et ventilation. C'est ce qui explique un budget élevé au m².",
    inclus: [
      "Dépose de l'ancienne salle de bain (curage complet).",
      "Étanchéité sous carrelage, carrelage au sol et faïence murale.",
      "Douche complète : bac, colonne, paroi.",
      "Meuble-vasque, robinetterie, miroir et WC.",
      "Électricité de la pièce, VMC et sèche-serviette.",
    ],
    facteurs: [
      "Douche à l'italienne (plus chère qu'un bac) ou baignoire.",
      "Surface de faïence : toute hauteur ou demi-hauteur.",
      "Gamme des équipements (entrée de gamme à haut de gamme).",
      "Déplacement des arrivées d'eau et évacuations.",
    ],
    astuce:
      "Le poste qui fait déraper la facture, c'est le déplacement de la plomberie. Garder les arrivées d'eau à leur place peut économiser plusieurs centaines d'euros.",
    liens: ["renovation-cuisine", "renovation-chambre", "renovation-electrique", "douche-italienne", "remplacer-baignoire-par-douche"],
    // Mêmes travaux, équipement changé : le moteur rejoue le panier, aucun écart n'est écrit à la main.
    variantes: [
      { label: "Douche : bac + paroi + colonne", detail: "la configuration détaillée ci-dessus" },
      {
        label: "Baignoire à la place de la douche",
        detail: "baignoire encastrée et robinetterie bain",
        retirer: ["Bac de douche", "Paroi de douche", "Colonne de douche"],
        ajouter: [
          ["Plomberie", "Installer une baignoire", 1],
          ["Plomberie", "Robinetterie baignoire", 1],
        ],
      },
      {
        label: "Douche à l'italienne à la place du bac",
        detail: "receveur encastré, même surface de pièce",
        retirer: ["Bac de douche"],
        ajouter: [["Plomberie", "Douche à l'italienne", 1]],
      },
    ],
    // Une ligne = UNE variante du catalogue, jamais une quantité inventée.
    options: [
      { label: "WC suspendu au lieu d'un WC au sol", choix: { WC: { type: "suspendu" } } },
      { label: "Meuble double vasque au lieu d'un simple", choix: { "Meuble-vasque": { config: "double" } } },
      { label: "Colonne de douche encastrée", choix: { "Colonne de douche": { pose: "encastre" } } },
      {
        label: "Bac et paroi en 150 cm au lieu de 120",
        choix: { "Bac de douche": { dim: "150x90" }, "Paroi de douche": { dim: "150" } },
      },
      {
        label: "Les quatre options réunies",
        choix: {
          WC: { type: "suspendu" },
          "Meuble-vasque": { config: "double" },
          "Colonne de douche": { pose: "encastre" },
          "Bac de douche": { dim: "150x90" },
          "Paroi de douche": { dim: "150" },
        },
      },
    ],
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Cloisons / Platrerie", "Faux plafond", 6],
      ["Electricite", "Ajouter / déplacer une prise", 3],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Electricite", "Spots encastrés (LED)", 4],
      ["Plomberie", "WC", 1],
      ["Plomberie", "Meuble-vasque", 1],
      ["Plomberie", "Robinetterie lavabo", 1],
      ["Plomberie", "Miroir", 1],
      ["Plomberie", "Bac de douche", 1],
      ["Plomberie", "Colonne de douche", 1],
      ["Plomberie", "Paroi de douche", 1],
      ["Chauffage / VMC", "Sèche-serviette", 1],
      ["Chauffage / VMC", "Ventilation (VMC)", 1],
      ["Carrelage / Revetements", "Étanchéité sous carrelage (SPEC douche)", 2],
      ["Carrelage / Revetements", "Préparation du sol (ragréage)", 6],
      ["Carrelage / Revetements", "Carrelage au sol", 6],
      ["Carrelage / Revetements", "Faïence / carrelage mural", 18],
      ["Carrelage / Revetements", "Seuils / barres de seuil", 1],
      ["Peinture", "Préparation des surfaces", 6],
      ["Peinture", "Peinture des plafonds", 6],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
    ],
  },
  {
    slug: "renovation-cuisine",
    nom: "une cuisine",
    titre: "cuisine",
    h1: "Prix d'une rénovation de cuisine en 2026",
    emoji: "🍳",
    kind: "piece",
    espace: "cuisine",
    surface: 12,
    surfaces: [6, 8, 10, 12, 15, 20],
    type: "T3",
    nomQuestion: "la rénovation d'une cuisine",
    titreSeo: "rénovation cuisine",
    uniteBase: { label: "m²" },
    base: "une cuisine de 12 m² refaite avec un ensemble neuf de ~5 mètres linéaires",
    lead:
      "Le budget d'une cuisine dépend surtout du meuble et de l'électroménager : c'est le poste dominant, bien avant le sol ou la peinture. Une cuisine équipée neuve représente à elle seule la majorité de la facture.",
    inclus: [
      "Dépose de l'ancienne cuisine.",
      "Ensemble de cuisine neuf tout compris (~5 ml) : meubles, plan, électroménager, pose.",
      "Crédence, carrelage au sol et ragréage.",
      "Peinture des murs et du plafond.",
      "Électricité (prises plan de travail, éclairage) et création d'un point d'eau.",
    ],
    facteurs: [
      "Longueur de la cuisine (prix au mètre linéaire).",
      "Gamme des meubles et de l'électroménager.",
      "Présence d'un îlot central.",
      "Plan de travail : stratifié, bois, ou pierre.",
    ],
    astuce:
      "À agencement égal, passer d'une gamme premium à une gamme standard sur les meubles peut diviser le budget par deux. C'est le curseur le plus puissant.",
    liens: ["renovation-salle-de-bain", "renovation-chambre", "peinture-interieure"],
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Cuisine", "Cuisine complète neuve — tout compris", 5],
      ["Cuisine", "Crédence seule", 3],
      ["Carrelage / Revetements", "Préparation du sol (ragréage)", 12],
      ["Carrelage / Revetements", "Carrelage au sol", 12],
      ["Peinture", "Préparation des surfaces", 20],
      ["Peinture", "Peinture des murs", 20],
      ["Peinture", "Peinture des plafonds", 12],
      ["Electricite", "Ajouter / déplacer une prise", 5],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Electricite", "Spots encastrés (LED)", 3],
      ["Plomberie", "Créer / déplacer un point d'eau", 1],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
    ],
  },
  {
    slug: "renovation-chambre",
    nom: "une chambre",
    titre: "chambre",
    h1: "Prix d'une rénovation de chambre en 2026",
    emoji: "🛏️",
    kind: "piece",
    espace: "chambre",
    surface: 12,
    surfaces: [9, 10, 12, 14, 16],
    type: "T3",
    nomQuestion: "la rénovation d'une chambre",
    titreSeo: "rénovation chambre",
    uniteBase: { label: "m²" },
    base: "une chambre de 12 m² refaite (peinture, sol, électricité, placards)",
    lead:
      "Rénover une chambre est l'un des chantiers les plus abordables : pas d'eau, peu d'équipements. L'essentiel du budget part dans la peinture, le revêtement de sol et, si on en ajoute, les rangements.",
    inclus: [
      "Préparation des murs et peinture complète (murs + plafond).",
      "Sol stratifié et plinthes.",
      "Électricité : prises, interrupteurs, point lumineux.",
      "Un radiateur électrique.",
      "Une porte intérieure et quelques mètres de placards.",
    ],
    facteurs: [
      "Type de sol : stratifié, parquet massif, moquette.",
      "Placards sur mesure ou dressing (poste vite conséquent).",
      "État des murs (un ratissage lourd coûte plus qu'une simple préparation).",
      "Remplacement ou non de la fenêtre.",
    ],
    astuce:
      "Un parquet massif poncé-vitrifié coûte nettement plus qu'un stratifié posé. Sur une chambre, le stratifié offre le meilleur rapport rendu/prix.",
    liens: ["peinture-interieure", "renovation-salle-de-bain", "renovation-cuisine"],
    tasks: [
      ["Peinture", "Préparation des surfaces", 30],
      ["Peinture", "Peinture des murs", 30],
      ["Peinture", "Peinture des plafonds", 12],
      ["Carrelage / Revetements", "Sol stratifié (imitation bois)", 12],
      ["Carrelage / Revetements", "Plinthes", 14],
      ["Electricite", "Ajouter / déplacer une prise", 3],
      ["Electricite", "Ajouter / déplacer un interrupteur", 1],
      ["Electricite", "Ajouter un point lumineux", 1],
      ["Chauffage / VMC", "Radiateurs électriques", 1],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
      ["Menuiseries interieures", "Placards & rangements", 2],
    ],
  },
  {
    slug: "refaire-toiture",
    nom: "une toiture",
    titre: "toiture",
    h1: "Prix pour refaire une toiture en 2026",
    emoji: "🏠",
    kind: "maison",
    surface: 100,
    type: "Maison",
    nomQuestion: "une réfection de toiture",
    titreSeo: "réfection de toiture",
    uniteBase: { tache: "Réfection couverture tuiles (dépose + écran + liteaux)", label: "m² de couverture" },
    base: "une réfection de couverture tuiles d'environ 120 m² (maison de 100 m² au sol)",
    lead:
      "Refaire une toiture, c'est protéger tout le reste de la maison. Le prix se calcule au m² de couverture (souvent 20 à 30 % de plus que la surface habitable, à cause de la pente) et dépend fortement du matériau.",
    inclus: [
      "Dépose de l'ancienne couverture, écran sous-toiture et liteaux neufs.",
      "Couverture tuiles neuve posée.",
      "Gouttières et descentes.",
      "Raccords : faîtage, noues, solins.",
    ],
    facteurs: [
      "Matériau : tuile, ardoise (plus chère), zinc.",
      "Charpente à refaire ou non (gros surcoût).",
      "Surface et complexité de la toiture (pans, lucarnes).",
      "Isolation des combles réalisée dans la foulée.",
    ],
    astuce:
      "Profite de la réfection pour isoler par l'extérieur (sarking) ou souffler les combles : le gros du coût, c'est l'échafaudage et l'accès, déjà en place.",
    aides:
      "Si tu ajoutes une isolation performante, certains travaux ouvrent droit à MaPrimeRénov' et aux CEE — de quoi réduire la facture énergétique.",
    liens: ["ravalement-facade", "isolation-combles"],
    tasks: [
      ["Charpente, couverture & structure bois", "Réfection couverture tuiles (dépose + écran + liteaux)", 120],
      ["Charpente, couverture & structure bois", "Gouttières & descentes", 42],
      ["Charpente, couverture & structure bois", "Raccords (faîtage, noues, solins)", 20],
    ],
  },
  {
    slug: "ravalement-facade",
    nom: "une façade",
    titre: "façade",
    h1: "Prix d'un ravalement de façade en 2026",
    emoji: "🧱",
    kind: "maison",
    surface: 100,
    type: "Maison",
    nomQuestion: "un ravalement de façade",
    uniteBase: { tache: "Enduit monocouche (machine)", label: "m² de façade" },
    base: "un ravalement d'environ 110 m² de façade (nettoyage + enduit)",
    lead:
      "Le ravalement redonne son étanchéité et son allure à la maison. Le prix au m² dépend de la technique (nettoyage simple, enduit, ou isolation par l'extérieur) et de l'état du support.",
    inclus: [
      "Nettoyage complet de la façade.",
      "Enduit monocouche projeté à la machine.",
    ],
    facteurs: [
      "Technique : peinture, enduit, ou isolation par l'extérieur (ITE, la plus chère mais la plus performante).",
      "Hauteur et accès (échafaudage).",
      "État du support (fissures, reprises de maçonnerie).",
      "Nombre de façades à traiter.",
    ],
    astuce:
      "Coupler le ravalement avec une isolation par l'extérieur fait grimper le devis, mais c'est le meilleur moment pour le faire : l'échafaudage ne se monte qu'une fois.",
    aides:
      "Une isolation par l'extérieur réalisée pendant le ravalement peut ouvrir droit à MaPrimeRénov' et aux CEE.",
    liens: ["refaire-toiture", "isolation-combles"],
    tasks: [
      ["Façade", "Nettoyer la façade", 110],
      ["Façade", "Enduit monocouche (machine)", 110],
    ],
  },
  {
    slug: "isolation-combles",
    nom: "des combles",
    titre: "combles",
    h1: "Prix pour isoler des combles en 2026",
    emoji: "🧊",
    kind: "maison",
    surface: 100,
    type: "Maison",
    titreSeo: "isolation de combles perdus",
    nomQuestion: "l'isolation de combles perdus",
    uniteBase: { tache: "Isolation des combles perdus (soufflage)", label: "m² isolé" },
    base: "l'isolation de 70 m² de combles perdus par soufflage",
    lead:
      "L'isolation des combles est le meilleur rapport gain/euro de toute la rénovation énergétique : jusqu'à 30 % des déperditions de chaleur passent par le toit. Le soufflage de combles perdus est la solution la plus économique.",
    inclus: [
      "Soufflage d'isolant en combles perdus (forte épaisseur).",
    ],
    facteurs: [
      "Combles perdus (soufflage, économique) ou aménagés (rampants, plus cher).",
      "Épaisseur et type d'isolant.",
      "Accessibilité des combles.",
      "Pare-vapeur et reprise de la ventilation.",
    ],
    astuce:
      "Le soufflage de combles perdus est souvent le premier travaux à faire : peu cher, très efficace, et largement aidé.",
    aides:
      "L'isolation des combles est l'un des travaux les mieux aidés : MaPrimeRénov' et CEE peuvent couvrir une bonne partie du coût.",
    liens: ["refaire-toiture", "ravalement-facade"],
    tasks: [["Isolation", "Isolation des combles perdus (soufflage)", 70]],
  },
  {
    slug: "renovation-electrique",
    nom: "une installation électrique",
    titre: "électricité",
    h1: "Prix d'une rénovation électrique en 2026",
    emoji: "⚡",
    kind: "appart",
    surface: 70,
    type: "T3",
    nomQuestion: "la rénovation électrique d'un logement",
    uniteBase: { label: "m²" },
    base: "la remise à neuf complète de l'électricité d'un logement de 70 m²",
    lead:
      "Une installation électrique vétuste est le premier point noir d'une rénovation, pour la sécurité comme pour l'assurance. Une réno électrique complète remet aux normes tableau, réseau et points, avec attestation de conformité.",
    inclus: [
      "Réseau complet remis à neuf : câblage, tableau, protections, points (prises, interrupteurs, éclairage).",
      "Attestation de conformité Consuel.",
    ],
    facteurs: [
      "Surface et nombre de pièces (nombre de points).",
      "Réseau apparent ou encastré (saignées).",
      "Domotique / maison connectée.",
      "Mise à la terre à créer.",
    ],
    astuce:
      "Une rénovation électrique complète se fait toujours avant peinture et sols : elle nécessite des saignées dans les murs. La caler au bon moment évite de tout refaire.",
    liens: ["peinture-interieure", "renovation-salle-de-bain", "renovation-cuisine"],
    tasks: [
      ["Electricite", "Rénovation électrique complète", 70],
      ["Electricite", "Consuel (attestation de conformité)", 1],
    ],
  },
  {
    slug: "peinture-interieure",
    nom: "de la peinture",
    titre: "peinture",
    h1: "Prix d'une peinture intérieure en 2026",
    emoji: "🎨",
    kind: "appart",
    surface: 70,
    type: "T3",
    nomQuestion: "la peinture d'un logement",
    uniteBase: { label: "m²" },
    base: "la peinture complète d'un logement de 70 m² (murs + plafonds)",
    lead:
      "La peinture est le travaux le plus courant et le plus rentable pour transformer un logement. Le prix au m² dépend surtout de l'état des surfaces : un mur sain se peint vite, un mur abîmé demande de la préparation.",
    inclus: [
      "Préparation des surfaces (rebouchage, ponçage).",
      "Peinture des murs (deux couches).",
      "Peinture des plafonds.",
    ],
    facteurs: [
      "État initial des murs (préparation légère ou ratissage lourd).",
      "Nombre de couleurs et qualité de la peinture.",
      "Hauteur sous plafond.",
      "Boiseries et papier peint à traiter en plus.",
    ],
    astuce:
      "Le prix de la peinture, c'est surtout la préparation. Sur des murs déjà sains, tu paies surtout la pose ; sur des murs abîmés, la prépa peut doubler le devis.",
    liens: ["renovation-chambre", "renovation-cuisine", "renovation-electrique"],
    tasks: [
      ["Peinture", "Préparation des surfaces", 175],
      ["Peinture", "Peinture des murs", 175],
      ["Peinture", "Peinture des plafonds", 70],
    ],
  },
  {
    slug: "remplacer-baignoire-par-douche",
    nom: "un remplacement de baignoire par une douche",
    titre: "baignoire remplacée par une douche",
    h1: "Prix pour remplacer une baignoire par une douche en 2026",
    emoji: "🚿",
    kind: "piece",
    espace: "sdb",
    surface: 6,
    type: "T3",
    nomQuestion: "le remplacement d'une baignoire par une douche",
    titreSeo: "remplacement baignoire par douche",
    base: "le remplacement d'une baignoire par une douche (bac, paroi, carrelage de la zone)",
    lead:
      "Transformer une baignoire en douche est l'un des travaux de salle de bain les plus demandés : plus pratique, plus sûr, et cela libère de la place. Le budget reste contenu tant qu'on ne déplace pas les arrivées d'eau.",
    inclus: [
      "Dépose de l'ancienne baignoire et de son habillage.",
      "Étanchéité sous carrelage de la zone douche.",
      "Bac de douche, colonne et paroi.",
      "Carrelage au sol et faïence autour de la douche.",
      "Reprise du point d'eau.",
    ],
    facteurs: [
      "Douche à l'italienne (receveur encastré) plus chère qu'un bac posé.",
      "Déplacement de l'évacuation (le poste qui coûte le plus).",
      "Surface de faïence reprise.",
      "Gamme de la paroi et de la robinetterie.",
    ],
    astuce:
      "Garder l'évacuation existante et poser un bac extra-plat plutôt qu'une italienne à receveur maçonné, c'est le moyen le plus simple de tenir le budget.",
    liens: ["renovation-salle-de-bain", "douche-italienne", "pose-carrelage"],
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Plomberie", "Créer / déplacer un point d'eau", 1],
      ["Carrelage / Revetements", "Étanchéité sous carrelage (SPEC douche)", 2],
      ["Plomberie", "Bac de douche", 1],
      ["Plomberie", "Colonne de douche", 1],
      ["Plomberie", "Paroi de douche", 1],
      ["Carrelage / Revetements", "Carrelage au sol", 6],
      ["Carrelage / Revetements", "Faïence / carrelage mural", 12],
    ],
  },
  {
    slug: "douche-italienne",
    nom: "une douche à l'italienne",
    titre: "douche à l'italienne",
    h1: "Prix d'une douche à l'italienne en 2026",
    emoji: "🚿",
    kind: "piece",
    espace: "sdb",
    surface: 6,
    type: "T3",
    base: "la création d'une douche à l'italienne (receveur encastré, paroi, carrelage)",
    lead:
      "La douche à l'italienne, de plain-pied, est le haut du panier de la salle de bain moderne. Elle coûte plus qu'un simple bac car elle demande un receveur encastré, une étanchéité soignée et un carrelage sur mesure.",
    inclus: [
      "Dépose de l'ancien équipement.",
      "Receveur à carreler et étanchéité renforcée (SPEC).",
      "Douche à l'italienne, colonne et paroi.",
      "Carrelage au sol et faïence.",
    ],
    facteurs: [
      "Création de la pente et de l'évacuation encastrée.",
      "Format du carrelage (grand format = pose plus technique).",
      "Surface de la douche.",
      "Gamme de la robinetterie et de la paroi.",
    ],
    astuce:
      "L'étanchéité (SPEC) est le poste à ne jamais négliger : une italienne mal étanchée, c'est un dégât des eaux garanti. Ne rogne pas là-dessus.",
    liens: ["remplacer-baignoire-par-douche", "renovation-salle-de-bain", "pose-carrelage"],
    tasks: [
      ["Démolition", "Dépose complète cuisine / salle de bain (curage)", 1],
      ["Plomberie", "Créer / déplacer un point d'eau", 1],
      ["Carrelage / Revetements", "Étanchéité sous carrelage (SPEC douche)", 3],
      ["Plomberie", "Douche à l'italienne", 1],
      ["Plomberie", "Colonne de douche", 1],
      ["Plomberie", "Paroi de douche", 1],
      ["Carrelage / Revetements", "Carrelage au sol", 6],
      ["Carrelage / Revetements", "Faïence / carrelage mural", 12],
    ],
  },
  {
    slug: "amenagement-combles",
    nom: "un aménagement de combles",
    titre: "aménagement de combles",
    h1: "Prix pour aménager des combles en 2026",
    emoji: "🪜",
    kind: "maison",
    // `base` annonce 40 m² de combles et toutes les tâches sont calibrées sur 40 : déclarer 100
    // (la maison au sol) faisait afficher 185 €/m² au lieu de 463. Neutre sur le prix — toutes
    // les quantités sont `manual: true`, donc aucune ligne du devis ne bouge.
    surface: 40,
    surfaces: [20, 30, 40, 60, 80],
    type: "Maison",
    titreSeo: "aménagement de combles",
    equipFixes: "fenêtres de toit, radiateurs, porte",
    uniteBase: { tache: "Isolation des combles aménagés (rampants)", label: "m² aménagé" },
    base: "l'aménagement de 40 m² de combles en pièce habitable",
    lead:
      "Aménager ses combles, c'est gagner une pièce sans pousser les murs — souvent le mètre carré le moins cher d'une maison. Le budget dépend de l'isolation, des ouvertures de toit et du niveau de finition.",
    inclus: [
      "Isolation des rampants et pare-vapeur.",
      "Doublage placo, cloisons et faux plafond.",
      "Deux fenêtres de toit (Velux).",
      "Sol, électricité, chauffage et peinture complète.",
      "Une porte intérieure.",
    ],
    facteurs: [
      "Hauteur sous plafond et modification de charpente.",
      "Nombre de fenêtres de toit.",
      "Création d'un escalier d'accès.",
      "Ajout d'une salle d'eau dans les combles.",
    ],
    astuce:
      "Vérifie d'abord la hauteur sous faîtage (idéalement > 1,80 m sur une bonne surface) et la pente : sous 35°, l'aménagement devient vite compliqué et cher.",
    aides:
      "L'isolation des combles aménagés ouvre droit à MaPrimeRénov' et aux CEE — pense à faire réaliser le volet isolation par un artisan RGE.",
    liens: ["isolation-combles", "refaire-toiture", "peinture-interieure"],
    tasks: [
      ["Isolation", "Isolation des combles aménagés (rampants)", 40],
      ["Cloisons / Platrerie", "Doubler un mur", 40],
      ["Cloisons / Platrerie", "Faux plafond", 20, { regime: "sol" }],
      ["Charpente, couverture & structure bois", "Fenêtre de toit (Velux)", 2],
      ["Carrelage / Revetements", "Sol stratifié (imitation bois)", 40],
      ["Electricite", "Ajouter / déplacer une prise", 6],
      ["Electricite", "Ajouter un point lumineux", 2],
      ["Electricite", "Spots encastrés (LED)", 4],
      ["Chauffage / VMC", "Radiateurs électriques", 2],
      ["Peinture", "Préparation des surfaces", 100, { regime: "murs" }],
      ["Peinture", "Peinture des murs", 100],
      ["Peinture", "Peinture des plafonds", 40],
      ["Menuiseries interieures", "Porte intérieure battante", 1],
    ],
  },
  {
    slug: "remplacement-fenetres",
    nom: "un remplacement de fenêtres",
    titre: "fenêtres",
    h1: "Prix pour changer ses fenêtres en 2026",
    emoji: "🪟",
    kind: "maison",
    surface: 100,
    type: "Maison",
    nomQuestion: "le remplacement de fenêtres",
    titreSeo: "remplacement de fenêtres",
    uniteBase: { tache: "Fenêtres", label: "fenêtre" },
    base: "le remplacement de 8 fenêtres et de leurs volets roulants",
    lead:
      "Changer ses fenêtres améliore le confort, réduit la facture de chauffage et le bruit. Le prix se compte à l'unité et dépend surtout du matériau (PVC, alu, bois) et du vitrage.",
    inclus: [
      "Dépose des anciennes menuiseries.",
      "Huit fenêtres neuves double vitrage posées.",
      "Volets roulants.",
    ],
    facteurs: [
      "Matériau : PVC (le plus économique), aluminium, bois.",
      "Double ou triple vitrage.",
      "Dimensions et formes spécifiques (cintrées, grandes baies).",
      "Pose en rénovation (sur dormant existant) ou en dépose totale.",
    ],
    astuce:
      "Le PVC double vitrage offre le meilleur rapport isolation/prix pour la majorité des logements. L'alu se justifie surtout sur les grandes baies.",
    aides:
      "Le remplacement de fenêtres en simple vitrage par du double performant peut être éligible à MaPrimeRénov' et aux CEE.",
    liens: ["ravalement-facade", "isolation-combles", "peinture-interieure"],
    tasks: [
      ["Démolition", "Enlever les anciennes portes / fenêtres", 8],
      ["Menuiseries exterieures", "Fenêtres", 8],
      ["Menuiseries exterieures", "Volets roulants", 8],
    ],
  },
  {
    slug: "pose-carrelage",
    nom: "une pose de carrelage",
    titre: "pose de carrelage",
    h1: "Prix de pose de carrelage au m² en 2026",
    emoji: "◻️",
    kind: "appart",
    surface: 40,
    type: "T3",
    titreSeo: "pose de carrelage",
    nomQuestion: "la pose de carrelage",
    uniteBase: { label: "m²" },
    base: "la pose de 40 m² de carrelage au sol (ragréage inclus)",
    lead:
      "Le carrelage reste le revêtement de sol le plus durable. Le prix au m² dépend du format des carreaux, du type de pose (droite ou diagonale) et de la préparation du support.",
    inclus: [
      "Préparation du sol (ragréage).",
      "Fourniture et pose du carrelage.",
      "Plinthes assorties.",
    ],
    facteurs: [
      "Format des carreaux (le grand format et les petits mosaïques coûtent plus à poser).",
      "Type de pose : droite, en diagonale, à joints décalés.",
      "Qualité du carrelage choisi.",
      "État et planéité du support.",
    ],
    astuce:
      "La pose droite en format standard (60×60) est la plus économique. Diagonale et très grands formats font grimper le prix de pose.",
    liens: ["pose-parquet", "renovation-salle-de-bain", "renovation-cuisine"],
    tasks: [
      ["Carrelage / Revetements", "Préparation du sol (ragréage)", 40],
      ["Carrelage / Revetements", "Carrelage au sol", 40],
      ["Carrelage / Revetements", "Plinthes", 30],
    ],
  },
  {
    slug: "pose-parquet",
    nom: "une pose de parquet",
    titre: "pose de parquet",
    h1: "Prix de pose de parquet au m² en 2026",
    emoji: "🪵",
    kind: "appart",
    surface: 40,
    type: "T3",
    titreSeo: "pose de parquet",
    nomQuestion: "la pose de parquet",
    uniteBase: { label: "m²" },
    base: "la pose de 40 m² de parquet (plinthes incluses)",
    lead:
      "Le parquet apporte chaleur et cachet. Le prix au m² varie beaucoup selon qu'il s'agit d'un stratifié, d'un contrecollé ou d'un parquet massif à poncer et vitrifier.",
    inclus: [
      "Fourniture et pose du parquet.",
      "Plinthes assorties.",
    ],
    facteurs: [
      "Type : stratifié (économique), contrecollé, massif (le plus cher).",
      "Pose flottante (rapide) ou collée/clouée.",
      "Ponçage et vitrification pour un parquet massif.",
      "Préparation du sol si nécessaire.",
    ],
    astuce:
      "Le stratifié en pose flottante est imbattable côté prix ; le massif se justifie pour la durée de vie et la possibilité de le poncer plusieurs fois.",
    liens: ["pose-carrelage", "renovation-chambre", "peinture-interieure"],
    tasks: [
      ["Carrelage / Revetements", "Parquet bois", 40],
      ["Carrelage / Revetements", "Plinthes", 30],
    ],
  },
  {
    slug: "pompe-a-chaleur",
    nom: "une pompe à chaleur",
    titre: "pompe à chaleur",
    h1: "Prix d'une pompe à chaleur en 2026",
    emoji: "🌡️",
    kind: "maison",
    surface: 100,
    type: "Maison",
    base: "l'installation d'une pompe à chaleur air/eau pour une maison de 100 m²",
    lead:
      "La pompe à chaleur air/eau est aujourd'hui le chauffage le plus économique à l'usage et le plus aidé. L'investissement de départ est conséquent, mais amorti par les économies d'énergie et les aides.",
    inclus: [
      "Fourniture et pose d'une pompe à chaleur air/eau.",
      "Désembouage du réseau de chauffage.",
      "Thermostat / pilotage.",
    ],
    facteurs: [
      "Puissance nécessaire (surface, isolation, région).",
      "Type : air/eau, air/air, géothermie.",
      "Émetteurs existants (radiateurs, plancher chauffant).",
      "Dépose de l'ancienne chaudière.",
    ],
    astuce:
      "Une PAC ne donne son plein rendement que dans un logement correctement isolé. Isoler d'abord, chauffer ensuite : c'est l'ordre gagnant.",
    aides:
      "La pompe à chaleur air/eau est l'un des équipements les mieux aidés : MaPrimeRénov' et CEE peuvent couvrir plusieurs milliers d'euros.",
    liens: ["isolation-combles", "poele-a-bois", "renovation-electrique"],
    tasks: [
      ["Chauffage / VMC", "Pompe à chaleur (air/eau)", 1],
      ["Chauffage / VMC", "Désembouage du réseau de chauffage", 1],
      ["Chauffage / VMC", "Thermostat / pilotage", 1],
    ],
  },
  {
    slug: "poele-a-bois",
    nom: "un poêle à bois",
    titre: "poêle à bois",
    h1: "Prix d'un poêle à bois en 2026",
    emoji: "🔥",
    kind: "maison",
    surface: 100,
    type: "Maison",
    base: "la fourniture et la pose d'un poêle à bois ou à granulés",
    lead:
      "Le poêle à bois ou à granulés est un chauffage d'appoint (ou principal sur les petites surfaces) économique et chaleureux. Le prix dépend de l'appareil et du conduit à créer.",
    inclus: [
      "Fourniture et pose d'un poêle à bois ou à granulés.",
    ],
    facteurs: [
      "Bois bûche ou granulés (le granulé se pilote, il est plus cher).",
      "Création ou tubage du conduit de fumée.",
      "Puissance de l'appareil.",
      "Habillage et protection du sol.",
    ],
    astuce:
      "Le plus gros poste caché, c'est le conduit. S'il n'existe pas, prévois un budget conduit/tubage en plus de l'appareil.",
    aides:
      "Un poêle labellisé Flamme Verte peut ouvrir droit à MaPrimeRénov' et aux CEE.",
    liens: ["pompe-a-chaleur", "isolation-combles", "amenagement-combles"],
    tasks: [["Chauffage / VMC", "Poêle à bois / granulés", 1]],
  },
];

/**
 * « Prix d'une rénovation de salle de bain en 2026 » → « rénovation de salle de bain ».
 * SOURCE UNIQUE : le gabarit projet et le gabarit ville doivent composer leurs titles à partir d'ici,
 * sinon les deux libellés divergent au premier ajustement de `h1`.
 */
export const titreSansPrefixe = (h1: string) =>
  h1
    .replace("Prix d'une ", "")
    .replace("Prix d'un ", "")
    .replace("Prix pour ", "")
    .replace("Prix de ", "")
    .replace("Prix ", "")
    .replace(" en 2026", "");

/**
 * Espaces de `Projet` qui correspondent à une pièce que l'estimateur rapide sait présélectionner
 * (`PieceKey`). Les autres projets (toiture, façade, fenêtres, PAC…) ne décrivent pas une pièce :
 * pour eux on n'amorce rien, plutôt que de deviner.
 */
export const PIECES_ESTIMATEUR = new Set<string>(["cuisine", "sdb", "chambre", "salon", "suite", "buanderie"]);

export function projetBySlug(slug: string): Projet | undefined {
  return PROJETS.find((p) => p.slug === slug);
}

/**
 * Projets qui reçoivent une déclinaison par ville (« prix [travaux] à [ville] »).
 * On limite la matrice aux travaux fortement dépendants de la main-d'œuvre (donc de la région),
 * pour que chaque page ville ait des prix réellement différents et un intérêt éditorial.
 */
export const MATRIX_SLUGS = new Set<string>([
  "renovation-salle-de-bain",
  "renovation-cuisine",
  "renovation-chambre",
  "peinture-interieure",
  "renovation-electrique",
  "refaire-toiture",
  "ravalement-facade",
  "remplacement-fenetres",
  "remplacer-baignoire-par-douche",
  "pose-carrelage",
]);

export const projetsMatrix = (): Projet[] => PROJETS.filter((p) => MATRIX_SLUGS.has(p.slug));

/**
 * Villes déclinées par la matrice « prix [travaux] à [ville] ». SOURCE DE VÉRITÉ UNIQUE :
 * le sitemap, generateStaticParams et les liens internes doivent tous partir d'ici. Quand ces
 * listes divergeaient (40 générées, 24 liées), 160 pages se retrouvaient sans aucun lien entrant.
 */

export const MATRIX_CITY_COUNT = 40;
export const MATRIX_VILLES = VILLES_SEO.slice(0, MATRIX_CITY_COUNT);

/**
 * Villes de la matrice déclarées au sitemap ET indexables : **une par zone de main-d'œuvre**.
 *
 * POURQUOI CE CRITÈRE, et pas « les N plus grandes ». Mesuré sur le HTML généré : les 400 pages
 * « prix [travaux] à [ville] » ne produisent que 30 réponses distinctes — 10 projets × 3 zones,
 * la seule variable locale du moteur. Deux villes d'une même zone sont identiques à plus de 95 %
 * (Lille vs Nantes : 96,7 % ; Marseille vs Nice : 96,9 % — sur 748 mots, seuls la ville, le
 * département et la région changent). Le cahier des charges interdit « des centaines de pages
 * quasi identiques ».
 *
 * Un seuil par RANG (« les 8 premières ») ne réglait rien : ces 8 villes ne couvraient que
 * 3 zones, donc 70 des 80 pages épargnées gardaient un quasi-jumeau lui aussi déclaré au sitemap.
 * Le problème était divisé par cinq, pas résolu. Dédupliquer sur la zone est le SEUL découpage
 * qui rende les pages déclarées réellement distinctes entre elles.
 *
 * La ville retenue par zone est la première de `VILLES_SEO`, qui est ordonnée par taille : on
 * garde donc la plus grande de chaque zone. Les autres restent générées, accessibles et liées —
 * elles portent seulement `noindex, follow`.
 *
 * ⚠️ CRITÈRE DE RÉOUVERTURE — il doit être OBSERVABLE SOUS noindex. Une page noindex ne produit ni
 * impression ni clic : « attendre que Search Console montre que la longue traîne existe » ne peut
 * jamais être satisfait, puisque le noindex empêche la mesure qui le lèverait. Le critère porte
 * donc sur les pages RESTÉES indexables : si elles prennent des impressions régulières sur des
 * requêtes contenant un nom de ville, la demande locale existe et on peut élargir — en ajoutant
 * des villes d'une zone DÉJÀ représentée, ce qui recréerait des jumeaux. Ce jour-là, il faudra
 * d'abord donner à ces pages un contenu local réel, sans quoi le problème revient à l'identique.
 */
const zoneDe = (cp: string): string => {
  const r = regionCoef(cp);
  return `${r.zone}|${r.mo}|${r.mat}`;
};

/** Une ville par zone de main-d'œuvre, la plus grande de chaque zone. */
export const MATRIX_VILLES_INDEXABLES: Ville[] = (() => {
  const vues = new Set<string>();
  return MATRIX_VILLES.filter((v) => {
    const z = zoneDe(v.cp);
    if (vues.has(z)) return false;
    vues.add(z);
    return true;
  });
})();


/** Une page « prix [travaux] à [ville] » est-elle indexable ? Règle écrite UNE fois. */
export const matriceIndexable = (villeSlug: string): boolean =>
  MATRIX_VILLES_INDEXABLES.some((v) => v.slug === villeSlug);

/**
 * Liens d'un projet, rendus RÉCIPROQUES automatiquement : aux liens déclarés on ajoute les projets
 * qui pointent vers celui-ci. Sans ça le graphe manuel laissait des puits (des pages qui émettent
 * des liens sans jamais en recevoir), et donc des pages sans PageRank interne.
 */
export function liensDe(slug: string): string[] {
  const p = projetBySlug(slug);
  if (!p) return [];
  const out = new Set<string>(p.liens);
  for (const autre of PROJETS) if (autre.slug !== slug && autre.liens.includes(slug)) out.add(autre.slug);
  return [...out];
}

export interface LotBreakdown {
  corps: string;
  ttc: number;
  lignes: { nom: string; qty: number; unite: string; ttc: number }[];
}
export interface ProjetEstim {
  ttc: number;
  surface: number;
  /**
   * Décomposition du total, telle que le moteur la calcule (`bilan()` + `totals()`), en HT.
   * Publiée nulle part jusqu'ici alors que c'est l'information la plus différenciante du produit :
   * les comparateurs affichent une fourchette, AVYORA peut dire ce qu'il y a dedans.
   * `aleas` est la provision pour imprévus (7 %), incluse dans tout total publié — seule
   * /methodologie la nommait, une page de prix qui l'inclut sans le dire n'est pas honnête.
   */
  materiaux: number;
  mainOeuvre: number;
  aleas: number;
  ht: number;
  lots: LotBreakdown[];
}

/**
 * Ouvrages qui suivent le DÉVELOPPÉ DES MURS et non la surface au sol : leur quantité varie comme
 * le périmètre, donc en racine de la surface (un sol deux fois plus grand n'a que ~1,4 fois plus de
 * murs). Les traiter au prorata du sol surestimerait franchement les grandes pièces.
 */
const TACHES_MURS = new Set<string>([
  "Faïence / carrelage mural",
  "Peinture des murs",
  "Doubler un mur",
]);

/**
 * Quantité d'une tâche ramenée à une autre surface de pièce. Trois régimes :
 * — murs : ∝ périmètre, donc ∝ √surface ;
 * — sol/plafond (la quantité vaut la surface de référence) : ∝ surface ;
 * — équipements (WC, douche, VMC, porte…) : constants — une pièce plus grande n'a pas deux WC.
 */
function qtyPourSurface(t: TacheSel, sRef: number, s: number): number {
  const [, nom, q, opts] = t;
  if (s === sRef) return q;
  const ratio = s / sRef;
  const sol = () => Math.round(q * ratio * 10) / 10;
  const murs = () => Math.round(q * Math.sqrt(ratio) * 10) / 10;
  // Un régime DÉCLARÉ prime sur l'inférence : une tâche dont la quantité ne vaut pas la surface de
  // référence (faux plafond sur une partie de la pièce, préparation murale au développé) resterait
  // sinon figée, et le barème afficherait une variation visiblement fausse.
  if (opts?.regime) return opts.regime === "sol" ? sol() : opts.regime === "murs" ? murs() : q;
  if (TACHES_MURS.has(nom)) return murs();
  if (Math.abs(q - sRef) < 0.01) return sol();
  return q;
}

/**
 * Chiffre le panier représentatif d'un projet via le MÊME moteur que l'estimateur (prix cohérents).
 * `surface` permet de rejouer le même panier sur une autre taille de pièce (barème par surface).
 */
export function estimProjet(p: Projet, cp = "", surface?: number, tasks?: TacheSel[]): ProjetEstim {
  const s = surface && surface > 0 ? surface : p.surface;
  const paniers = tasks ?? p.tasks;
  const base = defaultCtx();
  let ctx: Ctx = {
    ...base,
    type: p.type,
    surface: s,
    surfaceSol: s,
    surfaceSolManual: true,
    niveaux: 1,
    finition: "standard",
    codePostal: cp,
    aleas: 7,
  };
  if (p.kind === "piece" && p.espace) {
    const e = ESPACES[p.espace];
    ctx = { ...ctx, ...e.ctx, surface: s, surfaceSol: s, perimetre: "piece", espace: p.espace };
  }

  const sel: Selection = {};
  for (const t of paniers) {
    const [c, n, , opts] = t;
    sel[key(c, n)] = {
      on: true,
      self: false,
      qty: qtyPourSurface(t, p.surface, s),
      manual: true,
      ...(opts?.vsel ? { vsel: opts.vsel } : {}),
    };
  }

  const dv = buildDevis(CATALOG, ctx, sel);

  // Regroupe les lignes par corps d'état, en conservant l'ordre du catalogue.
  const order = CATALOG.map((l) => l.c);
  const byCorps = new Map<string, DevisLigne[]>();
  for (const li of dv.lignes) {
    if (li.ttc <= 0) continue;
    if (!byCorps.has(li.corps)) byCorps.set(li.corps, []);
    byCorps.get(li.corps)!.push(li);
  }
  const lots: LotBreakdown[] = [...byCorps.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([corps, lignes]) => ({
      corps,
      ttc: Math.round(lignes.reduce((s, l) => s + l.ttc, 0)),
      lignes: lignes.map((l) => ({ nom: l.nom, qty: l.qty, unite: l.unite, ttc: Math.round(l.ttc) })),
    }));

  return {
    ttc: Math.round(dv.totaux.ttc),
    surface: ctx.surface,
    materiaux: Math.round(dv.bilan.matA),
    mainOeuvre: Math.round(dv.bilan.moA),
    aleas: Math.round(dv.totaux.aleas),
    ht: Math.round(dv.totaux.ht),
    lots,
  };
}

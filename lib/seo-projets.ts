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
} from "@/lib/estimateur";

/** Une tâche du panier représentatif : [corps, nom exact du catalogue, quantité]. */
export type TacheSel = [corps: string, nom: string, qty: number];

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
    type: "T3",
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
    liens: ["renovation-cuisine", "renovation-chambre", "renovation-electrique"],
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
    type: "T3",
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
    type: "T3",
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
    surface: 100,
    type: "Maison",
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
      ["Cloisons / Platrerie", "Faux plafond", 20],
      ["Charpente, couverture & structure bois", "Fenêtre de toit (Velux)", 2],
      ["Carrelage / Revetements", "Sol stratifié (imitation bois)", 40],
      ["Electricite", "Ajouter / déplacer une prise", 6],
      ["Electricite", "Ajouter un point lumineux", 2],
      ["Electricite", "Spots encastrés (LED)", 4],
      ["Chauffage / VMC", "Radiateurs électriques", 2],
      ["Peinture", "Préparation des surfaces", 100],
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

export interface LotBreakdown {
  corps: string;
  ttc: number;
  lignes: { nom: string; qty: number; unite: string; ttc: number }[];
}
export interface ProjetEstim {
  ttc: number;
  surface: number;
  lots: LotBreakdown[];
}

/** Chiffre le panier représentatif d'un projet via le MÊME moteur que l'estimateur (prix cohérents). */
export function estimProjet(p: Projet, cp = ""): ProjetEstim {
  const base = defaultCtx();
  let ctx: Ctx = {
    ...base,
    type: p.type,
    surface: p.surface,
    surfaceSol: p.surface,
    surfaceSolManual: true,
    niveaux: 1,
    finition: "standard",
    codePostal: cp,
    aleas: 7,
  };
  if (p.kind === "piece" && p.espace) {
    const e = ESPACES[p.espace];
    ctx = { ...ctx, ...e.ctx, surface: e.surface, surfaceSol: e.surface, perimetre: "piece", espace: p.espace };
  }

  const sel: Selection = {};
  for (const [c, n, q] of p.tasks) sel[key(c, n)] = { on: true, self: false, qty: q, manual: true };

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

  return { ttc: Math.round(dv.totaux.ttc), surface: ctx.surface, lots };
}

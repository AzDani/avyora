/**
 * D4 — mappage des types de pièces de l'éditeur de plan vers les compteurs du moteur.
 *
 * L'estimateur est la source de vérité : ce fichier TRADUIT le vocabulaire du plan vers le sien,
 * il ne change aucune formule. Rien ne l'importe encore — il sera appelé au branchement (phase 4).
 *
 * TROIS RÈGLES, dans cet ordre de priorité.
 *
 * 1. Un compteur est d'abord ce que l'utilisateur relira. La décision D1 du 18/09/2026 renvoie
 *    l'utilisateur sur l'intake détaillé pour valider avant chiffrage : chaque compteur est donc
 *    lu sous son libellé français (« Séjour / salon », « Couloir / dégagement »,
 *    « Buanderie / cellier », « Salles de bain · hors suite »…). Un type du plan entre dans un
 *    compteur quand l'utilisateur, devant ce libellé, y compterait spontanément sa pièce.
 *    Un type qui n'a pas de case honnête n'entre nulle part — il ne squatte pas la case voisine.
 *
 * 2. Une pièce d'eau se reconnaît à l'appareil posé, jamais au nom de la pièce. `sdbEff` vaut
 *    `sdb + suites` (core.ts) : compter une suite parentale ET sa salle de bain dessinée
 *    facturerait deux salles de bain pour une seule. Ici, c'est la douche ou la baignoire posée
 *    sur le plan qui décide, ce qui rattrape aussi la douche du sous-sol ou du garage — que le
 *    type de pièce ne peut pas signaler.
 *
 * 3. « Aucun compteur » veut dire ÉCRIRE ZÉRO. `defaultCtx()` livre séjour 1, cuisine 1,
 *    chambres 3, couloir 1 : un plan qui n'écrirait que les compteurs qu'il sait remplir
 *    laisserait ces valeurs par défaut en place et chiffrerait des pièces qui n'existent pas.
 *    `compteursDepuisPlan` renvoie donc toujours les huit champs.
 *
 * CE QUE LE MAPPAGE PÈSE, MESURÉ (T3 70 m², rénovation complète, CP 33620) :
 * une pièce de plus vaut 1 152 € TTC aujourd'hui, mais 149 € une fois que le plan injecte ses
 * mesures (radiateur 516 €, porte 325 €, plinthes 103 €) — il ne reste que « Seuils / barres de
 * seuil » (41 €) et « Peinture des boiseries » (99 €), les deux seuls postes par pièce que le
 * plan ne mesure pas.
 * Une salle de bain de plus vaut 3 111 € aujourd'hui et 913 € après injection des appareils —
 * dont 858 € de « Faïence / carrelage mural », forfaitisée à 12 m² par salle de bain.
 * D'où la règle de livraison : ce mappage ne part JAMAIS sans l'injection mesurée — livré seul,
 * chaque erreur de case coûte 1 152 € au lieu de 149 €.
 */

/** Les 20 types de pièces de l'éditeur de plan (ROOM_TYPES, maquettes/plan-editor.html). */
export type TypePiecePlan =
  | "sejour" | "cuisine" | "chambre" | "suite" | "sdb" | "wc"
  | "entree" | "couloir" | "buanderie" | "sde" | "dressing" | "bureau" | "cellier"
  | "palier" | "mezzanine" | "garage" | "cave" | "combles" | "exterieur" | "autre";

/** Les compteurs du moteur qu'un type de pièce peut alimenter. `null` = aucun, on écrit 0. */
export type CompteurPiece = "sejour" | "cuisine" | "chambres" | "suites" | "couloir" | "buanderie" | "sdb" | "wc" | null;

export interface RegleMappage {
  /** Compteur visé. `eau` et `wc` sont indicatifs : ces deux-là sont décidés par l'appareil posé. */
  compteur: CompteurPiece;
  /** La pièce entre-t-elle dans la surface habitable ? (miroir des drapeaux ext / nh du plan) */
  habitable: boolean;
  /** Libellé lu par l'utilisateur dans l'intake détaillé, ou pourquoi il n'y en a pas. */
  note: string;
}

export const MAPPAGE_PIECES: Record<TypePiecePlan, RegleMappage> = {
  sejour:    { compteur: "sejour",    habitable: true,  note: "Stepper « Séjour / salon ». Plafonne aussi la prise RJ45 du séjour à 1, quel que soit le nombre de faces." },
  cuisine:   { compteur: "cuisine",   habitable: true,  note: "Stepper « Cuisine ». Le lot Cuisine lui-même n'a aucune quantité automatique : il se remplit à la mesure (linéaire des meubles)." },
  chambre:   { compteur: "chambres",  habitable: true,  note: "Stepper « Chambres ». Seul compteur qui porte encore un poste non mesurable par le plan : la prise RJ45 (le plan n'a pas de symbole réseau)." },
  bureau:    { compteur: "chambres",  habitable: true,  note: "Compté en chambre : mêmes besoins (porte, radiateur, prise réseau) et un particulier le déclare comme une pièce de ce type." },
  suite:     { compteur: "suites",    habitable: true,  note: "Stepper « Suite parentale · chambre + SDB ». Le moteur lui ajoute une salle de bain : la suite ne compte donc en `suites` que si sa pièce d'eau est DANS la face. Sinon c'est une chambre, et sa salle de bain est comptée là où elle est dessinée." },
  sdb:       { compteur: "sdb",       habitable: true,  note: "Stepper « Salles de bain · hors suite »." },
  sde:       { compteur: "sdb",       habitable: true,  note: "Comptée comme une salle de bain : les 14 postes pilotés par ce compteur sont douche + vasque + faïence, jamais baignoire — c'est exactement une salle d'eau." },
  wc:        { compteur: "wc",        habitable: true,  note: "Stepper « WC ». N'entre pas dans le nombre de pièces du moteur : un WC séparé n'y reçoit ni porte, ni radiateur (le plan les mesure)." },
  couloir:   { compteur: "couloir",   habitable: true,  note: "Stepper « Couloir / dégagement »." },
  entree:    { compteur: "couloir",   habitable: true,  note: "Comptée en dégagement : c'est le mot du libellé, et c'est ainsi qu'une entrée se déclare." },
  palier:    { compteur: "couloir",   habitable: true,  note: "Idem : un palier est un dégagement." },
  buanderie: { compteur: "buanderie", habitable: true,  note: "Stepper « Buanderie / cellier »." },
  cellier:   { compteur: "buanderie", habitable: true,  note: "Le libellé du moteur le nomme explicitement." },
  dressing:  { compteur: null,        habitable: true,  note: "Aucune case honnête : personne ne déclare un dressing en buanderie. Sa surface reste comptée dans la surface habitable ; seuls ses seuils et ses boiseries (149 €) échappent au chiffrage." },
  mezzanine: { compteur: null,        habitable: true,  note: "Volume ouvert sur la pièce qu'elle surplombe : la compter en pièce ajouterait une porte et une prise réseau qui n'existent pas. Surface comptée." },
  autre:     { compteur: null,        habitable: true,  note: "Type non renseigné : on ne devine pas. Le récapitulatif du plan doit demander à l'utilisateur de préciser." },
  garage:    { compteur: null,        habitable: false, note: "Non habitable : ni porte intérieure, ni radiateur, ni plinthes. Une douche posée dedans reste comptée, par la règle de l'appareil." },
  cave:      { compteur: null,        habitable: false, note: "Idem garage." },
  combles:   { compteur: null,        habitable: false, note: "Combles non aménagés. Des combles AMÉNAGÉS doivent être dessinés pour ce qu'ils deviennent (chambre, bureau, palier) : sinon leur surface sort de l'habitable et les postes au m² les oublient." },
  exterieur: { compteur: null,        habitable: false, note: "Balcon / terrasse : le catalogue n'a aucun poste extérieur. Surface à signaler comme mesurée et non chiffrée." },
};

/** Une pièce telle que le plan la décrit au mappage. */
export interface PiecePlan {
  type: TypePiecePlan;
  /** Une douche ou une baignoire est posée dans cette pièce (c'est ça, une pièce d'eau). */
  doucheOuBaignoire?: boolean;
  /** Nombre de cuvettes de WC posées dans cette pièce. */
  cuvettes?: number;
}

/** Les huit compteurs du moteur, tous renseignés — jamais `undefined`, jamais partiels. */
export interface CompteursPlan {
  sejour: number; cuisine: number; chambres: number; suites: number;
  couloir: number; buanderie: number; sdb: number; wc: number;
}

const estPieceDEau = (p: PiecePlan): boolean => !!p.doucheOuBaignoire || p.type === "sdb" || p.type === "sde";

/**
 * Traduit les pièces d'un plan en compteurs du moteur.
 *
 * `sdb + suites` vaut toujours le nombre de pièces d'eau réellement dessinées : aucune salle de
 * bain fantôme, aucune salle de bain perdue. Un plan dessiné sans mobilier retombe sur les types.
 */
export function compteursDepuisPlan(pieces: PiecePlan[]): CompteursPlan {
  const c: CompteursPlan = { sejour: 0, cuisine: 0, chambres: 0, suites: 0, couloir: 0, buanderie: 0, sdb: 0, wc: 0 };
  // Plan meublé ou non : sans un seul appareil posé, on ne peut pas lire les pièces d'eau
  // autrement que par leur nom, et une suite parentale redevient « chambre + salle de bain ».
  const meuble = pieces.some((p) => p.doucheOuBaignoire || (p.cuvettes ?? 0) > 0);

  for (const p of pieces) {
    const regle = MAPPAGE_PIECES[p.type];
    if (!regle) continue;
    if (p.type === "suite") {
      // Suite indivise (sa douche est dans la face) → le moteur lui compte sa salle de bain.
      // Suite cloisonnée (douche dessinée dans une face voisine) → c'est une chambre, et la
      // salle de bain sera comptée là où elle est.
      if (p.doucheOuBaignoire || !meuble) c.suites++;
      else c.chambres++;
      continue;
    }
    if (estPieceDEau(p)) { c.sdb++; continue; }
    const cible = regle.compteur;
    if (cible && cible !== "sdb" && cible !== "wc") c[cible]++;
  }

  // WC : une cuvette par pièce qui porte ce nom (même non meublée), plus les cuvettes posées
  // ailleurs — celle de la salle de bain compte, et elle n'est comptée qu'une fois.
  c.wc = pieces.filter((p) => p.type === "wc").length
    + (meuble ? pieces.filter((p) => p.type !== "wc").reduce((s, p) => s + (p.cuvettes ?? 0), 0) : 0);

  return c;
}

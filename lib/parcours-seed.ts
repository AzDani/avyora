/**
 * Définition PAR DÉFAUT du parcours, générée depuis le formulaire codé en dur actuel.
 * Palier 0 : sert de seed initial. Chaque question porte son `binding` = champ Reponses attendu
 * par lib/estimation.ts, et chaque option la `valeur` attendue → moteur d'estimation inchangé.
 */
import type {
  ParcoursDef,
  QuestionDef,
  QuestionType,
  StepDef,
  GroupDef,
  OptionDef,
  RegleClause,
  RegleVisibilite,
} from "./parcours-schema";

// Aides pour les conditions d'affichage (DNF : OR de AND).
const cl = (binding: string, op: RegleClause["op"], valeur?: string | string[]): RegleClause => ({ binding, op, valeur });
const si = (...groupes: RegleClause[][]): RegleVisibilite => groupes;
const DETAILLE = cl("modeEstimation", "eq", "detaille");

const uid = () => globalThis.crypto.randomUUID();

// opts : [label, valeur, hint?]
type OptTuple = [string, string, string?];
const opt = (o: OptTuple, i: number): OptionDef => ({ id: uid(), label: o[0], valeur: o[1], hint: o[2], ordre: i });

function Q(
  titre: string,
  type: QuestionType,
  binding: string | undefined,
  opts: OptTuple[] = [],
  extra: Partial<Pick<QuestionDef, "obligatoire" | "config" | "corpsEtat" | "aide" | "description">> = {}
): QuestionDef {
  return {
    id: uid(),
    titre,
    type,
    binding,
    obligatoire: !!extra.obligatoire,
    ordre: 0,
    corpsEtat: extra.corpsEtat,
    aide: extra.aide,
    description: extra.description,
    config: extra.config,
    options: opts.map(opt),
  };
}
const G = (titre: string | undefined, questions: QuestionDef[]): GroupDef => ({ id: uid(), titre, ordre: 0, questions });
const S = (cle: string, titre: string, groups: GroupDef[]): StepDef => ({ id: uid(), cle, titre, ordre: 0, groups });

const OUI_NON: OptTuple[] = [["Non", "non"], ["Oui", "oui"]];
const boolCfg = (neutre = "non") => ({ bindingType: "bool" as const, neutre });

// ── Étape 1 : Le projet (partagée réno / neuf) ──
const etapeProjet = (): StepDef =>
  S("projet", "1 · Le projet", [
    G(undefined, [
      Q("Type de projet", "unique", "typeProjet", [["Rénovation", "renovation"], ["Construction neuve", "neuf"]], { obligatoire: true }),
      Q("Niveau d'estimation", "unique", "modeEstimation", [["Rapide", "rapide", "quelques questions, fourchette large"], ["Détaillée (±15 %)", "detaille", "plus de questions, fourchette resserrée"]], { obligatoire: true, config: { defaut: "rapide" } }),
      Q("Nom du projet", "texte", "nom", [], { obligatoire: true }),
      Q("Type de bien", "unique", "typeBien", [["Appartement", "appartement"], ["Maison", "maison"], ["Immeuble", "immeuble"]], { obligatoire: true }),
      Q("Surface actuelle (m²)", "surface", "surface", [], { obligatoire: true, aide: "Surface existante, sans les travaux." }),
      Q("Code postal", "texte", "codePostal", [], { obligatoire: true }),
    ]),
  ]);

// ── Réno · Étape 2 : État actuel du bien ──
const etapeEtatActuel = (): StepDef =>
  S("etat_actuel", "2 · État actuel du bien", [
    G(undefined, [
      Q("DPE actuel", "liste", "dpe", [["Je ne sais pas", "inconnu"], ["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"], ["E", "E"], ["F", "F"], ["G", "G"]], { config: { defaut: "inconnu" } }),
      Q("Année de construction", "liste", "anneeConstruction", [["Je ne sais pas", "inconnue"], ["Avant 1949", "avant_1949"], ["1949 – 1974", "1949_1974"], ["1975 – 1997", "1975_1997"], ["Après 1997", "apres_1997"]], { config: { defaut: "inconnue" } }),
      Q("État du sol existant", "unique", "solSupport", [["Dalle / chape saine", "dalle_ok"], ["Carrelage existant", "carrelage_existant"], ["Plancher bois fatigué", "plancher_bois"], ["Terre battue", "terre_battue", "vieille maison, cave, grange"]], { config: { neutre: "dalle_ok" } }),
      Q("État des murs", "unique", "mursEtat", [["Sains (placo/plâtre OK)", "ok"], ["Plâtre abîmé", "platre_abime", "fissures, cloques → enduit avant peinture"], ["Pierre / brique nue", "pierre_nue", "doublage + isolation à prévoir"]], { config: { neutre: "ok" } }),
      Q("Traces d'humidité ?", "bool", "humidite", OUI_NON, { config: boolCfg() }),
      Q("Origine de l'humidité", "unique", "humiditeSource", [["À diagnostiquer", "inconnue"], ["Remontées capillaires", "remontees"], ["Infiltration", "infiltration"], ["Condensation", "condensation"], ["Toiture", "toiture"]], { config: { neutre: "inconnue", visibleSi: si([cl("humidite", "truthy")]) } }),
    ]),
    G("Structure & couverture", [
      Q("Fissures visibles (structure)", "unique", "fissuresStructure", [["Aucune", "aucune"], ["Microfissures", "microfissures"], ["Traversantes", "traversantes"], ["Évolutives", "evolutives", "en escalier, > 2 mm → expertise"]], { config: { neutre: "aucune" } }),
      Q("État de la toiture", "unique", "toitureEtat", [["Bon état / étanche", "bon"], ["Entretien", "entretien"], ["Reprise partielle", "reprise_partielle"], ["À refaire", "refaire"], ["Je ne sais pas", "inconnu"]], { config: { neutre: "bon" } }),
      Q("État de la charpente", "unique", "charpenteEtat", [["Saine", "saine"], ["À traiter", "traiter", "insectes / champignons"], ["À renforcer", "renforcer"], ["À refaire", "refaire"]], { config: { neutre: "saine" } }),
      Q("Reprendre la zinguerie ?", "bool", "zinguerieAFaire", OUI_NON, { config: boolCfg() }),
      Q("Isoler la toiture (rampants) ?", "bool", "isolationToiture", OUI_NON, { config: boolCfg() }),
      Q("Surface de toiture (m², optionnel)", "nombre", "toitureM2", [], { config: { visibleSi: si([cl("toitureEtat", "ne", "bon")], [cl("isolationToiture", "truthy")]) } }),
    ]),
    G("Enveloppe & menuiseries", [
      Q("État de l'enduit / revêtement extérieur", "unique", "enduitExtEtat", [["Sain", "sain"], ["Encrassé", "encrasse"], ["Micro-fissuré", "microfissures"], ["À piquer", "a_piquer", "cloque, sonne creux"], ["Brut (sans revêtement)", "brut_sans_revetement"]], { config: { neutre: "sain" } }),
      Q("État des menuiseries existantes", "unique", "menuiseriesEtat", [["Bon (double vitrage)", "bon"], ["Simple vitrage", "simple_vitrage"], ["Vétustes", "vetuste"], ["Absentes / à créer", "absentes"]], { config: { neutre: "bon" } }),
      Q("Encadrements pour la pose des menuiseries", "unique", "encadrementsEtat", [["Prêts (sains, d'équerre)", "bon"], ["À reprendre", "reprise"], ["À créer", "creer"]], { config: { neutre: "bon" } }),
      Q("Nombre d'ouvertures concernées", "nombre", "nbEncadrementsReprise", [], { config: { visibleSi: si([cl("encadrementsEtat", "in", ["reprise", "creer"])]) } }),
    ]),
    G("Sol & niveaux", [
      Q("Niveau à rattraper (cm)", "nombre", "niveauARattraper", []),
      Q("Isolation du sol à prévoir ?", "bool", "isolationSol", OUI_NON, { config: boolCfg() }),
    ]),
  ]);

// ── Réno · Étape 3 : Travaux prévus ──
const etapeTravaux = (): StepDef =>
  S("travaux", "3 · Travaux prévus", [
    G(undefined, [
      Q("Démolition / curage", "unique", "curage", [["Aucun", "aucun"], ["Léger", "leger", "dépose revêtements, équipements"], ["Complet", "complet", "tout à nu + évacuation"]], { config: { neutre: "aucun" } }),
      Q("Électricité", "unique", "electricite", [["Aux normes", "ok"], ["Mise en sécurité", "partielle"], ["À refaire entièrement", "totale", "tableau, câblage, prises, terre, Consuel"]], { config: { neutre: "ok" } }),
      Q("Luminaires / spots", "unique", "spotsLumieres", [["Je les fournis", "non"], ["Spots LED encastrés", "spots"], ["Luminaires équipés", "luminaires"]], { config: { neutre: "non", visibleSi: si([DETAILLE, cl("electricite", "ne", "ok")]) } }),
      Q("Nombre de points lumineux", "nombre", "nbPointsLumineux", [], { config: { visibleSi: si([DETAILLE, cl("electricite", "ne", "ok"), cl("spotsLumieres", "ne", "non")]) } }),
      Q("Plomberie", "unique", "plomberie", [["OK", "ok"], ["Reprise partielle", "reprise"], ["À refaire", "complete"]], { config: { neutre: "ok" } }),
      Q("Salle de bain", "unique", "sdb", [["Rien à faire", "aucune"], ["Rafraîchir", "rafraichir"], ["Refaire entièrement", "complete"]], { config: { neutre: "aucune" } }),
      Q("Configurateur salles de bain", "configurateur_sdb", "sdbConfigs", [], { description: "Chaque SDB chiffrée selon son équipement (mode détaillé).", config: { visibleSi: si([DETAILLE, cl("sdb", "eq", "complete")]) } }),
      Q("Cuisine", "unique", "cuisine", [["Rien à faire", "aucune"], ["Rafraîchir", "rafraichir"], ["Refaire entièrement", "complete"]], { config: { neutre: "aucune" } }),
      Q("Gamme de la cuisine", "unique", "cuisineGamme", [["Entrée de gamme", "entree"], ["Milieu de gamme", "milieu"], ["Haut de gamme", "haut"]], { config: { defaut: "milieu", visibleSi: si([DETAILLE, cl("cuisine", "eq", "complete")]) } }),
      Q("Sols", "unique", "sols", [["À garder", "aucun"], ["Refaire en partie", "partiel"], ["Tout refaire", "complet"]], { config: { neutre: "aucun" } }),
      Q("Revêtement de sol principal", "unique", "solsType", [["Carrelage", "carrelage"], ["Parquet stratifié", "stratifie"], ["Parquet massif", "massif"], ["Béton ciré", "beton_cire"], ["Sol PVC / vinyle", "pvc"]], { config: { defaut: "stratifie", visibleSi: si([cl("sols", "ne", "aucun")]) } }),
      Q("Type de chape", "unique", "chapeType", [["Chape traditionnelle", "traditionnelle"], ["Chape liquide", "liquide", "pompée — idéale plancher chauffant"]], { config: { defaut: "traditionnelle", visibleSi: si([DETAILLE, cl("sols", "ne", "aucun"), cl("solSupport", "eq", "terre_battue")]) } }),
      Q("Format du carrelage", "unique", "carrelageFormat", [["Standard (≤ 45×45)", "standard"], ["Grand format (≥ 60×60)", "grand", "pose plus technique"]], { config: { defaut: "standard", visibleSi: si([DETAILLE, cl("sols", "ne", "aucun"), cl("solsType", "eq", "carrelage")]) } }),
      Q("Plinthes", "unique", "plintheMateriau", [["Assorties au sol", "assorti"], ["Bois", "bois"], ["MDF", "mdf"], ["PVC", "pvc"], ["Carrelage", "carrelage"], ["Aucune", "aucune"]], { config: { defaut: "assorti", neutre: "aucune", visibleSi: si([DETAILLE, cl("sols", "ne", "aucun"), cl("solsType", "ne", "beton_cire")]) } }),
      Q("Doublage isolant des murs (ml, 0 = auto)", "nombre", "doublageMl", [], { config: { visibleSi: si([DETAILLE]) } }),
      Q("Type d'isolant", "unique", "isolantType", [["Laine de verre", "laine_verre"], ["Laine de roche", "laine_roche"], ["Polystyrène (PSE)", "polystyrene"], ["Polyuréthane", "polyurethane"], ["Biosourcé", "biosource"]], { config: { defaut: "laine_verre", visibleSi: si([DETAILLE, cl("doublageMl", "truthy")], [DETAILLE, cl("mursEtat", "eq", "pierre_nue")]) } }),
      Q("Épaisseur d'isolant", "liste", "isolantEpaisseur", [["100 mm", "100"], ["120 mm", "120"], ["140 mm", "140"], ["160 mm", "160"], ["200 mm", "200"]], { config: { defaut: "120", bindingType: "number", visibleSi: si([DETAILLE, cl("doublageMl", "truthy")], [DETAILLE, cl("mursEtat", "eq", "pierre_nue")]) } }),
      Q("Peinture", "unique", "peinture", [["Rien", "aucune"], ["Quelques pièces", "partielle"], ["Tout le logement", "complete"]], { config: { defaut: "complete", neutre: "aucune" } }),
      Q("Fenêtres à remplacer", "nombre", "fenetres", []),
      Q("Blocs-portes intérieurs", "nombre", "nbPortesInt", [], { config: { visibleSi: si([DETAILLE]) } }),
      Q("Matériau des fenêtres", "unique", "menuiserieMateriauFenetre", [["PVC", "pvc"], ["Aluminium", "alu"], ["Bois", "bois"]], { config: { defaut: "pvc", visibleSi: si([DETAILLE, cl("fenetres", "truthy")]) } }),
      Q("Porte d'entrée", "unique", "porteEntree", [["À garder", "aucune"], ["PVC", "pvc"], ["Aluminium", "alu"], ["Bois", "bois"]], { config: { neutre: "aucune" } }),
      Q("Volets roulants intégrés aux fenêtres ?", "bool", "voletRoulant", OUI_NON, { config: { ...boolCfg(), visibleSi: si([cl("fenetres", "truthy")]) } }),
      Q("Type de volet roulant", "unique", "voletType", [["Manuel", "manuel"], ["Électrique", "electrique"], ["Solaire", "solaire"]], { config: { defaut: "electrique", visibleSi: si([cl("fenetres", "truthy"), cl("voletRoulant", "truthy")]) } }),
      Q("Cloisons à créer", "unique", "cloisons", [["Aucune", "aucune"], ["1-2 cloisons", "quelques"], ["Redistribution", "beaucoup"]], { config: { neutre: "aucune" } }),
      Q("Mètres linéaires de cloison (0 = estimé)", "nombre", "cloisonMlManuel", [], { config: { visibleSi: si([DETAILLE, cl("cloisons", "ne", "aucune")]) } }),
      Q("Chauffage", "unique", "chauffage", [["À garder", "aucun"], ["Radiateurs élec.", "radiateurs"], ["Chaudière gaz", "chaudiere"], ["PAC air-eau", "pac"]], { config: { neutre: "aucun" } }),
      Q("VMC à installer ?", "bool", "vmc", OUI_NON, { config: boolCfg() }),
      Q("Nombre de VMC", "nombre", "nbVmc", [], { config: { defaut: "1", visibleSi: si([cl("vmc", "truthy")]) } }),
      Q("Type de VMC", "unique", "vmcType", [["Simple flux", "simple", "hygro B"], ["Double flux", "double", "récupère la chaleur"]], { config: { defaut: "simple", visibleSi: si([cl("vmc", "truthy")]) } }),
      Q("Eau chaude sanitaire", "unique", "ecs", [["Inchangée", "inchange"], ["Ballon électrique", "ballon_elec"], ["Thermodynamique", "thermo"], ["Par la chaudière", "chaudiere"], ["Solaire (CESI)", "solaire"]], { config: { neutre: "inchange" } }),
      Q("Créer / refaire les réseaux d'évacuation ?", "bool", "reseauxEvac", OUI_NON, { config: boolCfg() }),
      Q("Configuration du logement", "unique", "niveaux", [["Plain-pied", "plain_pied"], ["Avec étage", "etage"]], { config: { defaut: "plain_pied" } }),
      Q("Création de nouvelle surface (m², 0 si aucune)", "nombre", "nouvelleSurfaceM2", []),
      Q("Plancher de la nouvelle surface", "unique", "plancherType", [["Plancher bois", "bois"], ["Dalle béton", "beton"]], { config: { defaut: "bois", visibleSi: si([cl("nouvelleSurfaceM2", "truthy")]) } }),
      Q("Assainissement", "unique", "assainissement", [["Déjà raccordé", "raccorde"], ["Raccordement tout-à-l'égout", "tout_egout"], ["Fosse toutes eaux", "individuel_fosse"], ["Microstation", "individuel_micro"]], { config: { neutre: "raccorde" } }),
      Q("Raccordement électrique (compteur Enedis) ?", "bool", "alimElec", OUI_NON, { config: boolCfg() }),
      Q("Raccordement eau (compteur) ?", "bool", "alimEau", OUI_NON, { config: boolCfg() }),
      Q("Raccordement gaz ?", "bool", "alimGaz", OUI_NON, { config: boolCfg() }),
      Q("Travaux extérieurs / façade ?", "bool", "facadeAFaire", OUI_NON, { config: boolCfg() }),
      Q("Type de murs extérieurs", "unique", "murExtType", [["Parpaing / béton", "parpaing"], ["Brique", "brique"], ["Pierre", "pierre"], ["Autre / enduit", "autre"]], { config: { defaut: "parpaing", visibleSi: si([cl("facadeAFaire", "truthy")]) } }),
      Q("État de la façade", "unique", "murExtEtat", [["Bon (juste embellir)", "bon"], ["Encrassée", "encrasse"], ["Fissurée", "fissure"], ["Dégradée", "degrade"]], { config: { defaut: "bon", visibleSi: si([cl("facadeAFaire", "truthy")]) } }),
      Q("Rénovation façade souhaitée", "unique", "facadeReno", [["Nettoyage + hydrofuge", "nettoyage"], ["Peinture / ravalement", "peinture"], ["Enduit / crépi neuf", "enduit"], ["Isolation extérieure (ITE)", "ite"]], { config: { defaut: "peinture", visibleSi: si([cl("facadeAFaire", "truthy")]) } }),
      Q("Surface de façade (m², 0 = estimée)", "nombre", "facadeM2", [], { config: { visibleSi: si([cl("facadeAFaire", "truthy")]) } }),
      Q("Chambres", "nombre", "nbChambres", [], { config: { defaut: "3", visibleSi: si([DETAILLE]) } }),
      Q("WC (total)", "nombre", "nbWc", [], { config: { defaut: "1", visibleSi: si([DETAILLE]) } }),
      Q("Cellier ?", "bool", "cellier", OUI_NON, { config: { ...boolCfg(), visibleSi: si([DETAILLE]) } }),
      Q("Buanderie (arrivée + évacuation) ?", "bool", "buanderie", OUI_NON, { config: { ...boolCfg(), visibleSi: si([DETAILLE]) } }),
    ]),
  ]);

// ── Réno · Étape 4 : Objectif et finition ──
const etapeObjectif = (): StepDef =>
  S("objectif", "4 · Objectif et finition", [
    G(undefined, [
      Q("Niveau de finition visé", "unique", "finition", [["Locatif simple", "locatif", "robuste et économique"], ["Standard", "standard"], ["Premium", "premium", "haut de gamme (+20 %)"], ["Luxe", "luxe", "matériaux nobles (+45 %)"]], { obligatoire: true, config: { defaut: "locatif" } }),
    ]),
  ]);

// ── Neuf · Étape 2 : Ta construction ──
const etapeConstruction = (): StepDef =>
  S("construction", "2 · Ta construction", [
    G(undefined, [
      Q("Niveau de gamme", "unique", "gammeNeuf", [["Entrée de gamme", "entree", "~1 400-1 800 €/m²"], ["Standard", "standard", "~1 800-2 300 €/m²"], ["Haut de gamme", "haut", "~2 300-3 200 €/m²"], ["Prestige / luxe", "luxe", "~3 200-5 000 €/m²"]], { obligatoire: true, config: { defaut: "standard" } }),
      Q("Le terrain est-il déjà viabilisé ?", "bool", "terrainAViabiliser", [["Oui, viabilisé", "oui"], ["Non", "non", "terrassement + raccordements à prévoir"]], { config: { bindingType: "bool", neutre: "oui", inverse: true } }),
      Q("Chambres", "nombre", "nbChambres", [], { config: { defaut: "3" } }),
      Q("Salles de bain", "nombre", "nbSdb", [], { config: { defaut: "1" } }),
      Q("Garage (m²)", "nombre", "garageM2", []),
      Q("WC (total)", "nombre", "nbWc", [], { config: { defaut: "1", visibleSi: si([DETAILLE]) } }),
      Q("Terrasse (m², 0 si aucune)", "nombre", "terrasseM2", [], { config: { visibleSi: si([DETAILLE]) } }),
      Q("Configuration", "unique", "niveaux", [["Plain-pied", "plain_pied"], ["À étage (R+1)", "etage"]], { config: { defaut: "plain_pied", visibleSi: si([DETAILLE]) } }),
      Q("Menuiseries extérieures", "unique", "menuiserieMateriau", [["PVC", "pvc"], ["Aluminium", "alu"], ["Bois", "bois"]], { config: { defaut: "pvc", visibleSi: si([DETAILLE]) } }),
      Q("Cuisine équipée incluse ?", "bool", "cuisineIncluse", OUI_NON, { config: { ...boolCfg(), visibleSi: si([DETAILLE]) } }),
      Q("Cellier ?", "bool", "cellier", OUI_NON, { config: { ...boolCfg(), visibleSi: si([DETAILLE]) } }),
      Q("Buanderie ?", "bool", "buanderie", OUI_NON, { config: { ...boolCfg(), visibleSi: si([DETAILLE]) } }),
      Q("Eau chaude sanitaire", "unique", "ecs", [["Standard incluse", "inchange"], ["Thermodynamique", "thermo"], ["Solaire (CESI)", "solaire"]], { config: { neutre: "inchange" } }),
      Q("Assainissement", "unique", "assainissement", [["Tout-à-l'égout", "tout_egout"], ["Fosse toutes eaux", "individuel_fosse"], ["Microstation", "individuel_micro"]]),
    ]),
  ]);

/** Renumérote ordre = index à tous les niveaux. */
function renumeroter(p: ParcoursDef) {
  p.steps.forEach((s, si) => {
    s.ordre = si;
    s.groups.forEach((g, gi) => {
      g.ordre = gi;
      g.questions.forEach((q, qi) => {
        q.ordre = qi;
        q.options.forEach((o, oi) => (o.ordre = oi));
      });
    });
  });
}

/** Les deux parcours par défaut (réno + neuf), prêts à seeder. */
export function parcoursParDefaut(): ParcoursDef[] {
  const reno: ParcoursDef = {
    id: uid(), cle: "reno", titre: "Rénovation", typeProjet: "renovation", version: 1,
    steps: [etapeProjet(), etapeEtatActuel(), etapeTravaux(), etapeObjectif()],
  };
  const neuf: ParcoursDef = {
    id: uid(), cle: "neuf", titre: "Construction neuve", typeProjet: "neuf", version: 1,
    steps: [etapeProjet(), etapeConstruction()],
  };
  [reno, neuf].forEach(renumeroter);
  return [reno, neuf];
}

/**
 * Cohérence maquette ↔ estimateur.
 *
 * La maquette est un fichier autonome : elle recopie des libellés et des prix du catalogue.
 * Rien n'empêche le catalogue d'évoluer sans elle — et une divergence ne casse rien de visible,
 * elle fabrique juste un chiffre faux. C'est le genre de panne qu'on ne remarque pas.
 *
 *   node maquettes/tools/coherence.mjs
 *
 * Sort en code 1 si une vérification DURE échoue. Les points « à savoir » n'échouent pas :
 * ils décrivent le travail de correspondance qui reste à faire au branchement.
 */
import fs from "node:fs";

const lire = p => fs.readFileSync(new URL(p, import.meta.url).pathname ?? p, "utf8");
const CAT = JSON.parse(fs.readFileSync("lib/estimateur/catalog.json", "utf8"));
const CORE = fs.readFileSync("lib/estimateur/core.ts", "utf8");

/* Les coefficients que la maquette recopie du MOTEUR (et non du catalogue) : matériau et
   vitrage d'une menuiserie. Ils ne sont pas des prix, donc §1 ne les voit pas — et la maquette
   a vécu des mois en appliquant le vitrage sans le matériau, ce qui affichait une fenêtre PVC au
   prix de l'alu, 40 % trop cher. */
const COEFS = [
  ["MAT_COEF", "alu", "MAT_COEF"], ["MAT_COEF", "pvc", "MAT_COEF"], ["MAT_COEF", "bois", "MAT_COEF"],
  ["VITRAGE_COEF", "double", "VIT_COEF"], ["VITRAGE_COEF", "triple", "VIT_COEF"],
];
const coefMoteur = (table, cle) => {
  const m = CORE.match(new RegExp(`${table}[^=]*=\\s*\\{([^}]*)\\}`));
  if (!m) return null;
  const v = m[1].match(new RegExp(`\\b${cle}\\s*:\\s*([0-9.]+)`));
  return v ? Number(v[1]) : null;
};
const MAQ = fs.readFileSync("maquettes/plan-editor.html", "utf8");
const CARNET = fs.readFileSync("maquettes/carnet/carnet-detail-vs-plan.tsv", "utf8");

const lots = Array.isArray(CAT) ? CAT : (CAT.lots ?? Object.values(CAT)[0]);
const postes = new Map();
const parLot = new Map();
for (const l of lots) {
  parLot.set(l.c, l.t.length);
  for (const t of l.t) postes.set(t.n, { ...t, lot: l.c });
}

let dur = 0, mou = 0;
const KO = (quoi, d) => { dur++; console.log(`  ✗ ${quoi}\n      ${d}`); };
const NB = (quoi, d) => { mou++; console.log(`  · ${quoi}\n      ${d}`); };

/* Valeur numérique d'un chemin dans les tables de prix de la maquette.
   Gère les objets imbriqués (PRIX.revetement['Carrelage'], PRIX.menuiserie.porte) et les clés
   citées entre apostrophes — la première version ne lisait que le premier niveau, et laissait
   donc 40 prix hors contrôle. */
const tableVal = (chemin) => {
  const [table, ...reste] = chemin.split(".");
  const i = MAQ.indexOf(`const ${table}=`);
  if (i < 0) return null;
  let seg = MAQ.slice(i, MAQ.indexOf("\n};", i));
  const cle = reste.pop();
  for (const sous of reste) {               /* descendre dans le sous-objet nommé */
    const j = seg.search(new RegExp(`\\b${sous}\\s*:\\s*\\{`));
    if (j < 0) return null;
    const ouvre = seg.indexOf("{", j);
    seg = seg.slice(ouvre + 1, seg.indexOf("}", ouvre));
  }
  const m = seg.match(new RegExp(`(?:^|[,{\\s])'?${cle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'?\\s*:\\s*([0-9.]+)`));
  return m ? Number(m[1]) : null;
};

/* ── 1. prix recopiés : chaque valeur doit égaler le « fourni-posé » du poste qu'elle chiffre ──
   La correspondance est déclarée ici, à la main, parce qu'elle demande de savoir à quel OUVRAGE
   la maquette applique le prix — pas seulement quel nom lui ressemble. */
const PRIX_MAP = [
  ["PRIX", "demolCloison", "Abattre une cloison"],
  ["PRIX", "demolMur", "Abattre un mur non porteur"],
  ["PRIX", "demolPorteur", "Abattre un mur porteur"],
  ["PRIX", "poutreReprise", "Poutre de reprise de charge (IPN / HEA)"],
  ["PRIX_POUTRE", "acier", "Poutre de reprise de charge (IPN / HEA)"],
  ["PRIX_POUTRE", "bois", "Poutre de reprise de charge (lamellé-collé)"],
  ["PRIX_POUTRE", "beton", "Poutre de reprise de charge (béton armé)"],
  ["PRIX_POTEAU", "acier", "Poteau de reprise (acier HEA / HEB)"],
  ["PRIX_POTEAU", "bois", "Poteau de reprise (lamellé-collé)"],
  ["PRIX_POTEAU", "beton", "Poteau de reprise (béton armé)"],
  ["PRIX_PLANCHER", "bois", "Créer un plancher bois"],
  ["PRIX_PLANCHER", "beton", "Plancher béton (étage créé)"],
  ["PRIX", "murPierre", "Monter un mur en pierre"],
  ["PRIX", "etudeStructure", "Étude de structure"],
  ["PRIX", "cloisonNeuve", "Monter une cloison"],
  ["PRIX", "chapeTradi", "Chape traditionnelle"],
  ["PRIX", "chapeLiquide", "Chape liquide"],
  ["PRIX", "ragreage", "Préparation du sol (ragréage)"],
  ["PRIX", "dalle", "Couler une dalle béton"],
  ["PRIX", "deposeSol", "Enlever un revêtement de sol"],
  ["PRIX", "isoITI", "Isolation des murs par l'intérieur"],
  ["PRIX", "isoITE", "Isolation par l'extérieur (ITE)"],
  ["PRIX", "isoITEBardage", "Isolation par l'extérieur (ITE) sous bardage"],
  ["PRIX_TOIT", "demousser", "Nettoyer / démousser la toiture"],
  ["PRIX_TOIT", "refectionTuile", "Réfection couverture tuiles (dépose + écran + liteaux)"],
  ["PRIX_TOIT", "refectionArdoise", "Réfection couverture ardoise (dépose + écran + liteaux)"],
  ["PRIX_TOIT", "couvTuile", "Couverture tuiles (sur support existant)"],
  ["PRIX_TOIT", "couvArdoise", "Couverture ardoise (sur support existant)"],
  ["PRIX_TOIT", "couvZinc", "Couverture zinc / bac acier"],
  ["PRIX_TOIT", "sousToiture", "Sous-toiture (écran + liteaux)"],
  ["PRIX_TOIT", "deposeComplete", "Dépose complète de toiture (couverture + charpente)"],
  ["PRIX_TOIT", "completeTuile", "Toiture complète tuile (charpente + couverture)"],
  ["PRIX_TOIT", "completeArdoise", "Toiture complète ardoise (charpente + couverture)"],
  ["PRIX_TOIT", "charpTrad", "Charpente traditionnelle (hors couverture)"],
  ["PRIX_TOIT", "charpFermettes", "Charpente en fermettes (hors couverture)"],
  ["PRIX_TOIT", "traiter", "Traiter la charpente"],
  ["PRIX_TOIT", "gouttieres", "Gouttières & descentes"],
  ["PRIX_TOIT", "raccords", "Raccords (faîtage, noues, solins)"],
  ["PRIX_TOIT", "velux", "Fenêtre de toit (Velux)"],
  ["PRIX_TOIT", "plat", "Toit plat (étanchéité)"],
  ["PRIX_TOIT", "isoPerdus", "Isolation des combles perdus (soufflage)"],
  ["PRIX_TOIT", "isoRampants", "Isolation des combles aménagés (rampants)"],
  ["FACADE_PRIX", "nettoyage", "Nettoyer la façade"],
  ["FACADE_PRIX", "enduit", "Enduit monocouche (machine)"],
  ["FACADE_PRIX", "enduit_chaux", "Enduit à la chaux (maison ancienne)"],
  ["FACADE_PRIX", "peinture", "Peindre la façade"],
  ["FACADE_PRIX", "joints", "Refaire les joints / rejointoiement (pierre, briquette, moellon)"],
  ["FACADE_PRIX", "ravalement", "Ravalement façade pierre (tout compris)"],
  ["FACADE_PRIX", "bardage", "Bardage"],
  ["FACADE_PRIX", "hydrofuge", "Traitement imperméabilisant"],
  ["EQUIP_PRIX", "baignoire", "Installer une baignoire"],
  ["EQUIP_PRIX", "wc", "WC"],
  /* Un lavabo dessiné devient « Meuble-vasque » au devis (EQUIPEMENT_DIRECT, plan-correspondance)
     — pas la « Vasque » nue, qui lui ressemble mais n'est pas ce qui sera facturé. */
  ["EQUIP_PRIX", "lavabo", "Meuble-vasque"],
  ["EQUIP_PRIX", "chaudiere", "Chaudière gaz à condensation"],
  ["EQUIP_PRIX", "poele", "Poêle à bois / granulés"],
  ["EQUIP_PRIX", "clim", "Climatisation réversible (split)"],
  ["EQUIP_PRIX", "radiateur", "Radiateurs électriques"],
  ["EQUIP_PRIX", "seche_serviette", "Sèche-serviette"],
  ["EQUIP_PRIX", "cumulus", "Chauffe-eau électrique (cumulus)"],
  ["EQUIP_PRIX", "tableau", "Changer / mettre aux normes le tableau"],
  ["EQUIP_PRIX", "escalier", "Escalier en bois"],
  ["EQUIP_PRIX", "ilot", "Îlot central"],
  /* Deuxième vague : les tables imbriquées et les clés scalaires que la première version du
     contrôle n'atteignait pas. Chaque correspondance a été établie en lisant à quel OUVRAGE la
     maquette applique le prix (chantierTasks / openingInduits), pas par ressemblance de nom. */
  ["PRIX", "revetement.Carrelage", "Carrelage au sol"],
  ["PRIX", "revetement.Parquet", "Parquet bois"],
  ["PRIX", "revetement.Stratifié", "Sol stratifié (imitation bois)"],
  ["PRIX", "revetement.Vinyle / PVC", "Sol souple (PVC, lino)"],
  ["PRIX", "revetement.Moquette", "Moquette"],
  ["PRIX", "revetement.Béton ciré", "Béton ciré / résine"],
  ["PRIX", "menuiserie.porte", "Porte intérieure battante"],
  ["PRIX", "menuiserie.porte_pleine", "Porte intérieure âme pleine"],
  ["PRIX", "menuiserie.coulissante", "Porte intérieure coulissante"],
  ["PRIX", "menuiserie.porte_entree", "Porte d'entrée"],
  ["PRIX", "menuiserie.garage", "Porte de garage"],
  ["PRIX", "menuiserie.fenetre", "Fenêtres"],
  /* Le contrat mappe `fenetre_p` sur le MÊME poste : une petite fenêtre se chiffre comme une
     fenêtre. Le compteur ne peut pas promettre une remise que le devis ne fera pas. */
  ["PRIX", "menuiserie.fenetre_p", "Fenêtres"],
  ["PRIX", "menuiserie.porte_fenetre", "Portes-fenêtres"],
  ["PRIX", "menuiserie.baie", "Baie vitrée"],
  ["PRIX", "percPorteurPetit", "Ouvrir un mur porteur — petite (porte/fenêtre)"],
  ["PRIX", "percPorteurGrand", "Ouvrir un mur porteur — grande (2,5 m, baie)"],
  ["PRIX", "appuiFenetre", "Créer un appui de fenêtre"],
  ["PRIX", "seuil", "Créer un seuil de porte"],
  ["PRIX", "murNeuf", "Monter un mur en parpaings"],
  ["PRIX", "voletRoulant", "Volets roulants"],
  ["PRIX", "voletBattant", "Volets battants"],
  ["PRIX", "galandage", "Caisson à galandage (châssis + habillage)"],
  ["PRIX", "optMoustiquaire", "Moustiquaires"],
  ["PRIX", "optStore", "Stores extérieurs / brise-soleil"],
  ["PRIX", "optGrille", "Grilles de sécurité"],
  ["PRIX", "deposeMenuiserie", "Enlever les anciennes portes / fenêtres"],
  ["PRIX", "solIso", "Isolation du sol / plancher bas"],
  ["EQUIP_PRIX", "douche", "Douche à l'italienne"],
  /* D7 : une double vasque est UNE unité du même poste, en variante « double ». Le compteur doit
     donc porter le prix du poste MULTIPLIÉ par le coefficient de la variante, pas le prix nu. */
  ["EQUIP_PRIX", "vasque2", "Meuble-vasque", 1.88],
  ["EQUIP_PRIX", "plan", "Plan de travail seul"],
  ["EQUIP_PRIX", "prise", "Ajouter / déplacer une prise"],
  ["EQUIP_PRIX", "interrupteur", "Ajouter / déplacer un interrupteur"],
  ["EQUIP_PRIX", "lumiere", "Ajouter un point lumineux"],
  /* D22 — les ouvrages que le compteur du plan ignorait, et les objets qui valent PLUSIEURS
     lignes de devis. Chacun est désormais chiffré dans la maquette, donc chacun doit être tenu
     ici : c'est ce qui empêche l'écart de se rouvrir en silence. */
  ["PRIX", "plinthes", "Plinthes"],
  ["PRIX", "fauxPlafond", "Faux plafond"],
  ["PRIX", "faience", "Faïence / carrelage mural"],
  ["PRIX", "spec", "Étanchéité sous carrelage (SPEC douche)"],
  ["PRIX", "cloisonHumide", "Cloison pièce humide (hydrofuge)"],
  ["PRIX", "poncageParquet", "Ponçage + vitrification parquet"],
  ["PRIX", "gardeCorps", "Garde-corps"],
  ["PRIX_DOUCHE", "bac", "Bac de douche"],
  ["PRIX_DOUCHE", "italienne", "Douche à l'italienne"],
  ["PRIX_DOUCHE", "cabine", "Cabine complète (parois + porte)"],
  ["PRIX_ACC", "colonneDouche", "Colonne de douche"],
  ["PRIX_ACC", "paroiDouche", "Paroi de douche"],
  ["PRIX_ACC", "robBaignoire", "Robinetterie baignoire"],
  ["PRIX_ACC", "spot", "Spots encastrés (LED)"],
  /* Une prise double, c'est DEUX prises au devis — pas un poste à part. */
  ["EQUIP_PRIX", "prise2", "Ajouter / déplacer une prise", 2],
  /* Raccorder une machine, c'est créer un point d'eau — le contrat les envoie tous deux sur ce
     poste. Ils traînaient en « sans poste » et dérivaient donc sans que rien ne le dise. */
  ["EQUIP_PRIX", "lave_linge", "Créer / déplacer un point d'eau"],
  ["EQUIP_PRIX", "lave_vaisselle", "Créer / déplacer un point d'eau"],
  /* D36 — trois objets que l'estimation chiffrait (EQUIPEMENT_DIRECT) et que le compteur disait
     « pas au catalogue ». Même prix que le poste que le devis leur applique. */
  ["EQUIP_PRIX", "evier", "Évier + robinetterie"],
  ["EQUIP_PRIX", "vmc", "Ventilation (VMC)"],
  ["EQUIP_PRIX", "velux", "Fenêtre de toit (Velux)"],
  /* D37 — la peinture, choisie pièce par pièce : le compteur la chiffre au prix des deux postes
     que la correspondance lui applique (pei-peinture-des-murs, pei-peinture-des-plafonds). */
  ["PRIX", "peintureMurs", "Peinture des murs"],
  ["PRIX", "peinturePlafond", "Peinture des plafonds"],
];
/* Ouvrages ABANDONNÉS (D19, 19/09/2026). Le catalogue de l'estimateur n'a pas de poste pour les
   chiffrer et Dani a tranché qu'on n'en crée pas : leur prix dans la maquette doit donc valoir 0.
   Ce n'est plus une note, c'est un contrôle DUR. Un prix qui remonte ici, c'est le compteur du
   plan qui recommence à promettre ce que le devis ne facturera pas — la panne qu'on vient de
   fermer. Pour en rouvrir un, il faut d'abord créer son poste au catalogue et le déplacer dans
   PRIX_MAP ci-dessus. */
const ABANDONNES = [
  ["PRIX.boucher", "rebouchage d'une ouverture"],
  ["PRIX.percLeger", "percement d'un mur NON porteur (seul le porteur a ses deux postes)"],
  ["PRIX.jambagesMl", "linteau et tableaux (le forfait « ouvrir un mur porteur » les porte déjà)"],
  ["PRIX.retourIso", "retour d'isolant en tableau"],
  ["PRIX.deposeEquip", "dépose d'un équipement (l'estimateur ne chiffre que ce qui est à poser)"],
  ["PRIX.betonFini", "finition béton lissé / quartzé"],
  ["PRIX.menuiserie.porte_double", "porte double intérieure"],
  ["PRIX.menuiserie.passage", "passage sans porte — l'estimateur dit qu'il n'y a rien à poser"],
  ["EQUIP_PRIX.frigo", "pose d'un réfrigérateur"],
];
console.log("\n1. Prix recopiés dans la maquette vs catalogue (fourni-posé)");
let alignes = 0;
for (const [tbl, cle, nom, coef] of PRIX_MAP) {
  const m = tableVal(`${tbl}.${cle}`), p = postes.get(nom);
  if (m === null) { KO(`${tbl}.${cle} introuvable dans la maquette`, "clé renommée ou supprimée ?"); continue; }
  if (!p) { KO(`poste « ${nom} » absent du catalogue`, `référencé par ${tbl}.${cle}`); continue; }
  const attendu = Math.round(p.fp * (coef ?? 1));
  const dit = coef ? `« ${nom} » ${p.fp} € × ${coef} = ${attendu} €` : `« ${nom} » = ${p.fp} €`;
  if (Math.abs(m - attendu) < 0.51) alignes++;
  else KO(`${tbl}.${cle} = ${m} € · catalogue ${dit}`, `écart ${(m - attendu > 0 ? "+" : "")}${Math.round((m / attendu - 1) * 100)} % sur le compteur indicatif`);
}
console.log(`  ${alignes}/${PRIX_MAP.length} alignés`);
console.log(`\n1bis. Ouvrages abandonnés : leur prix doit valoir 0`);
let zeros = 0;
for (const [chemin, quoi] of ABANDONNES) {
  const v = tableVal(chemin);
  if (v === null) KO(`${chemin} introuvable dans la maquette`, `clé renommée ou supprimée ? (${quoi})`);
  else if (v === 0) zeros++;
  else KO(`${chemin} = ${v} € · devrait être 0`, `${quoi} : aucun poste au catalogue, l'ouvrage est abandonné (D19)`);
}
console.log(`  ${zeros}/${ABANDONNES.length} à 0 — ${ABANDONNES.map(a => a[0].split(".").pop()).join(", ")}`);

/* ── 1quater. D46 (integ-15) : un mur démoli ou créé prend au compteur le poste que la traduction
   lui donne. La traduction (plan-correspondance.ts) décide par le drapeau porteur puis par le TYPE :
   porteur → « Abattre un mur porteur », cloison → « Abattre une cloison », sinon « Abattre un mur non
   porteur ». Le compteur, lui, rangeait tout mur non porteur en cloison (15 €/m² au lieu de 35) : un
   mur de 20 cm déclaré non porteur, 150 € au Suivi, 350 € au devis. Même règle à la création
   (cloison / cloison hydrofuge / parpaings / pierre). On vérifie que les deux côtés nomment les
   mêmes branches — les prix eux-mêmes sont tenus par §1. ── */
console.log("\n1quater. Murs démolis et créés : le compteur prend le poste de la traduction");
{
  const PC = fs.readFileSync("lib/estimateur/plan-correspondance.ts", "utf8");
  const bloc = PC.slice(PC.indexOf("// ── Murs : démolir, créer"), PC.indexOf("// ── Percements induits"));
  const demol = MAQ.slice(MAQ.indexOf("T.push({id:'w:'+w.id+':demolir'"), MAQ.indexOf("\n", MAQ.indexOf("T.push({id:'w:'+w.id+':demolir'")));
  const creer = MAQ.slice(MAQ.indexOf("T.push({id:'w:'+w.id+':creer'"), MAQ.indexOf("\n", MAQ.indexOf("T.push({id:'w:'+w.id+':creer'")));
  const paires = [
    ["démolir · porteur", "dem-abattre-un-mur-porteur", demol, "PRIX.demolPorteur"],
    ["démolir · cloison", "dem-abattre-une-cloison", demol, "PRIX.demolCloison"],
    ["démolir · mur non porteur", "dem-abattre-un-mur-non-porteur", demol, "PRIX.demolMur"],
    ["créer · cloison", "clo-monter-une-cloison", creer, "PRIX.cloisonNeuve"],
    ["créer · cloison de pièce humide", "clo-cloison-piece-humide-hydrofuge", creer, "PRIX.cloisonHumide"],
    ["créer · mur en parpaings", "mac-monter-un-mur-en-parpaings", creer, "PRIX.murNeuf"],
    ["créer · mur en pierre", "mac-monter-un-mur-en-pierre", creer, "PRIX.murPierre"],
  ];
  let ok = 0;
  if (!demol || !creer) KO("tâches de mur introuvables dans chantierTasks", "identifiant de tâche renommé ?");
  for (const [quoi, poste, ligne, prix] of paires) {
    if (!bloc.includes(`"${poste}"`)) KO(`${quoi} : la traduction ne vise plus « ${poste} »`, "branche retirée de plan-correspondance.ts ?");
    else if (!ligne.includes(prix)) KO(`${quoi} : le compteur n'utilise pas ${prix}`, `la traduction facture « ${poste} » ; le Suivi doit porter le même prix`);
    else ok++;
  }
  if (!/const cl=w\.type==='cloison'/.test(demol + MAQ.slice(MAQ.indexOf("T.push({id:'w:'+w.id+':demolir'") - 400, MAQ.indexOf("T.push({id:'w:'+w.id+':demolir'"))))
    KO("démolir : le compteur ne distingue plus la cloison du mur par son TYPE", "c'est le critère de la traduction (w.type === \"cloison\")");
  console.log(`  ${ok}/${paires.length} branches alignées`);
}

/* ── 2. libellés déclarés « exacts » : FACADES[].poste doit exister au catalogue ── */
console.log("\n1ter. Coefficients recopiés du moteur (matériau, vitrage)");
let cok = 0;
for (const [tbl, cle, tblMoteur] of COEFS) {
  const m = tableVal(`${tbl}.${cle}`), c = coefMoteur(tblMoteur, cle);
  if (m === null) KO(`${tbl}.${cle} introuvable dans la maquette`, "clé renommée ?");
  else if (c === null) KO(`${tblMoteur}.${cle} introuvable dans core.ts`, "coefficient renommé ou retiré ?");
  else if (Math.abs(m - c) < 1e-9) cok++;
  else KO(`${tbl}.${cle} = ${m} · moteur ${tblMoteur}.${cle} = ${c}`, "le compteur du plan n'applique pas le coefficient du devis");
}
console.log(`  ${cok}/${COEFS.length} alignés`);

console.log("\n2. Libellés de postes cités en dur");
const blocFacades = MAQ.slice(MAQ.indexOf("const FACADES={"), MAQ.indexOf("\n};", MAQ.indexOf("const FACADES={")));
const cites = [...blocFacades.matchAll(/poste:'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
let okNoms = 0;
for (const n of cites) postes.has(n) ? okNoms++ : KO(`libellé cité introuvable : « ${n} »`, "poste renommé au catalogue ?");
console.log(`  ${okNoms}/${cites.length} libellés valides`);

/* ── 3. le carnet couvre-t-il encore exactement le catalogue ? ── */
console.log("\n3. Carnet de correspondance à jour");
const dansCarnet = new Set(CARNET.trim().split("\n").slice(1).map(l => l.split("\t")[1]));
const manquants = [...postes.keys()].filter(n => !dansCarnet.has(n));
const fantomes = [...dansCarnet].filter(n => !postes.has(n));
if (manquants.length) KO(`${manquants.length} poste(s) du catalogue absent(s) du carnet`, manquants.slice(0, 6).join(" · "));
if (fantomes.length) KO(`${fantomes.length} ligne(s) du carnet sans poste correspondant`, fantomes.slice(0, 6).join(" · "));
if (!manquants.length && !fantomes.length) console.log(`  ${dansCarnet.size} postes, correspondance exacte`);

/* ── 3bis. le carnet connaît-il TOUS les postes à quantité automatique ? ──
   Mon premier extracteur en avait raté 3 : il cassait sur les formules contenant une virgule
   (Math.max(0, S - SS)) et ignorait le cas spécial FINI. Conséquence, pas cosmétique : sur un
   poste que le carnet croit manuel alors qu'il est auto, le branchement écrirait une qty SANS
   manual:true — et qtyOf() préfère alors autoQty, donc la mesure du plan est écrasée en silence. */
console.log("\n3bis. Postes à quantité automatique connus du carnet");
{
  const i = CORE.indexOf("const A: Record<string, number> = {");
  const amap = CORE.slice(CORE.indexOf("{", i) + 1, CORE.indexOf("\n  };", i));
  const clesA = [...amap.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map(m => m[1].replace(/\\"/g, '"'));
  const fini = CORE.match(/const FINI\s*=\s*"([^"]+)"/)?.[1];
  const attendus = new Set([...clesA, ...(fini ? [fini] : [])]);
  const formules = JSON.parse(fs.readFileSync("maquettes/carnet/autoqty-formules.json", "utf8"));
  const absents = [...attendus].filter(n => !(n in formules));
  const enTrop = Object.keys(formules).filter(n => !attendus.has(n));
  if (absents.length) KO(`${absents.length} poste(s) auto absent(s) du carnet`, `${absents.join(" · ")} — leur mesure serait écrasée par autoQty au branchement`);
  if (enTrop.length) KO(`${enTrop.length} formule(s) du carnet sans équivalent dans autoQty()`, enTrop.join(" · "));
  if (!absents.length && !enTrop.length) console.log(`  ${attendus.size} postes auto, carnet exact`);
}

/* ── 4. les nombres de postes annoncés dans « hors plan » ── */
console.log("\n4. Nombres cités dans le bloc de couverture");
for (const [lot, attendu] of [["Location de matériel", "Location de matériel"], ["Raccordements aux réseaux", "Raccordements aux réseaux"]]) {
  const reel = parLot.get(attendu);
  const m = MAQ.match(new RegExp(`\\['${lot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}','(\\d+) postes`));
  /* D39 : le bloc ne cite plus de nombre de « postes » (mot interne) ; s'il en cite un, il doit être juste. */
  if (!m) { console.log(`  ${lot} : aucun nombre cité, rien à tenir`); continue; }
  Number(m[1]) === reel ? console.log(`  ${lot} : ${reel} ✓`)
    : KO(`« ${lot} » annonce ${m[1]} postes, le catalogue en a ${reel}`, "chiffre à corriger dans HORS_PLAN");
}

/* ── 5. contexte : ce que la maquette émet vs ce que le moteur lit ── */
console.log("\n5. Contexte transmis (correspondance à écrire au branchement)");
const emis = [...(MAQ.match(/contexte=\{([^}]*)\}/)?.[1] ?? "").matchAll(/(?:^|,)\s*(\w+):/g)].map(m => m[1]);
const lus = [...new Set([...CORE.matchAll(/ctx\.(\w+)/g)].map(m => m[1]))].sort();
const communs = emis.filter(e => lus.includes(e));
NB(`maquette → ${emis.join(", ") || "(rien)"}`,
  `moteur lit ${lus.length} champs · communs : ${communs.join(", ") || "aucun"} · ` +
  `à mapper : ${emis.filter(e => !lus.includes(e)).join(", ") || "rien"} (ex. logementPlus2Ans → ctx.fiscal)`);

/* ── 6. types de pièces : la maquette en connaît plus que le moteur n'en compte ── */
console.log("\n6. Types de pièces");
const typesMaq = [...(MAQ.match(/const ROOM_TYPES = \[([\s\S]*?)\n\];/)?.[1] ?? "").matchAll(/\['(\w+)'/g)].map(m => m[1]);
const sansEquivalent = typesMaq.filter(t => !lus.includes(t) && !lus.includes(t + "s"));
NB(`${typesMaq.length} types dans la maquette, ${typesMaq.length - sansEquivalent.length} avec un compteur au moteur`,
  `sans compteur direct : ${sansEquivalent.join(", ")}`);

console.log(`\n${"─".repeat(60)}`);
/* ── 7. Le prix de Pro affiché dans l'éditeur = celui de la page Tarifs (décision de Dani, 26/09/2026) ── */
console.log("\n7. Prix de Pro : l'éditeur dit celui de la page Tarifs");
{
  const DICO = fs.readFileSync("lib/i18n/dictionaries.ts", "utf8");
  const mensuel = (DICO.match(/mensuel:\s*\{[^}]*prix:\s*"([^"]+)"/) || [])[1];
  const ligne = MAQ.slice(MAQ.indexOf("const PRIX_PRO="), MAQ.indexOf("\n", MAQ.indexOf("const PRIX_PRO=")));
  const editeur = (ligne.match(/\|\|'([^']+)';\s*$/) || [])[1];
  const chiffre = s => (s || "").match(/\d+(?:,\d+)?/)?.[0];
  if (!mensuel || !editeur) KO("prix de Pro introuvable", `Tarifs : ${mensuel ?? "?"} · éditeur : ${editeur ?? "?"}`);
  else if (chiffre(mensuel) !== chiffre(editeur)) KO(`l'éditeur dit « ${editeur} », la page Tarifs « ${mensuel} »`, "PRIX_PRO dans plan-editor.html");
  else console.log(`  ✓ ${editeur} (page Tarifs : ${mensuel} / mois)`);
}

/* ── 8. Le lien « Plan final → construction » (C7, C9 / D75) : la route que l'éditeur ouvre existe et lit
   `?source=editeur-plan` et le fragment `#plan=` ; la constante CONSTRUCTION_URL de l'éditeur (seule adresse écrite)
   vise cette route, sur getavyora.fr, avec `?source=editeur-plan`, et l'éditeur y met bien `#plan=`. ── */
console.log("\n8. Lien du Plan final vers l'estimation de la construction");
{
  const ROUTE = "app/estimation-construction-maison/page.tsx";
  const lit = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
  const page = lit(ROUTE), ctxNeuf = lit("lib/neuf-contexte.ts"), comp = lit("components/neuf/EstimateurRapideNeuf.tsx"), lib = lit("lib/estimateur/plan-neuf.ts");
  if (!page) KO("route du neuf introuvable", ROUTE);
  else {
    const manque = [];
    if (!/contexteNeuf\(/.test(page) || !/EstimateurRapideNeuf/.test(page)) manque.push("la page ne passe pas par contexteNeuf + EstimateurRapideNeuf");
    if (!ctxNeuf || !/lire\("source"\)\s*===\s*"editeur-plan"/.test(ctxNeuf)) manque.push("lib/neuf-contexte.ts ne lit pas ?source=editeur-plan");
    if (!comp || !comp.includes('"#plan="') || !/replaceState/.test(comp) || !/lirePlanNeuf/.test(comp)) manque.push("EstimateurRapideNeuf ne lit pas #plan= (ou ne nettoie pas l'URL)");
    if (!lib || !/planNeufSchema/.test(lib) || !/maisonDepuisPlan/.test(lib)) manque.push("lib/estimateur/plan-neuf.ts incomplet");
    /* l'éditeur (D75) : la constante, la route qu'elle vise, et le fragment qu'il y ajoute */
    const MAQ_CONSTR = (MAQ.match(/const CONSTRUCTION_URL\s*=\s*'([^']+)'/) || [])[1];
    let u = null; try { u = MAQ_CONSTR ? new URL(MAQ_CONSTR) : null; } catch { u = null; }
    const routeVisee = u ? "app" + u.pathname.replace(/\/$/, "") + "/page.tsx" : null;
    if (!MAQ_CONSTR) manque.push("CONSTRUCTION_URL absente de l'éditeur");
    else if (!u) manque.push(`CONSTRUCTION_URL illisible (${MAQ_CONSTR})`);
    else {
      if (u.protocol !== "https:" || u.hostname !== "getavyora.fr") manque.push(`CONSTRUCTION_URL ne vise pas https://getavyora.fr (${u.origin})`);
      if (routeVisee !== ROUTE || !fs.existsSync(routeVisee)) manque.push(`CONSTRUCTION_URL vise ${u.pathname}, route ${routeVisee} ${fs.existsSync(routeVisee) ? "≠ " + ROUTE : "inexistante"}`);
      if (u.searchParams.get("source") !== "editeur-plan") manque.push("CONSTRUCTION_URL sans ?source=editeur-plan");
      if (u.hash) manque.push("CONSTRUCTION_URL porte déjà un fragment");
    }
    if (!/CONSTRUCTION_URL\+'#plan='\+/.test(MAQ)) manque.push("l'éditeur n'ajoute pas #plan= à CONSTRUCTION_URL (lienConstruction)");
    const ecrites = [...new Set(MAQ.match(/https?:\/\/[^'"`\s)]*estimation-construction-maison[^'"`\s)]*/g) || [])];
    if (ecrites.length !== 1) manque.push(`l'adresse est écrite ${ecrites.length} fois dans l'éditeur (une seule : CONSTRUCTION_URL) — ${ecrites.join(", ")}`);
    if (manque.length) KO("lien du Plan final cassé", manque.join(" · "));
    else console.log(`  ✓ ${ROUTE} lit ?source=editeur-plan et #plan= · éditeur : CONSTRUCTION_URL = ${MAQ_CONSTR} → ${routeVisee}`);
  }
}

/* ── 9. L'éditeur sur le site (C9) : la vitrine /logiciel-plan-maison et la page Tarifs disent les droits Gratuit / Pro
   avec les mots de l'éditeur (table DROITS), au caractère près (lib/plans/droits.ts en garde la copie) ; et quand la
   vitrine parle d'un Plan final, elle n'emploie aucun des mots interdits d'un Plan final (D75, MOTS de planfinal.mjs). ── */
console.log("\n9. Éditeur de plan sur le site : droits Gratuit / Pro et mots d'un Plan final");
{
  const manque = [];
  const lit = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
  const DR = lit("lib/plans/droits.ts"), I18N = lit("lib/i18n/plans.ts"), DICO = lit("lib/i18n/dictionaries.ts");
  const VITRINE = lit("app/logiciel-plan-maison/page.tsx"), TARIFS = lit("app/tarifs/page.tsx"), PF = lit("maquettes/tools/planfinal.mjs");
  /* la table DROITS de l'éditeur, lue telle quelle (un littéral d'objet) */
  let droits = null;
  {
    const i = MAQ.indexOf("const DROITS={"), j = MAQ.indexOf("\n};", i);
    try { droits = i < 0 ? null : new Function("return " + MAQ.slice(i + "const DROITS=".length, j + 2))(); } catch (e) { manque.push("DROITS illisible : " + e.message); }
  }
  const phrases = new Set();
  const cueillir = (o) => { for (const x of Object.values(o || {})) { if (typeof x === "string") phrases.add(x); else if (x && typeof x === "object") cueillir(x); } };
  cueillir(droits);
  if (!droits || !phrases.size) manque.push("table DROITS introuvable dans l'éditeur");
  if (!DR || !I18N || !DICO || !VITRINE || !TARIFS || !PF) manque.push("fichier du site introuvable (droits.ts, plans.ts, dictionaries.ts, vitrine, Tarifs ou planfinal.mjs)");
  else {
    /* la copie du site : chaque phrase est dans DROITS */
    const bloc = DR.slice(DR.indexOf("export const DROITS_EDITEUR = {"), DR.indexOf("} as const;"));
    const copie = Object.fromEntries([...bloc.matchAll(/^\s*(\w+): "([^"]*)",/gm)].map((m) => [m[1], m[2]]));
    for (const [k, x] of Object.entries(copie)) if (!phrases.has(x)) manque.push(`lib/plans/droits.ts · ${k} « ${x} » n'est plus dans DROITS`);
    const liste = (nom) => { const m = DR.match(new RegExp("export const " + nom + " = \\[([\\s\\S]*?)\\] as const;")); return m ? m[1].split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean) : null; };
    const valeurs = (nom) => (liste(nom) || []).map((r) => { const c = r.match(/^D\.(\w+)(\.split\(","\)\[0\])?$/); return c && copie[c[1]] ? (c[2] ? copie[c[1]].split(",")[0] : copie[c[1]]) : null; });
    for (const nom of ["COLONNE_GRATUIT", "COLONNE_PRO", "PUCE_TARIFS"]) {
      const v = valeurs(nom);
      if (!v.length || v.includes(null)) manque.push(`lib/plans/droits.ts · ${nom} illisible (des D.<clé> seulement)`);
    }
    const gratuit = valeurs("COLONNE_GRATUIT"), pro = valeurs("COLONNE_PRO"), puce = valeurs("PUCE_TARIFS");
    /* une phrase de la colonne Gratuit est un droit gratuit (pas un droit Pro seul) */
    const gratuits = new Set(); const proSeuls = new Set();
    for (const d of Object.values(droits || {})) {
      const g = d?.gratuit, p = d?.pro;
      if (typeof g === "string") gratuits.add(g);
      if (typeof p === "string" && p !== g) proSeuls.add(p);
      for (const sous of Object.values(d || {})) if (sous && typeof sous === "object") { if (typeof sous.gratuit === "string") gratuits.add(sous.gratuit); if (typeof sous.pro === "string" && sous.pro !== sous.gratuit) proSeuls.add(sous.pro); }
      if (typeof d?.planFinal === "string") gratuits.add(d.planFinal);
    }
    for (const x of gratuit) if (x && !gratuits.has(x)) manque.push(`colonne Gratuit : « ${x} » n'est pas un droit gratuit de DROITS`);
    for (const x of pro) if (x && !proSeuls.has(x)) manque.push(`colonne Pro : « ${x} » n'est pas un droit que Pro ajoute (DROITS)`);
    /* la vitrine affiche ces deux colonnes */
    if (!/gratuitListe: \[\.\.\.COLONNE_GRATUIT\]/.test(I18N) || !/proListe: \[\.\.\.COLONNE_PRO\]/.test(I18N)) manque.push("lib/i18n/plans.ts : la vitrine FR ne reprend pas COLONNE_GRATUIT / COLONNE_PRO");
    if (!/v\.gratuitListe\.map/.test(VITRINE) || !/v\.proListe\.map/.test(VITRINE)) manque.push("la vitrine n'affiche pas les colonnes Gratuit / Pro");
    if (/aggregateRating|reviewCount|ratingValue/.test(VITRINE)) manque.push("la vitrine déclare une note ou des avis (JSON-LD)");
    /* la page Tarifs : la puce et l'encart « Tu viens de l'éditeur de plan » */
    const fr = DICO.slice(DICO.indexOf("const fr = {"), DICO.indexOf("const en: Dict"));
    const puceDico = (fr.match(/featurePlan:\s*"([^"]+)"/) || [])[1];
    const attendu = "Éditeur de plan : " + puce.join(" ; ");
    if (puceDico !== attendu) manque.push(`Tarifs · featurePlan « ${puceDico ?? "?"} » ≠ « ${attendu} »`);
    const encart = [...((fr.match(/depuisEditeurDroits:\s*\[([\s\S]*?)\]/) || [])[1] || "").matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (JSON.stringify(encart) !== JSON.stringify(pro)) manque.push("Tarifs · depuisEditeurDroits ≠ COLONNE_PRO");
    if (!/t\.featureNeuf\][^\n]*t\.featurePlan/.test(TARIFS)) manque.push("Tarifs : la puce featurePlan n'est pas après featureNeuf");
    /* les mots d'un Plan final : le bloc « Plan final » de la vitrine (FR), son haut de page et la colonne Gratuit */
    let MOTS = null;
    { const i = PF.indexOf("const MOTS = ["), j = PF.indexOf("\n];", i); try { MOTS = new Function("return " + PF.slice(i + "const MOTS = ".length, j + 3))(); } catch (e) { manque.push("MOTS illisible : " + e.message); } }
    const a = I18N.indexOf("/* § 9 · Plan final : début */"), b = I18N.indexOf("/* § 9 · Plan final : fin */");
    const haut = I18N.slice(I18N.indexOf("  page: {"), I18N.indexOf("\n  },", I18N.indexOf("  page: {")));
    if (a < 0 || b < a) manque.push("lib/i18n/plans.ts : bloc « Plan final » de la vitrine introuvable");
    else if (MOTS) {
      const chaines = [...(I18N.slice(a, b) + haut).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).concat(gratuit.filter(Boolean));
      for (const c of chaines) for (const [re, nom] of MOTS) if (re.test(c)) manque.push(`Plan final, mot interdit ${nom} : « ${c} »`);
      if (!chaines.length) manque.push("bloc « Plan final » vide");
      else console.log(`  · ${chaines.length} phrase(s) de la vitrine lues comme un Plan final, ${MOTS.length} mots interdits`);
    }
    if (!manque.length) console.log(`  ✓ vitrine : ${gratuit.length} droits gratuits, ${pro.length} droits Pro · Tarifs : la puce (${puce.length} droits) et l'encart, mot pour mot de DROITS`);
  }
  if (manque.length) KO("éditeur de plan sur le site : divergence avec l'éditeur", manque.join(" · "));
}

console.log(dur ? `✗ ${dur} divergence(s) à corriger · ${mou} point(s) à savoir` : `✓ aucune divergence · ${mou} point(s) à savoir`);
process.exit(dur ? 1 : 0);

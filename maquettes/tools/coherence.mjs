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
  if (!m) { NB(`nombre non trouvé pour « ${lot} »`, "libellé du bloc HORS_PLAN modifié ?"); continue; }
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
console.log(dur ? `✗ ${dur} divergence(s) à corriger · ${mou} point(s) à savoir` : `✓ aucune divergence · ${mou} point(s) à savoir`);
process.exit(dur ? 1 : 0);

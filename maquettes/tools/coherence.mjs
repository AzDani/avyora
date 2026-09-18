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
  ["EQUIP_PRIX", "lavabo", "Vasque"],
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
  ["EQUIP_PRIX", "vasque2", "Meuble-vasque"],
  ["EQUIP_PRIX", "plan", "Plan de travail seul"],
  ["EQUIP_PRIX", "prise", "Ajouter / déplacer une prise"],
  ["EQUIP_PRIX", "interrupteur", "Ajouter / déplacer un interrupteur"],
  ["EQUIP_PRIX", "lumiere", "Ajouter un point lumineux"],
];
/* Prix de la maquette qui chiffrent un ouvrage SANS poste au catalogue. Ce n'est pas une dérive :
   c'est la liste des postes à créer ou à abandonner, et elle demande une décision. */
const SANS_POSTE = [
  ["PRIX.boucher", "90 €/m² — rebouchage d'une ouverture : aucun poste au catalogue"],
  ["PRIX.percLeger", "320 €/u — percement d'un mur NON porteur : seul le porteur a ses deux postes"],
  ["PRIX.jambagesMl", "35 €/ml — linteau et tableaux : inclus dans le forfait percement du catalogue ?"],
  ["PRIX.retourIso", "28 €/ml — retour d'isolant en tableau : aucun poste"],
  ["PRIX.deposeEquip", "60 €/u — dépose d'un équipement : aucun poste générique"],
  ["PRIX.betonFini", "45 €/m² — finition béton lissé / quartzé : aucun poste"],
  ["PRIX.menuiserie.porte_double", "600 €/u — porte double intérieure : aucun poste distinct"],
  ["PRIX.menuiserie.passage", "110 €/u — passage sans porte : aucun poste"],
  ["PRIX.menuiserie.fenetre_p", "350 €/u — petite fenêtre : le catalogue n'a que « Fenêtres »"],
  ["EQUIP_PRIX.frigo", "80 €/u — pose d'un réfrigérateur : aucun poste"],
  ["EQUIP_PRIX.lave_linge", "190 €/u — raccordement lave-linge : aucun poste de pose"],
  ["EQUIP_PRIX.lave_vaisselle", "190 €/u — idem lave-vaisselle"],
];
console.log("\n1. Prix recopiés dans la maquette vs catalogue (fourni-posé)");
let alignes = 0;
for (const [tbl, cle, nom] of PRIX_MAP) {
  const m = tableVal(`${tbl}.${cle}`), p = postes.get(nom);
  if (m === null) { KO(`${tbl}.${cle} introuvable dans la maquette`, "clé renommée ou supprimée ?"); continue; }
  if (!p) { KO(`poste « ${nom} » absent du catalogue`, `référencé par ${tbl}.${cle}`); continue; }
  if (Math.abs(m - p.fp) < 0.51) alignes++;
  else KO(`${tbl}.${cle} = ${m} € · catalogue « ${nom} » = ${p.fp} €`, `écart ${(m - p.fp > 0 ? "+" : "")}${Math.round((m / p.fp - 1) * 100)} % sur le compteur indicatif`);
}
console.log(`  ${alignes}/${PRIX_MAP.length} alignés`);
console.log(`\n1bis. Prix de la maquette sans poste au catalogue (décision : créer ou abandonner)`);
for (const [chemin, quoi] of SANS_POSTE) {
  const v = tableVal(chemin);
  NB(`${chemin}${v === null ? " (clé introuvable — renommée ?)" : ""}`, quoi);
}

/* ── 2. libellés déclarés « exacts » : FACADES[].poste doit exister au catalogue ── */
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

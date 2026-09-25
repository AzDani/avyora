/**
 * Un seul langage, honnête, avec glossaire (D39).
 *
 * Le contrôle parcourt l'interface comme un utilisateur (accueil, exemple, chaque mur, chaque
 * ouverture, chaque équipement, chaque pièce, chaque outil, dans les trois vues ; Suivi, Estimer,
 * export, Mes plans, Aide ; en Pro et en gratuit) et lit TOUT ce qui s'affiche — textes, bulles,
 * titres, libellés accessibles. Il vérifie :
 *   - le vocabulaire : les vues s'appellent « Avant travaux / Travaux / Après travaux », les états
 *     viennent de LEX et sont les mêmes dans les deux vues ; plus de « Projet », « Final »,
 *     « Conservé », « Rien de prévu », « moteur », « poste au catalogue », « BET », « maquette »… ;
 *   - le mode développeur : sans ?dev, ni interrupteur Pro, ni JSON, ni contrat, ni « Envoyer » ;
 *   - Gratuit / Pro : une seule table (DROITS) reprise mot pour mot, un Pro ne lit jamais « avec Pro »,
 *     « Passer Pro » mène à la page Tarifs ;
 *   - le glossaire : pastilles ⓘ là où il faut, une fois par panneau et par mot, bulle au survol,
 *     au clic, au clavier, fermée par Échap et par un clic ailleurs, jamais hors de l'écran ;
 *   - les raccourcis : une seule liste, la même dans l'accueil et dans l'Aide, avec toutes les touches ;
 *   - la décence : dite prudemment, vérifiée sur le logement et non par pièce ;
 *   - le Suivi : un planning (corps d'état dans l'ordre du chantier), des libellés de pro, les prix
 *     en Pro, « X € réalisés sur Y € », une tâche cliquée montre son objet ;
 *   - « Estimer ce plan » : le montant d'abord, le détail par corps d'état et par tâche, « Encore à
 *     décider » qui sélectionne l'objet, « Pas encore chiffré », un seul appel principal.
 *   - D49 (contre-jury) : de vrais accords (jamais « (s) »), « jaune » pour la démolition partout, des notes
 *     qui ne l'imitent pas, la question « porteur ? » posée une fois, le message d'une sélection vrai dans
 *     chaque vue, « Encore à décider » sans homonymes, « Ton projet à 100 % » impossible tant qu'il reste à
 *     décider, aucune promesse régionale du compteur, les mots du bâtiment expliqués dans Estimer, le Suivi
 *     et le dossier, des icônes SVG au lieu des flèches ↔ ↕ ↗, un exemple nommé d'après sa surface.
 *   - D53 (jury final) : le résumé des travaux compte toutes les tâches du compteur ; « Aucun travail marqué » ne se
 *     lit jamais à côté d'une tâche (bureau, téléphone, et chaque état lu).
 *
 *   node maquettes/tools/langage.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
import { scene, sceneVariantes } from "./scene-reference.mjs";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/langage.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet(suffixe = "", largeur = 1400, hauteur = 900, pro = true) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: largeur, height: hauteur });
  await p.evaluateOnNewDocument((pro) => { try { localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); } catch {} }, pro);
  await p.goto("file://" + SP + "/plan-editor.html" + suffixe, { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}

/* ── Ce qu'on lit à l'écran : texte visible + bulles, titres, libellés accessibles, exemples ── */
const LIRE = () => {
  const vis = (el) => !!el && el.getClientRects().length > 0;
  const attrs = [...document.querySelectorAll("[data-tip],[title],[aria-label],[placeholder]")].filter(vis)
    .flatMap((el) => ["data-tip", "title", "aria-label", "placeholder"].map((a) => el.getAttribute(a)).filter(Boolean));
  /* R6 : une flèche dans un bouton ou un lien est une icône — elle se dessine en SVG (ico('fleche')), pas avec le glyphe → */
  const fleches = [...document.querySelectorAll("button, a, summary, [role=button], [role=menuitem], [role=tab]")].filter(vis).filter((el) => /[→←]/.test(el.innerText || "")).map((el) => "FLECHE-ICONE « " + el.innerText.replace(/\s+/g, " ").slice(0, 50) + " »");
  return [document.body.innerText, ...attrs, ...fleches].join("\n");
};

/* Les tournures qui ne doivent plus s'afficher, et pourquoi. */
const INTERDITS = [
  [/maquette/i, "mot de développeur : maquette"],
  [/\bmoteur\b/i, "mot interne : moteur"],
  [/base de prix|poste au catalogue|au catalogue|du catalogue|le catalogue/i, "mot interne : catalogue / base de prix"],
  [/\bBET\b/, "sigle non expliqué : BET"],
  [/\bJSON\b|Contrat \d|Envoyer vers mon estimation|plan complet|pour le support/i, "développement visible sans ?dev"],
  [/vue\s+(Projet|Existant|Final)\b|\ben (Projet|Existant)\b|Passer en Projet|\bProjet\b|\bFinal\b|🛠|✅/, "ancien nom de vue"],
  [/Conservée?\b|Rien de prévu|Je l[ae] garde|Je la remplace|\bExistante\b|État dans le projet/, "ancien libellé d'état"],
  [/arrive avec Pro|Débloque/i, "promesse Pro mal placée"],
  [/décret|réglementaires?\b/i, "référence juridique non vérifiée"],
  [/Leroy Merlin|Castorama|\bPoint P\b|\bVelux\b/, "enseigne ou marque réelle"],
  [/Oscillo-b\.|λ 0\.\d|R < 3\.7|m²\.K\/W/, "abréviation ou nombre à point décimal"],
  [/\bplaco\b/i, "jargon non expliqué : placo"],
  [/\bpostes?\b/i, "mot interne : poste"],
  /* D49 · contre-jury (cj-design08, cj-design12, cj-coherence03/08/09/10, cj-integration07/08, cj-qa11) */
  [/\p{L}\((?:s|e|es)\)/u, "pluriel « (s) » : un vrai accord (pluriel())"],
  [/\borange\b/i, "couleur de démolition : on dit « jaune » (LEX.couleur)"],
  [/(?:rose|vert|bleu|violet|gris) = à démolir/i, "code couleur de note qui imite un état"],
  [/\bEXISTANTE?S?\b|\bCONSERVÉE?S?\b|\bconserv(?:é|ée|és|ées)\b|« existant »/, "état hors LEX (existant / conservé)"],
  [/Dans le projet|[Ll]e projet le crée|créé par le projet/, "« le projet » pour dire la vue Travaux"],
  [/ajusté à ta région|montant ajusté|Coût local/i, "promesse régionale que le compteur ne tient pas"],
  [/Budget produits repérés \(HT\)\s*0\s*€/, "budget produits à 0 € (prix non renseignés)"],
  [/[↔↕↗↺⟳⧉✓✔✕●↓]|\p{Extended_Pictographic}/u, "glyphe utilisé comme icône (ico())"],
  [/Tu la retrouves/, "accord : « Tu retrouves cette décision »"],
  [/corps d'état\s+par corps d'état/, "mot en double"],
  [/T2 de 60 m²|T2 · 60 m²|T3 · 70 m²|Maison · 100 m²/, "nom d'exemple ou de plan type ≠ surface mesurée"],
  [/Menuiserie en applique :|retour de doublage en tableau|ajuster le dormant/, "message en jargon (novice08)"],
  /* R6 · recette finale */
  [/FLECHE-ICONE/, "flèche → dans un bouton ou un lien : icône SVG (ico('fleche'))"],
  [/\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]/, "valeur brute affichée"],
  [/\bles 1 autres?\b|\b1 autres\b/, "accord : « Voir les 1 autres »"],
  [/\d\u202f\d/, "séparateur des milliers en espace fine (U+202F), invisible dans la police du texte"],
  [/le projet en déduit/, "la toiture décrite ne déduit aucun travaux (arbitrage tour 2)"],
  [/HT : le montant total/, "deux-points dans une liste (DROITS.total)"],
  [/— \?/, "choix vide « — ? » : on écrit « À préciser »"],
];
const AVEC_PRO = /Avec Pro\b|avec Pro\b|Passer Pro|· Pro\b|Budget travaux HT · Pro/;

const lus = []; /* [état, texte, nombre de tâches du compteur] */
const noter = async (p, etat) => lus.push([etat, await p.evaluate(LIRE), await p.evaluate(() => { try { return chantierPrix().nb; } catch { return 0; } })]);

/* Une tâche de Suivi commence par un verbe, comme sur la feuille d'un conducteur de travaux. */
const VERBE_SRC = "^(Faire|Démolir|Poser|Déposer|Monter|Reboucher|Ouvrir|Percer|Doubler|Isoler|Couler|Créer|Lisser|Passer|Peindre|Poncer|Ajouter|Remplacer|Débrancher|Habiller|Appliquer|Nettoyer|Refaire|Traiter|Ravaler)\\b";

/* ═════════ 1. Parcours complet en Pro, sans ?dev ═════════ */
let p = await onglet();
await noter(p, "accueil");
/* D42 : l'accueil, raccourci, ne liste plus les touches — elles vivent dans l'Aide seulement (une seule table, keysHTML) */
t["accueil · les raccourcis ne vivent qu'à un endroit : l'Aide (une seule table)"] = await p.evaluate(() => {
  /* D43 : la page ajoute aux titres un rôle de titre (lecteur d'écran) — on compare le contenu, pas les attributs */
  const a = document.getElementById("welcomeKeys"), b2 = document.getElementById("aideKeys"), ref = document.createElement("div"); ref.innerHTML = reglageRaccourcisHTML() + keysHTML(); /* D51 : le réglage « Raccourcis d'une touche » précède la table */
  return !a && !document.querySelector("#m-welcome kbd") && b2.innerHTML.length > 200 && b2.textContent === ref.textContent && b2.querySelectorAll("kbd").length === ref.querySelectorAll("kbd").length;
});
t["raccourcis · chaque touche d'outil y figure (V, B, M, P, D, E, T, C, L) et R dit 90°"] = await p.evaluate(() => {
  const h = document.getElementById("aideKeys").textContent, kbd = [...document.querySelectorAll("#aideKeys kbd")].map((x) => x.textContent.trim());
  return ["V", "B", "M", "P", "D", "E", "T", "C", "L"].every((k) => kbd.includes(k) && TOOLS.some((x) => x[2] === k)) && TOOLS.filter((x) => x[2]).every((x) => kbd.includes(x[2])) && /90°/.test(h) && /15°/.test(h);
});
await p.evaluate(() => closeWelcome("sample")); await wait(200);

/* les boutons de vue et les outils */
t["vues · les trois boutons portent les mots de LEX, sans emoji"] = await p.evaluate(() => {
  const txt = [...document.querySelectorAll("#modes button")].map((x) => x.textContent.trim());
  return JSON.stringify(txt) === JSON.stringify([LEX.vue.existant, LEX.vue.projet, LEX.vue.final]) && txt.every((x) => !/\p{Extended_Pictographic}/u.test(x));
});
t["outils · aucun libellé en double (« Sélection » ×2), « Zone », « Note », fond de plan"] = await p.evaluate(() => {
  const l = [...document.querySelectorAll("#tools .tb span")].map((x) => x.textContent.trim());
  return new Set(l).size === l.length && l.includes("Zone") && l.includes("Note") && !l.includes("Calque") && !!document.querySelector('#tools .tb[aria-label="Image (fond de plan)"]'); /* D51 (cj-access11) : le nom contient le libellé visible « Image » */
});
t["outils · le Doublage a sa bulle d'explication"] = await p.evaluate(() => /Isoler un mur/.test(document.querySelector("#tools .tb[aria-label=\"Doublage\"]").dataset.tip));
t["affichage · le bouton des couches s'appelle « Affichage »"] = await p.evaluate(() => document.getElementById("layersBtn").getAttribute("aria-label") === "Affichage");
t["sans ?dev · ni interrupteur Pro, ni « maquette » dans la barre"] = await p.evaluate(() => !document.getElementById("proChip").getClientRects().length && !/maquette/i.test(document.querySelector(".top").innerText));
t["sans ?dev · pas de bouton « Envoyer vers mon estimation »"] = await p.evaluate(() => !/Envoyer/.test(document.getElementById("pfoot").innerText));

/* Chaque élément, chaque outil, dans les trois vues */
for (const vue of ["existant", "projet", "final"]) {
  await p.evaluate((m) => { setMode(m); closeModal(); setTool("select"); sel = null; panelTab = "details"; render(); }, vue);
  await noter(p, vue + " · vue d'ensemble");
  const ids = await p.evaluate(() => { const lv = L(); return [...lv.walls.map((w) => ["wall", w.id]), ...lv.openings.map((o) => ["opening", o.id]), ...lv.items.map((i) => ["item", i.id]), ...lv.rooms.filter((r) => (facesCache[lv.id] || []).some((f) => f.room === r)).map((r) => ["room", r.id])]; });
  for (const [kind, id] of ids) {
    const r = await p.evaluate(([kind, id]) => { sel = { kind, id }; multi = []; msel = []; renderPanel(); return document.getElementById("pbody").innerText.length; }, [kind, id]);
    if (r) await noter(p, `${vue} · ${kind} ${id}`);
  }
  for (const outil of ["mur", "ouverture", "doublage", "equipement", "cote", "mesure", "calque", "texte", "zone"]) {
    if (vue === "final") continue;
    await p.evaluate((o) => { setTool(o); }, outil); await noter(p, `${vue} · outil ${outil}`);
  }
  await p.evaluate(() => { setTool("select"); setPanelTab("suivi"); }); await noter(p, vue + " · suivi");
  await p.evaluate(() => setPanelTab("details"));
}

/* Les mêmes états, les mêmes mots, dans les deux vues */
Object.assign(t, await p.evaluate(() => {
  const r = {}, lv = L(), E = LEX.etat;
  const boutons = (s) => { sel = s; multi = []; renderPanel(); return [...document.querySelectorAll("#pbody .segetat button")].map((x) => x.firstChild.textContent.trim()); };
  const w = lv.walls.find((x) => !isVirtual(x) && !x.st), o = lv.openings.find((x) => !x.st && OPENINGS[x.type].cat === "fenetre"), it = lv.items.find((x) => !x.st && !isFurniture(x.type));
  setMode("existant"); closeModal();
  const ex = { w: boutons({ kind: "wall", id: w.id }), o: boutons({ kind: "opening", id: o.id }), i: boutons({ kind: "item", id: it.id }) };
  setMode("projet"); closeModal();
  const pj = { w: boutons({ kind: "wall", id: w.id }), o: boutons({ kind: "opening", id: o.id }), i: boutons({ kind: "item", id: it.id }) };
  /* D53 (arbitrage) : ce qui est déjà là n'est jamais « à créer » ni « à poser », dans aucune vue */
  r["états · mur déjà là : les mêmes mots dans les deux vues, jamais « À créer »"] = JSON.stringify(ex.w) === JSON.stringify([E.aDecider, E.garder, E.demolir]) && JSON.stringify(pj.w) === JSON.stringify([E.aDecider, E.garder, E.demolir]);
  r["états · ouverture déjà là : mêmes mots, « À boucher » en Travaux, jamais « À créer »"] = JSON.stringify(ex.o) === JSON.stringify([E.aDecider, E.garder, E.remplacer]) && JSON.stringify(pj.o) === JSON.stringify([E.aDecider, E.garder, E.remplacer, E.boucher]);
  r["états · équipement déjà là : « À déposer », jamais « À poser »"] = JSON.stringify(ex.i) === JSON.stringify([E.aDecider, E.garder, E.deposer]) && JSON.stringify(pj.i) === JSON.stringify([E.aDecider, E.garder, E.deposer]);
  const it2 = { id: uid(), type: it.type, x: it.x + 0.5, y: it.y, w: it.w, h: it.h, rot: 0, st: "creer" }; lv.items.push(it2); afterChange();
  r["états · équipement posé en Travaux : « À poser »"] = JSON.stringify(boutons({ kind: "item", id: it2.id })) === JSON.stringify([E.aDecider, E.garder, E.poser, E.deposer]);
  lv.items = lv.items.filter((x) => x.id !== it2.id); afterChange();
  setMode("existant"); closeModal(); sel = { kind: "wall", id: w.id }; renderPanel();
  r["mur en vue Avant travaux : plus de consigne « se règle en vue Projet »"] = !/se règle en vue/.test(document.getElementById("pbody").innerText) && !/Passer en/.test(document.getElementById("pbody").innerText);
  return r;
}));

/* Le glossaire : pastilles dans chaque panneau technique, une fois par mot */
Object.assign(t, await p.evaluate(() => {
  const r = {}, lv = L();
  const pastilles = () => [...document.querySelectorAll("#pbody .gl")].map((x) => x.dataset.gl);
  const une = (l) => new Set(l).size === l.length;
  setMode("projet"); closeModal();
  const w = lv.walls.find((x) => !isVirtual(x) && isExteriorWall(x));
  sel = { kind: "wall", id: w.id }; renderPanel(); const pw = pastilles();
  const o = lv.openings.find((x) => OPENINGS[x.type].cat === "fenetre" && !x.st); sel = { kind: "opening", id: o.id }; setOpeningProp("st", "remplacer"); renderPanel(); const po = pastilles(); setOpeningProp("st", "existant");
  const f = (facesCache[lv.id] || []).find((x) => x.room && x.room.type === "sdb"); sel = { kind: "room", id: f.room.id }; setRoomRevetement("Carrelage"); renderPanel(); const pr = pastilles();
  sel = null; setTool("doublage"); const pd = pastilles(); setTool("select");
  sel = null; renderPanel(); const pv = pastilles();
  setPanelTab("suivi"); const ps = pastilles(); setPanelTab("details");
  r["glossaire · fiche mur : porteur, cloison, doublage, façade"] = ["porteur", "cloison", "doublage", "ravalement"].every((k) => pw.includes(k)) && une(pw);
  r["glossaire · fiche fenêtre : allège, pose, tapée"] = ["allege", "pose", "tapee"].every((k) => po.includes(k)) && une(po);
  r["glossaire · fiche pièce : faïence, surface habitable, une couche du sol"] = ["faience", "habitable"].every((k) => pr.includes(k)) && ["chape", "ragreage", "dalle", "depose"].some((k) => pr.includes(k)) && une(pr);
  r["glossaire · outil Doublage : doublage, ITI, ITE, R, λ"] = ["doublage", "iti", "ite", "r", "lambda"].every((k) => pd.includes(k)) && une(pd);
  r["glossaire · le chantier : TVA, HT"] = ["tva", "ht"].every((k) => pv.includes(k)) && une(pv);
  r["glossaire · Suivi : corps d'état"] = ps.includes("corps");
  r["glossaire · chaque pastille a sa définition"] = [...pw, ...po, ...pr, ...pd, ...pv, ...ps].every((k) => GLOSSAIRE[k] && GLOSSAIRE[k][1].length > 20);
  return r;
}));
/* la bulle : survol, clic, Échap, clic ailleurs, clavier, jamais hors de l'écran */
await p.evaluate(() => { setMode("projet"); closeModal(); const w = L().walls.find((x) => !isVirtual(x) && isExteriorWall(x)); sel = { kind: "wall", id: w.id }; renderPanel(); });
const bulle = () => p.evaluate(() => { const g = document.getElementById("glossPop"), r = g.getBoundingClientRect(); return { ouverte: !g.hidden, txt: g.textContent, dedans: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, role: g.getAttribute("role") }; });
const centre = (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
{ const c = await centre('#pbody .gl[data-gl="porteur"]'); await p.mouse.move(c.x, c.y); await wait(80);
  const b1 = await bulle(); t["bulle · s'ouvre au survol, avec la définition"] = b1.ouverte && /soutient un plancher/.test(b1.txt) && b1.role === "tooltip";
  t["bulle · reste dans l'écran"] = b1.dedans;
  await p.mouse.move(c.x - 200, c.y + 200); await wait(80); t["bulle · se referme quand on quitte la pastille"] = !(await bulle()).ouverte;
  await p.mouse.click(c.x, c.y); await wait(80); await p.mouse.move(c.x - 200, c.y + 200); await wait(80);
  t["bulle · un clic l'épingle (elle reste)"] = (await bulle()).ouverte;
  t["bulle · la pastille dit qu'elle est ouverte (aria-expanded)"] = await p.evaluate(() => document.querySelector('#pbody .gl[data-gl="porteur"]').getAttribute("aria-expanded") === "true");
  await p.keyboard.press("Escape"); await wait(80); t["bulle · Échap la ferme"] = !(await bulle()).ouverte;
  t["bulle · Échap ne désélectionne pas le mur"] = await p.evaluate(() => sel && sel.kind === "wall");
  await p.mouse.click(c.x, c.y); await wait(60); await p.mouse.click(c.x - 300, 40); await wait(80); t["bulle · un clic ailleurs la ferme"] = !(await bulle()).ouverte; }
{ /* au clavier : Tab jusqu'à la pastille */
  await p.evaluate(() => { const g = document.querySelector('#pbody .gl[data-gl="porteur"]'); const prev = g.previousElementSibling || g.parentElement; tabAt = performance.now() + 1e6; });
  await p.evaluate(() => { document.querySelector('#pbody .gl[data-gl="cloison"]').focus(); }); await p.keyboard.press("Tab"); await wait(60);
  /* on se contente de vérifier qu'une pastille atteinte au clavier ouvre sa bulle */
  const kb = await p.evaluate(() => { const a = document.activeElement; return a && a.classList.contains("gl"); });
  if (!kb) { await p.evaluate(() => document.querySelector('#pbody .gl[data-gl="porteur"]').focus()); }
  await p.keyboard.press("Enter"); await wait(80);
  t["bulle · au clavier, Entrée l'ouvre"] = (await bulle()).ouverte; await p.keyboard.press("Escape"); await wait(60); }
{ /* au bord droit de l'écran, dans une fenêtre étroite */
  await p.setViewport({ width: 420, height: 800 }); await wait(250);
  await p.evaluate(() => { closeModal(); setMode("projet"); closeModal(); const w = L().walls.find((x) => !isVirtual(x) && isExteriorWall(x)); sel = { kind: "wall", id: w.id }; renderPanel(); toggleSheet(true); });
  await wait(250);
  await p.evaluate(() => { const g = [...document.querySelectorAll("#pbody .gl")].filter((x) => x.getClientRects().length).pop(); g.scrollIntoView({ block: "center" }); g.click(); });
  await wait(100); const b2 = await bulle(); t["bulle · sur téléphone aussi, elle ne sort pas de l'écran"] = b2.ouverte && b2.dedans;
  await p.keyboard.press("Escape"); await p.setViewport({ width: 1400, height: 900 }); await wait(250); }

/* Estimer ce plan (Pro) : l'écran de la valeur */
Object.assign(t, await p.evaluate(() => {
  const r = {}; loadSample(); setMode("projet"); closeModal(); setTool("select");
  showEstimate(); const B = document.getElementById("estBody"), q = quantities(), T = chantierTasks();
  r["Estimer · le premier bloc est le montant, égal au budget"] = B.firstElementChild.classList.contains("esthero") && B.querySelector("#estTotal").textContent === eur(chantierPrix().total);
  r["Estimer · le montant est dit HT, avec sa pastille"] = /Budget travaux HT/.test(B.querySelector(".esthero").innerText) && !!B.querySelector('.esthero .gl[data-gl="ht"]');
  const lots = [...B.querySelectorAll(".estlot .ln")].map((x) => x.firstChild.textContent);
  r["Estimer · détail par corps d'état, dans l'ordre du chantier"] = lots.length > 0 && lots.every((l, i) => i === 0 || LOTS.indexOf(lots[i - 1]) < LOTS.indexOf(l));
  r["Estimer · et tâche par tâche (chaque tâche y figure une fois)"] = B.querySelectorAll(".estlot .tline").length === T.length;
  const A = elementsATrancher(), n = q.arbitrage.equipements.aTrancher + q.arbitrage.menuiseries.aTrancher;
  r["Estimer · « Encore à décider » compte les mêmes objets que le contrat (+ les sols)"] = A.filter((a) => a.kind !== "room").length === n && new RegExp("Encore à décider \\(" + A.length + "\\)", "i").test(B.innerText);
  r["Estimer · « Pas encore chiffré » liste les tâches à 0 €"] = T.filter((x) => !x.prix && !x.inclus).length === 0 || /Pas encore chiffré \(/i.test(B.innerText);
  r["Estimer · un seul appel principal"] = B.querySelectorAll(".estimate").length === 1 && /Exporter/.test(B.querySelector(".estimate").textContent);
  r["Estimer · pas de JSON ni d'envoi sans ?dev"] = !B.querySelector("pre") && !/Envoyer/.test(B.innerText);
  r["Estimer · les quantités sont repliées sous le budget"] = !!B.querySelector("details.qdet") && !B.querySelector("details.qdet").open;
  /* un clic sur « à décider » sélectionne l'objet sur le plan */
  const first = B.querySelector(".adec"); const a0 = A[0]; first.click();
  r["Estimer · « Encore à décider » cliqué : la fenêtre se ferme, l'objet est sélectionné"] = !modaleOuverte() && sel && sel.kind === a0.kind && sel.id === a0.id;
  /* une tâche cliquée montre son objet */
  showEstimate(); const tl = [...document.querySelectorAll("#estBody button.tline")][0]; const id = tl.getAttribute("onclick").match(/montrerTache\('([^']+)'\)/)[1]; tl.click();
  const c = tacheCible(id); r["Estimer · une tâche cliquée : son objet est sélectionné, en vue Travaux"] = !modaleOuverte() && mode() === "projet" && sel && sel.kind === c.kind && sel.id === c.id;
  return r;
}));
await noter(p, "estimer (Pro)"); await p.evaluate(() => showEstimate()); await noter(p, "estimer (Pro) ouvert");
await p.evaluate(() => { closeModal(); exportPlan(); }); await noter(p, "export (Pro)");
await p.evaluate(() => { closeModal(); openPlansModal(); }); await noter(p, "mes plans (Pro)");
await p.evaluate(() => { closeModal(); ouvrirAide("keys"); }); await noter(p, "aide raccourcis");
await p.evaluate(() => aideOnglet("gloss"));
t["Aide · un onglet Glossaire, avec tous les mots"] = await p.evaluate(() => document.querySelectorAll("#aideGloss .glist > div").length === Object.keys(GLOSSAIRE).length && !document.getElementById("aideGloss").hidden);
await p.evaluate(() => closeModal());

/* Pro : il ne lit jamais « avec Pro », et le pied s'ouvre sur le détail */
Object.assign(t, await p.evaluate((vs) => {
  const VERBE = new RegExp(vs), r = {}; setMode("projet"); closeModal(); sel = null; render();
  const pied = document.getElementById("pfoot");
  r["Pro · la carte budget est un bouton qui ouvre le détail"] = !!pied.querySelector("button.budgetbtn") && /Voir le détail/.test(pied.innerText);
  pied.querySelector("button.budgetbtn").click(); r["Pro · … et le détail s'ouvre"] = document.getElementById("m-estimate").classList.contains("show"); closeModal();
  setPanelTab("suivi"); const s = document.getElementById("pbody");
  const T = chantierTasks(), tot = Math.round(T.reduce((a, x) => a + (x.prix || 0), 0));
  r["Suivi (Pro) · « X € réalisés sur Y € »"] = new RegExp("réalisés sur " + eur(tot).replace(/\s/g, "\\s")).test(s.innerText);
  r["Suivi (Pro) · le prix de chaque tâche"] = s.querySelectorAll(".task .tpx").length === T.length;
  const lots = [...s.querySelectorAll(".tasks .lot > span:first-child")].map((x) => x.textContent);
  r["Suivi · les corps d'état dans l'ordre du chantier"] = lots.every((l, i) => i === 0 || LOTS.indexOf(lots[i - 1]) < LOTS.indexOf(l)) && LOTS.indexOf("Isolation") < LOTS.indexOf("Plâtrerie et cloisons") && LOTS.indexOf("Façade") < LOTS.indexOf("Isolation") && LOTS.indexOf("Menuiseries intérieures") > LOTS.indexOf("Plâtrerie et cloisons") && LOTS.indexOf("Faïence") > LOTS.indexOf("Sols");
  r["Suivi · des libellés de pro : un verbe, un article"] = T.every((x) => VERBE.test(x.label));
  const it = T.find((x) => /^i:/.test(x.id));
  r["Suivi · la pièce est nommée (équipement)"] = !it || / · [A-ZÉ]/.test(it.label);
  const btn = s.querySelector(".task button.tgo"), id = btn.getAttribute("onclick").match(/montrerTache\('([^']+)'\)/)[1]; btn.click();
  const c = tacheCible(id); r["Suivi · une tâche cliquée montre son objet sur le plan"] = sel && sel.kind === c.kind && sel.id === c.id && panelTab === "details";
  setPanelTab("details"); return r;
}, VERBE_SRC));
await p.close();

/* ═════════ 2. En gratuit ═════════ */
p = await onglet("", 1400, 900, false);
/* D48 : un plan de l'utilisateur (la maison type, fenêtres à remplacer) — l'exemple, lui, montre tout */
await p.evaluate(() => { closeWelcome("fermer"); loadTemplate("maison"); closeModal(); }); await wait(150);
Object.assign(t, await p.evaluate(() => {
  const r = {}; setMode("projet"); closeModal(); L().openings.filter((o) => OPENINGS[o.type].cat === "fenetre").forEach((o) => { o.st = "remplacer"; }); afterChange(); sel = null; render();
  r["gratuit · le haut du panneau : le plan de l'utilisateur n'est pas l'exemple"] = !estExemple();
  const pied = document.getElementById("pfoot").innerText;
  r["gratuit · le pied montre le montant total (DROITS : " + DROITS.total.gratuit + ")"] = pied.includes(eur(chantierPrix().total)) && /Par corps d'état/.test(pied);
  showEstimate(); const B = document.getElementById("estBody");
  r["gratuit · Estimer : ce que Pro ajoute = la table DROITS, mot pour mot"] = JSON.stringify([...B.querySelectorAll("ul.droits li")].map((x) => x.textContent)) === JSON.stringify(droitsPro().map(maj));
  r["gratuit · Estimer : le montant et les corps d'état, pas le prix d'une tâche ni du « si tu les remplaçais »"] = B.innerText.includes(eur(chantierPrix().total)) && !B.querySelector(".tline") && !/€ si tu les/.test(B.innerText);
  r["gratuit · « Passer Pro » mène à la page Tarifs"] = B.querySelector("a.estimate")?.getAttribute("href") === TARIFS_URL && B.querySelector("a.estimate").target === "_blank";
  r["gratuit · un aperçu honnête : tâches et corps d'état réels"] = new RegExp(chantierTasks().length + " tâche").test(B.innerText);
  closeModal(); setPanelTab("suivi"); const s = document.getElementById("pbody");
  r["gratuit · le Suivi se coche, sans prix, et dit ce que Pro ajoute (DROITS)"] = !s.querySelector(".tpx") && s.innerText.includes(avecPro("suivi")) && !!s.querySelector('a[href="' + TARIFS_URL + '"]');
  setPanelTab("details"); exportPlan(); const x = document.getElementById("exportGallery").innerText;
  r["gratuit · l'export reprend DROITS (gratuit et Pro)"] = x.includes(DROITS.export.gratuit) && x.includes(avecPro("export")) && !!document.querySelector('#exportGallery a[href="' + TARIFS_URL + '"]');
  closeModal(); openPlansModal(); const m = document.getElementById("plansList").innerText;
  r["gratuit · Mes plans reprend DROITS"] = m.includes(DROITS.plans.gratuit) && m.includes(avecPro("plans"));
  closeModal(); return r;
}));
await p.evaluate(() => { setMode("projet"); closeModal(); showEstimate(); }); await noter(p, "gratuit · estimer");
await p.evaluate(() => { closeModal(); loadSample(); setMode("projet"); closeModal(); showEstimate(); }); await noter(p, "gratuit · estimer l'exemple");
await p.evaluate(() => { closeModal(); loadTemplate("maison"); closeModal(); setMode("projet"); closeModal(); L().openings.filter((o) => OPENINGS[o.type].cat === "fenetre").forEach((o) => { o.st = "remplacer"; }); afterChange(); });
await p.evaluate(() => { closeModal(); exportPlan(); }); await noter(p, "gratuit · export");
await p.evaluate(() => { closeModal(); openPlansModal(); }); await noter(p, "gratuit · mes plans");
await p.evaluate(() => { closeModal(); setPanelTab("suivi"); }); await noter(p, "gratuit · suivi");
await p.close();

/* ═════════ 3. Avec ?dev : le développement se montre ═════════ */
p = await onglet("?dev");
await p.evaluate(() => closeWelcome("sample")); await wait(150);
Object.assign(t, await p.evaluate(() => {
  const r = {}; setMode("projet"); closeModal(); sel = null; render();
  r["?dev · l'interrupteur Pro / Gratuit est visible"] = document.getElementById("proChip").getClientRects().length > 0;
  r["?dev · « Envoyer vers mon estimation » est proposé"] = /Envoyer/.test(document.getElementById("pfoot").innerText);
  showEstimate(); r["?dev · le contrat et le JSON sont dans Estimer"] = !!document.querySelector("#estBody pre") && new RegExp(CONTRAT_PLAN.replace(/\./g, "\\.")).test(document.getElementById("estBody").innerText);
  closeModal(); return r;
}));
await p.close();

/* ═════════ 4. Métier : décence, types de murs, pièces, exemple, unités ═════════ */
p = await onglet();
Object.assign(t, await p.evaluate(() => {
  const r = {};
  closeWelcome("blank"); state = blankState(); setTool("select"); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty }; lv.walls.push(x); return x; };
  /* deux petites pièces de vie (< 9 m², < 20 m³) : le logement n'a aucune pièce décente */
  W([0, 0], [5, 0], "mur"); W([5, 0], [5, 3], "mur"); W([5, 3], [0, 3], "mur"); W([0, 3], [0, 0], "mur"); W([2.5, 0], [2.5, 3], "cloison");
  afterChange(); (facesCache[lv.id] || []).forEach((f) => { f.room.type = "chambre"; }); afterChange();
  const c = () => planChecks(L());
  r["décence · une petite chambre n'est plus une alerte « décret »"] = !c().some((x) => /décret|réglementaire/.test(x.msg)) && c().filter((x) => /petite chambre/.test(x.msg)).every((x) => x.lvl === "info");
  r["décence · aucune pièce de vie de 9 m² : alerte au niveau du logement, prudente"] = c().filter((x) => /Aucune pièce de vie/.test(x.msg)).length === 1 && c().some((x) => /à vérifier/.test(x.msg));
  /* une pièce de vie de 9 m² ou plus : plus d'alerte */
  lv.walls.pop(); afterChange(); (facesCache[lv.id] || []).forEach((f) => { f.room.type = "sejour"; }); afterChange();
  r["décence · une pièce de vie de 15 m² : plus d'alerte de logement"] = !c().some((x) => /Aucune pièce de vie/.test(x.msg));
  /* un WC bas de plafond : pas d'alerte de hauteur (ce n'est pas une pièce de vie) */
  const room = (facesCache[lv.id] || [])[0].room; room.type = "wc"; room.height = 2.1; afterChange();
  r["décence · un WC à 2,10 m : pas d'alerte de hauteur"] = !c().some((x) => /sous plafond, c'est bas/.test(x.msg));
  room.type = "garage"; afterChange(); sel = { kind: "room", id: room.id }; renderPanel();
  r["garage · la fiche dit « Surface au sol », pas « habitable »"] = /Surface au sol/.test(document.getElementById("pbody").innerText) && !/Surface habitable/.test(document.getElementById("pbody").innerText);
  r["types de mur · le nom dit l'épaisseur, le matériau en exemple"] = WALL_TYPES.map((x) => x[1]).join(",") === "Cloison,Mur,Mur épais,Séparation";
  sel = null; renderPanel();
  const cp = document.querySelector('#pbody input[aria-label="Code postal du chantier"]');
  r["code postal · l'exemple ne passe pas pour une valeur"] = !!cp && cp.placeholder === "5 chiffres" && cp.classList.contains("cpvide");
  loadSample();
  r["exemple · aucun produit avec un lien d'enseigne ni un prix inventé"] = allProducts().every((x) => !x.url && !x.prix) && !/€/.test(state.notes || "");
  setTool("doublage"); const d = document.getElementById("pbody").innerText;
  r["doublage · épaisseurs en cm, λ et R avec une virgule"] = /Épaisseur d'isolant/.test(d) && !/\(mm\)/.test(d) && /0,032|0,035/.test(d) && /m²·K\/W/.test(d);
  setTool("select");
  return r;
}));
/* une pièce tracée à la souris : type deviné, marqué « ? », à choisir */
{ await p.evaluate(() => { state = blankState(); afterChange(); fitView(); wallType = "mur"; customT = null; wallAlign = "axe"; setTool("mur"); });
  const P = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
  t["tracé · le volet dit que le 1er contour suit l'intérieur des pièces"] = await p.evaluate(() => /suit <b>l'intérieur des pièces<\/b>|suit l'intérieur des pièces/.test(document.getElementById("pbody").innerHTML));
  for (const [x, y] of [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]]) { const q = await P(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(120); }
  Object.assign(t, await p.evaluate(() => {
    const r = {}, f = (facesCache[L().id] || []).find((x) => x.room);
    r["tracé · 4 × 3,5 m cliqués = 14,0 m² à l'intérieur (le mur pousse dehors)"] = !!f && Math.abs(f.areaInt - 14) < 0.05;
    r["tracé · le message le dit, avec « Choisir son type »"] = /à l'intérieur/.test(document.getElementById("toast").textContent) && /Choisir son type/.test(document.getElementById("toast").textContent);
    /* D54 (design 3) : deux lignes au plus — la règle cloison / mur de façade est au panneau, pas dans le message */
    r["tracé · « Pièce fermée » tient en deux lignes, sans répéter la règle du panneau"] = !/cloison|façade|20 cm/.test(document.getElementById("toast").textContent) && document.getElementById("toast").getBoundingClientRect().height <= 64;
    r["pièce tracée · type deviné, marqué"] = f.room.typeAuto === true;
    document.querySelector("#toast .tact").click();
    r["« Choisir son type » ouvre la fiche de la pièce, qui le dit"] = sel && sel.kind === "room" && /deviné d'après la surface/.test(document.getElementById("pbody").innerText);
    setRoomProp("type", "sejour");
    r["type choisi : plus deviné"] = !f.room.typeAuto && !/deviné/.test(document.getElementById("pbody").innerText);
    return r;
  })); }
await p.close();

/* ═════════ 5. La scène de référence (toiture, doublages, salle de bain, ossature…) et les fenêtres fixes ═════════ */
p = await onglet();
for (const [nom, fn] of [["scène", scene], ["variantes", sceneVariantes]]) {
  await p.evaluate(fn);
  for (const vue of ["existant", "projet", "final"]) {
    await p.evaluate((m) => { setMode(m); closeModal(); setTool("select"); sel = null; toitOpen = true; panelTab = "details"; render(); }, vue);
    await noter(p, `${nom} · ${vue} · vue d'ensemble`);
    const ids = await p.evaluate(() => state.levels.flatMap((lv, li) => [...lv.walls.map((w) => [li, "wall", w.id]), ...lv.openings.map((o) => [li, "opening", o.id]), ...lv.items.map((i) => [li, "item", i.id]), ...lv.rooms.filter((r) => (facesCache[lv.id] || []).some((f) => f.room === r)).map((r) => [li, "room", r.id])]));
    for (const [li, kind, id] of ids) { await p.evaluate(([li, kind, id]) => { if (state.cur !== li) { state.cur = li; syncRooms(L()); } sel = { kind, id }; multi = []; msel = []; renderPanel(); }, [li, kind, id]); await noter(p, `${nom} · ${vue} · ${kind}`); }
    await p.evaluate(() => { sel = null; setPanelTab("suivi"); }); await noter(p, `${nom} · ${vue} · suivi`); await p.evaluate(() => setPanelTab("details"));
  }
  await p.evaluate(() => { showEstimate(); }); await noter(p, `${nom} · estimer`);
  await p.evaluate(() => { closeModal(); exportPlan(); }); await noter(p, `${nom} · export`); await p.evaluate(() => closeModal());
}
Object.assign(t, await p.evaluate((fn) => {
  const r = {}; (0, eval)("(" + fn + ")")();
  const gls = () => [...document.querySelectorAll("#pbody .gl")].map((x) => x.dataset.gl);
  state.cur = topLevelIdx(); setMode("existant"); closeModal(); setTool("select"); sel = null; toitOpen = true; renderPanel(); const ex = gls();
  setMode("projet"); closeModal(); sel = null; renderPanel(); const pj = gls();
  r["glossaire · toiture : faîtage, combles, pignon (avant travaux), fermettes (travaux)"] = ["faitage", "combles", "pignon"].every((k) => ex.includes(k)) && pj.includes("fermettes");
  return r;
}, scene.toString()));
for (const m of ["projet", "level", "templates"]) { await p.evaluate((m) => { closeModal(); if (m === "templates") openTemplates(); else openModal(m); }, m); await noter(p, "fenêtre " + m); }
await p.evaluate(() => closeModal());
/* les messages éphémères des gestes courants */
for (const geste of [() => { setMode("existant"); closeModal(); setMode("projet"); }, () => setMode("final"), () => { setMode("projet"); closeModal(); const w = L().walls.find((x) => !isVirtual(x) && !x.st); sel = { kind: "wall", id: w.id }; deleteSel(); }]) {
  await p.evaluate(geste); lus.push(["message", await p.evaluate(() => document.getElementById("toast").textContent)]);
}
await p.close();

/* ═════════ 7. D49 · Le langage du contre-jury : accords, jaune, 100 % honnête, homonymes, glossaire où est l'argent ═════════ */
p = await onglet();
await p.evaluate(() => closeWelcome("sample")); await wait(150);
const ecranPt = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
/* une sélection par zone, à la souris, dans les trois vues : le message dit ce que fera Suppr ICI, avec de vrais accords */
for (const vue of ["existant", "projet", "final"]) {
  await p.evaluate((m) => { setMode(m); closeModal(); clearSel(); setTool("zone"); }, vue);
  const z0 = await ecranPt(-0.5, -0.5), z1 = await ecranPt(4.2, 4.6);
  await p.mouse.move(z0.x, z0.y); await p.mouse.down(); await p.mouse.move(z1.x, z1.y, { steps: 8 }); await p.mouse.up(); await wait(120);
  const msg = await p.evaluate(() => document.getElementById("toast").textContent); lus.push(["message zone " + vue, msg]);
  t[`zone · vue ${vue} : « N éléments sélectionnés », et Suppr ${vue === "projet" ? "marque" : vue === "final" ? "ne fait rien (lecture seule)" : "efface"}`] =
    /^\d+ éléments sélectionnés/.test(msg) && !/\(s\)/.test(msg) && (vue === "projet" ? /marquer à démolir/.test(msg) : vue === "final" ? /lecture seule/.test(msg) && !/Suppr/.test(msg) : /Suppr pour les effacer/.test(msg));
}
await p.evaluate(() => { setMode("existant"); closeModal(); setTool("select"); msel = L().items.slice(0, 2).map((i) => ({ kind: "item", id: i.id })).concat(L().dims.slice(0, 1).map((d) => ({ kind: "dim", id: d.id }))); sel = { kind: "marquee" }; deleteSel(); });
{ const msg = await p.evaluate(() => document.getElementById("toast").textContent); lus.push(["message suppression multiple", msg]); t["suppression multiple · « N éléments supprimés », sans « (s) »"] = /éléments? supprimés?/.test(msg) && !/\(s\)/.test(msg); }
Object.assign(t, await p.evaluate(() => {
  const r = {}; loadSample(); setMode("projet"); closeModal(); setTool("select");
  /* une seule couleur de démolition, celle des plans : jaune */
  const E = LEX.couleur;
  r["couleur · LEX nomme la démolition « jaune » et la création « rouge »"] = E.demolir === "jaune" && E.creer === "rouge" && /en jaune/.test(LEX.vueBulle.projet);
  openModal("projet"); const mp = document.getElementById("m-projet").innerText; closeModal();
  r["couleur · la fenêtre Travaux dit « jaune = on démolit » et « jaune pointillé »"] = /jaune = on démolit/.test(mp) && /jaune pointillé/.test(mp) && !/orange/i.test(mp);
  const w = L().walls.find((x) => !isVirtual(x) && !x.st); sel = { kind: "wall", id: w.id }; deleteSel();
  r["couleur · Suppr sur un mur : « il reste sur le plan, en jaune »"] = /en jaune/.test(document.getElementById("toast").textContent); undo();
  r["couleur · une note n'est plus jaune par défaut (le jaune est celui des démolitions)"] = noteColors({}) !== NOTE_COLORS.jaune && NOTE_DEFAUT !== "jaune";
  /* le porteur : une seule question */
  const m = L().walls.find((x) => !isVirtual(x) && !x.st && wallT(x) >= 0.15); const sv = m.porteur; m.porteur = null; m.st = "demolir"; afterChange(); sel = { kind: "wall", id: m.id }; renderPanel();
  const t1 = document.getElementById("pbody").innerText;
  r["porteur · mur à démolir sans réponse : la question est posée UNE fois"] = (t1.match(/porte-t-il un plancher ou le toit/g) || []).length === 1 && (t1.match(/Je ne sais pas/g) || []).length === 1;
  setWallProp("porteur", "non"); const t2 = document.getElementById("pbody").innerText;
  r["porteur · une fois répondu, la rangée « Porteur ? » revient (pour changer d'avis)"] = /Porteur \?/i.test(t2) && (t2.match(/Je ne sais pas/g) || []).length === 1;
  m.st = undefined; m.porteur = sv; delete m.st; afterChange();
  setMode("existant"); closeModal(); sel = { kind: "wall", id: w.id }; renderPanel();
  r["mur en Avant travaux : « Tu retrouves cette décision en vue Travaux »"] = /Tu retrouves cette décision en vue Travaux/.test(document.getElementById("pbody").innerText);
  /* icônes, pas de glyphes */
  setMode("projet"); closeModal(); const d = L().openings.find((o) => OPENINGS[o.type].kind === "door"); sel = { kind: "opening", id: d.id }; renderPanel();
  const bs = [...document.querySelectorAll("#pbody .btnrow button")].filter((b) => /Charnière|Ouvre de l'autre côté/.test(b.textContent));
  r["porte · « Charnière » et « Ouvre de l'autre côté » ont une icône SVG, sans flèche ↔ ↕"] = bs.length === 2 && bs.every((b) => b.querySelector("svg.ico") && !/[↔↕]/.test(b.textContent));
  /* l'exemple porte le nom de sa surface */
  loadSample(); const q = quantities(), n = +(state.name.match(/(\d+) m²/) || [])[1];
  r["exemple · son nom dit sa surface mesurée (« " + state.name + " » pour " + fmt(q.area, 1) + " m²)"] = Math.abs(n - q.areaBefore) < 1 && Math.abs(n - q.area) < 1;
  r["plans types · chaque nom dit la surface mesurée"] = TEMPLATES.filter((T) => T.build).every((T) => { closeModal(); chargerModele(T, null, null); const a = quantities().area, k = +(T.name.match(/(\d+) m²/) || [])[1]; return Math.abs(k - a) < 1; });
  loadSample(); setMode("projet"); closeModal();
  /* aucune promesse régionale, pas de « 0 € » de produits */
  showEstimate(); const Q = document.querySelector("#estBody details.qdet").textContent;
  r["Estimer · les quantités disent que le code postal sert à l'estimation détaillée, sans « ajusté à ta région »"] = /estimation détaillée/.test(Q) && !/ajusté/.test(Q);
  r["Estimer · des produits sans prix : pas de « Budget produits repérés 0 € »"] = allProducts().every((x) => !x.prix) ? !/Budget produits repérés/.test(Q) && /Prix des produits non renseignés/.test(Q) : true;
  closeModal(); setChantier("cp", "75011"); showEstimate(); const Q2 = document.querySelector("#estBody details.qdet").textContent;
  r["Estimer · code postal saisi : toujours « moyenne nationale », le code postal attend l'estimation détaillée"] = /moyenne nationale/.test(Q2) && /75011/.test(Q2) && /pour l'estimation détaillée/.test(Q2);
  closeModal(); setChantier("cp", "");
  return r;
}));
/* « Encore à décider » : jamais deux lignes identiques (deux fenêtres d'une pièce réunie par une démolition) */
Object.assign(t, await p.evaluate(() => {
  const r = {}; closeModal(); state = blankState(); setTool("select"); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty }; lv.walls.push(x); return x; };
  const h = W([0, 0], [8, 0], "mur"); W([8, 0], [8, 4], "mur"); const bas = W([8, 4], [0, 4], "mur"); W([0, 4], [0, 0], "mur"); const clo = W([4, 0], [4, 4], "cloison");
  const O = (w, t) => lv.openings.push({ id: uid(), wallId: w.id, t, type: "fenetre", w: 1.2, h: 1.25, side: 1, hinge: 1 });
  O(h, 0.25); O(h, 0.75); O(bas, 0.5); lv.openings.push({ id: uid(), wallId: clo.id, t: 0.5, type: "porte", w: 0.83, h: 2.04, side: 1, hinge: 1 });
  afterChange(); (facesCache[lv.id] || []).forEach((f) => { f.room.type = "chambre"; f.room.name = "Chambre"; }); afterChange();
  setMode("projet"); closeModal(); clo.st = "demolir"; afterChange();
  const A = elementsATrancher().filter((a) => a.kind === "opening"), L2 = A.map((a) => a.label);
  r["à décider · trois fenêtres d'une pièce réunie : trois lignes différentes (" + L2.join(" / ") + ")"] = A.length === 3 && new Set(L2).size === 3 && L2.every((x) => /sur le plan\)|sur 3\)/.test(x));
  showEstimate(); const lignes = [...document.querySelectorAll("#estBody .adec b")].map((x) => x.textContent); closeModal();
  r["à décider · Estimer n'affiche jamais deux lignes identiques"] = lignes.length > 0 && new Set(lignes).size === lignes.length;
  /* 100 % seulement quand tout est décidé et le plan sans erreur */
  const E = etapesProjet(), dec = E.find((e) => e.k === "decider");
  r["projet · « Tout décider » lit la liste d'Estimer : pas faite tant qu'il reste un « à décider »"] = !!dec && !dec.fait && pctProjet() < 100 && dec.suite.startsWith("Décide · " + elementsATrancher()[0].label);
  return r;
}));
/* Le glossaire là où est l'argent : Estimer, Suivi, dossier */
await p.evaluate(scene);
Object.assign(t, await p.evaluate(() => {
  const r = {}; setMode("projet"); closeModal(); setTool("select"); sel = null; render();
  const T = chantierTasks(), txt = T.map((x) => x.lot + " " + x.label + " " + (detailTache(x) || "")), attendus = motsDe(txt, new Set(["ht", "corps"]));
  showEstimate(); const pe = [...document.querySelectorAll("#estBody .gl")].map((x) => x.dataset.gl);
  r["glossaire · Estimer : chaque mot du bâtiment des tâches a sa pastille (" + attendus.length + " mots), une seule fois"] = attendus.length >= 6 && attendus.every((k) => pe.includes(k)) && new Set(pe).size === pe.length;
  r["glossaire · Estimer : aucune pastille dans le bouton d'une tâche"] = !document.querySelector("#estBody button .gl");
  closeModal(); setPanelTab("suivi"); const ps = [...document.querySelectorAll("#pbody .gl")].map((x) => x.dataset.gl);
  r["glossaire · Suivi : les mêmes mots, une fois chacun, jamais dans une tâche"] = attendus.every((k) => ps.includes(k)) && new Set(ps).size === ps.length && !document.querySelector("#pbody .task .gl");
  setPanelTab("details"); exportPlan(); const pages = [...document.querySelectorAll("#exportGallery .xpage")], last = pages[pages.length - 1];
  r["glossaire · le dossier finit par « Les mots de ce budget », avec ces mots-là"] = /Les mots de ce budget/.test(last.querySelector("h4").textContent) && attendus.every((k) => last.innerText.includes(GLOSSAIRE[k][0]));
  r["glossaire · entrées ajoutées : appui de fenêtre, vitrification"] = !!GLOSSAIRE.appui && !!GLOSSAIRE.vitrification;
  closeModal(); return r;
}));
/* R6 · recette finale : ce que le parcours au clic a montré */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  const six = Array.from({ length: 6 }, (_, i) => ({ kind: "wall", id: "x" + i, label: "La porte " + i, msg: "déjà là, rien n'est décidé", aide: "Choisis." }));
  r["R6 · « Encore à décider » à 6 éléments : tout s'affiche, jamais « Voir les 1 autres »"] = !/1 autres/.test(aDecHTML(six)) && (aDecHTML(six).match(/class="chk adec"/g) || []).length === 6 && /Voir les 2 autres/.test(aDecHTML([...six, six[0]]));
  r["R6 · les montants s'écrivent avec une espace insécable visible (pas l'espace fine U+202F)"] = eur(6171) === "6\u00a0171 €" && fmtEur(1770.4) === "1\u00a0770 €";
  r["R6 · DROITS.total se lit dans une liste, sans deux-points"] = !/:/.test(DROITS.total.gratuit) && DROITS.total.gratuit === DROITS.total.pro;
  /* la pastille ⓘ suit son mot (elle se posait en bout de phrase, deux ⓘ côte à côte) */
  setMode("projet"); closeModal(); const o = L().openings.find((x) => isExtType(x.type) && OPENINGS[x.type].cat === "fenetre");
  const avant = o.pose; o.pose = "tunnel"; sel = { kind: "opening", id: o.id }; multi = []; renderPanel(); document.querySelectorAll("#pbody details").forEach((d) => (d.open = true));
  const gd = document.querySelector('#pbody .gl[data-gl="dormant"]'), gp = document.querySelector('#pbody .gl[data-gl="pont"]');
  r["R6 · fiche fenêtre : la pastille « dormant » suit le mot Dormant, « pont thermique » suit le sien"] = !!gd && /Dormant\s*$/.test(gd.previousSibling && gd.previousSibling.textContent || "") && !!gp && /pont thermique\s*$/.test(gp.previousSibling && gp.previousSibling.textContent || "");
  o.pose = avant; afterChange();
  return r;
}));
await p.evaluate(() => { setMode("projet"); closeModal(); showEstimate(); }); await noter(p, "D49 · scène · estimer");
await p.evaluate(() => { closeModal(); setPanelTab("suivi"); }); await noter(p, "D49 · scène · suivi");
await p.evaluate(() => { setPanelTab("details"); closeModal(); openModal("level"); }); await noter(p, "D49 · fenêtre niveau");
await p.close();
/* en gratuit : les mots des corps d'état, sous la répartition */
p = await onglet("", 1400, 900, false);
await p.evaluate(() => { closeWelcome("fermer"); loadTemplate("maison"); closeModal(); }); await wait(150);
Object.assign(t, await p.evaluate(() => {
  const r = {}; setMode("projet"); closeModal(); L().openings.forEach((o) => { o.st = "remplacer"; }); L().walls.filter((w) => w.type === "cloison").slice(0, 1).forEach((w) => { w.st = "demolir"; }); afterChange();
  showEstimate(); const B = document.getElementById("estBody"), att = motsDe(chantierPrix().lots.map((g) => g.lot), new Set(["ht", "corps"]));
  r["gratuit · Estimer : les mots des corps d'état ont leur pastille"] = att.every((k) => !!B.querySelector('.gl[data-gl="' + k + '"]'));
  closeModal(); return r;
}));
await p.close();

/* R6 · toiture d'une maison, en vue Avant travaux : décrire n'ajoute aucun travaux (arbitrage tour 2) */
p = await onglet();
await p.evaluate(() => { closeWelcome("fermer"); loadTemplate("maison"); closeModal(); setMode("existant", true); closeModal(); sel = null; renderPanel(); }); await wait(150);
t["R6 · toiture à décrire : « ce que tu décris ne coûte rien », plus « le projet en déduit les travaux »"] = await p.evaluate(() => { const inv = document.getElementById("pbody").innerText; return /Décrire la toiture/.test(inv) && /ne coûte rien/.test(inv) && !/en déduit les travaux/.test(inv); });
await noter(p, "R6 · maison, toiture à décrire");
await p.close();

/* D53 (jury final : retention, novice) · le résumé des travaux compte TOUTES les tâches : sols et peinture seuls,
   c'est « Travaux décidés : … », jamais « Aucun travail marqué » à côté d'un budget ; au bureau et au téléphone */
for (const [larg, haut] of [[1440, 900], [390, 844]]) {
  p = await onglet("", larg, haut);
  if (larg < 600) await p.setViewport({ width: larg, height: haut, isMobile: true, hasTouch: true });
  Object.assign(t, await p.evaluate((tel) => { const r = {}, k = tel ? "téléphone" : "bureau";
    closeWelcome("fermer"); closeModal(); state = blankState(); const lv = L(); lv.height = 2.5;
    [[0, 0, 5, 0], [5, 0, 5, 4], [5, 4, 0, 4], [0, 4, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" })); afterChange();
    const f = facesCache[lv.id][0]; f.room.type = "sejour"; setMode("projet"); closeModal(); setTool("select"); sel = null; render();
    const lire = () => (document.getElementById("resumeTravaux") || {}).innerText || "";
    r["résumé (" + k + ") · rien de décidé : « Aucun travail marqué »"] = chantierPrix().nb === 0 && /Aucun travail marqué/.test(lire());
    f.room.floorNew = "Carrelage"; f.room.peinture = "tout"; afterChange(); sel = null; render();
    const px = chantierPrix(), txt = lire();
    r["résumé (" + k + ") · sols et peinture seuls : « Travaux décidés », le nombre de tâches, les corps d'état et le montant"] = px.nb > 0 && !/Aucun travail/.test(txt) && txt.includes(pluriel(px.nb, "tâche")) && px.lots.every((g) => txt.includes(g.lot)) && txt.includes(eur(px.total));
    return r; }, larg < 600));
  await noter(p, "D53 · résumé des travaux (" + larg + ")");
  await p.close();
}
t["résumé · « Aucun travail » n'est jamais lu quand le compteur a des tâches (" + lus.length + " états)"] = lus.every(([, txt, nb]) => !(nb > 0 && /Aucun travail/.test(txt)));

/* D54 (jury final) · Les mots d'un débutant. Un équipement posé en Travaux s'annonce sans faute d'accord
   (« À poser (travaux) : Douche », plus « Douche ajouté ») ; décrire ne coûte rien, c'est l'utilisateur qui décide
   (plus « les travaux s'en déduiront ») ; la fenêtre Vue Travaux commence par les gestes d'un débutant ; un message
   de vue ne reste pas affiché dans une autre vue. */
p = await onglet();
Object.assign(t, await p.evaluate(() => { const r = {};
  closeWelcome("fermer"); loadTemplate("t3"); closeModal(); setMode("projet"); closeModal();
  const lv = L(), f = facesCache[lv.id].find((x) => x.room && x.room.type === "sdb"), c = f.poly.reduce((s, q) => ({ x: s.x + q.x / f.poly.length, y: s.y + q.y / f.poly.length }), { x: 0, y: 0 });
  setTool("equipement"); const msgs = [];
  for (const ty of ["douche", "baignoire", "chaudiere", "applique", "prise", "wc"]) { itemType = ty; clickAction(v(c.x, c.y)); msgs.push([ty, document.getElementById("toast").textContent]); undo(); }
  r["équipement posé en Travaux · « À poser (travaux) : Douche », jamais « Douche ajouté » (" + msgs.length + " équipements)"] = msgs.every(([ty, m]) => m.startsWith(LEX.etat.poser + " (travaux) : " + ITEMS[ty].label + ".") && !/ajouté/.test(m));
  setTool("select");
  /* le code, commentaires retirés : plus aucune phrase qui dit que le projet « se déduit » de ce qu'on décrit */
  const code = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  r["décrire ne coûte rien · plus « s'en déduiront » ni « s'en déduit » à l'écran"] = !/s'en dédui(ront|t)/.test(code) && (code.match(/Ce que tu décris ne coûte rien : c'est toi qui décides en vue/g) || []).length >= 2;
  openModal("projet"); const st = [...document.querySelectorAll("#m-projet .step")];
  r["fenêtre Vue Travaux · elle commence par « Clique une pièce : sol, peinture, faïence. Clique une fenêtre ou un équipement : je garde, à remplacer »"] = st.length === 4 && st[0].innerText.includes("Clique une pièce : sol, peinture, faïence. Clique une fenêtre ou un équipement : je garde, à remplacer") && [...document.querySelectorAll("#m-projet .step .n")].map((x) => x.textContent).join() === "1,2,3,4";
  closeModal();
  const T = () => document.getElementById("toast");
  setMode("final");
  const vuFinal = T().classList.contains("show") && /lecture seule/.test(T().textContent);
  setMode("existant");
  r["message de vue · « Vue Après travaux : lecture seule » ne reste pas affiché en vue Avant travaux"] = vuFinal && !T().classList.contains("show");
  return r; }));
await noter(p, "D54 · les mots");
await p.close();

/* ═════════ 6. Ce qui s'affiche : aucune tournure interdite ═════════ */
const fautes = [];
for (const [etat, txt] of lus) {
  const propre = txt.replace(/prix catalogue/gi, "");
  for (const [re, pourquoi] of INTERDITS) {
    /* le glossaire nomme la plaque « BA13 » : c'est sa définition, pas du jargon */
    const m = propre.match(re); if (m) fautes.push(`${etat} : ${pourquoi} (« ${m[0]} »)`);
  }
  if (!/gratuit/.test(etat) && AVEC_PRO.test(txt) && !/aide/.test(etat)) fautes.push(`${etat} : un abonné Pro lit une invite à passer Pro (« ${txt.match(AVEC_PRO)[0]} »)`);
}
t[`écran · ${lus.length} états lus, aucune tournure interdite`] = fautes.length === 0;

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (fautes.length) console.log("\n  tournures interdites :\n   · " + [...new Set(fautes)].slice(0, 40).join("\n   · "));
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un seul langage, honnête, avec glossaire");
process.exit(echecs.length || errs.length ? 1 : 0);

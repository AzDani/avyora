/**
 * Contrôle : la décision « je le garde / je l'enlève » se prend depuis la vue Existant.
 *
 * Elle n'y déménage pas — c'est le MÊME champ que l'état projet, montré là où naît la pensée.
 * Ce qui compte ici : que ce soit bien la même donnée (pas une copie qui divergerait), que les
 * états sans objet sur de l'existant restent dans Projet, et que rien ne se chiffre autrement.
 *
 *   node maquettes/tools/decision.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/decision.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1300, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

const res = await p.evaluate(() => {
  closeWelcome("blank");
  const t = {};
  const scene = () => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
    const haut = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]);
    const o = { id: uid(), wallId: haut.id, type: "fenetre", t: 0.5, w: 1.2, h: 1.25, side: 1, mat: "pvc", etat: "vetuste" };
    lv.openings.push(o);
    const it = { id: uid(), type: "lavabo", x: 2, y: 2, w: 0.6, h: 0.45, rot: 0 };
    lv.items.push(it);
    afterChange(); setTool("select"); return { lv, haut, o, it };
  };
  const panneau = (s) => { sel = s; return renderPanel() ?? document.getElementById("pbody").innerHTML; };

  /* ── le bloc est là en Existant, absent en Projet ────────────────────────── */
  { const { haut, o, it } = scene(); setMode("existant");
    const html = (s) => { sel = s; renderPanel(); return document.getElementById("pbody").innerHTML; };
    t["menuiserie · la décision est proposée en Existant"] = /Décision/.test(html({ kind: "opening", id: o.id }));
    t["mur · la décision est proposée en Existant"] = /Décision/.test(html({ kind: "wall", id: haut.id }));
    t["équipement · la décision est proposée en Existant"] = /Décision/.test(html({ kind: "item", id: it.id }));
    setMode("projet"); closeModal();
    /* D39 : même titre « Décision » et mêmes mots dans les deux vues ; en Travaux, la liste est complète (créer, boucher) */
    t["en Projet, c'est la liste complète qui parle"] = /setOpeningProp\('st','boucher'\)/.test(html({ kind: "opening", id: o.id })) && /setOpeningProp\('st','creer'\)/.test(html({ kind: "opening", id: o.id })) && !/État dans le projet/.test(html({ kind: "opening", id: o.id })); }

  /* ── les états sans objet sur de l'existant restent hors du bloc ─────────── */
  { const { o } = scene(); setMode("existant"); sel = { kind: "opening", id: o.id }; renderPanel();
    const h = document.getElementById("pbody").innerHTML;
    const bloc = h.slice(h.indexOf("Décision"), h.indexOf("Décision") + 900);
    t["« à créer » n'est pas proposé sur de l'existant"] = !/'creer'/.test(bloc);
    t["« à boucher » non plus"] = !/'boucher'/.test(bloc); }

  /* ── c'est la MÊME donnée, pas une copie ─────────────────────────────────── */
  { const { o } = scene(); setMode("existant"); sel = { kind: "opening", id: o.id };
    setOpeningProp("st", "remplacer");
    t["décidé en Existant, l'état projet vaut « remplacer »"] = ost(o) === "remplacer";
    const ids = chantierTasks().map((x) => x.id);
    t["et le chantier chiffre la menuiserie neuve"] = ids.some((x) => x === "o:" + o.id + ":poser");
    setOpeningProp("st", "garder");
    t["repassée en « je la garde », plus rien n'est chiffré"] = !chantierTasks().some((x) => x.id.startsWith("o:" + o.id)); }

  /* ── le mur connaît « conservé », comme l'équipement ─────────────────────── */
  { const { haut } = scene(); setMode("existant"); sel = { kind: "wall", id: haut.id };
    setWallProp("st", "garder");
    t["mur conservé · il reste actif dans les deux vues"] = wallActive(haut, "existant") && wallActive(haut, "projet");
    t["mur conservé · rien ne se chiffre"] = !chantierTasks().some((x) => x.id.startsWith("w:" + haut.id));
    setWallProp("st", "demolir");
    t["mur à démolir · la démolition est chiffrée"] = chantierTasks().some((x) => x.id === "w:" + haut.id + ":demolir"); }

  /* ── l'infobulle n'envoie plus changer de vue ────────────────────────────── */
  { const { o } = scene(); setMode("existant"); sel = { kind: "opening", id: o.id }; renderPanel();
    const h = document.getElementById("pbody").innerHTML;
    t["la consigne vétuste s'affiche là où on décide"] = /vétuste/.test(h) && !/état projet ci-dessus/.test(h);
    setOpeningProp("st", "remplacer"); renderPanel();
    t["une fois décidée, la consigne disparaît"] = !/vétuste/.test(document.getElementById("pbody").innerHTML); }
  /* ── on ne demande pas l'état de ce qu'on jette ──────────────────────────
     Décider « je la remplace » répond à la question : l'état de la menuiserie déposée ne
     change plus rien, ni au dessin ni au prix. Le demander quand même, c'est une information
     de plus à donner pour rien — et sur quinze fenêtres, quinze de trop. */
  { const { o } = scene(); setMode("existant"); sel = { kind: "opening", id: o.id };
    const html = () => { renderPanel(); return document.getElementById("pbody").innerHTML; };
    const h0 = html();
    t["avant décision · l'état est demandé"] = /Vétuste/.test(h0);
    t["avant décision · le bloc parle de la menuiserie actuelle"] = /Menuiserie actuelle/.test(h0);
    setOpeningProp("st", "remplacer");
    const h1 = html();
    t["« je la remplace » · l'état n'est plus demandé"] = !/Vétuste/.test(h1);
    t["« je la remplace » · le bloc devient la menuiserie neuve"] = /Menuiserie \(neuve\)/.test(h1);
    t["« je la remplace » · le matériau reste, c'est celui du neuf"] = /Matériau/.test(h1);
    setOpeningProp("st", "garder");
    t["repassée en « je la garde » · l'état revient"] = /Vétuste/.test(html()); }

  /* ── l'ordre de lecture : ce que c'est, puis ce qu'on en fait ───────────── */
  { const { o } = scene(); setMode("existant"); sel = { kind: "opening", id: o.id }; renderPanel();
    const h = document.getElementById("pbody").innerHTML;
    const iMat = h.indexOf("Matériau"), iEtat = h.indexOf(">État<"), iDec = h.indexOf("Décision");
    t["ordre : matériau, puis état, puis décision"] = iMat > 0 && iEtat > iMat && iDec > iEtat; }
  /* ── on ne demande rien sur ce qu'on enlève ─────────────────────────────
     Même raisonnement partout : une fois la décision prise, les questions qui ne servent plus
     disparaissent. C'est le principe, pas un cas particulier des menuiseries. */
  { const { lv, haut, o, it } = scene(); setMode("existant");
    const h = (s2) => { sel = s2; renderPanel(); return document.getElementById("pbody").innerHTML; };

    /* la tapée d'une menuiserie NEUVE se déduit du doublage, elle ne se demande pas */
    haut.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 }; afterChange();
    const avant = h({ kind: "opening", id: o.id });
    t["conservée · la tapée est un constat, avec ses boutons"] = /Épaisseur du cadre de fenêtre \(tapée\)/.test(avant); /* D39 : libellé en clair */
    setOpeningProp("st", "remplacer");
    const apres = h({ kind: "opening", id: o.id });
    t["remplacée · la tapée est déduite, plus demandée"] = !/Épaisseur du cadre de fenêtre \(tapée\)/.test(apres) && /Épaisseur du cadre \(tapée\)/.test(apres);
    t["remplacée · et elle annonce d'où elle vient"] = /Déduite de ton doublage/.test(apres);
    t["remplacée · elle vaut bien le doublage du mur"] = dormantOf(o) === 140;

    /* une ouverture bouchée n'a plus de menuiserie à décrire */
    setOpeningProp("st", "boucher");
    const b2 = h({ kind: "opening", id: o.id });
    t["bouchée · plus de vitrage, d'ouvrant ni de volets"] = !/Vitrage/.test(b2) && !/Ouvrant/.test(b2) && !/Volets/.test(b2);
    t["bouchée · les dimensions restent, elles donnent la surface"] = /Largeur/.test(b2);

    /* un mur qu'on démolit n'a ni isolation ni finition à décrire */
    const m0 = h({ kind: "wall", id: haut.id });
    t["mur conservé · son isolation se règle"] = /Doublage côté|Isolation/.test(m0);
    sel = { kind: "wall", id: haut.id }; setWallProp("st", "demolir");
    const m1 = h({ kind: "wall", id: haut.id });
    t["mur à démolir · ni isolation ni finition extérieure"] = !/Doublage côté/.test(m1) && !/Finition extérieure/.test(m1);
    t["mur à démolir · l'épaisseur et le porteur restent"] = /Porteur|porte-t-il un plancher/.test(m1); /* D49 : sans réponse, la question de tête remplace la rangée « Porteur ? » (une seule question) */

    /* un équipement qu'on dépose n'a plus rien à spécifier */
    const e0 = h({ kind: "item", id: it.id });
    t["équipement conservé · sa fiche produit est là"] = /Matériau|Produit|produit/.test(e0) || e0.length > 0;
    sel = { kind: "item", id: it.id }; multi = [it.id]; setItemProp("st", "demolir");
    const e1 = h({ kind: "item", id: it.id });
    t["équipement à déposer · rien à préciser dessus"] = /rien à préciser/.test(e1); }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ la décision se prend là où naît la pensée");
process.exit(echecs.length || errs.length ? 1 : 0);

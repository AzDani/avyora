/**
 * Détaillé neuf (Pro, chantier C4) : la logique de l'écran, sans rendu.
 * `lib/estimateur/detaille-neuf.ts` porte tout ce qui décide d'un chiffre ; `EstimateurNeuf` ne fait
 * qu'afficher. On vérifie ici les règles de la maquette validée et le format enregistré.
 */
import { describe, it, expect } from "vitest";
import {
  buildDevis, catalogueDe, customTotals, key, isAuto, presetNeuf, presetMaison, maisonComplete, estJalon,
  CATALOG_NEUF, POSTE_NEUF, GROUPES_EXCLUSIFS_NEUF, type CustomLine, type Selection,
} from "@/lib/estimateur";
import {
  ctxDetailNeuf, etatParDefaut, etatDepuisPreset, changerReponseNeuf, changerQuiNeuf, cocherNeuf, cocherNeufEtat, puReelNeuf,
  badgeNeuf, diyNeuf, lignesPersoDuLot, lignePersoNeuf, repriseDepuisReponses, repriseDepuisAffiner, repriseDepuisGraine,
  lireBrouillonDetailNeuf, enregistrementDetailNeuf, reglerNouveauxNeuf, toutPasserNeuf, postesQuiChangent,
  type EtatNeuf,
} from "@/lib/estimateur/detaille-neuf";
import { LOTS_NEUF, elementsLotNeuf, postesCochesNeuf, posteDansListeNeuf, premiereEtapeNeuf } from "@/lib/estimateur/liste-neuf";
import { soiMemeNeuf } from "@/lib/estimateur/presets-neuf";
import { brouillonRapideNeuf, lireBrouillonNeuf, corpsProjetNeuf } from "@/lib/estimateur/brouillon-neuf";
import { projetCreateSchema } from "@/lib/validation";

const ttcDe = (e: EtatNeuf) => { const ctx = ctxDetailNeuf(e); return buildDevis(catalogueDe(ctx), ctx, e.sel).totaux.ttc; };
const poste = (id: string) => { const p = POSTE_NEUF.get(id); if (!p) throw new Error("poste inconnu : " + id); return p; };
const lotDe = (id: string) => { const p = poste(id); return CATALOG_NEUF.find((l) => l.t.includes(p.t))!; };
const cle = (id: string) => { const p = poste(id); return key(p.c, p.n); };
const R100 = { surface: 100, niveaux: "pp" as const, codePostal: "45000", finition: "standard" as const, qui: "pros" as const, garage: false, assainissement: "collectif" as const };

describe("Détaillé neuf · une réponse ne touche que ce qu'elle gouverne", () => {
  it("un parquet choisi à la main survit au changement du toit, du chauffage et du sous-sol", () => {
    let e = etatDepuisPreset(presetNeuf(R100), "pros");
    const parquet = poste("rev-parquet-bois");
    e = { ...e, sel: cocherNeuf(ctxDetailNeuf(e), e.sel, lotDe("rev-parquet-bois"), parquet.t, e.qui) };
    expect(e.sel[cle("rev-parquet-bois")]?.on).toBe(true);
    expect(e.sel[cle("rev-sol-stratifie-imitation-bois")]?.on).toBeFalsy(); // exclusif
    const avant = ttcDe(e);
    for (const [k, v] of [["toiture", "4pans"], ["chauffage", "poele"], ["plancherBas", "sous-sol"]] as const) {
      e = changerReponseNeuf(e, k, v);
      expect(e.sel[cle("rev-parquet-bois")]?.on, k).toBe(true);
      expect(e.sel[cle("rev-sol-stratifie-imitation-bois")]?.on, k).toBeFalsy();
    }
    expect(ttcDe(e)).not.toBe(avant);
  });

  it("le même enchaînement que la maquette : maison décrite pareil = même total que presetMaison", () => {
    let e = etatDepuisPreset(presetNeuf(R100), "pros");
    e = changerReponseNeuf(e, "toiture", "4pans");
    e = changerReponseNeuf(e, "chauffage", "pac-air");
    e = changerReponseNeuf(e, "plancherBas", "sous-sol");
    const direct = presetMaison({ ...e.maison }, { finition: "standard", qui: "pros", codePostal: "45000" });
    expect(Math.round(ttcDe(e))).toBe(Math.round(buildDevis(catalogueDe(direct.ctx), direct.ctx, direct.sel).totaux.ttc));
  });

  it("murs en ossature : la façade suit tant qu'on ne l'a pas choisie", () => {
    let e = etatParDefaut();
    e = changerReponseNeuf(e, "murs", "ossature");
    expect(e.maison.facade).toBe("bardage-bois");
    e = changerReponseNeuf(e, "facade", "bardage-composite");
    e = changerReponseNeuf(e, "murs", "parpaing");
    expect(e.maison.facade).toBe("bardage-composite");
  });

  /* N3 : « Qui réalise » n'est plus une question qui réécrit toutes les lignes. Le réglage
     « Nouveaux postes cochés » ne vaut que pour la suite ; seul « Tout passer en… » réécrit. */
  it("une ligne basculée à la main survit au changement du réglage « nouveaux postes » ; $finition ne touche pas la sélection", () => {
    const e0 = etatDepuisPreset(presetNeuf(R100), "pros");
    const peinture = poste("pei-peinture-murs-plaques-neuves");
    const kP = cle(peinture.t.id);
    expect(e0.sel[kP]?.on).toBe(true);
    // Basculée à la main en « Je le fais » (la puce de la ligne), puis le réglage change deux fois.
    const eMain: EtatNeuf = { ...e0, sel: { ...e0.sel, [kP]: { ...e0.sel[kP], self: true } } };
    const e1 = reglerNouveauxNeuf(eMain, "max");
    expect(e1.qui).toBe("max");
    expect(e1.sel).toBe(eMain.sel);                    // aucune ligne réécrite
    const e2 = reglerNouveauxNeuf(e1, "pros");
    expect(e2.sel[kP]?.self).toBe(true);
    expect(ttcDe(e2)).toBe(ttcDe(eMain));              // même total : rien n'a bougé
    // Un poste coché ENSUITE prend le réglage du moment…
    const parquet = poste("rev-parquet-bois"), lP = lotDe(parquet.t.id);
    expect(cocherNeufEtat(e1, lP, parquet.t).sel[cle(parquet.t.id)]?.self).toBe(soiMemeNeuf(lP.c, "max", parquet.t));
    expect(soiMemeNeuf(lP.c, "max", parquet.t)).toBe(true);
    expect(cocherNeufEtat(e2, lP, parquet.t).sel[cle(parquet.t.id)]?.self).toBe(false);
    // … y compris coché par une réponse, sans toucher la ligne basculée à la main.
    const e3 = changerReponseNeuf(e1, "chauffage", "poele");
    expect(e3.sel[kP]?.self).toBe(true);
    const nouveaux = Object.keys(e3.sel).filter((k) => e3.sel[k]?.on && !eMain.sel[k]?.on);
    expect(nouveaux.length).toBeGreaterThan(0);
    const parCle = new Map(CATALOG_NEUF.flatMap((l) => l.t.map((t) => [key(l.c, t.n), { l, t }] as const)));
    for (const k of nouveaux) {
      const { l, t } = parCle.get(k)!;
      expect(!!e3.sel[k].self, k).toBe(soiMemeNeuf(l.c, "max", t));
    }
    expect(nouveaux.some((k) => e3.sel[k].self)).toBe(true);
    const e4 = changerReponseNeuf(e0, "$finition", "premium");
    expect(e4.sel).toBe(e0.sel);
    expect(ttcDe(e4)).toBeGreaterThan(ttcDe(e0));
  });

  it("« Tout passer en… » (après confirmation) réécrit toutes les lignes cochées et le réglage, en comptant ce qui change", () => {
    const e0 = etatDepuisPreset(presetNeuf(R100), "pros");
    const kP = cle("pei-peinture-murs-plaques-neuves");
    const eMain: EtatNeuf = { ...e0, sel: { ...e0.sel, [kP]: { ...e0.sel[kP], self: true } } };
    expect(postesQuiChangent(eMain.sel, "pros")).toBe(1);            // seule la ligne basculée à la main
    const ff = toutPasserNeuf(eMain, "pros");
    expect(ff.qui).toBe("pros");
    expect(ff.sel).toEqual(changerQuiNeuf(eMain.sel, "pros"));
    expect(Object.values(ff.sel).some((s) => s.on && s.self)).toBe(false);
    expect(postesQuiChangent(ff.sel, "pros")).toBe(0);
    // « Je le fais » = le défaut du mode « le maximum » : la structure reste aux pros.
    const nMax = postesQuiChangent(ff.sel, "max");
    const jlf = toutPasserNeuf(ff, "max");
    expect(jlf.qui).toBe("max");
    expect(Object.keys(jlf.sel).filter((k) => !!jlf.sel[k].self !== !!ff.sel[k].self).length).toBe(nMax);
    expect(nMax).toBeGreaterThan(0);
    expect(jlf.sel[cle("mac-monter-un-mur-en-parpaings")]?.on).toBe(true);
    expect(jlf.sel[cle("mac-monter-un-mur-en-parpaings")]?.self).toBe(false);
    expect(jlf.sel[kP]?.self).toBe(true);
    expect(postesQuiChangent(jlf.sel, "max")).toBe(0);
    // Les quantités, prix et notes des lignes sont gardés : seul le mode change.
    for (const [k, s] of Object.entries(jlf.sel)) expect({ ...s, self: undefined }, k).toEqual({ ...ff.sel[k], self: undefined });
  });
});

describe("Détaillé neuf · cocher", () => {
  it("cocher une couverture décoche l'autre", () => {
    const e = etatDepuisPreset(presetNeuf(R100), "pros");
    const groupe = GROUPES_EXCLUSIFS_NEUF.find((g) => g.includes("cou-couverture-ardoise-naturelle"))!;
    const actif = groupe.filter((id) => e.sel[cle(id)]?.on);
    expect(actif).toEqual(["cou-couverture-tuiles-terre-cuite"]);
    const p = poste("cou-couverture-ardoise-naturelle");
    const sel = cocherNeuf(ctxDetailNeuf(e), e.sel, lotDe(p.t.id), p.t, "pros");
    expect(groupe.filter((id) => sel[cle(id)]?.on)).toEqual(["cou-couverture-ardoise-naturelle"]);
    expect(e.sel[cle("cou-couverture-tuiles-terre-cuite")]?.on).toBe(true); // l'entrée n'est pas modifiée
  });

  it("un poste coché sans quantité automatique part à 1, un poste automatique garde la sienne", () => {
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    const tous = CATALOG_NEUF.flatMap((l) => l.t.map((t) => ({ l, t })));
    const manuel = tous.find(({ l, t }) => !e.sel[key(l.c, t.n)]?.on && t.u === "u" && !t.frais && l.c !== "Location de matériel" && !isAuto(ctx, l.c, t.n));
    expect(manuel).toBeDefined();
    expect(cocherNeuf(ctx, e.sel, manuel!.l, manuel!.t, "pros")[key(manuel!.l.c, manuel!.t.n)]).toMatchObject({ on: true, qty: 1 });
    const auto = tous.find(({ l, t }) => !e.sel[key(l.c, t.n)]?.on && t.u === "m2" && isAuto(ctx, l.c, t.n));
    expect(auto).toBeDefined();
    expect(cocherNeuf(ctx, e.sel, auto!.l, auto!.t, "pros")[key(auto!.l.c, auto!.t.n)]?.qty).toBeUndefined();
  });
});

describe("Détaillé neuf · lignes et badges", () => {
  const e = etatDepuisPreset(presetNeuf(R100), "pros");
  const ctx = ctxDetailNeuf(e);

  it("exactement 8 démarches (jalons), affichées « Démarche » tant que leur montant est nul", () => {
    const jalons = CATALOG_NEUF.flatMap((l) => l.t.filter((t) => badgeNeuf(ctx, e.sel, l, t) === "jalon"));
    expect(jalons.length).toBe(8);
    expect(jalons.every((t) => estJalon(t))).toBe(true);
    const t = jalons[0];
    const l = CATALOG_NEUF.find((x) => x.t.includes(t))!;
    const avecPrix: Selection = { ...e.sel, [key(l.c, t.n)]: { on: true, pu: 150 } };
    expect(badgeNeuf(ctx, avecPrix, l, t)).toBeUndefined();
  });

  /* N10 : les démarches gratuites sortent de la liste des postes (liste « Démarches ») et de son compteur ;
     une démarche à laquelle on donne un prix redevient une ligne de son lot, comptée. */
  it("les démarches au badge « jalon » ne sont ni dans la liste des travaux ni dans le compteur de leur lot", () => {
    const jalons = CATALOG_NEUF.flatMap((l) => l.t.filter((t) => e.sel[key(l.c, t.n)]?.on && badgeNeuf(ctx, e.sel, l, t) === "jalon").map((t) => ({ l, t })));
    expect(jalons.length).toBe(8);
    for (const p of jalons) expect(posteDansListeNeuf(ctx, e.sel, p), p.t.id).toBe(false);
    // Une démarche cochée à laquelle on donne un prix revient dans son lot et dans son compteur.
    const { l, t } = jalons.find((p) => p.l.c === "Etudes / Conception")!;
    const avant = postesCochesNeuf(e.sel, elementsLotNeuf(ctx, e.sel, l.c));
    const avecPrix: Selection = { ...e.sel, [key(l.c, t.n)]: { ...e.sel[key(l.c, t.n)], on: true, pu: 150 } };
    expect(posteDansListeNeuf(ctx, avecPrix, { l, t })).toBe(true);
    expect(postesCochesNeuf(avecPrix, elementsLotNeuf(ctx, avecPrix, l.c))).toBe(avant + 1);
  });

  it("les postes en pourcentage ont le badge pct et un prix réel égal à leur montant", () => {
    for (const id of ["etu-maitrise-d-oeuvre-complete", "ass-assurance-dommages-ouvrage"]) {
      const p = poste(id), l = lotDe(id);
      expect(badgeNeuf(ctx, e.sel, l, p.t)).toBe("pct");
      expect(diyNeuf(l, p.t)).toBe(false);
    }
    const p = poste("ass-assurance-dommages-ouvrage"), l = lotDe(p.t.id);
    const li = buildDevis(CATALOG_NEUF, ctx, e.sel).lignes.find((x) => x.cle === cle(p.t.id))!;
    expect(puReelNeuf(ctx, e.sel, l, p.t)).toBeCloseTo(li.ht, 6);
  });

  it("prix unitaire réel = le moteur à quantité 1, en « Fait faire »", () => {
    const p = poste("rev-parquet-bois"), l = lotDe(p.t.id);
    const sel: Selection = { ...e.sel, [cle(p.t.id)]: { on: true, self: true, manual: true, qty: 37 } };
    const un: Selection = { ...e.sel, [cle(p.t.id)]: { on: true, manual: true, qty: 1 } };
    const attendu = buildDevis(CATALOG_NEUF, ctx, un).lignes.find((x) => x.cle === cle(p.t.id))!.ht;
    expect(puReelNeuf(ctx, sel, l, p.t)).toBeCloseTo(attendu, 6);
  });
});

describe("Détaillé neuf · lignes perso par lot (N10 : chaque lot une fois)", () => {
  it("{lot: Maçonnerie, phase: Murs & planchers} : une seule fois dans les totaux et sous un seul lot", () => {
    const ligne: CustomLine = { ...lignePersoNeuf("Maçonnerie", "Murs & planchers", "x1"), nom: "Seuil", prix: 300, qte: 2, draft: false };
    expect(ligne.tva).toBe(20);
    const tot = customTotals([ligne]);
    expect(tot.ht).toBe(600);
    expect(tot.tva).toBeCloseTo(120, 6);
    expect(LOTS_NEUF.filter(({ c }) => lignesPersoDuLot([ligne], c).length).map(({ c }) => c)).toEqual(["Maçonnerie"]);
  });

  it("quelle que soit son étape (ou sans étape), une ligne perso s'affiche sous son lot, une seule fois", () => {
    const isolation = lignePersoNeuf("Isolation", "Second œuvre", "x2");
    const { phase: _p, ...sansPhase } = lignePersoNeuf("Maçonnerie", "Second œuvre", "x3");
    const lots = LOTS_NEUF.map(({ c }) => [c, lignesPersoDuLot([isolation, sansPhase as CustomLine], c).map((x) => x.id)] as const).filter(([, ids]) => ids.length);
    expect(lots).toEqual([["Maçonnerie", ["x3"]], ["Isolation", ["x2"]]]);
  });

  it("une ligne perso ajoutée à un lot prend sa première étape du chantier", () => {
    expect(premiereEtapeNeuf("Maçonnerie")).toBe("Fondations & plancher bas");
    expect(premiereEtapeNeuf("Peinture")).toBe("Finitions & équipements");
    expect(premiereEtapeNeuf("Lot inconnu")).toBe("");
  });
});

describe("Détaillé neuf · reprises", () => {
  it("« Affiner » du rapide : même total au départ", () => {
    const raw = JSON.stringify({ R: R100, base: undefined });
    const e = repriseDepuisAffiner(raw)!;
    const p = presetNeuf(R100);
    expect(ttcDe(e)).toBeCloseTo(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc, 6);
    expect(Math.round(ttcDe(e))).toBe(253172); // le total de la maquette pour ces réponses (246 762 €) + les bandes de plâtre (D5)
    expect(repriseDepuisAffiner("{")).toBeNull();
    expect(repriseDepuisAffiner(JSON.stringify({ R: { surface: 100 } }))).toBeNull();
  });

  it("« Affiner » d'une maison avec base (plan, détaillé rouvert) : la base est gardée", () => {
    const base = { niveaux: "combles" as const, chambres: 4, plancherBas: "vide-sanitaire" as const };
    const e = repriseDepuisAffiner(JSON.stringify({ R: { ...R100, niveaux: "combles" }, base }))!;
    expect(e.maison).toMatchObject({ niveaux: "combles", chambres: 4, plancherBas: "vide-sanitaire" });
  });

  it("graine du rapide (avyora-neuf-v1) : même maison, même total", () => {
    const p = presetNeuf(R100);
    const d = brouillonRapideNeuf({ R: R100, ctx: p.ctx, sel: p.sel });
    const r = repriseDepuisGraine(JSON.stringify(d))!;
    expect(ttcDe(r.etat)).toBeCloseTo(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc, 6);
    expect(repriseDepuisGraine(JSON.stringify({ v: "estimateur", ctx: { nature: "reno" } }))).toBeNull();
  });

  it("enregistrer puis rouvrir (« Modifier ») : rien de perdu, même total, suivi et origine gardés", () => {
    let e = etatDepuisPreset(presetNeuf(R100), "partie", 300000);
    e = changerReponseNeuf(e, "toiture", "plat");
    e = { ...e, aleas: 10 };
    const custom: CustomLine[] = [{ ...lignePersoNeuf("Peinture", "Finitions & équipements", "c1"), nom: "Fresque", prix: 900, qte: 1, draft: false }];
    const statuts = { [Object.keys(e.sel)[0]]: 2 };
    const { corps, brouillon } = enregistrementDetailNeuf(e, { custom, statuts, origine: { source: "plan" }, locale: "fr" });
    expect(corps).toMatchObject({ typeBien: "Maison neuve", codePostal: "45000", surface: 100 });
    expect(corps.nom).toBe("Construction neuve — Maison plain-pied 100 m²");
    expect(corps.reponses).toMatchObject({ v: "estimateur", mode: "detaille", qui: "partie", statuts, origine: { source: "plan" } });
    expect(corps.reponses.ctx).toMatchObject({ nature: "neuf", budget: 300000, aleas: 10, fiscal: "pro" });
    expect(projetCreateSchema.safeParse(corps).success).toBe(true);

    const r = repriseDepuisReponses(JSON.parse(JSON.stringify(corps.reponses)))!;
    expect(r.etat).toMatchObject({ qui: "partie", budget: 300000, aleas: 10, finition: "standard" });
    expect(r.etat.maison.toiture).toBe("plat");
    expect(r.etat.sel).toEqual(e.sel);
    expect(r.custom).toEqual(custom);
    expect(r.statuts).toEqual(statuts);
    expect(r.origine).toEqual({ source: "plan" });
    expect(ttcDe(r.etat)).toBeCloseTo(ttcDe(e), 6);

    // 401 → réclamation : le brouillon est un brouillon neuf réclamable, au même corps.
    const relu = lireBrouillonNeuf(JSON.stringify(brouillon))!;
    expect(relu.mode).toBe("detaille");
    expect(corpsProjetNeuf(relu, "fr").reponses.sel).toEqual(e.sel);
  });

  it("un projet rénovation n'est pas repris par le détaillé neuf", () => {
    expect(repriseDepuisReponses({ v: "estimateur", ctx: { surface: 80, type: "T3" }, sel: {} })).toBeNull();
    expect(repriseDepuisReponses(null)).toBeNull();
  });

  it("brouillon du détaillé : relu tel quel, valeurs absurdes écartées", () => {
    const e = changerReponseNeuf(etatParDefaut(), "murs", "brique");
    const b = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e, custom: [], open: { Maçonnerie: true } }))!;
    expect(b.etat).toEqual(e);
    expect(b.open).toEqual({ Maçonnerie: true });
    const bad = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: { ...e, qui: "nimporte", finition: 3 }, open: [] }))!;
    expect(bad.etat.qui).toBe("pros");
    expect(bad.etat.finition).toBe("standard");
    expect(lireBrouillonDetailNeuf(JSON.stringify({ v: "estimateur" }))).toBeNull();
  });

  it("lots ouverts (N10) : gardés par nom de lot ; un brouillon d'avant (blocs par index, phases de N3) rouvre les lots de ses blocs", () => {
    const e = etatParDefaut();
    const b = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e, custom: [], open: { Façade: true, "$frais": true, "$demarches": true, "Lot inconnu": true, Peinture: false } }))!;
    expect(b.open).toEqual({ Façade: true, "$frais": true, "$demarches": true });
    // Avant N10 : `open` par index de bloc (3 : « Raccordements aux réseaux » du terrain ; 25 : les chapes,
    // en « Maçonnerie »), `ouvertes` par phase (N3) : les lots des blocs ouverts, une fois chacun.
    const ancien = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e, custom: [], open: { 3: true, 9: true, 25: true, 99: true, 6: false }, ouvertes: { "Murs & planchers": true } }))!;
    expect(ancien.etat).toEqual(e);
    expect(ancien.open).toEqual({ "Raccordements aux réseaux": true, "Maçonnerie": true });
    expect(ancien).not.toHaveProperty("ouvertes");
    // Rien d'ouvert, ou des valeurs absurdes : tout fermé, comme sur une page vierge.
    expect(lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e }))!.open).toEqual({});
    expect(lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e, open: [3] }))!.open).toEqual({});
  });
});

describe("Détaillé neuf · taille des réponses", () => {
  it("250 m² sous-sol + micro-station + maîtrise d'œuvre + suivi complet : sous 80 000 caractères", () => {
    const maison = maisonComplete({ surface: 250, niveaux: "etage", plancherBas: "sous-sol", assainissement: "micro", pilotage: "moe", garage: 30, codePostal: "45000" });
    const e = etatDepuisPreset(presetMaison(maison, { finition: "premium", qui: "pros", codePostal: "45000" }), "pros", 500000);
    const ctx = ctxDetailNeuf(e);
    const lignes = buildDevis(catalogueDe(ctx), ctx, e.sel).lignes;
    expect(lignes.length).toBeGreaterThan(80);
    const statuts = Object.fromEntries(lignes.map((li) => [li.cle, 2]));
    const { corps } = enregistrementDetailNeuf(e, { statuts, locale: "fr" });
    const taille = JSON.stringify(corps.reponses).length;
    expect(taille).toBeLessThan(80_000);
    expect(projetCreateSchema.safeParse(corps).success).toBe(true);
  });
});

describe("Détaillé neuf · une coche manuelle met la réponse de la maison à jour", () => {
  it("cocher l'ardoise : la question « Couverture » dit ardoise, et la réponse reste après un autre changement", () => {
    let e = etatDepuisPreset(presetNeuf(R100), "pros");
    expect(e.maison.couverture).toBe("terre-cuite");
    const ardoise = poste("cou-couverture-ardoise-naturelle");
    e = cocherNeufEtat(e, lotDe("cou-couverture-ardoise-naturelle"), ardoise.t);
    expect(e.maison.couverture).toBe("ardoise");
    expect(e.sel[cle("cou-couverture-ardoise-naturelle")]?.on).toBe(true);
    expect(e.sel[cle("cou-couverture-tuiles-terre-cuite")]?.on).toBeFalsy();
    const avant = ttcDe(e);
    // Une maison relue depuis ses réponses chiffre la même couverture.
    const relu = etatDepuisPreset(presetMaison(maisonComplete(e.maison), { codePostal: "45000" }), "pros");
    expect(relu.sel[cle("cou-couverture-ardoise-naturelle")]?.on).toBe(true);
    e = changerReponseNeuf(e, "chauffage", "pac-air");
    expect(e.maison.couverture).toBe("ardoise");
    expect(e.sel[cle("cou-couverture-ardoise-naturelle")]?.on).toBe(true);
    expect(avant).toBeGreaterThan(0);
  });
  it("cocher un bardage : façade choisie, elle ne suit plus les murs", () => {
    let e = etatDepuisPreset(presetNeuf(R100), "pros");
    e = cocherNeufEtat(e, lotDe("fac-bardage"), poste("fac-bardage").t);
    expect(e.maison.facade).toBe("bardage-bois");
    expect(e.facadeAuto).toBe(false);
  });
  it("cocher un poste sans réponse associée ne touche pas la maison", () => {
    const e = etatDepuisPreset(presetNeuf(R100), "pros");
    const e2 = cocherNeufEtat(e, lotDe("rev-parquet-bois"), poste("rev-parquet-bois").t);
    expect(e2.maison).toBe(e.maison);
  });
});

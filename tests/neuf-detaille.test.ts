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
  BLOCS_NEUF, ctxDetailNeuf, etatParDefaut, etatDepuisPreset, changerReponseNeuf, changerQuiNeuf, cocherNeuf, puReelNeuf,
  badgeNeuf, diyNeuf, lignesPersoDuBloc, lignePersoNeuf, repriseDepuisReponses, repriseDepuisAffiner, repriseDepuisGraine,
  lireBrouillonDetailNeuf, enregistrementDetailNeuf, type EtatNeuf,
} from "@/lib/estimateur/detaille-neuf";
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

  it("$qui réécrit « Je le fais » des postes cochés ; $finition ne touche pas la sélection", () => {
    const e0 = etatDepuisPreset(presetNeuf(R100), "pros");
    const e1 = changerReponseNeuf(e0, "$qui", "partie");
    expect(e1.qui).toBe("partie");
    expect(Object.values(e1.sel).some((s) => s.on && s.self)).toBe(true);
    expect(changerQuiNeuf(e1.sel, "pros")).toEqual(changerReponseNeuf(e1, "$qui", "pros").sel);
    expect(Object.values(changerQuiNeuf(e1.sel, "pros")).some((s) => s.on && s.self)).toBe(false);
    const e2 = changerReponseNeuf(e0, "$finition", "premium");
    expect(e2.sel).toBe(e0.sel);
    expect(ttcDe(e2)).toBeGreaterThan(ttcDe(e0));
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

describe("Détaillé neuf · lignes perso par phase", () => {
  it("{lot: Maçonnerie, phase: Murs & planchers} : une seule fois dans les totaux et sous un seul bloc", () => {
    const ligne: CustomLine = { ...lignePersoNeuf("Maçonnerie", "Murs & planchers", "x1"), nom: "Seuil", prix: 300, qte: 2, draft: false };
    expect(ligne.tva).toBe(20);
    const tot = customTotals([ligne]);
    expect(tot.ht).toBe(600);
    expect(tot.tva).toBeCloseTo(120, 6);
    const blocs = BLOCS_NEUF.filter((b) => lignesPersoDuBloc([ligne], b).length);
    expect(blocs.map((b) => [b.l.p, b.l.c])).toEqual([["Murs & planchers", "Maçonnerie"]]);
  });

  it("lot présent deux fois dans la même phase : la ligne va sous le PREMIER bloc", () => {
    const ligne = lignePersoNeuf("Isolation", "Second œuvre", "x2");
    const blocs = BLOCS_NEUF.filter((b) => b.l.c === "Isolation" && b.l.p === "Second œuvre");
    expect(blocs.length).toBe(2);
    expect(lignesPersoDuBloc([ligne], blocs[0])).toHaveLength(1);
    expect(lignesPersoDuBloc([ligne], blocs[1])).toHaveLength(0);
  });

  it("une ligne sans phase s'affiche sous le premier bloc de son lot", () => {
    const { phase: _p, ...sansPhase } = lignePersoNeuf("Maçonnerie", "Second œuvre", "x3");
    const blocs = BLOCS_NEUF.filter((b) => lignesPersoDuBloc([sansPhase as CustomLine], b).length);
    expect(blocs.map((b) => b.l.p)).toEqual(["Fondations & plancher bas"]);
  });
});

describe("Détaillé neuf · reprises", () => {
  it("« Affiner » du rapide : même total au départ", () => {
    const raw = JSON.stringify({ R: R100, base: undefined });
    const e = repriseDepuisAffiner(raw)!;
    const p = presetNeuf(R100);
    expect(ttcDe(e)).toBeCloseTo(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc, 6);
    expect(Math.round(ttcDe(e))).toBe(246762); // le total de la maquette pour ces réponses
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
    const b = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: e, custom: [], open: { 3: true } }))!;
    expect(b.etat).toEqual(e);
    expect(b.open).toEqual({ 3: true });
    const bad = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: { ...e, qui: "nimporte", finition: 3 }, open: [] }))!;
    expect(bad.etat.qui).toBe("pros");
    expect(bad.etat.finition).toBe("standard");
    expect(lireBrouillonDetailNeuf(JSON.stringify({ v: "estimateur" }))).toBeNull();
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

/**
 * Détaillé de la rénovation, logique pure (`lib/estimateur/detaille-reno.ts`, chantier N6) : ce que
 * l'écran faisait sur place, sorti en fonctions et testé sans rendu, sur le modèle du neuf.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { dictDetail } from "@/lib/i18n/detail";
import { CATALOG, defaultCtx, autoQty, key, type Ctx, type Lot, type Tache } from "@/lib/estimateur";
import {
  etatVierge, etatDepuis, projetReno, ouvertureDetailReno, majNombre, majSol, majType, pasCtx, compteurPiece, pasPiece,
  choisirPerimetre, basculerEspace, ajouterExemplaire, retirerExemplaire, surfaceExemplaire, majZone, basculerDressing, recapReno,
  majLigne, cocherReno, basculerAuto, ligneQuantite, lignePrix, ligneMateriaux, manqueReno, nomProjetReno, corpsProjetReno,
} from "@/lib/estimateur/detaille-reno";

const lot = (c: string): Lot => CATALOG.find((l) => l.c === c)!;
const tache = (c: string, n: string): Tache => lot(c).t.find((t) => t.n === n)!;
const base = (): Ctx => defaultCtx();

describe("État et reprises", () => {
  it("page vierge : le bien par défaut, rien coché", () => {
    expect(etatVierge()).toEqual({ ctx: defaultCtx(), sel: {}, open: {}, codePostal: "", custom: [] });
  });

  it("un projet rouvert : seulement des réponses `v: estimateur` ; les champs absents prennent la page vierge", () => {
    expect(projetReno({ v: "neuf-detail" })).toBeNull();
    expect(projetReno(null)).toBeNull();
    const p = projetReno({ v: "estimateur", ctx: { surface: 120 }, codePostal: "45000", statuts: { a: 1 } });
    expect(p?.statuts).toEqual({ a: 1 });
    const e = etatDepuis(p)!;
    expect(e.ctx).toEqual({ ...defaultCtx(), surface: 120 });
    expect(e).toMatchObject({ sel: {}, open: {}, codePostal: "45000", custom: [] });
  });

  it("?new=1 : page vierge, brouillon effacé ; « Affiner » : les infos du bien du rapide, aucun poste", () => {
    const graine = JSON.stringify({ v: "estimateur", mode: "rapide", ctx: { surface: 95, type: "T4" }, sel: { "a|b": { on: true } }, codePostal: "69001" });
    const brouillon = JSON.stringify({ v: "estimateur", ctx: { surface: 50 }, sel: { "x|y": { on: true } }, open: { Plomberie: true }, codePostal: "33000" });
    expect(ouvertureDetailReno({ nouveau: true, affiner: false, graine, brouillon })).toEqual({ effacer: true, etat: null });
    const a = ouvertureDetailReno({ nouveau: false, affiner: true, graine, brouillon });
    expect(a.effacer).toBe(true);
    expect(a.etat).toEqual({ ...etatVierge(), ctx: { ...defaultCtx(), surface: 95, type: "T4" }, codePostal: "69001" });
    expect(ouvertureDetailReno({ nouveau: true, affiner: true, graine: null, brouillon })).toEqual({ effacer: true, etat: null });
    expect(ouvertureDetailReno({ nouveau: false, affiner: true, graine: "{illisible", brouillon })).toEqual({ effacer: true, etat: null });
  });

  it("rechargement : le brouillon du détaillé ; sans brouillon (ou illisible), page vierge", () => {
    const brouillon = JSON.stringify({ v: "estimateur", ctx: { surface: 50 }, sel: { "x|y": { on: true } }, open: { Plomberie: true }, codePostal: "33000" });
    const o = ouvertureDetailReno({ nouveau: false, affiner: false, graine: null, brouillon });
    expect(o.effacer).toBe(false);
    expect(o.etat).toEqual({ ctx: { ...defaultCtx(), surface: 50 }, sel: { "x|y": { on: true } }, open: { Plomberie: true }, codePostal: "33000", custom: [] });
    expect(ouvertureDetailReno({ nouveau: false, affiner: false, graine: null, brouillon: null })).toEqual({ effacer: false, etat: null });
    expect(ouvertureDetailReno({ nouveau: false, affiner: false, graine: null, brouillon: "{x" })).toEqual({ effacer: false, etat: null });
  });
});

describe("Questionnaire", () => {
  it("la surface au sol suit la surface et les niveaux, jusqu'à ce qu'on la saisisse", () => {
    let c = majNombre(base(), "surface", "120");
    expect(c.surfaceSol).toBe(120);
    c = majNombre(c, "niveaux", "2");
    expect(c.surfaceSol).toBe(60);
    c = majSol(c, "70");
    expect(c).toMatchObject({ surfaceSol: 70, surfaceSolManual: true });
    expect(majNombre(c, "surface", "200").surfaceSol).toBe(70);
    expect(majNombre(base(), "hauteur", "abc").hauteur).toBe(0);
  });

  it("type de bien : pièces et menuiseries d'un bien de ce type", () => {
    expect(majType(base(), "T3")).toMatchObject({ type: "T3", pieces: 6, fenetres: 7 });
    expect(majType(base(), "Studio")).toMatchObject({ type: "Studio", pieces: 2, fenetres: 3 });
  });

  it("compteurs : bornés au minimum ; un compteur de pièces matérialise tout le détail", () => {
    expect(pasCtx(base(), "niveaux", -1, 1).niveaux).toBe(1);
    expect(pasCtx(base(), "wc", 1, 0).wc).toBe(2);
    const ancien = { ...base(), sejour: undefined, cuisine: undefined, chambres: undefined, suites: undefined, couloir: undefined, buanderie: undefined } as Ctx;
    expect(compteurPiece(ancien, "chambres")).toBe(3);
    expect(pasPiece(ancien, "suites", 1, 0)).toMatchObject({ sejour: 1, cuisine: 1, chambres: 3, suites: 1, couloir: 1, buanderie: 0 });
    expect(pasPiece(base(), "buanderie", -1, 0).buanderie).toBe(0);
  });

  it("périmètre : une chambre par défaut, au moins une pièce gardée, retour au logement entier", () => {
    const p = choisirPerimetre(base(), "piece");
    expect(p).toMatchObject({ perimetre: "piece", type: "Maison", espaces: { chambre: [12] }, surface: 12, chambres: 1, surfaceSolManual: true });
    expect(basculerEspace(p, "chambre")).toBe(p);
    const deux = basculerEspace(p, "sdb");
    expect(deux.espaces).toEqual({ chambre: [12], sdb: [6] });
    expect(deux).toMatchObject({ surface: 18, sdb: 1, chambres: 1 });
    expect(choisirPerimetre(deux, "entier")).toMatchObject({ perimetre: "entier", espace: undefined, espaces: undefined });
    // Repasser en « pièces » reprend les pièces choisies.
    expect(choisirPerimetre({ ...deux, perimetre: "entier" }, "piece").espaces).toEqual({ chambre: [12], sdb: [6] });
  });

  it("exemplaires : ajout, surface arrondie (1 m² au moins), retrait ; la dernière pièce garde un exemplaire", () => {
    let c = choisirPerimetre(base(), "piece");
    c = ajouterExemplaire(c, "chambre");
    expect(c.espaces).toEqual({ chambre: [12, 12] });
    expect(c.chambres).toBe(2);
    c = surfaceExemplaire(c, "chambre", 1, 9.6);
    expect(c.espaces).toEqual({ chambre: [12, 10] });
    expect(surfaceExemplaire(c, "chambre", 0, 0).espaces).toEqual({ chambre: [1, 10] });
    c = retirerExemplaire(c, "chambre", 0);
    expect(c.espaces).toEqual({ chambre: [10] });
    expect(retirerExemplaire(c, "chambre", 0).espaces).toEqual({ chambre: [12] });
    expect(ajouterExemplaire(c, "inconnu")).toBe(c);
  });

  it("suite parentale seule : ses zones ; surface = chambre + SDB (+ dressing), SDB de 2 m² au moins", () => {
    const p = choisirPerimetre(base(), "piece");
    let s = basculerEspace(basculerEspace(p, "suite"), "chambre");
    expect(s).toMatchObject({ espace: "suite", espaces: undefined, surface: 20, zChambre: 14, zSdb: 6, avecDressing: false });
    s = basculerDressing(s);
    expect(s.surface).toBe(25);
    s = majZone(s, "zChambre", 1);
    expect(s).toMatchObject({ zChambre: 15, surface: 26, surfaceSol: 26, surfaceSolManual: true });
    expect(majZone({ ...s, zSdb: 2 }, "zSdb", -1).zSdb).toBe(2);
  });

  it("récapitulatif : emprise, murs et toiture estimés, étage, pièces et salles de bain effectives", () => {
    const r = recapReno({ ...base(), surface: 120, surfaceSol: 60, niveaux: 2, suites: 1 });
    expect(r).toMatchObject({ appart: false, piece: false, suite: false, emprise: 60, toiture: 84, etage: 60, pieces: 7, sdb: 2 });
    expect(r.facade).toBe(Math.round(4 * Math.sqrt(60) * 2.5 * 2 * 1.25));
    const p = recapReno(ajouterExemplaire(choisirPerimetre(base(), "piece"), "chambre"));
    expect(p).toMatchObject({ piece: true, espacesSurface: 24, espaces: [{ k: "chambre", surfaces: [12, 12] }] });
  });
});

describe("Sélection poste par poste", () => {
  const ctx = base();
  it("cocher : 1 sans quantité automatique (menuiserie, location), la quantité calculée sinon ; décocher garde la quantité", () => {
    const fen = cocherReno(ctx, {}, lot("Menuiseries exterieures"), tache("Menuiseries exterieures", "Fenêtres"));
    expect(fen[key("Menuiseries exterieures", "Fenêtres")]).toEqual({ on: true, qty: 1 });
    const loc = cocherReno(ctx, {}, lot("Location de matériel"), tache("Location de matériel", "Bétonnière"));
    expect(loc[key("Location de matériel", "Bétonnière")]).toEqual({ on: true, qty: 1 });
    const chape = cocherReno(ctx, {}, lot("Maçonnerie"), tache("Maçonnerie", "Chape traditionnelle"));
    expect(chape[key("Maçonnerie", "Chape traditionnelle")]).toEqual({ on: true });
    const off = cocherReno(ctx, fen, lot("Menuiseries exterieures"), tache("Menuiseries exterieures", "Fenêtres"));
    expect(off[key("Menuiseries exterieures", "Fenêtres")]).toEqual({ on: false, qty: 1 });
  });

  it("auto / manuel : passée en manuel, la ligne part de la quantité calculée", () => {
    const l = lot("Maçonnerie"), t = tache("Maçonnerie", "Chape traditionnelle");
    const sel = { [key(l.c, t.n)]: { on: true } };
    const m = basculerAuto(ctx, sel, l, t)[key(l.c, t.n)];
    expect(m).toEqual({ on: true, manual: true, qty: autoQty(ctx, l.c, t.n, sel) });
    expect(basculerAuto(ctx, { [key(l.c, t.n)]: m }, l, t)[key(l.c, t.n)].manual).toBe(false);
  });

  it("réglages d'une ligne : quantité (épingle une quantité auto, le plan cesse de l'alimenter), prix perso, prix matériaux", () => {
    const l = lot("Maçonnerie"), t = tache("Maçonnerie", "Chape traditionnelle");
    expect(ligneQuantite(ctx, l, t, 30)({ on: true, plan: true })).toEqual({ on: true, qty: 30, manual: true, plan: undefined });
    const f = lot("Menuiseries exterieures"), fen = tache("Menuiseries exterieures", "Fenêtres");
    expect(ligneQuantite(ctx, f, fen, 4)({ on: true })).toEqual({ on: true, qty: 4, manual: undefined, plan: undefined });
    expect(lignePrix(61)({ on: true })).toEqual({ on: true, pu: 61 });
    expect(lignePrix(null)({ on: true, pu: 61 })).toEqual({ on: true });
    expect(ligneMateriaux(20)({ on: true, pu: 61 })).toEqual({ on: true, pm: 20 });
    expect(ligneMateriaux(null)({ on: true, pm: 20 })).toEqual({ on: true });
    expect(majLigne({}, "A", "b", (s) => ({ ...s, note: "x" }))).toEqual({ "A|b": { note: "x" } });
  });
});

describe("Enregistrement", () => {
  it("il faut un code postal à 5 chiffres, puis une surface", () => {
    expect(manqueReno(base(), "")).toBe("cp");
    expect(manqueReno(base(), "4500")).toBe("cp");
    expect(manqueReno({ ...base(), surface: 0 }, "45000")).toBe("surface");
    expect(manqueReno(base(), "45000")).toBeNull();
  });

  it("nom du projet : type et surface, ou les pièces ciblées ; 110 caractères au plus ; mots de la langue", () => {
    expect(nomProjetReno({ ...base(), type: "T3", surface: 65 })).toBe("Rénovation — T3 65 m²");
    const p = surfaceExemplaire(ajouterExemplaire(basculerEspace(choisirPerimetre(base(), "piece"), "sdb"), "chambre"), "chambre", 1, 10);
    expect(nomProjetReno(p)).toBe("Rénovation — 2 Chambre + Salle de bain · 28 m²");
    const en = { projet: "Renovation", type: (t: string) => (t === "Maison" ? "House" : t), espace: (n: string) => ({ Chambre: "Bedroom", "Salle de bain": "Bathroom" } as Record<string, string>)[n] ?? n };
    expect(nomProjetReno(p, en)).toBe("Renovation — 2 Bedroom + Bathroom · 28 m²");
    expect(nomProjetReno({ ...base(), surface: 80 }, en)).toBe("Renovation — House 80 m²");
    const long = { ...base(), perimetre: "piece" as const, espaces: { chambre: Array(40).fill(12), sdb: [6, 6], cuisine: [12], sejour: [30], combles: [40], autre: [20], suite: [20] } };
    expect(nomProjetReno(long).length).toBe(110);
  });

  it("corps du POST / PATCH : réponses complètes, suivi de chantier gardé", () => {
    const ctx = { ...base(), codePostal: "45000" };
    const c = corpsProjetReno({ nom: "N", ctx, sel: {}, codePostal: "45000", custom: [], statuts: { "a|b": 2 } });
    expect(c).toEqual({
      nom: "N", typeBien: "Maison", surface: 80, codePostal: "45000",
      reponses: { v: "estimateur", mode: "detaille", ctx, sel: {}, codePostal: "45000", custom: [], statuts: { "a|b": 2 } },
    });
    expect("statuts" in corpsProjetReno({ nom: "N", ctx, sel: {}, codePostal: "45000", custom: [] }).reponses).toBe(false);
  });
});

describe("Textes du détaillé (`dictDetail`)", () => {
  const cles = (o: unknown, p = ""): string[] => (!o || typeof o !== "object" ? [p]
    : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (typeof v === "function" ? [p + k] : cles(v, p + k + "."))));
  const lire = (f: string) => fs.readFileSync(f, "utf8");

  it("FR et EN ont les mêmes clés (hors tables de traduction des données, vides en français)", () => {
    const sansTables = (l: string[]) => l.filter((k) => !/^(bien\.espaces|perso\.unites)\./.test(k) && k !== "bien.espaces." && k !== "perso.unites.");
    expect(sansTables(cles(dictDetail("en"))).sort()).toEqual(sansTables(cles(dictDetail("fr"))).sort());
  });

  it("hors du dictionnaire global (chargé sur chaque page) ; le rapide de la rénovation ne l'embarque pas", () => {
    expect(lire("lib/i18n/dictionaries.ts")).not.toMatch(/i18n\/detail|from "\.\/detail/);
    expect(lire("components/i18n/LangProvider.tsx")).not.toMatch(/detail/);
    expect(lire("components/EstimateurRapide.tsx")).not.toMatch(/i18n\/detail|estimateur\/(partage|Row|intake|ListeLots|BarreLive|VueDevis)/);
    expect(lire("components/Stepper.tsx")).not.toMatch(/i18n\/detail/);
  });

  it("tutoiement : aucun « vous » dans les textes français", () => {
    const tout = JSON.stringify(dictDetail("fr")) + Object.values(dictDetail("fr").devis).filter((v) => typeof v === "function").map((f) => String(f)).join(" ");
    expect(tout).not.toMatch(/\b(vous|votre|vos|Renseignez|Indiquez|Retournez|Demandez|Désactivez|Réessayez)\b/);
  });

  it("le nom du projet en anglais : type et pièces traduits, la nature aussi", () => {
    const B = dictDetail("en").bien;
    const mots = { projet: dictDetail("en").projet, type: (t: string) => B.types[t] ?? t, espace: (n: string) => B.espaces[n] ?? n };
    expect(nomProjetReno({ ...base(), type: "T3", surface: 65 }, mots)).toBe("Renovation — 2-bedroom 65 m²");
    expect(nomProjetReno(ajouterExemplaire(choisirPerimetre(base(), "piece"), "chambre"), mots)).toBe("Renovation — 2 Bedroom · 24 m²");
  });
});

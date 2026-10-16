/**
 * Construction neuve, chantier C7 : le lien « Plan final → estimation de la construction ».
 *
 * Contre de VRAIS contrats Plan final produits par l'éditeur (`maquettes/tools/fixture-contrat.mjs
 * --final`) : la maison 94 m² de plain-pied et sa variante à étage (garage, suite, escalier béton).
 * Les cas qu'aucun plan type ne couvre (combles, suite cloisonnée, WC dans la salle de bain…) sont
 * dérivés de ces contrats, pas inventés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildDevis, catalogueDe, presetMaison, presetNeuf, maisonComplete, geometrieNeuf, quantitesNeuf, piecesNeuf, sdbEff } from "@/lib/estimateur";
import {
  planNeufSchema, decoderFragmentPlan, encoderFragmentPlan, extraitPlanNeuf, maisonDepuisPlan, lirePlanNeuf,
  trancheSurface, FRAGMENT_PLAN_MAX, type PlanNeuf, type MaisonDuPlan,
} from "@/lib/estimateur/plan-neuf";
import { contributionsDuPlan } from "@/lib/estimateur/plan-correspondance";
import { contexteNeuf } from "@/lib/neuf-contexte";
import { SOURCES_SEO } from "@/lib/seo-source";

const lire = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "fixtures", f), "utf8"));
const MAISON94 = lire("plan-final-contrat.json");
const ETAGE = lire("plan-final-etage-contrat.json");
const RENO = lire("plan-contrat.json");
const copie = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** L'extrait du contrat, validé, comme la page le reçoit. */
function plan(c: Record<string, unknown>): PlanNeuf {
  const r = planNeufSchema.safeParse(extraitPlanNeuf(c));
  if (!r.success) throw new Error(JSON.stringify(r.error.issues.slice(0, 3)));
  return r.data;
}
function maison(c: Record<string, unknown>): MaisonDuPlan {
  const r = maisonDepuisPlan(plan(c));
  if (r.refus) throw new Error("refus " + r.refus);
  return r;
}
const ttc = (m: MaisonDuPlan) => {
  const { ctx, sel } = presetMaison(m.maison, { codePostal: "45000" });
  return buildDevis(catalogueDe(ctx), ctx, sel).totaux.ttc;
};

describe("C7 · fixtures Plan final réelles", () => {
  it("sont des Plans finals 1.18, la maison 94 m² et la maison à étage", () => {
    expect(MAISON94.workflow).toBe("final_plan");
    expect(MAISON94.contrat).toBe("1.18.0");
    expect(MAISON94.detailNiveaux).toHaveLength(1);
    expect(ETAGE.workflow).toBe("final_plan");
    expect(ETAGE.detailNiveaux).toHaveLength(2);
  });

  it("le contrat ENTIER passe aussi le schéma (les clés en trop sont retirées)", () => {
    const r = planNeufSchema.safeParse(MAISON94);
    expect(r.success).toBe(true);
    expect(JSON.stringify(r.success && r.data)).not.toContain("Maison de 94");
  });

  it("l'extrait pèse quelques Ko et ne contient ni nom ni note", () => {
    const f = encoderFragmentPlan(extraitPlanNeuf(MAISON94));
    expect(f.length).toBeLessThan(4000);
    const d = JSON.stringify(decoderFragmentPlan(f));
    expect(d).not.toContain("Maison de 94");
    expect(d).not.toMatch(/"(nom|note|annotations|produits)"/);
  });
});

describe("C7 · maisonDepuisPlan", () => {
  /* N8 (adapté volontairement) : le plan donne les huit compteurs de la rénovation, zéros compris, une
     suite reste une suite (avant : fondue dans les chambres et les salles de bain), les menuiseries
     dessinées et l'emprise mesurée du rez-de-chaussée, garage retiré. */
  it("Maison 94 → plain-pied rectangle 94 m², séjour, cuisine, 3 chambres, 1 SDB, 1 WC, buanderie, 8 menuiseries ; le moteur la chiffre", () => {
    const m = maison(MAISON94);
    expect(m.maison).toEqual({
      surface: 94, niveaux: "pp", forme: "rect", garage: 0,
      sejour: 1, cuisines: 1, chambres: 3, suites: 0, sdb: 1, wc: 1, couloir: 0, buanderie: 1, menuiseries: 8, emprise: 104.1,
    });
    expect(m.repris).toEqual(["surface", "niveaux", "forme", "garage", "sejour", "cuisines", "chambres", "suites", "sdb", "wc", "couloir", "buanderie", "menuiseries", "emprise"]);
    expect(m.finition).toBe("standard");
    expect(m.avertissements).toEqual([]);
    expect(m.contrat).toBe("1.18.0");
    expect(ttc(m)).toBeGreaterThan(100_000);
  });

  it("maison à étage : étage, forme en L, garage 34 m², la suite reste une suite (chambre + SDB), WC de la suite compté, escalier béton", () => {
    const m = maison(ETAGE);
    expect(m.maison).toEqual({
      surface: 185, niveaux: "etage", forme: "L", garage: 34,
      sejour: 1, cuisines: 1, chambres: 4, suites: 1, sdb: 1, wc: 2, couloir: 1, buanderie: 1, menuiseries: 8,
      emprise: 104.1, escalier: "beton",
    });
    expect(m.repris).toContain("escalier");
    expect(ttc(m)).toBeGreaterThan(ttc(maison(MAISON94)));
  });

  it("suite sans sa douche (douche dessinée ailleurs) : une chambre, la SDB comptée là où elle est", () => {
    const c = copie(ETAGE);
    const et = c.detailNiveaux[1];
    const suite = et.rooms.find((r: { type: string }) => r.type === "suite").id;
    const palier = et.rooms.find((r: { type: string }) => r.type === "palier");
    palier.type = "sde";
    for (const e of et.equipements) if (e.piece === suite && e.type === "douche") e.piece = palier.id;
    const m = maison(c);
    expect(m.maison.chambres).toBe(5);  // la suite reste une chambre
    expect(m.maison.sdb).toBe(2);       // sdb du RDC + salle d'eau du palier, pas de salle de bain fantôme
  });

  it("WC dans la salle de bain : compté en plus du WC séparé", () => {
    const c = copie(MAISON94);
    const n = c.detailNiveaux[0];
    const sdb = n.rooms.find((r: { type: string }) => r.type === "sdb").id;
    n.equipements.push({ ...n.equipements.find((e: { type: string }) => e.type === "wc"), piece: sdb });
    expect(maison(c).maison.wc).toBe(2);
  });

  it("étage sous pente → combles aménagés", () => {
    const c = copie(ETAGE);
    for (const r of c.detailNiveaux[1].rooms) r.sousPentePct = 20;
    expect(maison(c).maison.niveaux).toBe("combles");
  });

  it("un niveau haut fait seulement de combles perdus reste un plain-pied", () => {
    const c = copie(ETAGE);
    for (const r of c.detailNiveaux[1].rooms) { r.type = "combles"; r.horsHabitable = true; }
    c.detailNiveaux[1].equipements = [];
    const m = maison(c);
    expect(m.maison.niveaux).toBe("pp");
    expect(m.maison.escalier).toBeUndefined();   // l'escalier n'est repris que pour une maison à niveaux
  });

  it("garage : la somme des aires `garage`, arrondie ; forme selon emprise / rectangle", () => {
    expect(maison(ETAGE).maison.garage).toBe(Math.round(33.64));
    const c = copie(MAISON94);
    c.bien.emprise = 60; c.bien.empriseRectangle = 104.1;
    expect(maison(c).maison.forme).toBe("complexe");
    c.bien.emprise = 80;
    expect(maison(c).maison.forme).toBe("L");
  });

  it("code postal repris s'il est valide, ignoré sinon", () => {
    const c = copie(MAISON94);
    c.contexte.codePostal = "33000";
    expect(maison(c).maison.codePostal).toBe("33000");
    expect(maison(c).repris).toContain("codePostal");
    c.contexte.codePostal = "3300";
    expect(maison(c).maison.codePostal).toBeUndefined();
  });

  it("avertissements en CLÉS : cave, terrasse non chiffrée, moins de 30 m², trois niveaux", () => {
    const c = copie(ETAGE);
    c.detailNiveaux[0].rooms.find((r: { type: string }) => r.type === "garage").type = "cave";
    c.detailNiveaux[1].rooms.push({ id: "px", type: "exterieur", area: 8, horsHabitable: true, exterieur: true, sousPentePct: 0 });
    c.detailNiveaux.push({ ...copie(c.detailNiveaux[1]), id: "n3" });
    expect(maison(c).avertissements).toEqual(["cave", "nonChiffre", "troisNiveaux"]);
    const p = copie(MAISON94);
    p.area = 24;
    const m = maison(p);
    expect(m.avertissements).toEqual(["petiteSurface"]);
    expect(m.maison.surface).toBe(30);
  });

  it("au-delà de 400 m², la surface est ramenée à 400 (bornes du rapide), avec un avertissement", () => {
    const c = copie(MAISON94);
    c.area = 612.4;
    const m = maison(c);
    expect(m.maison.surface).toBe(400);
    expect(m.avertissements).toEqual(["grandeSurface"]);
    c.area = 400.4;
    expect(maison(c).maison.surface).toBe(400);
    expect(maison(c).avertissements).toEqual([]);
    expect(contexteNeuf({ surface: "400" }).surface).toBe(400);
    expect(contexteNeuf({ surface: "401" }).surface).toBeUndefined();
  });

  it("un plan sans salle de bain ni WC : avertissement, et la maison chiffrée en compte un de chaque", () => {
    const c = copie(MAISON94);
    for (const n of c.detailNiveaux) {
      n.rooms = n.rooms.filter((r: { type: string }) => !["sdb", "sde", "wc", "suite"].includes(r.type));
      n.equipements = [];
    }
    const m = maison(c);
    expect(m.maison.sdb).toBe(0);
    expect(m.maison.suites).toBe(0);
    expect(m.maison.wc).toBe(0);
    expect(m.avertissements).toContain("sanitaires");
    const h = maisonComplete(m.maison);
    expect(h.sdb).toBe(1);
    expect(h.wc).toBe(1);
    expect(maison(MAISON94).avertissements).not.toContain("sanitaires");
    expect(maison(ETAGE).avertissements).not.toContain("sanitaires");
  });

  it("N8 · une suite garde sa suite jusqu'au chiffrage : 5 chambres et 2 salles de bain comptées, comme avant", () => {
    const m = maisonComplete(maison(ETAGE).maison);
    expect([m.chambres, m.suites, m.sdb]).toEqual([4, 1, 1]);
    const { ctx } = presetMaison(m, { codePostal: "45000" });
    expect([ctx.chambres, ctx.suites, ctx.sdb]).toEqual([4, 1, 1]);
    expect(sdbEff(ctx)).toBe(2);
    expect(piecesNeuf(m)).toMatchObject({ chambres: 5, sdb: 2 });
    const q = quantitesNeuf(m);
    expect(q["rev-faience-carrelage-mural"]).toBe(24);          // 12 m² par salle de bain, celle de la suite comprise
    expect(q["cha-seche-serviette"]).toBe(2);
  });

  it("N8 · menuiseries : les fenêtres, portes-fenêtres et baies dessinées, ni la porte d'entrée ni celle du garage ; aucune → déduites", () => {
    expect(maison(MAISON94).maison.menuiseries).toBe(8);
    const c = copie(MAISON94);
    c.detailNiveaux[0].menuiseries.push({ type: "fenetre", l: 1, h: 1.2 }, { type: "porte_entree", l: 1, h: 2.15 }, { type: "garage", l: 2.4, h: 2 });
    expect(maison(c).maison.menuiseries).toBe(9);
    const g = geometrieNeuf(maisonComplete(maison(c).maison));
    expect(g.nFen + g.nPF + g.nBaie).toBe(9);
    const sans = copie(MAISON94);
    sans.detailNiveaux[0].menuiseries = [];
    expect(maison(sans).maison.menuiseries).toBeUndefined();
    expect(maison(sans).repris).not.toContain("menuiseries");
  });

  it("N8 · emprise : celle du rez-de-chaussée, garage retiré (1,1 × son aire) ; oubliée si la maison change", () => {
    expect(maison(MAISON94).maison.emprise).toBe(104.1);
    expect(maison(ETAGE).maison.emprise).toBe(Math.round((141.1 - 1.1 * 33.64) * 10) / 10);
    expect(geometrieNeuf(maisonComplete(maison(MAISON94).maison)).E).toBe(104.1);
    // Une autre surface dans le rapide : l'emprise du plan ne vaut plus, elle se déduit de la surface.
    const base = maison(MAISON94).maison;
    const autre = presetNeuf({ surface: 140, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" }, base);
    expect(autre.ctx.neuf?.emprise).toBeUndefined();
    const meme = presetNeuf({ surface: 94, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" }, base);
    expect(meme.ctx.neuf?.emprise).toBe(104.1);
  });

  it("N8 · finition du plan reprise (clé de l'extrait), une valeur inconnue refusée par le schéma", () => {
    const c = copie(MAISON94);
    c.contexte.finition = "premium";
    expect(maison(c).finition).toBe("premium");
    expect((extraitPlanNeuf(c) as { contexte: { finition: string } }).contexte.finition).toBe("premium");
    c.contexte.finition = "luxe";
    expect(planNeufSchema.safeParse(extraitPlanNeuf(c)).success).toBe(false);
    delete c.contexte.finition;
    expect(maison(c).finition).toBeUndefined();
  });

  it("les défauts non décrits par le plan (murs, toiture, chauffage) restent ceux du moteur", () => {
    const m = maison(MAISON94);
    const h = maisonComplete(m.maison);
    expect(h.murs).toBe("parpaing");
    expect(h.toiture).toBe("2pans");
    expect(h.chauffage).toBe("pac-eau");
    expect(Object.keys(m.maison)).not.toContain("murs");
  });
});

describe("C7 · refus", () => {
  const frag = (c: Record<string, unknown>) => encoderFragmentPlan(extraitPlanNeuf(c));

  it("la fixture de rénovation est refusée (une rénovation n'est pas une construction)", () => {
    expect(lirePlanNeuf(frag(RENO)).refus).toBe("renovation");
    expect(planNeufSchema.safeParse(extraitPlanNeuf(RENO)).success).toBe(false);
  });

  it("un appartement est refusé", () => {
    const c = copie(MAISON94); c.contexte.typeBien = "appartement";
    expect(lirePlanNeuf(frag(c)).refus).toBe("appartement");
  });

  it("un contrat 1.17.0 est refusé (version), avec ou sans `workflow`", () => {
    const c = copie(MAISON94); c.contrat = "1.17.0";
    expect(lirePlanNeuf(frag(c)).refus).toBe("version");
    delete c.workflow;
    expect(lirePlanNeuf(frag(c)).refus).toBe("version");
    expect(planNeufSchema.safeParse(extraitPlanNeuf(c)).success).toBe(false);
  });

  it("un fragment trafiqué ou vide est illisible", () => {
    expect(lirePlanNeuf("").refus).toBe("illisible");
    expect(lirePlanNeuf("abc$def").refus).toBe("illisible");
    expect(lirePlanNeuf(encoderFragmentPlan([1, 2])).refus).toBe("illisible");
    expect(lirePlanNeuf(frag(MAISON94).slice(0, 500)).refus).toBe("illisible");
  });

  it("le chemin complet rend la maison 94 m²", () => {
    const r = lirePlanNeuf(frag(MAISON94));
    expect(r.refus).toBeUndefined();
    expect(!r.refus && r.maison.surface).toBe(94);
  });
});

describe("C7 · planNeufSchema", () => {
  const base = () => extraitPlanNeuf(copie(MAISON94)) as { detailNiveaux: { rooms: Record<string, unknown>[]; equipements: unknown[] }[]; area: number };

  it("rejette un type de pièce inconnu", () => {
    const e = base(); e.detailNiveaux[0].rooms[0].type = "piscine";
    expect(planNeufSchema.safeParse(e).success).toBe(false);
  });

  it("rejette une aire de 1e9 m²", () => {
    const e = base(); e.area = 1e9;
    expect(planNeufSchema.safeParse(e).success).toBe(false);
    const f = base(); f.detailNiveaux[0].rooms[0].area = 1e9;
    expect(planNeufSchema.safeParse(f).success).toBe(false);
  });

  it("rejette 301 équipements", () => {
    const e = base();
    e.detailNiveaux[0].equipements = Array.from({ length: 301 }, () => ({ type: "wc", piece: null }));
    expect(planNeufSchema.safeParse(e).success).toBe(false);
  });

  it("retire une clé `nom` injectée (et toute clé inconnue)", () => {
    const e = { ...base(), nom: "<script>alert(1)</script>", plan: { nom: "Chez Dupont" } } as Record<string, unknown>;
    (e.detailNiveaux as { rooms: Record<string, unknown>[] }[])[0].rooms[0].nom = "Chambre de Léa";
    const r = planNeufSchema.safeParse(e);
    expect(r.success).toBe(true);
    const s = JSON.stringify(r.success && r.data);
    expect(s).not.toContain("script");
    expect(s).not.toContain("Dupont");
    expect(s).not.toContain("Léa");
  });
});

describe("C7 · fragment", () => {
  it("aller-retour encodage puis décodage, UTF-8 accentué compris", () => {
    const v = { a: "Séjour à l'étage — « été » 🏠", n: [1, 2.5, null], b: true };
    const f = encoderFragmentPlan(v);
    expect(f).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decoderFragmentPlan(f)).toEqual(v);
  });

  it("borne la longueur AVANT de décoder : 30 000 caractères → null", () => {
    expect(decoderFragmentPlan("A".repeat(30_000))).toBeNull();
    expect(FRAGMENT_PLAN_MAX).toBe(24_000);
  });

  it("refuse l'alphabet base64 standard, les espaces et l'UTF-8 invalide", () => {
    expect(decoderFragmentPlan("ab+/cd")).toBeNull();
    expect(decoderFragmentPlan("ab cd")).toBeNull();
    expect(decoderFragmentPlan(btoa(String.fromCharCode(0xff, 0xfe, 0x22)).replace(/=+$/, ""))).toBeNull();
    expect(decoderFragmentPlan(encoderFragmentPlan("x").slice(0, -1) + "_")).toBeNull();
  });

  it("tranche de surface pour la mesure (jamais la valeur exacte)", () => {
    expect([50, 94, 130, 185, 260].map(trancheSurface)).toEqual(["<80", "80-119", "120-159", "160-199", "200+"]);
  });
});

describe("C7 · source « plan » et rénovation intacte", () => {
  it("?source=editeur-plan devient src « plan » ; ?src=plan aussi ; une autre source est ignorée", () => {
    expect(SOURCES_SEO).toContain("plan");
    expect(contexteNeuf({ source: "editeur-plan" }).src).toBe("plan");
    expect(contexteNeuf({ src: "plan" }).src).toBe("plan");
    expect(contexteNeuf({ source: "autre" }).src).toBeUndefined();
    expect(contexteNeuf({ src: "guide", source: "editeur-plan" }).src).toBe("guide");
  });

  it("contributionsDuPlan d'un Plan final reste vide (la rénovation ne lit pas ce chemin)", () => {
    expect(contributionsDuPlan(MAISON94)).toEqual({ contributions: [], ignores: [] });
    expect(contributionsDuPlan(ETAGE)).toEqual({ contributions: [], ignores: [] });
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CATALOG, CATALOG_NEUF, PHASES_NEUF, IDS_NEUF, POSTE_NEUF, catalogueDe, LOT_FIN, ICON, key, buildDevis, effRate, defaultCtx,
  presetNeuf, presetMaison, appliquerMaison, decisionsNeuf, quantitesNeuf, maisonComplete, geometrieNeuf, estimationProjet,
  ANOMALIES_NEUF, GROUPES_EXCLUSIFS_NEUF, cocherPosteNeuf, surfaceTaxable, autoQty, ctxNeuf,
  type MaisonNeuve, type Selection,
} from "@/lib/estimateur";

const lire = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const brut = JSON.parse(lire("lib/estimateur/catalog-neuf.json")) as Array<{ c: string; p: string; t: Array<{ ref?: string; id?: string }> }>;

/* Des maisons qui parcourent toutes les réponses du questionnaire. */
const VARIANTES: Array<Partial<MaisonNeuve>> = [
  {},
  { surface: 120, niveaux: "etage", chambres: 4, sdb: 2, wc: 2, garage: 20 },
  { surface: 90, murs: "ossature" },
  { surface: 160, niveaux: "combles", forme: "L", toiture: "4pans", couverture: "ardoise", plancherBas: "vide-sanitaire", murs: "brique" },
  { surface: 140, niveaux: "etage", plancherBas: "sous-sol", murs: "monomur", toiture: "plat", chauffage: "pac-air", vmc: "double", escalier: "beton" },
  { surface: 110, forme: "complexe", murs: "cellulaire", couverture: "bac-acier", facade: "bardage-composite", chauffage: "poele", assainissement: "micro",
    eauxPluviales: "reseau", terrain: "pente", argile: "fort", viabilise: false, distanceReseaux: 60, pilotage: "moe", cuisine: false },
  { surface: 95, couverture: "zinc", assainissement: "fosse", argile: "moyen", codePostal: "92100" },
  // réponses limites
  { surface: 100, murs: "ossature", toiture: "plat", garage: 30 },
  { surface: 130, niveaux: "combles", toiture: "plat" },
  { surface: 30, chambres: 0, sdb: 0, wc: 0, distanceReseaux: 0, chauffage: "poele" },
  { surface: 400, niveaux: "etage", chambres: 10, sdb: 6, wc: 6, garage: 60, plancherBas: "sous-sol", terrain: "pente", sismique: 5, lotissement: true, borne: false },
];

describe("Neuf · le catalogue", () => {
  it("aucune anomalie de chargement (une anomalie n'arrête pas la rénovation, c'est ce test qui bloque)", () => {
    expect(ANOMALIES_NEUF).toEqual([]);
  });

  it("se charge : chaque poste repris existe au catalogue rénovation, dans un lot du même nom", () => {
    expect(CATALOG_NEUF.length).toBe(brut.length);
    const reno = new Map(CATALOG.flatMap((l) => l.t.map((t) => [t.id, l.c] as const)));
    for (const l of brut) for (const x of l.t) if (x.ref) expect(reno.get(x.ref), x.ref).toBe(l.c);
  });

  it("ne recopie jamais un poste de la rénovation : un poste repris est le MÊME objet, donc le même prix", () => {
    const reno = new Map(CATALOG.flatMap((l) => l.t.map((t) => [t.id, t] as const)));
    for (const l of CATALOG_NEUF) for (const t of l.t) if (reno.has(t.id)) expect(t).toBe(reno.get(t.id));
  });

  it("identifiants des postes du neuf : bien formés, uniques, distincts de ceux de la rénovation", () => {
    const reno = new Set(CATALOG.flatMap((l) => l.t.map((t) => t.id)));
    expect(IDS_NEUF.every((i) => /^[a-z]{3}-[a-z0-9-]+$/.test(i))).toBe(true);
    expect(new Set(IDS_NEUF).size).toBe(IDS_NEUF.length);
    expect(IDS_NEUF.filter((i) => reno.has(i))).toEqual([]);
  });

  it("la liste des identifiants du neuf est figée — la modifier doit faire échouer le build", () => {
    expect(IDS_NEUF).toEqual(lire("tests/postes-ids-neuf.txt").trim().split("\n"));
  });

  it("une clé (lot, poste) n'apparaît qu'une fois, même quand un lot revient dans plusieurs phases", () => {
    const cles = CATALOG_NEUF.flatMap((l) => l.t.map((t) => key(l.c, t.n)));
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque lot a son groupe de finition et son icône (sinon le béton suivrait le barème du carrelage)", () => {
    for (const l of CATALOG_NEUF) { expect(LOT_FIN[l.c], l.c).toBeDefined(); expect(ICON[l.c], l.c).toBeDefined(); }
  });

  it("les phases suivent l'ordre du chantier, du permis à l'achèvement", () => {
    expect(PHASES_NEUF[0]).toMatch(/permis/i);
    expect(PHASES_NEUF[PHASES_NEUF.length - 1]).toMatch(/achèvement/i);
    // une phase n'est jamais interrompue par une autre
    const ordre = CATALOG_NEUF.map((l) => l.p).filter((p, i, a) => i === 0 || a[i - 1] !== p);
    expect(ordre).toEqual(PHASES_NEUF);
  });

  it("les frais (taxes, assurance, démarches) ne sont pas faisables soi-même", () => {
    for (const l of CATALOG_NEUF) for (const t of l.t) if (t.frais) expect(t.sm, t.n).toBeNull();
  });
});

describe("Neuf · les règles ne citent que des postes réels", () => {
  it("quantités et décisions, pour toutes les variantes de maison", () => {
    const inconnus = new Set<string>();
    for (const v of VARIANTES) {
      const h = maisonComplete(v);
      for (const id of [...Object.keys(quantitesNeuf(h)), ...Object.keys(decisionsNeuf(h))]) if (!POSTE_NEUF.has(id)) inconnus.add(id);
    }
    expect([...inconnus]).toEqual([]);
  });

  it("tout poste coché par la description a une quantité (ou se compte au forfait / en pourcentage)", () => {
    for (const v of VARIANTES) {
      const { ctx, sel } = presetMaison(v);
      const dv = buildDevis(catalogueDe(ctx), ctx, sel);
      for (const l of catalogueDe(ctx)) for (const t of l.t) {
        const s = sel[key(l.c, t.n)];
        if (!s?.on || t.u === "forfait" || t.u === "pct") continue;
        const li = dv.lignes.find((x) => x.cle === key(l.c, t.n))!;
        expect(li.qty, `${t.n} (${JSON.stringify(v)})`).toBeGreaterThan(0);
      }
    }
  });

  it("la géométrie reste plausible : murs, toiture et fondations croissent avec la maison", () => {
    const a = geometrieNeuf(maisonComplete({ surface: 80, niveaux: "pp" }));
    const b = geometrieNeuf(maisonComplete({ surface: 160, niveaux: "pp" }));
    for (const k of ["P", "toiture", "mursExtNet", "Lsem", "nFen"] as const) expect(b[k]).toBeGreaterThan(a[k]);
    expect(a.toiture).toBeGreaterThan(a.E);                           // une toiture en pente dépasse l'emprise
  });
});

describe("Neuf · le chiffrage", () => {
  const A = presetMaison({ surface: 100, niveaux: "pp", chambres: 3, sdb: 1, wc: 1 }, { codePostal: "45000" });
  const dvA = buildDevis(catalogueDe(A.ctx), A.ctx, A.sel);

  it("TVA : 20 % sur tout ce qui est un travail, rien sur les frais — même sur un poste repris à 5,5 % en rénovation", () => {
    for (const l of catalogueDe(A.ctx)) for (const t of l.t) {
      if (!A.sel[key(l.c, t.n)]?.on) continue;
      expect(effRate(l, t, A.sel, A.ctx), t.n).toBe(t.frais ? 0 : 20);
    }
  });

  it("les frais n'entrent ni dans les aléas ni dans la TVA", () => {
    const sansFrais: Selection = Object.fromEntries(Object.entries(A.sel).filter(([k]) => {
      const lot = k.slice(0, k.indexOf("|")), nom = k.slice(k.indexOf("|") + 1);
      return !catalogueDe(A.ctx).find((l) => l.c === lot)?.t.find((t) => t.n === nom)?.frais;
    }));
    const dv2 = buildDevis(catalogueDe(A.ctx), A.ctx, sansFrais);
    expect(dvA.totaux.tva).toBeCloseTo(dv2.totaux.tva, 6);
    expect(dvA.totaux.aleas).toBeCloseTo(dv2.totaux.aleas, 6);
    expect(dvA.bilan.frais).toBeGreaterThan(0);
  });

  it("dommages-ouvrage = son taux appliqué au HT de tout ce qui n'est pas un frais", () => {
    const li = dvA.lignes.find((x) => x.cle.endsWith("|" + POSTE_NEUF.get("ass-assurance-dommages-ouvrage")!.n))!;
    const taux = POSTE_NEUF.get("ass-assurance-dommages-ouvrage")!.t.fp!;
    // en neuf, tout ce qui n'est pas un frais porte 20 % de TVA : c'est ce qui le distingue ici
    const base = dvA.lignes.filter((x) => x.tva > 0).reduce((s, x) => s + x.ht, 0);
    expect(li.ht).toBeCloseTo((taux / 100) * base, 6);
    expect(li.tva).toBe(0);
  });

  it("une mission de maîtrise d'œuvre se calcule sur les travaux, hors études et hors frais", () => {
    const { ctx, sel } = presetMaison({ surface: 100, pilotage: "moe" });
    const dv = buildDevis(catalogueDe(ctx), ctx, sel);
    const moe = POSTE_NEUF.get("etu-maitrise-d-oeuvre-complete")!;
    const li = dv.lignes.find((x) => x.cle === key(moe.c, moe.n))!;
    const travaux = dv.lignes.filter((x) => x.corps !== "Etudes / Conception" && x.tva > 0).reduce((s, x) => s + x.ht, 0);
    expect(li.ht).toBeCloseTo((moe.t.fp! / 100) * travaux, 6);
    // et elle remplace le dossier de permis
    expect(dv.lignes.some((x) => /dossier de permis/i.test(x.nom))).toBe(false);
  });

  it("mode rapide = mode détaillé pour la même maison", () => {
    const r = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
    const d = presetMaison(maisonComplete({ surface: 100, niveaux: "pp", codePostal: "45000" }), { codePostal: "45000" });
    expect(buildDevis(catalogueDe(r.ctx), r.ctx, r.sel).totaux.ttc).toBeCloseTo(buildDevis(catalogueDe(d.ctx), d.ctx, d.sel).totaux.ttc, 6);
  });

  it("changer la description coche et décoche ce qu'il faut, sans perdre les réglages de l'utilisateur", () => {
    const linteau = POSTE_NEUF.get("mac-linteau-beton-arme")!, fen = POSTE_NEUF.get("mex-fenetres")!;
    const sel = { ...A.sel, [key(fen.c, fen.n)]: { ...A.sel[key(fen.c, fen.n)], note: "modèle repéré", self: true } };
    const apres = appliquerMaison(maisonComplete({ ...(A.ctx.neuf as MaisonNeuve), murs: "ossature" }), sel, "pros");
    expect(apres[key(linteau.c, linteau.n)].on).toBe(false);
    expect(apres[key(fen.c, fen.n)]).toMatchObject({ on: true, note: "modèle repéré", self: true });
  });

  it("finition : éco < standard < premium ; faire soi-même coûte moins cher", () => {
    const ttc = (f: "eco" | "standard" | "premium", qui: "pros" | "max" = "pros") => {
      const { ctx, sel } = presetMaison({ surface: 100 }, { finition: f, qui });
      return buildDevis(catalogueDe(ctx), ctx, sel).totaux.ttc;
    };
    expect(ttc("eco")).toBeLessThan(ttc("standard"));
    expect(ttc("standard")).toBeLessThan(ttc("premium"));
    // « le maximum » laisse structure, clos-couvert et PAC aux artisans : ≈ −20 à −30 % (repère auto-construction)
    expect(ttc("standard", "max")).toBeLessThan(ttc("standard") * 0.85);
    expect(ttc("standard", "max")).toBeGreaterThan(ttc("standard") * 0.6);
  });

  it("un projet enregistré en construction neuve se chiffre avec le catalogue du neuf", () => {
    const e = estimationProjet({ v: "estimateur", ctx: A.ctx, sel: A.sel })!;
    expect(e.ttc).toBeCloseTo(dvA.totaux.ttc, 6);
  });
});

describe("Neuf · les corrections de la revue de code", () => {
  const ligne = (v: Partial<MaisonNeuve>, id: string, opts = {}) => {
    const { ctx, sel } = presetMaison(v, opts);
    const p = POSTE_NEUF.get(id)!;
    return { s: sel[key(p.c, p.n)], li: buildDevis(catalogueDe(ctx), ctx, sel).lignes.find((x) => x.cle === key(p.c, p.n)) };
  };
  const total = (ctx: ReturnType<typeof presetMaison>["ctx"], sel: Selection) => buildDevis(catalogueDe(ctx), ctx, sel).totaux.ttc;

  it("changer UNE réponse ne défait pas les choix de l'utilisateur ailleurs", () => {
    const m0 = maisonComplete({ surface: 100 });
    let { ctx, sel } = presetMaison(m0);
    for (const [ancien, nouveau] of [["rev-sol-stratifie-imitation-bois", "rev-parquet-bois"], ["cou-sous-face-pvc", "cou-sous-face-bois"],
      ["mex-volets-roulants", "mex-volets-battants"], ["plo-bac-de-douche", "plo-douche-a-l-italienne"]]) {
      sel = cocherPosteNeuf(sel, nouveau, true, "pros");
      expect(sel[key(POSTE_NEUF.get(ancien)!.c, POSTE_NEUF.get(ancien)!.n)].on).toBe(false);
    }
    const drain = POSTE_NEUF.get("fon-drain-peripherique")!;
    sel = { ...sel, [key(drain.c, drain.n)]: { on: true } };
    const avant = total(ctx, sel);
    const m1 = { ...m0, facade: "bardage-bois" as const };
    const apres = appliquerMaison(m1, sel, "pros", m0);
    for (const id of ["rev-parquet-bois", "cou-sous-face-bois", "mex-volets-battants", "plo-douche-a-l-italienne", "fon-drain-peripherique"])
      expect(apres[key(POSTE_NEUF.get(id)!.c, POSTE_NEUF.get(id)!.n)].on, id).toBe(true);
    for (const id of ["rev-sol-stratifie-imitation-bois", "cou-sous-face-pvc", "mex-volets-roulants", "plo-bac-de-douche", "fac-enduit-monocouche-machine"])
      expect(apres[key(POSTE_NEUF.get(id)!.c, POSTE_NEUF.get(id)!.n)].on, id).toBe(false);
    // le changement de façade ne coûte que l'écart entre enduit et bardage
    ctx = { ...ctx, neuf: m1 };
    const ecart = total(ctx, apres) - avant;
    const ref = (() => { const a = presetMaison(m0), b = presetMaison(m1); return total(b.ctx, b.sel) - total(a.ctx, a.sel); })();
    expect(ecart).toBeCloseTo(ref, 0);
  });

  it("deux postes d'un même groupe exclusif ne sont jamais cochés ensemble par la description", () => {
    for (const v of VARIANTES) {
      const dec = decisionsNeuf(maisonComplete(v));
      for (const g of GROUPES_EXCLUSIFS_NEUF) expect(g.filter((id) => dec[id]?.on).length, `${g.join(" / ")} · ${JSON.stringify(v)}`).toBeLessThanOrEqual(1);
    }
  });

  it("ossature bois sous un toit plat : la toiture-terrasse a un support (plancher bois)", () => {
    const { s, li } = ligne({ surface: 100, murs: "ossature", toiture: "plat" }, "toi-creer-un-plancher-bois");
    expect(s?.on).toBe(true);
    expect(li!.qty).toBeGreaterThan(100);
  });

  it("combles aménagés sous un toit plat : ramené à un étage, sans isolation de rampants", () => {
    const h = maisonComplete({ surface: 130, niveaux: "combles", toiture: "plat" });
    expect(h.niveaux).toBe("etage");
    expect(decisionsNeuf(h)["iso-isolation-des-combles-amenages-rampants"]?.on).toBe(false);
  });

  it("taxe d'aménagement : un sous-sol entre dans la surface taxable", () => {
    const a = maisonComplete({ surface: 100 }), b = maisonComplete({ surface: 100, plancherBas: "sous-sol" });
    expect(surfaceTaxable(b, geometrieNeuf(b))).toBeGreaterThan(surfaceTaxable(a, geometrieNeuf(a)) + 50);
  });

  it("« le maximum soi-même » laisse aussi la pompe à chaleur air/air aux artisans, et ne « fait » pas une location", () => {
    expect(ligne({ surface: 120, chauffage: "pac-air" }, "cha-climatisation-gainable-reversible", { qui: "max" }).s?.self).toBe(false);
    expect(ligne({ surface: 100 }, "anx-wc-de-chantier", { qui: "max" }).s?.self).toBe(false);
  });

  it("une réponse vide (undefined, NaN) garde la valeur par défaut au lieu d'effacer des lignes", () => {
    const a = presetMaison({ surface: 100 }), b = presetMaison({ surface: 100, chambres: undefined, sdb: Number.NaN });
    expect(total(b.ctx, b.sel)).toBeCloseTo(total(a.ctx, a.sel), 6);
  });

  it("ossature bois avec garage : le garage maçonné a ses chaînages, ses raidisseurs et ses linteaux", () => {
    for (const [id, q] of [["mac-chainage-horizontal", 10], ["mac-raidisseur-chainage-vertical", 4], ["mac-linteau-beton-arme", 2]] as const) {
      const { s, li } = ligne({ surface: 100, murs: "ossature", garage: 30 }, id);
      expect(s?.on, id).toBe(true);
      expect(li!.qty, id).toBeGreaterThanOrEqual(q);
    }
  });

  it("les quantités suivent la surface même quand la description ne la porte pas (projet ancien)", () => {
    const base = ctxNeuf({ surface: 100 });
    const elec = POSTE_NEUF.get("ele-installation-electrique-maison-neuve")!;
    const c1 = { ...base, neuf: { garage: 0 } as MaisonNeuve, surface: 100 };
    const c2 = { ...c1, surface: 150 };
    expect(autoQty(c1, elec.c, elec.n, {})).toBe(100);
    expect(autoQty(c2, elec.c, elec.n, {})).toBe(150);
  });
});

describe("Neuf · le calage sur les prix constatés", () => {
  /* Repère : enquête officielle EPTB 2024 (SDES) — maison totalement terminée, hors terrain :
     2 006 € TTC/m² ; entrepreneur ou artisan : 1 981 € ; auto-construction : 1 200 à 1 600 €/m².
     On compare la CONSTRUCTION seule (sans études, assurance, taxes ni branchements des
     concessionnaires, que l'enquête ne compte pas), en standard, sans aléas. Une dérive au-delà
     de ces bornes veut dire qu'un prix ou une formule a bougé : à regarder avant de livrer. */
  const ANNEXES = new Set(["Etudes / Conception", "Assurance & ouverture du chantier", "Taxes & participations"]);
  const CONCESSIONNAIRES = new Set(["rac-raccordement-electrique-enedis", "rac-raccordement-eau-potable", "rac-raccordement-au-tout-a-l-egout",
    "rac-extension-reseau-electrique-part-fixe", "rac-extension-reseau-electrique-au-metre", "rec-attestation-argile-daact", "rec-attestations-parasismiques"]);
  const idDe = new Map([...POSTE_NEUF.entries()].map(([id, p]) => [key(p.c, p.n), id]));
  const construction = (m: Partial<MaisonNeuve>, qui: "pros" | "max" = "pros") => {
    const { ctx, sel } = presetMaison({ ...m, codePostal: "45000" }, { qui, codePostal: "45000" });
    const dv = buildDevis(catalogueDe(ctx), ctx, sel);
    return dv.lignes.filter((li) => !ANNEXES.has(li.corps) && !CONCESSIONNAIRES.has(idDe.get(li.cle)!) && li.tva > 0)
      .reduce((s, li) => s + li.ttc, 0) / ctx.surface;
  };
  it("plain-pied 100 m² et maison à étage 120 m² : à ±20 % du repère « maison terminée »", () => {
    for (const m of [{ surface: 100, niveaux: "pp" as const }, { surface: 120, niveaux: "etage" as const, chambres: 4, sdb: 2, wc: 2 }]) {
      const v = construction(m);
      expect(v).toBeGreaterThan(2006 * 0.8);
      expect(v).toBeLessThan(2006 * 1.2);
    }
  });
  it("« le maximum soi-même » reste dans l'ordre de grandeur de l'auto-construction", () => {
    const v = construction({ surface: 100, niveaux: "pp" }, "max");
    expect(v).toBeGreaterThan(1200);
    expect(v).toBeLessThan(1800);
  });
});

describe("Neuf · la rénovation ne change pas", () => {
  it("un projet sans nature (tous les projets existants) reste chiffré sur le catalogue rénovation", () => {
    expect(catalogueDe(undefined)).toBe(CATALOG);
    expect(catalogueDe(defaultCtx())).toBe(CATALOG);
    expect(catalogueDe({ ...defaultCtx(), nature: "reno" })).toBe(CATALOG);
  });

  it("le catalogue rénovation ne contient aucun poste du neuf", () => {
    const reno = new Set(CATALOG.flatMap((l) => l.t.map((t) => t.id)));
    expect(IDS_NEUF.some((i) => reno.has(i))).toBe(false);
    expect(CATALOG.some((l) => l.t.some((t) => t.frais || t.u === "pct"))).toBe(false);
  });
});

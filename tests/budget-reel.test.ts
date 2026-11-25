/**
 * Module M5 · gestion du budget : prévu de l'estimation contre dépenses réelles, alertes, prévision
 * finale (lib/estimateur/budget-reel.ts), et les routes d'écriture des dépenses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildDevis, catalogueDe, presetNeuf, presetRapide, lotsAvecPerso, totauxAvecPerso, statutLigne, type Ctx, type Selection } from "@/lib/estimateur";
import { bilanBudget, corpsDuProjet, tauxProposeDepense, CORPS_AUTRE, CORPS_MATERIEL, SEUIL_ATTENTION, type Depense } from "@/lib/estimateur/budget-reel";

const rep = (p: { ctx: Ctx; sel: Selection }, extra: Record<string, unknown> = {}) => ({ v: "estimateur", mode: "detaille", ctx: p.ctx, sel: p.sel, codePostal: p.ctx.codePostal, ...extra });
const reno = rep(presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" }));
const neuf = rep(presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" }));
let n = 0;
const dep = (corps: string, montant: number): Depense => ({ id: `d${++n}`, corps, libelle: "facture", montant, date: "2026-10-18T10:00:00Z" });

describe("bilanBudget : le prévu reprend l'estimation", () => {
  for (const [nom, r] of [["rénovation", reno], ["neuf", neuf]] as const) {
    it(`${nom} : prévu par corps = « Où part le budget », estimation = total aléas compris`, () => {
      const dv = buildDevis(catalogueDe(r.ctx), r.ctx, r.sel);
      const lots = lotsAvecPerso(dv.lots, undefined);
      const b = bilanBudget(r, [])!;
      // « Matériel et outillage » est toujours une ligne (budget à part) : à 0 € tant que rien n'est fixé ni estimé.
      const avecMateriel = lots.some((l) => l.corps === CORPS_MATERIEL) ? lots : [...lots, { corps: CORPS_MATERIEL }];
      expect(b.lignes.map((l) => l.corps).sort()).toEqual(avecMateriel.map((l) => l.corps).sort());
      expect(b.prevu).toBeCloseTo(lots.reduce((s, l) => s + l.ttc, 0), 1);
      expect(b.estimation).toBeCloseTo(totauxAvecPerso(dv.totaux, undefined, r.ctx.aleas).ttc, 1);
      // Sans dépense : prévision = estimation, aucune alerte.
      expect(b.reel).toBe(0);
      expect(b.prevision).toBeCloseTo(b.estimation, 0);
      expect(b.alertes).toEqual([]);
    });
  }
  it("réponses inattendues : null", () => {
    expect(bilanBudget({}, [])).toBeNull();
    expect(bilanBudget(null, [])).toBeNull();
  });
});

describe("dépassements, alertes et prévision finale", () => {
  const b0 = bilanBudget(reno, [])!;
  const gros = [...b0.lignes].sort((a, x) => x.prevu - a.prevu)[0];

  it("un corps dépassé : alerte au montant du dépassement, la prévision prend le réel", () => {
    const b = bilanBudget(reno, [dep(gros.corps, gros.prevu + 1000)])!;
    const l = b.lignes.find((x) => x.corps === gros.corps)!;
    expect(l.etat).toBe("depasse");
    expect(l.ecart).toBeCloseTo(1000, 1);
    expect(l.prevision).toBeCloseTo(gros.prevu + 1000, 1);
    expect(b.alertes[0]).toEqual({ type: "depasse", corps: gros.corps, montant: expect.closeTo(1000, 1) });
    expect(b.prevision).toBeCloseTo(b0.prevision + 1000, 0);
    expect(b.alertes.some((a) => a.type === "prevision_estimation")).toBe(true);
  });

  it("à 90 % du prévu sur un lot pas terminé : attention ; en dessous : rien", () => {
    const att = bilanBudget(reno, [dep(gros.corps, gros.prevu * SEUIL_ATTENTION + 1)])!;
    expect(att.lignes.find((x) => x.corps === gros.corps)!.etat).toBe("attention");
    expect(att.alertes).toContainEqual({ type: "attention", corps: gros.corps, part: expect.any(Number) });
    const ok = bilanBudget(reno, [dep(gros.corps, gros.prevu * 0.5)])!;
    expect(ok.lignes.find((x) => x.corps === gros.corps)!.etat).toBe("ok");
    expect(ok.alertes).toEqual([]);
    // Dans le prévu, la prévision ne bouge pas : le reste à payer reste prévu.
    expect(ok.prevision).toBeCloseTo(b0.prevision, 0);
  });

  it("un lot terminé SOUS son prévu : la prévision descend au réel ; terminé sans dépense : elle garde le prévu", () => {
    const dv = buildDevis(catalogueDe(reno.ctx), reno.ctx, reno.sel);
    const statuts: Record<string, number> = {};
    for (const li of dv.lignes) if (li.corps === gros.corps) statuts[li.cle] = 2;
    expect(dv.lignes.filter((li) => li.corps === gros.corps).every((li) => statutLigne(statuts, li) === 2)).toBe(true);
    const fini = bilanBudget({ ...reno, statuts }, [dep(gros.corps, gros.prevu - 2000)])!;
    const l = fini.lignes.find((x) => x.corps === gros.corps)!;
    expect(l.termine).toBe(true);
    expect(l.prevision).toBeCloseTo(gros.prevu - 2000, 1);
    expect(fini.prevision).toBeCloseTo(b0.prevision - 2000, 0);
    expect(fini.ecartPrevision).toBeLessThan(0);
    const sansDep = bilanBudget({ ...reno, statuts }, [])!;
    expect(sansDep.lignes.find((x) => x.corps === gros.corps)!.prevision).toBeCloseTo(gros.prevu, 1);
  });

  it("une dépense hors estimation (« Autre ») : sa propre ligne et une alerte", () => {
    const b = bilanBudget(reno, [dep(CORPS_AUTRE, 500)])!;
    const l = b.lignes.find((x) => x.corps === CORPS_AUTRE)!;
    expect(l).toMatchObject({ prevu: 0, reel: 500, etat: "hors_estimation", prevision: 500 });
    expect(b.alertes).toContainEqual({ type: "hors_estimation", corps: CORPS_AUTRE, montant: 500 });
    expect(b.prevision).toBeCloseTo(b0.prevision + 500, 0);
  });

  it("budget max saisi : alerte quand la prévision le dépasse", () => {
    const avecBudget = { ...reno, ctx: { ...reno.ctx, budget: Math.round(b0.estimation) } };
    expect(bilanBudget(avecBudget, [])!.alertes).toEqual([]);
    const b = bilanBudget(avecBudget, [dep(gros.corps, gros.prevu + 5000)])!;
    expect(b.budgetMax).toBe(Math.round(b0.estimation));
    expect(b.alertes.some((a) => a.type === "prevision_budget")).toBe(true);
  });

  it("plusieurs dépenses d'un même corps s'additionnent", () => {
    const b = bilanBudget(reno, [dep(gros.corps, 100), dep(gros.corps, 250.5)])!;
    expect(b.lignes.find((x) => x.corps === gros.corps)!.reel).toBeCloseTo(350.5, 2);
    expect(b.reel).toBeCloseTo(350.5, 2);
  });
});

describe("corpsDuProjet", () => {
  it("les corps de l'estimation, du plus gros au plus petit", () => {
    const c = corpsDuProjet(reno);
    const b = bilanBudget(reno, [])!;
    expect(c.length).toBe(b.lignes.length);
    expect(c[0]).toBe([...b.lignes].sort((a, x) => x.prevu - a.prevu)[0].corps);
    expect(corpsDuProjet({})).toEqual([]);
  });
});

/* ─── Routes d'écriture ─────────────────────────────────────────────────── */

describe("routes /api/projects/[id]/depenses", () => {
  const ID = "11111111-1111-4111-8111-111111111111", DID = "22222222-2222-4222-8222-222222222222";
  const S = { nb: 0, user: null as null | { id: string }, pro: true, limite: true, projet: reno as unknown, ajout: [] as unknown[], suppr: [] as unknown[], modif: [] as unknown[], trouve: true };
  const MOCKS = ["@/lib/auth", "@/lib/ratelimit", "@/lib/data/projects", "@/lib/data/depenses"];
  beforeEach(() => {
    vi.resetModules();
    Object.assign(S, { nb: 0, user: { id: "u1" }, pro: true, limite: true, projet: reno, ajout: [], suppr: [], modif: [], trouve: true });
    vi.doMock("@/lib/auth", () => ({ getUser: async () => S.user, estPro: () => S.pro }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => S.limite }));
    vi.doMock("@/lib/data/projects", () => ({ getProjet: async () => (S.projet ? { id: ID, reponses: S.projet } : null) }));
    vi.doMock("@/lib/data/depenses", () => ({
      MAX_DEPENSES: 500, compterDepenses: async () => S.nb,
      ajouterDepense: async (pid: string, d: unknown) => { S.ajout.push([pid, d]); return { id: DID, ...(d as object), date: "x" }; },
      supprimerDepense: async (pid: string, did: string) => { S.suppr.push([pid, did]); return true; },
      modifierDepense: async (pid: string, did: string, d: unknown) => { S.modif.push([pid, did, d]); return S.trouve ? { id: did, ...(d as object), date: "x" } : null; },
    }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); });

  const post = async (body: unknown) => {
    const { POST } = await import("@/app/api/projects/[id]/depenses/route");
    return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: ID }) });
  };
  const corps = () => corpsDuProjet(reno)[0];

  it("ajoute une dépense valide sur un corps du projet", async () => {
    const r = await post({ corpsEtat: corps(), libelle: "Facture", montant: 1234.5 });
    expect(r.status).toBe(200);
    expect(S.ajout).toEqual([[ID, { corps: corps(), libelle: "Facture", montant: 1234.5, nature: "fp", tva: null, taux: null }]]);
  });
  it("la nature est gardée ; le matériel est toujours « matériaux »", async () => {
    expect((await post({ corpsEtat: corps(), libelle: "Main-d'œuvre", montant: 800, nature: "mo" })).status).toBe(200);
    expect((await post({ corpsEtat: CORPS_MATERIEL, libelle: "Perceuse", montant: 120, nature: "fp" })).status).toBe(200);
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1, nature: "cadeau" })).status).toBe(400);
    expect(S.ajout).toEqual([
      [ID, { corps: corps(), libelle: "Main-d'œuvre", montant: 800, nature: "mo", tva: null, taux: null }],
      [ID, { corps: CORPS_MATERIEL, libelle: "Perceuse", montant: 120, nature: "mat", tva: null, taux: null }],
    ]);
  });
  it("TVA de la facture (25/11/2026) : recalculée depuis le TTC et le taux ; tapée pour « plusieurs taux », plus petite que le montant", async () => {
    expect((await post({ corpsEtat: corps(), libelle: "Plombier", montant: 2640, tauxTva: "10" })).status).toBe(200);
    expect((await post({ corpsEtat: corps(), libelle: "Chauffagiste", montant: 3424, tauxTva: "multi", tva: 224 })).status).toBe(200);
    expect((await post({ corpsEtat: corps(), libelle: "Sans TVA", montant: 50, tauxTva: "0" })).status).toBe(200);
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 100, tauxTva: "multi" })).status).toBe(400);
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 100, tauxTva: "multi", tva: 100 })).status).toBe(400);
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 100, tauxTva: "7" })).status).toBe(400);
    const [a, b, c] = S.ajout as [string, { tva: number; taux: string }][];
    expect(a[1].taux).toBe("10"); expect(a[1].tva).toBeCloseTo(240, 6);
    expect(b[1]).toMatchObject({ taux: "multi", tva: 224 });
    expect(c[1]).toMatchObject({ taux: "0", tva: 0 });
    expect(S.ajout.length).toBe(3);
  });
  it("« Autre » est accepté ; un corps inventé non", async () => {
    expect((await post({ corpsEtat: CORPS_AUTRE, libelle: "Benne", montant: 300 })).status).toBe(200);
    expect((await post({ corpsEtat: "Piscine olympique", libelle: "x", montant: 1 })).status).toBe(400);
  });
  it("refus : anonyme 401, non Pro 403, limite 429, montant invalide 400, projet inconnu 404", async () => {
    S.user = null; expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(401);
    S.user = { id: "u1" }; S.pro = false; expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(403);
    S.pro = true; S.limite = false; expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(429);
    S.limite = true;
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: -5 })).status).toBe(400);
    expect((await post({ corpsEtat: corps(), libelle: "", montant: 5 })).status).toBe(400);
    S.projet = null; expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(404);
    expect(S.ajout).toEqual([]);
  });
  it("plafond : 500 dépenses par projet, la 501e refusée en 409", async () => {
    S.nb = 500;
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(409);
    expect(S.ajout).toEqual([]);
  });
  it("montant au-delà de 5 M€ refusé", async () => {
    expect((await post({ corpsEtat: corps(), libelle: "x", montant: 6_000_000 })).status).toBe(400);
  });
  it("modification (25/11/2026) : mêmes règles que l'ajout ; introuvable 404 ; anonyme 401", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/depenses/[depenseId]/route");
    const maj = (body: unknown, did = DID) => PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: ID, depenseId: did }) });
    const r = await maj({ corpsEtat: corps(), libelle: "Plombier corrigé", montant: 2200, nature: "fp", tauxTva: "10" });
    expect(r.status).toBe(200);
    const [pid, did, d] = S.modif[0] as [string, string, { libelle: string; montant: number; taux: string; tva: number; nature: string }];
    expect([pid, did, d.libelle, d.montant, d.taux, d.nature]).toEqual([ID, DID, "Plombier corrigé", 2200, "10", "fp"]);
    expect(d.tva).toBeCloseTo(200, 6);
    expect((await maj({ corpsEtat: CORPS_MATERIEL, libelle: "Perceuse", montant: 120, nature: "fp" })).status).toBe(200);
    expect((S.modif[1] as [string, string, { nature: string; tva: null }])[2]).toMatchObject({ nature: "mat", tva: null, taux: null });
    expect((await maj({ corpsEtat: "Piscine olympique", libelle: "x", montant: 1 })).status).toBe(400);
    expect((await maj({ corpsEtat: corps(), libelle: "x", montant: 100, tauxTva: "multi", tva: 150 })).status).toBe(400);
    expect((await maj({ corpsEtat: corps(), libelle: "x", montant: 1 }, "pas-un-uuid")).status).toBe(404);
    S.trouve = false;
    expect((await maj({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(404);
    S.user = null;
    expect((await maj({ corpsEtat: corps(), libelle: "x", montant: 1 })).status).toBe(401);
    expect(S.modif.length).toBe(3);
  });
  it("suppression : 204, identifiants malformés 404, anonyme 401", async () => {
    const { DELETE } = await import("@/app/api/projects/[id]/depenses/[depenseId]/route");
    const del = (id: string, did: string) => DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id, depenseId: did }) });
    expect((await del(ID, DID)).status).toBe(204);
    expect(S.suppr).toEqual([[ID, DID]]);
    expect((await del(ID, "pas-un-uuid")).status).toBe(404);
    S.user = null; expect((await del(ID, DID)).status).toBe(401);
  });
});

describe("lireMontant : saisie en FR comme en EN", async () => {
  const { lireMontant } = await import("@/lib/i18n/nombres");
  it.each([
    ["1500", 1500], ["1 500", 1500], ["1\u202f500", 1500], ["1500,5", 1500.5], ["1500,50", 1500.5], ["1.234,56", 1234.56],
    ["1,500", 1500], ["1,500.50", 1500.5], ["12.5", 12.5], ["1 500 €", 1500], ["1.500.000", 1500000],
  ])("« %s » → %s", (t, v) => expect(lireMontant(t as string)).toBeCloseTo(v as number, 2));
  it.each(["", "abc", "-5", "1,5,a"])("« %s » illisible", (t) => expect(Number.isNaN(lireMontant(t))).toBe(true));
});


describe("budget réel : la nature des dépenses et le matériel (25/11/2026)", () => {
  const b0 = bilanBudget(reno, [])!;
  const gros = [...b0.lignes].filter((l) => !l.materiel).sort((a, x) => x.prevu - a.prevu)[0];
  const d = (corps: string, montant: number, nature?: "fp" | "mo" | "mat"): Depense => ({ ...dep(corps, montant), ...(nature ? { nature } : {}) });

  it("le réel de chaque corps se lit par nature ; sans nature, c'est du fourni-posé ; le reste ne descend pas sous 0", () => {
    const b = bilanBudget(reno, [d(gros.corps, 1000), d(gros.corps, 300, "mo"), d(gros.corps, 200, "mat")])!;
    const l = b.lignes.find((x) => x.corps === gros.corps)!;
    expect(l.parNature).toEqual({ fp: 1000, mo: 300, mat: 200 });
    expect(l.reel).toBeCloseTo(1500, 2);
    expect(l.reste).toBeCloseTo(gros.prevu - 1500, 1);
    const trop = bilanBudget(reno, [d(gros.corps, gros.prevu + 50)])!.lignes.find((x) => x.corps === gros.corps)!;
    expect(trop.reste).toBe(0);
  });

  it("le prévu d'un corps se partage entre artisans et « je fais moi-même »", () => {
    for (const l of b0.lignes) expect(l.prevuArtisan + l.prevuToi).toBeCloseTo(l.prevu, 1);
    const cle = Object.keys(reno.sel).find((k) => reno.sel[k]?.on && k.startsWith(gros.corps + "|"))!;
    const moiMeme = { ...reno, sel: { ...reno.sel, [cle]: { ...reno.sel[cle], self: true } } };
    const l = bilanBudget(moiMeme, [])!.lignes.find((x) => x.corps === gros.corps)!;
    expect(l.prevuToi).toBeGreaterThan(0);
  });

  it("« Matériel et outillage » : toujours là et proposé à la saisie ; sans budget, une dépense est hors estimation", () => {
    const m = b0.lignes.find((l) => l.materiel)!;
    expect(m).toMatchObject({ corps: CORPS_MATERIEL, prevu: 0, reel: 0 });
    expect(corpsDuProjet(reno).at(-1)).toBe(CORPS_MATERIEL);
    const b = bilanBudget(reno, [d(CORPS_MATERIEL, 250, "mat")])!;
    expect(b.lignes.find((l) => l.materiel)!.etat).toBe("hors_estimation");
    expect(b.alertes).toContainEqual({ type: "hors_estimation", corps: CORPS_MATERIEL, montant: 250 });
  });

  it("budget matériel fixé : il devient le prévu du matériel et s'ajoute à l'estimation ; « estimation » le remet à zéro", () => {
    const b = bilanBudget({ ...reno, budgetMateriel: 600 }, [d(CORPS_MATERIEL, 450, "mat")])!;
    const m = b.lignes.find((l) => l.materiel)!;
    expect(m).toMatchObject({ prevu: 600, reel: 450, reste: 150, etat: "ok" });
    expect(b.budgetMateriel).toBe(600);
    expect(b.estimation).toBeCloseTo(b0.estimation + 600, 1);
    expect(bilanBudget({ ...reno, budgetMateriel: "estimation" }, [])!.budgetMateriel).toBeNull();
  });
});

/* ─── HT / TTC et taxes payées (25/11/2026) ─────────────────────────────── */

describe("budget réel : TVA de chaque dépense, taxes payées, base HT d'un professionnel", () => {
  const avecTva = (corps: string, ttc: number, taux: "5.5" | "10" | "20"): Depense => {
    const r = Number(taux);
    return { ...dep(corps, ttc), tva: ttc - ttc / (1 + r / 100), taux };
  };
  const c = () => corpsDuProjet(reno)[0];

  it("particulier : base TTC, la TVA payée s'additionne par taux ; une dépense d'avant n'a pas de TVA", () => {
    const d = [avecTva(c(), 1100, "10"), avecTva(c(), 1200, "20"), dep(c(), 500)];
    const b = bilanBudget(reno, d)!;
    expect(b.base).toBe("ttc");
    expect(b.reel).toBeCloseTo(2800, 6);
    expect(b.tva.payee).toBeCloseTo(300, 2);
    expect(b.tva.sansTva).toBe(1);
    expect(b.tva.ttcFactures).toBeCloseTo(2300, 2);
    expect(b.tva.parTaux.map((x) => [x.taux, Math.round(x.tva), x.n])).toEqual([["10", 100, 1], ["20", 200, 1]]);
    expect(b.lignes.find((l) => l.corps === c())!.tva).toBeCloseTo(300, 2);
    // La TVA prévue = celle de l'estimation.
    const dv = buildDevis(catalogueDe(reno.ctx), reno.ctx, reno.sel);
    expect(b.tva.prevue).toBeCloseTo(dv.totaux.tva, 1);
  });

  it("professionnel : prévu et estimation en HT, chaque dépense pour son HT (montant − TVA)", () => {
    const pro = { ...reno, ctx: { ...reno.ctx, payeur: "pro" as const } };
    const dv = buildDevis(catalogueDe(pro.ctx), pro.ctx, pro.sel);
    const t = totauxAvecPerso(dv.totaux, undefined, pro.ctx.aleas);
    const b = bilanBudget(pro, [avecTva(c(), 1100, "10")])!;
    expect(b.base).toBe("ht");
    expect(b.estimation).toBeCloseTo(t.ht + t.aleas, 1);
    expect(b.reel).toBeCloseTo(1000, 6);
    const htCorps = dv.lignes.filter((li) => li.corps === c()).reduce((s, li) => s + li.ht, 0);
    expect(b.lignes.find((l) => l.corps === c())!.prevu).toBeCloseTo(htCorps, 1);
    // Particulier (défaut) : rien ne change par rapport à avant.
    expect(bilanBudget(reno, [])!.estimation).toBeCloseTo(totauxAvecPerso(buildDevis(catalogueDe(reno.ctx), reno.ctx, reno.sel).totaux, undefined, reno.ctx.aleas).ttc, 1);
  });

  it("taux proposé : 20 % pour le matériel et les matériaux seuls ; le taux de l'estimation pour un artisan", () => {
    expect(tauxProposeDepense(reno, CORPS_MATERIEL, "fp").taux).toBe("20");
    expect(tauxProposeDepense(reno, c(), "mat").taux).toBe("20");
    expect(["5.5", "10"]).toContain(tauxProposeDepense(reno, c(), "fp").taux);
    expect(tauxProposeDepense(neuf, corpsDuProjet(neuf)[0], "fp").taux).toBe("20");
  });
});

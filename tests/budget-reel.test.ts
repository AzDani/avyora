/**
 * Module M5 · gestion du budget : prévu de l'estimation contre dépenses réelles, alertes, prévision
 * finale (lib/estimateur/budget-reel.ts), et les routes d'écriture des dépenses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildDevis, catalogueDe, presetNeuf, presetRapide, lotsAvecPerso, totauxAvecPerso, statutLigne, type Ctx, type Selection } from "@/lib/estimateur";
import { bilanBudget, corpsDuProjet, CORPS_AUTRE, SEUIL_ATTENTION, type Depense } from "@/lib/estimateur/budget-reel";

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
      expect(b.lignes.map((l) => l.corps).sort()).toEqual(lots.map((l) => l.corps).sort());
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
  const S = { user: null as null | { id: string }, pro: true, limite: true, projet: reno as unknown, ajout: [] as unknown[], suppr: [] as unknown[] };
  const MOCKS = ["@/lib/auth", "@/lib/ratelimit", "@/lib/data/projects", "@/lib/data/depenses"];
  beforeEach(() => {
    vi.resetModules();
    Object.assign(S, { user: { id: "u1" }, pro: true, limite: true, projet: reno, ajout: [], suppr: [] });
    vi.doMock("@/lib/auth", () => ({ getUser: async () => S.user, estPro: () => S.pro }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => S.limite }));
    vi.doMock("@/lib/data/projects", () => ({ getProjet: async () => (S.projet ? { id: ID, reponses: S.projet } : null) }));
    vi.doMock("@/lib/data/depenses", () => ({
      ajouterDepense: async (pid: string, d: unknown) => { S.ajout.push([pid, d]); return { id: DID, ...(d as object), date: "x" }; },
      supprimerDepense: async (pid: string, did: string) => { S.suppr.push([pid, did]); return true; },
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
    expect(S.ajout).toEqual([[ID, { corps: corps(), libelle: "Facture", montant: 1234.5 }]]);
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
  it("suppression : 204, identifiants malformés 404, anonyme 401", async () => {
    const { DELETE } = await import("@/app/api/projects/[id]/depenses/[depenseId]/route");
    const del = (id: string, did: string) => DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id, depenseId: did }) });
    expect((await del(ID, DID)).status).toBe(204);
    expect(S.suppr).toEqual([[ID, DID]]);
    expect((await del(ID, "pas-un-uuid")).status).toBe(404);
    S.user = null; expect((await del(ID, DID)).status).toBe(401);
  });
});

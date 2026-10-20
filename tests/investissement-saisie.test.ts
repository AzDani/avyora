/**
 * Module M3 · saisie de la section « Investissement » : valeurs par défaut tirées du projet, lecture tolérante
 * des réponses, et route d'enregistrement /api/projects/[id]/investissement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { entreeDepuisSaisie, completer, lireSaisie, travauxRetenus, investSchema, type ContexteProjet } from "@/lib/investissement/saisie";

const P: ContexteProjet = { codePostal: "75011", typeBien: "T2", nature: "reno", travauxEstimes: 32_400 };

describe("valeurs par défaut et champs indispensables", () => {
  it("rien sans prix, loyer et revenus du foyer", () => {
    expect(entreeDepuisSaisie({}, P)).toBeNull();
    expect(entreeDepuisSaisie({ prix: 150_000, loyerNu: 800 }, P)).toBeNull();
    expect(entreeDepuisSaisie({ prix: 150_000, loyerNu: 800, revenu: 40_000 }, P)).not.toBeNull();
  });
  it("défauts tirés du projet : département, appartement, travaux de l'estimation, loyer meublé + 12 %", () => {
    const e = completer({ prix: 150_000, loyerNu: 800, revenu: 40_000 }, P);
    expect(e.dept).toBe("75");
    expect(e.collectif).toBe(true);
    expect(e.neuf).toBe(false);
    expect(e.travaux).toBe(32_400);
    expect(e.loyerMeuble).toBe(896);
    expect(e.travauxDeductiblesPct).toBe(100);
    expect(e.terrainPct).toBe(15);
    expect(e.fraisNotaire).toBeNull();
  });
  it("une maison neuve : pas collective, travaux non déductibles, terrain 20 %", () => {
    const e = completer({ prix: 300_000, loyerNu: 1_200, revenu: 50_000 }, { ...P, typeBien: "Maison", nature: "neuf" });
    expect(e.collectif).toBe(false);
    expect(e.neuf).toBe(true);
    expect(e.travauxDeductiblesPct).toBe(0);
    expect(e.terrainPct).toBe(20);
    expect(e.immeuble15ans).toBe(false);
  });
  it("travaux : la saisie prime, puis la prévision des dépenses réelles (si suivie), puis l'estimation", () => {
    const avecReel = { ...P, travauxPrevision: 35_000 };
    expect(travauxRetenus({}, avecReel)).toEqual({ montant: 35_000, source: "reel" });
    expect(travauxRetenus({ suiviReel: false }, avecReel)).toEqual({ montant: 32_400, source: "estimation" });
    expect(travauxRetenus({ travaux: 10_000 }, avecReel)).toEqual({ montant: 10_000, source: "saisie" });
  });
  it("lecture tolérante : des réponses sans saisie ou abîmées donnent une section éteinte", () => {
    expect(lireSaisie({})).toEqual({ actif: false, strategie: "location", location: {} });
    expect(lireSaisie({ invest: { actif: "oui" } }).actif).toBe(false);
    expect(lireSaisie({ invest: { actif: true, strategie: "location", location: { prix: 100_000 } } }).location.prix).toBe(100_000);
  });
  it("schéma : bornes et champs inconnus refusés", () => {
    const ok = (location: unknown) => investSchema.safeParse({ actif: true, strategie: "location", location }).success;
    expect(ok({ prix: 100_000, taux: 3.6, couple: true, niveauBailleurPrive: "social" })).toBe(true);
    expect(ok({ prix: -1 })).toBe(false);
    expect(ok({ taux: 25 })).toBe(false);
    expect(ok({ piscine: 1 })).toBe(false);
    expect(ok({ prix: Infinity })).toBe(false);
  });
});

describe("route /api/projects/[id]/investissement", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const S = { user: null as null | { id: string }, pro: true, limite: true, projet: {} as unknown, maj: [] as unknown[] };
  const MOCKS = ["@/lib/auth", "@/lib/ratelimit", "@/lib/data/projects", "@/lib/supabase/server"];
  beforeEach(() => {
    vi.resetModules();
    Object.assign(S, { user: { id: "u1" }, pro: true, limite: true, projet: { ctx: { surface: 50 }, statuts: { a: 2 } }, maj: [] });
    vi.doMock("@/lib/auth", () => ({ getUser: async () => S.user, estPro: () => S.pro }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => S.limite }));
    vi.doMock("@/lib/data/projects", () => ({ getProjet: async () => (S.projet ? { id: ID, reponses: S.projet } : null) }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({ from: () => ({ update: (x: unknown) => { S.maj.push(x); return { eq: async () => ({ error: null }) }; } }) }),
    }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); });

  const put = async (body: unknown, id = ID) => {
    const { PUT } = await import("@/app/api/projects/[id]/investissement/route");
    return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  };
  const valide = { actif: true, strategie: "location", location: { prix: 180_000, loyerNu: 850, revenu: 42_000 } };

  it("enregistre la saisie dans reponses.invest sans toucher au reste", async () => {
    const r = await put(valide);
    expect(r.status).toBe(200);
    expect(S.maj).toEqual([{ reponses: { ctx: { surface: 50 }, statuts: { a: 2 }, invest: valide } }]);
  });
  it("refus : anonyme 401, non Pro 403, limite 429, données invalides 400, projet inconnu 404", async () => {
    S.user = null; expect((await put(valide)).status).toBe(401);
    S.user = { id: "u1" }; S.pro = false; expect((await put(valide)).status).toBe(403);
    S.pro = true; S.limite = false; expect((await put(valide)).status).toBe(429);
    S.limite = true;
    expect((await put({ ...valide, location: { prix: -3 } })).status).toBe(400);
    expect((await put({ ...valide, pirate: true })).status).toBe(400);
    expect((await put(valide, "pas-un-uuid")).status).toBe(404);
    S.projet = null; expect((await put(valide)).status).toBe(404);
    expect(S.maj).toEqual([]);
  });
});

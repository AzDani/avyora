/**
 * C5 · la reprise d'un plan dessiné sans compte (`ClaimPlan`, `lib/plans/local.ts`) et le montage sur
 * /projets.
 *
 * Le stockage du navigateur et l'API sont simulés en mémoire : aucune base, aucun compte. Le faux
 * serveur reproduit ce dont la reprise dépend (C1, C2) : 401 sans session, la limite gratuite tenue par
 * le serveur (402), la reprise sans doublon par `editeurId` (`deja`), le plafond (409 `plafond`).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { prerender } from "react-dom/static";
import {
  CLE_PLANS_LOCAUX,
  CLE_RECLAMATION_PLAN,
  CLE_TAMPON_PLAN,
  corpsReprise,
  empreintePlan,
  lirePlansLocaux,
  planAReprendre,
  planPorteTravail,
  reprendrePlanLocal,
  type Stockage,
} from "@/lib/plans/local";
import { dictPlans, messageReprise } from "@/lib/i18n/plans";
import { planCreerSchema } from "@/lib/plans/schema";

const fixture = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "fixtures", "plans-etats", f), "utf8"));

/* ─── Stockage et serveur simulés ────────────────────────────────────────── */

function stockage(init: Record<string, unknown> = {}): Stockage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  for (const [k, v] of Object.entries(init)) data.set(k, typeof v === "string" ? v : JSON.stringify(v));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

type Appel = { methode: string; url: string; corps?: Record<string, unknown> };

function serveur(o: { connecte?: boolean; pro?: boolean; plans?: { id: string; nom: string; editeurId?: string }[]; panne?: boolean; plafond?: boolean } = {}) {
  const plans = [...(o.plans ?? [])];
  const appels: Appel[] = [];
  let seq = 0;
  const repondre = (status: number, j: unknown) =>
    new Response(j === null ? null : JSON.stringify(j), { status, headers: { "Content-Type": "application/json" } });
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const methode = init?.method ?? "GET";
    const corps = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    appels.push({ methode, url, corps });
    if (o.panne) throw new TypeError("Failed to fetch");
    if (o.connecte === false) return repondre(401, { code: "connexion_requise" });
    if (url === "/api/plans" && methode === "GET") return repondre(200, { plans, limite: o.pro ? null : 1, utilises: plans.length });
    if (url === "/api/plans" && methode === "POST") {
      const v = planCreerSchema.safeParse(corps);
      if (!v.success) return repondre(400, { code: "invalide" });
      const deja = v.data.editeurId ? plans.find((p) => p.editeurId === v.data.editeurId) : undefined;
      if (deja) return repondre(201, { id: deja.id, revision: 1, deja: true });
      if (o.plafond) return repondre(409, { code: "plafond" });
      if (!o.pro && plans.length >= 1) return repondre(402, { code: "limite_gratuite" });
      seq++;
      const id = `bbbbbbbb-bbbb-4bbb-8bbb-${String(seq).padStart(12, "0")}`;
      plans.unshift({ id, nom: v.data.nom, editeurId: v.data.editeurId });
      return repondre(201, { id, revision: 1, deja: false });
    }
    return repondre(404, null);
  });
  return { f: f as unknown as (u: string, i?: RequestInit) => Promise<Response>, appels, plans, mock: f };
}

/* Un plan dessiné : un état réel de l'éditeur, retouché (ce n'est plus le modèle tel quel). */
const dessine = (id: string, nom: string) => {
  const e = fixture("plan-final-etage.json");
  e.levels[0].walls.push({ id: "wnouv1", a: { x: 0, y: 0 }, b: { x: 1, y: 1 }, type: "cloison" });
  return { ...e, id, name: nom };
};
const entree = (id: string, nom: string, savedAt: number) => ({
  id, name: nom, savedAt, state: dessine(id, nom), view: { zoom: 40, ox: 0, oy: 0 },
  resume: { pf: true, m2: 94.2, pieces: 5, budget: 0, taches: 0, faites: 0, projet: null, prochain: null },
});

const posts = (a: Appel[]) => a.filter((x) => x.methode === "POST");

/* ─── La reprise ─────────────────────────────────────────────────────────── */

describe("C5 · reprise d'un plan local (ClaimPlan)", () => {
  it("drapeau absent → aucun appel, rien ne bouge", async () => {
    const s = stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) } });
    const avant = new Map(s.data);
    const srv = serveur();
    expect(await reprendrePlanLocal(s, srv.f)).toEqual({ etat: "aucun" });
    expect(srv.mock).not.toHaveBeenCalled();
    expect(s.data).toEqual(avant);
  });

  it("drapeau présent → un seul POST avec editeurId ; le drapeau et l'entrée locale partent, le tampon prend l'uuid", async () => {
    const s = stockage({
      [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) },
      [CLE_TAMPON_PLAN]: { state: dessine("abc1234", "Ma maison"), view: { zoom: 40 }, onglet: "x" },
      [CLE_RECLAMATION_PLAN]: "abc1234",
    });
    const srv = serveur();
    const r = await reprendrePlanLocal(s, srv.f);
    expect(r).toMatchObject({ etat: "ajoute", nom: "Ma maison", deja: false, autres: 0 });
    expect(posts(srv.appels)).toHaveLength(1);
    const corps = posts(srv.appels)[0].corps!;
    expect(corps.editeurId).toBe("abc1234");
    expect(corps.nom).toBe("Ma maison");
    expect((corps.etat as { name: string }).name).toBe("Ma maison");
    expect(corps.resume).toEqual({ pf: true, m2: 94.2, pieces: 5, budget: 0, taches: 0, faites: 0 });
    expect(planCreerSchema.safeParse(corps).success).toBe(true);
    expect(s.getItem(CLE_RECLAMATION_PLAN)).toBeNull();
    expect(JSON.parse(s.getItem(CLE_PLANS_LOCAUX)!)).toEqual({});
    const tampon = JSON.parse(s.getItem(CLE_TAMPON_PLAN)!);
    expect(r.etat === "ajoute" && tampon.state.id).toBe(r.etat === "ajoute" ? r.id : "");
    expect(tampon.onglet).toBe("x");
  });

  it("deuxième passage → idempotent : le même plan (deja), aucun doublon", async () => {
    const init = { [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) }, [CLE_RECLAMATION_PLAN]: "abc1234" };
    const srv = serveur({ pro: true });
    const r1 = await reprendrePlanLocal(stockage(init), srv.f);
    const r2 = await reprendrePlanLocal(stockage(init), srv.f);
    expect(r1).toMatchObject({ etat: "ajoute", deja: false });
    expect(r2).toMatchObject({ etat: "ajoute", deja: true });
    expect(r1.etat === "ajoute" && r2.etat === "ajoute" && r1.id === r2.id).toBe(true);
    expect(srv.plans).toHaveLength(1);
    /* le drapeau retiré, un troisième passage ne fait plus aucun appel */
    const s = stockage(init);
    await reprendrePlanLocal(s, srv.f);
    const n = srv.mock.mock.calls.length;
    expect(await reprendrePlanLocal(s, srv.f)).toEqual({ etat: "aucun" });
    expect(srv.mock.mock.calls.length).toBe(n);
  });

  it("402 (gratuit, compte déjà plein) → le nom du plan du compte ; le plan reste sur l'appareil ; le drapeau part", async () => {
    const s = stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) }, [CLE_RECLAMATION_PLAN]: "abc1234" });
    const srv = serveur({ plans: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", nom: "Chalet" }] });
    const r = await reprendrePlanLocal(s, srv.f);
    expect(r).toEqual({ etat: "limite", nom: "Ma maison", autre: "Chalet" });
    expect(s.getItem(CLE_RECLAMATION_PLAN)).toBeNull();
    expect(JSON.parse(s.getItem(CLE_PLANS_LOCAUX)!).abc1234).toBeTruthy();
    expect(srv.plans).toHaveLength(1);
  });

  it("402 → le bon message, en français et en anglais", () => {
    const r = { etat: "limite", nom: "Ma maison", autre: "Chalet" } as const;
    expect(messageReprise(r, dictPlans("fr"), false)!.texte).toBe(
      "Ton compte garde déjà « Chalet ». Ce plan reste sur cet appareil. Avec Pro : des plans enregistrés sans limite.",
    );
    expect(messageReprise(r, dictPlans("en"), false)!.texte).toBe(
      "Your account already keeps “Chalet”. This plan stays on this device. With Pro: unlimited saved plans.",
    );
    expect(messageReprise(r, dictPlans("fr"), false)!.lien!.href).toBe("/tarifs?source=editeur-plan");
    /* nom du plan du compte inconnu : pas de guillemets autour d'une expression générique */
    for (const autre of [null, ""]) {
      expect(messageReprise({ etat: "limite", nom: "X", autre }, dictPlans("fr"), false)!.texte).toBe(
        "Ton compte garde déjà un autre plan. Ce plan reste sur cet appareil. Avec Pro : des plans enregistrés sans limite.",
      );
      expect(messageReprise({ etat: "limite", nom: "X", autre }, dictPlans("en"), false)!.texte).toBe(
        "Your account already keeps another plan. This plan stays on this device. With Pro: unlimited saved plans.",
      );
    }
  });

  it("201 → « {nom} » est dans ton compte (FR, EN), « Les autres restent… » seulement s'il en reste", () => {
    const fr = dictPlans("fr"), en = dictPlans("en");
    const r = { etat: "ajoute", nom: "Ma maison", id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", deja: false, autres: 0 } as const;
    expect(messageReprise(r, fr, false)!.texte).toBe("« Ma maison » est dans ton compte.");
    expect(messageReprise(r, en, false)!.texte).toBe("“Ma maison” is in your account.");
    expect(messageReprise({ ...r, autres: 2 }, fr, false)!.texte).toBe(
      "« Ma maison » est dans ton compte. Les autres restent sur cet appareil. Avec Pro : des plans enregistrés sans limite.",
    );
    expect(messageReprise({ ...r, autres: 2 }, fr, true)!.texte).toBe("« Ma maison » est dans ton compte. Les autres restent sur cet appareil.");
    expect(messageReprise(r, fr, false)!.lien!.href).toBe("/plan?id=bbbbbbbb-bbbb-4bbb-8bbb-000000000001");
    expect(messageReprise({ etat: "aucun" }, fr, false)).toBeNull();
    expect(messageReprise({ etat: "introuvable" }, fr, false)).toBeNull();
    expect(messageReprise({ etat: "connexion" }, fr, false)).toBeNull();
  });

  it("401 (pas encore connecté) → le drapeau reste pour plus tard", async () => {
    const s = stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) }, [CLE_RECLAMATION_PLAN]: "abc1234" });
    expect(await reprendrePlanLocal(s, serveur({ connecte: false }).f)).toEqual({ etat: "connexion" });
    expect(s.getItem(CLE_RECLAMATION_PLAN)).toBe("abc1234");
  });

  it("panne réseau, plafond, réponse illisible → le drapeau part, le plan reste sur l'appareil", async () => {
    for (const [o, attendu] of [[{ panne: true }, "echec"], [{ plafond: true, pro: true }, "plafond"]] as const) {
      const s = stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) }, [CLE_RECLAMATION_PLAN]: "abc1234" });
      expect((await reprendrePlanLocal(s, serveur(o).f)).etat).toBe(attendu);
      expect(s.getItem(CLE_RECLAMATION_PLAN)).toBeNull();
      expect(JSON.parse(s.getItem(CLE_PLANS_LOCAUX)!).abc1234).toBeTruthy();
    }
    const s = stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "Ma maison", 1) }, [CLE_RECLAMATION_PLAN]: "abc1234" });
    const bizarre = async () => new Response("pas du json", { status: 201 });
    expect((await reprendrePlanLocal(s, bizarre)).etat).toBe("echec");
    expect(JSON.parse(s.getItem(CLE_PLANS_LOCAUX)!).abc1234).toBeTruthy();
  });

  it("drapeau sans plan local (stockage vidé, autre appareil) → aucun appel, drapeau retiré", async () => {
    const s = stockage({ [CLE_RECLAMATION_PLAN]: "abc1234" });
    const srv = serveur();
    expect(await reprendrePlanLocal(s, srv.f)).toEqual({ etat: "introuvable" });
    expect(srv.mock).not.toHaveBeenCalled();
    expect(s.getItem(CLE_RECLAMATION_PLAN)).toBeNull();
  });

  it("le plan demandé, sinon le plan ouvert, sinon le plus récent ; « autres » compte ceux qui restent", async () => {
    const lib = { aaa1111: entree("aaa1111", "Ancien", 1), bbb2222: entree("bbb2222", "Récent", 9), ccc3333: entree("ccc3333", "Milieu", 5) };
    const tampon = { state: dessine("ccc3333", "Milieu"), view: {} };
    const locaux = lirePlansLocaux(stockage({ [CLE_PLANS_LOCAUX]: lib, [CLE_TAMPON_PLAN]: tampon }));
    expect(locaux.map((p) => [p.id, p.ouvert])).toEqual([["ccc3333", true], ["bbb2222", false], ["aaa1111", false]]);
    expect(locaux[0].resume).toMatchObject({ m2: 94.2 }); /* le résumé de l'entrée rangée rejoint le plan ouvert */
    expect(planAReprendre(locaux, "aaa1111")!.id).toBe("aaa1111");
    expect(planAReprendre(locaux, "zzz9999")!.id).toBe("ccc3333");
    expect(planAReprendre(locaux.filter((p) => !p.ouvert), null)!.id).toBe("bbb2222");

    const s = stockage({ [CLE_PLANS_LOCAUX]: lib, [CLE_TAMPON_PLAN]: tampon, [CLE_RECLAMATION_PLAN]: "aaa1111" });
    const r = await reprendrePlanLocal(s, serveur().f);
    expect(r).toMatchObject({ etat: "ajoute", nom: "Ancien", autres: 2 });
    expect(Object.keys(JSON.parse(s.getItem(CLE_PLANS_LOCAUX)!)).sort()).toEqual(["bbb2222", "ccc3333"]);
    expect(JSON.parse(s.getItem(CLE_TAMPON_PLAN)!).state.id).toBe("ccc3333");
  });

  it("ce qui n'est pas un plan à reprendre : plan vide, modèle intact, plan du compte resté dans le tampon", () => {
    const vide = { ...dessine("v1", "Vide"), levels: [{ walls: [], openings: [] }] };
    expect(planPorteTravail(vide)).toBe(false);
    for (const f of ["maison.json", "studio.json", "t2.json", "t3.json"]) {
      const e = fixture(f);
      expect(empreintePlan(e)).toBe(e.origine.sig); /* l'empreinte de l'éditeur, au caractère près */
      expect(planPorteTravail(e)).toBe(false);
    }
    expect(planPorteTravail(dessine("x1", "X"))).toBe(true);
    const tamponCompte = { state: dessine("dddddddd-dddd-4ddd-8ddd-dddddddddddd", "Du compte"), view: {} };
    expect(lirePlansLocaux(stockage({ [CLE_TAMPON_PLAN]: tamponCompte }))).toEqual([]);
    expect(lirePlansLocaux(stockage({ [CLE_TAMPON_PLAN]: "{pas du json", [CLE_PLANS_LOCAUX]: "[]" }))).toEqual([]);
  });

  it("le corps de la reprise suit siteAjouterLocal : nom borné, résumé sans clé nulle, editeurId seulement pour un id local", () => {
    const p = lirePlansLocaux(stockage({ [CLE_PLANS_LOCAUX]: { abc1234: entree("abc1234", "  " + "N".repeat(150), 1) } }))[0];
    const c = corpsReprise(p);
    expect((c.nom as string).length).toBe(120);
    expect(c.editeurId).toBe("abc1234");
    expect(Object.values(c.resume as object)).not.toContain(null);
    expect(corpsReprise({ ...p, id: "" }).editeurId).toBeUndefined();
  });
});

/* ─── Montage sur /projets : ClaimPlan AVANT ClaimDraft, seulement interrupteur allumé ─── */

const MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "@/lib/data/projects", "@/components/ClaimDraft",
  "@/components/plans/ClaimPlan", "@/components/ProUpsell", "@/components/ListeProjets", "server-only"];

describe("C5 · /projets monte ClaimPlan avant ClaimDraft", () => {
  afterEach(() => {
    for (const m of MOCKS) vi.doUnmock(m);
  });

  for (const plans of [true, false]) {
    it(`interrupteur ${plans ? "allumé" : "éteint"}`, async () => {
      vi.resetModules();
      vi.doMock("@/lib/features", async (orig) => {
        const m = await orig<typeof import("@/lib/features")>();
        return { ...m, FEATURES: { ...m.FEATURES, plans } };
      });
      vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => "fr" }));
      vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u", email: "a@b.fr", app_metadata: {} }), estPro: () => false }));
      vi.doMock("@/lib/data/projects", () => ({ listProjets: async () => [] }));
      vi.doMock("server-only", () => ({}));
      vi.doMock("@/components/ClaimDraft", () => ({ default: () => createElement("i", { "data-c": "draft" }) }));
      vi.doMock("@/components/plans/ClaimPlan", () => ({ default: () => createElement("i", { "data-c": "plan" }) }));
      vi.doMock("@/components/ProUpsell", () => ({ default: () => null }));
      vi.doMock("@/components/ListeProjets", () => ({ default: () => null }));
      const Projets = (await import("@/app/projets/page")).default;
      const { prelude } = await prerender(await Projets());
      const h = await new Response(prelude).text();
      const iPlan = h.indexOf('data-c="plan"'), iDraft = h.indexOf('data-c="draft"');
      expect(iDraft).toBeGreaterThan(-1);
      if (plans) {
        expect(iPlan).toBeGreaterThan(-1);
        expect(iPlan).toBeLessThan(iDraft);
      } else {
        expect(iPlan).toBe(-1);
      }
    });
  }
});

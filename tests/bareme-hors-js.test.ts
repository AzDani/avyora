/**
 * Le barème de prix n'est plus dans le JavaScript public (27/11/2026, option A validée par Dani).
 *
 * 1. Le détecteur de `scripts/controle-bareme.mjs` (lancé après `next build` et contre getavyora.fr) reconnaît le
 *    barème sous toutes les formes qu'un outil de mise en paquet lui donne, et ne confond pas le code du moteur avec lui.
 * 2. Un seul endroit lit les JSON du barème, dans la branche serveur (`typeof window === "undefined"`), que Next
 *    retire du paquet du navigateur.
 * 3. L'estimation rapide calculée côté serveur rend EXACTEMENT les montants d'avant (même moteur, au centime), et
 *    rien d'autre que ce que l'écran affiche : sans compte, aucun montant.
 * 4. L'adresse du barème (`GET /api/estimateur/bareme`) : compte exigé, plafonnée, journalisée, jamais en cache.
 * 5. Installer le barème (navigateur, après connexion) reconstruit les tables qui en dérivent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fouiller } from "../scripts/controle-bareme.mjs";
import { buildDevis, CATALOG, catalogueDe, presetRapide, presetPieces, presetNeuf, AMPLEURS, type Finition, type QuiRealise } from "@/lib/estimateur";
import { calculRapideReno, calculRapideNeuf, entreeRapideSchema, type EntreeRapideReno } from "@/lib/estimateur/rapide-serveur";
import { installerCatalogues, sourcesCatalogue, CATALOG_NEUF, POSTE_NEUF } from "@/lib/estimateur/catalogue-neuf";
import { posteParId } from "@/lib/estimateur/identite";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const reno = JSON.parse(lire("lib/estimateur/catalog.json"));
const neuf = JSON.parse(lire("lib/estimateur/catalog-neuf.json"));

describe("1 · le détecteur du contrôle après build", () => {
  const poste = reno[1].t[1] as { id: string; n: string; u: string; fp: number; sm: number | null };
  it("reconnaît le barème en JSON, en objet minifié, en chaîne JSON échappée", () => {
    expect(fouiller(JSON.stringify(reno)).fautes.length).toBeGreaterThan(0);
    expect(fouiller(JSON.stringify(neuf)).fautes.length).toBeGreaterThan(0);
    const minifie = `{id:"${poste.id}",n:"${poste.n}",u:"${poste.u}",fp:${poste.fp},sm:${poste.sm}}`;
    expect(fouiller(minifie).fautes.join(" ")).toMatch(/^A .*B /);
    const chaine = JSON.stringify(JSON.stringify([poste]));   // JSON.parse('[{\"id\":…}]')
    expect(fouiller(chaine).fautes.length).toBeGreaterThan(0);
  });
  it("ne confond pas le code du moteur (des postes nommés, des « fp » sans prix du barème) avec le barème", () => {
    for (const f of ["lib/estimateur/core.ts", "lib/estimateur/neuf.ts", "lib/estimateur/budget-reel.ts", "lib/estimateur/plan-correspondance.ts"]) {
      expect(fouiller(lire(f)).fautes, f).toEqual([]);
    }
  });
  it("sur une page publique, un seul identifiant de poste est une faute", () => {
    expect(fouiller(`x("${poste.id}")`, { strict: true }).fautes).toHaveLength(1);
    expect(fouiller(`x("${poste.id}")`).fautes).toEqual([]);
  });
});

describe("2 · un seul endroit lit le barème, côté serveur", () => {
  const RACINE = process.cwd();
  const sources = (dir: string): string[] => fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === "node_modules" ? [] : sources(p)) : /\.(tsx?|mjs|js)$/.test(e.name) ? [p] : [];
  });
  it("aucun module de l'application n'importe catalog.json ni catalog-neuf.json, sauf la branche serveur de catalogue-neuf.ts", () => {
    const fautifs = ["app", "components", "lib"].flatMap(sources).filter((f) => {
      const s = lire(f);
      return /(?:from|import|require)\s*\(?\s*["'][^"']*catalog(?:-neuf)?\.json["']/.test(s) && f !== path.join("lib", "estimateur", "catalogue-neuf.ts");
    });
    expect(fautifs).toEqual([]);
    const src = lire("lib/estimateur/catalogue-neuf.ts");
    expect(src).toContain(`if (typeof window === "undefined") {\n  installerCatalogues(require("./catalog.json"), require("./catalog-neuf.json"));\n}`);
    expect(src.match(/catalog(?:-neuf)?\.json"\)/g)).toHaveLength(2);
    expect(lire("lib/estimateur/catalog.ts")).not.toMatch(/import .*\.json/);
  });
  it("les deux estimateurs rapides n'importent ni le moteur, ni le catalogue, ni les paniers", () => {
    for (const f of ["components/EstimateurRapide.tsx", "components/neuf/EstimateurRapideNeuf.tsx", "components/neuf/BilanRapideNeuf.tsx", "components/auth/EstimationRappel.tsx"]) {
      const imports = [...lire(f).matchAll(/^import (?!type )[^;]*?from "([^"]+)"/gm)].map((m) => m[1]);
      for (const interdit of ["@/lib/estimateur", "@/lib/estimateur/core", "@/lib/estimateur/catalog", "@/lib/estimateur/catalogue-neuf", "@/lib/estimateur/presets",
        "@/lib/estimateur/pieces", "@/lib/estimateur/paniers-pieces", "@/lib/estimateur/presets-neuf", "@/lib/estimateur/neuf", "@/lib/estimateur/etapes-neuf",
        "@/lib/estimateur/projet", "@/lib/estimateur/catalog-i18n", "@/lib/estimateur/rapide-serveur", "@/lib/estimateur/bilan-neuf"]) {
        expect(imports, `${f} importe ${interdit}`).not.toContain(interdit);
      }
    }
  });
});

describe("3 · l'estimation rapide calculée côté serveur : les montants d'avant, au centime", () => {
  const compte = { compte: true, pro: true };
  const m2 = (p: { ctx: { surface: number }; sel: never } | ReturnType<typeof presetRapide>, surfaceSaisie: number) =>
    surfaceSaisie > 0 && p.ctx.surface > 0 ? Math.round(buildDevis(CATALOG, p.ctx as never, p.sel as never).totaux.ttc / p.ctx.surface) : 0;
  const base: EntreeRapideReno = { nature: "reno", mode: "bien", type: "Maison", surface: 100, pieces: [], cp: "75011", ampleur: "complete", finition: "standard", qui: "pros" };

  for (const type of ["Maison", "Appartement"] as const) for (const ampleur of AMPLEURS.map((a) => a.v)) for (const cp of ["75011", "23000", ""]) {
    it(`bien entier · ${type} · ${ampleur} · ${cp || "sans code postal"}`, () => {
      const e = { ...base, type, ampleur, cp, surface: 87 } as EntreeRapideReno;
      const s = calculRapideReno(e, compte);
      const avant = presetRapide({ type: type as never, surface: 87, codePostal: cp, ampleur, finition: "standard", qui: "pros" });
      expect(s.preset).toEqual(avant);
      expect(s.montants!.ttc).toBe(buildDevis(CATALOG, avant.ctx, avant.sel).totaux.ttc);
      for (const f of ["eco", "standard", "premium"] as Finition[]) {
        expect(s.montants!.m2ByFin[f]).toBe(m2(presetRapide({ type: type as never, surface: 87, codePostal: cp, ampleur, finition: f, qui: "pros" }), 87));
      }
      for (const q of ["pros", "partie", "max"] as QuiRealise[]) {
        expect(s.montants!.m2ByQui[q]).toBe(m2(presetRapide({ type: type as never, surface: 87, codePostal: cp, ampleur, finition: "standard", qui: q }), 87));
      }
    });
  }

  it("pièces · même devis fusionné que `presetPieces`, aléas d'un projet rouvert gardés", () => {
    const pieces = [{ room: "chambre", surface: 12 }, { room: "chambre", surface: 15 }, { room: "sdb", surface: 5 }];
    const s = calculRapideReno({ ...base, mode: "pieces", pieces, aleas: 7 } as EntreeRapideReno, compte);
    const p = presetPieces(pieces as never, "complete", "standard", "pros", "75011");
    const avant = { ...p, ctx: { ...p.ctx, aleas: 7 } };
    expect(s.preset).toEqual(avant);
    expect(s.montants!.ttc).toBe(buildDevis(CATALOG, avant.ctx, avant.sel).totaux.ttc);
  });

  it("sans compte : aucun montant, seulement les % d'économie (et le preset, sans prix, pour le brouillon)", () => {
    const s = calculRapideReno(base, { compte: false, pro: false });
    expect(s.montants).toBeNull();
    expect(s.positif).toBe(true);
    expect(s.economies!.pct.pros).toBe(0);
    expect(s.economies!.pct.partie).toBeGreaterThan(0);
    expect(JSON.stringify(s)).not.toMatch(/"fp"|"sm"|"ttc"|"ht"/);
  });

  it("plusieurs types de pièces sans les droits Pro (paywall doux) : ni montant ni pourcentage, même avec un compte", () => {
    const e = { ...base, mode: "pieces", pieces: [{ room: "cuisine", surface: 10 }, { room: "sdb", surface: 5 }] } as EntreeRapideReno;
    const s = calculRapideReno(e, { compte: true, pro: false });
    expect(s.montants).toBeNull();
    expect(s.economies).toBeNull();
    expect(calculRapideReno(e, compte).montants).not.toBeNull();
  });

  it("neuf · mêmes montants que `presetNeuf` + moteur ; bilan seulement avec un compte, phases seulement Pro", () => {
    const R = { surface: 120, niveaux: "etage" as const, codePostal: "33000", finition: "standard" as const, qui: "pros" as const, garage: true };
    const avant = presetNeuf(R);
    const s = calculRapideNeuf({ nature: "neuf", R, locale: "fr" }, compte);
    expect(s.preset).toEqual(avant);
    expect(s.montants!.ttc).toBe(buildDevis(catalogueDe(avant.ctx), avant.ctx, avant.sel).totaux.ttc);
    expect(s.bilan!.ttc).toBe(s.montants!.ttc);
    expect(s.bilan!.phases!.length).toBeGreaterThan(0);
    expect(calculRapideNeuf({ nature: "neuf", R, locale: "fr" }, { compte: true, pro: false }).bilan!.phases).toBeNull();
    const anonyme = calculRapideNeuf({ nature: "neuf", R, locale: "fr" }, { compte: false, pro: false });
    expect(anonyme.montants).toBeNull();
    expect(anonyme.bilan).toBeNull();
    expect(JSON.stringify(anonyme)).not.toMatch(/"fp"|"sm"|"ttc"/);
  });

  it("entrées refusées : champs inconnus de la maison retirés, valeurs hors bornes et types inconnus rejetés", () => {
    expect(entreeRapideSchema.safeParse({ ...base, type: "Château" }).success).toBe(false);
    expect(entreeRapideSchema.safeParse({ ...base, pieces: [{ room: "piscine", surface: 10 }] }).success).toBe(false);
    const R = { surface: 120, niveaux: "pp", codePostal: "33000", finition: "standard", qui: "pros" };
    expect(entreeRapideSchema.safeParse({ nature: "neuf", R, base: { chambres: 500 }, locale: "fr" }).success).toBe(false);
    const ok = entreeRapideSchema.parse({ nature: "neuf", R, base: { chambres: 3, pirate: 1 }, locale: "fr" });
    expect(ok.nature === "neuf" && ok.base).toEqual({ chambres: 3 });
  });
});

describe("4 · GET /api/estimateur/bareme", () => {
  const getUser = vi.fn();
  const verifierLimite = vi.fn();
  const journaliser = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    getUser.mockReset(); verifierLimite.mockReset(); journaliser.mockReset();
    vi.doMock("@/lib/auth", () => ({ getUser }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite }));
    vi.doMock("@/lib/audit", () => ({ journaliser }));
  });
  it("sans compte : 401, rien n'est servi", async () => {
    getUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/estimateur/bareme/route");
    const r = await GET();
    expect(r.status).toBe(401);
    expect(await r.text()).not.toContain("fp");
    expect(verifierLimite).not.toHaveBeenCalled();
  });
  it("avec un compte : les deux catalogues, journalisé, plafonné par compte, jamais en cache partagé", async () => {
    getUser.mockResolvedValue({ id: "u1", email: "a@b.c" });
    verifierLimite.mockResolvedValue(true);
    const { GET } = await import("@/app/api/estimateur/bareme/route");
    const r = await GET();
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    const d = await r.json();
    expect(d).toEqual({ reno, neuf });
    expect(verifierLimite).toHaveBeenCalledWith("bareme", "u1");
    expect(journaliser).toHaveBeenCalledWith("bareme_charge", { userId: "u1", email: "a@b.c" });
  });
  it("au-delà du plafond : 429, et le refus est journalisé", async () => {
    getUser.mockResolvedValue({ id: "u1", email: "a@b.c" });
    verifierLimite.mockResolvedValue(false);
    const { GET } = await import("@/app/api/estimateur/bareme/route");
    const r = await GET();
    expect(r.status).toBe(429);
    expect(journaliser).toHaveBeenCalledWith("bareme_charge", expect.objectContaining({ payload: { refus: "limite" } }));
  });
});

describe("5 · installer le barème reconstruit les tables qui en dérivent", () => {
  it("une nouvelle installation (navigateur) remplit les conteneurs en place et réindexe les postes", () => {
    const avant = sourcesCatalogue()!;
    const ref = CATALOG, refNeuf = CATALOG_NEUF;
    const id = reno[0].t[0].id;
    const copie = JSON.parse(JSON.stringify(reno));
    copie[0].t[0].fp = 12345;
    try {
      installerCatalogues(copie, JSON.parse(JSON.stringify(neuf)));
      expect(CATALOG).toBe(ref);
      expect(CATALOG_NEUF).toBe(refNeuf);
      expect(posteParId(id)!.tache.fp).toBe(12345);
      expect(POSTE_NEUF.size).toBeGreaterThan(0);
    } finally {
      installerCatalogues(avant.reno, avant.neuf);
    }
    expect(posteParId(id)!.tache.fp).toBe(reno[0].t[0].fp);
  });
});

describe("6 · dans le NAVIGATEUR : rien avant l'installation, les mêmes montants après", () => {
  it("modules chargés comme dans le navigateur (window défini) : barème vide, puis installé → montants identiques au serveur", async () => {
    // Les montants de référence : les modules de ce fichier, chargés « côté serveur » (barème lu au chargement).
    const ref = await import("@/lib/estimateur");
    const R = { surface: 140, niveaux: "pp" as const, codePostal: "69003", finition: "premium" as const, qui: "partie" as const, garage: true };
    const pn = ref.presetNeuf(R);
    const attenduNeuf = ref.buildDevis(ref.catalogueDe(pn.ctx), pn.ctx, pn.sel).totaux;
    const pr = ref.presetRapide({ type: "Appartement" as never, surface: 64, codePostal: "13001", ampleur: "lourde", finition: "eco", qui: "pros" });
    const attenduReno = ref.buildDevis(ref.CATALOG, pr.ctx, pr.sel).totaux;

    vi.resetModules();
    const g = globalThis as { window?: unknown };
    g.window = {};
    try {
      const nav = await import("@/lib/estimateur");
      const cat = await import("@/lib/estimateur/catalogue-neuf");
      const liste = await import("@/lib/estimateur/liste-neuf");
      expect(cat.catalogueInstalle()).toBe(false);
      expect(nav.CATALOG).toHaveLength(0);
      expect(cat.CATALOG_NEUF).toHaveLength(0);
      expect(liste.LOTS_NEUF).toHaveLength(0);
      // Ce que fait `chargerBareme` avec la réponse de GET /api/estimateur/bareme.
      cat.installerCatalogues(JSON.parse(JSON.stringify(reno)), JSON.parse(JSON.stringify(neuf)));
      expect(cat.ANOMALIES_NEUF).toEqual([]);
      expect(liste.LOTS_NEUF.length).toBeGreaterThan(0);
      const pn2 = nav.presetNeuf(R);
      expect(pn2).toEqual(pn);
      expect(nav.buildDevis(nav.catalogueDe(pn2.ctx), pn2.ctx, pn2.sel).totaux).toEqual(attenduNeuf);
      const pr2 = nav.presetRapide({ type: "Appartement" as never, surface: 64, codePostal: "13001", ampleur: "lourde", finition: "eco", qui: "pros" });
      expect(nav.buildDevis(nav.CATALOG, pr2.ctx, pr2.sel).totaux).toEqual(attenduReno);
    } finally {
      delete g.window;
      vi.resetModules();
    }
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATALOG, presetRapide, presetPieces, key, type Ampleur, type TypeBien, type Finition, type QuiRealise } from "@/lib/estimateur";
import { posteParId, posteParNom, idDuPoste, tousLesPostes, libellesOrphelins, normaliserCles, ALIAS } from "@/lib/estimateur/identite";

const lire = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

describe("D16 · l'identifiant d'un poste ne bouge pas", () => {
  it("chaque poste en a un, et ils sont tous différents", () => {
    const ids = tousLesPostes().map((p) => p.id);
    expect(ids.length).toBe(CATALOG.reduce((s, l) => s + l.t.length, 0));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((i) => /^[a-z]{3}-[a-z0-9-]+$/.test(i))).toBe(true);
  });

  it("la liste des identifiants est figée — la modifier doit faire échouer le build", () => {
    const fige = lire("tests/postes-ids.txt").trim().split("\n");
    expect(tousLesPostes().map((p) => p.id)).toEqual(fige);
  });

  it("on retrouve un poste par son identifiant comme par son libellé", () => {
    const p = posteParId("dem-abattre-un-mur-porteur")!;
    expect(p.nom).toBe("Abattre un mur porteur");
    expect(p.lot).toBe("Démolition");
    expect(idDuPoste("Démolition", "Abattre un mur porteur")).toBe(p.id);
    expect(idDuPoste("Démolition", "Poste qui n'existe pas")).toBeNull();
  });

  it("un alias fait relire un ancien libellé vers le même poste", () => {
    ALIAS[key("Démolition", "Casser un mur porteur")] = "dem-abattre-un-mur-porteur";
    expect(posteParNom("Démolition", "Casser un mur porteur")?.id).toBe("dem-abattre-un-mur-porteur");
    delete ALIAS[key("Démolition", "Casser un mur porteur")];
  });
});

describe("D16 · garde : rien dans le moteur ne cite un poste qui n'existe pas", () => {
  it("les préréglages du mode rapide ne cochent que des postes réels", () => {
    const orphelins: Array<{ lot: string; nom: string; ou: string }> = [];
    const types: TypeBien[] = ["Studio", "T2", "T3", "T4", "Maison"];
    const ampleurs: Ampleur[] = ["rafraich", "partielle", "complete", "lourde"];
    for (const type of types) for (const ampleur of ampleurs) for (const qui of ["pros", "partie", "max"] as QuiRealise[]) {
      const { sel } = presetRapide({ type, surface: 80, codePostal: "33620", ampleur, finition: "standard" as Finition, qui });
      for (const k of Object.keys(sel)) {
        const i = k.indexOf("|");
        orphelins.push({ lot: k.slice(0, i), nom: k.slice(i + 1), ou: `preset ${type}/${ampleur}` });
      }
    }
    expect(libellesOrphelins(orphelins)).toEqual([]);
  });

  it("les préréglages par pièce ne cochent que des postes réels", () => {
    const orphelins: Array<{ lot: string; nom: string; ou: string }> = [];
    for (const room of ["cuisine", "sdb", "chambre", "salon", "suite", "buanderie"] as const)
      for (const ampleur of ["rafraich", "partielle", "complete", "lourde"] as Ampleur[]) {
        const { sel } = presetPieces([{ room, surface: 10 }], ampleur, "standard", "pros", "33620");
        for (const k of Object.keys(sel)) {
          const i = k.indexOf("|");
          orphelins.push({ lot: k.slice(0, i), nom: k.slice(i + 1), ou: `pièce ${room}/${ampleur}` });
        }
      }
    expect(libellesOrphelins(orphelins)).toEqual([]);
  });

  it("les quantités automatiques ne visent que des postes réels", () => {
    const src = lire("lib/estimateur/core.ts");
    const bloc = src.slice(src.indexOf("const A: Record<string, number> = {"), src.indexOf("return A[n] != null"));
    const noms = [...bloc.matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]);
    expect(noms.length).toBeGreaterThan(60);
    const connus = new Set(CATALOG.flatMap((l) => l.t.map((t) => t.n)));
    expect(noms.filter((n) => !connus.has(n))).toEqual([]);
  });

  it("les finitions dérivées ne lisent que des postes réels", () => {
    const src = lire("lib/estimateur/core.ts");
    const fn = src.slice(src.indexOf("export function derivedFinitions"), src.indexOf("export function autoQty"));
    const cites = [...fn.matchAll(/eff\((?:P|"([^"]+)"),\s*"([^"]+)"\)/g)].map((m) => ({ lot: m[1] ?? "Cloisons / Platrerie", nom: m[2], ou: "derivedFinitions" }));
    expect(cites.length).toBeGreaterThanOrEqual(4);
    expect(libellesOrphelins(cites)).toEqual([]);
  });

  it("la traduction anglaise ne traduit que des postes réels", () => {
    const src = lire("lib/estimateur/catalog-i18n.ts");
    const debut = src.indexOf('"postes": {');
    const bloc = src.slice(debut, src.indexOf("\n  },", debut)); /* jusqu'à la fin du bloc, pas jusqu'au bloc suivant */
    const noms = [...bloc.matchAll(/^\s*"([^"]+)":\s*"/gm)].map((m) => m[1]);
    expect(noms.length).toBeGreaterThan(150);
    const connus = new Set(CATALOG.flatMap((l) => l.t.map((t) => t.n)));
    expect(noms.filter((n) => !connus.has(n))).toEqual([]);
  });
});

describe("D16 · un projet enregistré survit à un renommage, sans migration", () => {
  const ANCIEN = key("Démolition", "Casser un mur porteur");
  const ACTUEL = key("Démolition", "Abattre un mur porteur");
  const avecAlias = (f: () => void) => { ALIAS[ANCIEN] = "dem-abattre-un-mur-porteur"; try { f(); } finally { delete ALIAS[ANCIEN]; } };

  it("sans alias, la fonction rend l'objet tel quel et n'alloue rien", () => {
    const sel = { [ACTUEL]: { on: true } };
    expect(normaliserCles(sel)).toBe(sel);
    expect(normaliserCles(undefined)).toEqual({});
  });

  it("une ligne enregistrée sous l'ancien libellé est relue sur le nouveau", () => {
    avecAlias(() => {
      const relu = normaliserCles({ [ANCIEN]: { on: true, qty: 12 } });
      expect(relu[ACTUEL]).toEqual({ on: true, qty: 12 });
      expect(relu[ANCIEN]).toBeUndefined();
    });
  });

  it("si les deux clés coexistent, la plus récente gagne et rien n'est perdu", () => {
    avecAlias(() => {
      const relu = normaliserCles({ [ANCIEN]: { qty: 12 }, [ACTUEL]: { qty: 20 } });
      expect(relu[ACTUEL]).toEqual({ qty: 20 });
      expect(Object.keys(relu).length).toBe(2); // l'ancienne reste, inerte, plutôt que d'écraser
    });
  });

  it("les statuts de chantier suivent la même route", () => {
    avecAlias(() => expect(normaliserCles({ [ANCIEN]: 2 })[ACTUEL]).toBe(2));
  });
});

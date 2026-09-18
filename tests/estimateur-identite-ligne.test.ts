import { describe, it, expect } from "vitest";
import {
  CATALOG, buildDevis, presetRapide, lineHT, effRate, visible, key,
  statutLigne, cleLegacy, type Selection,
} from "@/lib/estimateur";

const base = { type: "T3" as const, surface: 70, ampleur: "complete" as const, finition: "standard" as const, qui: "pros" as const };

/** Reproduit la sélection dérivée « tout fait faire » du composant de résultat. */
function selTouFaitFaire(sel: Selection): Selection {
  const out: Selection = {};
  for (const k of Object.keys(sel)) {
    const v = sel[k];
    if (!v) continue;
    const { self: _s, pu: _pu, pm: _pm, ...reste } = v;
    out[k] = { ...reste, self: false };
  }
  return out;
}

describe("identité stable des lignes de devis", () => {
  it("cle indexe toujours sel, même quand nom porte un libellé de variante", () => {
    const { ctx, sel } = presetRapide({ ...base, codePostal: "75011" });
    const dv = buildDevis(CATALOG, ctx, sel);
    expect(dv.lignes.length).toBeGreaterThan(0);
    for (const li of dv.lignes) expect(sel[li.cle], `sel[${li.cle}]`).toBeTruthy();
  });

  it("au moins une ligne a un nom suffixé — c'est le cas que l'ancienne clé cassait", () => {
    const { ctx, sel } = presetRapide({ ...base, codePostal: "75011" });
    const dv = buildDevis(CATALOG, ctx, sel);
    const suffixees = dv.lignes.filter((li) => cleLegacy(li) != null);
    expect(suffixees.length).toBeGreaterThan(0);
    for (const li of suffixees) expect(sel[key(li.corps, li.nom)]).toBeUndefined();
  });

  it("statutLigne relit les enregistrements à l'ancienne clé", () => {
    const { ctx, sel } = presetRapide({ ...base, codePostal: "75011" });
    const dv = buildDevis(CATALOG, ctx, sel);
    const li = dv.lignes.find((x) => cleLegacy(x) != null)!;
    expect(statutLigne({ [cleLegacy(li)!]: 2 }, li)).toBe(2);   // projet enregistré avant l'unification
    expect(statutLigne({ [li.cle]: 1, [cleLegacy(li)!]: 2 }, li)).toBe(1); // la clé stable gagne
    expect(statutLigne({}, li)).toBe(0);
  });
});

describe("référence « tout fait faire »", () => {
  it("vaut exactement le HT du devis quand l'utilisateur ne pose rien lui-même", () => {
    for (const cp of ["75011", "36000", "20000", "97400"]) {
      const { ctx, sel } = presetRapide({ ...base, codePostal: cp });
      const selFF = selTouFaitFaire(sel);
      let ffHT = 0;
      CATALOG.filter((l) => visible(ctx, l)).forEach((l) => l.t.forEach((t) => { ffHT += lineHT(ctx, selFF, l, t); }));
      expect(ffHT, `HT tout-fait-faire ${cp}`).toBeCloseTo(buildDevis(CATALOG, ctx, selFF).totaux.ht, 6);
      expect(ffHT).toBeGreaterThan(0);
    }
  });

  it("suit le coefficient régional : Paris > moyenne nationale", () => {
    const mesure = (cp: string) => {
      const { ctx, sel } = presetRapide({ ...base, codePostal: cp });
      const selFF = selTouFaitFaire(sel);
      let ht = 0, tva = 0;
      CATALOG.filter((l) => visible(ctx, l)).forEach((l) => l.t.forEach((t) => {
        const h = lineHT(ctx, selFF, l, t);
        ht += h; tva += (h * effRate(l, t, selFF, ctx)) / 100;
      }));
      return ht + tva;
    };
    expect(mesure("75011")).toBeGreaterThan(mesure("36000"));
  });
});

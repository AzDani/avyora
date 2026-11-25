/**
 * HT / TTC et TVA ligne par ligne (25/11/2026, maquette V4 validée par Dani) : lib/estimateur/tva.ts et les
 * retouches du moteur (taux forcé, prix tapé TTC). Par défaut, rien ne change.
 */
import { describe, it, expect } from "vitest";
import { CATALOG, defaultCtx, key, totals, lineHT, effRate, presetRapide, prixHTPerso, customTotals, type Ctx, type Selection, type CustomLine } from "@/lib/estimateur";
import { tauxAuto, alerteTaux, nbRetouches, toutAutomatique, revenirAuto, quiFait, toutFaire, tvaParTaux, coutRetenu, totalAffiche, choisirPayeur, choisirAffichage, montant, lotAffiche } from "@/lib/estimateur/tva";
import { lignePrix, ligneMateriaux } from "@/lib/estimateur/detaille-reno";

const P = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
const LOT = "Peinture", POSTE = "Peinture des murs";
const l = CATALOG.find((x) => x.c === LOT)!, t = l.t.find((x) => x.n === POSTE)!;
const K = key(LOT, POSTE);
const ligne = (s: Selection[string]): Selection => ({ [K]: { on: true, manual: true, qty: 10, ...s } });

describe("par défaut, rien ne change", () => {
  it("affichage et qui paie ne touchent jamais au calcul", () => {
    const a = totals(CATALOG, P.ctx, P.sel);
    for (const ctx of [choisirAffichage(P.ctx, true), choisirPayeur(P.ctx, true)]) expect(totals(CATALOG, ctx, P.sel)).toEqual(a);
  });
  it("choisir « Professionnel » passe l'affichage en HT ; revenir en particulier le remet en TTC", () => {
    const pro = choisirPayeur(P.ctx, true);
    expect(pro).toMatchObject({ payeur: "pro", affichage: "ht" });
    const part = choisirPayeur(pro, false);
    expect(part.payeur).toBeUndefined(); expect(part.affichage).toBeUndefined();
  });
  it("coût retenu et total affiché", () => {
    const tot = totals(CATALOG, P.ctx, P.sel);
    expect(coutRetenu(tot, P.ctx)).toBe(tot.ttc);
    expect(coutRetenu(tot, { payeur: "pro" })).toBeCloseTo(tot.ht + tot.aleas, 6);
    expect(totalAffiche(tot, { affichage: "ht" })).toBeCloseTo(tot.ht + tot.aleas, 6);
    expect(montant(100, 10, {})).toBeCloseTo(110, 6);
    expect(montant(100, 10, { affichage: "ht" })).toBe(100);
  });
});

describe("taux forcé (s.tva)", () => {
  const ctx: Ctx = defaultCtx();
  it("remplace le taux automatique ; le HT ne bouge pas", () => {
    const auto = effRate(l, t, ligne({}), ctx);
    expect(auto).toBe(10);
    expect(effRate(l, t, ligne({ tva: 5.5 }), ctx)).toBe(5.5);
    expect(tauxAuto(l, t, ligne({ tva: 5.5 }), ctx)).toBe(10);
    expect(lineHT(ctx, ligne({ tva: 5.5 }), l, t)).toBeCloseTo(lineHT(ctx, ligne({}), l, t), 6);
  });
  it("prévient sans bloquer : taux réduit sur « Je le fais », en local pro", () => {
    expect(alerteTaux(l, t, ligne({ tva: 10, self: true }), ctx)).toBe("soi");
    expect(alerteTaux(l, t, ligne({ tva: 10 }), { ...ctx, fiscal: "pro" })).toBe("neuf");
    expect(alerteTaux(l, t, ligne({ tva: 5.5 }), ctx)).toBe("energie");
    expect(alerteTaux(l, t, ligne({}), ctx)).toBeNull();
  });
});

describe("prix tapé TTC : le chiffre reste fixe (décision 3)", () => {
  const ctx: Ctx = defaultCtx();
  it("« Fait faire » : pu TTC ramené au HT au taux de la ligne", () => {
    const s = ligne({}), s2 = { [K]: lignePrix(110, true)(s[K]) };
    expect(s2[K]).toMatchObject({ pu: 110, puTtc: true });
    expect(lineHT(ctx, s2, l, t)).toBeCloseTo(1000, 6);
    // Le taux change : le TTC tapé reste 110, le HT suit.
    const s3 = { [K]: { ...s2[K], tva: 20 } };
    expect(lineHT(ctx, s3, l, t) / 10 * 1.2).toBeCloseTo(110, 6);
  });
  it("tapé HT (pas de drapeau) : comme avant", () => {
    const s = { [K]: lignePrix(100)(ligne({})[K]) };
    expect(s[K].puTtc).toBeUndefined();
    expect(lineHT(ctx, s, l, t)).toBeCloseTo(1000, 6);
  });
  it("« Je le fais » : pm TTC au taux des matériaux (20 %)", () => {
    const s = { [K]: { ...ligneMateriaux(12, true)(ligne({})[K]), self: true } };
    expect(lineHT(ctx, s, l, t)).toBeCloseTo(100, 6);
  });
  it("ligne perso tapée TTC", () => {
    const x: CustomLine = { id: "a", lot: LOT, nom: "x", prix: 110, unite: "u", qte: 2, tva: 10, ttc: true };
    expect(prixHTPerso(x)).toBeCloseTo(100, 6);
    expect(customTotals([x]).ht).toBeCloseTo(200, 6);
    expect(prixHTPerso({ ...x, ttc: undefined })).toBe(110);
  });
});

describe("retouches, « Tout remettre en automatique », qui fait les travaux", () => {
  it("compte et efface taux et prix, jamais les quantités", () => {
    const sel: Selection = { [K]: { on: true, manual: true, qty: 7, tva: 5.5, pu: 50, puTtc: true, pm: 9 } };
    expect(nbRetouches(sel)).toBe(3);
    const z = toutAutomatique(sel);
    expect(z[K]).toEqual({ on: true, manual: true, qty: 7 });
    expect(revenirAuto(sel, LOT, POSTE)[K]).toEqual({ on: true, manual: true, qty: 7 });
  });
  it("Artisans / Moi pour tout le projet ; un poste réservé aux pros ne passe jamais en « Moi »", () => {
    const ctx = P.ctx;
    const soi = toutFaire(CATALOG, ctx, P.sel, true);
    expect(quiFait(CATALOG, ctx, soi)).toBe("soi");
    expect(quiFait(CATALOG, ctx, toutFaire(CATALOG, ctx, soi, false))).toBe("art");
    for (const lot of CATALOG) for (const tache of lot.t) if (tache.pro && soi[key(lot.c, tache.n)]) expect(soi[key(lot.c, tache.n)].self).toBeFalsy();
  });
});

describe("TVA par taux", () => {
  it("la somme des TVA par taux = la TVA du total ; le montant d'un lot suit l'affichage", () => {
    const tot = totals(CATALOG, P.ctx, P.sel);
    const parTaux = tvaParTaux(CATALOG, P.ctx, P.sel);
    expect(parTaux.reduce((s, x) => s + x.tva, 0)).toBeCloseTo(tot.tva, 4);
    expect(parTaux.reduce((s, x) => s + x.ht, 0)).toBeCloseTo(tot.ht, 4);
    const lot = CATALOG.find((x) => x.c === LOT)!;
    const ht = lotAffiche({ ...P.ctx, affichage: "ht" }, P.sel, lot), ttc = lotAffiche(P.ctx, P.sel, lot);
    expect(ttc).toBeGreaterThan(ht);
  });
});

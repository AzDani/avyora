/**
 * La vignette calculée par le serveur (chantier C2) : rien que des nombres et des codes d'une liste
 * fermée, quel que soit ce que le client a envoyé.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { apercuDepuisEtat, APERCU_MURS_MAX, APERCU_STATUTS, APERCU_TYPES } from "@/lib/plans/apercu";

const DOSSIER = path.join(__dirname, "fixtures", "plans-etats");
const FICHIERS = readdirSync(DOSSIER).filter((f) => f.endsWith(".json")).sort();
const etat = (f: string) => JSON.parse(readFileSync(path.join(DOSSIER, f), "utf8"));
const OCTETS_MAX = 131072; /* CHECK floor_plans_apercu_taille */

function seulementSur(ap: unknown) {
  expect(Array.isArray(ap)).toBe(true);
  for (const m of ap as unknown[]) {
    expect(Array.isArray(m)).toBe(true);
    const [ax, ay, bx, by, t, st, ...reste] = m as unknown[];
    expect(reste).toEqual([]);
    for (const n of [ax, ay, bx, by]) {
      expect(typeof n).toBe("number");
      expect(Number.isFinite(n)).toBe(true);
      expect(Math.abs(n as number)).toBeLessThanOrEqual(10000);
    }
    expect(APERCU_TYPES).toContain(t);
    expect(APERCU_STATUTS).toContain(st);
  }
}

describe("apercuDepuisEtat sur les états réels", () => {
  it.each(FICHIERS)("%s : nombres et codes fermés, idempotent, état intact", (f) => {
    const e = etat(f);
    const avant = JSON.stringify(e);
    const a1 = apercuDepuisEtat(e);
    const a2 = apercuDepuisEtat(e);
    seulementSur(a1);
    expect(a1.length).toBeGreaterThan(0);
    expect(a2).toEqual(a1);
    expect(apercuDepuisEtat(JSON.parse(avant))).toEqual(a1);
    expect(JSON.stringify(e)).toBe(avant);
    /* Les séparations ne sont pas dessinées. */
    const lv = e.levels[e.cur ?? 0];
    expect(a1.length).toBe(lv.walls.filter((w: { type: string }) => w.type !== "virtuel").length);
  });

  it("pire cas : sous les 128 Ko de la colonne", () => {
    const ap = apercuDepuisEtat(etat("pire-cas.json"));
    expect(Buffer.byteLength(JSON.stringify(ap))).toBeLessThanOrEqual(OCTETS_MAX);
  });

  it("le cas extrême : 2 000 murs aux coordonnées les plus longues tiennent dans la colonne", () => {
    const walls = Array.from({ length: 5000 }, (_, i) => ({
      id: "w" + i, a: { x: -9999.123456789, y: -9999.987654321 }, b: { x: 9999.111111111, y: -9999.555555555 },
      type: "cloison", st: "demolir",
    }));
    const ap = apercuDepuisEtat({ levels: [{ walls }] });
    expect(ap.length).toBe(APERCU_MURS_MAX);
    expect(Buffer.byteLength(JSON.stringify(ap))).toBeLessThanOrEqual(OCTETS_MAX);
  });
});

describe("apercuDepuisEtat ne laisse rien passer", () => {
  it("types et statuts hors liste ramenés à la liste fermée", () => {
    const ap = apercuDepuisEtat({
      levels: [{ walls: [
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, type: '"><script>', st: "' onload='x" },
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, type: "porteur", st: "creer" },
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, type: "virtuel" },
      ] }],
    });
    expect(ap).toEqual([[0, 0, 1, 0, "mur", ""], [0, 0, 1, 0, "porteur", "creer"]]);
  });

  it("nombres : chaînes converties, non finis écartés, bornés, arrondis au centimètre", () => {
    const ap = apercuDepuisEtat({
      levels: [{ walls: [
        { a: { x: "2.5", y: 1 }, b: { x: 3, y: 1 }, type: "mur" },
        { a: { x: "0\" onload=\"x", y: 1 }, b: { x: 3, y: 1 }, type: "mur" },
        { a: { x: Infinity, y: 1 }, b: { x: 3, y: 1 }, type: "mur" },
        { a: { x: 1e12, y: -1e12 }, b: { x: 1.23456, y: -0.0001 }, type: "mur" },
        { a: null, b: { x: 3, y: 1 } },
        "pas un mur",
      ] }],
    });
    expect(ap).toEqual([[2.5, 1, 3, 1, "mur", ""], [10000, -10000, 1.23, 0, "mur", ""]]);
    expect(Object.is(ap[1][3], -0)).toBe(false);
  });

  it("niveau affiché borné : cur hors bornes ou absurde", () => {
    const lv = (x: number) => ({ walls: [{ a: { x, y: 0 }, b: { x, y: 1 }, type: "mur" }] });
    const levels = [lv(1), lv(2), lv(3)];
    expect(apercuDepuisEtat({ levels, cur: 1 })[0][0]).toBe(2);
    expect(apercuDepuisEtat({ levels, cur: 99 })[0][0]).toBe(3);
    expect(apercuDepuisEtat({ levels, cur: -4 })[0][0]).toBe(1);
    expect(apercuDepuisEtat({ levels, cur: "1); alert(1" })[0][0]).toBe(1);
    expect(apercuDepuisEtat({ levels, cur: 1.5 })[0][0]).toBe(1);
  });

  it("entrées vides ou fausses : liste vide", () => {
    expect(apercuDepuisEtat(null)).toEqual([]);
    expect(apercuDepuisEtat("x")).toEqual([]);
    expect(apercuDepuisEtat({ levels: [] })).toEqual([]);
    expect(apercuDepuisEtat({ levels: [{}] })).toEqual([]);
  });
});

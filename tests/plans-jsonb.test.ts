/**
 * Tailles mesurées comme Postgres les mesure (chantier C1b).
 *
 * Les CHECK de `floor_plans` bornent `octet_length(colonne::text)`, et le texte d'un jsonb n'est pas le
 * JSON compact : une espace après « : » et « , », des nombres sans exposant. Les valeurs attendues
 * ci-dessous ont été relevées sur un vrai Postgres 16 (PGlite) par `scratchpad/plans/c1-pg/tailles.mts`,
 * qui compare aussi chaque état réel et vérifie qu'un état accepté par zod passe le CHECK.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { nombreJsonb, octetsJsonb } from "@/lib/plans/jsonb";
import { apercuDepuisEtat } from "@/lib/plans/apercu";
import {
  etatPlanSchema,
  planCreerSchema,
  resumeSchema,
  PLAN_APERCU_OCTETS_MAX,
  PLAN_ETAT_OCTETS_MAX,
} from "@/lib/plans/schema";

const fixture = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

/* octet_length(x::jsonb::text), relevé sur Postgres 16. */
const POSTGRES: Array<[string, unknown, number]> = [
  ["objet simple", { a: 1, b: [1, 2], c: {}, d: [], e: null, f: true, g: false }, 73],
  ["nombres extrêmes",
    [1e-7, 1e21, 1.5e300, -0, 3.552713678800501e-15, 1.2345678901234568e20, 0.1, -1e-300, 5e-324, 1.7976931348623157e308, 123.456e-10, -2.5e25],
    1393],
  ["chaînes", ["é", " ", "\n\t\r\b\f", "\u0001\u001f\u007f", "/", "\"\\", "😀", "日本語", ""], 82],
  ["clés", { "é": 1, "a\"b": 2, "\n": 3, "": 4, "😀": [] }, 48],
  ["imbrication", { a: { b: { c: [[[{}]]] } } }, 29],
  ["état exemple.json", fixture("plans-etats/exemple.json"), 9467],
  ["état maison.json", fixture("plans-etats/maison.json"), 10645],
  ["état pire-cas.json", fixture("plans-etats/pire-cas.json"), 196669],
  ["état plan-final-etage.json", fixture("plans-etats/plan-final-etage.json"), 13320],
  ["état studio.json", fixture("plans-etats/studio.json"), 4810],
  ["état t2.json", fixture("plans-etats/t2.json"), 8254],
  ["état t3.json", fixture("plans-etats/t3.json"), 8781],
  ["contrat plan-contrat.json", fixture("plan-contrat.json"), 21031],
  ["contrat plan-final-contrat.json", fixture("plan-final-contrat.json"), 28600],
];

describe("octetsJsonb = octet_length(valeur::jsonb::text)", () => {
  it.each(POSTGRES)("%s", (_nom, v, attendu) => {
    expect(octetsJsonb(v)).toBe(attendu);
  });

  it("le JSON compact sous-estime : +17 % sur un plan réel", () => {
    const e = fixture("plans-etats/pire-cas.json");
    const compact = Buffer.byteLength(JSON.stringify(e));
    expect(octetsJsonb(e) / compact).toBeGreaterThan(1.15);
  });

  it("les nombres sont écrits sans exposant, comme numeric_out", () => {
    expect(nombreJsonb(1e-7)).toBe("0.0000001");
    expect(nombreJsonb(3.552713678800501e-15)).toBe("0.000000000000003552713678800501");
    expect(nombreJsonb(1e21)).toBe("1" + "0".repeat(21));
    expect(nombreJsonb(-2.5e25)).toBe("-25" + "0".repeat(24));
    expect(nombreJsonb(1.2345678901234568e20)).toBe("123456789012345680000");
    expect(nombreJsonb(-0)).toBe("0");
    expect(nombreJsonb(9999.12)).toBe("9999.12");
  });

  it("ce que jsonb refuse compte pour l'infini : caractère nul, moitié de paire UTF-16", () => {
    expect(octetsJsonb({ a: "x\u0000y" })).toBe(Infinity);
    expect(octetsJsonb({ ["a\u0000"]: 1 })).toBe(Infinity);
    expect(octetsJsonb({ a: "\ud800" })).toBe(Infinity);
    expect(octetsJsonb({ a: "\udc00x" })).toBe(Infinity);
    expect(octetsJsonb({ a: "😀" })).toBe(13); /* une paire complète passe */
  });
});

describe("un état accepté par zod n'est jamais refusé par le CHECK", () => {
  /* Le bruit de la géométrie : 21 octets en JSON compact, 32 dans Postgres. */
  const base = fixture("plans-etats/maison.json") as Record<string, unknown>;
  const avec = (n: number) => ({ ...base, bruit: Array.from({ length: n }, () => 3.552713678800501e-15) });

  it("à la limite exacte de Postgres : accepté ; un nombre de plus : refusé", () => {
    /* 29 098 nombres : 999 988 octets dans Postgres (relevé par tailles.mts, accepté par le CHECK). */
    expect(octetsJsonb(avec(29098))).toBe(999988);
    expect(etatPlanSchema.safeParse(avec(29098)).success).toBe(true);
    expect(octetsJsonb(avec(29099))).toBeGreaterThan(PLAN_ETAT_OCTETS_MAX);
    expect(etatPlanSchema.safeParse(avec(29099)).success).toBe(false);
  });

  it("l'ancienne mesure (JSON compact) aurait laissé passer un état que le CHECK refuse", () => {
    const e = avec(29099);
    expect(Buffer.byteLength(JSON.stringify(e))).toBeLessThan(PLAN_ETAT_OCTETS_MAX * 0.7);
    expect(etatPlanSchema.safeParse(e).success).toBe(false);
  });

  it("vue et résumé : même mesure (4 000 octets dans Postgres)", () => {
    const etat = fixture("plans-etats/t2.json");
    /* 3 601 octets compacts, 4 400 dans Postgres. */
    const vue = Object.fromEntries(Array.from({ length: 400 }, (_, i) => ["k" + String(i).padStart(3, "0"), 1]));
    expect(Buffer.byteLength(JSON.stringify(vue))).toBeLessThanOrEqual(4000);
    expect(octetsJsonb(vue)).toBeGreaterThan(4000);
    expect(planCreerSchema.safeParse({ nom: "T2", etat, vue }).success).toBe(false);
    expect(resumeSchema.safeParse({ prochain: "\ud800" }).success).toBe(false);
  });

  it("la vignette la plus lourde possible tient dans le CHECK floor_plans_apercu_taille", () => {
    const walls = Array.from({ length: 5000 }, (_, i) => ({
      id: "w" + i, a: { x: -9999.123456789, y: -9999.987654321 }, b: { x: 9999.111111111, y: -9999.555555555 },
      type: "cloison", st: "demolir",
    }));
    const ap = apercuDepuisEtat({ levels: [{ walls }] });
    expect(octetsJsonb(ap)).toBe(126000); /* relevé sur Postgres */
    expect(octetsJsonb(ap)).toBeLessThanOrEqual(PLAN_APERCU_OCTETS_MAX);
  });

  it("caractère nul ou moitié de paire : refusés par zod (Postgres les refuserait en erreur 500)", () => {
    const e = fixture("plans-etats/maison.json");
    expect(etatPlanSchema.safeParse({ ...e, notes: "a\u0000b" }).success).toBe(false);
    expect(etatPlanSchema.safeParse({ ...e, notes: "a\ud800b" }).success).toBe(false);
    expect(etatPlanSchema.safeParse({ ...e, ["n\u0000"]: 1 }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "a\u0000", etat: e }).success).toBe(false);
    expect(etatPlanSchema.safeParse({ ...e, notes: "Cuisine 😀 côté jardin" }).success).toBe(true);
  });
});

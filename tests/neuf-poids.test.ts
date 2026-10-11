/**
 * Poids du neuf dans le JS de la rénovation (constat du jury) : le dictionnaire global, envoyé à
 * chaque page par `LangProvider`, ne porte aucune clé du neuf, et l'estimateur rapide de la
 * rénovation n'importe pas le baril `@/lib/estimateur` (qui réexporte le moteur du neuf).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

const lire = (f: string) => fs.readFileSync(f, "utf8");
function cles(o: unknown, p = ""): string[] {
  if (!o || typeof o !== "object") return [p];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (typeof v === "function" ? [p + k] : cles(v, p + k + ".")));
}

describe("Le neuf hors du bundle commun", () => {
  it("le dictionnaire global n'a pas de namespace neuf", () => {
    for (const l of ["fr", "en"] as const) expect(Object.keys(dict(l))).not.toContain("neuf");
    expect(lire("lib/i18n/dictionaries.ts")).not.toMatch(/i18n\/neuf|from "\.\/neuf/);
    expect(lire("components/i18n/LangProvider.tsx")).not.toMatch(/neuf/);
  });

  it("FR et EN du neuf ont les mêmes clés, et le complet reprend les libellés courts", () => {
    expect(cles(dictNeuf("en")).sort()).toEqual(cles(dictNeuf("fr")).sort());
    expect(cles(dictNeufCommun("en")).sort()).toEqual(cles(dictNeufCommun("fr")).sort());
    for (const l of ["fr", "en"] as const) expect(dictNeuf(l)).toMatchObject(dictNeufCommun(l));
  });

  it("l'estimateur rapide de la rénovation n'importe pas le baril, et le baril ne réexporte pas les écrans du neuf", () => {
    expect(lire("components/EstimateurRapide.tsx")).not.toMatch(/from "@\/lib\/estimateur"/);
    const baril = lire("lib/estimateur/index.ts");
    for (const m of ["etapes-neuf", "questions-neuf", "brouillon-neuf", "detaille-neuf", "plan-neuf"]) expect(baril).not.toMatch(new RegExp(`from "\\./${m}"`));
  });
});

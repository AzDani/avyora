/**
 * Provision pour aléas par défaut (décision D7 de Dani, 13/10/2026) : 10 % pour une RÉNOVATION,
 * 7 % pour une CONSTRUCTION NEUVE. Seuls les nouveaux projets prennent ces valeurs : un projet
 * enregistré garde ses aléas, à l'affichage comme quand on le rouvre (ses réponses ne sont pas
 * réécrites).
 *
 * Partout où un défaut réno est posé : `defaultCtx` (détaillé, plan → estimation, guides),
 * `presetRapide` (rapide, pages de prix par ville, guides), `presetPieces` (rapide « pièces »),
 * `estimProjet` (pages /prix-travaux). Le neuf : `ctxNeuf` (rapide, détaillé, plan neuf).
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ALEAS_RENO, ALEAS_NEUF, CATALOG, buildDevis, catalogueDe, defaultCtx, estimationProjet, presetRapide, presetPieces, presetNeuf,
  presetMaison, maisonParDefaut, ctxNeuf, type Ctx,
} from "@/lib/estimateur";
import { ctxDepuisPlan } from "@/lib/estimateur/plan-ctx";
import { etatParDefaut, ctxDetailNeuf, repriseDepuisReponses } from "@/lib/estimateur/detaille-neuf";
import { editionRapideReno, reponsesRapideReno } from "@/lib/estimateur/rapide-reno";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimationResultat from "@/components/EstimationResultat";

vi.mock("server-only", () => ({}));

const CONTRAT = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as Record<string, unknown>;
const texte = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/[\s  ]+/g, " ");
const BIEN = { type: "Maison" as const, surface: 100, codePostal: "45000", ampleur: "complete" as const, finition: "standard" as const, qui: "pros" as const };

describe("D7 · aléas par défaut : 10 % en rénovation, 7 % en construction neuve", () => {
  it("les deux constantes", () => {
    expect(ALEAS_RENO).toBe(10);
    expect(ALEAS_NEUF).toBe(7);
  });

  it("rénovation : détaillé, rapide, pièces et plan → estimation partent de 10 %", () => {
    expect(defaultCtx().aleas).toBe(10);
    expect(presetRapide(BIEN).ctx.aleas).toBe(10);
    expect(presetPieces([{ room: "sdb", surface: 6 }], "complete", "standard", "pros", "45000").ctx.aleas).toBe(10);
    expect(ctxDepuisPlan(CONTRAT).aleas).toBe(10);
  });

  it("construction neuve : rapide, détaillé et page vierge restent à 7 %", () => {
    expect(presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" }).ctx.aleas).toBe(7);
    expect(presetMaison(maisonParDefaut()).ctx.aleas).toBe(7);
    expect(ctxNeuf(maisonParDefaut()).aleas).toBe(7);
    expect(ctxDetailNeuf(etatParDefaut()).aleas).toBe(7);
  });

  it("la provision vaut 10 % du HT hors études en rénovation, et elle seule bouge", () => {
    const p = presetRapide(BIEN);
    const dv10 = buildDevis(CATALOG, p.ctx, p.sel);
    const dv7 = buildDevis(CATALOG, { ...p.ctx, aleas: 7 }, p.sel);
    expect(dv10.totaux.ht).toBe(dv7.totaux.ht);
    expect(dv10.totaux.tva).toBe(dv7.totaux.tva);
    expect(dv10.lignes).toEqual(dv7.lignes);
    expect(dv10.totaux.aleas).toBeCloseTo((dv7.totaux.aleas * 10) / 7, 6);
    expect(dv10.totaux.ttc - dv7.totaux.ttc).toBeCloseTo((dv7.totaux.aleas * 3) / 7, 6);
  });

  it("pages /prix-travaux : la même provision que l'estimateur (10 %)", async () => {
    const { PROJETS, estimProjet } = await import("@/lib/seo-projets");
    const sansEtudes = PROJETS.filter((pr) => pr.tasks.every((t) => t[0] !== "Etudes / Conception"));
    expect(sansEtudes.length).toBeGreaterThan(5);
    for (const pr of sansEtudes) {
      const e = estimProjet(pr, "");
      // HT et aléas sont arrondis à l'euro chacun : la provision = 10 % du HT (aucune étude), à 1 € près.
      expect(e.aleas).toBeGreaterThan(0);
      expect(Math.abs(e.aleas - e.ht * 0.1)).toBeLessThanOrEqual(1);
    }
  });

  it("pages de prix par ville et guides (seo-prix) : le rapide, donc 10 %", async () => {
    const { estim } = await import("@/lib/seo-prix");
    const p = presetRapide(BIEN);
    expect(estim("45000", "Maison", 100, "complete").ttc).toBe(Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc));
  });
});

describe("D7 · un projet enregistré garde ses aléas", () => {
  const p = presetRapide(BIEN);
  const ancien = { ...p.ctx, aleas: 7 } as Ctx; // enregistré avant D7

  it("liste et fiche : chiffrés avec SES aléas (7 %), pas avec le nouveau défaut", () => {
    const reponses = { v: "estimateur", mode: "detaille", ctx: ancien, sel: p.sel, codePostal: "45000" };
    const dv = buildDevis(CATALOG, ancien, p.sel);
    expect(estimationProjet(reponses)!.ttc).toBe(dv.totaux.ttc);
    const t = texte(renderToStaticMarkup(createElement(LangProvider, { locale: "fr", children: createElement(EstimationResultat, { reponses: reponses as never }) })));
    expect(t).toContain("Aléas 7 %");
  });

  it("rapide rouvert (« Modifier ») : la reprise porte ses aléas, l'écran les applique au lieu du défaut", () => {
    const rep = JSON.parse(JSON.stringify(reponsesRapideReno({ ampleur: "complete", qui: "pros", ctx: ancien, sel: p.sel, codePostal: "45000" })));
    expect(editionRapideReno("p1", rep, "45000").aleas).toBe(7);
    // Un détaillé rouvert en gratuit aussi.
    expect(editionRapideReno("p2", { ...rep, mode: "detaille" }, "45000").aleas).toBe(7);
    // Des réponses sans aléas lisibles : le défaut (rien n'est repris).
    expect(editionRapideReno("p3", { ...rep, ctx: { ...rep.ctx, aleas: "x" } }, "45000").aleas).toBeUndefined();
    expect(fs.readFileSync("components/EstimateurRapide.tsx", "utf8"))
      .toContain("return edit?.aleas != null ? { ...p, ctx: { ...p.ctx, aleas: edit.aleas } } : p;");
  });

  it("détaillé neuf rouvert : ses aléas sont repris tels quels", () => {
    const n = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
    const r = repriseDepuisReponses({ v: "estimateur", mode: "detaille", ctx: { ...n.ctx, aleas: 12 }, sel: n.sel, codePostal: "45000" })!;
    expect(r.etat.aleas).toBe(12);
    expect(buildDevis(catalogueDe(n.ctx), ctxDetailNeuf(r.etat), n.sel).totaux.aleas)
      .toBeCloseTo((buildDevis(catalogueDe(n.ctx), n.ctx, n.sel).totaux.aleas * 12) / 7, 6);
  });
});

/**
 * Le texte tel que le compilateur de Next (SWC) le produit, pas le source : un texte JSX sur plusieurs
 * lignes qui contient une entité (`&apos;`) y perd l'espace qui le sépare de l'élément ou de
 * l'expression qui le précède sur la même ligne (« par défautest ajoutée », « (7% pour »). Vitest
 * compile autrement et ne le voit pas : on passe donc la page par SWC et on recolle ses enfants.
 */
async function texteCompile(fichier: string): Promise<string> {
  const swc = await import("next/dist/build/swc/index.js");
  await swc.loadBindings();
  const { code } = await swc.transform(fs.readFileSync(fichier, "utf8"), {
    jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2022" },
  });
  // Les chaînes sortent échappées (« d\xe9faut ») : on les décode pour lire le texte.
  return (code as string)
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

describe("D7 · les textes publics citent la constante, plus « 7 % » en dur", () => {
  it("méthode : les deux taux, et les espaces que le compilateur garde", async () => {
    const methode = fs.readFileSync("app/methodologie/page.tsx", "utf8");
    expect(methode).toContain("{ALEAS_RENO}&nbsp;% par défaut");
    expect(methode).toContain("({ALEAS_NEUF}&nbsp;% pour une construction neuve");
    expect(methode).not.toMatch(/7 % par défaut/);
    const c = await texteCompile("app/methodologie/page.tsx");
    // Aléas : « 10 % par défaut est ajoutée au total d'une rénovation (7 % pour une construction neuve ».
    expect(c).toMatch(/ALEAS_RENO,\s*"\u00a0% par défaut"\s*\]\s*\}\),\s*" ",\s*"est ajoutée au total d'une rénovation \(",\s*ALEAS_NEUF,\s*"\u00a0% pour une construction neuve/);
    // TVA (même défaut, déjà en ligne avant D7) : « 10 % pour la rénovation », « 5,5 % sur les travaux » ; « % » après
    // une espace insécable depuis F1.
    expect(c).toMatch(/children: "10\u00a0%"\s*\}\),\s*" ",\s*"pour la rénovation/);
    expect(c).toMatch(/deux ans, ",\s*\/\*#__PURE__\*\/ _jsx\("strong", \{\s*children: "5,5\u00a0%"\s*\}\),\s*" ",\s*"sur les travaux/);
    // Aucun texte de ces deux paragraphes collé à l'élément qui le précède.
    expect(c).not.toMatch(/\}\),\s*"(est ajoutée|pour la rénovation|sur les travaux)/);
    const faq = fs.readFileSync("app/prix-travaux/page.tsx", "utf8");
    expect(faq).toContain("provision de ${ALEAS_RENO}\\u00a0% pour imprévus");
    expect(faq).not.toContain("provision de 7 %");
  });
});

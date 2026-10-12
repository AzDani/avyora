/**
 * C10 · la mesure de l'éditeur de plan côté site (`lib/plans/mesure.ts`) et le relais de l'éditeur.
 *
 * - cinq événements, des propriétés fermées (codes, booléens) : jamais de nom de plan, de code postal ni de surface ;
 * - interrupteur éteint : rien n'est émis ;
 * - `clic_plan` : une origine hors de la liste fermée est ignorée ; chaque lien vers la vitrine ou l'éditeur porte une
 *   origine de la liste, et chaque origine de la liste sert ;
 * - aucune nouvelle conversion Google Ads.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { MesurePlan } from "@/lib/plans/mesure";

const RACINE = path.resolve(__dirname, "..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");

async function charger(plans: boolean) {
  vi.resetModules();
  const suivre = vi.fn();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, plans } };
  });
  vi.doMock("@/lib/track", () => ({ suivre }));
  const mod = await import("@/lib/plans/mesure");
  return { ...mod, suivre };
}

afterEach(() => {
  vi.doUnmock("@/lib/features");
  vi.doUnmock("@/lib/track");
});

/** Une propriété qui ne doit jamais partir : nom de plan, code postal, surface, adresse. */
const INTERDIT = /nom|name|cp|postal|surface|m2|adresse|email/i;
function sansDonneePersonnelle(m: MesurePlan | null) {
  if (!m) return;
  for (const [k, v] of Object.entries(m[1])) {
    expect(k).not.toMatch(INTERDIT);
    expect(["string", "boolean"]).toContain(typeof v);
    if (typeof v === "string") expect(v).toMatch(/^[a-z_]{1,20}$/);
  }
}

describe("C10 · les mesures (pures)", () => {
  it("clic_plan : les neuf origines de la liste, et rien d'autre (un nom inconnu est ignoré)", async () => {
    const { ORIGINES_CLIC_PLAN, mesureClic } = await charger(true);
    expect([...ORIGINES_CLIC_PLAN]).toEqual(["nav", "nav_mobile", "accueil", "vitrine_haut", "vitrine_bas", "choix", "projets", "neuf", "pied"]);
    for (const o of ORIGINES_CLIC_PLAN) expect(mesureClic(o)).toEqual(["clic_plan", { origine: o }]);
    for (const x of ["", "NAV", "nav ", "header", "toString", "__proto__", null, undefined]) expect(mesureClic(x)).toBeNull();
  });

  it("clic_plan : l'élément cliqué ou son ancêtre porte data-clic-plan ; sans lui, ou hors liste, rien", async () => {
    const { mesureDepuisCible } = await charger(true);
    const lien = (v: string | null) => ({ closest: (s: string) => (s === "[data-clic-plan]" && v !== null ? { getAttribute: () => v } : null) });
    expect(mesureDepuisCible(lien("pied") as unknown as EventTarget)).toEqual(["clic_plan", { origine: "pied" }]);
    expect(mesureDepuisCible(lien("ailleurs") as unknown as EventTarget)).toBeNull();
    expect(mesureDepuisCible(lien(null) as unknown as EventTarget)).toBeNull();
    expect(mesureDepuisCible(null)).toBeNull();
    expect(mesureDepuisCible({} as EventTarget)).toBeNull(); /* un nœud texte, la fenêtre : pas de closest */
  });

  it("vue_vitrine_plan : connecte, a_des_plans, telephone (jamais le nombre de plans)", async () => {
    const { mesureVitrine } = await charger(true);
    expect(mesureVitrine({ connecte: true, plans: 3, telephone: false })).toEqual(["vue_vitrine_plan", { connecte: true, a_des_plans: true, telephone: false }]);
    expect(mesureVitrine({ connecte: false, plans: 0, telephone: true })).toEqual(["vue_vitrine_plan", { connecte: false, a_des_plans: false, telephone: true }]);
  });

  it("la reprise : un plan entré dans le compte (pas un « déjà là »), la limite ; le reste ne mesure rien", async () => {
    const { mesureReprise } = await charger(true);
    expect(mesureReprise({ etat: "ajoute", nom: "Maison de Camille", id: "x", deja: false, autres: 0 }, true)).toEqual([
      "plan_enregistre_compte", { source: "reclamation", pro: true },
    ]);
    expect(mesureReprise({ etat: "ajoute", nom: "Maison", id: "x", deja: true, autres: 0 }, false)).toBeNull();
    expect(mesureReprise({ etat: "limite", nom: "Maison de Camille", autre: "Autre" }, false)).toEqual(["plan_limite_gratuit", { moment: "reclamation" }]);
    for (const etat of ["aucun", "introuvable", "connexion"] as const) expect(mesureReprise({ etat }, false)).toBeNull();
    expect(mesureReprise({ etat: "plafond", nom: "M" }, false)).toBeNull();
    expect(mesureReprise({ etat: "echec", nom: "M" }, false)).toBeNull();
    /* le nom du plan n'est jamais repris */
    expect(JSON.stringify(mesureReprise({ etat: "ajoute", nom: "Maison de Camille", id: "x", deja: false, autres: 2 }, false))).not.toContain("Camille");
  });

  it("estimation_depuis_plan : neuf (rapide, détaillé) si l'origine dit « plan » ; rénovation à la création seulement", async () => {
    const { mesureEstimationNeuf, mesureEstimationReno } = await charger(true);
    expect(mesureEstimationNeuf({ mode: "rapide", origine: { source: "plan" } })).toEqual(["estimation_depuis_plan", { nature: "neuf", mode: "rapide" }]);
    expect(mesureEstimationNeuf({ mode: "detaille", origine: { source: "plan" } })).toEqual(["estimation_depuis_plan", { nature: "neuf", mode: "detaille" }]);
    expect(mesureEstimationNeuf({ mode: "rapide" })).toBeNull();
    expect(mesureEstimationNeuf({ mode: "rapide", origine: null })).toBeNull();
    expect(mesureEstimationNeuf({ mode: "rapide", origine: { source: "direct" } })).toBeNull();
    expect(mesureEstimationReno(true)).toEqual(["estimation_depuis_plan", { nature: "reno", mode: "detaille" }]);
    expect(mesureEstimationReno(false)).toBeNull();
    expect(mesureEstimationReno(undefined)).toBeNull();
  });

  it("aucune propriété ne porte de nom de plan, de code postal ni de surface ; deux ou trois propriétés au plus", async () => {
    const m = await charger(true);
    const toutes: (MesurePlan | null)[] = [
      ...m.ORIGINES_CLIC_PLAN.map((o) => m.mesureClic(o)),
      m.mesureVitrine({ connecte: true, plans: 2, telephone: true }),
      m.mesureReprise({ etat: "ajoute", nom: "Maison 94 m² à Lyon 69003", id: "x", deja: false, autres: 0 }, true),
      m.mesureReprise({ etat: "limite", nom: "Maison", autre: null }, false),
      m.mesureEstimationNeuf({ mode: "detaille", origine: { source: "plan" } }),
      m.mesureEstimationReno(true),
    ];
    for (const x of toutes) {
      expect(x).not.toBeNull();
      sansDonneePersonnelle(x);
      expect(Object.keys(x![1]).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("C10 · l'émission", () => {
  it("allumé : mesurerPlan passe par suivre() ; null ne fait rien", async () => {
    const { mesurerPlan, mesureClic, suivre } = await charger(true);
    mesurerPlan(mesureClic("nav"));
    mesurerPlan(mesureClic("inconnu"));
    mesurerPlan(null);
    expect(suivre).toHaveBeenCalledTimes(1);
    expect(suivre).toHaveBeenCalledWith("clic_plan", { origine: "nav" });
  });

  it("éteint : rien n'est émis, quelle que soit la mesure", async () => {
    const m = await charger(false);
    m.mesurerPlan(m.mesureClic("nav"));
    m.mesurerPlan(m.mesureVitrine({ connecte: false, plans: 0, telephone: false }));
    m.mesurerPlan(m.mesureEstimationNeuf({ mode: "rapide", origine: { source: "plan" } }));
    m.mesurerPlan(m.mesureEstimationReno(true));
    expect(m.suivre).not.toHaveBeenCalled();
  });

  it("lib/track.ts déclare les cinq événements", () => {
    const src = lire("lib/track.ts");
    for (const n of ["clic_plan", "vue_vitrine_plan", "plan_enregistre_compte", "plan_limite_gratuit", "estimation_depuis_plan"]) {
      expect(src).toContain(`| "${n}"`);
    }
  });
});

/* ─── Les liens mesurés, dans le code ───────────────────────────────────────── */

function fichiers(dossier: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(path.join(RACINE, dossier))) {
    const rel = path.join(dossier, f);
    if (statSync(path.join(RACINE, rel)).isDirectory()) out.push(...fichiers(rel));
    else if (/\.tsx?$/.test(f)) out.push(rel);
  }
  return out;
}
const SOURCES = [...fichiers("app"), ...fichiers("components")].filter((f) => !f.includes("apercu-plans-dev"));

describe("C10 · chaque lien vers la vitrine ou l'éditeur porte une origine de la liste", () => {
  it("les origines écrites (clicPlan(…) et data-clic-plan=\"…\") sont toutes dans la liste, et chacune sert", async () => {
    const { ORIGINES_CLIC_PLAN } = await charger(true);
    const vues = new Map<string, string[]>();
    for (const f of SOURCES) {
      const src = lire(f);
      for (const m of src.matchAll(/clicPlan\("([^"<>]*)"\)|data-clic-plan="([^"<>]*)"/g)) {
        const o = m[1] ?? m[2];
        vues.set(o, [...(vues.get(o) ?? []), f]);
      }
    }
    for (const o of vues.keys()) expect(ORIGINES_CLIC_PLAN as readonly string[], o).toContain(o);
    for (const o of ORIGINES_CLIC_PLAN) expect(vues.has(o), o).toBe(true);
  });

  it("chaque <Link>/<a> vers /plan ou /logiciel-plan-maison est mesuré (sauf les liens d'un plan relié, de la fiche)", () => {
    /* Les liens qui rouvrent un plan déjà relié (fiche projet, validation rénovation) ne sont pas des entrées. */
    const HORS = ["components/plans/PlanRelie.tsx", "app/projets/depuis-plan/[planId]/page.tsx", "app/sitemap.ts"];
    const manques: string[] = [];
    let n = 0;
    for (const f of SOURCES.filter((x) => !HORS.includes(x))) {
      const src = lire(f);
      const re = /<(?:Link|a)\b[^>]*?(?:href=\{?["'`](?:\/plan[?"'`]|\/logiciel-plan-maison)|href=\{VITRINE_PLAN\}|href=\{trouve\.href\}|href=\{neuf \?)[^>]*>/g;
      for (const m of src.matchAll(re)) {
        n++;
        if (!/clicPlan\(|data-clic-plan=/.test(m[0])) manques.push(`${f} : ${m[0].slice(0, 90)}`);
      }
    }
    expect(manques).toEqual([]);
    expect(n).toBeGreaterThanOrEqual(17);
  });

  it("le layout monte l'écoute derrière l'interrupteur, une seule fois", () => {
    const src = lire("app/layout.tsx");
    expect(src.match(/<SuiviClicsPlan \/>/g)).toHaveLength(1);
    expect(src).toContain("{FEATURES.plans && <SuiviClicsPlan />}");
    const comp = lire("components/plans/SuiviClicsPlan.tsx");
    expect(comp).toContain('addEventListener("click", ecouter, true)');
    expect(comp).toContain("return null;");
  });
});

describe("C10 · aucune nouvelle conversion Google Ads", () => {
  it("lib/gtag.ts n'a que ses conversions d'avant, et rien de l'éditeur n'en déclenche", () => {
    const gtag = lire("lib/gtag.ts");
    expect(gtag).not.toMatch(/plan/i);
    for (const f of [...SOURCES.filter((x) => /plans?\b|plan-|SuiviClicsPlan/.test(x)), "lib/plans/mesure.ts", "lib/editeur/heberger.ts"]) {
      const src = lire(f);
      expect(src, f).not.toMatch(/from "@\/lib\/gtag"|conversion[A-Z]\w*\(|gtag\(/);
    }
  });
});

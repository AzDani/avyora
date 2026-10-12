/**
 * Schémas de l'API « Mes plans » (chantier C2).
 *
 * Les états acceptés sont des états RÉELS de l'éditeur, exportés par
 * `node maquettes/tools/exporter-etats.mjs "$(pwd)/maquettes" tests/fixtures/plans-etats` :
 * les quatre plans types, l'exemple, le Plan final sur deux niveaux et le pire cas mesuré
 * (6 niveaux, 216 murs, 168 Ko). Les refus visent ce qui finirait en HTML ou en attribut.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  etatPlanSchema,
  planCreerSchema,
  planMajSchema,
  resumeSchema,
  problemeProfond,
  PLAN_ETAT_OCTETS_MAX,
} from "@/lib/plans/schema";

const DOSSIER = path.join(__dirname, "fixtures", "plans-etats");
const FICHIERS = readdirSync(DOSSIER).filter((f) => f.endsWith(".json")).sort();
const etat = (f: string) => JSON.parse(readFileSync(path.join(DOSSIER, f), "utf8")) as Record<string, unknown>;
type Niveau = { walls: Record<string, unknown>[]; openings: Record<string, unknown>[]; items?: Record<string, unknown>[] } & Record<string, unknown>;
const niveaux = (e: Record<string, unknown>) => e.levels as Niveau[];

describe("états réels de l'éditeur", () => {
  it("les sept états exportés sont présents", () => {
    expect(FICHIERS).toEqual([
      "exemple.json", "maison.json", "pire-cas.json", "plan-final-etage.json", "studio.json", "t2.json", "t3.json",
    ]);
  });

  it.each(FICHIERS)("%s passe le schéma, sans rien perdre", (f) => {
    const e = etat(f);
    const r = etatPlanSchema.safeParse(e);
    expect(r.success, JSON.stringify(!r.success && r.error.issues.slice(0, 3))).toBe(true);
    /* .loose() : aucune clé retirée, rien de réécrit (la sauvegarde rend l'état tel quel ; l'ordre
       des clés ne compte pas, jsonb ne le garde pas). */
    expect(r.data).toEqual(e);
    expect(planCreerSchema.safeParse({ nom: String(e.name || "Plan"), etat: e, vue: { zoom: 40, ox: 0, oy: 0 }, editeurId: "k3x9a1q" }).success).toBe(true);
  });

  it("le Plan final et la rénovation gardent leur type", () => {
    expect(etatPlanSchema.parse(etat("plan-final-etage.json")).workflow).toBe("final_plan");
    expect(etatPlanSchema.parse(etat("maison.json")).workflow).toBe("renovation");
  });
});

describe("refus", () => {
  const base = () => etat("maison.json");
  const refuse = (e: unknown) => expect(etatPlanSchema.safeParse(e).success).toBe(false);

  it("une coordonnée en chaîne qui ouvrirait un attribut", () => {
    const e = base();
    niveaux(e)[0].walls[0].a = { x: '0" onload="alert(1)', y: 0 };
    refuse(e);
  });

  it("un identifiant avec une apostrophe (onclick=\"openSavedPlan('…')\")", () => {
    const e = base();
    niveaux(e)[0].walls[0].id = "a'b";
    refuse(e);
    const e2 = base();
    niveaux(e2)[0].openings[0].id = "x');alert(1);//";
    refuse(e2);
    const e3 = base();
    niveaux(e3)[0].items![0].id = "<img>";
    refuse(e3);
  });

  it("un type ou un statut de mur hors de la forme attendue", () => {
    const e = base();
    niveaux(e)[0].walls[0].type = 'mur" stroke="red';
    refuse(e);
    const e2 = base();
    niveaux(e2)[0].walls[0].st = "<b>";
    refuse(e2);
  });

  it("__proto__, constructor et prototype, à toute profondeur (lus sur l'entrée brute)", () => {
    const txt = JSON.stringify(base());
    refuse(JSON.parse(txt.replace('"name":', '"__proto__":{"isPro":true},"name":')));
    refuse(JSON.parse(txt.replace('"pid":"m', '"constructor":{"x":1},"pid":"m')));
    refuse(JSON.parse(txt.replace('"cur":', '"prototype":1,"cur":')));
  });

  it("une image intégrée en data:", () => {
    const e = base();
    niveaux(e)[0].bg = { src: "data:image/png;base64,iVBORw0KGgo=", x: 0, y: 0 };
    refuse(e);
    const e2 = base();
    niveaux(e2)[0].bg = { src: "  DATA:text/html,<script>" };
    refuse(e2);
  });

  it("7 niveaux, aucun niveau", () => {
    const e = base();
    const lv = niveaux(e)[0];
    e.levels = Array.from({ length: 7 }, () => JSON.parse(JSON.stringify(lv)));
    refuse(e);
    e.levels = niveaux(e).slice(0, 6);
    expect(etatPlanSchema.safeParse(e).success).toBe(true);
    e.levels = [];
    refuse(e);
  });

  it("une chaîne de 3 000 caractères (2 000 passent)", () => {
    const e = base();
    e.name = "x".repeat(100);
    (e as { notes?: unknown }).notes = "n".repeat(2000);
    expect(etatPlanSchema.safeParse(e).success).toBe(true);
    (e as { notes?: unknown }).notes = "n".repeat(3000);
    refuse(e);
  });

  it("un objet trop profond", () => {
    const e = base();
    let o: Record<string, unknown> = {};
    const racine = o;
    for (let i = 0; i < 20; i++) { const n = {}; o.n = n; o = n; }
    e.profond = racine;
    refuse(e);
    expect(problemeProfond(racine)).toBe("objet trop profond");
    /* 12 niveaux d'imbrication au total passent (l'état réel en a 7). */
    let p: Record<string, unknown> = {};
    const ok = p;
    for (let i = 0; i < 11; i++) { const n = {}; p.n = n; p = n; }
    expect(problemeProfond(ok)).toBe(null);
  });

  it("un état de plus d'1 Mo", () => {
    const e = base();
    const lv = niveaux(e)[0];
    lv.texts = Array.from({ length: 600 }, (_, i) => ({ id: "t" + i, x: 0, y: 0, text: "x".repeat(1900) }));
    expect(JSON.stringify(e).length).toBeGreaterThan(PLAN_ETAT_OCTETS_MAX);
    refuse(e);
  });

  it("un workflow inconnu, un schéma absent, des coordonnées infinies ou hors bornes", () => {
    refuse({ ...base(), workflow: "autre" });
    const { schema: _s, ...sansSchema } = base();
    void _s;
    refuse(sansSchema);
    const e = base();
    niveaux(e)[0].walls[0].a = { x: 1e9, y: 0 };
    refuse(e);
    refuse("pas un objet");
    refuse(null);
  });
});

describe("création et mise à jour", () => {
  const e = etat("t2.json");
  it("création : nom borné, editeurId en base 36 minuscule", () => {
    expect(planCreerSchema.safeParse({ nom: "  ", etat: e }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "x".repeat(121), etat: e }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, editeurId: "ABC" }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, editeurId: "a".repeat(25) }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, resume: null }).success).toBe(true);
  });
  it("création : la vue est petite et propre", () => {
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, vue: { zoom: 40, ox: 1, oy: 2 } }).success).toBe(true);
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, vue: { pad: "x".repeat(1900), p2: "y".repeat(1900), p3: "z".repeat(1900) } }).success).toBe(false);
    expect(planCreerSchema.safeParse({ nom: "T2", etat: e, vue: JSON.parse('{"__proto__":{"a":1}}') }).success).toBe(false);
  });
  it("mise à jour : la révision est obligatoire", () => {
    expect(planMajSchema.safeParse({ nom: "x" }).success).toBe(false);
    expect(planMajSchema.safeParse({ revision: 0, nom: "x" }).success).toBe(false);
    expect(planMajSchema.safeParse({ revision: 3, nom: "x" }).success).toBe(true);
    expect(planMajSchema.safeParse({ revision: 3, etat: e, force: true }).success).toBe(true);
  });
});

describe("résumé (la carte de « Mes plans »)", () => {
  it("le résumé de l'éditeur passe, les clés inconnues sont retirées", () => {
    const r = resumeSchema.parse({ m2: 94.2, pieces: 6, budget: 41250.5, taches: 12, faites: 3, projet: 40, prochain: "Plâtrerie, le 3 nov.", inconnu: "<x>" });
    expect(r).toEqual({ m2: 94.2, pieces: 6, budget: 41250.5, taches: 12, faites: 3, projet: 40, prochain: "Plâtrerie, le 3 nov." });
    expect(resumeSchema.safeParse({ pf: true, m2: 120, pieces: 5, prochain: null }).success).toBe(true);
  });
  it("aucune balise dans le texte, aucun nombre absurde", () => {
    expect(resumeSchema.safeParse({ prochain: "<img src=x onerror=alert(1)>" }).success).toBe(false);
    expect(resumeSchema.safeParse({ prochain: 'a" onclick="b' }).success).toBe(false);
    expect(resumeSchema.safeParse({ m2: "94" }).success).toBe(false);
    expect(resumeSchema.safeParse({ pieces: 2.5 }).success).toBe(false);
  });
});

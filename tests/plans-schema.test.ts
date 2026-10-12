/**
 * Schémas de l'API « Mes plans » (chantier C2).
 *
 * Les états acceptés sont des états RÉELS de l'éditeur, exportés par
 * `node maquettes/tools/exporter-etats.mjs "$(pwd)/maquettes" tests/fixtures/plans-etats` :
 * les quatre plans types, l'exemple, le Plan final sur deux niveaux et le pire cas mesuré
 * (6 niveaux, 216 murs, 168 Ko compacts, 197 Ko dans Postgres). Les refus visent ce qui finirait en
 * HTML ou en attribut. Les tailles mesurées comme Postgres : tests/plans-jsonb.test.ts.
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
  PLAN_CHAINE_MAX,
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

  it("un nom de niveau ou de pièce, un sol, qui porteraient une balise ou un guillemet droit (jury, XSS de l'éditeur)", () => {
    const e = base();
    niveaux(e)[0].name = "<img src=x onerror=alert(1)>";
    refuse(e);
    const e2 = base();
    (niveaux(e2)[0].rooms as Record<string, unknown>[])[0].name = '" onmouseover="alert(1)';
    refuse(e2);
    const e3 = base();
    (niveaux(e3)[0].rooms as Record<string, unknown>[])[0].floor = "Parquet<script>";
    refuse(e3);
    const e4 = base();
    (niveaux(e4)[0].rooms as Record<string, unknown>[])[0].id = "a'b";
    refuse(e4);
    /* l'apostrophe reste permise dans un nom (« Chambre d'amis ») */
    const ok = base();
    (niveaux(ok)[0].rooms as Record<string, unknown>[])[0].name = "Chambre d'amis";
    expect(etatPlanSchema.safeParse(ok).success).toBe(true);
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

  it("une longue note ne fait pas refuser le plan (champs libres sans maxlength) ; une chaîne absurde, si", () => {
    const e = base();
    e.name = "x".repeat(100);
    /* Notes du plan, note d'une pièce, texte posé sur le plan : rien ne les borne dans l'éditeur. */
    (e as { notes?: unknown }).notes = "Garder le parquet. ".repeat(1000);
    (niveaux(e)[0].rooms as Record<string, unknown>[])[0].note = "n".repeat(50_000);
    niveaux(e)[0].texts = [{ id: "t1", x: 0, y: 0, text: "é".repeat(20_000) }];
    expect(etatPlanSchema.safeParse(e).success).toBe(true);
    (e as { notes?: unknown }).notes = "n".repeat(PLAN_CHAINE_MAX);
    expect(etatPlanSchema.safeParse(e).success).toBe(true);
    (e as { notes?: unknown }).notes = "n".repeat(PLAN_CHAINE_MAX + 1);
    refuse(e);
  });

  it("une longue chaîne reste refusée si c'est une image data:", () => {
    const e = base();
    (e as { notes?: unknown }).notes = "data:image/png;base64," + "A".repeat(40_000);
    refuse(e);
    expect(problemeProfond({ n: "data:text/html,<b>x</b>" })).toBe("image intégrée refusée");
    expect(problemeProfond({ n: "  DATA:image/svg+xml;utf8,<svg/>" })).toBe("image intégrée refusée");
    expect(problemeProfond({ n: "data:application/octet-stream;base64,AAAA" })).toBe("image intégrée refusée");
  });

  it("une note qui commence par « Data: » est acceptée (ce n'est pas une URL data:)", () => {
    expect(problemeProfond({ notes: "Data: relevé du géomètre le 12/10" })).toBeNull();
    expect(problemeProfond({ notes: "data: à vérifier, mur porteur" })).toBeNull();
    expect(problemeProfond({ notes: "data:x" })).toBeNull();
    const e = base();
    (e as { notes?: unknown }).notes = "Data: relevé du géomètre le 12/10";
    expect(etatPlanSchema.safeParse(e).success).toBe(true);
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

describe("siteNom de l'éditeur (le nom envoyé à l'API)", () => {
  /* La fonction de la source, telle quelle : le nom qu'elle rend doit toujours passer nomPlan. */
  const src = readFileSync(path.join(__dirname, "..", "maquettes", "plan-editor.html"), "utf8");
  const m = src.match(/function siteNom\(n\)\{[\s\S]*?\n {2}return s\.trim\(\)\|\|'Plan sans nom';\}/);
  const siteNom = new Function(`${m![0]}; return siteNom;`)() as (n: unknown) => string;
  const passe = (nom: string) => planMajSchema.safeParse({ revision: 1, nom }).success;

  it("tronque par point de code : jamais de moitié de paire UTF-16, toujours accepté par l'API", () => {
    expect(m).not.toBeNull();
    const frontiere = siteNom("a".repeat(119) + "\u{1F600}" + "b");
    expect(frontiere).toBe("a".repeat(119));
    expect(passe(frontiere)).toBe(true);
    const emojis = siteNom("\u{1F3E0}".repeat(100));
    expect(emojis).toBe("\u{1F3E0}".repeat(60));
    expect(passe(emojis)).toBe(true);
    expect(siteNom("Maison \u{1F3E1} des Pins")).toBe("Maison \u{1F3E1} des Pins");
    expect(siteNom("x".repeat(200))).toBe("x".repeat(120));
  });

  it("retire les moitiés de paire isolées et le caractère nul ; vide → « Plan sans nom »", () => {
    expect(siteNom("Mai\uD83Dson\u0000")).toBe("Maison");
    expect(passe(siteNom("a\uDC00b"))).toBe(true);
    expect(siteNom("   ")).toBe("Plan sans nom");
    expect(siteNom(null)).toBe("Plan sans nom");
  });
});

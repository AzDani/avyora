/**
 * Chantier N9 (revue rénovation / neuf, §5 « Questions sur le bien » et §6 N9) : le questionnaire du
 * détaillé neuf posé à la manière de la rénovation.
 *
 * Une seule carte, « Parle-nous de ta maison », avec les intertitres de la rénovation dans le même
 * ordre : type de maison (et forme), surfaces, la MÊME grille de compteurs (mêmes libellés), les choix
 * techniques repliés derrière une ligne de résumé, la finition en cartes, qui pilote, la TVA, le budget
 * et le récapitulatif. Chaque question dit sa rubrique et son contrôle (`questions-neuf.ts`) ; un nombre
 * tapé n'est pris qu'à la sortie du champ. Aucun chiffre ne bouge : mêmes réponses, mêmes totaux (T5).
 * Rendu serveur (`renderToStaticMarkup`) : l'état initial, et un projet rouvert posé dès le premier rendu.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import Estimateur from "@/components/Estimateur";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import { valeurFrappe, valeurSortie } from "@/components/Stepper";
import { ChampCodePostal } from "@/components/estimateur/intake";
import {
  QUESTIONS_NEUF, TOUTES_QUESTIONS_NEUF, SECTIONS_NEUF, questionsVisibles, resumeTechniqueNeuf, type QuestionNeuf,
} from "@/lib/estimateur/questions-neuf";
import {
  etatParDefaut, ctxDetailNeuf, changerReponseNeuf, pasCompteurNeuf, valeurCompteurNeuf, menuiseriesNeuf, repriseDepuisReponses,
  lireBrouillonDetailNeuf, etatDepuisPreset, type EtatNeuf, type CompteurNeuf,
} from "@/lib/estimateur/detaille-neuf";
import { buildDevis, catalogueDe, presetMaison, maisonParDefaut, maisonComplete, defaultCtx, BORNES_NEUF, ALEAS_NEUF, ALEAS_RENO, type Ctx, type Selection, type MaisonNeuve } from "@/lib/estimateur";
import { dictDetail } from "@/lib/i18n/detail";
import { dictNeuf } from "@/lib/i18n/neuf";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const LOCALES = ["fr", "en"] as const;
type Loc = (typeof LOCALES)[number];
const Neuf = EstimateurNeuf as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
const sansStyle = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const rendre = (el: ReturnType<typeof createElement>, locale: Loc) => sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: el })));
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const desechapper = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const compte = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
/** Les intertitres d'une carte, dans l'ordre (le texte avant un éventuel sous-titre). */
const intertitres = (html: string) => [...html.matchAll(/<div class="gl">([^<]*)/g)].map((m) => desechapper(m[1]).trim());
/** Les libellés des compteurs (`Stepper` de la grille), dans l'ordre. */
const compteurs = (html: string) => [...html.matchAll(/<div class="stp"><span class="l">([^<]*)/g)].map((m) => desechapper(m[1]));
const ttc = (ctx: Ctx, sel: Selection) => buildDevis(catalogueDe(ctx), ctx, sel).totaux.ttc;
const ttcEtat = (e: EtatNeuf) => ttc(ctxDetailNeuf(e), e.sel);
const q = (k: string): QuestionNeuf => TOUTES_QUESTIONS_NEUF.find((x) => x.k === k)!;

type Projet = { reponses: { ctx: Ctx; sel: Selection }; ttc: number };
const AVANT_N8 = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "neuf-projets-avant-n8.json"), "utf8")) as Record<string, Projet>;

describe("N9 · une seule carte, les intertitres de la rénovation dans le même ordre", () => {
  for (const locale of LOCALES) {
    const neuf = rendre(createElement(EstimateurNeuf), locale);
    const reno = rendre(createElement(Estimateur), locale);
    const B = dictDetail(locale).bien, d = dictNeuf(locale).detail;

    it(`${locale} : une carte « Parle-nous de ta maison », ses intertitres`, () => {
      expect(compte(neuf, /class="card"/g)).toBe(1);
      expect(neuf).toContain(`<h2>${echapper(d.titre)}</h2>`);
      expect(intertitres(neuf)).toEqual([d.typeT, B.surfacesT, B.piecesConfT, d.techT, B.finitionT, q("pilotage").l[locale], B.tvaT, B.budgetT]);
    });

    it(`${locale} : ceux de la rénovation, au même rang (« Type de bien » devient « Type de maison » ; pas de périmètre)`, () => {
      const r = intertitres(reno);
      expect(r).toEqual([B.perimetreT, B.typeT, B.surfacesT, B.piecesConfT, B.finitionT, B.tvaT, B.budgetT]);
      const communs = r.slice(2);
      expect(intertitres(neuf).filter((t) => communs.includes(t))).toEqual(communs);
    });

    it(`${locale} : la même grille de compteurs que la rénovation, mêmes libellés et même ordre (« Niveaux » en lecture seule)`, () => {
      // Les compteurs réglables ; « Niveaux », que le type de maison décide, ouvre la grille du neuf en
      // lecture seule (`stp fixe`), aux mêmes paires que la rénovation (A7 : tests/questionnaires-a7.test.ts).
      const cr = compteurs(reno), cn = compteurs(neuf);
      expect(cr[0]).toBe(B.compteurs.niveaux);
      expect(cn).toEqual(cr.slice(1));
      expect(cn).toHaveLength(9);
      expect(neuf).toContain(`<div class="stp fixe"><span class="l" id="av-neuf-niveaux-n-l">${echapper(B.compteurs.niveaux)}<small>`);
    });

    it(`${locale} : choix techniques repliés, une ligne de résumé et « Modifier »`, () => {
      expect(neuf).toContain(`<p class="tech-res">${echapper(resumeTechniqueNeuf(etatParDefaut().maison, locale))}</p>`);
      expect(neuf).toContain(`aria-expanded="false" aria-controls="av-neuf-tech">${echapper(d.techModifier)}</button>`);
      expect(neuf).toContain('<div id="av-neuf-tech"></div>');
      for (const x of TOUTES_QUESTIONS_NEUF.filter((x) => x.section === "technique")) expect(neuf, x.k).not.toContain(`aria-label="${echapper(x.l[locale])}"`);
    });

    it(`${locale} : hauteur 2,50 m en lecture seule, note TVA 20 %, aléas recommandés, récapitulatif partagé`, () => {
      expect(neuf).toContain(`<output id="av-neuf-hauteur" class="ro"><span class="num">${d.hauteurValeur}</span><span class="u">m</span></output>`);
      expect(neuf).toMatch(locale === "fr" ? /<b>TVA 20 %<\/b>/ : /<b>20% VAT<\/b>/);
      // aléas recommandés selon la nature (D7) : 7 % en neuf, 10 % en rénovation (même texte, `dictDetail`)
      expect(neuf).toContain(echapper(B.aleasReco(ALEAS_NEUF)));
      expect(reno).toContain(echapper(B.aleasReco(ALEAS_RENO)));
      expect([ALEAS_NEUF, ALEAS_RENO]).toEqual([7, 10]);
      expect(neuf).toContain('<div class="recap">');
      expect(neuf).toContain(echapper(dictNeuf(locale).maisonNiveaux.pp));
      expect(neuf).toContain(echapper(dictDetail(locale).recap.piecesTotal(6)));
      // « Le moteur en déduit » et ses groupes repliables ont disparu
      expect(neuf).not.toMatch(/class="(deduit|grp|q|pills?)"/);
      expect(neuf).not.toContain("<details");
    });
  }
});

describe("N9 · chaque question dit sa rubrique et son contrôle", () => {
  it("segment pour 2 choix, pastilles de 3 à 6, cartes pour le chauffage et la finition", () => {
    for (const x of TOUTES_QUESTIONS_NEUF) {
      const n = x.o?.length ?? 0;
      if (x.vue === "segment") expect(n, x.k).toBe(2);
      if (x.vue === "pastilles") expect(n >= 3 && n <= 6, x.k).toBe(true);
      if (x.vue === "cartes") expect(["chauffage", "$finition"], x.k).toContain(x.k);
      if (x.vue === "interrupteur") expect(x.k).toBe("cuisine");
      if (x.vue === "compteur" || x.vue === "champ") expect(x.t, x.k).toBe("num");
      if (x.vue === "cp") expect(x.t).toBe("cp");
      if (x.o && n === 2 && x.vue !== "interrupteur") expect(x.vue, x.k).toBe("segment");
    }
  });

  it("dans l'ordre de l'écran : type, surfaces, pièces, choix techniques, finition, pilotage", () => {
    const rangs = TOUTES_QUESTIONS_NEUF.map((x) => SECTIONS_NEUF.indexOf(x.section));
    expect(rangs.every((r) => r >= 0)).toBe(true);
    expect([...rangs].sort((a, b) => a - b)).toEqual(rangs);
    expect(questionsVisibles(maisonParDefaut(), "type").map((x) => x.k)).toEqual(["niveaux", "forme"]);
    expect(questionsVisibles(maisonParDefaut(), "surfaces").map((x) => x.k)).toEqual(["surface", "garage", "codePostal"]);
    expect(questionsVisibles(maisonParDefaut(), "pieces").map((x) => x.k)).toEqual(
      ["sejour", "cuisines", "chambres", "suites", "sdb", "wc", "couloir", "buanderie", "menuiseries", "cuisine"]);
    // les groupes des choix techniques sont leurs sous-titres ; chaque groupe est d'une seule rubrique
    for (const g of QUESTIONS_NEUF) expect(new Set(g.qs.map((x) => x.section === "technique")).size, g.g.fr).toBe(1);
  });

  it("bornes : celles du moteur (BORNES_NEUF) ; garage en m², 0 = sans garage (plus de contrôle « garage »)", () => {
    for (const x of TOUTES_QUESTIONS_NEUF.filter((x) => x.vue === "compteur" || x.vue === "champ")) {
      const b = (BORNES_NEUF as Record<string, { min: number; max: number }>)[x.k];
      expect([x.min, x.max], x.k).toEqual([b.min, b.max]);
    }
    expect(q("garage")).toMatchObject({ vue: "champ", u: "m²", min: 0, max: 80 });
    expect(fs.readFileSync("lib/estimateur/questions-neuf.ts", "utf8")).not.toMatch(/"garage"\s*\|/);
  });

  it("les cartes du chauffage ont un objectif et une description, en français et en anglais", () => {
    const c = q("chauffage");
    for (const [v] of c.o!) for (const l of LOCALES) {
      expect(c.cartes?.[String(v)]?.eye[l], `${v} ${l}`).toBeTruthy();
      expect(c.cartes?.[String(v)]?.desc[l], `${v} ${l}`).toBeTruthy();
    }
  });
});

describe("N9 · les compteurs : bornes, règles, et le chiffre suit", () => {
  const e0 = etatParDefaut();

  it("au moins un WC, au moins une salle de bain en comptant les suites, au plus la borne", () => {
    expect(pasCompteurNeuf(e0, "wc", -1)).toBe(e0);
    expect(pasCompteurNeuf(e0, "sdb", -1)).toBe(e0);
    const avecSuite = pasCompteurNeuf(e0, "suites", 1);
    const sansSdb = pasCompteurNeuf(avecSuite, "sdb", -1);
    expect(sansSdb.maison).toMatchObject({ suites: 1, sdb: 0 });
    expect(pasCompteurNeuf(sansSdb, "sdb", -1)).toBe(sansSdb);
    expect(pasCompteurNeuf(sansSdb, "suites", -1).maison).toMatchObject({ suites: 0, sdb: 1 });
    let e = e0;
    for (let i = 0; i < 20; i++) e = pasCompteurNeuf(e, "chambres", 1);
    expect(e.maison.chambres).toBe(BORNES_NEUF.chambres.max);
  });

  it("chaque compteur change le chiffre ; « + » puis « − » revient au même total et à la même sélection", () => {
    const t0 = ttcEtat(e0);
    for (const k of ["sejour", "cuisines", "chambres", "suites", "sdb", "wc", "couloir", "buanderie", "menuiseries"] as CompteurNeuf[]) {
      const plus = pasCompteurNeuf(e0, k, 1);
      expect(valeurCompteurNeuf(plus.maison, k), k).toBe(valeurCompteurNeuf(e0.maison, k) + 1);
      expect(ttcEtat(plus), k).not.toBeCloseTo(t0, 2);
      const retour = pasCompteurNeuf(plus, k, -1);
      expect(ttcEtat(retour), k).toBeCloseTo(t0, 6);
      expect(retour.sel, k).toEqual(e0.sel);
    }
  });

  it("menuiseries : le nombre déduit de la surface, et revenu à ce nombre, il la suit de nouveau", () => {
    expect(valeurCompteurNeuf(e0.maison, "menuiseries")).toBe(menuiseriesNeuf(e0.maison));
    const plus = pasCompteurNeuf(e0, "menuiseries", 1);
    expect(plus.maison.menuiseries).toBe(menuiseriesNeuf(e0.maison) + 1);
    const retour = pasCompteurNeuf(plus, "menuiseries", -1);
    expect(retour.maison).not.toHaveProperty("menuiseries");
    expect(valeurCompteurNeuf(changerReponseNeuf(retour, "surface", 160).maison, "menuiseries")).toBeGreaterThan(valeurCompteurNeuf(e0.maison, "menuiseries"));
  });
});

describe("N9 · mêmes réponses, mêmes totaux", () => {
  it("une maison décrite par le questionnaire coûte ce que le moteur chiffre pour la même maison", () => {
    let e = etatParDefaut();
    for (const [k, v] of [["surface", 140], ["niveaux", "etage"], ["garage", 25], ["codePostal", "33620"], ["murs", "brique"], ["chauffage", "poele"],
      ["toiture", "4pans"], ["assainissement", "fosse"], ["cuisine", false], ["pilotage", "moe"]] as const) e = changerReponseNeuf(e, k, v);
    for (const [k, d] of [["suites", 1], ["buanderie", 1], ["wc", 1], ["menuiseries", 2]] as const) e = pasCompteurNeuf(e, k, d);
    const ref = etatDepuisPreset(presetMaison(e.maison, { codePostal: "33620" }), "pros");
    // les mêmes lignes cochées, aux mêmes réglages (le questionnaire garde en plus les lignes qu'il a décochées)
    const cochees = (sel: Selection) => Object.fromEntries(Object.entries(sel).filter(([, x]) => x?.on));
    expect(cochees(e.sel)).toEqual(cochees(ref.sel));
    expect(ttcEtat(e)).toBeCloseTo(ttc(presetMaison(e.maison, { codePostal: "33620" }).ctx, ref.sel), 6);
  });

  it("taper « 180 » ne recalcule qu'une fois : la valeur n'est prise qu'à la sortie du champ", () => {
    const saisir = (aLaSortie: boolean, depart: number) => {
      const recalculs: number[] = [];
      for (const texte of ["1", "18", "180"]) { const v = valeurFrappe(texte, aLaSortie); if (v != null) recalculs.push(v); }
      const n = valeurSortie("180", { min: 30, max: 400, step: 5 });
      if (!aLaSortie || n !== depart) recalculs.push(n);
      return recalculs;
    };
    expect(saisir(true, 100)).toEqual([180]);
    expect(saisir(false, 100)).toEqual([1, 18, 180, 180]);   // le comportement d'avant, gardé ailleurs (rénovation)
    expect(saisir(true, 180)).toEqual([]);                   // sortir sans rien changer ne recalcule rien
    expect(valeurSortie("", { min: 30, max: 400 })).toBe(30);
    expect(valeurSortie("999", { min: 30, max: 400 })).toBe(400);
    expect(valeurSortie("2.456", { min: 2, step: 0.1 })).toBe(2.46);
    // Chaque champ chiffré du questionnaire neuf est pris à la sortie (surface, garage, distance, budget, aléas).
    const src = fs.readFileSync("components/neuf/EstimateurNeuf.tsx", "utf8");
    const champs = src.match(/<NumStepper [^>]*>/g) ?? [];
    expect(champs.length).toBe(3);
    for (const c of champs) expect(c).toContain("aLaSortie");
    expect(fs.readFileSync("components/Stepper.tsx", "utf8")).toContain("if (!aLaSortie || n !== value) onChange(n);");
  });
});

describe("N9 · la ligne de résumé des choix techniques dit vrai", () => {
  it("les réglages courants, en français et en anglais", () => {
    const m = maisonParDefaut();
    // N10 : la couverture, les gouttières et la façade se choisissent sur leur ligne de choix, dans leur lot.
    expect(resumeTechniqueNeuf(m, "fr")).toBe("Parpaing · dalle · 2 pans · PAC air/eau · tout-à-l'égout");
    expect(resumeTechniqueNeuf(m, "en")).toBe("Concrete block · slab · gable roof · air-to-water heat pump · mains sewer");
    expect(resumeTechniqueNeuf(maisonComplete({ toiture: "plat", gouttiere: "pvc" }), "fr")).toBe("Parpaing · dalle · toit plat · PAC air/eau · tout-à-l'égout");
    expect(resumeTechniqueNeuf(maisonComplete({ couverture: "ardoise", gouttiere: "pvc", facade: "bardage-bois" }), "fr")).toBe(resumeTechniqueNeuf(m, "fr"));
  });

  it("chaque réponse technique qui s'écarte du réglage courant change la ligne", () => {
    const base = maisonComplete({ ...maisonParDefaut(), niveaux: "etage" });   // à étage : l'escalier a un objet
    for (const l of LOCALES) {
      const r0 = resumeTechniqueNeuf(base, l);
      for (const x of questionsVisibles(base, "technique")) {
        const valeurs = x.o ? x.o.map(([v]) => v) : [40];
        for (const v of valeurs) {
          if (v === (base as unknown as Record<string, unknown>)[x.k]) continue;
          expect(resumeTechniqueNeuf({ ...base, [x.k]: v } as MaisonNeuve, l), `${x.k}=${v} ${l}`).not.toBe(r0);
        }
      }
    }
  });
});

describe("N9 · anciens projets et brouillons relus", () => {
  it("un projet rouvert est posé dès le premier rendu : ses réponses dans le questionnaire (plan à étage d'avant N8)", () => {
    const p = AVANT_N8["rapide-plan-etage"];
    const html = rendre(createElement(Neuf, { initialState: p.reponses as unknown as Record<string, unknown>, projectId: "p1" }), "fr");
    const m = repriseDepuisReponses(p.reponses)!.etat.maison;
    expect(html).toMatch(new RegExp(`id="av-neuf-surface"[^>]*value="${m.surface}"`));
    expect(html).toMatch(new RegExp(`id="av-neuf-garage"[^>]*value="${m.garage}"`));
    expect(html).toContain('<button type="button" class="tpill on" aria-pressed="true">À étage</button>');
    expect(html).toContain('<button type="button" class="tpill on" aria-pressed="true">En L</button>');
    expect(html).toMatch(new RegExp(`<span class="l">Chambres</span><span class="c">.*?<span class="v num">${m.chambres}</span>`));
    expect(html).toContain("escalier béton");
    // et le chiffre de ce questionnaire est celui que l'ancien code avait enregistré
    expect(ttcEtat(repriseDepuisReponses(p.reponses)!.etat)).toBeCloseTo(p.ttc, 6);
  });

  it("un détaillé sans cuisine équipée : l'interrupteur est éteint", () => {
    const p = AVANT_N8["detaille-options"];
    const html = rendre(createElement(Neuf, { initialState: p.reponses as unknown as Record<string, unknown>, projectId: "p1" }), "fr");
    expect(html).toContain(`<button type="button" class="drtoggle" aria-pressed="false"><span class="dot" aria-hidden="true"></span>${echapper(dictNeuf("fr").detail.cuisineOff)}</button>`);
  });

  it("un brouillon du détaillé écrit avant les compteurs (N8) se relit, au même total", () => {
    for (const nom of ["rapide-reference", "detaille-options", "rapide-plan-etage"]) {
      const r = AVANT_N8[nom].reponses as unknown as { ctx: Ctx & { neuf: Partial<MaisonNeuve> }; sel: Selection; qui?: string };
      const brouillon = {
        v: "neuf-detail", custom: [], open: {}, ouvertes: {},
        etat: { maison: { ...r.ctx.neuf, codePostal: r.ctx.neuf.codePostal ?? r.ctx.codePostal }, finition: r.ctx.finition, qui: r.qui ?? "pros", aleas: r.ctx.aleas, budget: 0, sel: r.sel, facadeAuto: true },
      };
      const b = lireBrouillonDetailNeuf(JSON.stringify(brouillon))!;
      expect(b.etat.maison, nom).toMatchObject({ sejour: 1, cuisines: 1, couloir: 1, suites: 0, buanderie: 0 });
      expect(ttcEtat(b.etat), nom).toBeCloseTo(AVANT_N8[nom].ttc, 6);
    }
  });
});

describe("N9 · le champ en faute, le budget à 0, l'anglais", () => {
  it("code postal manquant : marqué (aria-invalid), relié au message ; la rénovation fait de même depuis A7", () => {
    const avec = renderToStaticMarkup(createElement(ChampCodePostal, { valeur: "", onChange: () => {}, placeholder: "x", id: "c", invalide: true, erreurId: "e" }));
    expect(avec).toContain('aria-invalid="true" aria-describedby="e"');
    const sans = renderToStaticMarkup(createElement(ChampCodePostal, { valeur: "", onChange: () => {}, placeholder: "x", id: "c" }));
    expect(sans).not.toMatch(/aria-invalid|aria-describedby/);
    const src = fs.readFileSync("components/neuf/EstimateurNeuf.tsx", "utf8");
    expect(src).toContain('signaler("codePostal", d.errCp)');
    expect(src).toContain("erreurId={ID_ERREUR}");
  });

  it("budget max à 0 (non défini) des deux côtés à l'ouverture", () => {
    expect(defaultCtx().budget).toBe(0);
    expect(etatParDefaut().budget).toBe(0);
    for (const l of LOCALES) {
      expect(rendre(createElement(Estimateur), l)).toContain('<div class="av-estim-live nobudget">');
      expect(rendre(createElement(EstimateurNeuf), l)).toContain('<div class="av-estim-live av-neuf-live nobudget">');
    }
  });

  it("en anglais (américain), aucune question, aucun choix, aucun résumé en français", () => {
    const FR = /[àâçèéêëîïôûùœ«»]|\b(le|la|les|des|du|une|et|ou|avec|sans|dans|sur|est|ta|tes|pièces?|maison|chambres?|salles?|terrain|toit|oui|non)\b/i;
    const PERMIS = [/[Ff]açade/g, /Géorisques/g];
    const propre = (t: string) => PERMIS.reduce((s, r) => s.replace(r, ""), t);
    const textes: string[] = [];
    for (const x of TOUTES_QUESTIONS_NEUF) {
      textes.push(x.l.en, x.hint?.en ?? "");
      for (const [, t] of x.o ?? []) textes.push(t.en);
      for (const c of Object.values(x.cartes ?? {})) textes.push(c.eye.en, c.desc.en);
    }
    for (const g of QUESTIONS_NEUF) textes.push(g.g.en);
    const base = maisonComplete({ ...maisonParDefaut(), niveaux: "etage" });
    for (const x of TOUTES_QUESTIONS_NEUF.filter((x) => x.section === "technique")) for (const [v] of x.o ?? [[40]]) textes.push(resumeTechniqueNeuf({ ...base, [x.k]: v } as MaisonNeuve, "en"));
    const d = dictNeuf("en").detail;
    textes.push(d.titre, d.sous, d.typeT, d.hauteurAide, d.cuisineOff, d.techT, d.techSous, d.techModifier, d.techReplier, d.tvaNote, dictDetail("en").bien.aleasReco(7),
      d.recapGarage(20), d.recapPlancher("102"), d.recapPerimetre("43.5"));
    expect(textes.filter(Boolean).filter((t) => FR.test(propre(t)))).toEqual([]);
    // anglais américain : plus de « Postcode », « storey », « aluminium », « fibre »
    expect(textes.join(" ")).not.toMatch(/Postcode|storey|aluminium|[Ff]ibre/);
  });
});

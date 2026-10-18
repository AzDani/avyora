/**
 * Les deux estimations rapides alignées (chantier N13 de la revue rénovation / neuf,
 * docs/construction-neuve/revue-reno-neuf.md §6) :
 *
 * - les mêmes mots, le même ordre, la même façon de compter : 4 questions numérotées de 1 à 4 des
 *   deux côtés, « 4 questions » partout où c'est écrit ; le neuf commence par Plain-pied / À étage ;
 *   finition et « qui réalise » ont les titres, noms et accroches de la rénovation (le neuf ne
 *   remplace que la description) ;
 * - le neuf : la fourchette en grand, le bilan replié, garage et eaux usées dans le résumé ;
 * - la rénovation : libellés selon le compte, « Affiner » sans les droits droit vers /tarifs avec ses
 *   réponses rendues au retour, accessibilité (htmlFor, aria-pressed, aria-invalid, focus) ;
 * - la règle commune de l'aperçu (D9) : réel pour un compte qui a les droits, factice et flouté sinon ;
 * - les passerelles entre les deux rapides, `projet_enregistre` aux enregistrements ;
 * - et surtout : la mesure du rapide de la rénovation (hameçon SEO / Google Ads) ne bouge pas.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import { buildDevis, catalogueDe, presetNeuf, PHASES_NEUF, type Ctx, type Selection } from "@/lib/estimateur";
import { parPhase } from "@/lib/estimateur/etapes-neuf";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import { presetRapide } from "@/lib/estimateur/presets";
import { chiffreAfficheRapide, editionRapideReno, lireRetourRapideReno, CLE_RETOUR_RENO } from "@/lib/estimateur/rapide-reno";
import type { ReponsesRapideNeuf } from "@/lib/estimateur/brouillon-neuf";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurRapide from "@/components/EstimateurRapide";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import BilanRapideNeuf from "@/components/neuf/BilanRapideNeuf";
import PasserelleRapide from "@/components/PasserelleRapide";

vi.mock("next/navigation", async (orig) => {
  const m = await orig<typeof import("next/navigation")>();
  const routeur = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} };
  return { ...m, useRouter: () => routeur };
});
const LOCALE = vi.hoisted(() => ({ v: "fr" as "fr" | "en" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => LOCALE.v }));

const LOCALES = ["fr", "en"] as const;
type Loc = (typeof LOCALES)[number];
const lire = (f: string) => fs.readFileSync(f, "utf8");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sansStyle = (h: string) => h.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const avecLangue = (el: Parameters<typeof createElement>[0], props: object, locale: Loc) =>
  sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(el as never, props as never) })));
const reno = (props: Parameters<typeof EstimateurRapide>[0], locale: Loc = "fr") => avecLangue(EstimateurRapide, props, locale);
const neuf = (props: Parameters<typeof EstimateurRapideNeuf>[0], locale: Loc = "fr") => avecLangue(EstimateurRapideNeuf, props, locale);
const eur = (v: number, l: Loc) => Math.round(v).toLocaleString(l === "en" ? "en-US" : "fr-FR") + " €";

const R: ReponsesRapideNeuf = { surface: 120, niveaux: "etage", codePostal: "45000", finition: "standard", qui: "pros", garage: true, assainissement: "fosse" };
/** Un projet neuf rouvert : le chiffre s'affiche d'emblée (le bilan avec). */
const rouvertNeuf = (isPro: boolean) => ({ isPro, edit: { projectId: "p1" }, initialR: R });

/* ─── La même façon de compter ─────────────────────────────────────────────────────────────── */

describe("N13 · « 4 questions » des deux côtés", () => {
  it("chaque rapide a 4 questions numérotées de 1 à 4", () => {
    for (const l of LOCALES) {
      for (const h of [reno({}, l), neuf({}, l)]) {
        expect([...h.matchAll(/<span class="n">(\d)<\/span>/g)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
      }
    }
  });

  it("partout où c'est écrit : 4 questions (jamais 5), en français comme en anglais", () => {
    const fichiers = [
      "lib/i18n/dictionaries.ts", "lib/i18n/neuf.ts", "app/page.tsx", "app/projets/nouveau/page.tsx",
      "app/estimation-travaux/page.tsx", "app/estimation-construction-maison/page.tsx", "app/methodologie/page.tsx",
      "app/prix-poste/[slug]/page.tsx",
    ];
    const vus: string[] = [];
    for (const f of fichiers) {
      for (const m of lire(f).matchAll(/\b(\d+|quatre|cinq|six|four|five|six) questions\b/gi)) vus.push(`${f} : ${m[0]}`);
    }
    expect(vus.length).toBeGreaterThanOrEqual(12);
    expect(vus.filter((v) => !/: (4|quatre|four) questions$/i.test(v))).toEqual([]);
    // Le neuf : la page, ses métadonnées, son balisage, l'écran de choix, le bandeau de l'accueil.
    expect(dictNeuf("fr").saisie.pageSous.startsWith("4 questions")).toBe(true);
    expect(dictNeuf("en").saisie.pageSous.startsWith("4 questions")).toBe(true);
    expect(dictNeuf("fr").choix.rapideLead.startsWith("4 questions")).toBe(true);
    expect(dictNeuf("en").choix.rapideLead.startsWith("4 questions")).toBe(true);
    expect(lire("app/page.tsx")).toContain("Gratuit, en 4 questions.");
    expect(lire("app/page.tsx")).toContain("Free, in 4 questions.");
    expect(lire("app/estimation-construction-maison/page.tsx")).toContain("quatre questions, un budget complet");
  });
});

/* ─── Le même ordre, les mêmes mots ────────────────────────────────────────────────────────── */

describe("N13 · rapide neuf : la 1re question commence par Plain-pied / À étage", () => {
  for (const l of LOCALES) {
    it(l, () => {
      const h = neuf({}, l), s = dictNeuf(l).saisie;
      const q1 = h.indexOf('<span class="n">1</span>');
      const type = h.indexOf(`<div class="glbl">${esc(s.niveauxLabel)}`);
      const pp = h.indexOf(`>${esc(s.niveaux.pp)}</button>`);
      const surface = h.indexOf('id="neuf-surface"');
      const cp = h.indexOf('id="neuf-cp"');
      expect(q1).toBeGreaterThan(-1);
      expect([q1 < type, type < pp, pp < surface, surface < cp]).toEqual([true, true, true, true]);
      // Le type de maison est le premier intitulé de la question, juste après son titre.
      expect(h.slice(q1).replace(/^[\s\S]*?<\/div>/, "").startsWith(`<div class="glbl">${esc(s.niveauxLabel)}`)).toBe(true);
      expect(h).toContain(`role="group" aria-label="${esc(s.niveauxLabel)}"`);
      expect(s.niveauxLabel).toBe(l === "fr" ? "Type de maison" : "House type");
    });
  }
});

describe("N13 · finition et « qui réalise » : les libellés de la rénovation, la description du neuf", () => {
  it("le dictionnaire du neuf ne garde que les descriptions, et plus ses propres titres (sauf l'accroche Éco, F1)", () => {
    for (const l of LOCALES) {
      const s = dictNeuf(l).saisie as Record<string, unknown>;
      expect("q2" in s || "q3" in s).toBe(false);
      // Décision de Dani (18/10) : en neuf, la carte Éco dit « Budget maîtrisé » / « Budget-conscious », sans « Locatif ».
      expect(dictNeuf(l).saisie.finitions.eco).toEqual({ eye: l === "fr" ? "Budget maîtrisé" : "Budget-conscious", desc: expect.any(String) });
      for (const f of ["standard", "premium"]) expect(Object.keys(dictNeuf(l).saisie.finitions[f])).toEqual(["desc"]);
      for (const q of ["pros", "partie", "max"]) expect(Object.keys(dictNeuf(l).saisie.quis[q])).toEqual(["desc"]);
    }
  });

  for (const l of LOCALES) {
    it(`${l} : mêmes titres, mêmes noms et accroches des deux côtés (l'accroche Éco du neuf à part, F1)`, () => {
      const T = dict(l).rapide, s = dictNeuf(l).saisie;
      const hn = neuf({}, l), hr = reno({}, l);
      expect(hn).toContain(`<span class="n">2</span>${esc(T.step3)}</div>`);
      expect(hn).toContain(`<span class="n">3</span>${esc(T.step4)}</div>`);
      expect(hr).toContain(`<span class="n">3</span>${esc(T.step3)}</div>`);
      expect(hr).toContain(`<span class="n">4</span>${esc(T.step4)}</div>`);
      for (const f of ["eco", "standard", "premium"] as const) {
        const fi = T.finitions[f];
        expect(hn).toContain(`<span class="eye">${esc(s.finitions[f].eye ?? fi.eye)}</span><span class="t">${esc(fi.label)}</span><span class="d">${esc(s.finitions[f].desc)}</span>`);
        expect(hr).toContain(`<span class="eye">${esc(fi.eye)}</span><span class="t">${esc(fi.label)}</span><span class="d">${esc(fi.desc)}</span>`);
      }
      // La rénovation garde « Locatif · budget maîtrisé » ; le neuf ne le dit nulle part.
      expect(T.finitions.eco.eye).toBe(l === "fr" ? "Locatif · budget maîtrisé" : "Rental · budget-conscious");
      expect(hn).not.toContain(esc(T.finitions.eco.eye));
      for (const q of ["pros", "partie", "max"] as const) {
        const qi = T.quis[q];
        expect(hn).toContain(`<span class="eye">${esc(qi.eye)}</span><span class="t">${esc(qi.label)}</span><span class="d">${esc(s.quis[q].desc)}</span>`);
        expect(hr).toContain(`<span class="eye">${esc(qi.eye)}</span><span class="t">${esc(qi.label)}</span>`);
      }
      if (l === "en") expect(hn).not.toMatch(/Basic|All done by pros|I do as much as I can|Minimum budget/);
      else expect(hn).not.toMatch(/Tout fait faire|Je fais le maximum|J&#x27;en fais une partie/);
    });
  }

  it("« Mon devis » du détaillé neuf et le texte « Réglage actuel » disent le même nom", () => {
    expect(lire("components/neuf/DevisNeuf.tsx")).toContain("T.rapide.finitions[ctx.finition]?.label");
    expect(dictNeuf("fr").detail.nouveauxAide.partie).toContain(`« ${dict("fr").rapide.quis.partie.label} »`);
    expect(dictNeuf("en").detail.nouveauxAide.partie).toContain(`“${dict("en").rapide.quis.partie.label}”`);
  });
});

/* ─── Le neuf : la fourchette en grand, le bilan replié ───────────────────────────────────── */

describe("N13 · bilan du neuf : la fourchette en grand, comme la rénovation", () => {
  const p = presetNeuf(R);
  const dv = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel);
  const ph = parPhase(dv);
  const r100 = (n: number) => Math.round(n / 100) * 100;

  for (const l of LOCALES) {
    it(`${l} : le gros chiffre est la fourchette, le total exact devient un repère`, () => {
      const h = renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: p.ctx, sel: p.sel, qui: "pros", locale: l, reel: true }));
      const big = /<div class="big">([\s\S]*?)<\/div>/.exec(h)?.[1] ?? "";
      expect(big).toContain(esc(eur(r100(dv.totaux.ttc * 0.85), l)));
      expect(big).toContain(esc(eur(r100(dv.totaux.ttc * 1.15), l)));
      expect(big).not.toContain(esc(eur(dv.totaux.ttc, l)));
      expect(h).toContain(`<div class="v data">${esc(eur(dv.totaux.ttc, l))}</div><div class="l">${esc(dictNeuf(l).rapide.centreK)}</div>`);
    });

    it(`${l} : un compte qui a les droits voit les 9 phases en clair`, () => {
      const h = renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: p.ctx, sel: p.sel, qui: "pros", locale: l, reel: true }));
      for (const ph9 of PHASES_NEUF) {
        expect(h).toContain(`>${esc(catT(l, "phases", ph9))}</span>`);
        expect(h).toContain(esc(eur(ph[ph9] ?? 0, l)));
      }
      expect(h).not.toContain("••• €");
      expect(h).not.toContain('class="verrou"');
    });

    it(`${l} : sinon, des barres factices floutées : ni nom ni montant de phase dans le HTML (D9)`, () => {
      for (const beta of [false, true]) {
        const h = renderToStaticMarkup(createElement(BilanRapideNeuf, {
          ctx: p.ctx, sel: p.sel, qui: "pros", locale: l, reel: false, beta,
          ctaVerrou: createElement("button", { type: "button", className: "cta-v" }, "→"),
        }));
        for (const ph9 of PHASES_NEUF) {
          expect(h, ph9).not.toContain(`>${esc(catT(l, "phases", ph9))}<`);
          expect(h, ph9).not.toContain(esc(eur(ph[ph9] ?? 0, l)));
        }
        expect(h.split("••• €").length - 1).toBe(9);
        expect(h).toContain('<div class="bars" aria-hidden="true">');
        const t = dictNeuf(l).rapide;
        expect(h).toContain(`<b>${esc(beta ? t.phasesLockBetaH : t.phasesLockH)}</b>`);
        expect(h).toContain(`<span class="chip">${beta ? dict(l).beta.pastille : "Pro"}</span>`);
        expect(h).toContain('<button type="button" class="cta-v">→</button>');
        // Le budget global reste affiché.
        expect(h).toContain(esc(eur(r100(dv.totaux.ttc * 0.85), l)));
      }
    });
  }
});

describe("N13 · rapide neuf : le bilan replié sous les questions, la règle commune de l'aperçu", () => {
  it("page vierge : ni bilan ni encadré d'attente (la barre dit d'abord de répondre)", () => {
    const h = neuf({});
    expect(h).not.toContain("<details");
    expect(h).not.toContain('class="attente"');
    expect(h).toContain(`<div class="sub">${esc(dictNeuf("fr").saisie.attente)}</div>`);
  });

  for (const l of LOCALES) {
    it(`${l} : un chiffre affiché : le bilan est replié ; réel pour un compte qui a les droits, factice sinon`, () => {
      const t = dictNeuf(l).rapide;
      const p = presetNeuf(R);
      const ph = parPhase(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel));
      const pro = neuf(rouvertNeuf(true), l), gratuit = neuf(rouvertNeuf(false), l);
      for (const h of [pro, gratuit]) {
        expect(h).toContain(`<details class="pli"><summary><span class="pli-t"><b>${esc(t.bilanPli)}</b><span>${esc(t.bilanPliSous)}</span></span>`);
        expect(h).not.toMatch(/<details class="pli" open/);
      }
      expect(pro).toContain(esc(eur(ph[PHASES_NEUF[0]] ?? 0, l)));
      expect(pro).not.toContain("••• €");
      expect(gratuit).not.toContain(esc(eur(ph[PHASES_NEUF[0]] ?? 0, l)));
      expect(gratuit).toContain("••• €");
      expect(gratuit).toContain(`>${esc(t.passPro)}</button>`);
      // Bêta, anonyme : le cadenas mène à l'inscription gratuite.
      const anonyme = neuf({ beta: true, edit: { projectId: "p1" }, initialR: R }, l);
      expect(anonyme).toContain(`>${esc(dict(l).beta.creerCompteFleche)}</button>`);
      expect(anonyme).toContain(`<b>${esc(t.phasesLockBetaH)}</b>`);
    });
  }

  it("le cadenas appelle « Affiner » (sa version courante), rien d'autre", () => {
    const src = lire("components/neuf/EstimateurRapideNeuf.tsx");
    expect(src).toContain("affinerRef.current = affiner;");
    expect(src).toContain('onClick={() => affinerRef.current()}');
    expect(src).toContain("reel={isPro} beta={beta}");
  });
});

/* ─── Fiche d'un rapide neuf : garage, eaux usées, règle de l'aperçu ──────────────────────── */

async function ficheNeuf(reponses: Record<string, unknown>, isPro: boolean, locale: Loc) {
  LOCALE.v = locale;
  const { default: ResultatRapideNeuf } = await import("@/components/neuf/ResultatRapideNeuf");
  const el = await ResultatRapideNeuf({ reponses: reponses as never, projectId: "p9", isPro });
  const { prelude } = await prerender(el);
  return new Response(prelude).text();
}

describe("N13 · fiche d'un rapide neuf", () => {
  afterEach(() => { LOCALE.v = "fr"; });
  const p = presetNeuf(R);
  const reponses = { v: "estimateur", mode: "rapide", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000", R };
  const dv = buildDevis(catalogueDe(p.ctx as Ctx), p.ctx as Ctx, p.sel as Selection);
  const ph = parPhase(dv);
  const lourds = [...dv.lignes].filter((li) => li.ttc > 0).sort((a, b) => b.ttc - a.ttc).slice(0, 5);

  for (const l of LOCALES) {
    it(`${l} : garage et eaux usées dans le résumé, les noms communs de finition et de « qui réalise »`, async () => {
      const h = await ficheNeuf(reponses, false, l);
      const s = dictNeuf(l).saisie, t = dictNeuf(l).rapide, T = dict(l).rapide;
      const garage = Math.round(p.ctx.neuf!.garage).toLocaleString(l === "en" ? "en-US" : "fr-FR");
      expect(h).toContain(`<div class="k">${esc(t.garageK)}</div><div class="v">${esc(s.garageOui(garage))}</div>`);
      expect(h).toContain(`<div class="k">${esc(t.eauxK)}</div><div class="v">${esc(s.eaux.fosse)}</div>`);
      expect(h).toContain(`<div class="v">${esc(T.finitions.standard.label)}</div>`);
      expect(h).toContain(`<div class="v">${esc(T.quis.pros.label)}</div>`);
      expect((h.match(/<div class="item">/g) ?? []).length).toBe(6);
    });

    it(`${l} · gratuit : ni phase, ni poste réel dans le HTML ; un cadenas`, async () => {
      const h = await ficheNeuf(reponses, false, l);
      expect(h).toContain('class="lock"');
      for (const li of lourds) {
        expect(h).not.toContain(`>${esc(catLigne(l, li.nom, li.cle))}<`);
        expect(h).not.toContain(esc(eur(li.ttc, l)));
      }
      for (const ph9 of PHASES_NEUF) expect(h).not.toContain(esc(eur(ph[ph9] ?? 0, l)));
    });

    it(`${l} · Pro : phases et postes les plus lourds en clair, sans cadenas`, async () => {
      const h = await ficheNeuf(reponses, true, l);
      expect(h).not.toContain('class="lock"');
      expect(h).not.toContain('class="verrou"');
      expect(h).not.toContain("••• €");
      expect(h).toContain(esc(dictNeuf(l).rapide.detailProK));
      for (const li of lourds) expect(h).toContain(esc(eur(li.ttc, l)));
      for (const ph9 of PHASES_NEUF) expect(h).toContain(esc(eur(ph[ph9] ?? 0, l)));
    });
  }

  it("sans garage, tout-à-l'égout : « Non » et « Tout-à-l'égout »", async () => {
    const q = presetNeuf({ ...R, garage: false, assainissement: "collectif" });
    const h = await ficheNeuf({ ...reponses, ctx: q.ctx, sel: q.sel }, false, "fr");
    expect(h).toContain(`<div class="v">Non</div>`);
    expect(h).toContain(`<div class="v">Tout-à-l&#x27;égout</div>`);
  });
});

/* ─── La rénovation : libellés selon le compte ────────────────────────────────────────────── */

describe("N13 · rapide réno : les boutons et l'introduction selon le compte", () => {
  const bouton = (h: string, cls: string) => new RegExp(`<button type="button" class="${cls}"[^>]*>([^<]*)</button>`).exec(h)?.[1];
  const intro = (h: string) => /<p class="intro">([^<]*)<\/p>/.exec(h)?.[1];
  const p = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
  const edit = editionRapideReno("p1", { mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000" }, "45000");

  for (const l of LOCALES) {
    const T = dict(l);
    it(`${l} : anonyme, compte (bêta comprise), bêta anonyme, projet rouvert`, () => {
      const cas: [string, Parameters<typeof EstimateurRapide>[0], string, string, string][] = [
        ["anonyme", {}, T.rapide.affiner, T.rapide.enregistrer, T.rapide.introGratuit],
        ["bêta, anonyme", { beta: true }, T.beta.affiner, T.rapide.enregistrer, T.beta.introReno],
        ["compte", { isPro: true }, T.rapide.affinerInclus, T.rapide.enregistrerCompte, T.rapide.intro],
        ["bêta, connecté", { isPro: true, beta: true }, T.rapide.affinerInclus, T.rapide.enregistrerCompte, T.rapide.intro],
        ["projet rouvert", { edit }, T.rapide.affiner, T.rapide.enregistrerCompte, T.rapide.introGratuit],
      ];
      for (const [nom, props, aff, enr, int] of cas) {
        const h = reno(props, l);
        expect([bouton(h, "ghost"), bouton(h, "cta"), intro(h)], nom).toEqual([esc(aff), esc(enr), esc(int)]);
      }
      // Un compte qui a les droits ne lit ni « Pro » ni « gratuit » ni « il suffit d'un compte ».
      const compte = reno({ isPro: true, beta: true }, l);
      expect(compte).not.toMatch(/— Pro|— gratuit|— free|— Pro|il suffit d&#x27;un compte|all you need is an account/);
    });
  }

  it("la ligne « Ajoute une pièce » de la barre est traduite (elle était en français en dur)", () => {
    expect(lire("components/EstimateurRapide.tsx")).not.toContain('"Ajoute une pièce"');
    expect(dict("en").rapide.ajoutePiece).toBe("Add a room");
  });
});

/* ─── La rénovation : accessibilité ───────────────────────────────────────────────────────── */

describe("N13 · rapide réno : accessibilité (comme le rapide du neuf)", () => {
  for (const l of LOCALES) {
    it(`${l} : libellés reliés, groupes nommés, boutons pressés ou non, cibles de 44 px`, () => {
      const h = reno({}, l), t = dict(l).rapide;
      expect(h).toContain(`<label for="rapide-surface">${esc(t.surfaceLabel)}</label>`);
      expect(h).toMatch(/<input id="rapide-surface" type="number"/);
      expect(h).toContain(`<label for="rapide-cp">${esc(t.cpLabel)}</label><input id="rapide-cp" inputMode="numeric" maxLength="5" autoComplete="postal-code"`);
      for (const g of [t.bienEntier, t.uneOuPlusieurs, t.step2, t.step3, t.step4]) expect(h).toContain(`role="group" aria-label="${esc(g)}"`);
      // Tous les boutons du formulaire et de la barre sont des boutons « button » ; les choix disent s'ils sont pressés.
      expect([...h.matchAll(/<button(?![^>]*type="button")[^>]*>/g)].map((m) => m[0])).toEqual([]);
      const choix = [...h.matchAll(/<button type="button" class="(on|amp[^"]*|fin[^"]*|qcard[^"]*|)"( aria-pressed="(true|false)")?/g)];
      expect(choix.length).toBe(2 + 4 + 3 + 3);
      for (const m of choix) expect(m[2], m[0]).toBeTruthy();
      expect(h).toContain('class="amp on" aria-pressed="true"');
    });
  }

  it("« Enregistrer » sans code postal ou sans surface : champ marqué (aria-invalid), focalisé, relié au message", () => {
    const src = lire("components/EstimateurRapide.tsx");
    expect(src).toContain('import { useChampEnFaute } from "@/components/estimateur/champ-en-faute";');
    expect(src).toContain('const ID_CHAMP = { cp: "rapide-cp", surface: "rapide-surface" } as const;');
    expect(src).toContain('if (!/^\\d{5}$/.test(cp)) { signaler(t.errCp, "cp"); return; }');
    expect(src).toContain('signaler(t.errSurface, mode === "bien" ? "surface" : undefined)');
    expect(src).toContain('aria-invalid={faute.champ === "cp" || undefined} aria-describedby={faute.champ === "cp" ? ID_ERREUR : undefined}');
    expect(src).toContain('invalide={faute.champ === "surface"}');
    expect(src).toContain('<div className="err" id={ID_ERREUR} role="alert">{erreur}</div>');
    expect(lire("components/Stepper.tsx")).toContain("aria-invalid={invalide || undefined}");
    expect(lire("components/estimateur/champ-en-faute.ts")).toContain("el.focus({ preventScroll: true })");
    // Le style du champ en faute et les cibles de 44 px valent pour les deux rapides (RAPIDE_CSS), plus seulement le neuf.
    const css = lire("components/estimateur/rapide-styles.ts");
    expect(css).toContain(".av-rapide .seg button,.av-rapide .fld input{min-height:44px}");
    expect(css).toContain('.av-rapide .fld input[aria-invalid="true"]');
    expect(css).toContain(".av-rapide-live .cta,.av-rapide-live .ghost{min-height:44px}");
    expect(lire("components/neuf/neuf-styles.ts")).not.toContain("aria-invalid");
  });

  it("tutoiement : aucun « vous » dans les textes français des deux rapides", () => {
    const fr = dict("fr"), n = dictNeuf("fr");
    const tout = JSON.stringify([fr.rapide, fr.beta, n.rapide, n.saisie, n.passerelles, n.choix])
      + [n.saisie.garageOui, n.saisie.planResume, n.rapide.exclExtOrdre].map(String).join(" ");
    expect(tout).not.toMatch(/\b(vous|votre|vos|Renseignez|Indiquez|Ajoutez|Réessayez)\b/);
  });
});

/* ─── La rénovation : « Affiner » sans les droits, retour de /tarifs ──────────────────────── */

describe("N13 · rapide réno : « Affiner » sans les droits mène à /tarifs, les réponses reviennent", () => {
  const ok = { mode: "bien", type: "Maison", surface: 100, pieces: [], cp: "45000", ampleur: "complete", finition: "standard", qui: "pros" };

  it("relit des réponses valides, refuse ce qui sort des choix du formulaire", () => {
    expect(lireRetourRapideReno(ok)).toEqual(ok);
    expect(lireRetourRapideReno({ ...ok, type: "Appartement", cp: "" })?.type).toBe("Appartement");
    const pieces = [{ room: "sdb", surface: 6 }];
    expect(lireRetourRapideReno({ ...ok, mode: "pieces", pieces })?.pieces).toEqual(pieces);
    for (const faux of [null, "x", [], { ...ok, mode: "tout" }, { ...ok, type: "Château" }, { ...ok, surface: "abc" }, { ...ok, surface: 0 },
      { ...ok, cp: "750011" }, { ...ok, cp: 45000 }, { ...ok, ampleur: "__proto__" }, { ...ok, finition: "luxe" }, { ...ok, qui: "tous" },
      { ...ok, mode: "pieces", pieces: [] }, { ...ok, mode: "pieces", pieces: [{ room: "garage", surface: 20 }] }]) {
      expect(lireRetourRapideReno(faux), JSON.stringify(faux)).toBeNull();
    }
  });

  it("le chiffre revient (affiché) sans compter comme une estimation", () => {
    expect(chiffreAfficheRapide({ demarre: false, edition: false, retour: true })).toBe(true);
    expect(chiffreAfficheRapide({ demarre: false, edition: false })).toBe(false);
    const src = lire("components/EstimateurRapide.tsx");
    // La reprise pose `retour`, jamais `demarre` : ni mesure ni conversion au retour.
    const reprise = src.slice(src.indexOf("const brut = sessionStorage.getItem(CLE_RETOUR_RENO);"), src.indexOf("// Une seule lecture, au montage."));
    expect(reprise).toContain("setRetour(true);");
    expect(reprise).not.toContain("setDemarre");
    expect(CLE_RETOUR_RENO).toBe("avyora-reno-retour");
  });

  it("anonyme hors bêta (ou projet rouvert) : /tarifs?source=affiner-reno ; bêta : l'inscription ; compte : le détaillé", () => {
    const src = lire("components/EstimateurRapide.tsx");
    expect(src).toContain("const versTarifs = !isPro && !versInscription;");
    expect(src).toContain("if (versTarifs && !edit) {");
    expect(src).toContain("sessionStorage.setItem(CLE_RETOUR_RENO, JSON.stringify(r));");
    expect(src).toMatch(/router\.push\(versInscription \? lienInscriptionBeta\("\/projets\/nouveau\/detaille\?affiner=1", "affiner-reno"\)\s*: versTarifs \? "\/tarifs\?source=affiner-reno"\s*: "\/projets\/nouveau\/detaille"\);/);
  });
});

/* ─── La mesure du rapide de la rénovation ne bouge pas (hameçon SEO / Google Ads) ─────────── */

describe("N13 · rapide réno : estimation_terminee et la conversion Google Ads partent exactement comme avant", () => {
  const src = lire("components/EstimateurRapide.tsx");
  it("une fois, 1,8 s après une fourchette stable, sur `estimationReelle` (bloc identique à celui d'avant N13)", () => {
    expect(src).toContain(`  const estimationReelle = estimationReelleRapide({ demarre, saisieValide, ttc: tot.ttc, codePostal: cp });
  useEffect(() => {
    if (convFired.current || !estimationReelle) return;
    const id = window.setTimeout(() => {
      convFired.current = true;
      suivre("estimation_terminee", { action: "affichee", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
      conversionEstimation("reno");
    }, 1800);
    return () => window.clearTimeout(id);
  }, [estimationReelle, mode, type, ampleur]);`);
  });

  it("« Affiner » et « Enregistrer » : les mêmes appels qu'avant, et nulle part ailleurs", () => {
    expect(src).toContain(`    if (estimationReelle) {
      suivre("estimation_terminee", { action: "affiner", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
      conversionEstimation("reno");
    }`);
    expect(src).toContain(`    suivre("estimation_terminee", { action: "enregistrer", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
    conversionEstimation("reno");`);
    expect(src.split('suivre("estimation_terminee"').length - 1).toBe(3);
    expect(src.split("conversionEstimation(").length - 1).toBe(3);
    // Les deux conditions qui font une estimation réelle, inchangées.
    expect(lire("lib/estimateur/rapide-reno.ts")).toContain("return p.demarre && p.saisieValide && p.ttc > 0 && CP.test(p.codePostal);");
    expect(lire("lib/gtag.ts")).toContain("const cle = `av_conv_estimation_${nature}`;");
  });

  it("le nouvel événement `projet_enregistre` ne part qu'après une réponse positive de l'API, jamais avant la conversion", () => {
    const i = src.indexOf('suivre("projet_enregistre"');
    expect(i).toBeGreaterThan(src.indexOf("if (!res.ok) { setErreur(data?.error || t.errSave); setSaving(false); return; }"));
    expect(i).toBeGreaterThan(src.indexOf('suivre("estimation_terminee", { action: "enregistrer"'));
  });
});

/* ─── Passerelles et mesure de l'enregistrement ───────────────────────────────────────────── */

describe("N13 · passerelles « Tu fais construire ? » et « Un logement existant ? »", () => {
  for (const l of LOCALES) {
    it(l, () => {
      const p = dictNeuf(l).passerelles;
      const versNeuf = renderToStaticMarkup(createElement(PasserelleRapide, { vers: "neuf", locale: l }));
      const versReno = renderToStaticMarkup(createElement(PasserelleRapide, { vers: "reno", locale: l }));
      expect(versNeuf).toContain(`${esc(p.versNeuf)} <a class="font-medium text-brand-700 hover:underline" href="/estimation-construction-maison">${esc(p.versNeufLien)}</a>`);
      expect(versReno).toContain(`${esc(p.versReno)} <a class="font-medium text-brand-700 hover:underline" href="/estimation-travaux">${esc(p.versRenoLien)}</a>`);
    });
  }

  it("posées par les pages publiques seulement, derrière l'interrupteur côté rénovation", () => {
    expect(lire("app/estimation-travaux/page.tsx")).toContain('{FEATURES.neuf && <PasserelleRapide vers="neuf" locale={locale} />}');
    expect(lire("app/estimation-construction-maison/page.tsx")).toContain('<PasserelleRapide vers="reno" locale={locale} />');
    for (const f of ["components/EstimateurRapide.tsx", "components/neuf/EstimateurRapideNeuf.tsx", "app/projets/[id]/modifier/page.tsx"]) {
      expect(lire(f), f).not.toContain("PasserelleRapide");
    }
  });
});

describe("N13 · `projet_enregistre { nature, mode, edition }` à chaque enregistrement réussi", () => {
  it("déclaré, et émis par les quatre estimateurs et la réclamation après inscription", () => {
    expect(lire("lib/track.ts")).toContain('| "projet_enregistre"');
    const attendus: [string, string][] = [
      ["components/EstimateurRapide.tsx", 'suivre("projet_enregistre", { nature: "reno", mode: "rapide", edition: !!edit });'],
      ["components/neuf/EstimateurRapideNeuf.tsx", 'suivre("projet_enregistre", { nature: "neuf", mode: "rapide", edition: !!edit });'],
      ["components/Estimateur.tsx", 'suivre("projet_enregistre", { nature: "reno", mode: "detaille", edition });'],
      ["components/neuf/EstimateurNeuf.tsx", 'suivre("projet_enregistre", { nature: "neuf", mode: "detaille", edition });'],
      ["components/ClaimDraft.tsx", 'suivre("projet_enregistre", { nature: "neuf", mode: dn.mode === "detaille" ? "detaille" : "rapide", edition: false });'],
      ["components/ClaimDraft.tsx", 'suivre("projet_enregistre", { nature: "reno", mode: d.mode === "detaille" ? "detaille" : "rapide", edition: false });'],
    ];
    for (const [f, ligne] of attendus) {
      const src = lire(f);
      expect(src, f).toContain(ligne);
      // Après le contrôle de la réponse : jamais pour un 401 ni une erreur.
      const i = src.indexOf(ligne);
      expect(src.lastIndexOf("res.ok", i), f).toBeGreaterThan(-1);
    }
  });
});

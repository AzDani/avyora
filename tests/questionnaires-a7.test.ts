/**
 * A7 (étape 2 de la revue rénovation / neuf) : les 7 écarts visuels relevés par le contrôle de l'étape 1
 * entre le questionnaire de la rénovation (/projets/nouveau/detaille) et celui du neuf
 * (/projets/nouveau/construction). Le neuf est aligné sur la rénovation ; la rénovation ne bouge pas,
 * sauf le champ en faute (7) et la virgule de « plafond 2,5 m ».
 *
 * 1. Surfaces dans l'ordre de la rénovation : habitable, (garage), hauteur, code postal.
 * 2. La grille de compteurs aux mêmes paires (« Niveaux » en lecture seule dans le neuf), l'interrupteur
 *    « Cuisine équipée comprise » sous la grille.
 * 3. Code postal : l'exemple « 33000 » ; la zone dite au seul récapitulatif, sans « MO ».
 * 4. « Budget & imprévus » compacts comme la rénovation.
 * 5. Finition : mêmes noms, mêmes accroches (« Economy » en anglais), les cartes de la rénovation.
 * 6. Barre live : la hauteur de la rénovation sur mobile (mesurée au navigateur ; ici, ses règles).
 * 7. « Enregistrer » sans code postal : champ marqué, focalisé, relié au message, des deux côtés.
 * Aucun total ne bouge : rien ici ne touche au moteur (T1, T5).
 * Rendu serveur (`renderToStaticMarkup`), sans la feuille de style en ligne.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import Estimateur from "@/components/Estimateur";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import { CompteurFixe } from "@/components/estimateur/intake";
import { EST_CSS } from "@/components/estimateur-styles";
import { INTAKE_CSS } from "@/components/estimateur/intake-styles";
import { NEUF_DETAIL_CSS } from "@/components/neuf/detail-styles";
import { TOUTES_QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { presetMaison, maisonParDefaut, regionCoef, type MaisonNeuve } from "@/lib/estimateur";
import { dictDetail } from "@/lib/i18n/detail";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dict, type Dict } from "@/lib/i18n/dictionaries";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const LOCALES = ["fr", "en"] as const;
type Loc = (typeof LOCALES)[number];
const Neuf = EstimateurNeuf as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
const sansStyle = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const rendre = (el: ReturnType<typeof createElement>, locale: Loc) => sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: el })));
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const desechapper = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** Le bloc des surfaces : la première rangée de champs (`.depart`) de la carte. */
const surfaces = (html: string) => html.slice(html.indexOf('<div class="depart'), html.indexOf('<div class="gl">', html.indexOf('<div class="depart')));
const libelles = (bloc: string) => [...bloc.matchAll(/<label for="[^"]*">([^<]*)/g)].map((m) => desechapper(m[1]));
/** Les cases de la grille de compteurs (réglables ou non), dans l'ordre : leur libellé. */
const cases = (html: string) => [...html.matchAll(/<div class="stp(?: fixe)?"><span class="l"[^>]*>([^<]*)/g)].map((m) => desechapper(m[1]));
const bloc = (html: string, debut: string) => { const i = html.indexOf(debut); return i < 0 ? "" : html.slice(i, html.indexOf("</button></div>", i) + 15); };
const q = (k: string) => TOUTES_QUESTIONS_NEUF.find((x) => x.k === k)!;
/** Un projet neuf enregistré (les réponses que « Modifier » rouvre) pour cette maison. */
const projetNeuf = (m: MaisonNeuve) => ({ v: "estimateur", ctx: presetMaison(m, { codePostal: m.codePostal }).ctx, sel: {}, qui: "pros" });

describe("A7 · les deux questionnaires côte à côte", () => {
  for (const locale of LOCALES) {
    const reno = rendre(createElement(Estimateur), locale);
    const neuf = rendre(createElement(EstimateurNeuf), locale);
    const B = dictDetail(locale).bien, d = dictNeuf(locale).detail;

    it(`${locale} (1) : surfaces dans l'ordre de la rénovation — habitable, garage, hauteur, code postal`, () => {
      expect(libelles(surfaces(reno))).toEqual([B.surfaceHab, B.surfaceSol, B.hauteur, B.cp]);
      expect(libelles(surfaces(neuf))).toEqual([q("surface").l[locale], q("garage").l[locale], B.hauteur, q("codePostal").l[locale]]);
    });

    it(`${locale} (2) : la grille aux paires de la rénovation, « Niveaux » en lecture seule, l'interrupteur dessous`, () => {
      expect(cases(neuf)).toEqual(cases(reno));
      expect(cases(neuf)).toHaveLength(10);
      expect(cases(neuf)[0]).toBe(B.compteurs.niveaux);
      // la case « Niveaux » du neuf se lit sans se régler : aucun bouton, le nombre du type de maison (plain-pied : 1)
      expect(neuf).toContain(`<div class="stp fixe"><span class="l" id="av-neuf-niveaux-n-l">${echapper(B.compteurs.niveaux)}<small>${echapper(d.niveauxAide)}</small></span>`
        + '<output id="av-neuf-niveaux-n" class="c" aria-labelledby="av-neuf-niveaux-n-l"><span class="v num">1</span></output></div>');
      // l'interrupteur « Cuisine équipée comprise » suit la grille (la dernière case fermée, puis la grille)
      expect(neuf).toMatch(/<\/span><\/div><\/div><button type="button" class="drtoggle on" aria-pressed="true">/);
      const grille = neuf.slice(neuf.indexOf('<div class="stpg">'), neuf.indexOf('class="drtoggle'));
      expect((grille.match(/class="stp(?: fixe)?"/g) ?? []).length).toBe(10);
    });

    it(`${locale} (2) : « Niveaux » vaut 2 pour une maison à étage ou avec combles`, () => {
      for (const niveaux of ["etage", "combles"] as const) {
        const html = rendre(createElement(Neuf, { initialState: projetNeuf({ ...maisonParDefaut(140), niveaux, codePostal: "45000" }), projectId: "p1" }), locale);
        expect(html, niveaux).toContain('<output id="av-neuf-niveaux-n" class="c" aria-labelledby="av-neuf-niveaux-n-l"><span class="v num">2</span></output>');
      }
      expect(renderToStaticMarkup(createElement(CompteurFixe, { id: "x", label: "L", valeur: 3 }))).toBe(
        '<div class="stp fixe"><span class="l" id="x-l">L</span><output id="x" class="c" aria-labelledby="x-l"><span class="v num">3</span></output></div>');
    });

    it(`${locale} (3) : code postal — l'exemple « 33000 » des deux côtés, la zone au seul récapitulatif`, () => {
      expect(B.cpExemple).toBe("33000");
      for (const html of [reno, neuf]) expect(html).toContain('autoComplete="postal-code" placeholder="33000"');
      const cp = surfaces(neuf).slice(surfaces(neuf).indexOf('<label for="av-neuf-codePostal">'));
      expect(cp).not.toMatch(/<div style="font-size:11.5px/);   // aucune aide sous le champ, comme en rénovation
      // un code postal saisi : la zone au récapitulatif (main-d'œuvre en toutes lettres), jamais « MO »
      const html = rendre(createElement(Neuf, { initialState: projetNeuf({ ...maisonParDefaut(), codePostal: "75011" }), projectId: "p1" }), locale);
      expect(html).toMatch(/id="av-neuf-codePostal"[^>]*value="75011"/);
      const reg = regionCoef("75011");
      expect(reg.mo).toBeGreaterThan(1);
      expect(html).toContain(`📍 <b>${echapper(dict(locale).rapide.zones[reg.zone as keyof Dict["rapide"]["zones"]] ?? reg.zone)}</b> · ${echapper(dictDetail(locale).recap.mo("+" + Math.round((reg.mo - 1) * 100)))}`);
      expect(html).not.toContain(dict(locale).rapide.moSuffix);
      expect(fs.readFileSync("components/neuf/EstimateurNeuf.tsx", "utf8")).not.toMatch(/moSuffix|cpPlaceholder/);
    });

    it(`${locale} (4) : « Budget & imprévus » compacts — seules les surfaces (et la distance) remplissent leur colonne`, () => {
      expect(NEUF_DETAIL_CSS).not.toContain(".av-neuf-d .fld>.av-step.field{display:flex}");
      expect(NEUF_DETAIL_CSS).toContain(".av-neuf-d .surf .fld>.av-step.field,.av-neuf-d .tq .fld>.av-step.field{display:flex}");
      expect(neuf).toContain('<div class="depart surf">');
      const budget = neuf.slice(neuf.lastIndexOf('<div class="depart'));
      expect(budget.startsWith('<div class="depart">')).toBe(true);
      expect(budget).toContain('id="av-neuf-budget"');
    });

    it(`${locale} (5) : les cartes de finition de la rénovation, mêmes noms et mêmes accroches`, () => {
      expect(bloc(neuf, '<div class="finc"')).toBe(bloc(reno, '<div class="finc"'));
      const rapide = dictNeuf(locale).saisie.finitions, ref = B.finitions;
      for (const f of ["eco", "standard", "premium"]) {
        expect([rapide[f].label, rapide[f].eye], f).toEqual([ref[f].label, ref[f].eye]);
        expect(q("$finition").o!.find(([v]) => v === f)![1][locale], f).toBe(ref[f].label);
      }
      if (locale === "en") {
        expect(ref.eco.label).toBe("Economy");
        expect(dict("en").rapide.finitions.eco.label).toBe("Economy");
      }
    });

    it(`${locale} (6) : barre live — le prix au m² court sur mobile, sur la ligne du total`, () => {
      expect(neuf).toMatch(new RegExp(`<div class="m2">≈ [^<]+<span class="m2-l"> ${echapper(d.parM2)}</span><span class="m2-c">/m²</span>`));
      expect(d.parM2Court).toBe("/m²");
    });

    it(`${locale} : « plafond » à la virgule française, au point en anglais`, () => {
      expect(dictDetail(locale).recap.plafond(2.5)).toBe(locale === "fr" ? "plafond 2,5 m" : "ceiling 2.5 m");
      expect(reno).toContain(locale === "fr" ? "plafond 2,5 m" : "ceiling 2.5 m");
      expect(reno).not.toContain("plafond 2.5");
    });
  }

  it("(6) : sur mobile, la ligne du total garde la hauteur de la rénovation (22 px), le prix au m² ne s'y montre que s'il tient", () => {
    const mobile = NEUF_DETAIL_CSS.slice(NEUF_DETAIL_CSS.indexOf("@media(max-width:560px)"));
    expect(mobile).toContain(".av-neuf-live .totb{max-width:none;flex-wrap:wrap;max-height:22px;overflow:hidden}");
    expect(mobile).toContain(".av-neuf-live .m2-l,.av-neuf-live .m2-f{display:none}");
    expect(mobile).toContain(".av-neuf-live .m2-c{display:inline}");
    expect(mobile).not.toMatch(/\.m2\{flex-basis:100%/);
    // la ligne du total de la rénovation : un nombre de 21 px (hauteur de ligne 1) et son libellé, alignés sur la ligne de base
    expect(EST_CSS).toContain(".av-estim-live .big{font-size:21px}");
    expect(EST_CSS).toContain(".av-estim-live .totb{flex-basis:100%;display:flex;align-items:baseline;gap:9px}");
  });

  it("(7) : « Enregistrer » sans code postal — le même comportement des deux côtés (marqué, focalisé, relié au message)", () => {
    const reno = fs.readFileSync("components/Estimateur.tsx", "utf8");
    const neuf = fs.readFileSync("components/neuf/EstimateurNeuf.tsx", "utf8");
    for (const src of [reno, neuf]) {
      expect(src).toContain("useChampEnFaute<");
      expect(src).toMatch(/<ChampCodePostal [^>]*invalide=\{faute\.champ === "(cp|codePostal)"\} erreurId=\{ID_ERREUR\} \/>/);
      expect(src).toMatch(/<BarreLive [^>]*erreurId=\{ID_ERREUR\}/);
      expect(src).toMatch(/faute\.effacer\(\); setErreur\(null\);/);   // un code postal valide efface la faute
    }
    expect(reno).toContain("faute.signaler(manque, ID_CHAMP[manque])");
    expect(reno).toContain('const ID_CHAMP = { cp: "av-reno-cp", surface: "av-reno-surface" } as const;');
    expect(neuf).toContain("faute.signaler(champ, ID(champ))");
    // le champ en faute s'affiche de la même façon : la règle est commune (INTAKE_CSS, injecté par les deux
    // détaillés, pas par la fiche projet), plus propre au neuf
    expect(INTAKE_CSS).toContain('.av-estim .uinp:has(input[aria-invalid="true"])');
    expect(NEUF_DETAIL_CSS).not.toContain("aria-invalid");
    expect(EST_CSS).not.toContain("aria-invalid");
    expect(reno).toContain("EST_CSS + ROW_SOI_CSS + INTAKE_CSS");
    expect(neuf).toContain("EST_CSS + ROW_SOI_CSS + INTAKE_CSS + NEUF_DETAIL_CSS");
    // la brique : focalise le champ signalé, une fois la saisie réaffichée
    const brique = fs.readFileSync("components/estimateur/intake.tsx", "utf8");
    expect(brique).toContain("el.focus({ preventScroll: true })");
  });
});

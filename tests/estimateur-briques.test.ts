/**
 * Briques de l'estimateur détaillé (Row, CustomLines, Field, Stepper) : le HTML rendu est figé
 * par un instantané pris AVANT leur extraction hors de `Estimateur.tsx` (chantier C1 du
 * branchement du neuf). L'extraction est un déplacement pur : l'instantané ne doit pas bouger.
 */
import { describe, it, expect } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG, defaultCtx, finCoef, isLoc, key, type Ctx, type Selection, type CustomLine } from "@/lib/estimateur";
import { LangProvider } from "@/components/i18n/LangProvider";
import { Row } from "@/components/estimateur/Row";
import { CustomLines, Field, Stepper, ChoicePrice } from "@/components/estimateur/partage";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import { CATALOG_NEUF, presetNeuf } from "@/lib/estimateur";
import { badgeNeuf, diyNeuf, puReelNeuf } from "@/lib/estimateur/detaille-neuf";

const rien = () => {};
const ctx: Ctx = { ...defaultCtx(), type: "Maison", surface: 100, surfaceSol: 100 };
const ctxR = { ...ctx, codePostal: "45000" } as Ctx;

const lot = (c: string) => {
  const l = CATALOG.find((x) => x.c === c);
  if (!l) throw new Error("lot introuvable : " + c);
  return l;
};
const tache = (c: string, n: string) => {
  const t = lot(c).t.find((x) => x.n === n);
  if (!t) throw new Error("poste introuvable : " + c + " | " + n);
  return t;
};

const rendre = (el: ReactElement, locale: "fr" | "en") =>
  renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));

function row(c: string, n: string, s?: Selection[string]) {
  const l = lot(c), t = tache(c, n);
  const sel: Selection = s ? { [key(c, n)]: s } : {};
  return createElement(Row, {
    l, t, ctx: ctxR, sel, coef: finCoef(ctx, l.c), loc: isLoc(l.c),
    onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
    onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
  });
}

const MEN = "Menuiseries exterieures", LOC = "Location de matériel";
const CAS: [string, string, string, Selection[string] | undefined][] = [
  // forfait
  ["forfait · décoché", "Etudes / Conception", "Plans du projet", undefined],
  ["forfait · coché", "Etudes / Conception", "Plans du projet", { on: true }],
  // m² (quantité automatique)
  ["m² · décoché", "Maçonnerie", "Chape traditionnelle", undefined],
  ["m² · auto", "Maçonnerie", "Chape traditionnelle", { on: true }],
  ["m² · manuel, je le fais, note lien", "Maçonnerie", "Chape liquide", { on: true, manual: true, qty: 42, self: true, note: "https://exemple.fr/chape" }],
  ["m² · prix perso", "Maçonnerie", "Chape traditionnelle", { on: true, pu: 61 }],
  // variantes
  ["menuiserie · alu triple", MEN, "Fenêtres", { on: true, qty: 6, mat: "alu", vit: "triple" }],
  ["menuiserie · prix matériaux perso", MEN, "Porte d'entrée", { on: true, qty: 1, pm: 800, self: true }],
  ["menuiserie · motorisation", MEN, "Portail battant (4 m)", { on: true, qty: 1, mot: "manuel" }],
  ["menuiserie · options", MEN, "Baie vitrée", { on: true, qty: 1 }],
  ["plomberie · options auto", "Plomberie", "WC", { on: true }],
  // location
  ["location · décochée", LOC, "Bétonnière", undefined],
  ["location · 3 jours", LOC, "Bétonnière", { on: true, qty: 3 }],
  ["location · forfait", LOC, "Livraison mini-pelle (dépose + reprise)", { on: true }],
];

const LIGNES: CustomLine[] = [
  { id: "c1", lot: "Maçonnerie", nom: "Muret jardin", prix: 450, unite: "ml", qte: 4, note: "https://exemple.fr/muret", tva: 10, on: true },
  { id: "c2", lot: "Maçonnerie", nom: "Sans lien", prix: 120, unite: "u", qte: 2, tva: 20, on: false },
  { id: "c3", lot: "Maçonnerie", nom: "Brouillon", prix: 0, unite: "u", qte: 1, note: "", tva: 10, on: true, draft: true },
];

describe("Briques de l'estimateur — rendu figé", () => {
  for (const locale of ["fr", "en"] as const) {
    for (const [nom, c, n, s] of CAS) {
      it(`Row ${locale} · ${nom}`, () => {
        expect(rendre(row(c, n, s), locale)).toMatchSnapshot();
      });
    }
    it(`CustomLines ${locale}`, () => {
      expect(rendre(createElement(CustomLines, { lines: LIGNES, onAdd: rien, onUpd: rien, onDel: rien }), locale)).toMatchSnapshot();
      expect(rendre(createElement(CustomLines, { lines: [], onAdd: rien, onUpd: rien, onDel: rien }), locale)).toMatchSnapshot();
    });
  }
  it("ChoicePrice", () => {
    const base = { label: "Fait faire", activeCls: "on-pro", onSelect: rien, onEdit: rien, onReset: rien };
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: true, amount: 1234.5, edited: false }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: false, amount: null, edited: false }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: true, amount: 61, edited: true }))).toMatchSnapshot();
  });
  it("RAPIDE_CSS (déplacé tel quel, partagé avec le rapide neuf)", () => {
    expect(RAPIDE_CSS.length).toBeGreaterThan(1000);
    for (const sel of [".av-rapide .fin", ".av-rapide .qcard", ".av-rapide .seg button", ".av-rapide-live .cta"]) expect(RAPIDE_CSS).toContain(sel);
    expect(RAPIDE_CSS).toMatchSnapshot();
  });
  it("Field et Stepper", () => {
    expect(renderToStaticMarkup(createElement(Field, { label: "Surface", hint: "Tous les niveaux", children: createElement("input") }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Field, { label: "Code postal", children: createElement("input") }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Stepper, { label: "Chambres", hint: "hors suite", value: 3, onStep: rien }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Stepper, { label: "WC", value: 1, onStep: rien }))).toMatchSnapshot();
  });
});

/* Construction neuve (C4) : `Row` reçoit `puReel`, `diy` et `badge`. Sans eux (ci-dessus), le rendu
   de la rénovation est inchangé ; avec eux, une ligne en % n'a pas de quantité et une démarche
   n'a pas de montant. */
describe("Row · props du neuf", () => {
  const p = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
  const rowNeuf = (id: string, s?: Selection[string]) => {
    const l = CATALOG_NEUF.find((x) => x.t.some((t) => t.id === id))!;
    const t = l.t.find((x) => x.id === id)!;
    const sel: Selection = s ? { ...p.sel, [key(l.c, t.n)]: s } : p.sel;
    return createElement(Row, {
      l, t, ctx: p.ctx, sel, coef: finCoef(p.ctx, l.c), loc: isLoc(l.c),
      puReel: puReelNeuf(p.ctx, sel, l, t), diy: diyNeuf(l, t), badge: badgeNeuf(p.ctx, sel, l, t),
      onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
      onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
    });
  };
  for (const locale of ["fr", "en"] as const) {
    it(`badge pct ${locale} · assurance dommages-ouvrage (% du projet, sans TVA)`, () => {
      const html = rendre(rowNeuf("ass-assurance-dommages-ouvrage"), locale);
      expect(html).toContain("badge-pct");
      expect(html).not.toContain("av-step");      // pas de quantité à saisir
      expect(html).not.toContain(">Je le fais<"); // jamais soi-même
      expect(html).toMatchSnapshot();
    });
    it(`badge pct ${locale} · maîtrise d'œuvre avec un prix perso : plus de pourcentage affiché`, () => {
      const html = rendre(rowNeuf("etu-maitrise-d-oeuvre-complete", { on: true, pu: 12000 }), locale);
      expect(html).not.toContain("badge-pct");
      expect(html).toMatchSnapshot();
    });
    it(`badge jalon ${locale} · déclaration d'ouverture de chantier`, () => {
      const html = rendre(rowNeuf("ass-declaration-ouverture-de-chantier"), locale);
      expect(html).toContain("badge-dem");
      expect(html).not.toContain("lineamt");
      expect(html).not.toContain("choice");
      expect(html).toMatchSnapshot();
    });
  }
});

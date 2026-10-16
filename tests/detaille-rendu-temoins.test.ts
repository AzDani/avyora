/**
 * Témoins de rendu des deux estimations DÉTAILLÉES (chantier N6 de la revue rénovation / neuf).
 *
 * Avant N6, aucun test ne couvrait l'écran du détaillé de la rénovation. Ces instantanés le figent
 * dans plusieurs états (maison, appartement, suite parentale, pièces ciblées, lignes perso, lots
 * ouverts, budget dépassé ; vue « Mon devis »), en français et en anglais, AVANT que ses briques
 * soient partagées avec le neuf (`components/estimateur/intake.tsx`, `ListeLots`, `BarreLive`,
 * `VueDevis`). Le neuf est figé de même (ouverture, « Mon devis ») : il commence à utiliser les
 * briques sans changer de rendu. Tout écart d'instantané est relu et listé avant un `-u` volontaire.
 *
 * Rendu serveur (`renderToStaticMarkup`), sans la feuille de style en ligne, une balise par ligne
 * pour que l'écart se lise. Un état non par défaut passe par `initialState` (projet rouvert) : le
 * détaillé de la rénovation le pose dès le premier rendu.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type FunctionComponent, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import Estimateur, { DevisView } from "@/components/Estimateur";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import DevisNeuf from "@/components/neuf/DevisNeuf";
import { CATALOG, CATALOG_NEUF, defaultCtx, espacesCompo, presetNeuf, raisonProNeuf, isLoc, key, type Ctx, type Selection, type CustomLine } from "@/lib/estimateur";
import { badgeNeuf } from "@/lib/estimateur/detaille-neuf";
import { LignesLot } from "@/components/estimateur/ListeLots";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const LOCALES = ["fr", "en"] as const;
/** Le détaillé avec ses props (paramètre par défaut `= {}` : `createElement` ne les infère pas). */
const Detaille = Estimateur as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
const propre = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/></g, ">\n<");
const rendre = (el: ReactElement, locale: "fr" | "en") => propre(renderToStaticMarkup(createElement(LangProvider, { locale, children: el })));

const MAC = "Maçonnerie", MEN = "Menuiseries exterieures", PLO = "Plomberie", LOC = "Location de matériel";
const CHA = "Charpente, couverture & structure bois", CAR = "Carrelage / Revetements";

const PERSO: CustomLine[] = [
  { id: "c1", lot: MAC, nom: "Muret jardin", prix: 450, unite: "ml", qte: 4, note: "https://exemple.fr/muret", tva: 10, on: true },
  { id: "c2", lot: MAC, nom: "Sans lien", prix: 120, unite: "u", qte: 2, tva: 20, on: false },
  { id: "c3", lot: MAC, nom: "Brouillon", prix: 0, unite: "u", qte: 1, note: "", tva: 10, on: true, draft: true },
  { id: "c4", lot: PLO, nom: "Lave-mains", prix: 380, unite: "u", qte: 1, tva: 10, on: true },
];

const SEL_MAISON: Selection = {
  [key(MAC, "Chape traditionnelle")]: { on: true },
  [key(MAC, "Chape liquide")]: { on: true, manual: true, qty: 42, self: true, note: "https://exemple.fr/chape" },
  [key(MAC, "Monter un mur en parpaings")]: { on: true, qty: 12, pu: 61 },
  [key(MEN, "Fenêtres")]: { on: true, qty: 6, mat: "alu", vit: "triple" },
  [key(MEN, "Baie vitrée")]: { on: true, qty: 1 },
  [key(MEN, "Portail battant (4 m)")]: { on: true, qty: 1, mot: "manuel" },
  [key(PLO, "WC")]: { on: true },
  [key(PLO, "Bac de douche")]: { on: true, self: true, pm: 210 },
  [key(LOC, "Bétonnière")]: { on: true, qty: 3 },
  [key("Peinture", "Peinture des murs")]: { on: true, self: true },
};

/** États de référence de la rénovation : ce qu'un projet rouvert apporte (`initialState`). */
const ETATS_RENO: Record<string, { ctx: Partial<Ctx>; sel?: Selection; open?: Record<string, boolean>; codePostal?: string; custom?: CustomLine[] }> = {
  maison: {
    ctx: { ...defaultCtx(), type: "Maison", surface: 120, surfaceSol: 60, niveaux: 2, fenetres: 10, chambres: 3, suites: 1, sdb: 1, wc: 2, budget: 150000, finition: "premium" },
    sel: SEL_MAISON, open: { [MAC]: true, [MEN]: true, [PLO]: true, [LOC]: true }, codePostal: "75011", custom: PERSO,
  },
  appartement: {
    ctx: { ...defaultCtx(), type: "T3", pieces: 6, fenetres: 7, surface: 65, surfaceSol: 65, fiscal: "pro", budget: 5000 },
    sel: { [key(CHA, "Escalier en bois")]: { on: true, qty: 1 }, [key(CAR, "Parquet bois")]: { on: true } },
    open: { [CHA]: true }, codePostal: "33000",
  },
  suite: {
    ctx: { ...defaultCtx(), perimetre: "piece", type: "Maison", espace: "suite", surface: 25, surfaceSol: 25, surfaceSolManual: true,
      suites: 1, sdb: 0, wc: 0, chambres: 0, sejour: 0, cuisine: 0, couloir: 0, buanderie: 0, fenetres: 2, niveaux: 1, zChambre: 14, zSdb: 6, zDressing: 5, avecDressing: true },
    sel: { [key(PLO, "Douche à l'italienne")]: { on: true } }, open: { [PLO]: true }, codePostal: "13001",
  },
  pieces: {
    ctx: { ...defaultCtx(), perimetre: "piece", type: "Maison", espaces: { chambre: [12, 10], sdb: [6] }, ...espacesCompo({ chambre: [12, 10], sdb: [6] }), budget: 0 },
    sel: {}, open: {}, codePostal: "",
  },
};

describe("Détaillé rénovation : rendu figé (N6)", () => {
  for (const locale of LOCALES) {
    it(`${locale} · page vierge`, () => {
      expect(rendre(createElement(Estimateur), locale)).toMatchSnapshot();
    });
    for (const [nom, e] of Object.entries(ETATS_RENO)) {
      it(`${locale} · ${nom}`, () => {
        expect(rendre(createElement(Detaille, { initialState: { v: "estimateur", ...e }, projectId: "p1" }), locale)).toMatchSnapshot();
      });
    }
    it(`${locale} · Mon devis (maison, lignes perso) et devis vide`, () => {
      const m = ETATS_RENO.maison;
      const ctx = { ...defaultCtx(), ...m.ctx, codePostal: m.codePostal } as Ctx;
      expect(rendre(createElement(DevisView, { ctx, sel: m.sel!, custom: m.custom }), locale)).toMatchSnapshot();
      expect(rendre(createElement(DevisView, { ctx: { ...ctx, fiscal: "pro" }, sel: {}, custom: [] }), locale)).toMatchSnapshot();
    });
  }
});

describe("Détaillé neuf : rendu de fond figé (N6)", () => {
  const p = presetNeuf({ surface: 120, niveaux: "etage", codePostal: "33000", finition: "standard", qui: "partie", garage: true });
  for (const locale of LOCALES) {
    it(`${locale} · ouverture`, () => {
      expect(rendre(createElement(EstimateurNeuf), locale)).toMatchSnapshot();
    });
    it(`${locale} · Mon devis`, () => {
      expect(rendre(createElement(DevisNeuf, { ctx: { ...p.ctx, budget: 250000 }, sel: p.sel, custom: [{ ...PERSO[0], phase: "Gros œuvre" }] }), locale)).toMatchSnapshot();
    });
  }
});

/* N6 : les deux détaillés existent entièrement en anglais. Chaque texte visible, `title`, `aria-label` et
   `placeholder` des rendus anglais est passé au crible : aucune lettre accentuée ni mot français courant (« ton »
   et « surface », anglais aussi, n'y sont pas), hors noms propres (Île-de-France, MaPrimeRénov, Géorisques…), mots
   anglais d'origine française (façade) et données saisies (lignes perso). */
describe("N6 · en anglais, aucune chaîne française", () => {
  const FR = /[àâçèéêëîïôûùœ«»]|\b(le|la|les|des|du|une|et|ou|avec|sans|dans|sur|aux|est|ta|tes|vous|votre|vos|par|pièces?|travaux|prix|devis|lignes?|maison|chambres?|salles?|bain|niveaux?|TVA|HT|TTC|perso|cocher|décocher|moins|plus|jours?)\b/i;
  const PERMIS = [/[Ff]açade/g, /Gérer mes biens immobiliers/g, /Géorisques/g, /\(attestation de capacité\)/g, /Île-de-France/g, /MaPrimeRénov/g, /Muret jardin|Sans lien|Brouillon|Lave-mains/g];
  const textes = (html: string): string[] => [...html.matchAll(/>([^<]+)<|(?:title|aria-label|placeholder)="([^"]*)"/g)]
    .map((m) => (m[1] ?? m[2] ?? "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim()).filter(Boolean);
  const francais = (html: string) => [...new Set(textes(html).filter((t) => FR.test(PERMIS.reduce((s, r) => s.replace(r, ""), t))))];

  it("rénovation : page vierge, chaque état de référence, et tout ouvert, tout coché", () => {
    expect(francais(rendre(createElement(Estimateur), "en"))).toEqual([]);
    for (const [nom, e] of Object.entries(ETATS_RENO))
      expect(francais(rendre(createElement(Detaille, { initialState: { v: "estimateur", ...e }, projectId: "p1" }), "en")), nom).toEqual([]);
    const tout: Selection = {}, ouverts: Record<string, boolean> = {};
    for (const l of CATALOG) { ouverts[l.c] = true; for (const t of l.t) tout[key(l.c, t.n)] = { on: true, self: !!t.sm }; }
    const maison = { ...ETATS_RENO.maison, sel: tout, open: ouverts };
    expect(francais(rendre(createElement(Detaille, { initialState: { v: "estimateur", ...maison } }), "en"))).toEqual([]);
    const ctx = { ...defaultCtx(), ...maison.ctx, codePostal: maison.codePostal } as Ctx;
    expect(francais(rendre(createElement(DevisView, { ctx, sel: tout, custom: PERSO }), "en"))).toEqual([]);
  });

  it("neuf : ouverture, chaque lot tout coché (lignes du catalogue neuf), « Mon devis »", () => {
    expect(francais(rendre(createElement(EstimateurNeuf), "en"))).toEqual([]);
    const p = presetNeuf({ surface: 120, niveaux: "etage", codePostal: "33000", finition: "standard", qui: "pros", garage: true });
    const tout: Selection = {};
    for (const l of CATALOG_NEUF) for (const t of l.t) tout[key(l.c, t.n)] = { ...p.sel[key(l.c, t.n)], on: true };
    for (const l of CATALOG_NEUF) {
      const html = rendre(createElement(LignesLot, {
        l, taches: l.t, ctx: p.ctx, sel: tout, loc: isLoc(l.c), maj: () => {}, onCocher: () => {}, onAuto: () => {},
        options: (t) => ({ badge: badgeNeuf(p.ctx, tout, l, t), proRaison: raisonProNeuf(t) }),
      }), "en");
      expect(francais(html), l.c).toEqual([]);
    }
    expect(francais(rendre(createElement(DevisNeuf, { ctx: p.ctx, sel: tout, custom: PERSO }), "en"))).toEqual([]);
  });
});

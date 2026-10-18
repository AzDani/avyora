/**
 * Chantier N11 de la revue rénovation / neuf (§2 n° 8 et 24, §5 « Présentation des postes », §6 N11) :
 * libellés courts et notes repliées.
 *
 * - Chaque poste PROPRE au neuf a un libellé court d'affichage `nc` (45 caractères au plus, en anglais
 *   aussi), lu par la ligne `Row` à la place de `n`. Les clés `key(lot, n)` ne changent pas : aucune
 *   sélection enregistrée, aucun total ne bouge (T1, T5, T6). « Mon devis », la fiche et le PDF gardent le
 *   libellé complet.
 * - La note d'un poste (et son libellé complet quand la ligne en montre un court) est repliée derrière une
 *   icône d'information, pour les deux natures. Les notes des blocs du neuf ne sont plus écrites dans la
 *   liste : elles sont en infobulle, sur le sous-titre de leur étape, sinon sur un bouton « À savoir » en tête du
 *   lot ouvert. Pas dans l'en-tête du lot (N11, vérification) : sur un téléphone, le nom du lot y a peu de place et
 *   l'icône lui ajoutait une ligne ; l'en-tête reste celui de la rénovation.
 * - Notes partagées de `catalog.json` réécrites pour valoir dans les deux contextes : bardage, isolation
 *   par l'intérieur, lot Menuiseries extérieures. Pas la PAC : la décision D6 n'est pas prise.
 * - Critère de fin : le texte « tout déplié » du neuf est proche de celui de la réno. Mesuré avant N11
 *   (même méthode) : 33 339 caractères en neuf contre 13 334 en réno (FR), soit 2,5 fois plus ; après :
 *   10 847 contre 9 438 (1,15 fois), et en anglais 11 465 contre 10 346.
 */
import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { createElement, type FunctionComponent, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import Estimateur from "@/components/Estimateur";
import { Row } from "@/components/estimateur/Row";
import { TexteInfo } from "@/components/estimateur/partage";
import { ListeNeuf, CarteFraisNeuf, type ActionsListeNeuf } from "@/components/neuf/ListeNeuf";
import {
  CATALOG, CATALOG_NEUF, IDS_NEUF, MAT_COEF, POSTE_NEUF, buildDevis, catalogueDe, defaultCtx, isLoc, key, presetNeuf,
  type Ctx, type Lot, type Selection, type Tache,
} from "@/lib/estimateur";
import { catT, catPoste, aTraductionEN } from "@/lib/estimateur/catalog-i18n";
import { ctxDetailNeuf, etatParDefaut } from "@/lib/estimateur/detaille-neuf";
import { elementsLotNeuf, notesDuLotNeuf, ouvrablesNeuf } from "@/lib/estimateur/liste-neuf";
import { dictDetail } from "@/lib/i18n/detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const RIEN = () => {};
const rendre = (el: ReactElement, locale: "fr" | "en") => renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Le texte visible d'un rendu : sans feuille de style, sans balises (donc sans `title` ni `aria-*`). */
const visible = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

const PROPRES = new Set(IDS_NEUF);
const propres = (): { l: Lot; t: Tache }[] => CATALOG_NEUF.flatMap((l) => l.t.filter((t) => PROPRES.has(t.id)).map((t) => ({ l, t })));
const poste = (id: string): { l: Lot; t: Tache } => {
  const p = POSTE_NEUF.get(id);
  if (!p) throw new Error("poste inconnu : " + id);
  return { l: CATALOG_NEUF.find((l) => l.t.includes(p.t))!, t: p.t };
};
const posteReno = (c: string, n: string): { l: Lot; t: Tache } => {
  const l = CATALOG.find((x) => x.c === c)!;
  return { l, t: l.t.find((t) => t.n === n)! };
};
function row({ l, t }: { l: Lot; t: Tache }, ctx: Ctx, sel: Selection = {}) {
  return createElement(Row, {
    l, t, ctx, sel, loc: isLoc(l.c),
    onCheck: RIEN, onChoice: RIEN, onAuto: RIEN, onQty: RIEN, onMat: RIEN, onVit: RIEN, onMot: RIEN,
    onTai: RIEN, onVar: RIEN, onNote: RIEN, onPu: RIEN, onPm: RIEN,
  });
}

describe("N11 · libellés courts des postes propres au neuf", () => {
  it("les 99 postes propres au neuf ont un libellé court : 45 caractères au plus en français ET en anglais, plus court que le libellé", () => {
    const ps = propres();
    expect(ps).toHaveLength(99);
    for (const { t } of ps) {
      expect(t.nc, t.id).toBeTruthy();
      expect(t.nc!.length, t.nc).toBeLessThanOrEqual(45);
      expect(t.nc!.length, t.nc).toBeLessThan(t.n.length);
      expect(aTraductionEN("postes", t.nc!), t.nc).toBe(true);
      expect(catT("en", "postes", t.nc!).length, t.nc).toBeLessThanOrEqual(45);
      expect(catPoste("fr", t)).toBe(t.nc);
    }
    // Avant N11 : 83 caractères en moyenne, 153 au plus (revue §2 n° 8). Réno : 27 en moyenne.
    const moyenne = ps.reduce((s, { t }) => s + t.nc!.length, 0) / ps.length;
    expect(moyenne).toBeLessThan(35);
  });

  it("un libellé court par poste dans son lot, distinct des autres libellés du lot", () => {
    for (const l of CATALOG_NEUF) {
      const vus = new Set<string>();
      for (const t of l.t) {
        const lib = catPoste("fr", t);
        expect(vus.has(lib), `${l.c} · ${lib}`).toBe(false);
        vus.add(lib);
      }
    }
  });

  it("seuls les postes propres au neuf ont un libellé court : les postes repris de la rénovation gardent le leur", () => {
    for (const l of CATALOG) for (const t of l.t) expect(t.nc, t.id).toBeUndefined();
  });

  it("aucune clé ne change : les 209 clés (lot, libellé) du neuf sont celles d'avant N11 (D5 n'en a qu'ajouté une)", () => {
    const toutes = CATALOG_NEUF.flatMap((l) => l.t.map((t) => key(l.c, t.n)));
    // D5 : les bandes de plâtre, une ligne à part comme en rénovation ; aucune autre clé n'a bougé
    const bandes = key("Cloisons / Platrerie", "Finitions plâtrerie (bandes, enduit)");
    expect(toutes.filter((k) => k === bandes)).toHaveLength(1);
    const cles = toutes.filter((k) => k !== bandes);
    expect(cles).toHaveLength(209);
    expect(createHash("sha256").update(cles.join("\n")).digest("hex").slice(0, 16)).toBe("50ccd858201a722d");
  });

  it("le libellé complet reste celui des lignes de devis (« Mon devis », fiche, PDF)", () => {
    const p = presetNeuf({ surface: 120, niveaux: "etage", codePostal: "33000", finition: "standard", qui: "pros", garage: true });
    const lignes = buildDevis(CATALOG_NEUF, p.ctx, p.sel).lignes;
    const dalle = poste("fon-dalle-terre-plein-isolee").t;
    const li = lignes.find((x) => x.cle === key("Fondations & soubassement", dalle.n))!;
    expect(li.nom).toBe(dalle.n);
    expect(li.nom).not.toBe(dalle.nc);
  });
});

describe("N11 · la ligne : libellé court, note repliée derrière l'icône d'information", () => {
  const p = presetNeuf({ surface: 120, niveaux: "etage", codePostal: "33000", finition: "standard", qui: "pros", garage: true });
  const ctxReno = { ...defaultCtx(), type: "Maison", surface: 100, surfaceSol: 100, codePostal: "45000" } as Ctx;

  for (const locale of ["fr", "en"] as const) {
    const L = dictDetail(locale).ligne;
    const icone = `<button type="button" class="ibtn" aria-expanded="false" aria-label="${echapper(L.info)}" title="${echapper(L.info)}">`;

    it(`${locale} · neuf : le libellé court, l'icône repliée ; ni le libellé complet ni la note sur la ligne`, () => {
      const x = poste("fon-dalle-terre-plein-isolee");
      const html = rendre(row(x, p.ctx, p.sel), locale);
      expect(html).toContain(`<span class="tn">${echapper(catPoste(locale, x.t))}<span class="pu">`);
      expect(html).toContain(icone);
      expect(html).not.toContain(echapper(catT(locale, "postes", x.t.n)));
      expect(html).not.toContain(echapper(catT(locale, "notes", x.t.note)));
      expect(html).not.toContain('class="tinfo"');
      expect(html).not.toContain("punote");
    });

    it(`${locale} · rénovation : la note repliée derrière la même icône ; sans note, pas d'icône`, () => {
      const avec = posteReno("Démolition", "Abattre un mur porteur");
      expect(avec.t.note).toBeTruthy();
      const html = rendre(row(avec, ctxReno), locale);
      expect(html).toContain(`<span class="tn">${echapper(catT(locale, "postes", avec.t.n))}<span class="pu">`);
      expect(html).toContain(icone);
      expect(html).not.toContain(echapper(catT(locale, "notes", avec.t.note)));
      const sans = posteReno("Etudes / Conception", "Plans du projet");
      expect(sans.t.note).toBeUndefined();
      expect(rendre(row(sans, ctxReno), locale)).not.toContain('class="ibtn');
    });
  }

  it("dépliée : un paragraphe par morceau (libellé complet, puis note), lue comme une note", () => {
    const x = poste("fon-dalle-terre-plein-isolee").t;
    const html = rendre(createElement(TexteInfo, { morceaux: [x.n, x.note] }), "fr");
    expect(html).toBe(`<div class="tinfo" role="note"><p>${echapper(x.n)}</p><p>${echapper(x.note!)}</p></div>`);
  });
});

/* La liste du neuf rendue (serveur), chaque lot ouvert, rien coché ; et celle de la rénovation. */
const ACTIONS: ActionsListeNeuf = { maj: RIEN, cocher: RIEN, auto: RIEN, choisir: RIEN, ajouterPerso: RIEN, majPerso: RIEN, supprimerPerso: RIEN };
const OUTILS = { seulement: false, onSeulement: RIEN, texteSeulement: "x", toutOuvert: false, onTout: RIEN, texteDeplier: "x", texteReplier: "y" };
function listeNeuf(locale: "fr" | "en", ouvert: boolean) {
  const e = etatParDefaut();
  const ctx = ctxDetailNeuf(e);
  const dv = buildDevis(catalogueDe(ctx), ctx, e.sel);
  const open: Record<string, boolean> = {};
  if (ouvert) for (const k of ouvrablesNeuf(ctx, {}, [])) open[k] = true;
  const props = { ctx, sel: {}, maison: e.maison, htParCle: new Map(dv.lignes.map((li) => [li.cle, li.ht])), open, onBascule: RIEN, seulementCoches: false, actions: ACTIONS };
  return rendre(createElement("div", null, createElement(CarteFraisNeuf, props), createElement(ListeNeuf, { ...props, custom: [], outils: OUTILS })), locale);
}
const Detaille = Estimateur as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
function detailleReno(locale: "fr" | "en", ouvert: boolean) {
  const open: Record<string, boolean> = {};
  if (ouvert) for (const l of CATALOG) open[l.c] = true;
  return rendre(createElement(Detaille, { initialState: { v: "estimateur", ctx: defaultCtx(), sel: {}, open, codePostal: "" }, projectId: "p1" }), locale);
}

describe("N11 · notes de lot du neuf en infobulle", () => {
  it("chaque note va au sous-titre de son étape, sinon au lot", () => {
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    const notes = (c: string) => notesDuLotNeuf(elementsLotNeuf(ctx, e.sel, c));
    const blocs = (c: string) => CATALOG_NEUF.filter((l) => l.c === c);
    // Maçonnerie : trois étapes, une note chacune, rien au lot
    const mac = notes("Maçonnerie");
    expect(mac.entete).toEqual([]);
    expect(Object.keys(mac.etapes)).toEqual(["Fondations & plancher bas", "Murs & planchers", "Second œuvre"]);
    for (const l of blocs("Maçonnerie")) expect(mac.etapes[l.p]).toEqual([l.note]);
    // Isolation : deux blocs dans la même étape, pas de sous-titre : les deux notes au lot
    expect(notes("Isolation")).toEqual({ entete: blocs("Isolation").map((l) => l.note), etapes: {} });
    // Terrassement : un bloc
    expect(notes("Terrassement")).toEqual({ entete: [blocs("Terrassement")[0].note], etapes: {} });
  });

  for (const locale of ["fr", "en"] as const) {
    it(`${locale} · tout déplié : aucune note du catalogue dans le texte visible ; chaque note de bloc en infobulle`, () => {
      const html = listeNeuf(locale, true);
      const texte = visible(html);
      const e = etatParDefaut();
      const ctx = ctxDetailNeuf(e);
      // les notes des postes affichés et celles des blocs : hors du texte visible
      for (const l of CATALOG_NEUF) {
        if (l.note) expect(texte, l.note).not.toContain(catT(locale, "notes", l.note));
        for (const t of l.t) if (t.note) expect(texte, t.id).not.toContain(catT(locale, "notes", t.note));
      }
      // chaque note d'un bloc affiché est dans une infobulle (sous-titre d'étape ou « À savoir » du lot)
      const titres = [...html.matchAll(/title="([^"]*)"/g)].map((m) => m[1]).join("\n");
      for (const c of new Set(CATALOG_NEUF.map((l) => l.c))) {
        const { entete, etapes } = notesDuLotNeuf(elementsLotNeuf(ctx, {}, c));
        for (const n of [...entete, ...Object.values(etapes).flat()]) expect(titres, n).toContain(echapper(catT(locale, "notes", n)));
      }
      // notes du lot : un vrai bouton « À savoir » en tête du lot ouvert, son infobulle est la note ; un par lot qui en a
      const label = echapper(dictDetail(locale).liste.infoNote);
      const boutons = [...html.matchAll(/<div class="acc-b"><button type="button" class="acc-info" aria-expanded="false" title="([^"]+)"><svg[^]*?<\/svg>([^<]*)<\/button>/g)];
      const avecNotes = [...new Set(CATALOG_NEUF.map((l) => l.c))].filter((c) => notesDuLotNeuf(elementsLotNeuf(ctx, {}, c)).entete.length > 0);
      expect(avecNotes.length).toBeGreaterThan(10);
      expect(boutons.length).toBe(avecNotes.length);
      for (const b of boutons) expect(b[2]).toBe(label);
      const terr = notesDuLotNeuf(elementsLotNeuf(ctx, {}, "Terrassement")).entete;
      expect(boutons.map((b) => b[1])).toContain(echapper(terr.map((n) => catT(locale, "notes", n)).join("\n\n")));
      // l'en-tête du lot : celui de la rénovation, sans icône ni description
      expect(html).not.toMatch(/<span class="nm">[^<]+<span class="ibtn"/);
      expect(html).not.toContain("aria-description");
      // sous-titre d'étape : un vrai bouton, son infobulle est la note
      expect(html).toContain(`<div class="setape">${echapper(catT(locale, "phases", "Fondations & plancher bas"))}<button type="button" class="ibtn" aria-expanded="false" aria-label="${echapper(dictDetail(locale).liste.infoNote)}" title="`);
      expect(html).not.toContain('class="lotnote">' + echapper(catT(locale, "notes", CATALOG_NEUF[0].note)));
    });
  }

  it("la rénovation n'a pas de note de lot affichée (inchangé)", () => {
    const html = detailleReno("fr", true);
    expect(html).not.toContain('class="acc-info"');
    expect(html).not.toMatch(/<span class="nm">[^<]+<span class="ibtn"/);
    expect(html).not.toContain("aria-description");
  });
});

describe("N11 · critère de fin : le texte tout déplié du neuf est proche de celui de la réno", () => {
  for (const locale of ["fr", "en"] as const) {
    it(`${locale} · caractères visibles ajoutés en ouvrant tous les lots : neuf ≤ 1,25 × réno (avant N11 : 2,5 ×)`, () => {
      const neuf = visible(listeNeuf(locale, true)).length - visible(listeNeuf(locale, false)).length;
      const reno = visible(detailleReno(locale, true)).length - visible(detailleReno(locale, false)).length;
      expect(neuf / reno).toBeLessThanOrEqual(1.25);
      expect(neuf).toBeLessThan(13_000);
    });
  }
});

describe("N11 · notes partagées réécrites pour valoir dans les deux contextes", () => {
  const note = (c: string, id: string) => CATALOG.find((l) => l.c === c)!.t.find((t) => t.id === id)!.note!;

  it("bardage : le prix de base est celui du bois ; le composite, à part en neuf, est cité à son prix", () => {
    const bardage = note("Façade", "fac-bardage");
    expect(bardage).toMatch(/^bois sur ossature ventilée/);
    expect(bardage).not.toMatch(/bois \/ composite/);
    const composite = poste("fac-bardage-composite").t.fp!;
    const cite = Number(/composite ~(\d+)/.exec(bardage)![1]);
    expect(Math.abs(cite - composite) / composite).toBeLessThan(0.05);
  });

  it("isolation par l'intérieur : la note renvoie aux bandes du lot Plâtrerie, sans dire où elles sont comptées", () => {
    const iti = note("Isolation", "iso-isolation-des-murs-par-l-interieur");
    expect(iti).not.toMatch(/comptés à part/);
    expect(iti).toContain(catT("fr", "corps", "Cloisons / Platrerie"));
    expect(catT("en", "notes", iti)).toContain(catT("en", "corps", "Cloisons / Platrerie"));
  });

  it("lot Menuiseries extérieures : base aluminium, comme le moteur (MAT_COEF)", () => {
    const men = CATALOG.find((l) => l.c === "Menuiseries exterieures")!.note!;
    expect(men).toMatch(/^prix de base en alu/);
    expect(MAT_COEF.alu).toBe(1);
    expect(MAT_COEF.pvc).toBeLessThan(1);
    expect(MAT_COEF.bois).toBeGreaterThan(1);
    expect(men).toContain(`bois +${Math.round((MAT_COEF.bois - 1) * 100)} %`);
    expect(men).toContain(`−${Math.round((1 - MAT_COEF.pvc) * 100)} %`);
  });

  it("la PAC n'est pas touchée : la décision D6 (eau chaude comprise ou non) n'est pas prise", () => {
    expect(note("Chauffage / VMC", "cha-pompe-a-chaleur-air-eau")).toBe("source de chaleur : chauffage central + eau chaude (radiateurs/plancher)");
  });
});

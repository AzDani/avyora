/**
 * F1 — lot de finitions après le chantier rénovation ↔ neuf (décisions de Dani du 18/10/2026 et petits défauts
 * relevés aux contrôles des étapes 2 et 3). Aucun prix ne bouge : affichage et textes seulement (T1, T5, T6 à 0).
 *
 * (a) accroche de la carte Éco : « Budget maîtrisé » en neuf (rapide, page publique, détaillé), « Locatif · budget
 *     maîtrisé » gardé en rénovation ;
 * (b) le doublage intérieur reste coché avec une ITE ou des murs en béton cellulaire 30 cm (les gens choisissent) ;
 * (c) la rénovation détaillée a les outils « Seulement les postes cochés » et « Tout déplier » ;
 * (1) quantité automatique longue (« 1 368,32 ») : sa case s'élargit ; (2) fiche d'un rapide neuf : libellés courts et
 * « + autres postes » chiffré ; (3) espace insécable avant « % » ; (4) le même champ Surface et le même exemple de code
 * postal dans les deux rapides ; (5) −/+ des pièces à 44 px sur mobile ; (6) PDF : surface décimale, « main-d’œuvre » ;
 * (7) sous-titre de la fiche d'un rapide réno en français ; (8) anglais : « 7% », mêmes formulations ; (9) montant
 * de la carte « Poste le plus lourd » lisible.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import {
  CATALOG, buildDevis, catalogueDe, defaultCtx, presetNeuf, key, tachesParCle, visible, type Ctx, type Selection, type CustomLine, type Lot,
} from "@/lib/estimateur";
import { presetRapide } from "@/lib/estimateur/presets";
import { POSTE_NEUF } from "@/lib/estimateur/catalogue-neuf";
import { etatParDefaut, choisirNeuf } from "@/lib/estimateur/detaille-neuf";
import { postesAffichesReno, cochesDuLotReno, toutOuvertReno, basculerToutReno } from "@/lib/estimateur/detaille-reno";
import { catLigne, catLigneCourte, catT } from "@/lib/estimateur/catalog-i18n";
import { nombre, pourcent, signePct } from "@/lib/i18n/nombres";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictDetail } from "@/lib/i18n/detail";
import { EST_CSS } from "@/components/estimateur-styles";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import { LangProvider } from "@/components/i18n/LangProvider";
import Estimateur from "@/components/Estimateur";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import EstimateurRapide from "@/components/EstimateurRapide";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import EstimationResultat from "@/components/EstimationResultat";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));
const LOCALE = vi.hoisted(() => ({ v: "fr" as "fr" | "en" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => LOCALE.v }));

const LOCALES = ["fr", "en"] as const;
type Loc = (typeof LOCALES)[number];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sansStyle = (h: string) => h.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const rendre = (el: Parameters<typeof createElement>[0], props: object, locale: Loc) =>
  sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(el as never, props as never) })));
const Detaille = Estimateur as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
const DetailleNeuf = EstimateurNeuf as FunctionComponent<{ initialState?: Record<string, unknown>; projectId?: string }>;
const lire = (f: string) => fs.readFileSync(f, "utf8");
/** Rendu d'un composant serveur, sans les séparateurs de texte du rendu en flux (`<!-- -->`). */
async function serveur(el: Promise<unknown>): Promise<string> {
  const { prelude } = await prerender((await el) as never);
  return (await new Response(prelude).text()).replace(/<!-- -->/g, "");
}

/* ─── (a) L'accroche de la carte Éco ─────────────────────────────────────────────────────────── */

describe("F1 (a) · carte Éco : « Budget maîtrisé » en neuf, « Locatif · budget maîtrisé » en rénovation", () => {
  const NEUF = { fr: "Budget maîtrisé", en: "Budget-conscious" }, RENO = { fr: "Locatif · budget maîtrisé", en: "Rental · budget-conscious" };
  for (const l of LOCALES) {
    it(`${l} : rapide (et page publique /estimation-construction-maison), détaillé ; la rénovation inchangée`, () => {
      expect(dictNeuf(l).saisie.finitions.eco.eye).toBe(NEUF[l]);
      expect(dict(l).rapide.finitions.eco.eye).toBe(RENO[l]);
      expect(dictDetail(l).bien.finitions.eco.eye).toBe(RENO[l]);
      const rapideNeuf = rendre(EstimateurRapideNeuf, {}, l), rapideReno = rendre(EstimateurRapide, {}, l);
      expect(rapideNeuf).toContain(`<span class="eye">${esc(NEUF[l])}</span>`);
      expect(rapideNeuf).not.toContain(esc(RENO[l]));
      expect(rapideReno).toContain(`<span class="eye">${esc(RENO[l])}</span>`);
      const detNeuf = rendre(DetailleNeuf, {}, l), detReno = rendre(Detaille, {}, l);
      expect(detNeuf).toContain(`<span class="fe">${esc(NEUF[l])}</span>`);
      expect(detNeuf).not.toContain(esc(RENO[l]));
      expect(detReno).toContain(`<span class="fe">${esc(RENO[l])}</span>`);
      // Les deux autres cartes du neuf gardent les accroches de la rénovation.
      for (const f of ["standard", "premium"] as const) expect(rapideNeuf).toContain(`<span class="eye">${esc(dict(l).rapide.finitions[f].eye)}</span>`);
    });
  }
  it("la page publique du neuf rend ce même rapide", () => {
    expect(lire("app/estimation-construction-maison/page.tsx")).toContain("<EstimateurRapideNeuf ");
  });
});

/* ─── (b) Le doublage n'est pas décoché tout seul ────────────────────────────────────────────── */

describe("F1 (b) · ITE ou béton cellulaire 30 cm : le doublage intérieur reste coché (« les gens choisissent »)", () => {
  const coche = (e: ReturnType<typeof etatParDefaut>, id: string) => { const p = POSTE_NEUF.get(id)!; return !!e.sel[key(p.c, p.n)]?.on; };
  for (const id of ["fac-isolation-par-l-exterieur-ite", "mac-mur-beton-cellulaire-30-cm"]) {
    it(id, () => {
      const e0 = etatParDefaut();
      expect(coche(e0, "iso-doublage-isolant-colle")).toBe(true);
      const p = POSTE_NEUF.get(id)!;
      const e = choisirNeuf(e0, { c: p.c } as Lot, p.t);
      expect(coche(e, id)).toBe(true);
      expect(coche(e, "iso-doublage-isolant-colle")).toBe(true);
    });
  }
  it("la décision est écrite, plus rien « à trancher »", () => {
    expect(lire("docs/construction-neuve/decisions.md")).toContain("## 12. Doublage intérieur avec une ITE ou des murs en béton cellulaire 30 cm");
    expect(lire("docs/construction-neuve/conception.md")).toContain("décision de Dani du 18/10/2026, `decisions.md` § 12");
  });
});

/* ─── (c) Les outils de la liste en rénovation ───────────────────────────────────────────────── */

describe("F1 (c) · rénovation détaillée : « Seulement les postes cochés » et « Tout déplier »", () => {
  const MAC = "Maçonnerie", PLO = "Plomberie";
  const ctx = defaultCtx();
  const sel: Selection = { [key(MAC, "Chape traditionnelle")]: { on: true }, [key(MAC, "Chape liquide")]: { on: false } };
  const mac = CATALOG.find((l) => l.c === MAC)!, plo = CATALOG.find((l) => l.c === PLO)!;
  const perso: CustomLine[] = [
    { id: "a", lot: PLO, nom: "Lave-mains", prix: 380, unite: "u", qte: 1, tva: 10, on: true },
    { id: "b", lot: PLO, nom: "Brouillon", prix: 0, unite: "u", qte: 1, tva: 10, on: true, draft: true },
  ];

  it("le filtre ne montre que les postes cochés ; sans filtre, tous les postes du bien", () => {
    expect(postesAffichesReno(ctx, sel, mac, true).map((t) => t.n)).toEqual(["Chape traditionnelle"]);
    expect(postesAffichesReno(ctx, sel, mac, false).length).toBe(mac.t.length);
  });

  it("le compteur d'un lot : ses postes cochés et ses lignes perso validées (un lot à 0 disparaît sous le filtre)", () => {
    expect(cochesDuLotReno(ctx, sel, mac, perso)).toBe(1);
    expect(cochesDuLotReno(ctx, sel, plo, perso)).toBe(1);   // le lave-mains ; le brouillon ne compte pas
    expect(cochesDuLotReno(ctx, {}, plo, [])).toBe(0);
  });

  it("« Tout déplier » ouvre les lots du bien, « Tout replier » les ferme tous, comme le neuf", () => {
    const lots = CATALOG.filter((l) => visible(ctx, l));
    const ouvert = basculerToutReno(lots, { [MAC]: true });
    expect(Object.keys(ouvert).sort()).toEqual(lots.map((l) => l.c).sort());
    expect(toutOuvertReno(lots, ouvert)).toBe(true);
    expect(basculerToutReno(lots, ouvert)).toEqual({});
    expect(toutOuvertReno(lots, {})).toBe(false);
  });

  for (const l of LOCALES) {
    it(`${l} : les outils au-dessus de la liste, avec les textes du neuf (dictDetail, partagés)`, () => {
      const L = dictDetail(l).liste;
      expect([L.seulementCoches, L.toutDeplier, L.toutReplier]).toEqual(
        l === "fr" ? ["Seulement les postes cochés", "Tout déplier", "Tout replier"] : ["Checked items only", "Expand all", "Collapse all"]);
      const outils = `<div class="tools"><label class="only"><input type="checkbox"/>${esc(L.seulementCoches)}</label><button type="button" class="linkbtn">${esc(L.toutDeplier)}</button></div>`;
      expect(rendre(Detaille, {}, l)).toContain(outils);
      expect(rendre(DetailleNeuf, {}, l)).toContain(outils);
      // Tous les lots ouverts : le bouton dit « Tout replier ».
      const open = Object.fromEntries(CATALOG.filter((x) => visible(defaultCtx(), x)).map((x) => [x.c, true]));
      expect(rendre(Detaille, { initialState: { v: "estimateur", ctx: defaultCtx(), sel: {}, open } }, l)).toContain(`class="linkbtn">${esc(L.toutReplier)}</button>`);
    });
  }
});

/* ─── (1) La quantité automatique longue ─────────────────────────────────────────────────────── */

describe("F1 (1) · quantité automatique : format de la langue, une case qui s'élargit", () => {
  it("« 1 368,32 » en français, « 1,368.32 » en anglais (le calcul ne change pas)", () => {
    expect(nombre("fr", 1368.32, 2)).toBe("1\u202f368,32");
    expect(nombre("en", 1368.32, 2)).toBe("1,368.32");
  });
  it("la case n'a plus de largeur fixe : au moins 66 px, jamais coupée", () => {
    expect(EST_CSS).toContain(".av-estim .qauto{min-width:66px;flex:none;white-space:nowrap;");
    expect(EST_CSS).not.toMatch(/\.qauto\{width:66px/);
  });
});

/* ─── (2) Fiche d'un rapide neuf : libellés courts, « + autres postes » chiffré ─────────────────── */

describe("F1 (2) · fiche d'un rapide neuf : « Tes postes les plus lourds »", () => {
  afterEach(() => { LOCALE.v = "fr"; });
  const p = presetNeuf({ surface: 120, niveaux: "etage", codePostal: "45000", finition: "standard", qui: "pros", garage: true, assainissement: "fosse" });
  const reponses = { v: "estimateur", mode: "rapide", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000" };
  const dv = buildDevis(catalogueDe(p.ctx as Ctx), p.ctx as Ctx, p.sel as Selection);
  const tri = [...dv.lignes].filter((li) => li.ttc > 0).sort((a, b) => b.ttc - a.ttc);
  const taches = tachesParCle(p.ctx as Ctx);

  it("au moins un des 5 plus lourds a un libellé court (sinon ce test ne prouve rien)", () => {
    expect(tri.slice(0, 5).some((li) => taches.get(li.cle)?.nc)).toBe(true);
  });

  for (const l of LOCALES) {
    it(`${l} · Pro : le libellé court (nc), la variante gardée ; « + autres postes » avec son montant`, async () => {
      LOCALE.v = l;
      const { default: ResultatRapideNeuf } = await import("@/components/neuf/ResultatRapideNeuf");
      const h = await serveur(ResultatRapideNeuf({ reponses: reponses as never, projectId: "p9", isPro: true }));
      const eur = (v: number) => Math.round(v).toLocaleString(l === "en" ? "en-US" : "fr-FR") + " €";
      for (const li of tri.slice(0, 5)) {
        const tk = taches.get(li.cle);
        const court = catLigneCourte(l, li.nom, li.cle, tk);
        expect(h).toContain(`<span class="nm">${esc(court)}</span><span class="lv">${esc(eur(li.ttc))}</span>`);
        if (tk?.nc) expect(h).not.toContain(`>${esc(catLigne(l, li.nom, li.cle))}<`);
      }
      const autres = tri.slice(5).reduce((s, li) => s + li.ttc, 0);
      expect(autres).toBeGreaterThan(0);
      expect(h).toContain(`<span class="nm">${esc(dictNeuf(l).rapide.autres)}</span> <span class="lv">${esc(eur(autres))}</span>`);
    });

    it(`${l} · gratuit : toujours « … » à la place du montant, aucun libellé réel`, async () => {
      LOCALE.v = l;
      const { default: ResultatRapideNeuf } = await import("@/components/neuf/ResultatRapideNeuf");
      const h = await serveur(ResultatRapideNeuf({ reponses: reponses as never, projectId: "p9", isPro: false }));
      expect(h).toContain(`<span class="nm">${esc(dictNeuf(l).rapide.autres)}</span> <span class="lv">…</span>`);
      for (const li of tri.slice(0, 5)) expect(h).not.toContain(`>${esc(catLigneCourte(l, li.nom, li.cle, taches.get(li.cle)))}<`);
    });
  }

  it("catLigneCourte : le libellé court, la variante traduite ; sans nc, catLigne", () => {
    const argile = [...POSTE_NEUF.values()].find((x) => x.t.id === "fon-surcout-fondations-sol-argileux" || x.n.startsWith("Surcoût des fondations en sol argileux"))!;
    const nom = argile.t.n + " (fort)";
    expect(catLigneCourte("fr", nom, key(argile.c, argile.t.n), argile.t)).toBe(argile.t.nc + " (fort)");
    expect(catLigneCourte("en", nom, key(argile.c, argile.t.n), argile.t)).toBe(catT("en", "postes", argile.t.nc!) + " (high)");
    expect(catLigneCourte("fr", "Fenêtres (PVC, double vitrage)", key("Menuiseries exterieures", "Fenêtres"), { n: "Fenêtres" }))
      .toBe(catLigne("fr", "Fenêtres (PVC, double vitrage)", key("Menuiseries exterieures", "Fenêtres")));
  });
});

/* ─── (3) et (8) Le signe « % » : insécable en français, collé en anglais ──────────────────────── */

describe("F1 (3, 8) · « % » ne passe jamais seul à la ligne en français ; « 7% » en anglais", () => {
  it("pourcent et signePct", () => {
    expect(pourcent("fr", 15, 0)).toBe("15\u00a0%");
    expect(pourcent("en", 15, 0)).toBe("15%");
    expect([signePct("fr"), signePct("en")]).toEqual(["\u00a0%", "%"]);
  });

  /** Les lignes de code d'un fichier, commentaires retirés (blocs, et « // » de fin de ligne), avec leur numéro. */
  const lignesCode = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")).split("\n")
    .map((t, i) => ({ t: t.replace(/(^|\s)\/\/ .*$/, ""), n: i + 1 }));
  const FICHIERS_TEXTES = [
    "lib/i18n/dictionaries.ts", "lib/i18n/detail.ts", "lib/i18n/neuf.ts", "lib/i18n/neuf-commun.ts", "lib/i18n/rapport.ts",
    "lib/estimateur/etapes-neuf.ts", "components/EstimationResultat.tsx", "components/ResultatRapide.tsx", "components/EstimateurRapide.tsx",
    "components/neuf/EstimateurRapideNeuf.tsx", "components/neuf/BilanRapideNeuf.tsx", "components/neuf/DevisNeuf.tsx", "components/estimateur/Row.tsx",
    "components/RapportPDF.tsx", "app/page.tsx", "lib/accueil-beta.ts", "app/methodologie/page.tsx", "app/guides/[slug]/page.tsx", "app/guides/page.tsx",
    "app/prix-travaux/page.tsx", "app/prix-travaux/[projet]/page.tsx", "app/prix-travaux/[projet]/[ville]/page.tsx", "app/prix-renovation/page.tsx",
    "app/prix-renovation/[ville]/page.tsx", "app/prix-poste/page.tsx", "app/prix-poste/[slug]/page.tsx", "lib/seo-projets.ts",
  ];
  it("plus aucun « 15 % » à espace ordinaire dans les textes affichés (produit, accueil, pages de prix et guides)", () => {
    const vus = FICHIERS_TEXTES.flatMap((f) => lignesCode(f).filter(({ t }) => /[0-9}] %/.test(t)).map(({ t, n }) => `${f}:${n}: ${t.trim().slice(0, 90)}`));
    expect(vus).toEqual([]);
    expect(lire("components/EstimateurRapide.tsx")).not.toContain('" %"');
    expect(lire("components/neuf/EstimateurRapideNeuf.tsx")).not.toContain('" %"');
  });

  it("les notes du catalogue aussi, à l'affichage (la chaîne du catalogue, clé des traductions, ne change pas)", () => {
    const note = "prix de base en alu ; PVC −20 à −40 %, bois +5 % — le prix affiché suit le matériau choisi";
    expect(catT("fr", "notes", note)).toBe("prix de base en alu ; PVC −20 à −40\u00a0%, bois +5\u00a0% — le prix affiché suit le matériau choisi");
    expect(catT("en", "notes", note)).toBe("base price in aluminum; PVC −20 to −40%, wood +5% — the price shown follows the chosen material");
  });

  for (const l of LOCALES) {
    it(`${l} : la barre des deux rapides (« ±15 % », « +4 % MO »), le bilan du neuf (« 7 % des travaux »)`, () => {
      const pct = signePct(l);
      const reno = rendre(EstimateurRapide, { edit: { projectId: "p1", type: "Maison", surface: 100, cp: "33000", ampleur: "complete", finition: "standard", qui: "pros" } }, l);
      const neuf = rendre(EstimateurRapideNeuf, { edit: { projectId: "p2" }, initialR: { surface: 100, niveaux: "pp", codePostal: "33000", finition: "standard", qui: "pros" } }, l);
      for (const h of [reno, neuf]) {
        expect(h).toContain(`±15${pct}`);
        expect(h).toContain(`+4${pct} ${dict(l).rapide.moSuffix}`);   // Bordeaux, « Grande agglomération »
        expect(h).not.toMatch(/\d %/);
      }
      expect(neuf).toContain(`(${pourcent(l, 7)} ${dictNeuf(l).pctTravaux})`);
      expect(neuf).toContain(l === "fr" ? "(7\u00a0% des travaux)" : "(7% of the works)");
    });
  }
});

/* ─── (4) et (5) Les deux rapides : le même champ Surface, le même exemple, 44 px ─────────────────── */

describe("F1 (4, 5) · les deux rapides : champ Surface, exemple de code postal, cibles de 44 px", () => {
  for (const l of LOCALES) {
    it(`${l} : le même libellé et le même champ (« − 100 m² + »), l'exemple « 33000 » des deux côtés`, () => {
      const T = dict(l).rapide, s = dictNeuf(l).saisie;
      expect(T.surfaceLabel).toBe(s.surfaceLabel);
      expect(T.surfaceLabel).toBe(l === "fr" ? "Surface habitable" : "Living area");
      expect([T.cpPlaceholder, s.cpPlaceholder]).toEqual(l === "fr" ? ["ex. 33000", "ex. 33000"] : ["e.g. 33000", "e.g. 33000"]);
      const reno = rendre(EstimateurRapide, {}, l), neuf = rendre(EstimateurRapideNeuf, {}, l);
      expect(reno).toMatch(/<label for="rapide-surface">[^<]*<\/label><span class="av-step block"><button type="button"[^>]*>−<\/button><input id="rapide-surface"/);
      expect(neuf).toMatch(/<label for="neuf-surface">[^<]*<\/label><span class="av-step block"><button type="button"[^>]*>−<\/button><input id="neuf-surface"/);
      expect(reno).toContain(`placeholder="${esc(T.cpPlaceholder)}"`);
      expect(neuf).toContain(`placeholder="${esc(s.cpPlaceholder)}"`);
    });
  }
  it("la hauteur du champ dans les deux rapides ; les −/+ des pièces et « retirer » à 44 px sur mobile", () => {
    expect(RAPIDE_CSS).toContain(".av-rapide .av-step.block{height:48px}");
    const mobile = RAPIDE_CSS.slice(RAPIDE_CSS.indexOf("@media(max-width:520px){.av-rapide .prow{flex-wrap:wrap}"));
    expect(mobile).toContain(".av-rapide .rstep button,.av-rapide .stepper button,.av-rapide .prm{width:44px;height:44px}");
    expect(mobile).toContain(".av-rapide .prow .av-step.compact{height:44px}.av-rapide .prow .av-step.compact button{width:44px}");
  });
});

/* ─── (6) Le rapport PDF ─────────────────────────────────────────────────────────────────────── */

describe("F1 (6) · PDF : surface décimale, « main-d’œuvre »", () => {
  afterEach(() => { LOCALE.v = "fr"; });
  for (const l of LOCALES) {
    it(`${l} : « ${l === "fr" ? "72,5" : "72.5"} m² », jamais « 73 »`, async () => {
      LOCALE.v = l;
      const { RapportPDF } = await import("@/components/RapportPDF");
      const ctx: Ctx = { ...defaultCtx(), type: "T3", surface: 72.5, surfaceSol: 72.5, codePostal: "75011" };
      const h = renderToStaticMarkup((await RapportPDF({ reponses: { ctx, sel: {} }, nom: "Appartement", refCode: "AVY-F1" }))!);
      expect(h).toContain(`<b class="num">${l === "fr" ? "72,5" : "72.5"}</b>`);
      expect(h).not.toContain('<b class="num">73</b>');
      if (l === "fr") {
        expect(h).toContain("main-d’œuvre +20\u00a0%");
        expect(h).not.toContain("main-d'œuvre");
        expect(h).not.toContain("main-d&#x27;œuvre");
      } else expect(h).toContain("labor +20%");
    });
  }
});

/* ─── (7) Le sous-titre de la fiche d'un rapide réno ─────────────────────────────────────────── */

describe("F1 (7, 8) · fiche d'un rapide réno : le sous-titre en français, « ±15% margin » et « (+4% labor) » en anglais", () => {
  afterEach(() => { LOCALE.v = "fr"; });
  const p = presetRapide({ type: "Maison", surface: 100, ampleur: "complete", finition: "standard", qui: "pros", codePostal: "33000" });
  const reponses = { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "33000" };
  for (const l of LOCALES) {
    it(l, async () => {
      LOCALE.v = l;
      const { default: ResultatRapide } = await import("@/components/ResultatRapide");
      const h = await serveur(ResultatRapide({ reponses: reponses as never, projectId: "p8", isPro: false }));
      const sub = /<p class="text-\[15px\] text-muted -mt-2 mb-2">([^<]*)<\/p>/.exec(h)?.[1] ?? "";
      expect(sub.length).toBeGreaterThan(40);
      if (l === "fr") {
        expect(sub).toContain("Une fourchette immédiate");
        expect(h).toContain("marge <b>±15\u00a0%</b>");
        expect(h).toContain("(+4\u00a0% MO)");
      } else {
        expect(h).toContain("<b>±15%</b> margin");
        expect(h).toContain("(+4% labor)");
        expect(h).not.toMatch(/\d %/);
      }
    });
  }
});

/* ─── (8) L'anglais : les mêmes formulations des deux côtés ──────────────────────────────────── */

describe("F1 (8) · anglais : mêmes formulations des deux côtés", () => {
  it("« incl. VAT » dans toutes les barres, « Choose the type of estimate » partout, « ±15% margin »", () => {
    expect(dict("en").rapide.liveLabel).toBe("Quick estimate · incl. VAT");
    expect(dictNeuf("en").saisie.liveLabel).toBe("New build · incl. VAT");
    expect(dictNeuf("en").detail.ttc).toBe(dictDetail("en").live.ttc);
    expect(dictDetail("en").live.ttc).toBe("€ incl. VAT");
    expect(dict("en").rapide.pageBack).toBe("← Choose the type of estimate");
    expect(dictNeuf("en").saisie.pageBack).toBe(dict("en").rapide.pageBack);
    expect(dictNeuf("en").rapide.marge).toBe("±15% margin");
    for (const f of ["lib/i18n/dictionaries.ts", "lib/i18n/neuf.ts", "lib/i18n/detail.ts", "lib/i18n/rapport.ts", "components/EstimationResultat.tsx", "components/ResultatRapide.tsx"]) {
      expect(lire(f), f).not.toMatch(/margin ±15/);
    }
  });
});

/* ─── (9) La carte « Poste le plus lourd » ───────────────────────────────────────────────────── */

describe("F1 (9) · « Poste le plus lourd » : le montant en chiffres à chasse fixe", () => {
  for (const l of LOCALES) {
    it(l, () => {
      const ctx: Ctx = { ...defaultCtx(), codePostal: "75011" };
      const sel: Selection = { [key("Maçonnerie", "Chape traditionnelle")]: { on: true }, [key("Plomberie", "WC")]: { on: true } };
      const h = renderToStaticMarkup(createElement(LangProvider, { locale: l, children: createElement(EstimationResultat, { reponses: { ctx, sel } }) }));
      const carte = h.slice(h.indexOf(l === "fr" ? "Poste le plus lourd" : "Biggest line item"));
      expect(carte).toMatch(/<p class="sub"><span class="num">[0-9\u202f,]+ €<\/span> · \d+(\u00a0%|%) /);
    });
  }
});

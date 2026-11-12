/**
 * Estimation rapide de la rénovation — correctifs de la revue du 12/11/2026 (lot « estimateur-rapide ») :
 *
 * - les sols ne sont plus comptés deux fois (stratifié ET sol souple sur la même zone, plus le carrelage) ;
 * - la page de prix d'une pièce et le rapide par pièce chiffrent le MÊME panier : même cas, même fourchette ;
 * - le code postal doit exister (métropole, Corse, DROM) ; la surface est bornée (8 à 500 m²) ;
 * - le chiffre s'affiche pour une pièce venue d'une page de prix, jamais pour un bien que personne n'a choisi ;
 * - la conversion Google Ads ne compte qu'une création, jamais la modification d'un projet ;
 * - le rappel de l'inscription dit les pièces (plus « T3 5 m² ») et ignore un brouillon sans code postal ;
 * - les aperçus des cartes ne montrent rien (« — ») avant une réponse ; contrastes AA ; barre mobile compacte.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG, buildDevis, key, presetRapide, presetPieces, surfaceRapide, SURFACE_MAX_RAPIDE, type Ctx, type Selection, type TypeBien } from "@/lib/estimateur";
import { solCarrele, solSec } from "@/lib/estimateur/quantites";
import { PANIERS_PIECES } from "@/lib/estimateur/paniers-pieces";
import {
  codePostalValide, chiffreAfficheRapide, estimationReelleRapide, lireRetourRapideReno, editionRapideReno,
} from "@/lib/estimateur/rapide-reno";
import { brouillonRapideReno, lireBrouillonReno, libelleBrouillonReno } from "@/lib/estimateur/brouillon-reno";
import { projetBySlug, estimProjet } from "@/lib/seo-projets";
import { dict } from "@/lib/i18n/dictionaries";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurRapide from "@/components/EstimateurRapide";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", async (orig) => {
  const m = await orig<typeof import("next/navigation")>();
  const routeur = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} };
  return { ...m, useRouter: () => routeur };
});

const lire = (f: string) => fs.readFileSync(f, "utf8");
const sansStyle = (h: string) => h.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const rendre = (props: Parameters<typeof EstimateurRapide>[0], locale: "fr" | "en" = "fr") =>
  sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(EstimateurRapide, props) })));
const grosChiffre = (h: string) => /<div class="big">([\s\S]*?)<\/div>/.exec(h)?.[1] ?? "";
const ttc = (p: { ctx: Ctx; sel: Selection }) => buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc;
const fourchette = (v: number) => [Math.round((v * 0.85) / 100) * 100, Math.round((v * 1.15) / 100) * 100];
const AMPLEURS = ["rafraich", "partielle", "complete", "lourde"] as const;

/* ─── Les sols ───────────────────────────────────────────────────────────────────────────────── */

describe("rapide « bien entier » : chaque m² de sol est chiffré une fois", () => {
  const SOLS = new Set(["Carrelage au sol", "Sol stratifié (imitation bois)", "Sol souple (PVC, lino)"]);
  const sols = (p: { ctx: Ctx; sel: Selection }) => buildDevis(CATALOG, p.ctx, p.sel).lignes.filter((l) => SOLS.has(l.nom));

  for (const [type, surface] of [["Appartement", 60], ["Maison", 100], ["Maison", 145], ["T2", 35]] as [TypeBien, number][]) {
    for (const ampleur of AMPLEURS) {
      it(`${type} ${surface} m², ${ampleur} : les sols couvrent la surface, ni plus ni moins`, () => {
        const p = presetRapide({ type, surface, codePostal: "", ampleur, finition: "standard", qui: "pros" });
        const m2 = sols(p).reduce((s, l) => s + l.qty, 0);
        // Avant : 84 m² pour un appartement de 60 m² (stratifié 24 + sol souple 24 + carrelage 36).
        expect(m2).toBeLessThanOrEqual(surface + 1);
        expect(m2).toBeGreaterThanOrEqual(surface - 1);
        // Le sol souple ne vit qu'au rafraîchissement ; dès la partielle, le carrelage occupe sa zone.
        const souple = sols(p).find((l) => l.nom === "Sol souple (PVC, lino)");
        if (ampleur === "rafraich") expect(souple?.qty).toBe(Math.round(solCarrele(surface)));
        else expect(souple).toBeUndefined();
      });
    }
  }

  it("avant / après chiffré : la réno partielle d'un appartement de 60 m² perd exactement le sol souple compté en double", () => {
    const apres = presetRapide({ type: "Appartement" as TypeBien, surface: 60, codePostal: "", ampleur: "partielle", finition: "standard", qui: "pros" });
    // L'ancienne sélection : la même, plus le sol souple sur la zone sèche (quantité automatique : 40 %).
    const kSouple = key("Carrelage / Revetements", "Sol souple (PVC, lino)");
    const avant = { ctx: apres.ctx, sel: { ...apres.sel, [kSouple]: { on: true, self: false } } };
    const ligne = buildDevis(CATALOG, avant.ctx, avant.sel).lignes.find((l) => l.nom === "Sol souple (PVC, lino)")!;
    expect(ligne.qty).toBe(Math.round(solSec(60)));   // 24 m² chiffrés en trop
    const ecart = ttc(avant) - ttc(apres);
    // Mesuré le 12/11/2026 (moyenne nationale, standard) : 26 745 € → 25 576 € TTC.
    expect(ecart).toBeGreaterThan(1000);
    expect(ecart / ttc(avant)).toBeGreaterThan(0.03);
    expect(ecart / ttc(avant)).toBeLessThan(0.06);
  });
});

/* ─── Page de prix ↔ rapide par pièce ───────────────────────────────────────────────────────── */

describe("même cas, même fourchette : page /prix-travaux d'une pièce et rapide « Réno complète »", () => {
  const CAS = [["renovation-cuisine", "cuisine"], ["renovation-salle-de-bain", "sdb"], ["renovation-chambre", "chambre"]] as const;

  for (const [slug, room] of CAS) {
    const p = projetBySlug(slug)!;
    it(`${slug} : le panier de la page EST celui du rapide`, () => {
      expect(p.tasks).toBe(PANIERS_PIECES[room].tasks);
      expect(p.surface).toBe(PANIERS_PIECES[room].surface);
    });

    for (const cp of ["", "75011", "33000", "97200"]) {
      it(`${slug}, ${cp || "national"} : la fourchette du bouton « Estimer » est celle de la page`, () => {
        // Le bouton de la page mène à /estimation-travaux?piece=…&surface=… : réno complète, standard, artisans.
        const rapide = ttc(presetPieces([{ room, surface: p.surface }], "complete", "standard", "pros", cp));
        const page = estimProjet(p, cp).ttc;
        expect(fourchette(rapide)).toEqual(fourchette(page));
        expect(Math.abs(rapide - page)).toBeLessThan(1);
      });
    }

    it(`${slug} : le barème par surface de la page et le rapide restent à moins de 2 %`, () => {
      for (const s of p.surfaces ?? []) {
        const rapide = ttc(presetPieces([{ room, surface: s }], "complete", "standard", "pros", ""));
        const page = estimProjet(p, "", s).ttc;
        expect(Math.abs(rapide - page) / page, `${s} m²`).toBeLessThan(0.02);
      }
    });

    it(`${slug} : les ampleurs restent ordonnées (rafraîchissement < partielle < complète < lourde)`, () => {
      const t = AMPLEURS.map((a) => ttc(presetPieces([{ room, surface: p.surface }], a, "standard", "pros", "")));
      for (let i = 1; i < t.length; i++) expect(t[i], AMPLEURS[i]).toBeGreaterThan(t[i - 1]);
    });
  }

  it("la cuisine garde sa longueur d'une ampleur à l'autre (partielle comme complète)", () => {
    const ml = (a: (typeof AMPLEURS)[number]) =>
      presetPieces([{ room: "cuisine", surface: 12 }], a, "standard", "pros", "").sel[key("Cuisine", "Cuisine complète neuve — tout compris")]?.qty;
    expect(ml("partielle")).toBe(ml("complete"));
  });
});

/* ─── Règles du formulaire ─────────────────────────────────────────────────────────────────── */

describe("codes postaux, surfaces, affichage et conversion", () => {
  it("un code postal doit exister dans la zone chiffrée (métropole, Corse, DROM)", () => {
    for (const ok of ["75011", "01000", "20000", "33000", "95000", "97100", "97200", "97400", "97600"]) expect(codePostalValide(ok), ok).toBe(true);
    for (const ko of ["00000", "99999", "97500", "97700", "98800", "98000", "96000", "7501", "750111", ""]) expect(codePostalValide(ko), ko).toBe(false);
  });

  it("surface du rapide bornée à 8–500 m² (10 000 m² donnaient 357 ml de cuisine et un seul WC)", () => {
    expect(SURFACE_MAX_RAPIDE).toBe(500);
    expect([surfaceRapide(10_000), surfaceRapide(1), surfaceRapide(NaN), surfaceRapide(120)]).toEqual([500, 8, 8, 120]);
    const p = presetRapide({ type: "Maison", surface: 10_000, codePostal: "33000", ampleur: "complete", finition: "standard", qui: "pros" });
    expect(p.ctx.surface).toBe(500);
    expect(lireRetourRapideReno({ mode: "bien", type: "Maison", surface: 10_000, pieces: [], cp: "", ampleur: "complete", finition: "standard", qui: "pros" })).toBeNull();
  });

  it("le chiffre s'affiche pour une pièce venue d'une page de prix, jamais sans bien choisi", () => {
    expect(chiffreAfficheRapide({ demarre: false, edition: false, prerempli: true })).toBe(true);
    // Seul le code postal tapé : « Maison » n'est qu'une valeur par défaut.
    expect(chiffreAfficheRapide({ demarre: true, edition: false, typeChoisi: false })).toBe(false);
    expect(chiffreAfficheRapide({ demarre: true, edition: false, typeChoisi: true })).toBe(true);
  });

  it("la conversion : une action, un bien choisi, un code postal qui existe, et jamais en modification", () => {
    const base = { demarre: true, saisieValide: true, ttc: 50_000, codePostal: "33000", typeChoisi: true };
    expect(estimationReelleRapide(base)).toBe(true);
    expect(estimationReelleRapide({ ...base, edition: true })).toBe(false);
    expect(estimationReelleRapide({ ...base, typeChoisi: false })).toBe(false);
    expect(estimationReelleRapide({ ...base, codePostal: "99999" })).toBe(false);
    // Un prérempli venu d'une page de prix s'affiche, mais ne compte pas tant que le visiteur n'a rien fait.
    expect(estimationReelleRapide({ ...base, demarre: false })).toBe(false);
  });

  it("le rapide du neuf ne compte plus non plus la modification d'un projet", () => {
    expect(lire("components/neuf/EstimateurRapideNeuf.tsx")).toContain(
      'if (!edit) { suivre("estimation_terminee", { action: "enregistrer", type: "neuf", nature: "neuf", src }); conversionEstimation("neuf"); }',
    );
  });
});

/* ─── Rendu ────────────────────────────────────────────────────────────────────────────────── */

describe("rendu du rapide", () => {
  it("page vierge : ni prix dans la barre ni €/m² sur les cartes (plus de « ≈ 201 € / m² » ni de « ≈ 0 € / m² »)", () => {
    const h = rendre({});
    expect(grosChiffre(h)).toBe("—");
    expect(h).not.toMatch(/≈ <b>/);
    expect(h).toContain("av-reno-live");
    expect(h).toMatch(/class="av-rapide-live av-reno-live vide"/);
  });

  it("arrivée depuis une page de prix (salle de bain 6 m², 75011) : la fourchette s'affiche d'emblée, celle de la page", () => {
    // Le montant défile (CountUp, 0 au rendu serveur) : la barre porte un chiffre, plus « — » ; son égalité
    // avec la page est vérifiée sur le moteur (« même cas, même fourchette »).
    const h = rendre({ initial: { piece: "sdb", surface: 6, cp: "75011", src: "ville" } });
    expect(grosChiffre(h)).toContain('class="num"');
    expect(h).not.toMatch(/av-reno-live vide/);
    expect(h).not.toContain(`<div class="sub">${dict("fr").rapide.step1q}</div>`);
    expect(h).toMatch(/≈ <b>[\d\u202f\u00a0 ]+ €<\/b> \/ m²/);
  });

  it("rafraîchissement : « Je fais un max » dit qu'il coûte autant que « J'en bricole une partie »", () => {
    const p = presetRapide({ type: "Maison", surface: 70, codePostal: "23000", ampleur: "rafraich", finition: "eco", qui: "pros" });
    const edit = editionRapideReno("p1", { mode: "rapide", ampleur: "rafraich", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "23000" }, "23000");
    for (const l of ["fr", "en"] as const) expect(rendre({ edit }, l)).toContain(dict(l).rapide.quiIdentique.replace(/'/g, "&#x27;"));
    // Réno complète : les deux cartes diffèrent, pas de mention.
    const q = presetRapide({ type: "Maison", surface: 70, codePostal: "23000", ampleur: "complete", finition: "eco", qui: "pros" });
    const edit2 = editionRapideReno("p1", { mode: "rapide", ampleur: "complete", qui: "pros", ctx: q.ctx, sel: q.sel, codePostal: "23000" }, "23000");
    expect(rendre({ edit: edit2 })).not.toContain("qsame");
  });

  it("au-delà de 90 et 110 m², les hypothèses (niveaux, salles de bain) sont dites sous la surface", () => {
    const p = presetRapide({ type: "Maison", surface: 120, codePostal: "33000", ampleur: "complete", finition: "standard", qui: "pros" });
    const edit = editionRapideReno("p1", { mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "33000" }, "33000");
    expect(rendre({ edit })).toContain(dict("fr").rapide.hypotheses(2, 2));
  });
});

/* ─── Le rappel de l'inscription ───────────────────────────────────────────────────────────── */

describe("rappel de /inscription : le bon libellé, et rien sans estimation", () => {
  const noms = { type: (v?: string) => (v === "Maison" ? "Maison" : v === "Appartement" ? "Appartement" : v || "Bien"), piece: (k: string) => dict("fr").rapide.rooms[k] };

  it("mode pièces : « Salle de bain 5 m² », plus « T3 5 m² »", () => {
    const p = presetPieces([{ room: "sdb", surface: 5 }], "complete", "standard", "pros", "69003");
    const d = brouillonRapideReno({ ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "69003", pieces: [{ room: "sdb", surface: 5 }] });
    expect(libelleBrouillonReno(d, noms, "fr-FR")).toBe("Salle de bain 5 m²");
    const deux = [{ room: "chambre" as const, surface: 12 }, { room: "chambre" as const, surface: 10 }, { room: "cuisine" as const, surface: 8 }];
    expect(libelleBrouillonReno({ ctx: p.ctx, pieces: deux }, noms, "fr-FR")).toBe("Chambre ×2 + Cuisine 30 m²");
    expect(libelleBrouillonReno({ ctx: { type: "Maison", surface: 100 } }, noms, "fr-FR")).toBe("Maison 100 m²");
  });

  it("un brouillon sans code postal (formulaire vierge, « Détail poste par poste ») n'est pas une estimation à rappeler", () => {
    const p = presetRapide({ type: "Maison", surface: 100, codePostal: "", ampleur: "complete", finition: "standard", qui: "pros" });
    const d = brouillonRapideReno({ ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "" });
    expect(lireBrouillonReno(JSON.stringify(d))).toBeNull();
    const src = lire("components/auth/EstimationRappel.tsx");
    expect(src).toContain("const d = lireBrouillonReno(localStorage.getItem(DRAFT_KEY));");
    expect(src).not.toContain("JSON.parse(raw)");
    // Et « Affiner » sur un formulaire vierge ne range plus de brouillon.
    expect(lire("components/EstimateurRapide.tsx")).toContain("if (valid) saveDraft();");
  });
});

/* ─── Styles : contrastes, cibles, barre mobile ────────────────────────────────────────────── */

describe("styles du rapide", () => {
  const css = lire("components/estimateur/rapide-styles.ts");
  const lum = (h: string) => {
    const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contraste = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const jeton = (nom: string) => new RegExp(`--${nom}:#([0-9a-f]{6})`).exec(css)?.[1] ?? "";

  it("petits textes en AA (≥ 4,5:1) : --faint sur le fond et sur blanc, --good sur son vert pâle", () => {
    expect(contraste(jeton("faint"), jeton("canvas"))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(jeton("faint"), "ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contraste(jeton("good"), jeton("good-bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it("téléphone : noms des pièces à 44 px, barre compacte, qui s'efface derrière le champ focalisé", () => {
    const mobile = css.slice(css.indexOf("@media(max-width:560px){\n.av-rapide .rcard .rname{min-height:44px}"));
    expect(mobile).toContain(".av-rapide .rcard .rname{min-height:44px}");
    expect(mobile).toContain(".av-reno-live.vide{display:none}");
    expect(mobile).toContain(".av-reno-live .lbl,.av-reno-live .ghost{display:none}");
    expect(mobile).toContain(".av-rapide:has(:is(input,select,textarea):focus)+.av-reno-live{position:static}");
    // Le neuf garde sa barre : les règles mobiles visent la seule barre de la rénovation.
    expect(mobile.slice(0, mobile.indexOf("@media (prefers-reduced-motion"))).not.toMatch(/\.av-rapide-live\b/);
  });
});

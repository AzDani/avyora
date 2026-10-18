/**
 * Correctifs de la rénovation en ligne (chantier N4 de la revue rénovation / neuf) :
 *
 * - rouvrir un rapide en gratuit affiche son chiffre (avant : rien, et « Renseignez la surface » à
 *   l'enregistrement) SANS le compter comme une estimation : ni `estimation_terminee`, ni conversion
 *   Google Ads au bout de 1,8 s. Rouvrir ≠ convertir ;
 * - un projet « pièces » rouvre avec sa liste ; le PATCH garde le suivi de chantier ;
 * - un 401 du détaillé range le brouillon COMPLET (postes, lignes perso) avant de poser le drapeau,
 *   et `ClaimDraft` le réclame tel quel ;
 * - le HTML de la fiche d'un rapide servi à un compte gratuit ne contient aucun vrai nom de lot ni
 *   aucun vrai montant de la répartition (le flou n'est que du CSS) ; un Pro la voit en clair.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import { buildDevis, CATALOG, type Ctx, type Selection } from "@/lib/estimateur";
import { presetRapide, type RapideInput } from "@/lib/estimateur/presets";
import { PIECES, presetPieces, type PieceSel } from "@/lib/estimateur/pieces";
import {
  chiffreAfficheRapide, estimationReelleRapide, reponsesRapideReno, editionRapideReno, lirePiecesRapide, CLES_PIECES,
} from "@/lib/estimateur/rapide-reno";
import {
  brouillonRapideReno, brouillonDetailleReno, lireBrouillonReno, corpsReclamationReno,
  CLE_BROUILLON_RENO, CLE_BROUILLON_DETAIL_RENO, CLE_RECLAMATION_RENO,
} from "@/lib/estimateur/brouillon-reno";
import { CLE_RECLAMATION, CLE_BROUILLON_NEUF } from "@/lib/estimateur/brouillon-neuf";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { projetCreateSchema, projetPatchSchema } from "@/lib/validation";
import { dict } from "@/lib/i18n/dictionaries";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurRapide from "@/components/EstimateurRapide";

vi.mock("next/navigation", async (orig) => {
  const m = await orig<typeof import("next/navigation")>();
  const routeur = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} };
  return { ...m, useRouter: () => routeur };
});

const lire = (f: string) => fs.readFileSync(f, "utf8");
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sansStyle = (h: string) => h.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const ttcDe = (p: { ctx: Ctx; sel: Selection }) => buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc;

const BIEN: RapideInput = { type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" };
const PIECES_SAISIES: PieceSel[] = [{ room: "chambre", surface: 14 }, { room: "chambre", surface: 11 }, { room: "sdb", surface: 6 }];

/** Rendu serveur du rapide (état initial, avant tout effet), sans la feuille de style. */
const rendreRapide = (props: Parameters<typeof EstimateurRapide>[0], locale: "fr" | "en" = "fr") =>
  sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(EstimateurRapide, props) })));
const grosChiffre = (h: string) => /<div class="big">([\s\S]*?)<\/div>/.exec(h)?.[1] ?? "";

/* ─── Rouvrir ≠ convertir ─────────────────────────────────────────────────────────────────── */

describe("N4 · rapide réno : l'affichage et la conversion sont séparés", () => {
  it("un projet rouvert s'affiche d'emblée ; une page vierge attend une réponse", () => {
    expect(chiffreAfficheRapide({ demarre: false, edition: true })).toBe(true);
    expect(chiffreAfficheRapide({ demarre: false, edition: false })).toBe(false);
    expect(chiffreAfficheRapide({ demarre: true, edition: false })).toBe(true);
  });

  it("rouvrir ne compte pas comme une estimation ; une vraie action, si", () => {
    const base = { saisieValide: true, ttc: 85_000, codePostal: "45000" };
    expect(estimationReelleRapide({ ...base, demarre: false })).toBe(false);   // rouvert, rien touché
    expect(estimationReelleRapide({ ...base, demarre: true })).toBe(true);
    expect(estimationReelleRapide({ ...base, demarre: true, codePostal: "450" })).toBe(false);
    expect(estimationReelleRapide({ ...base, demarre: true, ttc: 0 })).toBe(false);
    expect(estimationReelleRapide({ ...base, demarre: true, saisieValide: false })).toBe(false);
  });

  it("l'écran branche la conversion automatique et « Affiner » sur `demarre`, jamais sur l'édition", () => {
    const src = lire("components/EstimateurRapide.tsx");
    expect(src).toContain("const affiche = chiffreAfficheRapide({ demarre, edition: !!edit, retour });");
    expect(src).toContain("const estimationReelle = estimationReelleRapide({ demarre, saisieValide, ttc: tot.ttc, codePostal: cp });");
    expect(src).toContain("if (convFired.current || !estimationReelle) return;");
    // « Affiner » ne mesure et ne convertit que derrière la même règle.
    expect(src).toMatch(/function affiner\(\) \{[\s\S]*?if \(estimationReelle\) \{\s*suivre\("estimation_terminee"[\s\S]*?conversionEstimation\("reno"\);\s*\}/);
    // L'ancienne règle (`valid` portait `demarre`, donc un projet rouvert ne s'affichait pas) a disparu.
    expect(src).not.toMatch(/const valid = demarre/);
  });

  it("rendu d'un projet rouvert : la fourchette s'affiche et le type est coché ; page vierge : « — »", () => {
    const vierge = rendreRapide({});
    expect(grosChiffre(vierge)).toBe("—");
    const p = presetRapide(BIEN);
    const rouvert = rendreRapide({ edit: editionRapideReno("p1", { mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000" }, "45000") });
    expect(grosChiffre(rouvert)).toContain('class="num"');
    expect(rouvert).toContain("±15 %");
    expect(rouvert).toContain('<button type="button" class="on" aria-pressed="true">🏠 Maison</button>');
    expect(rouvert).not.toContain('class="avert"');
  });
});

/* ─── Réouverture d'un projet « pièces » ──────────────────────────────────────────────────── */

describe("N4 · rapide réno : un projet « pièces » rouvre avec sa liste", () => {
  const p = presetPieces(PIECES_SAISIES, "partielle", "standard", "pros", "33000");
  const reponses = JSON.parse(JSON.stringify(reponsesRapideReno({ ampleur: "partielle", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "33000", pieces: PIECES_SAISIES })));

  it("les réponses enregistrées portent la liste des pièces", () => {
    expect(reponses.mode).toBe("rapide");
    expect(reponses.pieces).toEqual(PIECES_SAISIES);
    expect(projetCreateSchema.safeParse({ nom: "Rénovation — Chambre ×2 + Salle de bain", typeBien: "Appartement", surface: 31, codePostal: "33000", reponses }).success).toBe(true);
  });

  it("rouvert, il reprend ses pièces et redonne le même chiffre", () => {
    const e = editionRapideReno("p2", reponses, "33000");
    expect(e.pieces).toEqual(PIECES_SAISIES);
    expect(e.piecesPerdues).toBeUndefined();
    expect(e.detaille).toBeUndefined();
    expect(ttcDe(presetPieces(e.pieces!, e.ampleur!, e.finition!, e.qui!, e.cp!))).toBe(ttcDe(p));
  });

  it("rendu : mode pièces, une ligne par pièce ; plusieurs types restent réservés au Pro", () => {
    const h = rendreRapide({ edit: editionRapideReno("p2", reponses, "33000") });
    expect((h.match(/class="prow"/g) ?? []).length).toBe(3);
    expect(h).toContain("Chambre 1");
    expect(h).toContain("Chambre 2");
    expect(h).toContain("3 pièces · 31 m² au total");
    expect(h).not.toContain('class="on" aria-pressed="true">🏠');      // ni Maison ni Appartement cochés
    expect(h).not.toContain('class="on" aria-pressed="true">🏢');
    expect(grosChiffre(h)).toBe("🔒 3 pièces à chiffrer");             // le verrou « multi-pièces » d'un gratuit, inchangé
    expect(grosChiffre(rendreRapide({ isPro: true, edit: editionRapideReno("p2", reponses, "33000") }))).toContain('class="num"');
  });

  it("rendu en gratuit d'un projet d'un seul type de pièce : la fourchette s'affiche", () => {
    const deux = PIECES_SAISIES.filter((x) => x.room === "chambre");
    const pp = presetPieces(deux, "complete", "standard", "pros", "33000");
    const rep = reponsesRapideReno({ ampleur: "complete", qui: "pros", ctx: pp.ctx, sel: pp.sel, codePostal: "33000", pieces: deux });
    const h = rendreRapide({ edit: editionRapideReno("p2b", rep, "33000") });
    expect((h.match(/class="prow"/g) ?? []).length).toBe(2);
    expect(grosChiffre(h)).toContain('class="num"');
    expect(h).toContain("±15 %");
  });

  it("enregistré avant N4 (sans liste) : il rouvre en mode pièces, avec un avertissement", () => {
    const { pieces: _p, ...ancien } = reponses;
    const e = editionRapideReno("p3", ancien, "33000");
    expect(e.piecesPerdues).toBe(true);
    expect(e.pieces).toBeUndefined();
    const h = rendreRapide({ edit: e });
    expect(h).toContain(echapper(dict("fr").rapide.avertPiecesPerdues));
    expect(grosChiffre(h)).toBe("—");                                  // aucun chiffre d'un « T3 » inventé
    expect(rendreRapide({ edit: e }, "en")).toContain(echapper(dict("en").rapide.avertPiecesPerdues));
  });

  it("une liste mal formée est écartée entrée par entrée ; les clés sont celles du moteur", () => {
    expect(CLES_PIECES).toEqual(PIECES.map((x) => x.key));
    expect(lirePiecesRapide([{ room: "chambre", surface: 12 }, { room: "garage", surface: 20 }, { room: "sdb", surface: "x" }, null])).toEqual([{ room: "chambre", surface: 12 }]);
    expect(lirePiecesRapide([])).toBeNull();
    expect(lirePiecesRapide("chambre")).toBeNull();
  });
});

/* ─── Un détaillé rouvert en gratuit, le suivi de chantier ────────────────────────────────── */

describe("N4 · rapide réno : détaillé rouvert et suivi de chantier", () => {
  const p = presetRapide(BIEN);
  const cle = Object.keys(p.sel)[0];

  it("le PATCH garde les statuts du projet rouvert ; sans statuts, rien n'est ajouté", () => {
    const e = editionRapideReno("p4", { mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000", statuts: { [cle]: 2, "x|y": "faux" } }, "45000");
    expect(e.statuts).toEqual({ [cle]: 2 });
    const avec = reponsesRapideReno({ ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000", statuts: e.statuts });
    expect(avec.statuts).toEqual({ [cle]: 2 });
    expect(projetPatchSchema.safeParse({ nom: "Rénovation — Maison 100 m²", typeBien: "Maison", surface: 100, codePostal: "45000", reponses: avec }).success).toBe(true);
    const sans = reponsesRapideReno({ ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000", statuts: {} });
    expect("statuts" in sans).toBe(false);
    expect("pieces" in sans).toBe(false);
    // L'écran les passe bien au PATCH.
    expect(lire("components/EstimateurRapide.tsx")).toContain("pieces: mode === \"pieces\" ? pieces : undefined, statuts: edit?.statuts,");
  });

  it("un détaillé (T3) rouvre en appartement, avec l'avertissement « détaillé rouvert »", () => {
    const det = { mode: "detaille", ctx: { ...p.ctx, type: "T3" as const }, sel: p.sel, codePostal: "45000", custom: [] };
    const e = editionRapideReno("p5", det, "45000");
    expect(e.detaille).toBe(true);
    expect(e.type).toBe("Appartement");
    expect(e.piecesPerdues).toBeUndefined();
    const h = rendreRapide({ edit: e });
    expect(h).toContain(echapper(dict("fr").rapide.avertDetaille));
    expect(grosChiffre(h)).toContain('class="num"');
    expect(rendreRapide({ edit: e }, "en")).toContain(echapper(dict("en").rapide.avertDetaille));
  });

  it("des réponses hors des choix du formulaire ne passent pas", () => {
    const e = editionRapideReno("p6", { mode: "rapide", ampleur: "enorme", qui: "personne", ctx: { ...p.ctx, finition: "luxe" as never }, codePostal: "45000" }, null);
    expect(e.ampleur).toBeUndefined();
    expect(e.qui).toBeUndefined();
    expect(e.finition).toBeUndefined();
    expect(e.cp).toBe("45000");
  });
});

/* ─── Réclamation après un 401 du détaillé ────────────────────────────────────────────────── */

describe("N4 · détaillé réno : un 401 range le brouillon complet, ClaimDraft le réclame", () => {
  const p = presetRapide(BIEN);
  const custom = [
    { id: "c1", lot: "Peinture", nom: "Lasure du portail", prix: 320, unite: "u", qte: 1, tva: 10, on: true },
    null,
  ];
  const nom = "Rénovation — Maison 100 m²";

  it("le brouillon du détaillé garde postes, lignes perso et nom ; le corps passe la validation", () => {
    const raw = JSON.stringify(brouillonDetailleReno({ nom, ctx: p.ctx, sel: p.sel, codePostal: "45000", custom: custom as never }));
    const d = lireBrouillonReno(raw)!;
    expect(d.mode).toBe("detaille");
    const corps = corpsReclamationReno(d);
    expect(corps.nom).toBe(nom);
    expect(corps.reponses.mode).toBe("detaille");
    expect(corps.reponses.sel).toEqual(p.sel);
    expect(corps.reponses.custom).toEqual([custom[0]]);              // l'entrée nulle est écartée
    expect(projetCreateSchema.safeParse(corps).success).toBe(true);
    expect(ttcDe({ ctx: corps.reponses.ctx as Ctx, sel: corps.reponses.sel })).toBe(ttcDe(p));
  });

  it("un ancien brouillon du rapide donne la même requête qu'avant N4", () => {
    const ancien = { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, open: {}, codePostal: "45000" };
    const corps = corpsReclamationReno(lireBrouillonReno(JSON.stringify(ancien))!);
    expect(JSON.parse(JSON.stringify(corps))).toEqual({
      nom: "Rénovation — Maison 100 m²", typeBien: "Maison", surface: 100, codePostal: "45000",
      reponses: { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: "45000" },
    });
  });

  it("le brouillon du rapide « pièces » garde sa liste jusqu'au projet réclamé", () => {
    const pp = presetPieces(PIECES_SAISIES, "partielle", "standard", "pros", "33000");
    const d = lireBrouillonReno(JSON.stringify(brouillonRapideReno({ nom: "Rénovation — Chambre ×2 + Salle de bain", ampleur: "partielle", qui: "pros", ctx: pp.ctx, sel: pp.sel, codePostal: "33000", pieces: PIECES_SAISIES })))!;
    const corps = corpsReclamationReno(d);
    expect(corps.nom).toBe("Rénovation — Chambre ×2 + Salle de bain");
    expect(corps.reponses.pieces).toEqual(PIECES_SAISIES);
    expect(editionRapideReno("p7", corps.reponses, "33000").pieces).toEqual(PIECES_SAISIES);
  });

  it("refuse un brouillon sans surface, sans code postal, ou illisible", () => {
    expect(lireBrouillonReno(JSON.stringify({ v: "estimateur", ctx: { surface: 0 }, sel: {}, codePostal: "45000" }))).toBeNull();
    expect(lireBrouillonReno(JSON.stringify({ v: "estimateur", ctx: { surface: 80 }, sel: {}, codePostal: "45" }))).toBeNull();
    expect(lireBrouillonReno("{pas du json")).toBeNull();
    expect(lireBrouillonReno(null)).toBeNull();
  });

  it("clés inchangées, et le 401 du détaillé range le brouillon AVANT de poser le drapeau", () => {
    expect(CLE_BROUILLON_RENO).toBe("avyora-estim-v2");
    expect(CLE_BROUILLON_DETAIL_RENO).toBe("avyora-estim-detail-v1");
    expect(CLE_RECLAMATION_RENO).toBe(CLE_RECLAMATION);
    expect(CLE_BROUILLON_RENO).not.toBe(CLE_BROUILLON_NEUF);
    const src = lire("components/Estimateur.tsx");
    const branche = /if \(res\.status === 401\) \{([\s\S]*?)return;\s*\}/.exec(src)?.[1] ?? "";
    const brouillon = branche.indexOf("localStorage.setItem(DRAFT_KEY, JSON.stringify(brouillonDetailleReno({ nom, ctx: ctxR, sel, codePostal, custom })))");
    const drapeau = branche.indexOf('localStorage.setItem(CLE_RECLAMATION_RENO, "1")');
    expect(brouillon).toBeGreaterThan(-1);
    expect(drapeau).toBeGreaterThan(brouillon);
    const rapide = lire("components/EstimateurRapide.tsx");
    expect(rapide).toMatch(/if \(res\.status === 401\) \{ saveDraft\(\); try \{ localStorage\.setItem\(CLE_RECLAMATION_RENO, "1"\);/);
    const claim = lire("components/ClaimDraft.tsx");
    expect(claim).toContain("JSON.stringify(corpsReclamationReno(d))");
  });

  it("aucun code du moteur ni du neuf à l'exécution dans les deux modules (bundle de ClaimDraft et du rapide)", () => {
    for (const f of ["lib/estimateur/rapide-reno.ts", "lib/estimateur/brouillon-reno.ts"]) {
      const imports = lire(f).match(/^import .*$/gm) ?? [];
      for (const i of imports) expect(i.startsWith("import type ") || i.includes('from "./rapide-reno"'), `${f} : ${i}`).toBe(true);
    }
  });
});

/* ─── Fiche d'un rapide : données factices pour un gratuit ────────────────────────────────── */

const LOCALE = vi.hoisted(() => ({ v: "fr" as "fr" | "en" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => LOCALE.v }));

async function rendreFiche(reponses: Record<string, unknown>, isPro: boolean, locale: "fr" | "en") {
  LOCALE.v = locale;
  const { default: ResultatRapide } = await import("@/components/ResultatRapide");
  const el = await ResultatRapide({ reponses: reponses as never, projectId: "p8", isPro });
  const { prelude } = await prerender(el);
  return new Response(prelude).text();
}

describe("N4 · fiche d'un rapide réno : aucune vraie répartition dans le HTML d'un gratuit", () => {
  afterEach(() => { LOCALE.v = "fr"; });
  const cas = {
    maison: presetRapide(BIEN),
    appart: presetRapide({ ...BIEN, type: "Appartement" as never, surface: 62, codePostal: "75011", ampleur: "rafraich", finition: "premium" }),
    pieces: presetPieces(PIECES_SAISIES, "lourde", "eco", "partie", "69003"),
  };

  for (const [nomCas, p] of Object.entries(cas)) {
    const reponses = { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: p.ctx, sel: p.sel, codePostal: p.ctx.codePostal };
    const dv = buildDevis(CATALOG, p.ctx, p.sel);
    const lots = [...dv.lots].filter((l) => l.ttc > 0).sort((a, b) => b.ttc - a.ttc);

    for (const locale of ["fr", "en"] as const) {
      const nf = locale === "en" ? "en-US" : "fr-FR";
      const euro = (n: number) => Math.round(n).toLocaleString(nf) + " €";

      it(`${nomCas} · ${locale} · gratuit : ni nom de lot, ni montant de lot, ni proportions réelles`, async () => {
        const h = await rendreFiche(reponses, false, locale);
        expect(h).toContain("••• €");
        expect(h).toContain('class="lock"');
        for (const l of lots) {
          for (const nom of new Set([l.corps, catT(locale, "corps", l.corps)])) expect(h, nom).not.toContain(`>${echapper(nom)}<`);
          expect(h, euro(l.ttc)).not.toContain(echapper(euro(l.ttc)));
        }
        const total = lots.reduce((s, l) => s + l.ttc, 0);
        expect(h).not.toContain(`stroke-dasharray="${(lots[0].ttc / total) * 100} `);
        // Le budget global du visiteur, lui, reste affiché.
        expect(h).toContain(echapper(euro(Math.round((dv.totaux.ttc * 0.85) / 100) * 100)));
      });

      it(`${nomCas} · ${locale} · Pro : la vraie répartition, sans cadenas`, async () => {
        const h = await rendreFiche(reponses, true, locale);
        expect(h).not.toContain('class="lock"');
        expect(h).not.toContain("••• €");
        for (const l of lots.slice(0, 4)) {
          expect(h).toContain(`>${echapper(catT(locale, "corps", l.corps))}<`);
          expect(h).toContain(echapper(euro(l.ttc)));
        }
      });
    }
  }
});

/**
 * Construction neuve : les correctifs de la revue du 12/11/2026 (lot « construction neuve »).
 *
 * - n° 14 : la carte « Premium » dit vrai (parquet, WC suspendu, douche à l'italienne, colonne encastrée) ;
 *   changer la finition dans le détaillé ne touche que ces postes, et garde un choix fait à la main ;
 * - n° 66 : l'éco du neuf s'écarte vraiment du standard (écart doublé), la rénovation ne bouge pas ;
 * - n° 67 et 68 : pièces par défaut et durée de chantier selon la surface ;
 * - n° 69 : la base de la provision pour aléas est dite ;
 * - n° 70 : « Enregistrer » d'un anonyme ne part pas vers l'API ;
 * - n° 72 : une surface hors bornes est signalée ;
 * - n° 73 : les libellés de variante gardent sigles et noms propres ;
 * - n° 74 : pas de €/m² avant réponse, un lien prérempli affiche le prix.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDevis, catalogueDe, presetNeuf, presetMaison, key, finCoefTask, LOT_FIN, variantLabel, minusculeInitiale, ECART_ECO_NEUF,
  maisonParDefaut, dureeChantier, geometrieNeuf, maisonComplete, appliquerFinitionNeuf, defaultCtx, CATALOG, cleLegacy, statutLigne,
  type Finition, type Selection,
} from "@/lib/estimateur";
import { POSTE_NEUF, CATALOG_NEUF } from "@/lib/estimateur/catalogue-neuf";
import { presetRapide } from "@/lib/estimateur/presets";
import { etatDepuisPreset, changerReponseNeuf } from "@/lib/estimateur/detaille-neuf";
import { catLigne } from "@/lib/estimateur/catalog-i18n";
import { horsBornes } from "@/components/Stepper";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";
import { pourcent } from "@/lib/i18n/nombres";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import BilanRapideNeuf from "@/components/neuf/BilanRapideNeuf";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const cle = (id: string) => { const p = POSTE_NEUF.get(id)!; return key(p.c, p.n); };
const on = (sel: Selection, id: string) => !!sel[cle(id)]?.on;
const R = (finition: Finition) => ({ surface: 90, niveaux: "pp" as const, codePostal: "33000", finition, qui: "pros" as const, assainissement: "collectif" as const });
const ttc = (p: { ctx: Parameters<typeof buildDevis>[1]; sel: Selection }) => buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc;
const rendre = (props: object, locale: "fr" | "en" = "fr") =>
  renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(EstimateurRapideNeuf as never, props as never) }))
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");

describe("n° 14 · la carte Premium dit vrai", () => {
  it("premium : parquet contrecollé, WC suspendu, douche à l'italienne, colonne encastrée ; éco et standard : l'entrée de gamme", () => {
    const p = presetNeuf(R("premium")).sel;
    expect(on(p, "rev-parquet-bois")).toBe(true);
    expect(p[cle("rev-parquet-bois")].vsel?.type).toBe("contrecolle");
    expect(on(p, "rev-sol-stratifie-imitation-bois")).toBe(false);
    expect(p[cle("plo-wc")].vsel?.type).toBe("suspendu");
    expect(on(p, "plo-douche-a-l-italienne")).toBe(true);
    expect(on(p, "plo-bac-de-douche")).toBe(false);
    expect(p[cle("plo-colonne-de-douche")].vsel?.pose).toBe("encastre");
    for (const f of ["eco", "standard"] as Finition[]) {
      const s = presetNeuf(R(f)).sel;
      expect(on(s, "rev-sol-stratifie-imitation-bois"), f).toBe(true);
      expect(on(s, "rev-parquet-bois"), f).toBe(false);
      expect(on(s, "plo-bac-de-douche"), f).toBe(true);
      expect(s[cle("plo-wc")].vsel, f).toBeUndefined();   // la sélection du standard n'a pas changé de forme
    }
  });

  it("les lignes du devis premium portent ces variantes", () => {
    const p = presetNeuf(R("premium"));
    const noms = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).lignes.map((l) => l.nom);
    expect(noms).toContain("WC (suspendu)");
    expect(noms).toContain("Parquet bois (contrecollé)");
    expect(noms).toContain("Colonne de douche (encastré)");
    expect(noms.some((n) => n.startsWith("Sol stratifié"))).toBe(false);
  });

  it("détaillé : changer la finition ne touche que ces postes, et garde un choix fait à la main", () => {
    const e0 = etatDepuisPreset(presetNeuf(R("standard")), "pros");
    // Parquet massif choisi à la main en standard : il reste massif en premium, et revenir au standard le garde.
    const kParquet = cle("rev-parquet-bois"), kStrat = cle("rev-sol-stratifie-imitation-bois");
    const main = { ...e0, sel: { ...e0.sel, [kStrat]: { ...e0.sel[kStrat], on: false }, [kParquet]: { on: true, vsel: { type: "massif" } } } };
    const e1 = changerReponseNeuf(main, "$finition", "premium");
    expect(e1.sel[kParquet].vsel?.type).toBe("massif");
    expect(e1.sel[cle("plo-wc")].vsel?.type).toBe("suspendu");
    const e2 = changerReponseNeuf(e1, "$finition", "standard");
    expect(e2.sel[kParquet]?.on).toBe(true);
    expect(e2.sel[kStrat]?.on).toBe(false);
    expect(e2.sel[cle("plo-wc")].vsel?.type).toBe("classique");
    expect(on(e2.sel, "plo-bac-de-douche")).toBe(true);
    expect(on(e2.sel, "plo-douche-a-l-italienne")).toBe(false);
    // Aller-retour sans choix à la main : le total revient au centime.
    const aller = changerReponseNeuf(changerReponseNeuf(e0, "$finition", "premium"), "$finition", "standard");
    expect(ttc({ ctx: presetNeuf(R("standard")).ctx, sel: aller.sel })).toBeCloseTo(ttc(presetNeuf(R("standard"))), 6);
  });

  it("une même finition ne change rien ; un poste nouvellement coché prend le « Je le fais » de `qui`", () => {
    const s = presetNeuf(R("standard")).sel;
    expect(appliquerFinitionNeuf(s, "eco", "standard")).toBe(s);
    const max = appliquerFinitionNeuf(presetMaison(maisonParDefaut(100), { qui: "max" }).sel, "premium", "standard", "max");
    expect(max[cle("rev-parquet-bois")].self).toBe(true);
  });
});

describe("n° 66 · l'éco du neuf, à l'écart doublé ; la rénovation inchangée", () => {
  it("90 m² à Bordeaux : l'éco coûte au moins 4 % de moins que le standard, le premium au moins 8 % de plus", () => {
    const eco = ttc(presetNeuf(R("eco"))), std = ttc(presetNeuf(R("standard"))), prem = ttc(presetNeuf(R("premium")));
    expect(eco / std).toBeLessThan(0.96);
    expect(prem / std).toBeGreaterThan(1.08);
  });

  it("coefficients : neuf éco = standard − 2 × (standard − éco) ; rénovation et standard du neuf inchangés", () => {
    expect(ECART_ECO_NEUF).toBe(2);
    const lot = CATALOG_NEUF.find((l) => l.c === "Carrelage / Revetements")!;
    const t = lot.t.find((x) => x.id === "rev-carrelage-au-sol")!;
    const G = LOT_FIN["Carrelage / Revetements"];
    const neuf = (finition: Finition) => finCoefTask({ ...defaultCtx(), nature: "neuf", finition }, lot, t);
    expect(neuf("eco")).toBeCloseTo(0.56, 6);
    expect(neuf("standard")).toBe(G.standard);
    expect(neuf("premium")).toBe(G.premium);
    expect(finCoefTask({ ...defaultCtx(), finition: "eco" }, lot, t)).toBe(G.eco);
    // Un lot sans écart (G0) reste à 1 en éco du neuf.
    const etu = CATALOG_NEUF.find((l) => l.c === "Etudes / Conception")!;
    expect(finCoefTask({ ...defaultCtx(), nature: "neuf", finition: "eco" }, etu, etu.t[0])).toBe(1);
    // La rénovation chiffre comme avant : son éco garde les coefficients de LOT_FIN.
    const r = presetRapide({ type: "Maison", surface: 80, codePostal: "33000", ampleur: "complete", finition: "eco", qui: "pros" });
    expect(r.ctx.nature).not.toBe("neuf");
    expect(CATALOG.length).toBeGreaterThan(0);
  });
});

describe("n° 67 et 68 · pièces et durée selon la surface", () => {
  it("chambres, salles de bain et WC par défaut", () => {
    const m = (s: number) => { const x = maisonParDefaut(s); return [x.chambres, x.sdb, x.wc]; };
    expect(m(30)).toEqual([1, 1, 1]);
    expect(m(90)).toEqual([3, 1, 1]);          // inchangé
    expect(m(100)).toEqual([3, 1, 1]);         // inchangé
    expect(m(160)).toEqual([5, 2, 2]);         // inchangé
    expect(m(250)).toEqual([6, 3, 3]);
    expect(m(400)).toEqual([7, 3, 3]);
  });

  it("durée du chantier : surface et niveaux", () => {
    expect(dureeChantier(30, "pp", "parpaing")).toBe(8);
    expect(dureeChantier(90, "pp", "parpaing")).toBe(9);
    expect(dureeChantier(150, "etage", "parpaing")).toBe(10);
    expect(dureeChantier(200, "etage", "parpaing")).toBe(11);
    expect(dureeChantier(400, "pp", "parpaing")).toBe(13);
    expect(dureeChantier(90, "pp", "ossature")).toBe(7);
    const g = (s: number) => geometrieNeuf(maisonComplete({ surface: s, niveaux: "pp" })).moisChantier;
    expect(g(400)).toBeGreaterThan(g(90));
  });
});

describe("n° 69, 72, 73 · libellés", () => {
  it("la provision pour aléas dit sa base, et son montant est bien 7 % de cette base", () => {
    const p = presetNeuf(R("standard"));
    const html = renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: p.ctx, sel: p.sel, locale: "fr", reel: false }));
    expect(html).toContain(`${pourcent("fr", 7)} ${dictNeufCommun("fr").pctAleas}`);
    expect(dictNeufCommun("fr").pctAleas).toBe("des travaux HT, hors études, taxes et assurance");
    const dv = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel);
    const lot = new Map(catalogueDe(p.ctx).flatMap((l) => l.t.map((t) => [key(l.c, t.n), t] as const)));
    const base = dv.lignes.filter((l) => l.corps !== "Etudes / Conception" && !lot.get(l.cle)?.frais).reduce((s, l) => s + l.ht, 0);
    expect(dv.totaux.aleas).toBeCloseTo(base * 0.07, 2);
  });

  it("variantes : la majuscule initiale tombe, pas celle d'un sigle ni d'un nom propre", () => {
    expect(minusculeInitiale("Hors Île-de-France")).toBe("hors Île-de-France");
    expect(minusculeInitiale("Île-de-France")).toBe("Île-de-France");
    expect(minusculeInitiale("MDF")).toBe("MDF");
    expect(minusculeInitiale("Sans LED")).toBe("sans LED");
    expect(minusculeInitiale("À galandage")).toBe("à galandage");
    expect(minusculeInitiale("Suspendu")).toBe("suspendu");
    const taxe = POSTE_NEUF.get("tax-taxe-amenagement-100-premiers-m2")!;
    expect(variantLabel(taxe.t, { on: true, vsel: { zone: "hors-idf" } })).toBe(" (hors Île-de-France)");
    // La traduction anglaise d'une variante se lit toujours (sa table est en minuscules).
    expect(catLigne("en", "Miroir (petit, LED)", "Plomberie|Miroir")).toBe(catLigne("en", "Miroir (petit, led)", "Plomberie|Miroir"));
  });

  it("variantes : un statut de chantier rangé à l'ancienne clé (« Plinthes (mdf) ») se relit encore", () => {
    const { ctx, sel } = presetRapide({ type: "T3", surface: 70, ampleur: "complete", finition: "standard", qui: "pros", codePostal: "75011" });
    const plinthes = CATALOG.flatMap((l) => l.t.map((t) => ({ l, t }))).find((x) => x.t.id === "rev-plinthes")!;
    const k = key(plinthes.l.c, plinthes.t.n);
    const li = buildDevis(CATALOG, ctx, { ...sel, [k]: { ...(sel[k] ?? {}), on: true, vsel: { ...(sel[k]?.vsel ?? {}), type: "mdf" } } })
      .lignes.find((x) => x.cle === k)!;
    expect(li.nom).toContain("MDF");
    expect(li.nomAvant).toBe(li.nom.replace("MDF", "mdf"));
    expect(cleLegacy(li)).toBe(key(li.corps, li.nomAvant!));
    expect(statutLigne({ [key(li.corps, li.nomAvant!)]: 2 }, li)).toBe(2);
    // Une ligne dont l'écriture n'a pas changé ne porte pas `nomAvant`.
    expect(buildDevis(CATALOG, ctx, sel).lignes.every((x) => x.nomAvant == null || x.nomAvant !== x.nom)).toBe(true);
  });

  it("surface hors bornes : détectée, et le message dit la borne", () => {
    expect(horsBornes("450", { min: 30, max: 400 })).toBe("max");
    expect(horsBornes("12", { min: 30, max: 400 })).toBe("min");
    expect(horsBornes("120", { min: 30, max: 400 })).toBeNull();
    expect(horsBornes("", { min: 30, max: 400 })).toBeNull();
    expect(dictNeuf("fr").saisie.surfaceHors.max("400")).toBe("L'estimation rapide va jusqu'à 400 m² : ta maison est chiffrée pour 400 m².");
    expect(dictNeuf("en").saisie.surfaceHors.min("30")).toContain("starts at 30 m²");
    expect(rendre({})).toContain('id="neuf-surface-hors" aria-live="polite"');
  });
});

describe("n° 70, 71, 74 · la page publique", () => {
  it("sans réponse : aucun €/m² sur les cartes, la barre attend et ne colle pas au téléphone", () => {
    const h = rendre({});
    expect(h).not.toMatch(/≈ <b>[\d\s ]+ €<\/b> \/ m²/);
    expect(h).toContain("— € / m²");
    expect(h).toContain('class="av-rapide-live av-neuf-live attente"');
    expect(h).toContain(dictNeuf("fr").saisie.finitionNote);
  });

  it("lien prérempli (?surface=&niveaux=&cp=) : le prix s'affiche, le niveau reçu est allumé", () => {
    const h = rendre({ initial: { cp: "33000", surface: 120, niveaux: "etage" } });
    expect(h).toMatch(/≈ <b>[\d\s ]+ €<\/b> \/ m²/);
    expect(h).toContain('class="on" aria-pressed="true">À étage</button>');
    expect(h).toContain('class="av-rapide-live av-neuf-live"');
    // Un code postal seul ne décrit pas la maison : pas de prix.
    expect(rendre({ initial: { cp: "33000" } })).not.toMatch(/≈ <b>[\d\s ]+ €<\/b> \/ m²/);
  });

  it("« Enregistrer » d'un anonyme : pas de requête à l'API, la page dit qui est connecté", () => {
    const src = fs.readFileSync("components/neuf/EstimateurRapideNeuf.tsx", "utf8");
    const garde = src.indexOf("if (!connecte && !edit) { versCompte(); return; }");
    expect(garde).toBeGreaterThan(0);
    expect(src.indexOf("await fetch(", garde)).toBeGreaterThan(garde);
    expect(src).toContain("if (res.status === 401) { versCompte(); return; }");
    expect(fs.readFileSync("app/estimation-construction-maison/page.tsx", "utf8")).toContain("connecte={!!user}");
  });

  it("la carte « Je fais un max moi-même » est courte (FR, EN)", () => {
    for (const l of ["fr", "en"] as const) expect(dictNeuf(l).saisie.quis.max.desc.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
});

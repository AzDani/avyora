/**
 * Un projet NEUF enregistré s'affiche avec le même chiffre partout (liste, fiche, résultat rapide,
 * admin) et son suivi peut aller jusqu'au bout (chantier C2 du branchement du neuf).
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  presetNeuf, buildDevis, catalogueDe, estimationProjet, avancementProjet, natureProjet, phasesDe, lotsParCorps,
  tachesParCle, estJalon, PHASES_NEUF, type Ctx, type Selection,
} from "@/lib/estimateur";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimationResultat from "@/components/EstimationResultat";
import BilanRapideNeuf from "@/components/neuf/BilanRapideNeuf";

/** Cas de référence de la carte « affichage » : maison plain-pied de 100 m², Orléans, standard, tout par des pros. */
const { ctx, sel } = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
const reponses = (extra: Record<string, unknown> = {}) => ({ v: "estimateur", mode: "detaille", ctx, sel, codePostal: "45000", qui: "pros", ...extra });
const dv = buildDevis(catalogueDe(ctx), ctx, sel);
const eur = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ");
const rendre = (el: ReturnType<typeof createElement>, locale: "fr" | "en" = "fr") =>
  renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
/** Le HTML rendu, en texte (sans balises ni styles) et avec des espaces normaux. */
const texte = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/[\s\u00a0\u202f]+/g, " ");

describe("Neuf · un même projet, un même chiffre", () => {
  it("le cas de référence vaut 253 172 € TTC, chiffré sur le catalogue neuf", () => {
    expect(Math.round(dv.totaux.ttc)).toBe(253172);   // 246 762 € + les bandes de plâtre, une ligne à part (D5)
    expect(dv.lignes.length).toBe(93);
  });

  it("liste et admin (estimationProjet) = fiche (buildDevis sur catalogueDe)", () => {
    const e = estimationProjet(reponses())!;
    expect(e.ttc).toBe(dv.totaux.ttc);
    expect(e.nature).toBe("neuf");
    expect(e.frais).toBe(dv.bilan.frais);
    expect(e.frais).toBeGreaterThan(0);
    expect(natureProjet(reponses())).toBe("neuf");
  });

  it("la fiche affiche ce TTC, la maison, les frais hors TVA et aucune TVA à 0 %", () => {
    const t = texte(rendre(createElement(EstimationResultat, { reponses: reponses() as never, projectId: "p1" })));
    expect(t).toContain(`Le plus probable ${eur(dv.totaux.ttc)} €`);
    expect(t).toContain("Estimation · construction neuve");
    expect(t).toContain(`Travaux HT ${eur(dv.totaux.ht - dv.bilan.frais)} €`);
    expect(t).toContain(`Frais hors TVA ${eur(dv.bilan.frais)} €`);
    expect(t).toContain("TVA (20 %)");
    expect(t).not.toMatch(/TVA \((?:0|[^)]*· 0) %/);
    expect(t).toContain("3 chambres · plain-pied");
    expect(t).toContain(`${lotsParCorps(dv.lots).length} corps · 93 postes`);
    expect(t).not.toContain("Ampleur");
    // L'assurance dommages-ouvrage se calcule sur le projet (études comprises), pas sur les travaux.
    expect(t).toContain("3,5 % du projet");
  });

  it("le suivi range les 93 lignes dans les 9 phases, seule la phase en cours dépliée", () => {
    const html = rendre(createElement(EstimationResultat, { reponses: reponses() as never, projectId: "p1" }));
    const parPhase = phasesDe(ctx).reduce((s, ph) => s + dv.lignes.filter((li) => li.phase === ph).length, 0);
    expect(parPhase).toBe(dv.lignes.length);
    // Seule la phase en cours (ici la première, rien n'est commencé) est dépliée à l'ouverture.
    const taches0 = tachesParCle(ctx);
    const premiere = dv.lignes.filter((li) => li.phase === PHASES_NEUF[0]);
    expect((html.match(/class="stbtn st\d"/g) ?? []).length).toBe(premiere.length);
    expect((html.match(/class="phase-t/g) ?? []).length).toBe(PHASES_NEUF.length);
    expect((html.match(/aria-expanded="true"/g) ?? []).length).toBe(1);
    expect((html.match(/class="dem"/g) ?? []).length).toBe(premiere.filter((li) => estJalon(taches0.get(li.cle))).length);
    expect((html.match(/class="jal/g) ?? []).length).toBe(PHASES_NEUF.length);
    const taches = tachesParCle(ctx);
    expect(dv.lignes.filter((li) => estJalon(taches.get(li.cle))).length).toBe(8);
  });

  it("tout cocher : la liste passe à « Terminé », chaque jalon de phase est coché", () => {
    const statuts: Record<string, number> = {};
    for (const ph of phasesDe(ctx)) for (const li of dv.lignes) if (li.phase === ph) statuts[li.cle] = 2;
    const av = avancementProjet(reponses({ statuts }));
    expect(av).toMatchObject({ total: 93, done: 93, statut: "termine", pct: 100 });
    const html = rendre(createElement(EstimationResultat, { reponses: reponses({ statuts }) as never, projectId: "p1" }));
    expect((html.match(/class="jal ok"/g) ?? []).length).toBe(PHASES_NEUF.length);
    // une seule démarche à faire : pas terminé
    const un = { ...statuts };
    delete un[dv.lignes[0].cle];
    expect(avancementProjet(reponses({ statuts: un })).statut).toBe("en_cours");
  });

  it("le bilan rapide : même TTC, les 9 phases, les extérieurs formatés depuis lib/, FR et EN", () => {
    const t = texte(renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: ctx as Ctx, sel: sel as Selection, qui: "pros", locale: "fr" })));
    expect(t).toContain(`Total TTC tout compris ${eur(dv.totaux.ttc)} €`);
    for (const ph of PHASES_NEUF) expect(t).toContain(ph);
    expect(t).toContain("≈ 8 000 € à 20 000 € sur 600 à 800 m² de terrain");
    expect(t).toMatch(/compte environ \+\d[\d ]* €/);
    expect(t).not.toMatch(/NaN|undefined/);
    const en = texte(renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: ctx as Ctx, sel: sel as Selection, qui: "pros", locale: "en" })));
    expect(en).toContain("All-in total incl. tax");
    expect(en).not.toMatch(/NaN|undefined/);
  });
});

describe("Neuf · une ligne perso compte partout dans le total", () => {
  const custom = [{ id: "c1", lot: "Maçonnerie", nom: "Ligne perso", prix: 1000, unite: "forfait", qte: 1, tva: 20, on: true }];
  const attendu = dv.totaux.ttc + 1000 + 200 + 1000 * ((ctx.aleas || 0) / 100);

  it("liste et admin (estimationProjet) = fiche = devis/PDF", () => {
    expect(estimationProjet(reponses({ custom }))!.ttc).toBeCloseTo(attendu, 6);
    const html = texte(rendre(createElement(EstimationResultat, { reponses: reponses({ custom }) as never })));
    expect(html).toContain(`${eur(attendu)} €`);
  });

  it("une ligne en brouillon, décochée ou illisible ne compte pas", () => {
    const ignorees = [{ ...custom[0], draft: true }, { ...custom[0], on: false }, null, "x"];
    expect(estimationProjet(reponses({ custom: ignorees }))!.ttc).toBe(dv.totaux.ttc);
  });

  /* Inversé volontairement par N7 (décision D8 de Dani, 13/10/2026) : la rénovation compte elle
     aussi ses lignes perso partout, comme le neuf. Avant, sa liste et sa fiche les ignoraient. */
  it("rénovation : estimationProjet compte aussi les lignes perso (D8)", async () => {
    const { presetRapide } = await import("@/lib/estimateur");
    const pr = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" } as never);
    const r = { v: "estimateur", mode: "detaille", ctx: pr.ctx, sel: pr.sel, codePostal: "45000" };
    const sans = estimationProjet(r)!.ttc;
    expect(estimationProjet({ ...r, custom })!.ttc).toBeCloseTo(sans + 1000 + 200 + 1000 * ((pr.ctx.aleas || 0) / 100), 6);
  });
});

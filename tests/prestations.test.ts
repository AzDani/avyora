/**
 * Les prestations de Daniel (24/11/2026) : une page par prestation payante, chacune avec son prix (moyen, sauf l'avis
 * avant achat à prix fixe), un parcours de vente (« ce que tu y gagnes »), une FAQ qui finit par le prix, et le
 * référencement qui va avec (titre et description dans les bornes, plan du site, liens depuis la page Accompagnement).
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ACHAT_REVENTE, AVIS_AVANT_ACHAT, CHOIX_TECHNIQUES, ESTIMATION_BUDGET, PLANS_2D, RELECTURE_DEVIS, SUIVI_BUDGET, SUIVI_CHANTIER,
  type PageService,
} from "@/lib/accompagnement/pages-services";
import { contenuAccompagnement } from "@/lib/accompagnement/contenu";

const RACINE = path.join(__dirname, "..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");
const textes = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(textes) : v && typeof v === "object" ? Object.values(v).flatMap(textes) : [];

const PAGES: PageService[] = [RELECTURE_DEVIS, ESTIMATION_BUDGET, AVIS_AVANT_ACHAT, CHOIX_TECHNIQUES, PLANS_2D, SUIVI_CHANTIER, SUIVI_BUDGET, ACHAT_REVENTE];

describe("prestations · une page chacune, prix et parcours de vente", () => {
  for (const c of PAGES) {
    it(`${c.chemin} : titre ≤ 60 avec le suffixe, description 120–160, prix, gains, FAQ du prix, aucun pourcentage`, () => {
      expect((c.titre + " · AVYORA").length, c.titre).toBeLessThanOrEqual(60);
      expect(c.description.length, c.description).toBeGreaterThanOrEqual(120);
      expect(c.description.length, c.description).toBeLessThanOrEqual(160);
      expect(c.tarif?.prix).toBeTruthy();
      expect(c.gains?.items.length).toBe(4);
      expect(c.faq[c.faq.length - 1].q).toMatch(/^Combien coûte/);
      expect(c.faq[c.faq.length - 1].a).toMatch(/€/);
      expect(textes(c).join(" ")).not.toMatch(/\d\s?%/);
      expect(existsSync(path.join(RACINE, "app", c.chemin.slice(1), "page.tsx")), c.chemin).toBe(true);
      expect(lire("app/sitemap.ts")).toContain(`\${siteUrl}${c.chemin}\``);
    });
  }

  it("seul l'avis avant achat est à prix fixe (99 €) ; les autres prix sont des moyennes « ≈ »", () => {
    expect(AVIS_AVANT_ACHAT.tarif).toMatchObject({ prix: "99 €", fixe: true, montantFixe: 99 });
    for (const c of [RELECTURE_DEVIS, ESTIMATION_BUDGET, CHOIX_TECHNIQUES, PLANS_2D, SUIVI_CHANTIER, SUIVI_BUDGET]) {
      expect(c.tarif?.fixe, c.chemin).toBeFalsy();
      expect(c.tarif?.prix, c.chemin).toMatch(/^≈ /);
    }
    expect(RELECTURE_DEVIS.tarif?.prix).toBe("≈ 29 €");
    expect(SUIVI_BUDGET.tarif?.prix).toBe("≈ 200 €/mois");
  });

  it("aucun délai promis, la réception n'est plus une prestation, les plans restent en 2D", () => {
    const tout = PAGES.flatMap(textes).join(" ");
    expect(tout).not.toMatch(/en \d+ (jours|semaines|mois)\b|garanti(e|s)? (en|sous) \d/i);
    expect(PLANS_2D.h1).toContain("2D");
    expect(textes(PLANS_2D).join(" ")).not.toMatch(/\b3D\b/);
    expect(PLANS_2D.aSavoir.join(" ")).toContain("150 m²");
    expect(contenuAccompagnement("fr").aide.services.map((s) => s.id)).not.toContain("reception");
  });

  it("page Accompagnement : 9 cartes, chaque prestation payante reliée à sa page, prix et gain sur chacune", () => {
    for (const locale of ["fr", "en"] as const) {
      const services = contenuAccompagnement(locale).aide.services;
      expect(services.map((s) => s.id)).toEqual(["decouverte", "devis", "estimation", "visite", "technique", "plans", "suivi", "budget", "sur_mesure"]);
      for (const s of services) expect(s.prix, `${locale} ${s.id}`).toBeTruthy();
      for (const s of services.filter((x) => !["decouverte", "sur_mesure"].includes(x.id))) {
        expect(s.gain, `${locale} ${s.id}`).toBeTruthy();
        expect(s.lien?.href, `${locale} ${s.id}`).toMatch(/^\/(relecture-devis-travaux|estimation-budget-travaux|avis-travaux-avant-achat|conseil-technique-travaux|faire-dessiner-plan-maison|suivi-de-chantier|suivi-budget-travaux)$/);
      }
    }
  });
});

/**
 * Chantier N8 (revue rénovation / neuf) : les projets neuf enregistrés AVANT les compteurs de la
 * rénovation se relisent à l'identique.
 *
 * Référence : `tests/fixtures/neuf-projets-avant-n8.json`, produite par le code d'avant N8 (commit
 * 561ac25) : les réponses telles que `POST /api/projects` les a reçues (sans `sejour`, `cuisines`,
 * `couloir`, `suites`, `buanderie`, `menuiseries` ni `emprise` dans la maison), le TTC et chaque ligne
 * [quantité, HT] chiffrés par ce même code. Quatre projets :
 * - `rapide-reference` : la maison de référence du rapide (246 762 €) ;
 * - `rapide-plan-etage` : un rapide venu du plan à étage, dont la suite était fondue dans les chambres
 *   et les salles de bain ;
 * - `detaille-options` : un détaillé sans cuisine équipée, avec les options devenues automatiques en
 *   N8 cochées à la main (spots, robinetterie de baignoire, moquette, béton ciré, douche à l'italienne),
 *   deux d'entre elles avec une quantité tapée ;
 * - `detaille-variantes` : un meuble double vasque et un bac 150×90, les deux variantes que N8 chiffre
 *   désormais (écart ADMIS par la revue, listé ici et dans le compte rendu).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildDevis, catalogueDe, CATALOG_NEUF, key, maisonComplete, type Ctx, type Selection, type Lot, type Tache } from "@/lib/estimateur";
import { repriseDepuisReponses, ctxDetailNeuf, changerReponseNeuf, cocherNeufEtat, etatParDefaut } from "@/lib/estimateur/detaille-neuf";
import { basculerAuto } from "@/lib/estimateur/detaille-reno";

type Projet = { reponses: { ctx: Ctx; sel: Selection }; ttc: number; lignes: Record<string, [number, number]> };
const REF = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "neuf-projets-avant-n8.json"), "utf8")) as Record<string, Projet>;

const photo = (r: { ctx: Ctx; sel: Selection }) => {
  const dv = buildDevis(catalogueDe(r.ctx), r.ctx, r.sel);
  return { ttc: dv.totaux.ttc, lignes: Object.fromEntries(dv.lignes.map((x) => [x.cle, [x.qty, Math.round(x.ht * 100) / 100]])) };
};
const poste = (id: string): { l: Lot; t: Tache } => {
  for (const l of CATALOG_NEUF) for (const t of l.t) if (t.id === id) return { l, t };
  throw new Error(id);
};
const cle = (id: string) => { const { l, t } = poste(id); return key(l.c, t.n); };

describe("N8 · un projet neuf enregistré avant N8 se relit à l'identique", () => {
  for (const nom of ["rapide-reference", "rapide-plan-etage", "detaille-options"]) {
    it(`${nom} : la fiche (réponses telles qu'enregistrées), ligne par ligne et au centime`, () => {
      const p = photo(REF[nom].reponses);
      expect(p.lignes).toEqual(REF[nom].lignes);
      expect(p.ttc).toBeCloseTo(REF[nom].ttc, 6);
    });
    it(`${nom} : le détaillé rouvert chiffre pareil`, () => {
      const rep = repriseDepuisReponses(REF[nom].reponses)!;
      const p = photo({ ctx: ctxDetailNeuf(rep.etat), sel: rep.etat.sel });
      expect(p.lignes).toEqual(REF[nom].lignes);
      expect(p.ttc).toBeCloseTo(REF[nom].ttc, 6);
    });
  }

  it("le cas de référence vaut toujours 246 762 € ; la maison relue prend les compteurs par défaut", () => {
    expect(Math.round(REF["rapide-reference"].ttc)).toBe(246_762);
    const neuf = REF["rapide-reference"].reponses.ctx.neuf!;
    expect(neuf).not.toHaveProperty("sejour");
    expect(maisonComplete(neuf)).toMatchObject({ sejour: 1, cuisines: 1, couloir: 1, suites: 0, buanderie: 0 });
  });

  it("sans cuisine équipée avant, sans cuisine équipée après, même quand une autre réponse change", () => {
    const rep = repriseDepuisReponses(REF["detaille-options"].reponses)!;
    const cuisine = cle("cui-cuisine-complete-neuve-tout-compris");
    expect(rep.etat.maison.cuisine).toBe(false);
    expect(rep.etat.sel[cuisine]?.on).toBe(false);
    const e = changerReponseNeuf(rep.etat, "vmc", "double");
    expect(e.sel[cuisine]?.on).toBe(false);
    expect(photo({ ctx: ctxDetailNeuf(e), sel: e.sel }).lignes[cuisine]).toBeUndefined();
  });

  it("les options cochées avant N8 gardent leur quantité, marquée manuelle au détaillé ; le bouton auto la calcule", () => {
    const rep = repriseDepuisReponses(REF["detaille-options"].reponses)!;
    const spots = cle("ele-spots-encastres-led"), moquette = cle("rev-moquette"), baignoire = cle("plo-robinetterie-baignoire");
    expect(rep.etat.sel[spots]).toMatchObject({ on: true, qty: 12, manual: true });
    expect(rep.etat.sel[moquette]).toMatchObject({ on: true, qty: 35, manual: true, self: true });
    expect(rep.etat.sel[baignoire]).toMatchObject({ on: true, qty: 1, manual: true });
    // Les réponses enregistrées, elles, ne changent pas (la fiche les relit telles quelles).
    expect(REF["detaille-options"].reponses.sel[spots]).not.toHaveProperty("manual");
    const { l, t } = poste("ele-spots-encastres-led");
    const auto = basculerAuto(ctxDetailNeuf(rep.etat), rep.etat.sel, l, t);
    expect(auto[spots].manual).toBe(false);
    expect(photo({ ctx: ctxDetailNeuf(rep.etat), sel: auto }).lignes[spots][0]).toBe(60);   // 120 m² ÷ 2
  });

  it("une option cochée après N8 arrive avec sa quantité automatique, comme en rénovation", () => {
    const e = etatParDefaut();
    const { l, t } = poste("ele-spots-encastres-led");
    const apres = cocherNeufEtat(e, l, t);
    expect(apres.sel[cle("ele-spots-encastres-led")]).toMatchObject({ on: true });
    expect(apres.sel[cle("ele-spots-encastres-led")].qty).toBeUndefined();
    expect(photo({ ctx: ctxDetailNeuf(apres), sel: apres.sel }).lignes[cle("ele-spots-encastres-led")][0]).toBe(50);   // 100 m² ÷ 2
  });
});

describe("N8 · écart admis : un meuble double vasque et un bac 150×90 sont chiffrés", () => {
  const ref = REF["detaille-variantes"];
  const robinets = cle("plo-robinetterie-lavabo"), spec = cle("rev-etancheite-sous-carrelage-spec-douche");
  const dommagesOuvrage = cle("ass-assurance-dommages-ouvrage");

  it("seules la robinetterie de lavabo et l'étanchéité de douche changent (et l'assurance, un pourcentage des travaux)", () => {
    const p = photo(ref.reponses);
    const changees = [...new Set([...Object.keys(p.lignes), ...Object.keys(ref.lignes)])]
      .filter((k) => JSON.stringify(p.lignes[k]) !== JSON.stringify(ref.lignes[k]));
    expect(changees.sort()).toEqual([spec, robinets, dommagesOuvrage].sort());
    expect(ref.lignes[robinets][0]).toBe(1);
    expect(p.lignes[robinets][0]).toBe(2);                     // deux vasques, deux robinetteries
    expect(ref.lignes[spec][0]).toBe(6.5);
    expect(p.lignes[spec][0]).toBe(7.89);                      // 6,5 m² + la zone qu'un bac 150×90 ajoute (1,39 m²)
    expect(Math.round(p.ttc - ref.ttc)).toBe(ECART_VARIANTES_TTC);
  });
});

/** L'écart TTC du projet `detaille-variantes`, le seul admis : une robinetterie (+160 € HT), 1,39 m²
 *  d'étanchéité (+51 € HT), l'assurance dommages-ouvrage qui les suit (+7 €), TVA et aléas compris. */
const ECART_VARIANTES_TTC = 275;

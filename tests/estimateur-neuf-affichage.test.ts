import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  PHASES, PHASES_NEUF, CATALOG, CATALOG_NEUF, buildDevis, catalogueDe, presetRapide, presetNeuf, presetMaison, maisonComplete,
  maisonParDefaut, estNeuf, natureProjet, phasesDe, lotsParCorps, tachesParCle, estJalon, estimationProjet, type Ampleur,
  type QuiRealise, type Finition, type TypeBien, type RapideNeufInput, type MaisonNeuve, type Ctx, type Selection,
} from "@/lib/estimateur";
import { INFO_PHASES, LOTS_ANNEXES, decoupe, parPhase, surcoutArgile, EXTERIEURS_HORS_PERIMETRE, nomProjetNeuf } from "@/lib/estimateur/etapes-neuf";
import { QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { catT } from "@/lib/estimateur/catalog-i18n";

const lire = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

/* ── Rénovation : la grille de `sim2.cjs` (5 × 4 × 3 × 3 × 4 × 4 = 2 880 scénarios) ── */
describe("Neuf · affichage — la rénovation ne bouge pas", () => {
  const reno = tachesParCle({ nature: "reno" });

  it("le catalogue rénovation n'a aucun jalon ni aucun frais", () => {
    expect([...reno.values()].filter((t) => estJalon(t) || t.frais)).toEqual([]);
    expect(tachesParCle(undefined).size).toBe(reno.size);
  });

  it("2 880 scénarios : phasesDe = PHASES, lotsParCorps = dv.lots, aucun jalon", () => {
    let n = 0;
    for (const type of ["Studio", "T2", "T3", "T4", "Maison"] as TypeBien[])
      for (const ampleur of ["rafraich", "partielle", "complete", "lourde"] as Ampleur[])
        for (const finition of ["eco", "standard", "premium"] as Finition[])
          for (const qui of ["pros", "partie", "max"] as QuiRealise[])
            for (const codePostal of ["75011", "69001", "23000", ""])
              for (const surface of [25, 60, 110, 180]) {
                const { ctx, sel } = presetRapide({ type, surface, codePostal, ampleur, finition, qui });
                expect(phasesDe(ctx)).toBe(PHASES);
                expect(estNeuf(ctx)).toBe(false);
                const dv = buildDevis(CATALOG, ctx, sel);
                const parCorps = lotsParCorps(dv.lots);
                // mêmes lots, mêmes champs, même ordre, mêmes montants (au bit près)
                expect(parCorps.map(({ phases, ...l }) => { expect(phases).toEqual([l.phase]); return l; })).toEqual(dv.lots);
                expect(dv.lignes.some((li) => estJalon(reno.get(li.cle)))).toBe(false);
                n++;
              }
    expect(n).toBe(2880);
  });

  it("estimationProjet : nature « reno », frais 0, autres champs inchangés", () => {
    const { ctx, sel } = presetRapide({ type: "T3", surface: 65, codePostal: "33000", ampleur: "complete", finition: "standard", qui: "pros" });
    const e = estimationProjet({ v: "estimateur", ctx, sel })!;
    const dv = buildDevis(CATALOG, ctx, sel);
    expect(e).toEqual({ ttc: dv.totaux.ttc, ht: dv.totaux.ht, tva: dv.totaux.tva, aleas: dv.totaux.aleas, surface: 65, eurM2: dv.totaux.ttc / 65, frais: 0, nature: "reno" });
    expect(natureProjet({ v: "estimateur", ctx, sel })).toBe("reno");
    expect(natureProjet(null)).toBe("reno");
    expect(natureProjet({ ctx: { nature: "reno" } })).toBe("reno");
  });
});

/* ── Construction neuve : trois maisons ── */
const CAS: Array<{ nom: string; input: RapideNeufInput; base?: Partial<MaisonNeuve> }> = [
  { nom: "100 m² plain-pied", input: { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" } },
  { nom: "180 m² à étage", input: { surface: 180, niveaux: "etage", codePostal: "69001", finition: "premium", qui: "partie", garage: true } },
  { nom: "140 m² combles + sous-sol", input: { surface: 140, niveaux: "combles", codePostal: "13001", finition: "eco", qui: "max", assainissement: "fosse" }, base: { plancherBas: "sous-sol" } },
];

describe("Neuf · affichage — une maison neuve", () => {
  for (const c of CAS) {
    describe(c.nom, () => {
      const { ctx, sel } = presetNeuf(c.input, c.base);
      const dv = buildDevis(catalogueDe(ctx), ctx, sel);
      const taches = tachesParCle(ctx);

      it("la description est bien celle demandée", () => {
        expect(estNeuf(ctx)).toBe(true);
        expect(natureProjet({ v: "estimateur", ctx, sel })).toBe("neuf");
        expect(ctx.neuf!.niveaux).toBe(c.input.niveaux);
        if (c.base?.plancherBas) expect(ctx.neuf!.plancherBas).toBe(c.base.plancherBas);
      });

      it("chaque ligne tombe dans une phase de phasesDe (aucune ligne invisible au suivi)", () => {
        const phases = phasesDe(ctx);
        expect(phases).toBe(PHASES_NEUF);
        const groupees = phases.reduce((s, p) => s + dv.lignes.filter((li) => li.phase === p).length, 0);
        expect(groupees).toBe(dv.lignes.length);
      });

      it("lotsParCorps : un lot par corps, montants conservés", () => {
        const lots = lotsParCorps(dv.lots);
        expect(new Set(lots.map((l) => l.corps)).size).toBe(lots.length);
        expect(lots.length).toBeLessThan(dv.lots.length); // en neuf, des lots reviennent dans plusieurs phases
        const somme = (xs: { ttc: number }[]) => xs.reduce((s, x) => s + x.ttc, 0);
        expect(somme(lots)).toBeCloseTo(somme(dv.lots), 6);
        expect(lots.some((l) => l.phases.length > 1)).toBe(true);
      });

      it("matériaux + main-d'œuvre + achats + frais = HT (à 1 € près)", () => {
        const b = dv.bilan;
        expect(Math.abs(b.moA + b.matA + b.achat + b.frais - dv.totaux.ht)).toBeLessThanOrEqual(1);
        expect(b.frais).toBeGreaterThan(0);
        expect(estimationProjet({ v: "estimateur", ctx, sel })).toMatchObject({ frais: b.frais, nature: "neuf", ttc: dv.totaux.ttc });
      });

      it("exactement 8 jalons (démarches à 0 €) cochés", () => {
        const jalons = dv.lignes.filter((li) => estJalon(taches.get(li.cle)));
        expect(jalons.length).toBe(8);
        for (const j of jalons) expect(j.ht).toBe(0);
      });

      it("TVA : aucune ligne taxée à 0 % ; les frais (HT > 0, sans TVA) existent, d'où le filtre tva > 0", () => {
        const taxees = dv.lignes.filter((li) => li.ht > 0 && li.tva > 0);
        expect(taxees.length).toBeGreaterThan(0);
        for (const li of taxees) expect(Math.round((li.tva / li.ht) * 1000) / 10).toBe(20);
        expect(dv.lignes.some((li) => li.ht > 0 && li.tva === 0 && taches.get(li.cle)?.frais)).toBe(true);
      });

      it("decoupe : construction + annexes + aléas = TTC ; parPhase couvre toutes les phases", () => {
        const d = decoupe(dv);
        expect(d.constr + d.annexes + d.aleas).toBeCloseTo(dv.totaux.ttc, 6);
        expect(d.annexes).toBeGreaterThan(0);
        const pp = parPhase(dv);
        expect(Object.keys(pp)).toEqual(PHASES_NEUF);
        expect(Object.values(pp).reduce((s, v) => s + v, 0)).toBeCloseTo(dv.totaux.ttc - dv.totaux.aleas, 6);
      });

      it("surcoutArgile : chiffré par le moteur, positif", () => {
        const opts = { finition: c.input.finition, qui: c.input.qui, codePostal: c.input.codePostal };
        const s = surcoutArgile(ctx.neuf!, opts);
        expect(s).toBeGreaterThan(0);
        const pa = presetMaison({ ...ctx.neuf!, argile: "moyen" }, opts);
        expect(s).toBeCloseTo(buildDevis(catalogueDe(pa.ctx), pa.ctx, pa.sel).totaux.ttc - dv.totaux.ttc, 6);
        expect(surcoutArgile({ ...ctx.neuf!, argile: "fort" }, opts)).toBe(0); // déjà compté
      });
    });
  }

  it("le catalogue neuf compte 8 jalons, tous des frais à 0 €", () => {
    const jalons = [...tachesParCle({ nature: "neuf" }).values()].filter((t) => estJalon(t));
    expect(jalons.length).toBe(8);
  });
});

/* ── presetNeuf : le paramètre `base` ne change rien quand il est absent ── */
describe("Neuf · presetNeuf(input, base?)", () => {
  /* L'ancienne construction de la maison, recopiée telle qu'elle était avant l'ajout de `base`. */
  const avant = (input: RapideNeufInput): { ctx: Ctx; sel: Selection } => {
    const maison = maisonComplete({
      surface: Math.max(30, input.surface || 0), niveaux: input.niveaux, garage: input.garage ? 20 : 0,
      assainissement: input.assainissement ?? "collectif", codePostal: input.codePostal,
    });
    return presetMaison(maison, { finition: input.finition, qui: input.qui, codePostal: input.codePostal });
  };
  const entrees: RapideNeufInput[] = [
    ...CAS.map((c) => c.input),
    { surface: 20, niveaux: "pp", codePostal: "", finition: "standard", qui: "pros" },
    { surface: 120, niveaux: "etage", codePostal: "75011", finition: "eco", qui: "max", garage: true, assainissement: "fosse" },
  ];

  it("sans base : identique à presetNeuf(input, undefined), à presetNeuf(input, {}) et à l'ancien calcul", () => {
    for (const input of entrees) {
      const ref = JSON.stringify(presetNeuf(input));
      expect(JSON.stringify(presetNeuf(input, undefined))).toBe(ref);
      expect(JSON.stringify(presetNeuf(input, {}))).toBe(ref);
      expect(JSON.stringify(avant(input))).toBe(ref);
    }
  });

  it("avec base : les réponses du rapide passent par-dessus, le reste de la maison est gardé", () => {
    const base: Partial<MaisonNeuve> = { murs: "ossature", chambres: 5, garage: 35, assainissement: "micro", surface: 300, niveaux: "pp" };
    const { ctx } = presetNeuf({ surface: 150, niveaux: "etage", codePostal: "35000", finition: "standard", qui: "pros", garage: true }, base);
    expect(ctx.neuf).toMatchObject({ murs: "ossature", chambres: 5, garage: 35, assainissement: "micro", surface: 150, niveaux: "etage", codePostal: "35000" });
    const sans = presetNeuf({ surface: 150, niveaux: "etage", codePostal: "35000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" }, base);
    expect(sans.ctx.neuf).toMatchObject({ garage: 0, assainissement: "collectif" });
  });

  it("niveaux accepte « combles »", () => {
    expect(presetNeuf({ surface: 130, niveaux: "combles", codePostal: "45000", finition: "standard", qui: "pros" }).ctx.neuf!.niveaux).toBe("combles");
  });
});

/* ── Données d'affichage ── */
describe("Neuf · données d'affichage", () => {
  it("INFO_PHASES : une fiche par phase du neuf, en FR et en EN", () => {
    expect(Object.keys(INFO_PHASES)).toEqual(PHASES_NEUF);
    const txt = (t: { fr: string; en: string }) => { expect(t.fr.trim()).not.toBe(""); expect(t.en.trim()).not.toBe(""); };
    for (const info of Object.values(INFO_PHASES)) {
      txt(info.quoi); txt(info.jalon); txt(info.duree);
      for (const d of info.dem) { txt(d.quand); txt(d.quoi); }
    }
  });

  it("LOTS_ANNEXES : des lots qui existent au catalogue neuf", () => {
    const lots = new Set(CATALOG_NEUF.map((l) => l.c));
    for (const l of LOTS_ANNEXES) expect(lots.has(l), l).toBe(true);
  });

  it("EXTERIEURS_HORS_PERIMETRE : les montants sont ceux de la source citée", () => {
    const e = EXTERIEURS_HORS_PERIMETRE;
    expect(e.min).toBeLessThan(e.max);
    const doc = lire(e.source.split(" ")[0]);
    const nf = (v: number) => new Intl.NumberFormat("fr-FR").format(v).replace(/\s/g, " ");
    expect(doc).toContain(`${nf(e.min)} à ${nf(e.max)} €`);
  });

  it("nomProjetNeuf : « Construction neuve — Maison plain-pied 100 m² »", () => {
    expect(nomProjetNeuf({ niveaux: "pp", surface: 100 })).toBe("Construction neuve — Maison plain-pied 100 m²");
    expect(nomProjetNeuf({ niveaux: "etage", surface: 180.4 }, "fr")).toBe("Construction neuve — Maison à étage 180 m²");
    expect(nomProjetNeuf({ niveaux: "combles", surface: 140 }, "en")).toBe("New build — House with converted attic 140 m²");
  });

  it("QUESTIONS_NEUF : chaque question décrit une réponse de la maison, chaque choix se chiffre", () => {
    const defaut = maisonParDefaut(100) as unknown as Record<string, unknown>;
    let nChoix = 0;
    expect(QUESTIONS_NEUF.length).toBe(6);
    for (const g of QUESTIONS_NEUF) {
      expect(g.g.fr && g.g.en).toBeTruthy();
      for (const q of g.qs) {
        expect(q.l.fr && q.l.en, q.k).toBeTruthy();
        if (q.k === "$qui" || q.k === "$finition") continue;
        if (q.k !== "codePostal") expect(q.k in defaut, q.k).toBe(true);
        expect(!!q.o !== !!q.t, q.k).toBe(true); // soit des choix, soit une saisie
        for (const [v, lib] of q.o ?? []) {
          expect(lib.fr && lib.en).toBeTruthy();
          expect(typeof v, q.k).toBe(typeof defaut[q.k]);
          const p = presetMaison({ ...maisonParDefaut(100), [q.k]: v } as Partial<MaisonNeuve>);
          const ttc = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc;
          expect(Number.isFinite(ttc) && ttc > 0, `${q.k}=${v}`).toBe(true);
          nChoix++;
        }
      }
    }
    expect(nChoix).toBeGreaterThan(40);
  });
});

/* ── Unités ── */
describe("catT · unités", () => {
  it("FR : « m2 » reste brut (comme avant), « pct » → « % », « m3 » → « m³ »", () => {
    expect(catT("fr", "unites", "m2")).toBe("m2");
    expect(catT("fr", "unites", "pct")).toBe("%");
    expect(catT("fr", "unites", "m3")).toBe("m³");
    expect(catT("fr", "unites", "forfait")).toBe("forfait");
    expect(catT("fr", "postes", "pct")).toBe("pct");
    expect(catT("en", "unites", "m2")).toBe("m²");
  });
});

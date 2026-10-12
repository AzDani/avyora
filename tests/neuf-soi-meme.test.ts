/**
 * « Je le fais » en construction neuve : une règle par poste (chantier N1 de la revue rénovation /
 * neuf, §3). Deux questions séparées :
 * - POSSIBLE ? `peutFaireSoiMeme` (core), la même règle qu'en rénovation, plus la table temporaire
 *   `PRO_PARTAGES_NEUF` (postes repris que le neuf réserve aux pros) ;
 * - PAR DÉFAUT en « Je fais le maximum » ? Tout sauf `PRO_PAR_DEFAUT_MAX` (structure, clos-couvert,
 *   raccordements). Aucun total par défaut ne bouge (T5 le vérifie scénario par scénario).
 *
 * Les postes réservés aux pros et leur raison sont figés dans `tests/postes-pro-neuf.txt`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CATALOG, CATALOG_NEUF, IDS_NEUF, POSTE_NEUF, PRO_PAR_DEFAUT_MAX, PRO_PARTAGES_NEUF, LOTS_DECENNALE_NEUF,
  buildDevis, catalogueDe, defaultCtx, effPrices, isLoc, key, peutFaireSoiMeme, peutFaireNeuf, presetMaison, presetNeuf,
  raisonProNeuf, soiMemeNeuf, type Lot, type MaisonNeuve, type QuiRealise, type RaisonPro, type Tache,
} from "@/lib/estimateur";
import { changerQuiNeuf, diyNeuf, horsDecennaleNeuf } from "@/lib/estimateur/detaille-neuf";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";

const lire = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const POSTES: Array<{ l: Lot; t: Tache }> = CATALOG_NEUF.flatMap((l) => l.t.map((t) => ({ l, t })));
const PROPRES = new Set(IDS_NEUF);
const lotDe = (id: string) => CATALOG_NEUF.find((l) => l.t.some((t) => t.id === id))!;
const tache = (id: string) => POSTE_NEUF.get(id)!.t;

/** Ce que la ligne du détaillé propose, et pourquoi. */
function decision(l: Lot, t: Tache): string {
  if (diyNeuf(l, t)) return "je-le-fais";
  const r = raisonProNeuf(t);
  if (r) return "pro:" + r;
  if (isLoc(l.c)) return "location";
  if (t.frais) return "frais";
  if (t.u === "pct") return "pct";
  if (t.sm == null) return "sans-fourniture";
  return "fourniture-au-prix-pose";
}

describe("Neuf · « Je le fais » possible : une décision par poste", () => {
  it("209 postes (202 + 7 locations reprises) : 132 en « Je le fais », 30 réservés aux pros, le reste sans objet", () => {
    expect(POSTES.length).toBe(209);
    const n: Record<string, number> = {};
    for (const { l, t } of POSTES) { const d = decision(l, t).split(":")[0]; n[d] = (n[d] ?? 0) + 1; }
    // 74 avant N1 ; + 57 postes des lots structure / clos-couvert, + fosse, + micro-station = 133 ;
    // − la borne de recharge, réservée aux pros en neuf (D2) = 132.
    expect(n).toEqual({
      "je-le-fais": 132, pro: 30,
      frais: 14,                    // 8 démarches gratuites et 6 taxes ou assurance : jamais de choix
      location: 11,                 // 4 + les 7 reprises de la rénovation
      "sans-fourniture": 20,        // 17 attendent un prix de fourniture sourcé (N12), 2 bennes, la provision argile
      "fourniture-au-prix-pose": 2, // panneau de permis, WC de chantier
    });
  });

  it("les postes réservés aux pros et leur raison sont figés (tests/postes-pro-neuf.txt)", () => {
    const pros = POSTES.filter(({ t }) => raisonProNeuf(t)).map(({ t }) => `${t.id} ${raisonProNeuf(t)}`);
    expect(pros).toEqual(lire("tests/postes-pro-neuf.txt").trim().split("\n"));
    // Un poste réservé n'a jamais le bouton.
    for (const { l, t } of POSTES) if (raisonProNeuf(t)) expect(diyNeuf(l, t), t.id).toBe(false);
  });

  it("une raison sur un poste propre au neuf vit dans catalog-neuf.json ; sur un poste repris, dans la table temporaire", () => {
    for (const { t } of POSTES) {
      if (PROPRES.has(t.id)) expect(PRO_PARTAGES_NEUF.has(t.id), t.id).toBe(false);
      else expect(t.pro, t.id).toBeUndefined(); // catalog.json n'est pas touché par N1
    }
    for (const id of PRO_PARTAGES_NEUF.keys()) expect(POSTE_NEUF.has(id), id).toBe(true);
  });

  it("maçonnerie, fondations, charpente, couverture, menuiseries extérieures, fosse et micro-station : faisables soi-même", () => {
    for (const id of ["mac-monter-un-mur-en-parpaings", "mac-mur-beton-cellulaire-20-cm", "mac-chainage-horizontal", "mac-chape-traditionnelle",
      "mac-semelle-de-fondation-50-25-30-cm", "fon-semelle-filante-beton-arme-seul", "fon-dalle-terre-plein-isolee", "toi-charpente-en-fermettes-hors-couverture",
      "toi-mur-ossature-bois-isole", "cou-couverture-tuiles-terre-cuite", "cou-gouttiere-zinc", "mex-fenetres", "mex-porte-d-entree", "ter-apport-remblai-grave",
      "toi-escalier-en-bois", "rac-assainissement-fosse-toutes-eaux-5-eh", "rac-assainissement-micro-station-5-eh"])
      expect(diyNeuf(lotDe(id), tache(id)), id).toBe(true);
    // Chaque poste de ces lots qui a un prix de fourniture est faisable : plus aucun verrou par lot.
    for (const { l, t } of POSTES) if (LOTS_DECENNALE_NEUF.has(l.c) && !raisonProNeuf(t) && t.sm != null) expect(diyNeuf(l, t), t.id).toBe(true);
  });

  it("restent aux pros : branchements, PAC et climatisations, borne de recharge, études, contrôles, procédés du poseur", () => {
    const attendu: Record<string, RaisonPro> = {
      "rac-raccordement-electrique-enedis": "concessionnaire", "rac-raccordement-au-tout-a-l-egout": "concessionnaire",
      "cha-pompe-a-chaleur-air-eau": "fluides", "cha-climatisation-reversible-split": "fluides", "cha-climatisation-gainable-reversible": "fluides",
      "ele-borne-de-recharge-voiture": "reglementaire", "etu-dossier-permis-dessinateur": "etude", "anx-implantation-par-geometre": "etude",
      "ele-consuel-attestation-de-conformite": "controle", "ter-journee-terrassier-mini-pelle": "procede", "cou-gouttiere-alu-continu": "procede",
    };
    for (const [id, r] of Object.entries(attendu)) {
      expect(raisonProNeuf(tache(id)), id).toBe(r);
      expect(diyNeuf(lotDe(id), tache(id)), id).toBe(false);
    }
  });

  it("chaque raison a son libellé, en français et en anglais", () => {
    const raisons = new Set(POSTES.map(({ t }) => raisonProNeuf(t)).filter((r): r is RaisonPro => !!r));
    expect([...raisons].sort()).toEqual(["concessionnaire", "controle", "etude", "fluides", "procede", "reglementaire"]);
    for (const loc of ["fr", "en"] as const) for (const r of raisons) expect(dictNeufCommun(loc).raisonsPro[r], `${loc} ${r}`).toBeTruthy();
  });
});

describe("Neuf · même règle que la rénovation", () => {
  it("en rénovation, peutFaireSoiMeme décide exactement comme la ligne aujourd'hui, sur chacun des postes", () => {
    const ctx = defaultCtx();
    let n = 0;
    for (const l of CATALOG) for (const t of l.t) {
      n++;
      // La ligne de la rénovation propose « Je le fais » dès que le poste a un prix de fourniture (Row).
      expect(peutFaireSoiMeme(l, t), t.id).toBe(!isLoc(l.c) && effPrices(t, {}, ctx).sm != null);
    }
    expect(n).toBeGreaterThan(200);
  });

  it("les 110 postes repris décident comme en rénovation, sauf les 5 de la table temporaire qui ont un prix de fourniture", () => {
    const reno = new Map(CATALOG.flatMap((l) => l.t.map((t) => [t.id, l] as const)));
    const ecarts: string[] = [];
    let n = 0;
    for (const { l, t } of POSTES) {
      if (PROPRES.has(t.id)) continue;
      n++;
      if (diyNeuf(l, t) !== peutFaireSoiMeme(reno.get(t.id)!, t)) ecarts.push(t.id);
    }
    expect(n).toBe(110);
    expect(ecarts.sort()).toEqual(["cha-climatisation-gainable-reversible", "cha-climatisation-reversible-split", "cha-pompe-a-chaleur-air-eau",
      "ele-borne-de-recharge-voiture", "rac-raccordement-au-tout-a-l-egout"]);
  });
});

describe("Neuf · « Je fais le maximum » : ce qui est pris par défaut", () => {
  it("jamais là où ce n'est pas possible ; en « le maximum », tout sauf structure, clos-couvert et raccordements", () => {
    for (const { l, t } of POSTES) {
      const possible = peutFaireNeuf(l, t);
      expect(soiMemeNeuf(l.c, "pros", t), t.id).toBe(false);
      expect(soiMemeNeuf(l.c, "max", t), t.id).toBe(possible && !PRO_PAR_DEFAUT_MAX.has(l.c));
      expect(soiMemeNeuf(l.c, "partie", t), t.id).toBe(possible && ["Peinture", "Carrelage / Revetements", "Cloisons / Platrerie", "Isolation"].includes(l.c));
    }
    expect(PRO_PAR_DEFAUT_MAX.has("Raccordements aux réseaux")).toBe(true);
  });

  it("fosse et micro-station : faisables à la main, mais pas prises par défaut en « le maximum »", () => {
    for (const id of ["rac-assainissement-fosse-toutes-eaux-5-eh", "rac-assainissement-micro-station-5-eh"]) {
      expect(diyNeuf(lotDe(id), tache(id)), id).toBe(true);
      expect(soiMemeNeuf(lotDe(id).c, "max", tache(id)), id).toBe(false);
    }
  });

  it("totaux par défaut inchangés : 100 m² plain-pied en « le maximum » à 189 110 €, 195 743 € avec une fosse, 200 441 € avec une micro-station", () => {
    const ttc = (p: ReturnType<typeof presetNeuf>) => Math.round(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc);
    const R = { surface: 100, niveaux: "pp" as const, codePostal: "45000", finition: "standard" as const, qui: "max" as QuiRealise };
    expect(ttc(presetNeuf({ ...R, assainissement: "collectif" }))).toBe(189110);
    expect(ttc(presetNeuf({ ...R, assainissement: "fosse" }))).toBe(195743);
    expect(ttc(presetNeuf(R, { assainissement: "micro" }))).toBe(200441);
    // La maison de calage A (decisions.md) : la même.
    const A: Partial<MaisonNeuve> = {
      surface: 100, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0, forme: "rect", murs: "parpaing", plancherBas: "terre-plein", toiture: "2pans",
      couverture: "terre-cuite", chauffage: "pac-eau", vmc: "simple", assainissement: "collectif", eauxPluviales: "infiltration", distanceReseaux: 15,
      terrain: "plat", argile: "non", sismique: 1, codePostal: "45000", escalier: "bois", lotissement: false, borne: true, pilotage: "moi", gouttiere: "zinc",
    };
    expect(ttc(presetMaison(A, { finition: "standard", qui: "max", codePostal: "45000" }))).toBe(189110);
  });

  it("passer tout en « le maximum » ne prend ni la PAC, ni la borne, ni la fosse, ni les murs ; garde ce qui était pris", () => {
    const { sel } = presetMaison({ surface: 100, assainissement: "fosse" }, { qui: "pros" });
    const cle = (id: string) => key(POSTE_NEUF.get(id)!.c, POSTE_NEUF.get(id)!.n);
    const avecBorne = { ...sel, [cle("ele-borne-de-recharge-voiture")]: { on: true, qty: 1 } };
    const max = changerQuiNeuf(avecBorne, "max");
    for (const id of ["cha-pompe-a-chaleur-air-eau", "ele-borne-de-recharge-voiture", "rac-assainissement-fosse-toutes-eaux-5-eh", "mac-monter-un-mur-en-parpaings"])
      expect(max[cle(id)]?.self, id).toBe(false);
    expect(max[cle("pei-peinture-murs-plaques-neuves")]?.self).toBe(true);
  });
});

describe("Neuf · avertissement « hors garantie décennale »", () => {
  it("sur les lignes de structure et de clos-couvert seulement", () => {
    expect([...LOTS_DECENNALE_NEUF].sort()).toEqual(["Charpente, couverture & structure bois", "Couverture & zinguerie", "Fondations & soubassement",
      "Maçonnerie", "Menuiseries exterieures", "Terrassement"]);
    expect(horsDecennaleNeuf(lotDe("mac-monter-un-mur-en-parpaings"))).toBe(true);
    expect(horsDecennaleNeuf(lotDe("mex-fenetres"))).toBe(true);
    expect(horsDecennaleNeuf(lotDe("pei-peinture-murs-plaques-neuves"))).toBe(false);
    expect(horsDecennaleNeuf(lotDe("rac-assainissement-fosse-toutes-eaux-5-eh"))).toBe(false);
  });
});

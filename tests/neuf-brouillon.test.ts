/**
 * Construction neuve, chantier C3 : le brouillon du rapide (anonyme → inscription → projet), la
 * requête de création, le contexte de l'URL publique et l'alerte argile du bilan.
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDevis, catalogueDe, presetNeuf, maisonComplete, type RapideNeufInput, type Ctx, type Selection } from "@/lib/estimateur";
import {
  brouillonRapideNeuf, lireBrouillonNeuf, lireReponsesRapideNeuf, corpsProjetNeuf, nomProjetNeuf,
  CLE_BROUILLON_NEUF, RECLAMATION_NEUF, TYPE_BIEN_NEUF, CLE_RECLAMATION, CLE_RECLAMATION_NEUF, reclamationNeufPosee,
} from "@/lib/estimateur/brouillon-neuf";
import { nomProjetNeuf as nomDepuisIndex } from "@/lib/estimateur/etapes-neuf";
import { contexteNeuf } from "@/lib/neuf-contexte";
import { projetCreateSchema, projetPatchSchema } from "@/lib/validation";
import BilanRapideNeuf from "@/components/neuf/BilanRapideNeuf";

const R: RapideNeufInput = { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" };
const ttcDe = (p: { ctx: Ctx; sel: Selection }) => buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc;

describe("Neuf · brouillon du rapide", () => {
  const p = presetNeuf(R);
  const d = brouillonRapideNeuf({ R, ctx: p.ctx, sel: p.sel });
  const json = JSON.stringify(d);

  it("le cas de référence vaut 246 762 € (même chiffre que la maquette)", () => {
    expect(Math.round(ttcDe(p))).toBe(246_762);
  });

  it("le brouillon est un projet neuf, avec ses réponses", () => {
    const relu = JSON.parse(json);
    expect(relu.ctx.nature).toBe("neuf");
    expect(relu.v).toBe("estimateur");
    expect(relu.mode).toBe("rapide");
    expect(relu.R).toEqual(R);
    expect(relu.codePostal).toBe("45000");
    expect("base" in relu).toBe(false);
  });

  it("relu, il redonne le même TTC (par ses ctx/sel comme par presetNeuf sur ses réponses)", () => {
    const relu = lireBrouillonNeuf(json);
    expect(relu).not.toBeNull();
    const t0 = ttcDe(p);
    expect(ttcDe(relu!)).toBe(t0);
    expect(ttcDe(presetNeuf(relu!.R!, relu!.base))).toBe(t0);
  });

  it("une maison venue d'ailleurs (base) survit à l'aller-retour", () => {
    const base = { ...maisonComplete({ surface: 140, niveaux: "combles" }), chambres: 4, assainissement: "micro" as const };
    const r2 = { ...R, surface: 140, niveaux: "combles" as const, assainissement: undefined };
    const p2 = presetNeuf(r2, base);
    const relu = lireBrouillonNeuf(JSON.stringify(brouillonRapideNeuf({ R: r2, ctx: p2.ctx, sel: p2.sel, base, origine: { source: "plan" } })))!;
    expect(relu.base?.chambres).toBe(4);
    expect(relu.origine).toEqual({ source: "plan" });
    expect(ttcDe(presetNeuf(relu.R!, relu.base))).toBe(ttcDe(p2));
    expect(p2.ctx.neuf?.assainissement).toBe("micro");
    expect(p2.ctx.neuf?.niveaux).toBe("combles");
  });

  it("refuse un brouillon de rénovation, un code postal manquant, du JSON illisible", () => {
    const reno = { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: { type: "Maison", surface: 100 }, sel: {}, codePostal: "45000" };
    expect(lireBrouillonNeuf(JSON.stringify(reno))).toBeNull();
    expect(lireBrouillonNeuf(JSON.stringify({ ...d, codePostal: "450", ctx: { ...d.ctx, codePostal: "450" } }))).toBeNull();
    expect(lireBrouillonNeuf("{pas du json")).toBeNull();
    expect(lireBrouillonNeuf(null)).toBeNull();
  });

  it("clés séparées de la rénovation", () => {
    expect(CLE_BROUILLON_NEUF).toBe("avyora-neuf-v1");
    expect(CLE_BROUILLON_NEUF).not.toBe("avyora-estim-v2");
    // Le drapeau du neuf a sa propre clé : réno puis neuf (ou l'inverse) réclame les deux.
    expect(CLE_RECLAMATION_NEUF).toBe("avyora-neuf-claim");
    expect(CLE_RECLAMATION_NEUF).not.toBe(CLE_RECLAMATION);
    const st = (o: Record<string, string>) => (k: string) => o[k] ?? null;
    expect(reclamationNeufPosee(st({ [CLE_RECLAMATION_NEUF]: "1" }))).toBe(true);
    expect(reclamationNeufPosee(st({ [CLE_RECLAMATION]: RECLAMATION_NEUF }))).toBe(true);   // ancienne valeur
    expect(reclamationNeufPosee(st({ [CLE_RECLAMATION]: "1" }))).toBe(false);               // la rénovation
  });
});

describe("Neuf · corps de la requête de création", () => {
  const p = presetNeuf(R);
  const corps = corpsProjetNeuf(brouillonRapideNeuf({ R, ctx: p.ctx, sel: p.sel }), "fr");

  it("nom, typeBien, surface et code postal d'un projet neuf", () => {
    expect(corps.nom).toBe("Construction neuve — Maison plain-pied 100 m²");
    expect(corps.typeBien).toBe(TYPE_BIEN_NEUF);
    expect(corps.surface).toBe(100);
    expect(corps.codePostal).toBe("45000");
    expect(corps.reponses.mode).toBe("rapide");
    expect(corps.reponses.ctx.nature).toBe("neuf");
    expect(corsSansR(corps.reponses)).toBe(true);
  });

  it("passe la validation du serveur (création et modification)", () => {
    expect(projetCreateSchema.safeParse(corps).success).toBe(true);
    expect(projetPatchSchema.safeParse(corps).success).toBe(true);
  });

  it("le nom vient du même endroit pour la fiche et pour la réclamation", () => {
    expect(nomDepuisIndex).toBe(nomProjetNeuf);
    expect(corpsProjetNeuf(brouillonRapideNeuf({ R, ctx: p.ctx, sel: p.sel }), "en").nom).toBe("New build — Single-storey house 100 m²");
  });
});

/** Les réponses enregistrées n'emportent pas la saisie brute du formulaire (R, base) : le projet se relit par ctx/sel. */
function corsSansR(r: Record<string, unknown>) { return !("R" in r) && !("base" in r); }

describe("Neuf · édition gratuite : la maison se déduit des 5 réponses", () => {
  it("sans base, changer la surface redéduit chambres et salles d'eau ; avec base, elles restent", () => {
    const avant = presetNeuf(R).ctx.neuf!;
    const sansBase = presetNeuf({ ...R, surface: 180, niveaux: "etage" }).ctx.neuf!;
    const avecBase = presetNeuf({ ...R, surface: 180, niveaux: "etage" }, avant).ctx.neuf!;
    expect(sansBase.chambres).toBe(maisonComplete({ surface: 180 }).chambres);
    expect(sansBase.chambres).not.toBe(avant.chambres);
    expect(avecBase.chambres).toBe(avant.chambres);
  });
});

describe("Neuf · contexte de l'URL publique", () => {
  it("garde ce qui est reconnu", () => {
    expect(contexteNeuf({ cp: "45000", surface: "120", niveaux: "etage", src: "guide" })).toEqual({ cp: "45000", surface: 120, niveaux: "etage", src: "guide" });
  });
  it("ignore le reste, sans le corriger", () => {
    expect(contexteNeuf({ cp: "99999", surface: "20", niveaux: "combles", src: "bidon" })).toEqual({ cp: undefined, surface: undefined, niveaux: undefined, src: undefined });
    expect(contexteNeuf({ cp: ["75001", "13000"], surface: "abc" })).toMatchObject({ cp: "75001", surface: undefined });
    expect(contexteNeuf({ surface: "401" }).surface).toBeUndefined();
  });
});

describe("Neuf · alerte argile du bilan", () => {
  const rendre = (argile: "non" | "moyen") => {
    const p = presetNeuf(R, { argile });
    return renderToStaticMarkup(createElement(BilanRapideNeuf, { ctx: p.ctx, sel: p.sel, qui: "pros", locale: "fr" }));
  };
  it("affichée pour une maison sans argile, avec un surcoût chiffré", () => {
    expect(rendre("non")).toContain('class="alert-n"');
  });
  it("masquée quand la maison est déjà sur sol argileux (surcoût déjà compté, 0)", () => {
    expect(rendre("moyen")).not.toContain('class="alert-n"');
  });
});

describe("Neuf · retour de /tarifs", () => {
  it("relit des réponses valides, refuse une réponse hors des choix du formulaire", () => {
    expect(lireReponsesRapideNeuf(R)).toEqual({ ...R, garage: !!R.garage });
    expect(lireReponsesRapideNeuf({ ...R, niveaux: "__proto__" })).toBeNull();
    expect(lireReponsesRapideNeuf({ ...R, surface: "abc" })).toBeNull();
    expect(lireReponsesRapideNeuf({ ...R, qui: "tous" })).toBeNull();
    expect(lireReponsesRapideNeuf(null)).toBeNull();
    expect(lireReponsesRapideNeuf({ ...R, assainissement: "micro" })?.assainissement).toBeUndefined();
  });
});

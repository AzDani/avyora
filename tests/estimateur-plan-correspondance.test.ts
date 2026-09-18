import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { contributionsDuPlan, postesCouverts, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { posteParId } from "@/lib/estimateur/identite";

/** Contrat 1.1.0 produit par l'éditeur de plan sur un scénario délibéré (voir le commit). */
const plan = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as PlanPourCorrespondance;
const { contributions, ignores } = contributionsDuPlan(plan);
const q = (id: string) => contributions.find((c) => c.poste === id)?.quantite ?? 0;

describe("table de correspondance · les postes existent et rien n'est inventé", () => {
  it("chaque poste visé par la table est au catalogue", () => {
    expect(postesCouverts().filter((id) => !posteParId(id))).toEqual([]);
  });
  it("chaque contribution produite désigne un poste réel, avec une quantité positive", () => {
    expect(contributions.length).toBeGreaterThan(10);
    for (const c of contributions) {
      expect(posteParId(c.poste), c.poste).toBeTruthy();
      expect(c.quantite, c.poste).toBeGreaterThan(0);
      expect(c.raison.length).toBeGreaterThan(5);
    }
  });
  it("un poste n'apparaît qu'une fois, ses sources regroupées", () => {
    const ids = contributions.map((c) => c.poste + JSON.stringify(c.variante ?? {}));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("table de correspondance · D1, seul le delta est facturé", () => {
  it("un radiateur et un lavabo déjà en place ne produisent rien", () => {
    const existants = (plan.detailNiveaux ?? []).flatMap((n) => n.equipements ?? []).filter((e) => e.etat === "existant");
    expect(existants.map((e) => e.type).sort()).toEqual(["lavabo", "radiateur"]);
    const src = new Set(contributions.flatMap((c) => c.sources));
    for (const e of existants) expect(src.has(e.id), e.type).toBe(false);
  });
  it("un chauffe-eau marqué « conservé » ne produit rien non plus", () => {
    const garde = (plan.detailNiveaux ?? []).flatMap((n) => n.equipements ?? []).find((e) => e.etat === "garder")!;
    expect(garde.type).toBe("cumulus");
    expect(contributions.flatMap((c) => c.sources)).not.toContain(garde.id);
    expect(q("plo-chauffe-eau-electrique-cumulus")).toBe(0);
  });
  it("une menuiserie conservée ne produit rien", () => {
    const gardee = (plan.detailNiveaux ?? []).flatMap((n) => n.menuiseries ?? []).find((m) => m.etat === "garder")!;
    expect(gardee).toBeTruthy();
    expect(contributions.flatMap((c) => c.sources)).not.toContain(gardee.id);
  });
});

describe("table de correspondance · ce que le scénario doit produire", () => {
  it("le mur porteur démoli donne ses trois lignes (D9)", () => {
    expect(q("dem-abattre-un-mur-porteur")).toBeCloseTo(3.5, 1);   // 1,40 m × 2,50
    expect(q("mac-poutre-de-reprise-de-charge-ipn-hea")).toBeCloseTo(1.4, 1);
    expect(q("etu-etude-de-structure")).toBe(1);
  });
  it("cloisons : une démolie, une créée, chacune dans son poste", () => {
    expect(q("dem-abattre-une-cloison")).toBeCloseTo(4, 1);        // 1,60 m × 2,50
    expect(q("clo-monter-une-cloison")).toBe(0);                    // aucune cloison à créer ici
  });
  it("la douche à l'italienne prend sa branche, et une seule (D6)", () => {
    expect(q("plo-douche-a-l-italienne")).toBe(1);
    expect(q("plo-bac-de-douche")).toBe(0);
    expect(q("plo-cabine-complete-parois-porte")).toBe(0);
    expect(q("plo-colonne-de-douche")).toBe(1);
    expect(q("plo-paroi-de-douche")).toBe(1);
  });
  it("la double vasque est UNE unité en variante double (D7)", () => {
    const mv = contributions.find((c) => c.poste === "plo-meuble-vasque")!;
    expect(mv.quantite).toBe(1);
    expect(mv.variante).toEqual({ config: "double" });
  });
  it("les points lumineux suivent leur attribut, l'escalier retombe sur son défaut (D15)", () => {
    expect(q("ele-spots-encastres-led")).toBe(1);
    expect(q("ele-ajouter-un-point-lumineux")).toBe(1);
    expect(q("toi-escalier-en-bois")).toBe(1);      // matériau non choisi → bois
    expect(q("mac-escalier-en-beton")).toBe(0);
  });
  it("une prise double compte deux prises, un plan de travail compte ses mètres", () => {
    expect(q("ele-ajouter-deplacer-une-prise")).toBe(2);
    expect(q("cui-plan-de-travail-seul")).toBeCloseTo(2.4, 2);
  });
  it("la menuiserie remplacée est déposée puis reposée", () => {
    expect(q("dem-enlever-les-anciennes-portes-fenetres")).toBe(1);
    expect(q("min-porte-interieure-battante")).toBe(1);
    expect(q("mex-fenetres")).toBe(2);      // une remplacée, une neuve
    expect(q("mex-volets-roulants")).toBe(1);
    expect(q("min-porte-interieure-battante")).toBe(1);
  });
  it("le percement du mur porteur et le doublage intérieur remontent", () => {
    expect(q("mac-ouvrir-un-mur-porteur-petite-porte-fenetre")).toBe(1);
    expect(q("iso-isolation-des-murs-par-l-interieur")).toBeCloseTo(20, 1);
    expect(q("clo-doubler-un-mur")).toBe(0); // D2 : c'est l'ITI qui porte le doublage
  });
  it("la robinetterie de lavabo n'est PAS injectée : le moteur la dérive du meuble", () => {
    expect(q("plo-robinetterie-lavabo")).toBe(0);
  });
});

describe("table de correspondance · ce qu'elle ne sait pas faire, elle le dit", () => {
  it("le rebouchage d'une ouverture part dans les ignorés, avec sa raison", () => {
    const b = ignores.find((i) => i.quoi.includes("boucher"));
    expect(b, JSON.stringify(ignores)).toBeTruthy();
    expect(b!.pourquoi).toContain("aucun poste");
  });
  it("chaque ignoré porte une raison lisible", () => {
    for (const i of ignores) expect(i.pourquoi.length).toBeGreaterThan(10);
  });
});

describe("table de correspondance · les sols, pièce par pièce (D8)", () => {
  it("un parquet posé sur un parquet existant se ponce, il ne se remplace pas", () => {
    expect(q("rev-poncage-vitrification-parquet")).toBeCloseTo(22.8, 1);
    expect(q("rev-parquet-bois")).toBe(0);
  });
  it("le carrelage, la chape, le ragréage et la dépose suivent chacun leur pièce", () => {
    expect(q("rev-carrelage-au-sol")).toBeCloseTo(13.4, 1);
    expect(q("mac-chape-traditionnelle")).toBeCloseTo(13.4, 1);
    expect(q("rev-preparation-du-sol-ragreage")).toBeCloseTo(13.4, 1);
    expect(q("dem-enlever-un-revetement-de-sol")).toBeCloseTo(13.4 + 22.8, 1);
  });
  it("chaque ligne de sol porte l'identifiant de sa pièce", () => {
    const c = contributions.find((x) => x.poste === "rev-carrelage-au-sol")!;
    expect(c.sources).toEqual(["p1"]);
  });
});

describe("table de correspondance · les surfaces mesurées (D10)", () => {
  it("la faïence à mi-hauteur : 1,20 m partout, 2,00 m contre la douche et la baignoire", () => {
    // périmètre 16 m ; receveur 1,2×0,8 et baignoire 1,7×0,75 adossés → 4,45 m à 2 m
    const attendu = (16 - 4.45) * 1.2 + 4.45 * 2;
    expect(q("rev-faience-carrelage-mural")).toBeCloseTo(attendu, 1);
  });
  it("seules les CLOISONS de la pièce humide sont hydrofugées, pas ses murs extérieurs", () => {
    expect(q("clo-cloison-piece-humide-hydrofuge")).toBeCloseTo(12.5, 1);
  });
  it("la chambre n'est pas carrelée : aucune faïence n'est déclenchée par une pièce sèche", () => {
    const c = contributions.find((x) => x.poste === "rev-faience-carrelage-mural")!;
    expect(c.sources).toEqual(["p1"]);
  });
  it("les plinthes viennent du périmètre réel, pas d'une racine carrée", () => {
    expect(q("rev-plinthes")).toBeCloseTo(15.17 + 19.17 + 16, 1); // les deux pièces du bas + celle de l'étage
  });
});

describe("table de correspondance · la toiture", () => {
  it("une toiture refaite entièrement dépose puis repose, sur la surface mesurée", () => {
    // la toiture se pose sur le DERNIER niveau : ici l'étage de 4 × 4, pas le rez-de-chaussée
    expect(q("toi-depose-complete-de-toiture-couverture-charpent")).toBeCloseTo(26.6, 1);
    expect(q("toi-toiture-complete-tuile-charpente-couverture")).toBeCloseTo(26.6, 1);
    expect(q("toi-charpente-traditionnelle-hors-couverture")).toBe(0); // comprise dans le poste complet
  });
  it("l'isolation des combles perdus se compte à l'emprise, pas à la surface de toit", () => {
    expect(q("iso-isolation-des-combles-perdus-soufflage")).toBeCloseTo(17.6, 1);
  });
  it("gouttières et raccords suivent les linéaires mesurés", () => {
    expect(q("toi-gouttieres-descentes")).toBeGreaterThan(5);
    expect(q("toi-raccords-faitage-noues-solins")).toBeGreaterThan(2);
  });
  it("les fenêtres de toit du panneau comptent quand aucune n'est dessinée (D15)", () => {
    expect(q("toi-fenetre-de-toit-velux")).toBe(2);
  });
});

describe("table de correspondance · la maçonnerie induite par une ouverture neuve", () => {
  it("une fenêtre créée reçoit son appui ; une menuiserie remplacée garde le sien", () => {
    expect(q("mac-creer-un-appui-de-fenetre")).toBe(1); // une seule des deux fenêtres est neuve
    expect(q("mac-creer-un-seuil-de-porte")).toBe(0);
  });
});

describe("table de correspondance · les déductions se signalent", () => {
  const deduites = () => contributions.filter((c) => c.deduction);
  it("chaque ligne déduite porte une phrase qui dit quoi changer", () => {
    expect(deduites().length).toBeGreaterThan(0);
    for (const c of deduites()) expect(c.deduction!.length).toBeGreaterThan(30);
  });
  it("le ponçage du parquet est signalé comme déduit du sol existant", () => {
    const c = contributions.find((x) => x.poste === "rev-poncage-vitrification-parquet")!;
    expect(c.deduction).toContain("Parquet ancien");
    expect(c.deduction).toContain("change cette ligne");
  });
  it("un matériau d'escalier non choisi est signalé, un type de douche choisi ne l'est pas", () => {
    expect(contributions.find((x) => x.poste === "toi-escalier-en-bois")!.deduction).toContain("bois par défaut");
    expect(contributions.find((x) => x.poste === "plo-douche-a-l-italienne")!.deduction).toBeUndefined();
  });
  it("les fenêtres de toit comptées au panneau sont signalées comme non dessinées", () => {
    expect(contributions.find((x) => x.poste === "toi-fenetre-de-toit-velux")!.deduction).toContain("dessin");
  });
});

describe("table de correspondance · le reste du périmètre", () => {
  it("un faux plafond demandé dans une pièce ne sort que pour cette pièce", () => {
    const c = contributions.find((x) => x.poste === "clo-faux-plafond")!;
    expect(c.quantite).toBeCloseTo(13.41, 1);
    expect(c.sources).toEqual(["p1"]);
  });
  it("un étage créé apporte son plancher, au défaut bois signalé", () => {
    const c = contributions.find((x) => x.poste === "toi-creer-un-plancher-bois")!;
    expect(c.quantite).toBeCloseTo(14.44, 1);
    expect(c.deduction).toContain("bois par défaut");
    expect(q("mac-plancher-beton-etage-cree")).toBe(0);
  });
  it("le rez-de-chaussée n'est pas un étage créé : il n'apporte aucun plancher", () => {
    const c = contributions.find((x) => x.poste === "toi-creer-un-plancher-bois")!;
    expect(c.sources).toEqual([plan.detailNiveaux![1].id]);
  });
});

describe("table de correspondance · poteaux et poutres dessinés (contrat 1.5)", () => {
  /* Scène minimale : un mur porteur de 4 m démoli, et ce qu'on dessine dessus ou à côté. */
  const scene = (equipements: NonNullable<PlanPourCorrespondance["detailNiveaux"]>[number]["equipements"]): PlanPourCorrespondance =>
    ({
      provenance: { murs: [{ id: "m1", niveau: "n1", type: "mur", porteur: true, etat: "demolir", ml: 4, m2: 10 }] },
      detailNiveaux: [{ equipements }],
    }) as unknown as PlanPourCorrespondance;
  const ml = (p: PlanPourCorrespondance) =>
    contributionsDuPlan(p).contributions.find((c) => c.poste === "mac-poutre-de-reprise-de-charge-ipn-hea")?.quantite ?? 0;

  it("sans poutre dessinée, la reprise reste induite par le mur", () => {
    expect(ml(scene([]))).toBe(4);
  });

  it("une poutre dessinée sur ce mur la remplace, elle ne s'y ajoute pas", () => {
    const p = scene([{ id: "e1", type: "poutre", etat: "creer", materiau: "acier", ossature: { role: "poutre", portee: 4, reprendMurPorteur: "m1" } }]);
    expect(ml(p)).toBe(4);                                     // 4, et non 8
    const c = contributionsDuPlan(p).contributions.find((x) => x.poste === "mac-poutre-de-reprise-de-charge-ipn-hea");
    expect(c?.sources).toEqual(["e1"]);                        // c'est la poutre dessinée qui parle, plus le mur
  });

  it("une poutre dessinée ailleurs s'ajoute à la reprise du mur", () => {
    expect(ml(scene([{ id: "e1", type: "poutre", etat: "creer", materiau: "acier", ossature: { role: "poutre", portee: 2.5, reprendMurPorteur: null } }]))).toBe(6.5);
  });

  it("chaque matériau va sur SON poste, pas sur celui de l'acier", () => {
    const poste = (mat: string) =>
      contributionsDuPlan(scene([{ id: "e1", type: "poutre", etat: "creer", materiau: mat, ossature: { role: "poutre", portee: 3, reprendMurPorteur: null } }]))
        .contributions.find((c) => /^mac-poutre/.test(c.poste))?.poste;
    expect(poste("bois")).toBe("mac-poutre-de-reprise-de-charge-lamelle-colle");
    expect(poste("beton")).toBe("mac-poutre-de-reprise-de-charge-beton-arme");
    expect(poste("acier")).toBe("mac-poutre-de-reprise-de-charge-ipn-hea");
  });

  it("le poteau se chiffre à l'unité, sur le poste de son matériau", () => {
    const { contributions } = contributionsDuPlan(scene([{ id: "e1", type: "poteau", etat: "creer", materiau: "beton", ossature: { role: "poteau" } }]));
    const c = contributions.find((x) => /^mac-poteau/.test(x.poste));
    expect(c?.poste).toBe("mac-poteau-de-reprise-beton-arme");
    expect(c?.quantite).toBe(1);
    expect(c?.sources).toEqual(["e1"]);
  });

  it("deux poteaux du même matériau se cumulent sur un seul poste", () => {
    const { contributions } = contributionsDuPlan(scene([
      { id: "e1", type: "poteau", etat: "creer", materiau: "acier", ossature: { role: "poteau" } },
      { id: "e2", type: "poteau", etat: "creer", materiau: "acier", ossature: { role: "poteau" } },
    ]));
    const c = contributions.find((x) => x.poste === "mac-poteau-de-reprise-acier-hea-heb");
    expect(c?.quantite).toBe(2);
    expect(c?.sources).toEqual(["e1", "e2"]);
  });

  it("sans matériau choisi, on chiffre en acier ET on le dit", () => {
    const { contributions } = contributionsDuPlan(scene([{ id: "e1", type: "poteau", etat: "creer", ossature: { role: "poteau" } }]));
    const c = contributions.find((x) => /^mac-poteau/.test(x.poste));
    expect(c?.poste).toBe("mac-poteau-de-reprise-acier-hea-heb");
    expect(c?.deduction).toMatch(/non choisi/);
  });

  it("une poutre seulement prévue mais pas à poser ne compte pas (D1)", () => {
    expect(ml(scene([{ id: "e1", type: "poutre", etat: "existant", materiau: "acier", ossature: { role: "poutre", portee: 4, reprendMurPorteur: "m1" } }]))).toBe(4);
  });
});

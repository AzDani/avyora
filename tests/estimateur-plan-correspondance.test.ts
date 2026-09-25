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
  /* Le doublage se lit MUR PAR MUR (`provenance.doublages`), pas sur l'agrégat. L'agrégat compte
     tout ce que la vue Projet montre, un doublage déjà en place compris — il se facturait donc
     comme neuf, ce que D1 interdit. Et une ligne sans source ne se rattache à aucun objet du
     plan, ce que D1 exige aussi. */
  it("le doublage dit de quel mur il vient", () => {
    const c = contributions.find((x) => x.poste === "iso-isolation-des-murs-par-l-interieur")!;
    expect(c.sources.length).toBeGreaterThan(0);
    for (const src of c.sources) expect(src).toMatch(/^m\d+$/);
  });
  /* Le matériau et le vitrage d'une menuiserie voyagent sur `mat`/`vit` et non dans `variante` :
     le moteur les lit là, et eux seuls portent les coefficients (alu 1, PVC 0,60, bois 1,05 ·
     double 1, triple 1,20). Tant qu'ils ne partaient pas, une fenêtre bois en triple vitrage se
     chiffrait en PVC double — 570 € au lieu de 1 197. */
  it("une menuiserie transmet son matériau et son vitrage", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const m = p.detailNiveaux[0].menuiseries.find((x: { etat: string }) => x.etat === "creer");
    m.mat = "bois"; m.vitrage = "triple";
    const { contributions: c } = contributionsDuPlan(p);
    const l = c.find((x) => x.poste === "mex-fenetres" && x.mat === "bois")!;
    expect(l, "aucune ligne en bois").toBeTruthy();
    expect(l.vit).toBe("triple");
    expect(l.sources).toContain(m.id);
  });
  it("deux menuiseries de matériaux différents ne fusionnent pas", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const ms = p.detailNiveaux[0].menuiseries.filter((x: { type: string }) => x.type === "fenetre");
    expect(ms.length).toBeGreaterThan(1);
    ms[0].mat = "bois"; ms[1].mat = "pvc";
    const { contributions: c } = contributionsDuPlan(p);
    const lignes = c.filter((x) => x.poste === "mex-fenetres");
    expect(lignes.length).toBeGreaterThan(1);
  });
  it("un matériau que le moteur ne connaît pas n'est pas transmis", () => {
    const p = JSON.parse(JSON.stringify(plan));
    p.detailNiveaux[0].menuiseries.forEach((m: { mat?: string }) => { m.mat = "inox"; });
    const { contributions: c } = contributionsDuPlan(p);
    for (const l of c.filter((x) => x.poste === "mex-fenetres")) expect(l.mat).toBeUndefined();
  });
  /* La poche du galandage est une PLUS-VALUE sur la menuiserie, pas une ligne à part : le plan
     pose la variante, le moteur ajoute le prix. Une ligne « Caisson » en plus la facturerait
     deux fois. */
  it("une menuiserie à galandage porte sa poche en variante, sans ligne séparée", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const m = p.detailNiveaux[0].menuiseries.find((x: { etat: string }) => x.etat === "creer");
    m.ouvrant = "galandage";
    const { contributions: c } = contributionsDuPlan(p);
    expect(c.some((x) => x.poste === "clo-caisson-a-galandage-chassis-habillage")).toBe(false);
    const men = c.find((x) => x.sources.includes(m.id) && /^mex-|^min-/.test(x.poste))!;
    expect(men.variante).toEqual({ pose: "galandage" });
  });
  it("le choix « à galandage » voyage aussi sur la menuiserie elle-même", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const m = p.detailNiveaux[0].menuiseries.find((x: { etat: string }) => x.etat === "creer");
    m.ouvrant = "galandage";
    const { contributions: c } = contributionsDuPlan(p);
    const men = c.find((x) => x.sources.includes(m.id) && /^mex-|^min-/.test(x.poste))!;
    expect(men.variante).toEqual({ pose: "galandage" });
  });
  /* Le garde-corps se lit sur `tremiePerimNeuf` : une trémie déjà là a déjà le sien (D1). */
  it("une trémie créée paie son garde-corps, une trémie existante non", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const r = p.detailNiveaux[1].rooms[0];
    r.tremiePerim = 9; r.tremiePerimNeuf = 0;
    expect(contributionsDuPlan(p).contributions.find((x) => x.poste === "toi-garde-corps")).toBeUndefined();
    r.tremiePerimNeuf = 9;
    const l = contributionsDuPlan(p).contributions.find((x) => x.poste === "toi-garde-corps")!;
    expect(l.quantite).toBeCloseTo(9, 1);
    expect(l.sources).toEqual([r.id]);
  });
  /* Le percement se rattache à SON ouverture : 19 000 € sans source sur une scène de six. */
  it("les percements disent de quelle ouverture ils viennent", () => {
    const l = contributions.find((x) => x.poste === "mac-ouvrir-un-mur-porteur-petite-porte-fenetre");
    expect(l?.sources.length).toBeGreaterThan(0);
    for (const src of l!.sources) expect(src).toMatch(/^o\d+$/);
  });
  /* Une ITE sous BARDAGE n'est pas une ITE sous enduit : parement ventilé contre enduit sur
     isolant, 185 contre 140 €/m². Deux postes, et c'est la finition transmise par le contrat
     (1.12) qui choisit — avant, les deux se facturaient au même prix. */
  it("l'ITE sous bardage va sur son propre poste", () => {
    const base = JSON.parse(JSON.stringify(plan));
    for (const d of base.provenance.doublages) { d.mode = "ite"; d.sys = "enduit"; }
    const enduit = contributionsDuPlan(base).contributions;
    expect(enduit.some((x) => x.poste === "fac-isolation-par-l-exterieur-ite")).toBe(true);
    expect(enduit.some((x) => x.poste === "fac-isolation-par-l-exterieur-ite-sous-bardage")).toBe(false);

    const p = JSON.parse(JSON.stringify(plan));
    for (const d of p.provenance.doublages) { d.mode = "ite"; d.sys = "bardage"; }
    const c = contributionsDuPlan(p).contributions;
    const b = c.find((x) => x.poste === "fac-isolation-par-l-exterieur-ite-sous-bardage")!;
    expect(b, "aucune ligne d'ITE sous bardage").toBeTruthy();
    expect(c.some((x) => x.poste === "fac-isolation-par-l-exterieur-ite")).toBe(false);
    expect(b.sources.length).toBeGreaterThan(0);
  });
  it("un doublage DÉJÀ EN PLACE ne se facture pas (D1)", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const dejaLa = { mur: "m99", mode: "iti", mat: "gv", etat: "existant", m2: 12.5 };
    p.provenance.doublages = [...p.provenance.doublages, dejaLa];
    const { contributions: c } = contributionsDuPlan(p);
    const l = c.find((x) => x.poste === "iso-isolation-des-murs-par-l-interieur")!;
    expect(l.quantite).toBeCloseTo(20, 1);       // et non 32,5
    expect(l.sources).not.toContain("m99");
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
  /* Contrat 1.14 (D37) : « Parquet » sur un parquet est un parquet NEUF — le plan dit
     `poncage: false`. Avant, la table en déduisait un ponçage alors que le plan émettait aussi la
     dépose : l'arrachage ET le ponçage du même parquet. */
  it("un parquet neuf choisi sur un parquet existant : dépose de l'ancien, pose du neuf", () => {
    expect(q("rev-parquet-bois")).toBeCloseTo(22.8, 1);
    expect(q("rev-poncage-vitrification-parquet")).toBe(0);
    expect(contributions.find((x) => x.poste === "rev-parquet-bois")!.deduction).toBeUndefined();
  });
  it("le ponçage CHOISI : une seule couche, sans dépose, et ce n'est pas une déduction", () => {
    const p = { sols: [{ id: "p9", piece: "Séjour", surface: 20, existant: "Parquet", revetement: "Parquet", poncage: true, depose: false }] } as PlanPourCorrespondance;
    const { contributions: c } = contributionsDuPlan(p);
    expect(c.map((x) => x.poste)).toEqual(["rev-poncage-vitrification-parquet"]);
    expect(c[0].quantite).toBe(20);
    expect(c[0].deduction).toBeUndefined();
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
  /* Contrat 1.16 (D47) : un stratifié posé SUR l'ancien carrelage — pas de dépose, et la ligne le dit. */
  it("un revêtement posé sur l'ancien sol : aucune dépose, et la raison le dit", () => {
    const p = { sols: [{ id: "p9", piece: "Séjour", surface: 18.2, existant: "Carrelage", revetement: "Stratifié", depose: false, surExistant: true }] } as PlanPourCorrespondance;
    const { contributions: c } = contributionsDuPlan(p);
    expect(c.map((x) => x.poste)).toEqual(["rev-sol-stratifie-imitation-bois"]);
    expect(c[0].quantite).toBeCloseTo(18.2, 1);
    expect(c[0].raison).toMatch(/posé sur l'ancien sol/);
  });
});

describe("table de correspondance · les surfaces mesurées (D10)", () => {
  it("la faïence à mi-hauteur : 1,20 m partout, 2,00 m contre la douche et la baignoire", () => {
    /* D46 : le périmètre se mesure au pied des murs (face intérieure, doublage déduit), plus à
       l'axe : 2,865 × 4,68 m → 15,09 m (16 m à l'axe). Receveur 1,2×0,8 et baignoire 1,7×0,75
       adossés → 4,45 m à 2 m. */
    const sdb = (plan.detailNiveaux ?? []).flatMap((n) => n.rooms ?? []).find((r) => r.type === "sdb")!;
    expect(sdb.perimeter).toBeCloseTo(15.09, 2);
    const attendu = (15.09 - 4.45) * 1.2 + 4.45 * 2;
    expect(q("rev-faience-carrelage-mural")).toBeCloseTo(attendu, 1);
  });
  /* D46 (contrat 1.15) : refaire la faïence d'une salle de bain n'est pas remplacer ses cloisons.
     Seule une cloison À CRÉER qui borde la pièce humide se monte en plaques hydrofuges — et ce poste
     remplace « Monter une cloison », il ne s'y ajoute pas. Le refend de la scène existe : rien. */
  it("une cloison existante de la pièce humide n'est pas facturée en hydrofuge", () => {
    expect(q("clo-cloison-piece-humide-hydrofuge")).toBe(0);
  });
  it("une cloison à créer qui borde la pièce humide : le poste hydrofuge À LA PLACE de « Monter une cloison »", () => {
    const p = JSON.parse(JSON.stringify(plan)) as PlanPourCorrespondance;
    const refend = p.provenance!.murs!.find((m) => m.type === "cloison" && m.etat === "existant")!;
    refend.etat = "creer"; refend.hydrofuge = true;
    const c = contributionsDuPlan(p).contributions;
    const h = c.find((x) => x.poste === "clo-cloison-piece-humide-hydrofuge")!;
    expect(h.quantite).toBeCloseTo(refend.m2, 2);
    expect(h.sources).toEqual([refend.id]);
    expect(c.find((x) => x.poste === "clo-monter-une-cloison")).toBeUndefined();
    refend.hydrofuge = false;
    const c2 = contributionsDuPlan(p).contributions;
    expect(c2.find((x) => x.poste === "clo-monter-une-cloison")?.quantite).toBeCloseTo(refend.m2, 2);
    expect(c2.find((x) => x.poste === "clo-cloison-piece-humide-hydrofuge")).toBeUndefined();
  });
  it("un contrat antérieur à 1.15 (sans `hydrofuge`) garde la lecture par pièce, et la signale", () => {
    const p = JSON.parse(JSON.stringify(plan)) as PlanPourCorrespondance;
    for (const m of p.provenance!.murs!) delete m.hydrofuge;
    const l = contributionsDuPlan(p).contributions.find((x) => x.poste === "clo-cloison-piece-humide-hydrofuge")!;
    expect(l.quantite).toBeCloseTo(12.5, 1);
    expect(l.deduction).toMatch(/antérieur à 1\.15/);
  });
  it("« zone de douche » sans douche ni baignoire : 0 m², donc ni faïence ni hydrofuge", () => {
    const p = JSON.parse(JSON.stringify(plan)) as PlanPourCorrespondance;
    for (const m of p.provenance!.murs!) delete m.hydrofuge;
    const sdb = (p.detailNiveaux ?? []).flatMap((n) => n.rooms ?? []).find((r) => r.type === "sdb")!;
    sdb.faience = "douche";
    for (const n of p.detailNiveaux ?? []) n.equipements = (n.equipements ?? []).filter((e) => e.piece !== sdb.id);
    const c = contributionsDuPlan(p).contributions;
    expect(c.filter((x) => x.sources.includes(sdb.id) && /faience|hydrofuge/.test(x.poste))).toEqual([]);
  });
  it("D45 · une salle de bain sans hauteur de faïence choisie : ni faïence ni cloison hydrofuge", () => {
    const sans = JSON.parse(JSON.stringify(plan)) as PlanPourCorrespondance;
    const sdb = (sans.detailNiveaux ?? []).flatMap((n) => n.rooms ?? []).find((r) => r.type === "sdb")!;
    expect(sdb.faience).toBe("mi");
    sdb.faience = null;
    const c = contributionsDuPlan(sans).contributions;
    const de = (id: string) => c.filter((x) => x.poste === id && x.sources.includes(sdb.id));
    expect(de("rev-faience-carrelage-mural")).toEqual([]);
    expect(de("clo-cloison-piece-humide-hydrofuge")).toEqual([]);
  });
  it("la chambre n'est pas carrelée : aucune faïence n'est déclenchée par une pièce sèche", () => {
    const c = contributions.find((x) => x.poste === "rev-faience-carrelage-mural")!;
    expect(c.sources).toEqual(["p1"]);
  });
  it("les plinthes viennent du périmètre réel, pas d'une racine carrée", () => {
    /* D36 : seulement là où un sol neuf est posé, et pas sous une faïence qui descend au sol.
       D46 : au pied des murs, plus à l'axe. La chambre (parquet neuf) : 4,865 × 4,68 m, soit
       19,09 m moins la porte de 0,83 m → 18,26 ml (19,17 à l'axe). La salle de bain est faïencée à
       mi-hauteur, et la pièce de l'étage n'a aucun sol décidé : pas de plinthes neuves. */
    expect(q("rev-plinthes")).toBeCloseTo(18.26, 1);
  });
});

describe("table de correspondance · la toiture", () => {
  it("une toiture refaite entièrement dépose puis repose, sur la surface mesurée", () => {
    /* La scène de référence a un étage de 4 × 4 sur un rez-de-chaussée de 8 × 5 : la toiture
       compte DEUX parties — celle de l'étage (26,6 m²) et celle qui couvre les 25 m² du rez
       laissés à découvert (32,3 m²). Elle ne comptait que la première : plus de la moitié du
       toit n'était chiffrée nulle part. Ces deux valeurs sont exactement les aires des zones
       que l'éditeur surligne — un contrôle de la maquette compare les deux. */
    expect(q("toi-depose-complete-de-toiture-couverture-charpent")).toBeCloseTo(58.9, 1);
    expect(q("toi-toiture-complete-tuile-charpente-couverture")).toBeCloseTo(58.9, 1);
    expect(q("toi-charpente-traditionnelle-hors-couverture")).toBe(0); // comprise dans le poste complet
  });
  it("l'isolation des combles perdus se compte à l'emprise, pas à la surface de toit", () => {
    /* l'emprise sous toiture, elle aussi, couvre les deux parties : 17,6 + 25,0 */
    expect(q("iso-isolation-des-combles-perdus-soufflage")).toBeCloseTo(42.6, 1);
  });
  it("gouttières et raccords suivent les linéaires mesurés", () => {
    expect(q("toi-gouttieres-descentes")).toBeGreaterThan(5);
    expect(q("toi-raccords-faitage-noues-solins")).toBeGreaterThan(2);
  });
  it("les fenêtres de toit du panneau comptent quand aucune n'est dessinée (D15)", () => {
    expect(q("toi-fenetre-de-toit-velux")).toBe(2);
  });
  /* D46 (contrat 1.15) : l'avancée de toit est dehors, on ne l'isole pas. Les rampants se comptent
     sous la pente, SANS le débord (49,2 m² ici) ; la couverture garde la surface débord compris. */
  it("l'isolation des rampants se compte sans le débord de toit", () => {
    const p = JSON.parse(JSON.stringify(plan)) as PlanPourCorrespondance;
    expect(p.toiture!.surfaceRampants).toBeCloseTo(49.2, 1);
    expect(p.toiture!.surfaceRampants!).toBeLessThan(p.toiture!.surface!);
    p.toiture!.projet!.isoCombles = "rampants";
    const l = contributionsDuPlan(p).contributions.find((x) => x.poste === "iso-isolation-des-combles-amenages-rampants")!;
    expect(l.quantite).toBeCloseTo(49.2, 1);
    delete p.toiture!.surfaceRampants;   /* contrat antérieur : il n'a que la surface débord compris */
    expect(contributionsDuPlan(p).contributions.find((x) => x.poste === "iso-isolation-des-combles-amenages-rampants")!.quantite).toBeCloseTo(58.9, 1);
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
  it("un contrat antérieur à 1.14 (sans `poncage`) garde la déduction D8, et la signale", () => {
    const p = { sols: [{ id: "p9", surface: 22.8, existant: "Parquet ancien", revetement: "Parquet", depose: true }] } as PlanPourCorrespondance;
    const c = contributionsDuPlan(p).contributions.find((x) => x.poste === "rev-poncage-vitrification-parquet")!;
    expect(c.deduction).toContain("Parquet ancien");
    expect(c.deduction).toContain("change cette ligne");
  });
  it("un mur porteur démoli sans réponse à « porteur ? » est signalé comme à faire vérifier", () => {
    const c = contributions.find((x) => x.poste === "dem-abattre-un-mur-porteur")!;
    expect(c.deduction).toMatch(/vérifier par un pro/);
    const dit = JSON.parse(JSON.stringify(plan));
    for (const m of dit.provenance.murs) m.porteurAVerifier = false;
    expect(contributionsDuPlan(dit).contributions.find((x) => x.poste === "dem-abattre-un-mur-porteur")!.deduction).toBeUndefined();
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
  /* D21 : on ne facture rien tant que le plancher n'est pas décidé SUR LE PLAN. Cocher « étage
     créé » ne suffit plus — personne ne fabrique le choix à la place de l'utilisateur (contrat
     1.3). Mais ne rien facturer n'est pas se taire : l'ouvrage le plus cher de l'opération
     remonte à l'écran de validation avec le geste qui le règle. */
  it("un étage créé dont les pièces ne se prononcent pas ne facture AUCUN plancher", () => {
    expect(q("toi-creer-un-plancher-bois")).toBe(0);
    expect(q("mac-plancher-beton-etage-cree")).toBe(0);
  });
  it("… mais il le dit, en désignant les pièces à régler", () => {
    const i = ignores.find((x) => /plancher de/.test(x.quoi))!;
    expect(i, "aucun signalement pour le plancher non décidé").toBeTruthy();
    expect(i.quoi).toContain("14.44 m²");
    expect(i.pourquoi).toContain("Pas de plancher");
    expect(i.sources).toEqual(plan.detailNiveaux![1].rooms!.map((r) => r.id));
  });
  it("le rez-de-chaussée n'est pas un étage créé : il ne signale aucun plancher", () => {
    const rdc = plan.detailNiveaux![0].rooms!.map((r) => r.id);
    for (const i of ignores.filter((x) => /plancher de/.test(x.quoi)))
      expect(i.sources.some((s) => rdc.includes(s))).toBe(false);
  });
  /* Deux règles posent un plancher : celle du NIVEAU (« étage créé ») et celle de la PIÈCE
     (« pas de plancher », contrat 1.8). Cocher « étage créé » sur un étage déjà dessiné passe
     justement ses pièces en « pas de plancher » — les deux se déclenchaient ensemble et le
     plancher sortait en double. Le jour où l'une des deux bouge, c'est ici que ça casse. */
  it("un étage créé DONT les pièces déclarent leur plancher ne le compte qu'une fois", () => {
    const p = JSON.parse(JSON.stringify(plan));
    const etage = p.detailNiveaux[1];
    for (const r of etage.rooms) r.plancherACreer = "bois";
    const { contributions: c } = contributionsDuPlan(p);
    const lignes = c.filter((x) => /plancher/.test(x.poste));
    expect(lignes).toHaveLength(1);
    expect(lignes[0].quantite).toBeCloseTo(14.44, 1);
    expect(lignes[0].sources).toEqual(etage.rooms.map((r: { id: string }) => r.id));
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

describe("table de correspondance · le plancher à créer, pièce par pièce (contrat 1.8)", () => {
  const piece = (r: Record<string, unknown>) => ({ detailNiveaux: [{ id: "n1", rooms: [{ id: "p1", type: "sejour", area: 32.24, ...r }] }] }) as unknown as PlanPourCorrespondance;
  const q2 = (p: PlanPourCorrespondance, id: string) => contributionsDuPlan(p).contributions.find((c) => c.poste === id)?.quantite ?? 0;

  it("une pièce qui a déjà un plancher n'en produit aucun", () => {
    expect(contributionsDuPlan(piece({})).contributions.some((c) => /plancher/.test(c.poste))).toBe(false);
  });

  it("un volume ouvert planché en bois alimente « Créer un plancher bois », sur SA surface", () => {
    const p = piece({ plancherACreer: "bois" });
    expect(q2(p, "toi-creer-un-plancher-bois")).toBe(32.24);
    expect(contributionsDuPlan(p).contributions.find((c) => c.poste === "toi-creer-un-plancher-bois")?.sources).toEqual(["p1"]);
  });

  it("en béton, c'est l'autre poste — ce ne sont pas les mêmes prix", () => {
    expect(q2(piece({ plancherACreer: "beton" }), "mac-plancher-beton-etage-cree")).toBe(32.24);
  });

  it("deux pièces planchées du même matériau se cumulent", () => {
    const p = { detailNiveaux: [{ id: "n1", rooms: [
      { id: "p1", type: "sejour", area: 20, plancherACreer: "bois" },
      { id: "p2", type: "chambre", area: 12, plancherACreer: "bois" },
    ] }] } as unknown as PlanPourCorrespondance;
    expect(q2(p, "toi-creer-un-plancher-bois")).toBe(32);
  });

  it("une mezzanine ne plancher qu'une partie du volume : l'autre pièce ne compte pas", () => {
    const p = { detailNiveaux: [{ id: "n1", rooms: [
      { id: "p1", type: "mezzanine", area: 14, plancherACreer: "bois" },
      { id: "p2", type: "sejour", area: 30 },
    ] }] } as unknown as PlanPourCorrespondance;
    expect(q2(p, "toi-creer-un-plancher-bois")).toBe(14);
  });

  it("sans surface, rien n'est inventé : le plancher part dans les ignorés", () => {
    const { contributions, ignores } = contributionsDuPlan(piece({ plancherACreer: "bois", area: 0 }));
    expect(contributions.some((c) => /plancher/.test(c.poste))).toBe(false);
    expect(ignores.some((i) => /plancher/.test(i.quoi) && i.sources.includes("p1"))).toBe(true);
  });

  it("les murs ne suivent pas le plancher : ils ont leurs propres états", () => {
    /* un plancher posé dans un volume de grande hauteur trouve des murs déjà debout */
    const p = { detailNiveaux: [{ id: "n1", rooms: [{ id: "p1", type: "sejour", area: 30, plancherACreer: "bois" }] }],
      provenance: { murs: [{ id: "m1", niveau: "n1", type: "mur", porteur: false, etat: "existant", ml: 6, m2: 15 }] } } as unknown as PlanPourCorrespondance;
    const { contributions } = contributionsDuPlan(p);
    expect(contributions.some((c) => /plancher/.test(c.poste))).toBe(true);
    expect(contributions.some((c) => /monter-un-mur|monter-une-cloison/.test(c.poste))).toBe(false);
  });
});

describe("table de correspondance · une toiture en deux parties (contrat 1.9)", () => {
  /* 90 m² au sol, 60 à l'étage : la partie basse couvre le reste, et elle compte. */
  const toit = (surface: number, parties?: unknown[]) =>
    ({ toiture: { surface, couverture: "tuile", parties, projet: { action: "refection" } } }) as unknown as PlanPourCorrespondance;

  it("les postes se chiffrent sur la surface TOTALE, parties comprises", () => {
    const q1 = contributionsDuPlan(toit(84.3)).contributions.find((c) => /refection|couverture/.test(c.poste))?.quantite ?? 0;
    const q2 = contributionsDuPlan(toit(134.1)).contributions.find((c) => /refection|couverture/.test(c.poste))?.quantite ?? 0;
    expect(q1).toBe(84.3);
    expect(q2).toBe(134.1);          /* les 50 m² de toiture basse ne sont plus perdus */
  });

  it("le détail par partie voyage sans changer le chiffrage", () => {
    const parties = [
      { niveau: "R+1", principale: true, forme: "deuxpans", pente: 30, surface: 84.3 },
      { niveau: "RDC", principale: false, forme: "mono", pente: 30, surface: 49.8 },
    ];
    const avec = contributionsDuPlan(toit(134.1, parties)).contributions;
    const sans = contributionsDuPlan(toit(134.1)).contributions;
    expect(avec.map((c) => [c.poste, c.quantite])).toEqual(sans.map((c) => [c.poste, c.quantite]));
  });
});

describe("table de correspondance · la peinture, pièce par pièce (contrat 1.14)", () => {
  /* D37 : la peinture n'est jamais un défaut. La chambre de la scène est repeinte, murs et
     plafond ; la salle de bain ne l'est pas, et ne doit rien produire. */
  it("la peinture choisie devient des m² mesurés, sur SA pièce", () => {
    const ch = plan.detailNiveaux![0].rooms!.find((r) => r.type === "chambre")!;
    expect(ch.peinture?.murs).toBeGreaterThan(20);
    expect(q("pei-peinture-des-murs")).toBeCloseTo(ch.peinture!.murs!, 2);
    expect(q("pei-peinture-des-plafonds")).toBeCloseTo(ch.peinture!.plafond!, 2);
    expect(contributions.find((x) => x.poste === "pei-peinture-des-murs")!.sources).toEqual([ch.id]);
  });
  it("une pièce sans peinture choisie ne produit aucune ligne de peinture", () => {
    const sdb = plan.detailNiveaux![0].rooms!.find((r) => r.type === "sdb")!;
    expect(sdb.peinture).toBeNull();
    const src = contributions.filter((x) => /^pei-/.test(x.poste)).flatMap((x) => x.sources);
    expect(src).not.toContain(sdb.id);
  });
  it("plafond seul : aucune ligne de murs", () => {
    const p = { detailNiveaux: [{ id: "n1", rooms: [{ id: "p1", type: "sejour", peinture: { murs: 0, plafond: 18.5 } }] }] } as unknown as PlanPourCorrespondance;
    const { contributions: c } = contributionsDuPlan(p);
    expect(c.map((x) => [x.poste, x.quantite])).toEqual([["pei-peinture-des-plafonds", 18.5]]);
  });
});

describe("table de correspondance · l'étude de structure (contrat 1.14)", () => {
  it("une poutre créée sans mur porteur démoli déclenche aussi l'étude, et dit pourquoi", () => {
    const p = { etudes: { structure: 1, mlPorteurDemoli: 0, ossatureCreee: 1 } } as PlanPourCorrespondance;
    const c = contributionsDuPlan(p).contributions.find((x) => x.poste === "etu-etude-de-structure")!;
    expect(c.quantite).toBe(1);
    expect(c.raison).toMatch(/poutre ou un poteau/);
  });
});

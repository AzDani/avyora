/**
 * Fiche, liste, PDF, langue, admin, e-mails (chantier N14 de la revue rénovation / neuf).
 *
 * - la nature (« Rénovation » / « Construction neuve ») et le mode (« Rapide » / « Détaillée ») sont
 *   visibles sur la fiche, dans la liste des projets et dans l'admin, qui affiche le bon résultat ;
 * - la fiche et le rapport PDF n'ont plus de chaîne en dur : en anglais, aucun mot français, les
 *   nombres au format américain ; en français, au tutoiement, les quantités à la virgule ;
 * - l'anglais est américain partout (dictionnaires, catalogue, questionnaire du neuf) ;
 * - le bouton de TVA de la rénovation ne dit plus « Neuf » ; l'onboarding a les étapes du neuf ;
 *   le pied des e-mails et /bienvenue-pro ne parlent plus seulement de rénovation ;
 * - le lot Façade du neuf suit l'ordre de la rénovation, et le sous-titre d'étape « Second œuvre »
 *   ne se confond plus avec la grande phase du même nom.
 *
 * Aucun prix ne bouge : seuls des textes et des formats changent (T1, T5, T6 à 0 écart).
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG, PHASES, modeProjet, natureProjet, presetNeuf, presetRapide, type Ctx, type Selection, type CustomLine } from "@/lib/estimateur";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimationResultat from "@/components/EstimationResultat";
import PastillesProjet from "@/components/PastillesProjet";
import { ListeNeuf, type ActionsListeNeuf } from "@/components/neuf/ListeNeuf";
import { GRANDES_PHASES_NEUF, sousTitreEtapeNeuf, elementsLotNeuf } from "@/lib/estimateur/liste-neuf";
import { ctxDetailNeuf, etatParDefaut } from "@/lib/estimateur/detaille-neuf";
import { buildDevis, catalogueDe } from "@/lib/estimateur";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { dictNeufCommun, libelleTypeBien } from "@/lib/i18n/neuf-commun";
import { dictDetail } from "@/lib/i18n/detail";
import { dictRapport } from "@/lib/i18n/rapport";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictPlans } from "@/lib/i18n/plans";
import { euros, nombre, pourcent } from "@/lib/i18n/nombres";
import { L_MATURITE } from "@/lib/data/admin";

vi.mock("server-only", () => ({}));
const LOCALE = vi.hoisted(() => ({ v: "fr" as "fr" | "en" }));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => LOCALE.v }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => { throw new Error("aucune base en test"); } }));
vi.mock("@/lib/auth", () => ({ estAdmin: () => false, getUser: async () => null, estPro: () => false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const rendre = (el: ReactElement, locale: "fr" | "en" = "fr") => renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
const texte = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, "\"").replace(/[\s  ]+/g, " ");
const src = (p: string) => fs.readFileSync(p, "utf8");

/* Une rénovation (hauteur 2,5 m, une ligne perso, des fenêtres en variante) et une construction neuve de référence. */
const reno = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "eco", qui: "pros" });
const neuf = presetNeuf({ surface: 120, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
const PERSO: CustomLine[] = [{ id: "p1", lot: "Peinture", nom: "Fresque", prix: 1000, unite: "m²", qte: 12.5, tva: 10, on: true }];
const rep = (p: { ctx: Ctx; sel: Selection }, mode: "rapide" | "detaille", custom: CustomLine[] = []) =>
  ({ v: "estimateur", mode, ctx: p.ctx, sel: p.sel, codePostal: "45000", custom });

/** Des mots qu'un écran anglais ne doit jamais montrer (le nom d'un projet mis à part). */
const FRANCAIS = /\b(TTC|HT|Rénovation|Travaux|travaux|Maison|pièces?|niveaux?|Matériaux|Main-d|vous|tu |ton |tes |Où part|Qui fait quoi|Détail|Provision|aléas|finition|Estimation|Montant|Désignation|Poids|habitables|corps d'état|Lignes personnalisées)\b/;

describe("N14 · nature et mode d'un projet", () => {
  it("modeProjet : « rapide » seulement s'il est écrit, sinon détaillé ; natureProjet inchangée", () => {
    expect(modeProjet(rep(reno, "rapide"))).toBe("rapide");
    expect(modeProjet(rep(reno, "detaille"))).toBe("detaille");
    expect(modeProjet({ v: "estimateur", ctx: reno.ctx })).toBe("detaille");
    expect(modeProjet(null)).toBe("detaille");
    expect(natureProjet(rep(neuf, "rapide"))).toBe("neuf");
  });

  it("les pastilles disent la nature et le mode, en français et en anglais", () => {
    const t = (nature: "reno" | "neuf", mode: "rapide" | "detaille", locale: "fr" | "en") =>
      texte(renderToStaticMarkup(createElement(PastillesProjet, { nature, mode, locale }))).trim();
    expect(t("reno", "rapide", "fr")).toBe("Rénovation Rapide");
    expect(t("neuf", "detaille", "fr")).toBe("Construction neuve Détaillée");
    expect(t("reno", "detaille", "en")).toBe("Renovation Detailed");
    expect(t("neuf", "rapide", "en")).toBe("New build Quick");
  });

  it("le type de bien enregistré (en français) se lit dans la langue de la page", () => {
    expect(libelleTypeBien("en", "Maison")).toBe("House");
    expect(libelleTypeBien("en", "appartement")).toBe("Apartment");
    expect(libelleTypeBien("fr", "Maison")).toBe("Maison");
    expect(libelleTypeBien("en", "Péniche")).toBe("Péniche");
  });

  it("fiche et liste affichent les pastilles ; la liste reçoit le mode", () => {
    expect(src("app/projets/[id]/page.tsx")).toContain("<PastillesProjet nature={neuf ? \"neuf\" : \"reno\"} mode={isRapide ? \"rapide\" : \"detaille\"}");
    expect(src("components/ListeProjets.tsx")).toContain("<PastillesProjet");
    expect(src("app/projets/page.tsx")).toContain("mode: modeProjet(p.reponses)");
  });

  it("admin : colonnes Nature et Mode, et la fiche admin affiche le résultat du bon mode, en lecture seule", () => {
    const liste = src("app/admin/projets/page.tsx");
    expect(liste).toMatch(/\["Projet", "Propriétaire", "Nature", "Mode",/);
    expect(liste).toContain("colSpan={10}");
    const fiche = src("app/admin/projets/[id]/page.tsx");
    expect(fiche).toContain("<ResultatRapideNeuf reponses={reponses} projectId={projet.id} isPro readOnly />");
    expect(fiche).toContain("<ResultatRapide reponses={reponses} projectId={projet.id} isPro readOnly />");
    expect(fiche).toContain("<EstimationResultat reponses={reponses} projectId={projet.id} readOnly />");
    // en lecture seule, les résultats rapides n'ont pas les boutons vers les écrans du particulier
    for (const f of ["components/ResultatRapide.tsx", "components/neuf/ResultatRapideNeuf.tsx"]) expect(src(f)).toContain("{!readOnly && (");
  });
});

describe("N14 · fiche : plus de chaîne en dur, nombres dans la langue de la page", () => {
  const fiche = (p: { ctx: Ctx; sel: Selection }, locale: "fr" | "en", custom: CustomLine[] = []) =>
    texte(rendre(createElement(EstimationResultat, { reponses: rep(p, "detaille", custom), projectId: "x" }), locale));

  it("anglais : TVA, aléas, finition, zone, hauteur et montants en anglais américain", () => {
    const t = fiche({ ...reno, ctx: { ...reno.ctx, hauteur: 2.5 } }, "en", PERSO);
    expect(t).toMatch(/VAT \((\d+(\.\d)?% · )*\d+(\.\d)?%\)/);
    expect(t).toContain(`Contingency ${reno.ctx.aleas}%`);
    expect(t).toContain("Economy");                        // et non « eco »
    expect(t).toContain("ceiling 2.5 m");
    expect(t).toMatch(/\d{1,3},\d{3} €/);                  // « 101,077 € »
    expect(t).not.toMatch(/\d \d{3} €/);                   // jamais « 101 077 € » en anglais
    expect(t).not.toMatch(FRANCAIS);
  });

  it("français : virgule décimale, tutoiement, le format d'avant pour les montants", () => {
    const t = fiche({ ...reno, ctx: { ...reno.ctx, hauteur: 2.5 } }, "fr");
    expect(t).toContain("plafond 2,5 m");
    expect(t).toContain("Éco");
    expect(t).toMatch(/\d{1,3} \d{3} €/);
    expect(t).not.toMatch(/\bvous\b|\bvos\b/);
  });

  it("une ligne en variante se lit en anglais en rénovation aussi (« Windows (PVC, double-pane) »)", () => {
    const sel = { ...reno.sel, "Menuiseries exterieures|Fenêtres": { on: true, qty: 6, mat: "pvc" as const, vit: "double" as const } };
    const t = fiche({ ctx: reno.ctx, sel }, "en");
    expect(t).toContain("Windows (PVC, double-pane)");
    expect(t).not.toContain("Fenêtres");
  });

  it("les quantités du suivi : « 12,5 » en français, « 12.5 » en anglais", () => {
    const sel = { ...reno.sel, "Peinture|Peinture des murs": { on: true, qty: 12.5, manual: true } };
    expect(fiche({ ctx: reno.ctx, sel }, "fr")).toContain("12,5 m²");
    expect(fiche({ ctx: reno.ctx, sel }, "en")).toContain("12.5 m²");
  });

  it("le format : montants, nombres et pourcentages", () => {
    expect(euros("fr", 101077.4).replace(/ /g, " ")).toBe("101 077 €");
    expect(euros("en", 101077.4)).toBe("101,077 €");
    expect(nombre("fr", 130.78, 2)).toBe("130,78");
    expect(nombre("en", 130.78, 2)).toBe("130.78");
    expect(pourcent("fr", 5.5)).toBe("5,5 %");
    expect(pourcent("en", 5.5)).toBe("5.5%");
    expect(dictDetail("fr").devis.qte(130.78, "m²", false)).toBe("130,78 m²");
    expect(dictDetail("en").devis.qte(130.78, "m²", false)).toBe("130.78 m²");
  });
});

describe("N14 · rapport PDF : un dictionnaire FR/EN, au tutoiement", () => {
  const rapport = async (p: { ctx: Ctx; sel: Selection }, locale: "fr" | "en", custom: CustomLine[] = []) => {
    LOCALE.v = locale;
    const { RapportPDF } = await import("@/components/RapportPDF");
    const el = await RapportPDF({ reponses: rep(p, "detaille", custom) as never, nom: "Projet", refCode: "AVY-TEST" });
    LOCALE.v = "fr";
    return texte(renderToStaticMarkup(el!));
  };

  it("rénovation et neuf en anglais : aucun mot français, montants américains", async () => {
    for (const p of [reno, neuf]) {
      const t = (await rapport(p, "en", PERSO)).replace("Projet", "");
      expect(t).toContain("Estimate report");
      expect(t).toContain("Who does what");
      expect(t).toMatch(/\d{1,3},\d{3} €/);
      expect(t).not.toMatch(FRANCAIS);
      expect(t).toContain("12.5 m² × 1,000 € · Painting");   // la ligne perso, lot traduit
    }
  });

  it("en français : « toi », plus jamais « vous »", async () => {
    const t = await rapport(reno, "fr", PERSO);
    expect(t).toContain("Matériaux (toi)");
    expect(t).toContain("Tu réalises");
    expect(t).toContain("Ajoutées par toi");
    expect(t).toContain("12,5 m² × 1 000 € · Peinture".replace(" 000", " 000").replace(/ /g, " "));
    expect(t).not.toMatch(/\bvous\b|\bvos\b|\bVous\b|\bVos\b/);
  });

  it("le dictionnaire du rapport a les mêmes clés dans les deux langues", () => {
    expect(Object.keys(dictRapport("en")).sort()).toEqual(Object.keys(dictRapport("fr")).sort());
  });
});

describe("N14 · anglais américain partout", () => {
  /* Les britannismes relevés par la revue et le chantier (« postcode », « storey », « aluminium »,
     « breeze-block »…). Le lien d'accessibilité « Skip to content » n'est pas une benne. */
  const BRITISH = /\b(aluminium|breeze-block|storey|storeys|postcode|labour|colour|vapour|plasterboard|skirting|worktop|splashback|flat-pack|mains|cancelled|standardised|lofts?|town hall|bailiff|snagging|First fix|Micro treatment plant|underfloor heating|glazing|Earthworks|joinery|ticked|unticked?|ticks|fitted kitchen|downpipes?|soakaway|chartered|draftsman|mini-digger|hardcore|levy|levies|French windows?|towel radiator|underlay)\b/i;
  const chaines = (o: unknown, out: string[] = []): string[] => {
    if (typeof o === "string") out.push(o);
    else if (typeof o === "function") out.push(o.toString());
    else if (o && typeof o === "object") for (const v of Object.values(o)) chaines(v, out);
    return out;
  };

  it("dictionnaires anglais : aucun britannisme", () => {
    const tous = [dict("en"), dictDetail("en"), dictNeuf("en"), dictNeufCommun("en"), dictPlans("en"), dictRapport("en")];
    const fautes = chaines(tous).filter((s) => BRITISH.test(s) && !/Skip to content/.test(s));
    expect(fautes).toEqual([]);
  });

  it("catalogue anglais, questionnaire et étapes du neuf : aucun britannisme", () => {
    const valeurs = [...src("lib/estimateur/catalog-i18n.ts").matchAll(/"(?:[^"\\]|\\.)*"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    expect(valeurs.length).toBeGreaterThan(500);
    const en = ["lib/estimateur/questions-neuf.ts", "lib/estimateur/etapes-neuf.ts", "lib/estimateur/liste-neuf.ts"]
      .flatMap((f) => [...src(f).matchAll(/\ben:\s*"((?:[^"\\]|\\.)*)"/g), ...src(f).matchAll(/alt\("[^"]+",\s*"[^"]*",\s*"([^"]*)"\)/g)].map((m) => m[1]));
    expect(en.length).toBeGreaterThan(100);
    expect([...valeurs, ...en].filter((v) => BRITISH.test(v))).toEqual([]);
  });

  it("libellé court et libellé complet disent la même chose (aluminum des deux côtés)", () => {
    expect(catT("en", "postes", "Gouttière alu en continu")).toBe("Seamless aluminum gutter");
    expect(catT("en", "postes", "Gouttière aluminium laqué en continu (profilée sur place, sans raccord)")).toContain("aluminum");
  });

  it("/bienvenue-pro et l'encart Pro ne parlent plus de « renovation manager »", () => {
    expect(src("app/bienvenue-pro/page.tsx")).not.toMatch(/renovation manager/i);
    expect(chaines(dict("en")).filter((s) => /renovation manager/i.test(s))).toEqual([]);
    expect(src("app/bienvenue-pro/page.tsx")).toContain("Itemized estimate, 200 line items");
  });
});

describe("N14 · textes de la rénovation et des comptes", () => {
  it("le régime de TVA de la rénovation ne dit plus « Neuf » (qui se lisait comme une construction neuve)", () => {
    for (const l of ["fr", "en"] as const) {
      const b = dictDetail(l).bien;
      expect(b.tvaPro).not.toMatch(/neuf|new/i);
      expect(b.tvaHabitation).not.toMatch(/neuf|new/i);
    }
    expect(dictDetail("fr").bien.tvaPro.replace(/\u00a0/g, " ")).toBe("Moins de 2 ans ou local pro");
  });

  it("onboarding : les étapes d'une construction neuve, chacune avec son libellé admin", () => {
    const f = src("components/OnboardingForm.tsx");
    for (const v of ["terrain_en_vue", "terrain", "permis"]) {
      expect(f.match(new RegExp(`v: "${v}"`, "g"))?.length).toBe(2);   // FR et EN
      expect(L_MATURITE[v]).toBeTruthy();
    }
    for (const v of [...f.matchAll(/v: "([a-z_]+)", l: "[^"]*"(?:, neuf: true)? \}/g)].map((m) => m[1]).filter((v) => /^(renseigne|bien_en_vue|terrain_en_vue|terrain|permis|proprietaire|travaux)$/.test(v)))
      expect(L_MATURITE[v], v).toBeTruthy();
  });

  it("le pied des e-mails parle de rénovation ET de construction neuve", async () => {
    const { emailConfirmation, emailChatel } = await import("@/lib/email");
    for (const m of [emailConfirmation({}), emailChatel({ dateReconduction: "1er janvier" })]) {
      expect(m.html).toContain("en rénovation comme en construction neuve");
      expect(m.html).not.toContain("estimateur de rénovation");
    }
  });
});

describe("N14 · détaillé du neuf : ordre de Façade et sous-titre « Second œuvre »", () => {
  it("les lots communs suivent l'ordre de la rénovation dans chaque grande phase", () => {
    const ordreReno = CATALOG.map((l) => l.c);
    for (const g of GRANDES_PHASES_NEUF) {
      const communs = g.lots.filter((c) => ordreReno.includes(c));
      expect(communs, g.nom).toEqual([...communs].sort((a, b) => ordreReno.indexOf(a) - ordreReno.indexOf(b)));
    }
    const go = GRANDES_PHASES_NEUF.find((g) => g.nom === PHASES[1])!.lots;
    expect(go.indexOf("Façade")).toBe(go.indexOf("Menuiseries exterieures") - 1);
  });

  it("le sous-titre d'étape « Second œuvre » est renommé, la clé d'étape ne change pas", () => {
    const sous = sousTitreEtapeNeuf("Second œuvre")!;
    expect(sous).toEqual({ fr: "Réseaux, cloisons & chapes", en: "Rough-in, partitions & screeds" });
    for (const g of GRANDES_PHASES_NEUF) for (const l of ["fr", "en"] as const) expect(sous[l]).not.toBe(catT(l, "phases", g.nom));
    expect(sousTitreEtapeNeuf("Murs & planchers")).toBeNull();
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    expect(elementsLotNeuf(ctx, e.sel, "Maçonnerie").filter((x) => x.type === "etape").map((x) => (x as { phase: string }).phase))
      .toEqual(["Fondations & plancher bas", "Murs & planchers", "Second œuvre"]);
    const RIEN = () => {};
    const ACTIONS: ActionsListeNeuf = { maj: RIEN, cocher: RIEN, auto: RIEN, choisir: RIEN, ajouterPerso: RIEN, majPerso: RIEN, supprimerPerso: RIEN };
    const OUTILS = { seulement: false, onSeulement: RIEN, texteSeulement: "x", toutOuvert: false, onTout: RIEN, texteDeplier: "x", texteReplier: "y" };
    const dv = buildDevis(catalogueDe(ctx), ctx, e.sel);
    for (const l of ["fr", "en"] as const) {
      const html = rendre(createElement(ListeNeuf, {
        ctx, sel: e.sel, maison: e.maison, htParCle: new Map(dv.lignes.map((li) => [li.cle, li.ht])), open: { "Maçonnerie": true }, onBascule: RIEN,
        seulementCoches: false, actions: ACTIONS, custom: [], outils: OUTILS,
      }), l);
      const etapes = [...html.matchAll(/<div class="setape">([^<]*)/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      expect(etapes).toContain(sous[l]);
      expect(etapes).not.toContain(catT(l, "phases", "Second œuvre"));
    }
  });
});

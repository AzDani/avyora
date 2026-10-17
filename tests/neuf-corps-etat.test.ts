/**
 * Chantier N10 de la revue rénovation / neuf (§5 « Présentation des postes », §6 N10 ; décision D1 de Dani) :
 * les postes du détaillé neuf rangés par CORPS D'ÉTAT, comme la rénovation.
 *
 * - 4 grandes phases (celles de la rénovation, la dernière dit aussi la réception), chaque lot UNE fois :
 *   28 en-têtes à l'ouverture (4 phases, 22 lots, la carte des frais, la liste des démarches) au lieu de
 *   9 phases et 37 blocs ; dans un lot présent à plusieurs étapes du chantier, un sous-titre d'étape ;
 * - une ligne de choix par groupe exclusif et par lot : un clic choisit, décoche l'autre et met la réponse
 *   du questionnaire à jour ; les questions couverture, gouttières et façade sortent du questionnaire ;
 * - au-delà de 150 m² de surface de plancher, le dossier de permis par un dessinateur est désactivé ; une
 *   couverture contraire à la toiture décrite aussi (vérification de N10) ;
 * - les murs : le parpaing (réponse par défaut, hors du groupe car il porte aussi le garage) a son bouton ;
 *   le béton cellulaire 30 cm fait sortir la maison du parpaing (vérification de N10) ;
 * - un ancien projet avec deux alternatives cochées les montre toutes deux, avec un avertissement ;
 * - les démarches gratuites et les frais (taxes, assurance) sortent de la liste et de son compteur.
 * Présentation seule : les clés `key(lot, nom)` ne changent pas, aucun total ne bouge (T1, T5, T6).
 */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import { ListeNeuf, CarteFraisNeuf, type ActionsListeNeuf } from "@/components/neuf/ListeNeuf";
import {
  buildDevis, catalogueDe, key, presetMaison, maisonParDefaut, maisonComplete, geometrieNeuf, PHASES, CATALOG_NEUF, POSTE_NEUF,
  GROUPES_EXCLUSIFS_NEUF, SEUIL_ARCHITECTE_M2, ID_PARPAING, type Selection, type MaisonNeuve,
} from "@/lib/estimateur";
import {
  GRANDES_PHASES_NEUF, LOTS_NEUF, LIGNES_CHOIX_NEUF, POSTES_FRAIS_NEUF, CARTE_FRAIS, CARTE_DEMARCHES, elementsLotNeuf, lotsAffichesNeuf, ouvrablesNeuf,
  postesCochesNeuf, estDemarcheNeuf, estFraisNeuf, alternativeIndisponibleNeuf, alternativeMontreeNeuf, raisonIndisponibleNeuf, type ElementLotNeuf,
  type PosteListeNeuf,
} from "@/lib/estimateur/liste-neuf";
import { ctxDetailNeuf, etatParDefaut, etatDepuisPreset, changerReponseNeuf, choisirNeuf, cocherNeufEtat, type EtatNeuf } from "@/lib/estimateur/detaille-neuf";
import { TOUTES_QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { INFO_PHASES } from "@/lib/estimateur/etapes-neuf";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { dictNeuf } from "@/lib/i18n/neuf";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const poste = (id: string): PosteListeNeuf => {
  const p = POSTE_NEUF.get(id);
  if (!p) throw new Error("poste inconnu : " + id);
  return { l: CATALOG_NEUF.find((l) => l.t.includes(p.t))!, t: p.t };
};
const cle = (id: string) => { const { l, t } = poste(id); return key(l.c, t.n); };
const on = (e: EtatNeuf, id: string) => !!e.sel[cle(id)]?.on;
const ttc = (e: EtatNeuf) => { const ctx = ctxDetailNeuf(e); return buildDevis(catalogueDe(ctx), ctx, e.sel).totaux.ttc; };
const cochees = (sel: Selection) => Object.fromEntries(Object.entries(sel).filter(([, x]) => x?.on));
const lignesDe = (els: ElementLotNeuf[]) => els.filter((e) => e.type === "poste" || e.type === "choix").length;
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const compte = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

const RIEN = () => {};
const ACTIONS: ActionsListeNeuf = { maj: RIEN, cocher: RIEN, auto: RIEN, choisir: RIEN, ajouterPerso: RIEN, majPerso: RIEN, supprimerPerso: RIEN };
const OUTILS = { seulement: false, onSeulement: RIEN, texteSeulement: "x", toutOuvert: false, onTout: RIEN, texteDeplier: "x", texteReplier: "y" };
/** La liste rendue (serveur), les lots demandés ouverts. */
function liste(e: EtatNeuf, open: Record<string, boolean>, locale: "fr" | "en" = "fr", seulementCoches = false) {
  const ctx = ctxDetailNeuf(e);
  const dv = buildDevis(catalogueDe(ctx), ctx, e.sel);
  const props = { ctx, sel: e.sel, maison: e.maison, htParCle: new Map(dv.lignes.map((li) => [li.cle, li.ht])), open, onBascule: RIEN, seulementCoches, actions: ACTIONS };
  const el = createElement("div", null, createElement(CarteFraisNeuf, props), createElement(ListeNeuf, { ...props, custom: [], outils: OUTILS }));
  return renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
}
/** Le contenu d'un lot ouvert dans le HTML : de son en-tête au lot suivant. */
const lotHtml = (html: string, nom: string) => {
  const i = html.indexOf(`<span class="nm">${echapper(nom)}</span>`);
  const suite = html.slice(i + 1).search(/<div class="acc(?: open)?">/);
  return html.slice(i, suite < 0 ? undefined : i + 1 + suite);
};

describe("N10 · 4 grandes phases, chaque lot une fois", () => {
  it("les 24 lots du catalogue neuf, chacun dans une seule grande phase ; les trois premières sont celles de la rénovation", () => {
    const lots = GRANDES_PHASES_NEUF.flatMap((g) => g.lots);
    expect(lots).toHaveLength(24);
    expect(new Set(lots).size).toBe(24);
    expect([...lots].sort()).toEqual([...new Set(CATALOG_NEUF.map((l) => l.c))].sort());
    expect(LOTS_NEUF.map((x) => x.c).sort()).toEqual([...lots].sort());
    expect(GRANDES_PHASES_NEUF.map((g) => g.nom)).toEqual([...PHASES.slice(0, 3), "Équipements & réception"]);
    for (const g of GRANDES_PHASES_NEUF) expect(catT("en", "phases", g.nom), g.nom).not.toBe(g.nom);
  });

  it("les clés des postes ne changent pas : la liste reprend chaque poste du catalogue une fois, dans son bloc", () => {
    const parLot = LOTS_NEUF.flatMap((x) => x.postes.map(({ l, t }) => { expect(l.c).toBe(x.c); return key(l.c, t.n); }));
    const catalogue = CATALOG_NEUF.flatMap((l) => l.t.map((t) => key(l.c, t.n)));
    expect(parLot.sort()).toEqual(catalogue.sort());
  });

  it("à l'ouverture : 22 lots affichés (les frais et l'assurance passent dans leur carte) + la carte des frais et la liste des démarches", () => {
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    const lots = lotsAffichesNeuf(ctx, e.sel, []);
    expect(lots).toHaveLength(22);
    expect(lots).not.toContain("Assurance & ouverture du chantier");
    expect(lots).not.toContain("Taxes & participations");
    expect(ouvrablesNeuf(ctx, e.sel, [])).toEqual([...lots, CARTE_FRAIS, CARTE_DEMARCHES]);
    // 4 grandes phases + 22 lots + 2 cartes : 28 en-têtes (`tests/neuf-detaille-rendu.test.ts` les compte au rendu)
    expect(GRANDES_PHASES_NEUF.length + lots.length + 2).toBe(28);
    // une ligne perso garde son lot à l'écran, même vidé de ses postes
    expect(lotsAffichesNeuf(ctx, e.sel, [{ id: "x", lot: "Taxes & participations", nom: "Frais de dossier", prix: 90, unite: "u", qte: 1, tva: 20, on: true }]))
      .toContain("Taxes & participations");
  });

  it("163 lignes de travaux pour les 209 postes : 8 démarches et 6 frais sortis, 32 alternatives sur leur ligne de choix (164 avec un garage)", () => {
    const tous = CATALOG_NEUF.flatMap((l) => l.t);
    expect(tous).toHaveLength(209);
    expect(tous.filter(estDemarcheNeuf)).toHaveLength(8);
    expect(tous.filter(estFraisNeuf)).toHaveLength(6);
    expect(POSTES_FRAIS_NEUF.map((p) => p.t.id)).toEqual(tous.filter(estFraisNeuf).map((t) => t.id));
    const absorbees = LIGNES_CHOIX_NEUF.reduce((s, g) => s + g.alternatives.length - 1, 0);
    expect(absorbees).toBe(32);
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    expect(LOTS_NEUF.reduce((s, { c }) => s + lignesDe(elementsLotNeuf(ctx, {}, c)), 0)).toBe(209 - 8 - 6 - 32);
    // avec un garage et des murs en brique, le parpaing ne porte que le garage : une ligne à part
    const g = changerReponseNeuf(changerReponseNeuf(e, "garage", 20), "murs", "brique");
    const ctxG = ctxDetailNeuf(g);
    expect(LOTS_NEUF.reduce((s, { c }) => s + lignesDe(elementsLotNeuf(ctxG, {}, c)), 0)).toBe(209 - 8 - 6 - 31);
  });

  it("un lot présent à plusieurs étapes du chantier : un sous-titre par étape, dans l'ordre du chantier ; sinon aucun", () => {
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    const etapes = (c: string) => elementsLotNeuf(ctx, e.sel, c).filter((x) => x.type === "etape").map((x) => (x as { phase: string }).phase);
    expect(etapes("Maçonnerie")).toEqual(["Fondations & plancher bas", "Murs & planchers", "Second œuvre"]);
    expect(etapes("Electricite")).toEqual(["Fondations & plancher bas", "Second œuvre", "Réception & achèvement"]);
    expect(etapes("Isolation")).toEqual([]);                  // deux blocs, une seule étape (second œuvre)
    expect(etapes("Peinture")).toEqual([]);
    // chaque bloc garde sa note
    expect(elementsLotNeuf(ctx, e.sel, "Isolation").filter((x) => x.type === "note")).toHaveLength(2);
  });
});

describe("N10 · lignes de choix", () => {
  it("une ligne par groupe exclusif et par lot : 16 lignes, toutes les alternatives d'un même lot et d'un même groupe", () => {
    expect(LIGNES_CHOIX_NEUF).toHaveLength(16);
    const vus = new Set<string>();
    for (const g of LIGNES_CHOIX_NEUF) {
      const groupe = GROUPES_EXCLUSIFS_NEUF.find((x) => x.includes(g.alternatives[g.alternatives[0].id === ID_PARPAING ? 1 : 0].id))!;
      expect(groupe, g.cle).toBeDefined();
      for (const a of g.alternatives) {
        expect(POSTE_NEUF.get(a.id)?.c, a.id).toBe(g.lot);
        // seule alternative hors groupe : le parpaing des murs, qui porte aussi le garage
        if (a.id === ID_PARPAING) { expect(g.cle).toBe("murs"); expect(GROUPES_EXCLUSIFS_NEUF.flat()).not.toContain(a.id); }
        else expect(groupe, a.id).toContain(a.id);
        expect(vus.has(a.id), a.id).toBe(false);
        vus.add(a.id);
        expect(a.court.fr && a.court.en && a.court.fr.length <= 30 && a.court.en.length <= 30, a.id).toBeTruthy();
      }
      // toutes les alternatives du groupe rangées dans ce lot sont sur la ligne
      expect(groupe.filter((id) => POSTE_NEUF.get(id)?.c === g.lot).sort(), g.cle).toEqual(g.alternatives.map((a) => a.id).filter((id) => id !== ID_PARPAING).sort());
    }
    // un groupe dont plusieurs postes sont dans le même lot a toujours sa ligne ; les autres (l'escalier : un
    // poste par lot ; l'ossature bois, seule de son groupe en charpente) restent des lignes de leur lot
    for (const groupe of GROUPES_EXCLUSIFS_NEUF) {
      const parLot = new Map<string, string[]>();
      for (const id of groupe) parLot.set(POSTE_NEUF.get(id)!.c, [...(parLot.get(POSTE_NEUF.get(id)!.c) ?? []), id]);
      for (const ids of parLot.values()) for (const id of ids) expect(vus.has(id), id).toBe(ids.length > 1);
    }
  });

  it("anglais américain, sans mot français", () => {
    const FR = /[àâçèéêëîïôûùœ«»]|\b(le|la|les|des|du|une|et|ou|avec|sans|bois|tuiles?|enduit|chape)\b/i;
    const textes = LIGNES_CHOIX_NEUF.flatMap((g) => [g.titre.en, ...g.alternatives.map((a) => a.court.en)]).map((t) => t.replace(/[Ff]açade/g, ""));
    expect(textes.filter((t) => FR.test(t))).toEqual([]);
  });

  it("un clic sur une alternative la coche, décoche l'autre et met la réponse à jour (couverture, gouttières, façade)", () => {
    const e0 = etatParDefaut();
    expect(on(e0, "cou-couverture-tuiles-terre-cuite")).toBe(true);
    const ardoise = poste("cou-couverture-ardoise-naturelle");
    const e1 = choisirNeuf(e0, ardoise.l, ardoise.t);
    expect(e1.maison.couverture).toBe("ardoise");
    expect(on(e1, "cou-couverture-ardoise-naturelle")).toBe(true);
    expect(on(e1, "cou-couverture-tuiles-terre-cuite")).toBe(false);
    const pvc = poste("cou-gouttiere-pvc");
    expect(choisirNeuf(e1, pvc.l, pvc.t).maison.gouttiere).toBe("pvc");
    const bardage = poste("fac-bardage-composite");
    const e2 = choisirNeuf(e1, bardage.l, bardage.t);
    expect(e2.maison.facade).toBe("bardage-composite");
    expect(e2.facadeAuto).toBe(false);
    expect(on(e2, "fac-enduit-monocouche-machine")).toBe(false);
    // choisir l'isolation par l'extérieur (sans réponse) : la façade ne suit plus les murs
    const ite = poste("fac-isolation-par-l-exterieur-ite");
    const e3 = choisirNeuf(e0, ite.l, ite.t);
    expect(e3.maison).toBe(e0.maison);
    expect(e3.facadeAuto).toBe(false);
    expect([on(e3, "fac-isolation-par-l-exterieur-ite"), on(e3, "fac-enduit-monocouche-machine")]).toEqual([true, false]);
  });

  it("une alternative qui est une réponse du questionnaire : la même maison que si on y avait répondu (eaux usées, plancher bas, chauffage)", () => {
    const e0 = etatParDefaut();
    for (const [id, k, v] of [["rac-assainissement-fosse-toutes-eaux-5-eh", "assainissement", "fosse"], ["fon-vide-sanitaire-complet", "plancherBas", "vide-sanitaire"],
      ["cha-climatisation-gainable-reversible", "chauffage", "pac-air"], ["etu-maitrise-d-oeuvre-complete", "pilotage", "moe"]] as const) {
      const p = poste(id);
      const choisi = choisirNeuf(e0, p.l, p.t);
      const repondu = changerReponseNeuf(e0, k, v);
      expect(choisi.maison[k], id).toBe(v);
      expect(cochees(choisi.sel), id).toEqual(cochees(repondu.sel));
      expect(ttc(choisi), id).toBeCloseTo(ttc(repondu), 6);
    }
    // la fosse coche l'étude et les redevances du SPANC, décoche le tout-à-l'égout et sa participation
    const fosse = poste("rac-assainissement-fosse-toutes-eaux-5-eh");
    const e = choisirNeuf(e0, fosse.l, fosse.t);
    expect(["rac-raccordement-au-tout-a-l-egout", "tax-pfac-participation-tout-a-l-egout"].map((id) => on(e, id))).toEqual([false, false]);
    expect(["etu-etude-assainissement-individuel-spanc", "tax-redevances-spanc-controles"].map((id) => on(e, id))).toEqual([true, true]);
    // la case de la ligne fait de même (cocher = choisir) ; décocher ne change pas la réponse
    expect(cocherNeufEtat(e0, fosse.l, fosse.t).maison.assainissement).toBe("fosse");
    expect(cocherNeufEtat(e, fosse.l, fosse.t).maison.assainissement).toBe("fosse");
    expect(on(cocherNeufEtat(e, fosse.l, fosse.t), "rac-assainissement-fosse-toutes-eaux-5-eh")).toBe(false);
  });

  it("une alternative sans réponse (le radier) ne touche que la sélection", () => {
    const e0 = etatParDefaut();
    const radier = poste("fon-radier-general");
    const e = choisirNeuf(e0, radier.l, radier.t);
    expect(e.maison).toBe(e0.maison);
    expect([on(e, "fon-radier-general"), on(e, "fon-dalle-terre-plein-isolee")]).toEqual([true, false]);
  });

  it("les murs (vérification de N10) : le parpaing par défaut a son bouton, le béton cellulaire 30 cm sort la maison du parpaing", () => {
    const murs = ["mac-monter-un-mur-en-brique", "mac-mur-brique-monomur", "mac-mur-beton-cellulaire-20-cm", "mac-mur-beton-cellulaire-30-cm", "toi-mur-ossature-bois-isole"];
    const lesMurs = (e: EtatNeuf) => [ID_PARPAING, ...murs].filter((id) => on(e, id));
    const ligneMurs = (e: EtatNeuf) => elementsLotNeuf(ctxDetailNeuf(e), e.sel, "Maçonnerie").find((x) => x.type === "choix" && x.ligne.cle === "murs") as
      Extract<ElementLotNeuf, { type: "choix" }>;
    const e0 = etatParDefaut();
    expect([e0.maison.murs, e0.maison.garage]).toEqual(["parpaing", 0]);
    // maison par défaut : le parpaing est la ligne des murs, son bouton est pressé ; plus de brique décochée dessous
    expect(ligneMurs(e0).membres[0].t.id).toBe(ID_PARPAING);
    for (const locale of ["fr", "en"] as const) {
      const html = lotHtml(liste(e0, { "Maçonnerie": true }, locale), catT(locale, "corps", "Maçonnerie"));
      expect(html).toContain(`class="on" aria-pressed="true">${locale === "fr" ? "Parpaing" : "Concrete block"}</button>`);
      expect(html).toContain(echapper(catT(locale, "postes", poste(ID_PARPAING).t.n)));
      expect(html).not.toContain(echapper(catT(locale, "postes", poste("mac-monter-un-mur-en-brique").t.n)));
    }
    // béton cellulaire 30 cm : la réponse passe à « béton cellulaire », le parpaing se décoche (plus de murs comptés deux fois)
    const bc = poste("mac-mur-beton-cellulaire-30-cm");
    const e1 = choisirNeuf(e0, bc.l, bc.t);
    expect(e1.maison.murs).toBe("cellulaire");
    expect(lesMurs(e1)).toEqual(["mac-mur-beton-cellulaire-30-cm"]);
    // le même résultat que « béton cellulaire » au questionnaire puis le 30 cm sur la ligne
    const viaQuestion = changerReponseNeuf(e0, "murs", "cellulaire");
    expect(lesMurs(viaQuestion)).toEqual(["mac-mur-beton-cellulaire-20-cm"]);
    expect(ttc(choisirNeuf(viaQuestion, bc.l, bc.t))).toBeCloseTo(ttc(e1), 6);
    expect(ttc(e1)).toBeLessThan(ttc({ ...e0, sel: { ...e0.sel, [cle(bc.t.id)]: { on: true } } }));
    // retour au parpaing par son bouton, par sa case ou par le questionnaire : la maison par défaut, au centime
    const pp = poste(ID_PARPAING);
    for (const e2 of [choisirNeuf(e1, pp.l, pp.t), cocherNeufEtat(e1, pp.l, pp.t), changerReponseNeuf(e1, "murs", "parpaing")]) {
      expect(e2.maison.murs).toBe("parpaing");
      expect(lesMurs(e2)).toEqual([ID_PARPAING]);
      expect(ttc(e2)).toBeCloseTo(ttc(e0), 6);
    }
    // depuis la brique aussi
    const br = poste("mac-monter-un-mur-en-brique");
    const eb = choisirNeuf(e0, br.l, br.t);
    expect([eb.maison.murs, lesMurs(eb)]).toEqual(["brique", ["mac-monter-un-mur-en-brique"]]);
    expect(lesMurs(choisirNeuf(eb, pp.l, pp.t))).toEqual([ID_PARPAING]);
    // un ancien projet en parpaing avec le 30 cm coché en plus : les deux sur la ligne, sous l'avertissement ; « Parpaing » décoche l'autre
    const deux: EtatNeuf = { ...e0, sel: { ...e0.sel, [cle(bc.t.id)]: { on: true } } };
    expect(ligneMurs(deux).membres.filter(({ l, t }) => deux.sel[key(l.c, t.n)]?.on)).toHaveLength(2);
    expect(lesMurs(choisirNeuf(deux, pp.l, pp.t))).toEqual([ID_PARPAING]);
  });

  it("les murs avec un garage : le parpaing qui ne porte que le garage est une ligne à part, sa case ne change pas les murs", () => {
    const g0 = changerReponseNeuf(etatParDefaut(), "garage", 20);
    const br = poste("mac-monter-un-mur-en-brique"), pp = poste(ID_PARPAING), bc = poste("mac-mur-beton-cellulaire-30-cm");
    const g1 = choisirNeuf(g0, br.l, br.t);
    expect([on(g1, ID_PARPAING), on(g1, "mac-monter-un-mur-en-brique")]).toEqual([true, true]);   // le garage reste en parpaing
    const els = elementsLotNeuf(ctxDetailNeuf(g1), g1.sel, "Maçonnerie");
    const ligne = els.find((x) => x.type === "choix" && x.ligne.cle === "murs") as Extract<ElementLotNeuf, { type: "choix" }>;
    expect(ligne.membres.map((p) => p.t.id)).not.toContain(ID_PARPAING);
    expect(ligne.boutons.map((p) => p.t.id)).toContain(ID_PARPAING);
    expect(els.some((x) => x.type === "poste" && x.p.t.id === ID_PARPAING)).toBe(true);
    // à l'écran : pas d'avertissement, le bouton « Parpaing » n'est pas pressé (la ligne des murs est la brique)
    const html = lotHtml(liste(g1, { "Maçonnerie": true }), "Maçonnerie");
    expect(html).not.toContain("choixl doublon");
    expect(html).toContain('class="" aria-pressed="false">Parpaing</button>');
    expect(html).toContain('class="on" aria-pressed="true">Brique</button>');
    // la case du parpaing (le garage) : décoche, recoche, les murs restent en brique
    const g2 = cocherNeufEtat(cocherNeufEtat(g1, pp.l, pp.t), pp.l, pp.t);
    expect([g2.maison.murs, on(g2, ID_PARPAING), on(g2, "mac-monter-un-mur-en-brique")]).toEqual(["brique", true, true]);
    expect(ttc(g2)).toBeCloseTo(ttc(g1), 6);
    // le bouton « Parpaing » : la maison repasse en parpaing, comme au départ
    const g3 = choisirNeuf(g1, pp.l, pp.t);
    expect([g3.maison.murs, on(g3, "mac-monter-un-mur-en-brique")]).toEqual(["parpaing", false]);
    expect(ttc(g3)).toBeCloseTo(ttc(g0), 6);
    // le béton cellulaire 30 cm : le parpaing ne garde que le garage
    const g4 = choisirNeuf(g0, bc.l, bc.t);
    expect([g4.maison.murs, on(g4, ID_PARPAING), on(g4, bc.t.id)]).toEqual(["cellulaire", true, true]);
    const ctx4 = ctxDetailNeuf(g4);
    const parpaing = buildDevis(catalogueDe(ctx4), ctx4, g4.sel).lignes.find((li) => li.cle === cle(ID_PARPAING))!;
    expect(parpaing.qty).toBeCloseTo(geometrieNeuf(g4.maison).mursGarage, 2);
  });

  it("une couverture contraire à la toiture est désactivée : le toit-terrasse sur un toit à pans, les tuiles sur un toit plat", () => {
    const e0 = etatParDefaut();
    expect(raisonIndisponibleNeuf(e0.maison, "cou-toiture-terrasse-isolee")).toBe("toiture");
    expect(raisonIndisponibleNeuf(e0.maison, "cou-couverture-ardoise-naturelle")).toBeNull();
    const plat = changerReponseNeuf(e0, "toiture", "plat");
    expect(on(plat, "cou-toiture-terrasse-isolee")).toBe(true);
    for (const id of ["cou-couverture-tuiles-terre-cuite", "cou-couverture-bac-acier", "cou-couverture-zinc-joint-debout"]) expect(raisonIndisponibleNeuf(plat.maison, id), id).toBe("toiture");
    expect(raisonIndisponibleNeuf(plat.maison, "cou-toiture-terrasse-isolee")).toBeNull();
    // aucune couverture cochée : la ligne montre celle que la toiture permet
    const membres = LIGNES_CHOIX_NEUF.find((g) => g.cle === "couverture")!.alternatives.map((a) => poste(a.id));
    expect(alternativeMontreeNeuf(e0.maison, membres).t.id).toBe("cou-couverture-tuiles-terre-cuite");
    expect(alternativeMontreeNeuf(plat.maison, membres).t.id).toBe("cou-toiture-terrasse-isolee");
    for (const locale of ["fr", "en"] as const) {
      const d = dictNeuf(locale).detail;
      const html = lotHtml(liste(e0, { "Couverture & zinguerie": true }, locale), catT(locale, "corps", "Couverture & zinguerie"));
      expect(html).toContain(`aria-pressed="false" disabled="" title="${echapper(d.selonToiture)}">${locale === "fr" ? "Toit-terrasse" : "Flat roof"}</button>`);
      const h2 = lotHtml(liste(plat, { "Couverture & zinguerie": true }, locale), catT(locale, "corps", "Couverture & zinguerie"));
      expect(compte(h2, new RegExp(`disabled="" title="${echapper(d.selonToiture)}"`, "g"))).toBe(6);
      expect(h2).toContain(`class="on" aria-pressed="true">${locale === "fr" ? "Toit-terrasse" : "Flat roof"}</button>`);
    }
  });

  it("au-delà de 150 m² de surface de plancher, le dossier de permis par un dessinateur est désactivé", () => {
    const petite = maisonComplete({ ...maisonParDefaut(120), surface: 120 });
    const grande = maisonComplete({ ...maisonParDefaut(180), surface: 180 });
    expect(geometrieNeuf(petite).SP).toBeLessThanOrEqual(SEUIL_ARCHITECTE_M2);
    expect(geometrieNeuf(grande).SP).toBeGreaterThan(SEUIL_ARCHITECTE_M2);
    expect(alternativeIndisponibleNeuf(petite, "etu-dossier-permis-dessinateur")).toBe(false);
    expect(alternativeIndisponibleNeuf(grande, "etu-dossier-permis-dessinateur")).toBe(true);
    expect(alternativeIndisponibleNeuf(grande, "etu-architecte-mission-permis")).toBe(false);
    // aucune alternative cochée : la ligne montre l'architecte (sa case ne cocherait pas le dessinateur)
    const permis = LIGNES_CHOIX_NEUF.find((g) => g.cle === "permis")!.alternatives.map((a) => poste(a.id));
    expect(alternativeMontreeNeuf(grande, permis).t.id).toBe("etu-architecte-mission-permis");
    expect(alternativeMontreeNeuf(petite, permis).t.id).toBe("etu-dossier-permis-dessinateur");
    for (const locale of ["fr", "en"] as const) {
      const e = etatDepuisPreset(presetMaison(grande, { codePostal: "45000" }), "pros");
      const html = lotHtml(liste(e, { "Etudes / Conception": true }, locale), catT(locale, "corps", "Etudes / Conception"));
      const d = dictNeuf(locale).detail;
      expect(html).toContain(`aria-pressed="false" disabled="" title="${echapper(d.architecteObligatoire)}">`);
      expect(html).toContain(`class="on" aria-pressed="true">${locale === "fr" ? "Architecte" : "Architect"}</button>`);
      // 120 m² : rien de désactivé, le dessinateur est le choix
      const e2 = etatDepuisPreset(presetMaison(petite, { codePostal: "45000" }), "pros");
      expect(lotHtml(liste(e2, { "Etudes / Conception": true }, locale), catT(locale, "corps", "Etudes / Conception"))).not.toContain("disabled");
    }
  });

  it("la ligne montre l'alternative cochée et ses boutons ; aucune cochée : celle que la maison désigne, décochée", () => {
    const e0 = etatParDefaut();
    const html = lotHtml(liste(e0, { "Couverture & zinguerie": true }), "Couverture & zinguerie");
    expect(compte(html, /class="choixl"/g)).toBe(3);                      // couverture, gouttières, sous-face
    expect(compte(html, /role="group" aria-label="Couverture"/g)).toBe(1);
    expect(compte(html, /aria-pressed="true"/g)).toBe(3);
    expect(html).toContain(echapper(catT("fr", "postes", poste("cou-couverture-tuiles-terre-cuite").t.n)));
    expect(html).not.toContain(echapper(catT("fr", "postes", poste("cou-couverture-ardoise-naturelle").t.n)));
    // toutes décochées : la ligne de la couverture que la maison décrit, décochée, aucun bouton pressé
    const sansToit: EtatNeuf = { ...e0, maison: { ...e0.maison, couverture: "zinc" }, sel: { ...e0.sel, [cle("cou-couverture-tuiles-terre-cuite")]: { on: false } } };
    const membres = LIGNES_CHOIX_NEUF.find((g) => g.cle === "couverture")!.alternatives.map((a) => poste(a.id));
    expect(alternativeMontreeNeuf(sansToit.maison, membres).t.id).toBe("cou-couverture-zinc-joint-debout");
    const h2 = lotHtml(liste(sansToit, { "Couverture & zinguerie": true }), "Couverture & zinguerie");
    expect(h2).toContain(echapper(catT("fr", "postes", poste("cou-couverture-zinc-joint-debout").t.n)));
    expect(compte(h2, /aria-pressed="true"/g)).toBe(2);
    // « Seulement les postes cochés » : la ligne de choix sans alternative cochée disparaît
    const h3 = lotHtml(liste(sansToit, { "Couverture & zinguerie": true }, "fr", true), "Couverture & zinguerie");
    expect(h3).not.toContain('aria-label="Couverture"');
  });

  it("un ancien projet avec deux alternatives cochées : les deux lignes, sous un avertissement ; choisir l'une décoche l'autre", () => {
    const e0 = etatParDefaut();
    const deux: EtatNeuf = { ...e0, sel: { ...e0.sel, [cle("cou-couverture-ardoise-naturelle")]: { on: true } } };
    for (const locale of ["fr", "en"] as const) {
      const html = lotHtml(liste(deux, { "Couverture & zinguerie": true }, locale), catT(locale, "corps", "Couverture & zinguerie"));
      expect(compte(html, /class="choixl doublon"/g)).toBe(1);
      expect(html).toContain(`<p class="choixl-av" role="note">${echapper(dictNeuf(locale).detail.choixDoublon)}</p>`);
      expect(html).toContain(echapper(catT(locale, "postes", poste("cou-couverture-tuiles-terre-cuite").t.n)));
      expect(html).toContain(echapper(catT(locale, "postes", poste("cou-couverture-ardoise-naturelle").t.n)));
      expect(compte(html, new RegExp(`role="group" aria-label="${locale === "fr" ? "Couverture" : "Roofing"}"`, "g"))).toBe(1);
    }
    // le total compte les deux, comme avant N10 (rien n'est décoché sans qu'on le demande)
    expect(ttc(deux)).toBeGreaterThan(ttc(e0));
    const ardoise = poste("cou-couverture-ardoise-naturelle");
    const e = choisirNeuf(deux, ardoise.l, ardoise.t);
    expect([on(e, "cou-couverture-ardoise-naturelle"), on(e, "cou-couverture-tuiles-terre-cuite")]).toEqual([true, false]);
    expect(e.maison.couverture).toBe("ardoise");
  });
});

describe("N10 · démarches et frais hors de la liste et des compteurs", () => {
  it("le compteur d'un lot ne compte que ses travaux : le dépôt du permis et les demandes de raccordement n'y sont plus", () => {
    const e = etatParDefaut();
    const ctx = ctxDetailNeuf(e);
    const els = elementsLotNeuf(ctx, e.sel, "Etudes / Conception");
    const ids = els.flatMap((x) => (x.type === "poste" ? [x.p.t.id] : x.type === "choix" ? x.membres.map((m) => m.t.id) : []));
    expect(ids).not.toContain("etu-depot-du-permis-de-construire");
    expect(ids).not.toContain("etu-demandes-de-raccordement");
    expect(on(e, "etu-depot-du-permis-de-construire")).toBe(true);       // toujours cochée : « Mon devis » et le PDF la montrent
    const cocheesLot = CATALOG_NEUF.filter((l) => l.c === "Etudes / Conception").flatMap((l) => l.t).filter((t) => e.sel[key("Etudes / Conception", t.n)]?.on);
    expect(postesCochesNeuf(e.sel, els)).toBe(cocheesLot.length - 2);
  });

  it("la carte « Taxes, assurance et frais » : ses 6 postes, sans compteur ; la liste « Démarches » : celles de chaque étape", () => {
    const e = etatParDefaut();
    for (const locale of ["fr", "en"] as const) {
      const d = dictNeuf(locale).detail;
      const ferme = liste(e, {}, locale);
      expect(ferme).toContain(echapper(d.fraisT));
      expect(ferme).toContain(echapper(d.demarchesT));
      expect(compte(ferme, /class="trow"/g)).toBe(0);
      const html = liste(e, { [CARTE_FRAIS]: true, [CARTE_DEMARCHES]: true }, locale);
      const frais = html.slice(html.indexOf('class="frais-c"'), html.indexOf('class="tools"'));
      expect(compte(frais, /class="trow"/g)).toBe(6);
      expect(frais).not.toContain('class="cnt"');
      for (const { t } of POSTES_FRAIS_NEUF) expect(frais).toContain(echapper(catT(locale, "postes", t.n)));
      const dem = html.slice(html.indexOf('class="dem-c"'));
      const n = Object.values(INFO_PHASES).reduce((s, p) => s + p.dem.length, 0);
      expect(compte(dem, /<li>/g)).toBe(n);
      for (const p of Object.values(INFO_PHASES)) for (const x of p.dem) expect(dem).toContain(echapper(x.quoi[locale]));
      expect(dem).not.toContain('class="cnt"');
    }
  });

  it("les questions couverture, gouttières et façade ne sont plus posées : elles sont sur les lignes de choix", () => {
    const k = TOUTES_QUESTIONS_NEUF.map((q) => q.k);
    for (const x of ["couverture", "gouttiere", "facade"] as const) expect(k).not.toContain(x);
    // et les postes de ces réponses ont chacun leur bouton
    const boutons = new Set(LIGNES_CHOIX_NEUF.flatMap((g) => g.alternatives.map((a) => a.id)));
    for (const id of ["cou-couverture-tuiles-terre-cuite", "cou-couverture-zinc-joint-debout", "cou-gouttiere-alu-continu", "fac-bardage", "fac-bardage-composite"]) expect(boutons.has(id), id).toBe(true);
  });
});

describe("N10 · présentation seule : aucun total ne bouge", () => {
  it("la même maison, rendue par lots, coûte ce que le moteur chiffre ; « Tout passer », les réponses, les reprises ne passent pas par la liste", () => {
    const m: MaisonNeuve = maisonComplete({ ...maisonParDefaut(140), niveaux: "etage", murs: "brique", assainissement: "fosse", codePostal: "33620" });
    const e = etatDepuisPreset(presetMaison(m, { codePostal: "33620" }), "pros");
    const p = presetMaison(m, { codePostal: "33620" });
    expect(ttc(e)).toBeCloseTo(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc, 6);
    // la liste ne cache aucun montant : chaque ligne cochée chiffrée est soit dans un lot, soit dans la carte des frais
    const ctx = ctxDetailNeuf(e);
    const dv = buildDevis(catalogueDe(ctx), ctx, e.sel);
    const visibles = new Set([
      ...LOTS_NEUF.flatMap(({ c }) => elementsLotNeuf(ctx, e.sel, c)).flatMap((x) => (x.type === "poste" ? [x.p] : x.type === "choix" ? x.membres : [])),
      ...POSTES_FRAIS_NEUF,
    ].map(({ l, t }) => key(l.c, t.n)));
    const caches = dv.lignes.filter((li) => li.ht !== 0 && !visibles.has(li.cle));
    expect(caches).toEqual([]);
  });
});

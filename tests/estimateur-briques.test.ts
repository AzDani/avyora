/**
 * Briques de l'estimateur détaillé (Row, CustomLines, Field, Stepper) : le HTML rendu est figé
 * par un instantané pris AVANT leur extraction hors de `Estimateur.tsx` (chantier C1 du
 * branchement du neuf). L'extraction est un déplacement pur : l'instantané ne doit pas bouger.
 */
import { describe, it, expect } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG, defaultCtx, effPrices, isLoc, key, type Ctx, type Selection, type CustomLine, type LigneSel } from "@/lib/estimateur";
import { LangProvider } from "@/components/i18n/LangProvider";
import { Row } from "@/components/estimateur/Row";
import { CustomLines, Field, Stepper, ChoicePrice } from "@/components/estimateur/partage";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import { CATALOG_NEUF, presetNeuf, raisonProNeuf } from "@/lib/estimateur";
import { badgeNeuf, diyNeuf } from "@/lib/estimateur/detaille-neuf";

const rien = () => {};
const ctx: Ctx = { ...defaultCtx(), type: "Maison", surface: 100, surfaceSol: 100 };
const ctxR = { ...ctx, codePostal: "45000" } as Ctx;

const lot = (c: string) => {
  const l = CATALOG.find((x) => x.c === c);
  if (!l) throw new Error("lot introuvable : " + c);
  return l;
};
const tache = (c: string, n: string) => {
  const t = lot(c).t.find((x) => x.n === n);
  if (!t) throw new Error("poste introuvable : " + c + " | " + n);
  return t;
};

const rendre = (el: ReactElement, locale: "fr" | "en") =>
  renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));

function row(c: string, n: string, s?: Selection[string]) {
  const l = lot(c), t = tache(c, n);
  const sel: Selection = s ? { [key(c, n)]: s } : {};
  return createElement(Row, {
    l, t, ctx: ctxR, sel, loc: isLoc(l.c),
    onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
    onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
  });
}

const MEN = "Menuiseries exterieures", LOC = "Location de matériel";
const CAS: [string, string, string, Selection[string] | undefined][] = [
  // forfait
  ["forfait · décoché", "Etudes / Conception", "Plans du projet", undefined],
  ["forfait · coché", "Etudes / Conception", "Plans du projet", { on: true }],
  // m² (quantité automatique)
  ["m² · décoché", "Maçonnerie", "Chape traditionnelle", undefined],
  ["m² · auto", "Maçonnerie", "Chape traditionnelle", { on: true }],
  ["m² · manuel, je le fais, note lien", "Maçonnerie", "Chape liquide", { on: true, manual: true, qty: 42, self: true, note: "https://exemple.fr/chape" }],
  ["m² · prix perso", "Maçonnerie", "Chape traditionnelle", { on: true, pu: 61 }],
  // variantes
  ["menuiserie · alu triple", MEN, "Fenêtres", { on: true, qty: 6, mat: "alu", vit: "triple" }],
  ["menuiserie · prix matériaux perso", MEN, "Porte d'entrée", { on: true, qty: 1, pm: 800, self: true }],
  ["menuiserie · motorisation", MEN, "Portail battant (4 m)", { on: true, qty: 1, mot: "manuel" }],
  ["menuiserie · options", MEN, "Baie vitrée", { on: true, qty: 1 }],
  ["plomberie · options auto", "Plomberie", "WC", { on: true }],
  // location
  ["location · décochée", LOC, "Bétonnière", undefined],
  ["location · 3 jours", LOC, "Bétonnière", { on: true, qty: 3 }],
  ["location · forfait", LOC, "Livraison mini-pelle (dépose + reprise)", { on: true }],
];

const LIGNES: CustomLine[] = [
  { id: "c1", lot: "Maçonnerie", nom: "Muret jardin", prix: 450, unite: "ml", qte: 4, note: "https://exemple.fr/muret", tva: 10, on: true },
  { id: "c2", lot: "Maçonnerie", nom: "Sans lien", prix: 120, unite: "u", qte: 2, tva: 20, on: false },
  { id: "c3", lot: "Maçonnerie", nom: "Brouillon", prix: 0, unite: "u", qte: 1, note: "", tva: 10, on: true, draft: true },
];

describe("Briques de l'estimateur — rendu figé", () => {
  for (const locale of ["fr", "en"] as const) {
    for (const [nom, c, n, s] of CAS) {
      it(`Row ${locale} · ${nom}`, () => {
        expect(rendre(row(c, n, s), locale)).toMatchSnapshot();
      });
    }
    it(`CustomLines ${locale}`, () => {
      expect(rendre(createElement(CustomLines, { lines: LIGNES, onAdd: rien, onUpd: rien, onDel: rien }), locale)).toMatchSnapshot();
      expect(rendre(createElement(CustomLines, { lines: [], onAdd: rien, onUpd: rien, onDel: rien }), locale)).toMatchSnapshot();
    });
  }
  it("ChoicePrice", () => {
    const base = { label: "Fait faire", activeCls: "on-pro", onSelect: rien, onEdit: rien, onReset: rien };
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: true, amount: 1234.5, edited: false }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: false, amount: null, edited: false }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(ChoicePrice, { ...base, active: true, amount: 61, edited: true }))).toMatchSnapshot();
  });
  it("RAPIDE_CSS (déplacé tel quel, partagé avec le rapide neuf)", () => {
    expect(RAPIDE_CSS.length).toBeGreaterThan(1000);
    for (const sel of [".av-rapide .fin", ".av-rapide .qcard", ".av-rapide .seg button", ".av-rapide-live .cta"]) expect(RAPIDE_CSS).toContain(sel);
    expect(RAPIDE_CSS).toMatchSnapshot();
  });
  it("Field et Stepper", () => {
    expect(renderToStaticMarkup(createElement(Field, { label: "Surface", hint: "Tous les niveaux", children: createElement("input") }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Field, { label: "Code postal", children: createElement("input") }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Stepper, { label: "Chambres", hint: "hors suite", value: 3, onStep: rien }))).toMatchSnapshot();
    expect(renderToStaticMarkup(createElement(Stepper, { label: "WC", value: 1, onStep: rien }))).toMatchSnapshot();
  });
});

/* Construction neuve (C4, N1, N5) : `Row` reçoit `badge` et `proRaison`, comme dans `EstimateurNeuf`
   (le prix unitaire vient du moteur pour les deux natures, N7). Sans eux (ci-dessus), le rendu de la
   rénovation est inchangé ; avec eux, une ligne en % n'a pas de quantité, une démarche n'a pas de
   montant, un poste réservé affiche « Pro obligatoire ». « Je le fais », l'avertissement « hors
   décennale » et les mentions (PAC, borne) : la ligne les décide d'elle-même, pour les deux natures. */
describe("Row · props du neuf", () => {
  const p = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
  const rowNeuf = (id: string, s?: Selection[string]) => {
    const l = CATALOG_NEUF.find((x) => x.t.some((t) => t.id === id))!;
    const t = l.t.find((x) => x.id === id)!;
    const sel: Selection = s ? { ...p.sel, [key(l.c, t.n)]: s } : p.sel;
    return createElement(Row, {
      l, t, ctx: p.ctx, sel, loc: isLoc(l.c),
      badge: badgeNeuf(p.ctx, sel, l, t), proRaison: raisonProNeuf(t),
      onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
      onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
    });
  };
  for (const locale of ["fr", "en"] as const) {
    it(`badge pct ${locale} · assurance dommages-ouvrage (% du projet, sans TVA)`, () => {
      const html = rendre(rowNeuf("ass-assurance-dommages-ouvrage"), locale);
      expect(html).toContain("badge-pct");
      expect(html).not.toContain("av-step");      // pas de quantité à saisir
      expect(html).not.toContain(">Je le fais<"); // jamais soi-même
      expect(html).toMatchSnapshot();
    });
    it(`badge pct ${locale} · maîtrise d'œuvre avec un prix perso : plus de pourcentage affiché`, () => {
      const html = rendre(rowNeuf("etu-maitrise-d-oeuvre-complete", { on: true, pu: 12000 }), locale);
      expect(html).not.toContain("badge-pct");
      expect(html).toMatchSnapshot();
    });
    it(`badge jalon ${locale} · déclaration d'ouverture de chantier`, () => {
      const html = rendre(rowNeuf("ass-declaration-ouverture-de-chantier"), locale);
      expect(html).toContain("badge-dem");
      expect(html).not.toContain("lineamt");
      expect(html).not.toContain("choice");
      expect(html).toMatchSnapshot();
    });
  }
  it("mur en parpaings (N1) : « Je le fais » proposé ; pris soi-même, la ligne sort de la décennale", () => {
    const fait = rendre(rowNeuf("mac-monter-un-mur-en-parpaings", { on: true }), "fr");
    expect(fait).toContain(">Je le fais<");
    expect(fait).not.toContain("decennale");
    const soi = rendre(rowNeuf("mac-monter-un-mur-en-parpaings", { on: true, self: true }), "fr");
    expect(soi).toContain('class="ch onS"');
    expect(soi).toContain("Fait soi-même : hors garantie décennale. Vérifie avec ton assureur dommages-ouvrage.");
    const en = rendre(rowNeuf("mac-monter-un-mur-en-parpaings", { on: true, self: true }), "en");
    expect(en).toContain(">DIY<");
    expect(en).toContain("not covered by the 10-year structural warranty");
    // Une peinture prise soi-même n'a pas l'avertissement.
    expect(rendre(rowNeuf("pei-peinture-murs-plaques-neuves", { on: true, self: true }), "fr")).not.toContain("decennale");
  });
  it("raccordement Enedis (N1) : « Pro obligatoire » à la place de « Je le fais »", () => {
    const fr = rendre(rowNeuf("rac-raccordement-electrique-enedis", { on: true }), "fr");
    expect(fr).toContain('<span class="pro-oblig">Pro obligatoire · gestionnaire du réseau</span>');
    expect(fr).not.toContain(">Je le fais<");
    expect(rendre(rowNeuf("rac-raccordement-electrique-enedis", { on: true }), "en")).toContain("Pro required · utility company");
    // Décoché : ni bouton ni étiquette, comme toute ligne décochée.
    expect(rendre(rowNeuf("rac-raccordement-electrique-enedis", { on: false }), "fr")).not.toContain("pro-oblig");
  });
  it("PAC (D2) : faisable soi-même, avec la mention du fluide frigorigène quand on la prend", () => {
    const ff = rendre(rowNeuf("cha-pompe-a-chaleur-air-eau", { on: true }), "fr");
    expect(ff).toContain(">Je le fais<");
    expect(ff).not.toContain("pro-oblig");
    expect(ff).not.toContain("mention-soi");
    const soi = rendre(rowNeuf("cha-pompe-a-chaleur-air-eau", { on: true, self: true }), "fr");
    expect(soi).toContain('class="ch onS"');
    expect(soi).toContain('<div class="mention-soi" role="note">Manipulation du fluide frigorigène : attestation de capacité requise pour la mise en service.</div>');
    expect(soi).not.toContain("decennale");
    expect(rendre(rowNeuf("cha-climatisation-gainable-reversible", { on: true, self: true }), "en")).toContain("Refrigerant handling");
    expect(rendre(rowNeuf("ele-borne-de-recharge-voiture", { on: true, self: true }), "fr"))
      .toContain("Borne de plus de 3,7 kW : pose par un installateur qualifié IRVE exigée (décret 2017-26).");
  });
  it("tout-à-l'égout côté réseau public : réservé en neuf, mais un projet enregistré en « Je le fais » garde sa puce active", () => {
    const neuve = rendre(rowNeuf("rac-raccordement-au-tout-a-l-egout", { on: true }), "fr");
    expect(neuve).toContain("Pro obligatoire · gestionnaire du réseau");
    expect(neuve).not.toContain(">Je le fais<");
    const ancienne = rendre(rowNeuf("rac-raccordement-au-tout-a-l-egout", { on: true, self: true }), "fr");
    expect(ancienne).toContain('class="ch onS"');
    expect(ancienne).not.toContain("pro-oblig");
  });
  it("chaque poste du neuf : « Je le fais » proposé si et seulement si diyNeuf le permet", () => {
    for (const l of CATALOG_NEUF) for (const t of l.t) {
      const html = rendre(rowNeuf(t.id, { on: true }), "fr");
      const choix = html.includes('class="choice"');
      expect(html.includes(">Je le fais<"), t.id).toBe(choix && diyNeuf(l, t));
    }
  });
});

/* N5 : une seule règle d'affichage de « Je le fais » pour les deux natures (`peutFaireSoiMeme`).
   La rénovation affichait le bouton « dès que le poste a un prix de fourniture » (`effPrices(t, s).sm`,
   variantes comprises) : la preuve est faite pour CHAQUE poste du catalogue, chaque option de ses
   variantes, en « fait faire » et en « je le fais », en finition standard et premium. */
describe("Row · rénovation : « Je le fais » exactement comme avant N5", () => {
  it("chaque poste, chaque variante, chaque mode : bouton présent si et seulement si le poste a un prix de fourniture", () => {
    let n = 0;
    for (const finition of ["standard", "premium"] as const) {
      const c: Ctx = { ...ctxR, finition };
      for (const l of CATALOG) for (const t of l.t) {
        const etats: Partial<LigneSel>[] = [{}];
        if (t.mat) for (const m of ["pvc", "alu", "bois"] as const) etats.push({ mat: m });
        if (t.vitrage) etats.push({ vit: "triple" });
        if (t.moto) etats.push({ mot: "manuel" });
        if (t.taille) etats.push({ tai: "petit" });
        if (t.vars) for (const g of t.vars) for (const o of g.opts) etats.push({ vsel: { [g.k]: o.k } });
        if (t.grid && t.vars) {
          const [ka, kb] = t.grid.dims;
          for (const a of t.vars.find((g) => g.k === ka)!.opts) for (const b of t.vars.find((g) => g.k === kb)!.opts) etats.push({ vsel: { [ka]: a.k, [kb]: b.k } });
        }
        for (const e of etats) for (const self of [false, true]) {
          const s = { ...e, on: true, self } as LigneSel;
          const html = rendre(createElement(Row, {
            l, t, ctx: c, sel: { [key(l.c, t.n)]: s }, loc: isLoc(l.c),
            onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
            onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
          }), "fr");
          // La règle d'avant N5 (`Row.tsx`, `avecDiy = ep.sm != null || self`, puce affichée si `ep.sm != null`).
          const avant = !isLoc(l.c) && effPrices(t, s, c).sm != null;
          expect(html.includes(">Je le fais<"), `${t.id} ${JSON.stringify(s)}`).toBe(avant);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(800);
  });

  it("mur, charpente ou fenêtre pris soi-même : « hors garantie décennale », étude conseillée pour la structure (D4)", () => {
    const soi = rendre(row("Maçonnerie", "Ouvrir un mur porteur — petite (porte/fenêtre)", { on: true, self: true }), "fr");
    expect(soi).toContain('<div class="decennale" role="note">Fait soi-même : hors garantie décennale. Vérifie avec ton assureur ; pour un mur porteur ou une charpente, une étude est conseillée.</div>');
    expect(rendre(row("Charpente, couverture & structure bois", "Charpente traditionnelle (hors couverture)", { on: true, self: true }), "en"))
      .toContain("not covered by the 10-year structural warranty");
    expect(rendre(row(MEN, "Fenêtres", { on: true, qty: 6, self: true }), "fr")).toContain('class="decennale"');
    // Abattre un mur porteur : rangé en Démolition, mais c'est la structure.
    expect(rendre(row("Démolition", "Abattre un mur porteur", { on: true, self: true }), "fr")).toContain('class="decennale"');
    expect(rendre(row("Démolition", "Abattre un mur non porteur", { on: true, self: true }), "fr")).not.toContain("decennale");
    // Fait faire, ou un autre lot : rien.
    expect(rendre(row("Maçonnerie", "Ouvrir un mur porteur — petite (porte/fenêtre)", { on: true }), "fr")).not.toContain("decennale");
    expect(rendre(row("Electricite", "Rénovation électrique complète", { on: true, self: true }), "fr")).not.toContain("decennale");
    expect(rendre(row("Peinture", "Peinture des murs", { on: true, self: true }), "fr")).not.toContain("decennale");
  });

  it("PAC et borne prises soi-même : la mention, sans blocage (D2)", () => {
    const pac = rendre(row("Chauffage / VMC", "Pompe à chaleur (air/eau)", { on: true, self: true }), "fr");
    expect(pac).toContain('class="ch onS"');
    expect(pac).toContain("Manipulation du fluide frigorigène : attestation de capacité requise pour la mise en service.");
    expect(rendre(row("Chauffage / VMC", "Pompe à chaleur (air/eau)", { on: true }), "fr")).not.toContain("mention-soi");
    expect(rendre(row("Electricite", "Borne de recharge voiture", { on: true, self: true }), "en")).toContain("Charger over 3.7 kW");
    expect(rendre(row("Chauffage / VMC", "Chaudière gaz à condensation", { on: true, self: true }), "fr")).not.toContain("mention-soi");
  });
});

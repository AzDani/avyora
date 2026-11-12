/**
 * Accueil et accessibilité générale (revue du 12/11/2026, lot « accueil-a11y ») : les correctifs qui ne se voient pas
 * dans les témoins (tests/__snapshots__) ou qui doivent tenir quand ces témoins bougent.
 *
 *  - Héros de l'accueil : « multi-projets » sans trou (plus de gap d'inline-flex entre <b> et le texte voisin), la police
 *    à chasse fixe réservée aux chiffres ;
 *  - textes de vente : plus de « détaillé 200 postes », plus de « continuer » pour qui n'a rien commencé, la puce de
 *    l'éditeur de plan en trois puces ;
 *  - section « retour sur investissement » : pendant la bêta, plus de « plus qu'il ne coûte » ni de « se rembourse » ;
 *  - menu mobile : Échap ferme et rend le focus au bouton, le focus entre dans le panneau à l'ouverture ;
 *  - FAQ : toute la carte cliquable (la marge intérieure sur <summary>) ;
 *  - cibles tactiles d'au moins 44 px (pied de page, sélecteur de langue, bouton Menu).
 */
import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { remplacementsAccueilBeta } from "@/lib/accueil-beta";
import { SOURCES_BETA, lireSourceBeta, lienInscriptionBeta, PLANS_MAX_BETA } from "@/lib/beta";
import { dict } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/config";

const lire = (f: string) => fs.readFileSync(f, "utf8");
/** Une règle CSS d'une chaîne de styles : le contenu entre ses accolades. */
const regle = (css: string, selecteur: string) => {
  const i = css.indexOf(selecteur + "{");
  expect(i, selecteur).toBeGreaterThan(-1);
  return css.slice(i + selecteur.length + 1, css.indexOf("}", i));
};

describe("accueil : les puces du héros et la police à chasse fixe", () => {
  const page = lire("app/page.tsx");

  it("les puces ne sont plus en inline-flex avec un gap (« multi -projets »), la pastille garde son écart", () => {
    const span = regle(page, ".av-home .hero .trust span");
    expect(span).not.toMatch(/gap|inline-flex/);
    expect(regle(page, ".av-home .hero .trust span::before")).toContain("margin:0 8px 2px 0");
    expect(page).toContain("<span><b>multi</b>-projets</span>");
    expect(page).toContain("<span><b>multi</b>-projects</span>");
  });

  it("la police à chasse fixe n'est plus posée sur des mots en gras ; les chiffres passent par .num", () => {
    expect(regle(page, ".av-home .hero .trust b")).not.toContain("mono");
    expect(regle(page, ".av-home .roi .pct b")).not.toContain("mono");
    expect(page).not.toContain(".av-home .promo b{");
    expect(page).toContain('<b class="num">200</b>');
    expect(page).toContain('<b class="num">0,02&nbsp;%</b>');
  });

  it("le jeton --faint de l'accueil est celui du site (contraste AA), plus #898ea8", () => {
    expect(regle(page, ".av-home")).toContain("--faint:#6a6f88");
  });
});

describe("accueil : les textes de vente", () => {
  it("plus d'adjectif orphelin « détaillé 200 postes », ni de comparaison de devis importé (FEATURES.devis éteint)", () => {
    const page = lire("app/page.tsx");
    for (const x of ["détaillé 200 postes", "detailed 200 items", "Compare chaque poste au prix de marché", "Compare each item to the market price"]) {
      expect(page, x).not.toContain(x);
    }
    expect(page).toContain("Compare ton devis, ligne par ligne, à ton estimation détaillée au prix du marché.");
    for (const l of LOCALES) {
      const apres = remplacementsAccueilBeta(l).map(([, b]) => b).join("\n");
      expect(apres).not.toMatch(/détaillé 200 postes|detailed 200 items/);
      expect(apres).toMatch(/estimation détaillée \(200 postes\)|itemized estimate \(200 items\)/);
    }
  });

  it("pendant la bêta, la section « retour sur investissement » ne parle plus de ce qu'AVYORA coûte", () => {
    for (const l of LOCALES) {
      const paires = remplacementsAccueilBeta(l);
      const avant = paires.map(([a]) => a).join("\n");
      const apres = paires.map(([, b]) => b).join("\n");
      // Remplacée (le gabarit la contient une seule fois : tests/beta.test.ts le vérifie pour chaque `avant`).
      expect(avant).toMatch(l === "fr" ? /bien plus qu'il ne coûte/ : /far more than it costs/);
      expect(apres).not.toMatch(/plus qu'il ne coûte|se rembourse|more than it costs|pays for itself/);
    }
  });
});

describe("Tarifs : les textes", () => {
  it("le bas de page ne dit plus « continuer » : un nouveau visiteur n'a rien commencé", () => {
    for (const l of LOCALES) {
      const t = dict(l);
      expect(t.tarifs.continuerGratuit).not.toMatch(/^continu/);
      expect(t.beta.tarifsBasAnonyme + t.beta.tarifsBasLienAnonyme).not.toMatch(/continu/i);
    }
    expect(dict("fr").beta.tarifsBasAnonyme).toBe("Pas encore prêt à créer un compte ? ");
  });

  it("la puce de l'éditeur de plan pendant la bêta : trois puces courtes, sans point-virgule, avec le plafond des plans", () => {
    for (const l of LOCALES) {
      const puces = dict(l).beta.pucesPlan(PLANS_MAX_BETA);
      expect(puces).toHaveLength(3);
      for (const p of puces) expect(p, p).not.toContain(";");
      expect(puces[0]).toContain(String(PLANS_MAX_BETA));
    }
  });

  it("la page a des sous-titres h2 (offres, « Inclus… », membres fondateurs), plus seulement un h1", () => {
    const tarifs = lire("app/tarifs/page.tsx");
    for (const x of ["{t.inclus}</h2>", "{b.tarifsInclus}</h2>", "{b.tarifsFondateurTitre}</h2>", "{p.nom}</h2>"]) expect(tarifs, x).toContain(x);
  });
});

describe("en-tête et menu mobile : un appel à créer un compte pour un visiteur sans compte", () => {
  it("les sources `entete` et `menu-mobile` sont dans la liste fermée de la bêta", () => {
    for (const s of ["entete", "menu-mobile"]) {
      expect(SOURCES_BETA as readonly string[]).toContain(s);
      expect(lireSourceBeta(s)).toBe(s);
    }
    expect(lienInscriptionBeta(undefined, "entete")).toBe("/inscription?source=entete");
  });

  it("le menu mobile porte l'appel dans sa branche « sans compte »", () => {
    const menu = lire("components/MobileMenu.tsx");
    expect(menu).toContain('lienInscriptionBeta(undefined, "menu-mobile")');
    expect(menu).toContain("t.beta.creerCompte");
  });
});

describe("menu mobile : clavier et focus", () => {
  const menu = lire("components/MobileMenu.tsx");

  it("Échap ferme le menu et rend le focus au bouton ; à l'ouverture, le focus entre dans le panneau", () => {
    expect(menu).toMatch(/addEventListener\("keydown"/);
    expect(menu).toMatch(/removeEventListener\("keydown"/);
    expect(menu).toContain('e.key !== "Escape"');
    expect(menu).toContain("boutonRef.current?.focus()");
    expect(menu).toContain('panneauRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus()');
  });

  it("le bouton dit quel panneau il ouvre (aria-controls) et fait 44 × 44 px", () => {
    expect(menu).toContain("aria-controls={panneauId}");
    expect(menu).toContain("id={panneauId}");
    expect(menu).toContain("h-11 w-11");
    expect(menu).not.toContain("h-10 w-10");
  });
});

describe("FAQ : toute la carte cliquable", () => {
  const SEO = [
    ["app/prix-renovation/[ville]/page.tsx", "av-seo"],
    ["app/prix-poste/[slug]/page.tsx", "av-poste"],
    ["app/guides/[slug]/page.tsx", "av-guide"],
    ["app/prix-travaux/[projet]/page.tsx", "av-seo"],
    ["app/prix-travaux/page.tsx", "av-seo"],
    ["app/prix-travaux/[projet]/[ville]/page.tsx", "av-seo"],
  ] as const;

  it("pages de prix et guides : la marge intérieure est sur <summary>, plus sur <details>", () => {
    for (const [f, c] of SEO) {
      const src = lire(f);
      expect(regle(src, `.${c} .faq details`), f).not.toContain("padding");
      expect(regle(src, `.${c} .faq summary`), f).toContain("padding:12px 16px");
    }
  });

  it("vitrine de l'éditeur et « Je préfère utiliser mon mot de passe » : idem", () => {
    const vitrine = lire("app/logiciel-plan-maison/page.tsx");
    expect(vitrine).toContain('<details key={f.q} className="group">');
    expect(vitrine).toMatch(/<summary className="block cursor-pointer list-none px-5 py-4 /);
    const acces = lire("components/auth/AccesLien.tsx");
    expect(acces).toContain('className="group mt-6 rounded-field border border-line"');
    expect(acces).toMatch(/<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 /);
  });
});

describe("cibles tactiles d'au moins 44 px", () => {
  it("liens du pied de page, boutons FR / EN", () => {
    expect(lire("app/layout.tsx")).toContain("[&>a]:min-h-11 [&>a]:min-w-11");
    const langue = lire("components/i18n/LangSwitch.tsx");
    expect(langue.split("min-h-11 min-w-11").length - 1).toBe(2);
  });

  it("puces de villes et de projets des pages de prix et des guides : padding 10px 14px partout", () => {
    for (const [f, sel] of [
      ["app/prix-renovation/[ville]/page.tsx", ".av-seo .villes a"],
      ["app/guides/[slug]/page.tsx", ".av-guide .villes a"],
      ["app/prix-travaux/page.tsx", ".av-seo .chips a"],
      ["app/prix-travaux/[projet]/page.tsx", ".av-seo .chips a"],
      ["app/prix-travaux/[projet]/[ville]/page.tsx", ".av-seo .chips a"],
    ] as const) {
      expect(regle(lire(f), sel), f).toContain("padding:10px 14px");
    }
  });
});

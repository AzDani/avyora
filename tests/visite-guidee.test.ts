/**
 * Visite guidée des estimateurs (`lib/visite.ts`, `components/visite/VisiteGuidee.tsx`, textes `lib/i18n/visite.ts`),
 * branchée d'abord sur le rapide de la rénovation.
 *
 * Pas de DOM dans la suite (environnement node) : la logique pure est testée directement (mémoire, invitation,
 * étapes, navigation, clavier, géométrie, mesure) et le composant par son rendu serveur, ce qu'il montre avant
 * toute action (le bouton, jamais l'invitation ni la bulle) et les propriétés que l'estimateur lui passe.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));
const SUIVI = vi.hoisted(() => ({ appels: [] as [string, Record<string, unknown> | undefined][] }));
vi.mock("@/lib/track", () => ({ suivre: (nom: string, p?: Record<string, unknown>) => { SUIVI.appels.push([nom, p]); } }));
/** Les propriétés que l'estimateur passe à la visite (le vrai composant est rendu quand même). */
const PROPS = vi.hoisted(() => ({ derniers: [] as Record<string, unknown>[] }));
vi.mock("@/components/visite/VisiteGuidee", async (orig) => {
  const m = await orig<typeof import("@/components/visite/VisiteGuidee")>();
  return { ...m, default: (p: Parameters<typeof m.default>[0]) => { PROPS.derniers.push(p as never); return m.default(p); } };
});

import {
  ESTIMATEURS_VISITE, VERSION_VISITE, cleVisite, lireVisite, memoriserVisite, doitInviter, resoudreEtapes, selecteurCible,
  naviguer, actionClavier, placerBulle, defilement, chevauche, unionRects, mesurerVisite, type EtapeVisite, type Rect,
} from "@/lib/visite";
import { dictVisite } from "@/lib/i18n/visite";
import { LangProvider } from "@/components/i18n/LangProvider";
import VisiteGuidee from "@/components/visite/VisiteGuidee";
import EstimateurRapide from "@/components/EstimateurRapide";
import EstimateurRapideNeuf from "@/components/neuf/EstimateurRapideNeuf";
import Estimateur from "@/components/Estimateur";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import { CATALOG, defaultCtx, visible, key } from "@/lib/estimateur";

const LOCALES = ["fr", "en"] as const;
const sansStyle = (h: string) => h.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const rendre = (el: unknown, props: object, locale: "fr" | "en" = "fr") =>
  sansStyle(renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(el as never, props as never) })));
const lire = (f: string) => fs.readFileSync(f, "utf8");

/** Un localStorage en mémoire ; `casse` : chaque accès lève (navigation privée stricte, quota). */
function stockage(casse = false) {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => { if (casse) throw new Error("SecurityError"); return m.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (casse) throw new Error("QuotaExceededError"); m.set(k, v); },
  };
}

beforeEach(() => { SUIVI.appels = []; PROPS.derniers = []; });

/* ─── Mémoire ─────────────────────────────────────────────────────────────────────────────────── */

describe("mémoire de la visite (localStorage, clé versionnée, par estimateur)", () => {
  it("une clé par estimateur, qui porte la version", () => {
    const cles = ESTIMATEURS_VISITE.map(cleVisite);
    expect(new Set(cles).size).toBe(4);
    for (const c of cles) expect(c).toContain(`v${VERSION_VISITE}`);
    expect(cleVisite("rapideReno")).toBe(`avyora-visite:v${VERSION_VISITE}:rapideReno`);
  });

  it("jamais vue → null ; « fait » et « passé » relus ; un estimateur n'engage pas les autres", () => {
    const s = stockage();
    expect(lireVisite("rapideReno", s)).toBeNull();
    memoriserVisite("rapideReno", "fait", s);
    expect(lireVisite("rapideReno", s)).toBe("fait");
    expect(lireVisite("rapideNeuf", s)).toBeNull();
    memoriserVisite("rapideNeuf", "passe", s);
    expect(lireVisite("rapideNeuf", s)).toBe("passe");
    expect([...s.m.keys()].sort()).toEqual([cleVisite("rapideNeuf"), cleVisite("rapideReno")]);
  });

  it("une valeur inconnue (ancienne version, bricolage) vaut « jamais vue »", () => {
    const s = stockage();
    s.setItem(cleVisite("rapideReno"), "oui");
    expect(lireVisite("rapideReno", s)).toBeNull();
  });

  it("localStorage indisponible : « indisponible » à la lecture (pas d'invitation à chaque page), aucune erreur à l'écriture", () => {
    expect(lireVisite("rapideReno", stockage(true))).toBe("indisponible");
    expect(lireVisite("rapideReno", null)).toBe("indisponible");
    expect(() => memoriserVisite("rapideReno", "fait", stockage(true))).not.toThrow();
    expect(() => memoriserVisite("rapideReno", "fait", null)).not.toThrow();
    // Côté serveur (pas de window) : pas d'accès, pas d'erreur.
    expect(lireVisite("rapideReno")).toBe("indisponible");
  });
});

/* ─── Invitation ──────────────────────────────────────────────────────────────────────────────── */

describe("invitation « Te guider en 1 minute ? »", () => {
  it("seulement à la première visite, formulaire vierge, bandeau cookies fermé", () => {
    expect(doitInviter({ etat: null, prerempli: false, cookiesOuverts: false })).toBe(true);
    for (const etat of ["fait", "passe", "indisponible"] as const) expect(doitInviter({ etat, prerempli: false, cookiesOuverts: false })).toBe(false);
    expect(doitInviter({ etat: null, prerempli: true, cookiesOuverts: false })).toBe(false);
    expect(doitInviter({ etat: null, prerempli: false, cookiesOuverts: true })).toBe(false);
  });

  it("rendu serveur : le bouton « ? Visite guidée » seulement, ni invitation ni bulle (rien ne bouge au chargement)", () => {
    for (const l of LOCALES) {
      const t = dictVisite(l).commun;
      const h = rendre(VisiteGuidee, { id: "rapideReno", etapes: [] }, l);
      expect(h).toContain(`class="av-visite-aide"`);
      expect(h).toContain(`${t.bouton}</button>`);
      expect(h).toContain(`aria-haspopup="dialog"`);
      expect(h).not.toContain(t.invitation.replace(/'/g, "&#x27;"));
      expect(h).not.toContain('role="dialog"');
    }
  });

  it("le rapide réno dit « prérempli » pour une page de prix, un projet rouvert ; pas pour une arrivée directe", () => {
    const prerempli = (props: object) => { PROPS.derniers = []; rendre(EstimateurRapide, props); return PROPS.derniers.at(-1)?.prerempli; };
    expect(prerempli({})).toBe(false);
    expect(prerempli({ initial: { src: "prix-ville" } })).toBe(false);
    expect(prerempli({ initial: { cp: "33000" } })).toBe(true);
    expect(prerempli({ initial: { piece: "cuisine" } })).toBe(true);
    expect(prerempli({ initial: { surface: 40 } })).toBe(true);
    expect(prerempli({ edit: { projectId: "p1", type: "Maison", surface: 100, cp: "33000", ampleur: "complete", finition: "standard", qui: "pros" } })).toBe(true);
    // Les réponses rendues au retour (sessionStorage) passent par `retour`, lu avec les autres.
    expect(lire("components/EstimateurRapide.tsx")).toMatch(/const prerempli = !!edit \|\| retour \|\|/);
  });
});

/* ─── Étapes ──────────────────────────────────────────────────────────────────────────────────── */

describe("étapes : cibles absentes, repli, ordre", () => {
  const E = (id: string, cible: EtapeVisite["cible"], repli?: EtapeVisite["repli"]): EtapeVisite => ({ id, cible, repli, titre: id, texte: id });

  it("téléphone : `cibleMobile` remplace `cible` (même repli) ; ordinateur et étapes sans elle : inchangées", () => {
    const e: EtapeVisite = { id: "g", cible: "grille", cibleMobile: ["c1", "c2"], repli: "r", titre: "g", texte: "g" };
    expect(resoudreEtapes([e], () => true)[0].cibles).toEqual(["grille"]);
    expect(resoudreEtapes([e], () => true, true)[0].cibles).toEqual(["c1", "c2"]);
    expect(resoudreEtapes([e], (n) => n === "r", true)[0].cibles).toEqual(["r"]);
    expect(resoudreEtapes([E("a", "a")], () => true, true)[0].cibles).toEqual(["a"]);
    // Le composant résout avec le format de l'écran, au lancement et au passage téléphone ↔ ordinateur.
    const src = lire("components/visite/VisiteGuidee.tsx");
    expect(src).toContain("resoudreEtapes(etapes, (nom) => !!elementDe(nom), mobile)");
    expect(src).toContain("resoudreEtapes(etapes, (nom) => !!elementDe(nom), m)");
  });

  it("`data-visite` par défaut, un sélecteur CSS tel quel", () => {
    expect(selecteurCible("rapide-cp")).toBe('[data-visite="rapide-cp"]');
    expect(selecteurCible(".av-rapide .cards")).toBe(".av-rapide .cards");
    expect(selecteurCible("#x")).toBe("#x");
    expect(selecteurCible('a"b')).toBe('[data-visite="a\\"b"]');
  });

  it("cible absente sans repli : étape sautée ; avec repli présent : le repli ; tableau : les présentes ; null : gardée sans cible", () => {
    const presents = new Set(["a", "c1", "r"]);
    const l = resoudreEtapes([E("1", "a"), E("2", "b"), E("3", ["c1", "c2"]), E("4", "d", "r"), E("5", "e", ["x", "y"]), E("6", null)], (n) => presents.has(n));
    expect(l.map((e) => [e.id, e.cibles])).toEqual([["1", ["a"]], ["3", ["c1"]], ["4", ["r"]], ["6", []]]);
  });

  it("Suivant / Retour : dans l'ordre, « fin » après la dernière, Retour ne sort pas de la première", () => {
    const n = 4;
    const vus: (number | "fin")[] = [];
    let i: number | "fin" = 0;
    while (i !== "fin") { vus.push(i); i = naviguer(i, n, "suivant"); }
    expect(vus).toEqual([0, 1, 2, 3]);
    expect(naviguer(3, n, "suivant")).toBe("fin");
    expect(naviguer(2, n, "retour")).toBe(1);
    expect(naviguer(0, n, "retour")).toBe(0);
  });

  it("clavier : Échap = passer, → suivant, ← retour, Tab reste dans la bulle, le reste n'est pas une action", () => {
    expect(actionClavier("Escape")).toBe("passer");
    expect(actionClavier("Esc")).toBe("passer");
    expect(actionClavier("ArrowRight")).toBe("suivant");
    expect(actionClavier("ArrowLeft")).toBe("retour");
    expect(actionClavier("Tab")).toBe("tab");
    for (const k of ["Enter", " ", "a", "Delete", "ArrowDown"]) expect(actionClavier(k)).toBeNull();
  });

  it("rapide réno : 7 étapes dans l'ordre du formulaire, chaque cible (et repli) existe dans la page, textes de la langue", () => {
    for (const l of LOCALES) {
      PROPS.derniers = [];
      const h = rendre(EstimateurRapide, {}, l);
      const p = PROPS.derniers.at(-1)!;
      expect(p.id).toBe("rapideReno");
      const etapes = p.etapes as EtapeVisite[];
      expect(etapes.map((e) => e.id)).toEqual(["quoi", "champs", "ampleur", "finition", "qui", "budget", "suite"]);
      const tv = dictVisite(l).rapideReno;
      for (const e of etapes) {
        expect({ titre: e.titre, texte: e.texte }).toEqual(tv[e.id as keyof typeof tv]);
        for (const nom of [...[e.cible ?? []].flat(), ...[e.repli ?? []].flat()]) expect(h).toContain(`data-visite="${nom}"`);
      }
      // Le bouton est EN HAUT de l'estimateur (avant la 1ʳᵉ question).
      expect(h.indexOf("av-visite-aide")).toBeGreaterThan(-1);
      expect(h.indexOf("av-visite-aide")).toBeLessThan(h.indexOf('data-visite="rapide-bien"'));
    }
  });

  it("téléphone sans prix : la barre (cachée) est sautée, « Enregistre ou affine » vise le seul bouton Détail du téléphone", () => {
    PROPS.derniers = [];
    rendre(EstimateurRapide, {});
    const etapes = PROPS.derniers.at(-1)!.etapes as EtapeVisite[];
    const presents = new Set(["rapide-bien-titre", "rapide-bien", "rapide-pieces", "rapide-champs", "rapide-ampleur", "rapide-finition", "rapide-qui", "rapide-affiner-m"]);
    const l = resoudreEtapes(etapes, (n) => presents.has(n));
    expect(l.map((e) => e.id)).toEqual(["quoi", "champs", "ampleur", "finition", "qui", "suite"]);
    expect(l.at(-1)!.cibles).toEqual(["rapide-affiner-m"]);
    // Ordinateur (le bouton du téléphone est caché) : les boutons de la barre seulement.
    const ordi = resoudreEtapes(etapes, (n) => n !== "rapide-affiner-m");
    expect(ordi.at(-1)!.cibles).toEqual(["rapide-actions"]);
  });
});

/* ─── Géométrie ───────────────────────────────────────────────────────────────────────────────── */

describe("la bulle dans l'écran, jamais sur sa cible", () => {
  const R = (left: number, top: number, w: number, h: number): Rect => ({ left, top, right: left + w, bottom: top + h });
  const dans = (p: { x: number; y: number }, b: { w: number; h: number }, v: { w: number; h: number }) =>
    p.x >= 0 && p.y >= 0 && p.x + b.w <= v.w + 0.5 && p.y + b.h <= v.h + 0.5;

  for (const v of [{ w: 1440, h: 900 }, { w: 1280, h: 800 }, { w: 1024, h: 768 }]) {
    it(`ordinateur ${v.w}×${v.h} : cibles larges, étroites, en haut, en bas (barre collante)`, () => {
      const b = { w: 344, h: 190 };
      const cibles = [R(300, 300, 760, 220), R(300, 120, 760, 120), R(300, v.h - 110, 760, 90), R(40, 200, 200, 300), R(v.w - 260, 200, 220, 300), R(300, 80, 760, 380)];
      for (const c of cibles) {
        const p = placerBulle({ cible: c, bulle: b, vue: v, mobile: false });
        expect(dans(p, b, v)).toBe(true);
        expect(chevauche({ left: p.x, top: p.y, right: p.x + b.w, bottom: p.y + b.h }, c, v)).toBe(false);
      }
    });
  }

  it("téléphone 390×844 : feuille en bas, en haut si la cible est en bas (barre de prix collante)", () => {
    const v = { w: 390, h: 844 }, b = { w: 374, h: 230 };
    const haut = placerBulle({ cible: R(16, 200, 358, 300), bulle: b, vue: v, mobile: true });
    expect(haut.cote).toBe("bas");
    expect(haut.y + b.h).toBeLessThanOrEqual(v.h);
    const barre = R(16, 844 - 8 - 76, 358, 76);
    const p = placerBulle({ cible: barre, bulle: b, vue: v, mobile: true });
    expect(p.cote).toBe("haut");
    expect(chevauche({ left: p.x, top: p.y, right: p.x + b.w, bottom: p.y + b.h }, barre, v)).toBe(false);
    // Sans cible : en bas, dans l'écran.
    const s = placerBulle({ cible: null, bulle: b, vue: v, mobile: true });
    expect(dans(s, b, v)).toBe(true);
  });

  it("défilement : une cible sous l'écran remonte au-dessus de la feuille ; déjà visible, on ne bouge pas", () => {
    const v = { w: 390, h: 844 };
    const c = R(16, 1500, 358, 300);
    const d = defilement({ cible: c, vue: v, mobile: true, bulle: { h: 230 }, entete: 64 });
    const top = c.top - d;
    expect(top).toBeGreaterThanOrEqual(64);
    expect(top + 300).toBeLessThanOrEqual(844 - 230);
    expect(defilement({ cible: R(16, 120, 358, 200), vue: v, mobile: true, bulle: { h: 230 }, entete: 64 })).toBe(0);
    // Trop haute : son haut sous l'en-tête.
    expect(1500 - defilement({ cible: R(16, 1500, 358, 900), vue: v, mobile: true, bulle: { h: 230 }, entete: 64 })).toBe(64 + 12);
    // Ordinateur : la cible ET la place de la bulle dans l'écran.
    const dd = defilement({ cible: R(300, 2000, 760, 220), vue: { w: 1440, h: 900 }, mobile: false, bulle: { h: 190 }, entete: 70 });
    expect(2000 - dd).toBeGreaterThanOrEqual(70);
    expect(2000 - dd + 220 + 14 + 190).toBeLessThanOrEqual(900);
  });

  it("le halo d'une étape à plusieurs cibles entoure toutes les présentes", () => {
    expect(unionRects([R(10, 10, 100, 40), R(10, 70, 300, 100)])).toEqual({ left: 10, top: 10, right: 310, bottom: 170 });
    expect(unionRects([])).toBeNull();
  });
});

/* ─── Textes ──────────────────────────────────────────────────────────────────────────────────── */

function forme(v: unknown): unknown {
  if (typeof v === "function") return `fn/${v.length}`;
  if (Array.isArray(v)) return v.map(forme);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, forme((v as Record<string, unknown>)[k])]));
  return typeof v;
}
function textes(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") out.push(String((v as (a: number, b: number) => string)(2, 7)));
  else if (v && typeof v === "object") for (const x of Object.values(v)) textes(x, out);
  return out;
}

describe("textes FR / EN (lib/i18n/visite.ts)", () => {
  const fr = dictVisite("fr"), en = dictVisite("en");
  it("même forme dans les deux langues (clés, fonctions et leur nombre d'arguments), une section par estimateur", () => {
    expect(forme(en)).toEqual(forme(fr));
    for (const id of ESTIMATEURS_VISITE) expect(fr).toHaveProperty(id);
  });
  it("aucun texte vide, aucun emoji, aucun prix ; le français tutoie, l'anglais n'est pas du français", () => {
    for (const s of [...textes(fr), ...textes(en)]) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(s).not.toMatch(/\d\s?€|€\s?\d/);
    }
    expect(textes(fr).join(" ")).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(textes(en).join(" ")).not.toMatch(/\b(le|la|les|ton|ta|tes|des)\b/);
    expect(fr.commun.etape(2, 7)).toBe("Étape 2 sur 7");
    expect(en.commun.etape(2, 7)).toBe("Step 2 of 7");
  });
  it("bulles courtes : 1 à 2 phrases, un titre bref", () => {
    for (const d of [fr, en]) for (const id of ESTIMATEURS_VISITE) for (const e of Object.values(d[id])) {
      expect(e.titre.length).toBeLessThanOrEqual(32);
      expect(e.texte.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(3);
      expect(e.texte.length).toBeLessThanOrEqual(190);
    }
  });
});

/* ─── Aucun effet de bord ─────────────────────────────────────────────────────────────────────── */

describe("la visite ne touche ni au réseau, ni à Google Ads, ni aux réponses", () => {
  const fetchOrig = globalThis.fetch;
  afterEach(() => { globalThis.fetch = fetchOrig; });

  it("aucune requête pendant le rendu ni la logique de visite", () => {
    const espion = vi.fn();
    globalThis.fetch = espion as never;
    rendre(EstimateurRapide, {});
    rendre(VisiteGuidee, { id: "rapideReno", etapes: [] }, "en");
    resoudreEtapes([{ id: "a", cible: "x", titre: "a", texte: "a" }], () => true);
    memoriserVisite("rapideReno", "fait", stockage());
    mesurerVisite("visite_debut", { estimateur: "rapideReno", etapes: 7, origine: "bouton" });
    expect(espion).not.toHaveBeenCalled();
  });

  it("le code de la visite n'appelle ni fetch, ni gtag, ni la conversion, et ne lit ni n'écrit les réponses", () => {
    for (const f of ["components/visite/VisiteGuidee.tsx", "lib/visite.ts"]) {
      const src = lire(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      for (const interdit of ["fetch(", "gtag", "conversionEstimation", "sendBeacon", "XMLHttpRequest", "sessionStorage", "CLE_BROUILLON", "router"]) expect(src).not.toContain(interdit);
    }
  });

  it("mesure : visite_debut / visite_fin / visite_passee, propriétés fermées, aucune donnée personnelle", () => {
    mesurerVisite("visite_debut", { estimateur: "rapideReno", etapes: 7, origine: "invitation" });
    mesurerVisite("visite_fin", { estimateur: "rapideReno", etape: 7, etapes: 7 });
    mesurerVisite("visite_passee", { estimateur: "rapideReno", etape: 0, origine: "invitation" });
    expect(SUIVI.appels).toEqual([
      ["visite_debut", { estimateur: "rapideReno", etapes: 7, origine: "invitation" }],
      ["visite_fin", { estimateur: "rapideReno", etape: 7, etapes: 7 }],
      ["visite_passee", { estimateur: "rapideReno", etape: 0, origine: "invitation" }],
    ]);
    for (const [, p] of SUIVI.appels) for (const k of Object.keys(p!)) expect(["estimateur", "etape", "etapes", "origine"]).toContain(k);
  });

  it("le formulaire rendu est le même avec la visite, à la rangée du bouton près", () => {
    const h = rendre(EstimateurRapide, {});
    const sansVisite = h.replace(/<div class="av-visite-barre">[\s\S]*?<\/button><\/div>/, "").replace(/ data-visite="[^"]*"/g, "");
    expect(sansVisite).not.toContain("av-visite");
    expect(sansVisite).not.toContain("data-visite");
  });
});

describe("accessibilité et CSS de la bulle (source)", () => {
  const src = lire("components/visite/VisiteGuidee.tsx");
  it("dialog modal, titre et description liés, focus rendu, Échap / flèches / Tab gérés", () => {
    expect(src).toContain('role="dialog" aria-modal="true" aria-labelledby={idTitre} aria-describedby={idTexte}');
    expect(src).toContain("focus({ preventScroll: true })");
    expect(src).toMatch(/addEventListener\("keydown", touche, true\)/);
    expect(src).toContain('addEventListener("focusin", garde)');
  });
  it("classes préfixées av-visite-, mouvement réduit respecté, zones tactiles de 44 px au téléphone", async () => {
    const { VISITE_CSS } = await import("@/components/visite/VisiteGuidee");
    const classes = [...VISITE_CSS.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
    for (const c of classes) expect(c === "mobile" || c === "sanscible" || c === "secoue" || c === "on" || c === "fait" || c.startsWith("av-visite")).toBe(true);
    expect(VISITE_CSS).toContain("prefers-reduced-motion:reduce");
    expect(VISITE_CSS).toMatch(/@media \(max-width:560px\)\{[\s\S]*min-height:44px/);
    expect(src).toContain('"(prefers-reduced-motion: reduce)"');
  });
});

/* ─── Les trois autres estimateurs : rapide neuf, détaillé rénovation, détaillé neuf ─────────────────────── */

/**
 * Une cible est présente dans le rendu serveur : `data-visite="nom"`, ou, pour un sélecteur CSS (cibles DANS la liste
 * des lots, faite de briques partagées), chacun de ses maillons (`.acc.open`, `.trow`…) porté par au moins un élément
 * (toutes ses classes à la fois). `:not(…)` est ignoré. Sans DOM dans la suite : une vérification de présence, pas
 * l'ordre exact des maillons (celui-ci est relu à la main dans le navigateur).
 */
function ciblePresente(h: string, nom: string): boolean {
  if (!/^[.#[]/.test(nom)) return h.includes(`data-visite="${nom}"`);
  // Un attribut cité (`[data-visite="…"] > :nth-child(2)`) : posé dans la page.
  for (const m of nom.matchAll(/\[data-visite="([^"]+)"\]/g)) if (!h.includes(`data-visite="${m[1]}"`)) return false;
  const elements = [...h.matchAll(/class="([^"]*)"/g)].map((m) => new Set(m[1].split(/\s+/)));
  const maillons = nom.replace(/:not\([^)]*\)/g, "").split(/[\s~>+]+/).filter(Boolean);
  return maillons.every((m) => {
    const classes = [...m.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
    if (!classes.length) return true; // un type seul (`div`)
    return elements.some((el) => classes.every((c) => el.has(c)));
  });
}
const nomsDe = (e: EtapeVisite) => [...[e.cible ?? []].flat(), ...[e.repli ?? []].flat(), ...[e.cibleMobile ?? []].flat()];

const RapideNeuf = EstimateurRapideNeuf as unknown;
const Detaille = Estimateur as unknown;
const DetailleNeuf = EstimateurNeuf as unknown;
/** Un projet de rénovation rouvert, son premier lot ouvert et sa première ligne cochée : « Fait faire » / « Je le fais »
 *  n'apparaissent que sur une ligne cochée. */
const PREMIER_LOT = CATALOG.find((l) => visible(defaultCtx(), l))!;
const RENO_LOT_OUVERT = {
  v: "estimateur", ctx: defaultCtx(), sel: { [key(PREMIER_LOT.c, PREMIER_LOT.t[0].n)]: { on: true } }, open: { [PREMIER_LOT.c]: true }, codePostal: "", custom: [],
};

const ESTIMATEURS: { id: "rapideNeuf" | "detailleReno" | "detailleNeuf"; el: unknown; props: object; ordre: string[]; premiere: string; fichier: string }[] = [
  { id: "rapideNeuf", el: RapideNeuf, props: {}, ordre: ["maison", "champs", "finition", "qui", "options", "budget", "suite"], premiere: "neuf-maison-titre", fichier: "components/neuf/EstimateurRapideNeuf.tsx" },
  { id: "detailleReno", el: Detaille, props: { initialState: RENO_LOT_OUVERT }, ordre: ["bien", "surfaces", "pieces", "finition", "postes", "soi", "total", "suite"], premiere: "detail-bien", fichier: "components/Estimateur.tsx" },
  { id: "detailleNeuf", el: DetailleNeuf, props: {}, ordre: ["maison", "surfaces", "pieces", "technique", "finition", "postes", "soi", "barre"], premiere: "neuf-d-titre", fichier: "components/neuf/EstimateurNeuf.tsx" },
];

describe("rapide neuf, détaillé rénovation, détaillé neuf : chacun sa visite", () => {
  for (const E of ESTIMATEURS) {
    it(`${E.id} : 5 à 8 étapes dans l'ordre de l'écran, chaque cible (et repli) présente, textes de la langue, bouton en haut`, () => {
      for (const l of LOCALES) {
        PROPS.derniers = [];
        const h = rendre(E.el, E.props, l);
        const p = PROPS.derniers.at(-1)!;
        expect(p.id).toBe(E.id);
        const etapes = p.etapes as EtapeVisite[];
        expect(etapes.map((e) => e.id)).toEqual(E.ordre);
        expect(etapes.length).toBeGreaterThanOrEqual(5);
        expect(etapes.length).toBeLessThanOrEqual(8);
        const tv = dictVisite(l)[E.id] as Record<string, { titre: string; texte: string }>;
        // Toutes les entrées du dictionnaire servent, et rien que celles-là.
        expect(Object.keys(tv).sort()).toEqual([...E.ordre].sort());
        for (const e of etapes) {
          expect({ titre: e.titre, texte: e.texte }).toEqual(tv[e.id]);
          expect(e.cible).not.toBeNull(); // jamais une bulle sans cible au milieu de l'écran
          // Le repli des pièces (pastilles du mode « pièces ciblées ») : vérifié dans ce mode, plus bas.
          for (const nom of nomsDe(e)) if (nom !== "detail-pieces-choix") expect(ciblePresente(h, nom), `${E.id} · ${e.id} · ${nom}`).toBe(true);
        }
        expect(h.indexOf("av-visite-aide")).toBeGreaterThan(-1);
        expect(h.indexOf("av-visite-aide")).toBeLessThan(h.indexOf(`data-visite="${E.premiere}"`));
      }
    });

    it(`${E.id} : au téléphone, aucune cible plus haute que l'écran (la grille de compteurs : ses quatre premières cases)`, () => {
      PROPS.derniers = [];
      rendre(E.el, E.props);
      const etapes = PROPS.derniers.at(-1)!.etapes as EtapeVisite[];
      const pieces = etapes.find((e) => e.id === "pieces");
      if (!pieces) return; // le rapide neuf n'a pas de grille
      expect(pieces.cibleMobile).toHaveLength(4);
      for (const c of [pieces.cibleMobile ?? []].flat()) expect(c).toMatch(new RegExp(`^\\[data-visite="${pieces.cible}"\\] > :nth-child\\(\\d\\)$`));
      // Ordinateur : la grille entière ; téléphone : ses premières cases, la même étape au même rang.
      const tout = () => true;
      expect(resoudreEtapes(etapes, tout).find((e) => e.id === "pieces")!.cibles).toEqual([pieces.cible]);
      const m = resoudreEtapes(etapes, tout, true);
      expect(m.find((e) => e.id === "pieces")!.cibles).toEqual(pieces.cibleMobile);
      expect(m.map((e) => e.id)).toEqual(resoudreEtapes(etapes, tout).map((e) => e.id));
    });

    it(`${E.id} : chaque nom data-visite cité est posé dans le code source (ou par une brique qui le reçoit)`, () => {
      PROPS.derniers = [];
      rendre(E.el, E.props);
      const src = lire(E.fichier);
      for (const e of PROPS.derniers.at(-1)!.etapes as EtapeVisite[]) for (const nom of nomsDe(e)) {
        if (/^[.#[]/.test(nom)) continue;
        expect(src.includes(`"${nom}"`), `${E.id} · ${nom}`).toBe(true);
      }
    });

    it(`${E.id} : le formulaire rendu est le même avec la visite, à la rangée du bouton près`, () => {
      const h = rendre(E.el, E.props);
      const sansVisite = h.replace(/<div class="av-visite-barre">[\s\S]*?<\/button><\/div>/, "").replace(/ data-visite="[^"]*"/g, "");
      expect(sansVisite).not.toContain("av-visite");
      expect(sansVisite).not.toContain("data-visite");
    });
  }

  it("les textes du neuf parlent du neuf : aucun mot de la rénovation", () => {
    for (const l of LOCALES) for (const id of ["rapideNeuf", "detailleNeuf"] as const) {
      const t = textes(dictVisite(l)[id]).join(" ");
      expect(t).not.toMatch(l === "fr" ? /r[ée]nov|rafra[iî]ch/i : /renovat|refresh/i);
    }
  });

  it("prérempli (bouton seul, pas d'invitation) : projet rouvert, lien prérempli, retour ; pas une arrivée directe", () => {
    const prerempli = (el: unknown, props: object) => { PROPS.derniers = []; rendre(el, props); return PROPS.derniers.at(-1)?.prerempli; };
    // Rapide neuf : page de prix (`?surface=`, `?niveaux=`, `?cp=`), projet rouvert ; pas une source seule.
    expect(prerempli(RapideNeuf, {})).toBe(false);
    expect(prerempli(RapideNeuf, { initial: { src: "prix-ville" } })).toBe(false);
    expect(prerempli(RapideNeuf, { initial: { surface: 120 } })).toBe(true);
    expect(prerempli(RapideNeuf, { initial: { niveaux: "etage" } })).toBe(true);
    expect(prerempli(RapideNeuf, { initial: { cp: "33000" } })).toBe(true);
    expect(prerempli(RapideNeuf, { edit: { projectId: "p1" }, initialR: { surface: 100, codePostal: "33000" } })).toBe(true);
    // Détaillés : « Modifier » (projectId) → bouton seul ; une page neuve → invitation possible.
    expect(prerempli(Detaille, {})).toBe(false);
    expect(prerempli(Detaille, { initialState: RENO_LOT_OUVERT, projectId: "p1" })).toBe(true);
    expect(prerempli(DetailleNeuf, {})).toBe(false);
    expect(prerempli(DetailleNeuf, { initialState: { v: "neuf-detail" }, projectId: "p1" })).toBe(true);
    // Côté client (effets, hors rendu serveur) : retour de /tarifs, lien de plan, « Affiner », brouillon repris.
    const rn = lire("components/neuf/EstimateurRapideNeuf.tsx");
    expect(rn).toMatch(/const formulaireRempli = !!edit \|\| !!retour \|\| prerempli \|\| !!initial\?\.cp \|\| lienPlanRecu/);
    expect(rn).toMatch(/if \(!h\.startsWith\("#plan="\)\) return;\s*setLienPlanRecu\(true\);/);
    expect(lire("components/Estimateur.tsx")).toMatch(/if \(fromAffiner \|\| Object\.keys\(o\.etat\.sel\)\.length > 0[^)]*\) setRepris\(true\)/);
    const dn = lire("components/neuf/EstimateurNeuf.tsx");
    expect(dn).toMatch(/setCustom\(r\.custom\); origineRef\.current = r\.origine; setRepris\(true\);/);
    expect(dn).toContain("prerempli={edition || repris}");
  });

  it("détaillé rénovation, « Un pro ou toi ? » : sur une ligne cochée, sinon la 1re ligne d'un lot ouvert, sinon le 1er lot", () => {
    const soiDe = (props: object) => {
      PROPS.derniers = [];
      const h = rendre(Detaille, props);
      const etapes = PROPS.derniers.at(-1)!.etapes as EtapeVisite[];
      const l = resoudreEtapes(etapes, (n) => ciblePresente(h, n));
      return { l, cibles: l.find((e) => e.id === "soi")!.cibles };
    };
    // L'arrivée : aucun lot ouvert, aucune ligne. Toutes les étapes restent, la bulle se pose sur le premier lot.
    const arrivee = soiDe({});
    expect(arrivee.l.map((e) => e.id)).toEqual(["bien", "surfaces", "pieces", "finition", "postes", "soi", "total", "suite"]);
    expect(arrivee.cibles).toEqual([".av-estim .tools ~ div .acc-h"]);
    // Un lot ouvert, rien de coché : sa première ligne.
    const ouvert = soiDe({ initialState: { ...RENO_LOT_OUVERT, sel: {} } });
    expect(ouvert.cibles).toEqual([".av-estim .acc.open .trow"]);
    // Une ligne cochée : son « Fait faire » / « Je le fais ».
    expect(soiDe({ initialState: RENO_LOT_OUVERT }).cibles).toEqual([".av-estim .acc.open .trow .choice"]);
    PROPS.derniers = [];
    rendre(Detaille, {});
    const etapes = PROPS.derniers.at(-1)!.etapes as EtapeVisite[];
    // Pièces ciblées : la grille de compteurs n'existe pas, les pastilles des pièces la remplacent.
    const pieces = etapes.find((e) => e.id === "pieces")!;
    const hp = rendre(Detaille, { initialState: { v: "estimateur", ctx: { ...defaultCtx(), perimetre: "piece", espaces: { chambre: [12] } }, sel: {}, open: {}, codePostal: "", custom: [] } });
    expect(ciblePresente(hp, "detail-pieces")).toBe(false);
    expect(ciblePresente(hp, "detail-pieces-choix")).toBe(true);
    const r = resoudreEtapes([pieces], (n) => ciblePresente(hp, n));
    expect(r[0].cibles).toEqual(["detail-pieces-choix"]);
  });

  it("téléphone sans budget (jauge cachée) : le total seul ; vue « Mon devis » : seules les étapes de la barre restent", () => {
    for (const id of ["detailleReno", "detailleNeuf"] as const) {
      PROPS.derniers = [];
      rendre(id === "detailleReno" ? Detaille : DetailleNeuf, {});
      const etapes = PROPS.derniers.at(-1)!.etapes as EtapeVisite[];
      const barre = new Set(etapes.flatMap((e) => [e.cible ?? []].flat()).filter((n) => /(total|devis|enregistrer)$/.test(n)));
      const l = resoudreEtapes(etapes, (n) => barre.has(n));
      expect(l.length).toBeGreaterThan(0);
      for (const e of l) for (const c of e.cibles) expect(c).not.toMatch(/jauge/);
    }
  });

  it("la visite ne touche à rien : aucune requête au rendu des trois estimateurs", () => {
    const fetchOrig = globalThis.fetch;
    const espion = vi.fn();
    globalThis.fetch = espion as never;
    try {
      for (const E of ESTIMATEURS) for (const l of LOCALES) rendre(E.el, E.props, l);
      expect(espion).not.toHaveBeenCalled();
    } finally { globalThis.fetch = fetchOrig; }
  });
});

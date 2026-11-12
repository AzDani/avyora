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
    for (const d of [fr, en]) for (const e of Object.values(d.rapideReno)) {
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

/**
 * Consentement aux cookies publicitaires (CNIL) et Google Ads sous Consent Mode v2 :
 *  - le choix enregistré (lib/consentement.ts) : 6 mois, version, refus par défaut ;
 *  - la balise (lib/gtag.ts) : rien sans consentement ; avec, « denied » par défaut AVANT tout, puis « granted »,
 *    puis config, puis le script ; une conversion ne part jamais sans consentement ;
 *  - le layout ne pose plus la balise lui-même ; le pied de page porte « Gérer mes cookies » et Contact ;
 *  - les pages légales : plus de note interne, plus de « aucun bandeau », Google Ads déclaré.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CLE_CONSENTEMENT,
  DUREE_CONSENTEMENT_MS,
  VERSION_CONSENTEMENT,
  lireChoix,
  serialiserChoix,
} from "@/lib/consentement";

const src = (f: string) => readFileSync(path.join(__dirname, "..", f), "utf8");
const T0 = Date.parse("2026-11-12T10:00:00.000Z");

describe("lib/consentement · le choix enregistré", () => {
  it("relit un choix fraîchement enregistré, accepté comme refusé", () => {
    expect(lireChoix(serialiserChoix("accepte", T0), T0)).toBe("accepte");
    expect(lireChoix(serialiserChoix("refuse", T0), T0 + 1000)).toBe("refuse");
  });

  it("6 mois au plus : au-delà, le bandeau redemande", () => {
    const brut = serialiserChoix("accepte", T0);
    expect(lireChoix(brut, T0 + DUREE_CONSENTEMENT_MS)).toBe("accepte");
    expect(lireChoix(brut, T0 + DUREE_CONSENTEMENT_MS + 1)).toBeNull();
    expect(DUREE_CONSENTEMENT_MS).toBeLessThanOrEqual(183 * 24 * 3600 * 1000);
  });

  it("absent, illisible, autre version, valeur inconnue ou date dans le futur : pas de choix (donc refus par défaut)", () => {
    expect(lireChoix(null, T0)).toBeNull();
    expect(lireChoix("", T0)).toBeNull();
    expect(lireChoix("{pas du json", T0)).toBeNull();
    expect(lireChoix("1", T0)).toBeNull();
    expect(lireChoix(JSON.stringify({ choix: "accepte", le: new Date(T0).toISOString(), v: VERSION_CONSENTEMENT + 1 }), T0)).toBeNull();
    expect(lireChoix(JSON.stringify({ choix: "oui", le: new Date(T0).toISOString(), v: VERSION_CONSENTEMENT }), T0)).toBeNull();
    expect(lireChoix(JSON.stringify({ choix: "accepte", le: "hier", v: VERSION_CONSENTEMENT }), T0)).toBeNull();
    expect(lireChoix(serialiserChoix("accepte", T0 + 3600_000), T0)).toBeNull();
  });
});

/* ─── La balise Google Ads, dans un navigateur simulé ────────────────────────── */

type Fenetre = {
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  __avGtag?: boolean;
  localStorage: Storage;
  location: { hostname: string };
  dispatchEvent: (e: Event) => boolean;
};

function stockage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
  } as Storage;
}

let scripts: { src: string; async: boolean }[];
let fenetre: Fenetre;

function navigateur(choix: "accepte" | "refuse" | null) {
  scripts = [];
  const ls: Record<string, string> = choix ? { [CLE_CONSENTEMENT]: serialiserChoix(choix) } : {};
  fenetre = { localStorage: stockage(ls), location: { hostname: "getavyora.fr" }, dispatchEvent: () => true };
  vi.stubGlobal("window", fenetre);
  vi.stubGlobal("sessionStorage", stockage());
  vi.stubGlobal("document", {
    cookie: "",
    createElement: () => ({ src: "", async: false }),
    head: { appendChild: (s: { src: string; async: boolean }) => scripts.push(s) },
  });
}

/** La file gtag en tableaux lisibles (gtag.js y range des objets `arguments`). */
const file = () => (fenetre.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("lib/gtag · Google Ads seulement avec consentement", () => {
  it("sans choix, ou refusé : aucun script, aucune file, aucune conversion", async () => {
    for (const choix of [null, "refuse"] as const) {
      navigateur(choix);
      const g = await import("@/lib/gtag");
      expect(g.chargerGtag()).toBe(false);
      g.adConversion(g.CONV.abonnement, { value: 169, currency: "EUR", transaction_id: "cs_test_x" });
      g.conversionEstimation("reno");
      expect(scripts).toEqual([]);
      expect(fenetre.dataLayer).toBeUndefined();
      expect(fenetre.gtag).toBeUndefined();
      // L'estimation n'est pas marquée « déjà comptée » : une acceptation plus tard dans la session la laissera partir.
      expect(sessionStorage.getItem("av_conv_estimation_reno")).toBeNull();
    }
  });

  it("accepté : consent default « denied » (4 signaux) en tout premier, puis update « granted », js, config, puis le script", async () => {
    navigateur("accepte");
    const g = await import("@/lib/gtag");
    expect(g.chargerGtag()).toBe(true);
    const f = file();
    expect(f[0][0]).toBe("consent");
    expect(f[0][1]).toBe("default");
    expect(f[0][2]).toMatchObject({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    expect(f[1]).toEqual(["consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" }]);
    expect(f[2][0]).toBe("js");
    expect(f[3]).toEqual(["config", g.AW_ID]);
    expect(scripts).toEqual([{ src: g.GTAG_SRC, async: true }]);
    // Une seule fois par page.
    expect(g.chargerGtag()).toBe(true);
    expect(scripts).toHaveLength(1);
    expect(file()).toHaveLength(4);
  });

  it("accepté : la conversion part APRÈS la configuration, même si la balise n'était pas encore chargée", async () => {
    navigateur("accepte");
    const g = await import("@/lib/gtag");
    g.adConversion(g.CONV.abonnement, { value: 169, currency: "EUR", transaction_id: "cs_test_x" });
    const f = file();
    expect(f.map((a) => a[0])).toEqual(["consent", "consent", "js", "config", "event"]);
    expect(f[4]).toEqual(["event", "conversion", { send_to: g.CONV.abonnement, value: 169, currency: "EUR", transaction_id: "cs_test_x" }]);
    g.conversionEstimation("neuf");
    g.conversionEstimation("neuf");
    expect(file().filter((a) => a[0] === "event")).toHaveLength(2);
  });

  it("retrait du consentement dans la page : tous les signaux repassent à « denied », plus aucune conversion", async () => {
    navigateur("accepte");
    const g = await import("@/lib/gtag");
    const c = await import("@/lib/consentement");
    g.chargerGtag();
    c.enregistrerChoix("refuse");
    g.retirerConsentementGtag();
    expect(file()[4]).toEqual(["consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" }]);
    g.adConversion(g.CONV.estimation);
    expect(file()).toHaveLength(5);
  });

  it("effacerTraceursGoogle : les cookies _gcl_* et la clé _gcl_ls disparaissent, les cookies du site restent", async () => {
    navigateur("refuse");
    const ecrits: string[] = [];
    vi.stubGlobal("document", {
      get cookie() { return "_gcl_au=1.1.2; av-lang=en; _gcl_aw=GCL.1"; },
      set cookie(v: string) { ecrits.push(v); },
    });
    fenetre.localStorage.setItem("_gcl_ls", "x");
    fenetre.localStorage.setItem("av-brouillon", "y");
    const c = await import("@/lib/consentement");
    c.effacerTraceursGoogle();
    expect(ecrits.every((e) => /^_gcl_(au|aw)=; Max-Age=0; path=\//.test(e))).toBe(true);
    expect(ecrits.some((e) => e.includes("domain=.getavyora.fr"))).toBe(true);
    expect(ecrits.some((e) => e.startsWith("av-lang"))).toBe(false);
    expect(fenetre.localStorage.getItem("_gcl_ls")).toBeNull();
    expect(fenetre.localStorage.getItem("av-brouillon")).toBe("y");
  });
});

/* ─── Le code qui pose (ou ne pose plus) la balise ──────────────────────────── */

describe("Layout, pied de page et pages légales", () => {
  it("le layout ne charge plus gtag.js ni son preconnect ; le bandeau est monté", () => {
    const layout = src("app/layout.tsx");
    expect(layout).not.toContain("googletagmanager");
    expect(layout).not.toContain("gtag/js");
    expect(layout).not.toContain("next/script");
    expect(layout).toContain("<ConsentementCookies />");
    expect(layout).toContain("<GererCookies label={t.footer.gererCookies} />");
    expect(layout).toContain('href="mailto:contact@getavyora.fr"');
  });

  it("le bandeau : « Tout refuser » et « Tout accepter » ont exactement les mêmes classes, sans case pré-cochée", () => {
    const b = src("components/ConsentementCookies.tsx");
    const classes = [...b.matchAll(/onClick=\{\(\) => choisir\("(refuse|accepte)"\)\} className="([^"]+)"/g)].map((m) => m[2]);
    expect(classes).toHaveLength(2);
    expect(classes[0]).toBe(classes[1]);
    expect(b).not.toContain("checkbox");
  });

  it("AdConversion passe par adConversion (qui exige le consentement)", () => {
    expect(src("components/AdConversion.tsx")).toContain("adConversion(sendTo, params)");
    expect(src("lib/gtag.ts")).toMatch(/export function adConversion[\s\S]*?if \(!chargerGtag\(\)/);
  });

  it("pages légales : plus de note « base à personnaliser », plus de « aucun bandeau », Google Ads déclaré, avis EN", () => {
    const layout = src("app/(legal)/layout.tsx");
    expect(layout).not.toContain("base à personnaliser");
    expect(layout).not.toContain("fais-le valider");
    expect(layout).toContain("French version is the");
    const cookies = src("app/(legal)/cookies/page.tsx");
    expect(cookies).not.toContain("aucun bandeau");
    expect(cookies).not.toMatch(/aucun cookie de mesure d&apos;audience, de publicité/);
    for (const x of ["Google Ireland Limited", "_gcl_au", "13 mois", "6 mois", "Vercel Analytics", "av-lang", "av-demande", "av-verifier", "Gérer mes cookies"]) {
      expect(cookies).toContain(x);
    }
    const confid = src("app/(legal)/confidentialite/page.tsx");
    for (const x of ["Google Ireland Limited", "13 mois", "Data Privacy Framework", "Retrait du consentement", "Gérer mes cookies"]) {
      expect(confid).toContain(x);
    }
    expect(confid).not.toContain("uniquement des cookies strictement nécessaires");
  });

  it("CGV : plus de « TTC » ni de lien vers la plateforme RLL fermée ; mentions : adresse actuelle de Vercel", () => {
    const cgv = src("app/(legal)/cgv/page.tsx");
    expect(cgv).not.toContain("TTC");
    expect(cgv).not.toContain("ec.europa.eu/consumers/odr");
    expect(cgv).toContain("TVA non applicable, art. 293 B du CGI");
    const ml = src("app/(legal)/mentions-legales/page.tsx");
    expect(ml).toContain("440 N Barranca Avenue #4133, Covina, CA 91723");
    expect(ml).not.toContain("Lemon Ave");
  });
});

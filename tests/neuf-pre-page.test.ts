/**
 * Pré-page « Quel est ton projet ? » (chantier N2) : ce que le rendu des écrans ne montre pas.
 *  - la nature transportée jusqu'au paiement, en liste fermée : `/tarifs` (source ou `?nature=`), le bouton
 *    d'inscription, l'adresse de retour de Stripe, puis `/bienvenue-pro`, qui ramène l'abonné à sa maison ;
 *  - le détaillé neuf : `?new=1` part d'une maison vierge, `?reprise=1` reprend la graine du rapide ;
 *  - la mesure : `clic_nouveau_projet { nature }`, `nature: "reno"` sur `estimation_terminee`, la conversion
 *    Google Ads dédupliquée par nature.
 * Les écrans eux-mêmes (pré-page, surtitre, interrupteur éteint) sont dans `neuf-points-entree.test.ts` et les
 * témoins HTML dans `plans-temoins.test.ts`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { dict } from "@/lib/i18n/dictionaries";
import {
  NATURES, SOURCES_NATURE, lireNature, lireSourceNature, natureDeSource, retoursStripe, choixNature, natureDepuisCible,
} from "@/lib/nature-projet";
import { ouvertureDetailNeuf, repriseDepuisGraine, ctxDetailNeuf, type EtatNeuf } from "@/lib/estimateur/detaille-neuf";
import { brouillonRapideNeuf, type OrigineNeuf } from "@/lib/estimateur/brouillon-neuf";
import { presetNeuf, buildDevis, catalogueDe } from "@/lib/estimateur";

const lire = (f: string) => fs.readFileSync(f, "utf8");
const MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "@/lib/stripe", "@/lib/track", "react"];

/** Charge un module avec l'interrupteur du neuf voulu (et le reste des interrupteurs tels quels). */
async function avecNeuf(neuf: boolean) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, neuf } };
  });
}

beforeEach(() => { for (const m of MOCKS) vi.doUnmock(m); });
afterEach(() => { vi.unstubAllGlobals(); });

/* ─── Liste fermée ───────────────────────────────────────────────────────────── */

describe("lib/nature-projet : liste fermée", () => {
  it("deux natures, quatre sources ; tout le reste est ignoré", () => {
    expect(NATURES).toEqual(["reno", "neuf"]);
    for (const n of NATURES) expect(lireNature(n)).toBe(n);
    for (const x of [undefined, null, "", "NEUF", "neuf ", "autre", ["neuf"], 1, { nature: "neuf" }]) expect(lireNature(x)).toBeUndefined();
    expect(SOURCES_NATURE).toEqual(["affiner-reno", "affiner-neuf", "choix-reno", "choix-neuf"]);
    expect(SOURCES_NATURE.map((s) => natureDeSource(s))).toEqual(["reno", "neuf", "reno", "neuf"]);
    for (const x of ["editeur-plan", "choix-plan", "affiner-pirate", "affiner-neuf&x=1", ""]) {
      expect(lireSourceNature(x)).toBeUndefined();
      expect(natureDeSource(lireSourceNature(x))).toBeUndefined();
    }
  });

  it("lienDetaillePro : la maison du neuf seulement interrupteur allumé, sinon le détaillé rénovation d'avant", async () => {
    await avecNeuf(true);
    let m = await import("@/lib/nature-projet");
    expect(m.lienDetaillePro("neuf")).toBe("/projets/nouveau/construction?reprise=1");
    expect(m.lienDetaillePro("reno")).toBe("/projets/nouveau/detaille?new=1");
    expect(m.lienDetaillePro(undefined)).toBe("/projets/nouveau/detaille?new=1");
    await avecNeuf(false);
    m = await import("@/lib/nature-projet");
    expect(m.lienDetaillePro("neuf")).toBe("/projets/nouveau/detaille?new=1");
  });
});

/* ─── Stripe ─────────────────────────────────────────────────────────────────── */

describe("Stripe : l'adresse de retour porte la nature (liste fermée)", () => {
  const O = "https://getavyora.fr";

  it("retoursStripe : sans nature reconnue, exactement les adresses d'avant", () => {
    const avant = { success_url: `${O}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${O}/tarifs?abo=annule` };
    for (const x of [undefined, null, "", "pirate", "neuf&x=1", ["neuf"], { n: "neuf" }]) expect(retoursStripe(O, x)).toEqual(avant);
    expect(retoursStripe(O, "neuf")).toEqual({
      success_url: `${O}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}&nature=neuf`,
      cancel_url: `${O}/tarifs?abo=annule&nature=neuf`,
    });
    expect(retoursStripe(O, "reno").success_url).toBe(`${O}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}&nature=reno`);
  });

  async function checkout(corps: unknown) {
    vi.resetModules();
    const appels: Record<string, unknown>[] = [];
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u-1", email: "camille@exemple.fr", app_metadata: {} }) }));
    vi.doMock("@/lib/stripe", () => ({
      priceIdForPlan: (p: string) => (p === "annuel" ? "price_annuel" : null),
      getStripe: () => ({ checkout: { sessions: { create: async (p: Record<string, unknown>) => { appels.push(p); return { url: "https://checkout.stripe.test/s" }; } } } }),
    }));
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const res = await POST(new Request(`${O}/api/stripe/checkout`, { method: "POST", body: JSON.stringify(corps) }));
    return { statut: res.status, corps: await res.json(), appels };
  }

  it("la route place la nature du corps dans success_url et cancel_url, et rien d'autre", async () => {
    const neuf = await checkout({ plan: "annuel", nature: "neuf" });
    expect(neuf.statut).toBe(200);
    expect(neuf.appels).toHaveLength(1);
    expect(neuf.appels[0].success_url).toBe(`${O}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}&nature=neuf`);
    expect(neuf.appels[0].cancel_url).toBe(`${O}/tarifs?abo=annule&nature=neuf`);
    for (const nature of [undefined, "pirate", "neuf&next=//evil.example", ["neuf"]]) {
      const r = await checkout({ plan: "annuel", nature });
      expect(r.appels[0].success_url).toBe(`${O}/bienvenue-pro?session_id={CHECKOUT_SESSION_ID}`);
      expect(r.appels[0].cancel_url).toBe(`${O}/tarifs?abo=annule`);
    }
    // Le reste de la session ne bouge pas (abonnement, CGV, métadonnées).
    expect(neuf.appels[0]).toMatchObject({ mode: "subscription", client_reference_id: "u-1", consent_collection: { terms_of_service: "required" } });
    // Une offre inconnue reste refusée avant tout appel à Stripe.
    expect((await checkout({ plan: "pirate", nature: "neuf" })).appels).toHaveLength(0);
  });

  it("BoutonCheckout envoie la nature avec le plan, seulement quand elle est connue", () => {
    const src = lire("components/BoutonCheckout.tsx");
    expect(src).toContain("body: JSON.stringify(nature ? { plan, nature } : { plan }),");
    expect(src).toContain("nature?: NatureProjet");
  });
});

/* ─── /tarifs ────────────────────────────────────────────────────────────────── */

describe("/tarifs : la nature lue de la source (ou de ?nature=)", () => {
  const PRO = { id: "u-pro", email: "alex@exemple.fr", app_metadata: { plan: "pro" } };

  async function tarifs(neuf: boolean, user: unknown, sp: Record<string, string>) {
    await avecNeuf(neuf);
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => "fr", getT: async () => ({ locale: "fr", t: dict("fr") }) }));
    vi.doMock("@/lib/auth", () => ({ getUser: async () => user, estPro: (u: { app_metadata?: { plan?: string } } | null) => u?.app_metadata?.plan === "pro" }));
    const Tarifs = (await import("@/app/tarifs/page")).default;
    return renderToStaticMarkup((await Tarifs({ searchParams: Promise.resolve(sp) })) as ReactElement);
  }
  const dejaPro = (h: string) => h.match(/<a class="font-semibold underline" href="([^"]+)"/)?.[1];

  it("« déjà Pro » : la maison du neuf venue du neuf (interrupteur allumé), sinon le détaillé rénovation", async () => {
    for (const sp of [{ source: "affiner-neuf" }, { source: "choix-neuf" }, { nature: "neuf" }, { abo: "annule", nature: "neuf" }] as Record<string, string>[]) {
      expect(dejaPro(await tarifs(true, PRO, sp))).toBe("/projets/nouveau/construction?reprise=1");
      expect(dejaPro(await tarifs(false, PRO, sp))).toBe("/projets/nouveau/detaille?new=1");
    }
    for (const sp of [{}, { source: "affiner-reno" }, { source: "choix-reno" }, { source: "pirate" }, { nature: "pirate" }, { source: "editeur-plan" }] as Record<string, string>[]) {
      expect(dejaPro(await tarifs(true, PRO, sp))).toBe("/projets/nouveau/detaille?new=1");
    }
  });

  it("inscription : le bouton emporte la nature dans son retour ; sans nature, le HTML d'avant", async () => {
    const avant = await tarifs(true, null, {});
    expect(await tarifs(true, null, { source: "pirate" })).toBe(avant);
    const neuf = await tarifs(true, null, { source: "affiner-neuf" });
    expect(neuf.split("%26nature%3Dneuf")).toHaveLength(3); // les deux offres
    expect(neuf.replaceAll("%26nature%3Dneuf", "")).toBe(avant);
    expect(neuf).toContain('href="/inscription?next=%2Ftarifs%3Fplan%3Dannuel%26nature%3Dneuf"');
    expect(await tarifs(true, null, { plan: "annuel", nature: "neuf" })).toContain("%2Ftarifs%3Fplan%3Dannuel%26nature%3Dneuf");
  });

  it("la mesure vue_tarifs reçoit la source de la nature, quel que soit l'interrupteur des plans", () => {
    const src = lire("app/tarifs/page.tsx");
    expect(src).toContain("const source = (FEATURES.plans ? SOURCES_PLAN.find((s) => s === sourceDemandee) : undefined) ?? sourceNature;");
    expect(src).toContain("...(source ? { source } : {})");
  });
});

/* ─── /bienvenue-pro ─────────────────────────────────────────────────────────── */

describe("/bienvenue-pro : l'abonné venu du neuf retrouve sa maison", () => {
  async function bienvenue(neuf: boolean, sp: Record<string, string>) {
    await avecNeuf(neuf);
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => "fr", getT: async () => ({ locale: "fr", t: dict("fr") }) }));
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u-pro", email: "alex@exemple.fr", app_metadata: { plan: "pro" } }) }));
    const Page = (await import("@/app/bienvenue-pro/page")).default;
    return renderToStaticMarkup((await Page({ searchParams: Promise.resolve(sp) })) as ReactElement);
  }
  const cta = (h: string) => h.match(/<a class="wbtn wbtn-p" href="([^"]+)"/)?.[1];

  it("nature=neuf et interrupteur allumé → la construction reprise ; sinon le détaillé rénovation", async () => {
    const S = { session_id: "cs_test_1" };
    expect(cta(await bienvenue(true, { ...S, nature: "neuf" }))).toBe("/projets/nouveau/construction?reprise=1");
    expect(cta(await bienvenue(false, { ...S, nature: "neuf" }))).toBe("/projets/nouveau/detaille?new=1");
    for (const sp of [S, { ...S, nature: "reno" }, { ...S, nature: "pirate" }, { ...S, nature: "" }] as Record<string, string>[]) {
      expect(cta(await bienvenue(true, sp))).toBe("/projets/nouveau/detaille?new=1");
    }
  });

  it("seul le lien change : le reste de la page est celui d'avant", async () => {
    const S = { session_id: "cs_test_1" };
    const avant = await bienvenue(true, S);
    const neuf = await bienvenue(true, { ...S, nature: "neuf" });
    expect(neuf.replace("/projets/nouveau/construction?reprise=1", "/projets/nouveau/detaille?new=1")).toBe(avant);
    expect(await bienvenue(false, { ...S, nature: "neuf" })).toBe(await bienvenue(false, S));
  });
});

/* ─── Détaillé neuf : ?new=1 vierge, ?reprise=1 reprend la graine ────────────── */

describe("Détaillé neuf · ouverture (?new=1 contre ?reprise=1)", () => {
  const R = { surface: 120, niveaux: "etage" as const, codePostal: "33620", finition: "premium" as const, qui: "partie" as const };
  const P = presetNeuf(R);
  const origine: OrigineNeuf = { source: "plan", contrat: "1.18.4" };
  const graine = JSON.stringify(brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel, origine }));
  const ttcDe = (e: EtatNeuf) => { const ctx = ctxDetailNeuf(e); return buildDevis(catalogueDe(ctx), ctx, e.sel).totaux.ttc; };

  it("?new=1 : la maison par défaut, même avec une graine du rapide en mémoire", () => {
    expect(ouvertureDetailNeuf({ nouveau: true, reprise: false, affiner: null, graine })).toEqual({ frais: true, reprise: null });
    expect(ouvertureDetailNeuf({ nouveau: true, reprise: false, affiner: null, graine: null })).toEqual({ frais: true, reprise: null });
  });

  it("?reprise=1 (retour du paiement) : la maison du rapide, même total, origine gardée", () => {
    const o = ouvertureDetailNeuf({ nouveau: false, reprise: true, affiner: null, graine });
    expect(o.frais).toBe(true);
    const r = o.frais ? o.reprise! : null;
    expect(r).toEqual(repriseDepuisGraine(graine));
    expect(r!.etat.maison).toMatchObject({ surface: 120, niveaux: "etage", codePostal: "33620" });
    expect(r!.origine).toEqual(origine);
    expect(ttcDe(r!.etat)).toBeCloseTo(buildDevis(catalogueDe(P.ctx), P.ctx, P.sel).totaux.ttc, 6);
    // Sans graine (autre appareil), ?reprise=1 retombe sur la maison par défaut.
    expect(ouvertureDetailNeuf({ nouveau: false, reprise: true, affiner: null, graine: null })).toEqual({ frais: true, reprise: null });
    expect(ouvertureDetailNeuf({ nouveau: false, reprise: true, affiner: null, graine: "{" })).toEqual({ frais: true, reprise: null });
  });

  it("« Affiner » passe avant tout : la maison du rapide, l'origine « plan » reprise de la graine", () => {
    const affiner = JSON.stringify({ R: { ...R, surface: 90 } });
    for (const [nouveau, reprise] of [[true, false], [false, true], [false, false]] as const) {
      const o = ouvertureDetailNeuf({ nouveau, reprise, affiner, graine });
      expect(o.frais).toBe(true);
      if (!o.frais) continue;
      expect(o.reprise!.etat.maison.surface).toBe(90);
      expect(o.reprise!.custom).toEqual([]);
      expect(o.reprise!.origine).toEqual(origine);
    }
  });

  it("ni ?new, ni ?reprise, ni « Affiner » : le brouillon du détaillé (rechargement)", () => {
    expect(ouvertureDetailNeuf({ nouveau: false, reprise: false, affiner: null, graine })).toEqual({ frais: false });
  });

  it("le composant lit ?reprise=1, le retire de l'adresse et ne relit plus la graine sur ?new=1", () => {
    const src = lire("components/neuf/EstimateurNeuf.tsx");
    expect(src).toContain('reprise = q.get("reprise") === "1";');
    expect(src).toContain('url.searchParams.delete("reprise")');
    expect(src).toContain("ouvertureDetailNeuf({ nouveau: isNew, reprise, affiner, graine })");
    expect(src).not.toMatch(/repriseDepuisGraine\(/);
  });
});

/* ─── Mesure ─────────────────────────────────────────────────────────────────── */

describe("Mesure : clic_nouveau_projet, estimation_terminee, conversion par nature", () => {
  const carte = (n: string | null) => ({
    closest: (sel: string) => (sel === "[data-choix-nature]" && n !== null ? { getAttribute: (a: string) => (a === "data-choix-nature" ? n : null) } : null),
  });

  it("natureDepuisCible : la carte (ou son ancêtre) en liste fermée", () => {
    expect(choixNature("neuf")).toEqual({ "data-choix-nature": "neuf" });
    expect(natureDepuisCible(carte("reno") as unknown as EventTarget)).toBe("reno");
    expect(natureDepuisCible(carte("neuf") as unknown as EventTarget)).toBe("neuf");
    for (const c of [carte("pirate"), carte(""), carte(null), null, {}]) expect(natureDepuisCible(c as unknown as EventTarget)).toBeUndefined();
  });

  it("SuiviChoixNature : clic ou clic du milieu sur une carte → clic_nouveau_projet{nature} ; rien d'autre", async () => {
    vi.resetModules();
    const emis: unknown[] = [];
    vi.doMock("@/lib/track", () => ({ suivre: (n: string, p: unknown) => emis.push([n, p]) }));
    // Sans DOM : l'effet s'exécute à l'appel, et le document simulé garde les écoutes.
    vi.doMock("react", async (orig) => {
      const m = await orig<typeof import("react")>();
      return { ...m, useEffect: (f: () => void) => { f(); } };
    });
    const ecoutes: Record<string, { f: (e: unknown) => void; capture: unknown }> = {};
    vi.stubGlobal("document", {
      addEventListener: (t: string, f: (e: unknown) => void, capture: unknown) => { ecoutes[t] = { f, capture }; },
      removeEventListener: () => {},
    });
    const Suivi = (await import("@/components/SuiviChoixNature")).default;
    expect(Suivi()).toBeNull();
    expect(ecoutes.click.capture).toBe(true);
    ecoutes.click.f({ type: "click", button: 0, target: carte("neuf") });
    ecoutes.auxclick.f({ type: "auxclick", button: 1, target: carte("reno") });
    ecoutes.auxclick.f({ type: "auxclick", button: 2, target: carte("reno") }); // clic droit : rien
    ecoutes.click.f({ type: "click", button: 0, target: carte("pirate") });
    ecoutes.click.f({ type: "click", button: 0, target: carte(null) });
    expect(emis).toEqual([["clic_nouveau_projet", { nature: "neuf" }], ["clic_nouveau_projet", { nature: "reno" }]]);
  });

  it("la pré-page monte l'écoute ; chaque carte porte son attribut", () => {
    const src = lire("components/ChoixNature.tsx");
    expect(src.match(/<SuiviChoixNature \/>/g)).toHaveLength(1);
    expect(src).toContain('{...choixNature("reno")}');
    expect(src).toContain('{...choixNature("neuf")}');
    expect(src).not.toMatch(/from "@\/lib\/auth"|getUser\(|<SuiviVue/);
  });

  it("estimation_terminee : nature « reno » sur les trois envois de la rénovation, « neuf » sur ceux du neuf", () => {
    const reno = lire("components/EstimateurRapide.tsx");
    const envois = reno.match(/suivre\("estimation_terminee", \{[^}]*\}\)/g) ?? [];
    expect(envois).toHaveLength(3);
    for (const e of envois) expect(e).toContain('nature: "reno"');
    const neuf = lire("components/neuf/EstimateurRapideNeuf.tsx");
    const envoisNeuf = neuf.match(/suivre\("estimation_terminee", \{[^}]*\}\)/g) ?? [];
    expect(envoisNeuf).toHaveLength(3);
    for (const e of envoisNeuf) expect(e).toContain('nature: "neuf"');
    expect(reno.match(/conversionEstimation\("reno"\)/g)).toHaveLength(3);
    expect(neuf.match(/conversionEstimation\("neuf"\)/g)).toHaveLength(3);
  });

  it("Google Ads : une conversion par session ET par nature", async () => {
    vi.resetModules();
    const envoyes: unknown[] = [];
    const stock = new Map<string, string>();
    vi.stubGlobal("window", { gtag: (...a: unknown[]) => envoyes.push(a) });
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => stock.get(k) ?? null, setItem: (k: string, v: string) => void stock.set(k, v) });
    const { conversionEstimation, CONV } = await import("@/lib/gtag");
    conversionEstimation("reno");
    conversionEstimation("reno"); // Affiner puis Enregistrer : un seul lead
    conversionEstimation("neuf"); // un second projet, d'une autre nature
    conversionEstimation("neuf");
    expect(envoyes).toHaveLength(2);
    for (const a of envoyes) expect(a).toEqual(["event", "conversion", { send_to: CONV.estimation, value: 1.0, currency: "EUR" }]);
    expect([...stock.keys()].sort()).toEqual(["av_conv_estimation_neuf", "av_conv_estimation_reno"]);
  });
});

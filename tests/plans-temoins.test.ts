/**
 * Témoins de l'éditeur de plan en ligne (chantier C0 du plan « Mes plans »).
 *
 * Fige le HTML rendu, interrupteur `FEATURES.plans` ÉTEINT, de toutes les surfaces que les
 * chantiers suivants vont toucher : en-tête desktop (et pied de page), menu mobile ouvert,
 * accueil, écran de choix, Tarifs, « Mes projets », fiche projet et sitemap. Les références
 * vivent dans `tests/__snapshots__/plans-temoins.test.ts.snap` : interrupteur éteint, chaque
 * chantier doit les retrouver au caractère près.
 *
 * Rendu par `prerender` (react-dom/static) et non `renderToStaticMarkup` : les pages contiennent
 * des composants serveur asynchrones imbriqués (AuthNav, MobileNav, ResultatRapide…), que seul
 * le rendu en flux sait attendre. Ainsi rien n'est remplacé par un bouchon dans les surfaces figées.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { dict } from "@/lib/i18n/dictionaries";
import { presetRapide } from "@/lib/estimateur/presets";
import { presetNeuf } from "@/lib/estimateur/presets-neuf";

type Locale = "fr" | "en";
type Utilisateur = "anonyme" | "gratuit" | "pro" | "admin";
const LOCALES = ["fr", "en"] as const;
const vide = () => null;

/* ─── Données figées ─────────────────────────────────────────────────────────── */

const MAINTENANT = new Date("2026-10-12T10:00:00.000Z");

const UTILISATEURS: Record<Utilisateur, unknown> = {
  anonyme: null,
  gratuit: { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {} },
  pro: { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" } },
  admin: { id: "u-admin", email: "admin@exemple.fr", user_metadata: {}, app_metadata: {} },
};
const estAdmin = (u: unknown) => (u as { email?: string } | null)?.email === "admin@exemple.fr";
const estPro = (u: unknown) =>
  !!u && (estAdmin(u) || (u as { app_metadata?: { plan?: string } }).app_metadata?.plan === "pro");

const renoRapide = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
const neuf = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
const R_NEUF = { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" };

const ligne = (n: number, nom: string, reponses: Record<string, unknown>, archived = false, type_bien = "Maison") => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  nom, type_bien, surface: 100, code_postal: "45000", reponses, archived,
  created_at: `2026-10-0${n}T09:00:00.000Z`,
});

const PROJETS = {
  renoRapide: ligne(1, "Maison Orléans · rapide", { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: renoRapide.ctx, sel: renoRapide.sel, codePostal: "45000" }),
  renoDetaille: ligne(2, "Maison Orléans · détaillée", { v: "estimateur", mode: "detaille", ctx: renoRapide.ctx, sel: renoRapide.sel, codePostal: "45000", qui: "pros" }),
  neufRapide: ligne(3, "Maison neuve · rapide", { v: "estimateur", mode: "rapide", qui: "pros", ctx: neuf.ctx, sel: neuf.sel, codePostal: "45000", R: R_NEUF }),
  neufDetaille: ligne(4, "Maison neuve · détaillée", { v: "estimateur", mode: "detaille", ctx: neuf.ctx, sel: neuf.sel, codePostal: "45000", qui: "pros" }),
  archive: ligne(5, "Ancien projet", { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: renoRapide.ctx, sel: renoRapide.sel, codePostal: "45000" }, true),
};
type CleProjet = keyof typeof PROJETS;

/* ─── Chargement des modules, interrupteurs et dépendances simulés ───────────── */

const MOCKS = [
  "@/lib/features", "@/lib/i18n/server", "@/lib/auth", "@/lib/data/projects", "next/navigation",
  "next/font/google", "next/script", "@vercel/analytics/react", "@/app/globals.css", "server-only", "react",
  "@/lib/supabase/server",
];

/** Tables lues par la session simulée (C8 : interrupteur éteint, aucune requête plans). */
const APPELS: string[] = [];

type Options = { plans: boolean; locale: Locale; user?: Utilisateur; projets?: CleProjet[]; menuOuvert?: boolean };

async function charger({ plans, locale, user = "anonyme", projets = [], menuOuvert = false }: Options) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    /* Le neuf est en ligne : les témoins figent le site tel qu'il est servi aujourd'hui. */
    return { ...m, FEATURES: { ...m.FEATURES, neuf: true, plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({
    getLocale: async () => locale,
    getT: async () => ({ locale, t: dict(locale) }),
  }));
  vi.doMock("@/lib/auth", () => ({ getUser: async () => UTILISATEURS[user], estPro, estAdmin }));
  const lignes = projets.map((k) => PROJETS[k]);
  vi.doMock("@/lib/data/projects", () => ({
    listProjets: async (archived: boolean) => lignes.filter((p) => p.archived === archived),
    getProjet: async (id: string) => lignes.find((p) => p.id === id) ?? null,
  }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const routeur = { push: vide, replace: vide, refresh: vide, back: vide, forward: vide, prefetch: vide };
    return { ...m, useRouter: () => routeur, usePathname: () => "/", useSearchParams: () => new URLSearchParams() };
  });
  vi.doMock("server-only", () => ({}));
  /* Session Supabase simulée, sans aucune ligne (« Mes plans » : ni plan ni lien). Elle note les tables lues. */
  vi.doMock("@/lib/supabase/server", () => ({
    supabaseServer: async () => ({
      from(table: string) {
        APPELS.push(table);
        const vide = { data: [], count: 0, error: null };
        const q: Record<string, unknown> = {
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(vide).then(ok, ko),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        };
        for (const m of ["select", "eq", "in", "order", "limit"]) q[m] = () => q;
        return q;
      },
    }),
  }));
  /* Coque : polices, balise Ads et mesure d'audience hors sujet (elles ne portent aucun texte). */
  vi.doMock("next/font/google", () => ({ Geist: () => ({ variable: "" }), Geist_Mono: () => ({ variable: "" }) }));
  vi.doMock("next/script", () => ({ default: vide }));
  vi.doMock("@vercel/analytics/react", () => ({ Analytics: vide }));
  vi.doMock("@/app/globals.css", () => ({}));
  /* Menu mobile : il s'ouvre au clic. Pour le figer ouvert, son état initial `false` part à `true`. */
  if (menuOuvert) {
    vi.doMock("react", async (orig) => {
      const m = await orig<typeof import("react")>();
      const useState = ((init: unknown) => m.useState(init === false ? true : init)) as typeof m.useState;
      return { ...m, useState, default: { ...m, useState } };
    });
  }
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  return {
    rendre: async (el: ReactNode) => html(createElement(LangProvider, { locale, children: el })),
  };
}

async function html(el: ReactElement): Promise<string> {
  const { prelude } = await prerender(el);
  return await new Response(prelude).text();
}

const entre = (s: string, debut: string, fin: string) => {
  const i = s.indexOf(debut), j = s.indexOf(fin, i);
  expect(i).toBeGreaterThanOrEqual(0);
  expect(j).toBeGreaterThan(i);
  return s.slice(i, j + fin.length);
};

beforeEach(() => {
  APPELS.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MAINTENANT);
});
afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/* ─── Surfaces ───────────────────────────────────────────────────────────────── */

const PLANS = false;

describe("Témoins · interrupteur plans éteint", () => {
  it("en-tête desktop et pied de page (FR, EN ; anonyme, gratuit, Pro, admin)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
        const r = await charger({ plans: PLANS, locale, user });
        const Layout = (await import("@/app/layout")).default;
        const page = await r.rendre(await Layout({ children: createElement("p", null, "contenu") }));
        expect(entre(page, "<header", "</header>")).toMatchSnapshot(`en-tête ${locale} ${user}`);
        expect(entre(page, "<footer", "</footer>").replace(/© \d{4}/, "© ANNÉE")).toMatchSnapshot(`pied ${locale} ${user}`);
      }
    }
  });

  it("menu mobile ouvert (FR, EN ; anonyme, gratuit, Pro, admin)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
        const r = await charger({ plans: PLANS, locale, user, menuOuvert: true });
        const { MobileNav } = await import("@/components/MobileNav");
        const menu = await r.rendre(createElement(MobileNav));
        expect(menu).toContain('aria-expanded="true"');
        expect(menu).toMatchSnapshot(`menu ${locale} ${user}`);
      }
    }
  });

  it("accueil (FR, EN)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ plans: PLANS, locale });
      const Accueil = (await import("@/app/page")).default;
      expect(await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }))).toMatchSnapshot(`accueil ${locale}`);
    }
  });

  it("écran de choix (FR, EN ; rénovation, neuf ; gratuit, Pro)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ plans: PLANS, locale });
      const Choix = (await import("@/components/ChoixEstimation")).default;
      for (const nature of ["reno", "neuf"] as const) {
        for (const isPro of [false, true]) {
          const h = await r.rendre(await Choix({ isPro, nature }));
          expect(h).toMatchSnapshot(`choix ${locale} ${nature} ${isPro ? "pro" : "gratuit"}`);
        }
      }
    }
  });

  it("Tarifs (FR, EN ; anonyme, gratuit, Pro)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro"] as const) {
        const r = await charger({ plans: PLANS, locale, user });
        const Tarifs = (await import("@/app/tarifs/page")).default;
        expect(await r.rendre(await Tarifs({ searchParams: Promise.resolve({}) }))).toMatchSnapshot(`tarifs ${locale} ${user}`);
      }
    }
  });

  it("« Mes projets » : vide, puis réno rapide + détaillée + neuf + archivé (FR, EN ; gratuit, Pro)", async () => {
    const tous: CleProjet[] = ["renoRapide", "renoDetaille", "neufRapide", "neufDetaille", "archive"];
    for (const locale of LOCALES) {
      for (const user of ["gratuit", "pro"] as const) {
        for (const [nom, projets] of [["vide", []], ["plein", tous]] as const) {
          const r = await charger({ plans: PLANS, locale, user, projets: [...projets] });
          const Projets = (await import("@/app/projets/page")).default;
          const h = await r.rendre(await Projets());
          expect(h).toMatchSnapshot(`projets ${locale} ${user} ${nom}`);
          expect(APPELS).toEqual([]);
        }
      }
    }
  });

  it("fiche projet : réno rapide, réno détaillée, neuf rapide, neuf détaillé (FR, EN ; gratuit, Pro)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["gratuit", "pro"] as const) {
        for (const cle of ["renoRapide", "renoDetaille", "neufRapide", "neufDetaille"] as const) {
          const r = await charger({ plans: PLANS, locale, user, projets: [cle] });
          const Fiche = (await import("@/app/projets/[id]/page")).default;
          const h = await r.rendre(await Fiche({ params: Promise.resolve({ id: PROJETS[cle].id }) }));
          expect(h).toContain(PROJETS[cle].nom);
          expect(h).toMatchSnapshot(`fiche ${locale} ${user} ${cle}`);
          expect(APPELS).toEqual([]);
        }
      }
    }
  });

  it("sitemap", async () => {
    await charger({ plans: PLANS, locale: "fr" });
    const sitemap = (await import("@/app/sitemap")).default;
    const entrees = sitemap().map((e) =>
      [e.url, e.priority, e.changeFrequency, e.lastModified instanceof Date ? e.lastModified.toISOString() : e.lastModified].join(" | "));
    expect(entrees.length).toBeGreaterThan(50);
    expect(entrees.join("\n")).toMatchSnapshot("sitemap");
  });
});

describe("Interrupteur plans", () => {
  it("allumé par défaut (C11), éteint seulement par NEXT_PUBLIC_FEATURE_PLANS=0", async () => {
    for (const [valeur, attendu] of [[undefined, true], ["", true], ["0", false], ["true", true], ["1", true]] as const) {
      vi.resetModules();
      if (valeur === undefined) vi.stubEnv("NEXT_PUBLIC_FEATURE_PLANS", undefined as unknown as string);
      else vi.stubEnv("NEXT_PUBLIC_FEATURE_PLANS", valeur);
      const { FEATURES } = await import("@/lib/features");
      expect(FEATURES.plans).toBe(attendu);
      vi.unstubAllEnvs();
    }
  });
});

/* ─── C4 : les en-têtes du site et le matcher du proxy ─────────────────────────
   L'éditeur hébergé sur /plan reçoit sa propre CSP (seconde entrée de headers()). La première entrée,
   celle de tout le site, doit rester identique au caractère près ; le proxy, qui n'exclut plus que les
   fichiers statiques de /vendor et /fonts, doit toujours couvrir les routes privées et l'API. */
describe("Témoins · en-têtes du site et matcher du proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  for (const env of ["production", "development"] as const) {
    it(`headers() : l'entrée « /:path* » ne change pas (${env})`, async () => {
      vi.resetModules();
      vi.stubEnv("NODE_ENV", env);
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
      const { default: config } = await import("../next.config");
      const entrees = await config.headers!();
      expect(entrees[0].source).toBe("/:path*");
      expect(entrees[0]).toMatchSnapshot(`headers /:path* ${env}`);
    });
  }

  it("le matcher du proxy couvre toujours les pages, les routes privées et l'API", async () => {
    vi.resetModules();
    const { config } = await import("../proxy");
    const re = config.matcher.map((m: string) => new RegExp(`^${m}$`));
    const couvert = (p: string) => re.some((r: RegExp) => r.test(p));
    for (const p of ["/", "/projets", "/projets/abc", "/admin", "/admin/prix", "/estimation-travaux",
      "/api/projects", "/api/projects/abc", "/api/plans", "/plan", "/mon-espace", "/tarifs"]) {
      expect(couvert(p), p).toBe(true);
    }
    for (const p of ["/_next/static/x.js", "/favicon.ico", "/logo.png", "/vendor/three@0.147.0/build/three.min.js",
      "/fonts/geist/Geist-Variable.woff2"]) {
      expect(couvert(p), p).toBe(false);
    }
  });
});

/** Retire (une fois, et une seule) le lien de C8 de la liste vide. */
function sansLienDessiner(h: string): string {
  const re = /<a class="[^"]*" data-dessiner-plan="" data-clic-plan="projets" href="\/logiciel-plan-maison">[^<]+<\/a>/g;
  expect(h.match(re)?.length ?? 0).toBe(1);
  return h.replace(re, "");
}

/* ─── C5 : « Mes plans » monté sur /projets et /inscription ────────────────────
   Interrupteur ALLUMÉ, sans drapeau ni plan local : ClaimPlan et PlanRappel ne rendent rien côté serveur.
   /projets et /inscription doivent donc rendre exactement le même HTML qu'interrupteur éteint. */
describe("Témoins · C5, interrupteur allumé sans plan local", () => {
  it("/projets : même HTML qu'interrupteur éteint (FR, EN ; gratuit, Pro ; vide, plein)", async () => {
    const tous: CleProjet[] = ["renoRapide", "renoDetaille", "neufRapide", "neufDetaille", "archive"];
    for (const locale of LOCALES) {
      for (const user of ["gratuit", "pro"] as const) {
        for (const projets of [[], tous]) {
          const rendu: string[] = [];
          for (const plans of [false, true]) {
            const r = await charger({ plans, locale, user, projets: [...projets] });
            const Projets = (await import("@/app/projets/page")).default;
            rendu.push(await r.rendre(await Projets()));
          }
          /* C8 : liste vide et aucun plan, le seul ajout est le lien secondaire « ou commence par dessiner ton plan ». */
          const allume = projets.length ? rendu[1] : sansLienDessiner(rendu[1]);
          expect(allume).toBe(rendu[0]);
        }
      }
    }
  });

  it("/inscription : même HTML qu'interrupteur éteint, avec ou sans next=/plan (FR, EN)", async () => {
    for (const locale of LOCALES) {
      for (const next of [undefined, "/plan", "/tarifs"]) {
        const rendu: string[] = [];
        for (const plans of [false, true]) {
          const r = await charger({ plans, locale });
          const Inscription = (await import("@/app/inscription/page")).default;
          rendu.push(await r.rendre(await Inscription({ searchParams: Promise.resolve(next ? { next } : {}) })));
        }
        expect(rendu[0]).toContain("<form");
        expect(rendu[1]).toBe(rendu[0]);
      }
    }
  });
});

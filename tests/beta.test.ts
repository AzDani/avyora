/**
 * Bêta gratuite (chantier B1, lib/beta.ts) : tout AVYORA offert aux inscrits jusqu'à la fin du 31/12/2026,
 * heure de Paris.
 *
 *  1. Les dates : la veille, le jour J, le lendemain, le fuseau (minuit à Paris n'est pas minuit UTC), le
 *     réglage NEXT_PUBLIC_BETA_FIN et la coupure NEXT_PUBLIC_BETA=0.
 *  2. Les droits : `estPro` pendant et après la bêta, `estAbonne` qui ne bouge pas.
 *  3. Un anonyme qui touche une fonction Pro va créer son compte (et plus payer) ; aucune vente pendant la bêta.
 *  4. Témoins pendant la bêta : Tarifs, écrans de choix, accueil, inscription, en-tête, « Mes projets »
 *     (références dans tests/__snapshots__/beta.test.ts.snap, créées volontairement).
 *  5. APRÈS LA BÊTA (date simulée) : les mêmes surfaces rendent EXACTEMENT les références d'aujourd'hui, celles
 *     de tests/__snapshots__/plans-temoins.test.ts.snap, relues telles quelles et comparées au caractère près.
 *
 * vitest.config.ts coupe la bêta par défaut (NEXT_PUBLIC_BETA=0) : ce fichier la rallume (« 1 ») et fixe
 * l'heure, pour ne dépendre ni du jour où la suite tourne ni de l'environnement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import fs from "node:fs";
import path from "node:path";
import { Script } from "node:vm";
import { dict } from "@/lib/i18n/dictionaries";
import { presetRapide } from "@/lib/estimateur/presets";
import { presetNeuf } from "@/lib/estimateur/presets-neuf";
import {
  betaActive, finBeta, lireFinBeta, libellesBeta, estMembreFondateur, minuitParis,
  lienInscriptionBeta, lireSourceBeta, SOURCES_BETA, PLANS_MAX_BETA, betaEditeurPlan, dateInsecable,
} from "@/lib/beta";

vi.mock("server-only", () => ({}));

type Locale = "fr" | "en";
const LOCALES = ["fr", "en"] as const;
const vide = () => null;
/** Un texte tel que React l'écrit dans le HTML (apostrophes, guillemets, chevrons et esperluettes échappés). */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

/* ─── Les instants qui comptent (heure de Paris = UTC+1 en hiver) ───────────── */

const PENDANT = new Date("2026-10-12T10:00:00.000Z"); // l'heure des témoins (plans-temoins.test.ts)
const VEILLE = new Date("2026-12-30T11:00:00.000Z"); // 30/12, midi à Paris
const JOUR_J_FIN = new Date("2026-12-31T22:59:59.999Z"); // 31/12, 23:59:59,999 à Paris
const LENDEMAIN = new Date("2026-12-31T23:00:00.000Z"); // 01/01/2027, 00:00 à Paris : la bêta est finie
const APRES = new Date("2027-03-15T09:00:00.000Z");

function bêta(etat: "allumée" | "coupée" = "allumée", fin?: string) {
  vi.stubEnv("NEXT_PUBLIC_BETA", etat === "allumée" ? "1" : "0");
  vi.stubEnv("NEXT_PUBLIC_BETA_FIN", fin ?? "");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/* ─── 1. Les dates ───────────────────────────────────────────────────────────── */

describe("lib/beta : la date de fin", () => {
  it("la bêta court jusqu'à la fin du 31/12/2026, heure de Paris : veille, jour J, lendemain", () => {
    bêta();
    expect(finBeta().toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(betaActive(PENDANT)).toBe(true);
    expect(betaActive(VEILLE)).toBe(true);
    expect(betaActive(JOUR_J_FIN)).toBe(true);
    expect(betaActive(LENDEMAIN)).toBe(false);
    expect(betaActive(APRES)).toBe(false);
  });

  it("le fuseau : à 23 h 30 UTC le 31/12, il est déjà 00 h 30 à Paris (bêta finie) ; à 22 h 30 UTC, 23 h 30 (bêta en cours)", () => {
    bêta();
    expect(betaActive(new Date("2026-12-31T23:30:00Z"))).toBe(false);
    expect(betaActive(new Date("2026-12-31T22:30:00Z"))).toBe(true);
    // Un 31/12 lu comme « minuit UTC » aurait fini la bêta une heure trop tard.
    expect(betaActive(new Date("2026-12-31T23:59:00Z"))).toBe(false);
  });

  it("sans argument, betaActive lit l'horloge", () => {
    bêta();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(JOUR_J_FIN);
    expect(betaActive()).toBe(true);
    vi.setSystemTime(LENDEMAIN);
    expect(betaActive()).toBe(false);
  });

  it("NEXT_PUBLIC_BETA_FIN : le dernier jour (hiver, été), un instant avec fuseau ; une valeur illisible garde le 31/12/2026", () => {
    bêta("allumée", "2027-01-31");
    expect(finBeta().toISOString()).toBe("2027-01-31T23:00:00.000Z");
    expect(betaActive(APRES)).toBe(false);
    expect(betaActive(new Date("2027-01-31T22:00:00Z"))).toBe(true);
    // Heure d'été : minuit à Paris = 22 h UTC.
    expect(lireFinBeta("2027-06-30")?.toISOString()).toBe("2027-06-30T22:00:00.000Z");
    expect(lireFinBeta("2027-03-27")?.toISOString()).toBe("2027-03-27T23:00:00.000Z"); // la nuit du passage à l'heure d'été
    expect(lireFinBeta("2027-01-15T18:00:00+01:00")?.toISOString()).toBe("2027-01-15T17:00:00.000Z");
    expect(lireFinBeta("2027-01-15T18:00:00Z")?.toISOString()).toBe("2027-01-15T18:00:00.000Z");
    for (const x of ["", "demain", "2027-02-30", "2027-13-01", "2027-01-15T18:00:00", "31/12/2026", undefined]) {
      expect(lireFinBeta(x), String(x)).toBeNull();
    }
    bêta("allumée", "n'importe quoi");
    expect(finBeta().toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("NEXT_PUBLIC_BETA=0 coupe la bêta tout de suite (et masque les membres fondateurs)", () => {
    bêta("coupée");
    expect(betaActive(PENDANT)).toBe(false);
    expect(estMembreFondateur({ email_confirmed_at: "2026-10-01T10:00:00Z" })).toBe(false);
  });

  it("minuit à Paris, hiver et été (le jour peut déborder sur le mois suivant)", () => {
    expect(minuitParis(2027, 1, 1).toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(minuitParis(2026, 12, 32).toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(minuitParis(2026, 7, 1).toISOString()).toBe("2026-06-30T22:00:00.000Z");
    // Le lendemain du passage à l'heure d'hiver (25/10/2026) : minuit à Paris = 23 h UTC la veille.
    expect(minuitParis(2026, 10, 26).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("les textes datés suivent la fin ; aucun tarif chiffré (décision de Dani du 16/10/2026) ; la date d'un seul tenant", () => {
    bêta();
    expect(libellesBeta("fr")).toEqual({ fin: "31 décembre 2026", reprise: "1er janvier 2027" });
    expect(libellesBeta("en")).toEqual({ fin: "December 31, 2026", reprise: "January 1, 2027" });
    bêta("allumée", "2027-03-31");
    expect(libellesBeta("fr")).toMatchObject({ fin: "31 mars 2027", reprise: "1er avril 2027" });
    // Plus de constante du tarif fondateur : la promesse est sans chiffre.
    expect(Object.keys(libellesBeta("fr"))).not.toContain("tarif");
    expect(dateInsecable("31 décembre 2026")).toBe("31\u00a0décembre\u00a02026");
    expect(dateInsecable("December 31, 2026")).toBe("December\u00a031,\u00a02026");
    expect(PLANS_MAX_BETA).toBe(30);
  });

  it("membre fondateur : un compte dont l'adresse est confirmée avant la fin de la bêta, et il le reste après", () => {
    bêta();
    expect(estMembreFondateur({ email_confirmed_at: "2026-10-01T10:00:00Z" })).toBe(true);
    expect(estMembreFondateur({ email_confirmed_at: "2026-12-31T22:59:00Z" })).toBe(true);
    expect(estMembreFondateur({ email_confirmed_at: "2026-12-31T23:00:00Z" })).toBe(false);
    expect(estMembreFondateur({ email_confirmed_at: "2027-02-01T10:00:00Z" })).toBe(false);
    // Créé pendant la bêta (par n'importe qui, à l'adresse de n'importe qui) mais confirmé en 2027 : pas fondateur.
    expect(estMembreFondateur({ created_at: "2026-10-01T10:00:00Z", email_confirmed_at: "2027-01-05T10:00:00Z" } as { email_confirmed_at: string })).toBe(false);
    expect(estMembreFondateur({ created_at: "2026-10-01T10:00:00Z" } as { email_confirmed_at?: string })).toBe(false);
    for (const u of [null, undefined, {}, { email_confirmed_at: null }, { email_confirmed_at: "pas une date" }]) expect(estMembreFondateur(u)).toBe(false);
  });

  it("l'adresse de l'inscription : l'intention encodée, la source de la liste fermée", () => {
    expect(lienInscriptionBeta("/projets/nouveau/detaille?affiner=1", "affiner-reno"))
      .toBe("/inscription?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1&source=affiner-reno");
    expect(lienInscriptionBeta(undefined, "multi-pieces")).toBe("/inscription?source=multi-pieces");
    for (const s of SOURCES_BETA) expect(lireSourceBeta(s)).toBe(s);
    for (const x of [undefined, "", "pirate", "tarifs ", ["tarifs"], 1]) expect(lireSourceBeta(x)).toBeUndefined();
  });
});

/* ─── 2. Les droits ──────────────────────────────────────────────────────────── */

const GRATUIT = { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {}, created_at: "2026-10-01T09:00:00.000Z", email_confirmed_at: "2026-10-01T09:01:00.000Z" };
const ABONNE = { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" }, created_at: "2026-09-01T09:00:00.000Z", email_confirmed_at: "2026-09-01T09:01:00.000Z" };

describe("lib/auth : estPro pendant et après la bêta", () => {
  async function auth() {
    vi.resetModules();
    return await import("@/lib/auth");
  }
  type U = Parameters<Awaited<ReturnType<typeof auth>>["estPro"]>[0];

  it("pendant la bêta, tout connecté est Pro ; après, seulement l'abonné (comme avant) ; l'anonyme jamais", async () => {
    bêta();
    const { estPro, estAbonne } = await auth();
    for (const t of [PENDANT, VEILLE, JOUR_J_FIN]) {
      expect(estPro(GRATUIT as unknown as U, t)).toBe(true);
      expect(estPro(ABONNE as unknown as U, t)).toBe(true);
      expect(estPro(null, t)).toBe(false);
    }
    for (const t of [LENDEMAIN, APRES]) {
      expect(estPro(GRATUIT as unknown as U, t)).toBe(false);
      expect(estPro(ABONNE as unknown as U, t)).toBe(true);
      expect(estPro(null, t)).toBe(false);
    }
    // estAbonne ne dépend pas de la bêta : c'est le statut Pro d'avant.
    expect(estAbonne(GRATUIT as unknown as U)).toBe(false);
    expect(estAbonne(ABONNE as unknown as U)).toBe(true);
  });

  it("sans date, estPro lit l'horloge ; PRO_EMAILS et ADMIN_EMAILS restent Pro après la bêta", async () => {
    bêta();
    vi.stubEnv("PRO_EMAILS", "manuel@exemple.fr");
    vi.stubEnv("ADMIN_EMAILS", "admin@exemple.fr");
    const { estPro, estAbonne } = await auth();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(PENDANT);
    expect(estPro(GRATUIT as unknown as U)).toBe(true);
    vi.setSystemTime(LENDEMAIN);
    expect(estPro(GRATUIT as unknown as U)).toBe(false);
    for (const email of ["manuel@exemple.fr", "admin@exemple.fr"]) {
      const u = { ...GRATUIT, email } as unknown as U;
      expect(estPro(u)).toBe(true);
      expect(estAbonne(u)).toBe(true);
    }
  });

  it("pendant la bêta, une adresse non confirmée ou un compte anonyme n'ont pas les droits (on ne s'en remet pas aux réglages de Supabase)", async () => {
    bêta();
    const { estPro } = await auth();
    const nonConfirme = { ...GRATUIT, email_confirmed_at: null } as unknown as U;
    const anonyme = { ...GRATUIT, email: undefined, email_confirmed_at: null, is_anonymous: true } as unknown as U;
    const anonymeConfirme = { ...GRATUIT, is_anonymous: true } as unknown as U;
    for (const u of [nonConfirme, anonyme, anonymeConfirme]) expect(estPro(u, PENDANT)).toBe(false);
    // Un abonné reste Pro, même sans confirmation lisible (son statut vient de Stripe ou de PRO_EMAILS).
    expect(estPro({ ...ABONNE, email_confirmed_at: null } as unknown as U, PENDANT)).toBe(true);
  });

  it("les plans d'un compte (R4) : sans limite pour un abonné, 30 pour un inscrit pendant la bêta, 1 sinon (et après la bêta)", async () => {
    bêta();
    const { limitePlans } = await auth();
    expect(limitePlans(ABONNE as unknown as NonNullable<U>, PENDANT)).toBeNull();
    expect(limitePlans(GRATUIT as unknown as NonNullable<U>, PENDANT)).toBe(PLANS_MAX_BETA);
    expect(limitePlans({ ...GRATUIT, email_confirmed_at: null } as unknown as NonNullable<U>, PENDANT)).toBe(1);
    expect(limitePlans(GRATUIT as unknown as NonNullable<U>, LENDEMAIN)).toBe(1);
    expect(limitePlans(ABONNE as unknown as NonNullable<U>, LENDEMAIN)).toBeNull();
    bêta("coupée");
    expect(limitePlans(GRATUIT as unknown as NonNullable<U>, PENDANT)).toBe(1);
  });

  it("bêta coupée : estPro = estAbonne, à toute date", async () => {
    bêta("coupée");
    const { estPro } = await auth();
    expect(estPro(GRATUIT as unknown as U, PENDANT)).toBe(false);
    expect(estPro(ABONNE as unknown as U, PENDANT)).toBe(true);
  });
});

/* ─── Rendu : l'appareillage des témoins (copie de plans-temoins.test.ts) ───── */

type Utilisateur = "anonyme" | "gratuit" | "pro" | "admin" | "fondateur";

const UTILISATEURS: Record<Utilisateur, unknown> = {
  anonyme: null,
  /* adresse confirmée (sans quoi la bêta ne donne rien), mais APRÈS la fin : pas membre fondateur, comme avant */
  gratuit: { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {}, email_confirmed_at: "2027-01-15T09:00:00.000Z" },
  pro: { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" }, email_confirmed_at: "2027-01-15T09:00:00.000Z" },
  admin: { id: "u-admin", email: "admin@exemple.fr", user_metadata: {}, app_metadata: {}, email_confirmed_at: "2027-01-15T09:00:00.000Z" },
  /* un inscrit de la bêta : adresse confirmée avant la fin, donc membre fondateur */
  fondateur: { id: "u-fondateur", email: "sam@exemple.fr", user_metadata: { nom: "Sam" }, app_metadata: {}, created_at: "2026-10-12T08:00:00.000Z", email_confirmed_at: "2026-10-12T08:01:00.000Z" },
};

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

const MOCKS = [
  "@/lib/features", "@/lib/i18n/server", "@/lib/auth", "@/lib/data/projects", "next/navigation",
  "next/font/google", "next/script", "@vercel/analytics/react", "@/app/globals.css", "react", "@/lib/supabase/server",
  "@/lib/stripe",
];

/** Où une page a voulu rediriger (redirect() simulé : il lève, comme le vrai). */
class Redirection extends Error {
  constructor(public url: string) { super("REDIRECT " + url); }
}

type Options = { locale: Locale; user?: Utilisateur; projets?: CleProjet[]; plans?: boolean };

/**
 * Charge les modules comme plans-temoins.test.ts, SAUF `@/lib/auth` : ici la VRAIE (estPro tient compte de la
 * bêta), seul `getUser` est simulé ; ADMIN_EMAILS désigne l'admin des témoins.
 */
async function charger({ locale, user = "anonyme", projets = [], plans = false }: Options) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.stubEnv("ADMIN_EMAILS", "admin@exemple.fr");
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, neuf: true, plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({
    getLocale: async () => locale,
    getT: async () => ({ locale, t: dict(locale) }),
  }));
  vi.doMock("@/lib/auth", async (orig) => {
    const m = await orig<typeof import("@/lib/auth")>();
    return { ...m, getUser: async () => UTILISATEURS[user] };
  });
  const lignes = projets.map((k) => PROJETS[k]);
  vi.doMock("@/lib/data/projects", () => ({
    listProjets: async (archived: boolean) => lignes.filter((p) => p.archived === archived),
    getProjet: async (id: string) => lignes.find((p) => p.id === id) ?? null,
  }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const routeur = { push: vide, replace: vide, refresh: vide, back: vide, forward: vide, prefetch: vide };
    return {
      ...m, useRouter: () => routeur, usePathname: () => "/", useSearchParams: () => new URLSearchParams(),
      redirect: (url: string) => { throw new Redirection(url); },
    };
  });
  vi.doMock("@/lib/supabase/server", () => ({
    supabaseServer: async () => ({
      from() {
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
  vi.doMock("next/font/google", () => ({ Geist: () => ({ variable: "" }), Geist_Mono: () => ({ variable: "" }) }));
  vi.doMock("next/script", () => ({ default: vide }));
  vi.doMock("@vercel/analytics/react", () => ({ Analytics: vide }));
  vi.doMock("@/app/globals.css", () => ({}));
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

/** L'heure du rendu (horloge simulée), bêta allumée. */
function a(instant: Date) {
  bêta();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(instant);
}

afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
});

/* ─── 3. Un anonyme va créer son compte ─────────────────────────────────────── */

describe("Pendant la bêta, un anonyme qui touche une fonction Pro va créer son compte", () => {
  beforeEach(() => a(PENDANT));

  async function redirection(page: () => Promise<unknown>): Promise<string | null> {
    try {
      await page();
      return null;
    } catch (e) {
      if (e instanceof Error && e.constructor.name === "Redirection") return (e as Redirection).url;
      throw e;
    }
  }

  it("/projets/nouveau/detaille et /construction : l'inscription, qui ramène au détaillé ; après la bêta, /tarifs comme avant", async () => {
    await charger({ locale: "fr" });
    let detaille = (await import("@/app/projets/nouveau/detaille/page")).default;
    let construction = (await import("@/app/projets/nouveau/construction/page")).default;
    expect(await redirection(detaille)).toBe("/inscription?next=%2Fprojets%2Fnouveau%2Fdetaille&source=detaille");
    expect(await redirection(construction)).toBe("/inscription?next=%2Fprojets%2Fnouveau%2Fconstruction%3Freprise%3D1&source=construction");

    vi.setSystemTime(LENDEMAIN);
    await charger({ locale: "fr" });
    detaille = (await import("@/app/projets/nouveau/detaille/page")).default;
    construction = (await import("@/app/projets/nouveau/construction/page")).default;
    expect(await redirection(detaille)).toBe("/tarifs");
    expect(await redirection(construction)).toBe("/tarifs");
    // Un inscrit SANS abonnement, après la bêta : /tarifs, comme avant.
    await charger({ locale: "fr", user: "fondateur" });
    detaille = (await import("@/app/projets/nouveau/detaille/page")).default;
    expect(await redirection(detaille)).toBe("/tarifs");
  });

  it("un inscrit, pendant la bêta, entre dans le détaillé (aucune redirection)", async () => {
    await charger({ locale: "fr", user: "gratuit" });
    const detaille = (await import("@/app/projets/nouveau/detaille/page")).default;
    expect(await redirection(detaille)).toBeNull();
  });

  it("écran de choix : « Créer mon compte gratuit » vers l'inscription, plus aucun lien /tarifs ni pastille « Pro »", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale, plans: true });
      const Choix = (await import("@/components/ChoixEstimation")).default;
      for (const nature of ["reno", "neuf"] as const) {
        const h = await r.rendre(await Choix({ isPro: false, nature }));
        const cible = nature === "neuf" ? "%2Fprojets%2Fnouveau%2Fconstruction%3Fnew%3D1" : "%2Fprojets%2Fnouveau%2Fdetaille%3Fnew%3D1";
        expect(h).toContain(`href="/inscription?next=${cible}&amp;source=choix-${nature}"`);
        expect(h).toContain(esc(dict(locale).beta.creerCompteFleche));
        expect(h).toContain(esc(dict(locale).beta.choixFootAnonyme));
        expect(h).not.toContain("/tarifs");
        expect(h).not.toMatch(/>\s*Pro\s*</);
        if (nature === "reno") expect(h).toContain('href="/inscription?next=%2Fplan%3Ftype%3Drenovation&amp;source=choix-plan"');
      }
    }
  });

  it("estimation rapide : « Affiner » dit la bêta ; Tarifs : « Créer mon compte gratuit » emporte l'intention", async () => {
    let r = await charger({ locale: "fr" });
    const EstimateurRapide = (await import("@/components/EstimateurRapide")).default;
    let h = await r.rendre(createElement(EstimateurRapide, { isPro: false, beta: true }));
    expect(h).toContain("Détail poste par poste — gratuit en bêta");
    expect(h).not.toContain("— Pro");
    // L'introduction ne parle plus d'un bouton « Affiner » qui n'existe pas : elle dit la bêta, comme celle du neuf.
    expect(h).toContain(esc(dict("fr").beta.introReno));
    expect(h).not.toContain("« Affiner »");

    for (const [sp, attendu] of [
      [{}, "/inscription?source=tarifs"],
      [{ source: "editeur-plan" }, "/inscription?next=%2Fplan&amp;source=editeur-plan"],
      [{ source: "affiner-neuf" }, "/inscription?next=%2Fprojets%2Fnouveau%2Fconstruction%3Freprise%3D1&amp;source=affiner-neuf"],
      [{ nature: "reno" }, "/inscription?next=%2Fprojets%2Fnouveau%2Fdetaille%3Fnew%3D1&amp;source=tarifs"],
    ] as const) {
      r = await charger({ locale: "fr", plans: true });
      const Tarifs = (await import("@/app/tarifs/page")).default;
      h = await r.rendre(await Tarifs({ searchParams: Promise.resolve(sp) }));
      expect(h, JSON.stringify(sp)).toContain(`href="${attendu}"`);
      // Plus de bouton d'abonnement : ni l'inscription « pour payer » (BoutonAbo), ni le paiement (BoutonCheckout).
      expect(h).not.toContain("next=%2Ftarifs%3Fplan");
      expect(h).not.toContain(dict("fr").boutons.redirection);
      // Pas de grille des offres de 2027 et aucun prix d'après la bêta (décision de Dani du 16/10/2026) : la promesse
      // fondateur sans chiffre, et un seul bouton « Créer mon compte gratuit ».
      for (const prix of ["18,85", "169", "14,08", "16,15", "/ an", "/ mois", "€"]) expect(h, prix).not.toContain(prix);
      expect(h.split(`>${dict("fr").beta.creerCompte}</a>`).length - 1).toBe(1);
      expect(h.split('class="btn ').length - 1, "un seul bouton").toBe(1);
      expect(h).toContain(esc(dict("fr").beta.tarifsFondateurTitre));
      expect(h).toContain(esc(dict("fr").beta.tarifsFondateurNote));
      // Les plans d'un inscrit : le plafond de la bêta, pas « sans limite » (le droit d'un abonné).
      expect(h).not.toContain("sans limite");
      expect(h).toContain(esc(`Éditeur de plan : ${dict("fr").beta.plansEnregistres(PLANS_MAX_BETA)} ;`));
      // La date du titre ne se coupe pas en fin de ligne (espaces insécables).
      expect(h).toContain(esc(dict("fr").beta.tarifsTitre("31\u00a0décembre\u00a02026")));
    }
  });

  it("/inscription : l'encart de la bêta, et le même titre « Bêta gratuite · Crée ton compte » d'où que l'on vienne (le « gratuit » est dans l'encart, une fois)", async () => {
    for (const locale of LOCALES) {
      const b = dict(locale).beta;
      const a = dict(locale).auth;
      for (const sp of [{}, { source: "choix-neuf", next: "/projets/nouveau/construction?new=1" }, { source: "pirate" }, { next: "/plan" }]) {
        const r = await charger({ locale });
        const Inscription = (await import("@/app/inscription/page")).default;
        const h = await r.rendre(await Inscription({ searchParams: Promise.resolve(sp) }));
        expect(h, JSON.stringify(sp)).toContain("data-bandeau-beta");
        // B2 : l'en-tête en une ligne (« Gratuit jusqu'au… · deviens membre fondateur », la date d'un seul tenant), puis
        // trois bénéfices courts.
        expect(h).toContain(esc(b.bandeauTitre(dateInsecable(libellesBeta(locale).fin))));
        expect(b.benefices).toHaveLength(3);
        for (const x of b.benefices) expect(h).toContain(esc(x));
        // Contre-examen : l'accès direct et l'invitation de l'éditeur disaient « Bienvenue · Créer un compte ».
        expect(h).toContain(`<p class="eyebrow mb-2">${esc(b.inscriptionEyebrow)}</p>`);
        expect(h).toContain(`>${esc(b.inscriptionTitre)}</h1>`);
        expect(h).not.toContain(`>${esc(a.inTitre)}</h1>`);
        expect(h).not.toContain(esc(a.inEyebrow));
      }
      // L'intention voyage.
      const r = await charger({ locale });
      const Inscription = (await import("@/app/inscription/page")).default;
      const h = await r.rendre(await Inscription({ searchParams: Promise.resolve({ source: "choix-neuf", next: "/projets/nouveau/construction?new=1" }) }));
      expect(h).toContain('name="next" value="/projets/nouveau/construction?new=1"');
      // La promesse fondateur, sans chiffre (décision de Dani du 16/10/2026) : un tarif préférentiel annoncé avant la fin.
      expect(b.benefices[2]).toMatch(locale === "fr" ? /tarif préférentiel garanti à vie, annoncé avant la fin de la bêta/ : /preferred rate guaranteed for life, announced before the beta ends/);
      expect(h).not.toContain("€");
    }
  });

  it("aucune vente pendant la bêta : la route de paiement refuse (409) sans appeler Stripe ; après la bêta, elle reprend", async () => {
    const creer = vi.fn(async () => ({ url: "https://checkout.stripe.test/s" }));
    const route = async () => {
      vi.resetModules();
      vi.doMock("@/lib/auth", () => ({ getUser: async () => UTILISATEURS.gratuit }));
      vi.doMock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { create: creer } } }), priceIdForPlan: () => "price_test" }));
      const { POST } = await import("@/app/api/stripe/checkout/route");
      return POST(new Request("https://getavyora.fr/api/stripe/checkout", { method: "POST", body: JSON.stringify({ plan: "mensuel" }) }));
    };
    let res = await route();
    expect(res.status).toBe(409);
    expect(creer).not.toHaveBeenCalled();
    vi.setSystemTime(LENDEMAIN);
    res = await route();
    expect(res.status).toBe(200);
    expect(creer).toHaveBeenCalledTimes(1);
  });

  it("l'éditeur de plan : la session dit la bêta (la phrase du prix) ; après la bêta, la réponse d'avant", async () => {
    const session = async (user: Utilisateur) => {
      vi.resetModules();
      vi.doMock("@/lib/features", async (orig) => {
        const m = await orig<typeof import("@/lib/features")>();
        return { ...m, FEATURES: { ...m.FEATURES, plans: true } };
      });
      vi.doMock("@/lib/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/auth")>()), getUser: async () => UTILISATEURS[user] }));
      vi.doMock("@/lib/plans/data", () => ({ compterPlans: async () => 2 }));
      const { GET } = await import("@/app/api/plans/session/route");
      return (await GET()).json();
    };
    const beta = {
      prix: "Gratuit pendant la bêta, jusqu'au 31 décembre 2026, avec un compte.",
      passer: "Compte gratuit",
      reserve: "demande un compte, gratuit pendant la bêta",
      plans: "jusqu\u2019à 30 plans enregistrés",
      inscription: "/inscription?next=%2Fplan&source=editeur-plan",
    };
    expect(await session("anonyme")).toEqual({ connecte: false, pro: false, limite: 1, utilises: 0, beta });
    expect(await session("gratuit")).toEqual({ connecte: true, pro: true, limite: null, utilises: 2, beta });
    vi.setSystemTime(LENDEMAIN);
    expect(await session("anonyme")).toEqual({ connecte: false, pro: false, limite: 1, utilises: 0 });
    expect(await session("gratuit")).toEqual({ connecte: true, pro: false, limite: 1, utilises: 2 });
    for (const m of ["@/lib/plans/data"]) vi.doUnmock(m);
  });

  it("l'amorçage de l'éditeur : pendant la bêta, la phrase du prix, « Compte gratuit » et l'inscription directe ; sinon, l'éditeur d'avant", async () => {
    vi.resetModules();
    const { editeurHeberge, URLS_EDITEUR, TEXTES_BETA_EDITEUR } = await import("@/lib/editeur/heberger");
    const out = await editeurHeberge();
    const [config, amorce, editeur] = [...out.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(editeur).toContain("Passer Pro");
    expect(editeur.split("est réservé à Pro").length - 1).toBe(1);
    expect(editeur.split("des plans enregistrés sans limite").length - 1).toBe(1);
    /* l'amorçage, joué dans un faux navigateur : la session dit (ou non) la bêta, on lit le script qu'il exécute */
    const jouer = async (session: Record<string, unknown>) => {
      const ajoutes: { textContent?: string }[] = [];
      const barre: Record<string, string> = { "aria-label": "Passer Pro", href: "/tarifs?source=editeur-plan", target: "_blank" };
      const lbl = { textContent: "Passer Pro" };
      const ecouteurs: [string, (e: unknown) => void, unknown][] = [];
      const fetch = async (u: string) => ({
        status: 200,
        text: async () => JSON.stringify(u === "/api/plans/session" ? session : { plans: [], limite: 1, utilises: 0 }),
      });
      const appels: string[] = [];
      const win: Record<string, unknown> = {
        location: { search: "" }, URLSearchParams, AbortController, fetch, Promise, setTimeout, clearTimeout,
        document: {
          readyState: "complete",
          getElementById: (i: string) =>
            i === "avyora-editeur" ? { textContent: editeur }
            : i === "proTop" ? { setAttribute: (k: string, v: string) => { barre[k] = v; }, removeAttribute: (k: string) => { delete barre[k]; }, querySelector: () => lbl }
            : null,
          createElement: () => ({}),
          addEventListener: (type: string, f: (e: unknown) => void, capture: unknown) => { ecouteurs.push([type, f, capture]); },
          /* « exécuter » le script de l'éditeur : ses fonctions globales, réduites à ce que l'amorçage appelle */
          body: {
            appendChild: (e: { textContent?: string }) => {
              ajoutes.push(e);
              win.siteCreerCompte = () => appels.push("creer");
              win.passerPro = () => appels.push("tarifs");
              win.suivre = (n: string, d: { origine: string }) => appels.push(`suivre:${n}:${d.origine}`);
            },
          },
        },
      };
      win.window = win;
      new Script(config).runInNewContext(win);
      new Script(amorce).runInNewContext(win);
      for (let i = 0; i < 20 && !win.AVYORA_SITE; i++) await new Promise((r) => setTimeout(r, 0));
      const site = win.AVYORA_SITE as { urls: Record<string, string> };
      return {
        code: ajoutes[0]?.textContent ?? "", prix: win.AVYORA_PRIX_PRO, barre: barre["aria-label"], lbl: lbl.textContent, puce: { ...barre },
        urls: site.urls, ecouteurs, appels, win,
      };
    };
    const b = betaEditeurPlan();
    expect(b.passer).toBe("Compte gratuit");
    expect(b.prix.endsWith(".")).toBe(true); // l'éditeur l'écrit aussi au fil d'une phrase (dossier PDF)
    expect(b.inscription).toBe(lienInscriptionBeta("/plan", "editeur-plan"));
    // R4 : un inscrit de la bêta enregistre PLANS_MAX_BETA plans au plus (apostrophe typographique : la phrase vit dans
    // une chaîne entre apostrophes droites du script).
    expect(b.plans).toBe(`jusqu\u2019à ${PLANS_MAX_BETA} plans enregistrés`);
    // Aucun prix pendant la bêta (décision de Dani du 16/10/2026).
    for (const v of Object.values(b)) expect(v).not.toMatch(/€|\d[,.]\d\d/);
    let r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0, beta: b });
    expect(r.prix).toBe(b.prix);
    expect(r.code).not.toContain("Passer Pro");
    expect(r.code).not.toContain("est réservé à Pro");
    expect(r.code).not.toContain("sans limite");
    expect(r.code).toContain("Le projet rénovation demande un compte, gratuit pendant la bêta : ton plan");
    expect(r.code).toContain(`plans:{gratuit:'1 plan enregistré',pro:'${b.plans}'}`);
    // Les explications parlent du compte (2e contre-examen) : « Sans compte », « Avec un compte », la phrase du prix sans « Pro ».
    for (const [avant] of TEXTES_BETA_EDITEUR) expect(editeur, avant).toContain(avant);
    expect(r.code).not.toMatch(/Version gratuite|Avec Pro|AVYORA Pro, |Ce que Pro ajoute|avec Pro<|c'est Pro\./);
    expect(r.code).toContain("Sans compte : ");
    expect(r.code).toContain("const avecPro=k=>'Avec un compte : '+DROITS[k].pro+'.';");
    expect(r.code).toContain('<span class="prixpro">${esc(PRIX_PRO)}</span>');
    expect(r.code).toContain("t.title=PRIX_PRO;");
    // Les liens « Compte gratuit » portent l'adresse de l'inscription (clic molette, nouvel onglet : l'inscription aussi).
    expect(r.code).toContain(`const TARIFS_URL='${b.inscription}';`);
    expect(r.code).not.toContain(`TARIFS_URL='${URLS_EDITEUR.tarifs}'`);
    expect(r.code).toBe(
      TEXTES_BETA_EDITEUR.reduce(
        (c, [avant, apres]) => c.split(avant).join(apres),
        editeur.split("Passer Pro").join("Compte gratuit").split("est réservé à Pro").join(b.reserve).split("des plans enregistrés sans limite").join(b.plans),
      ).split(`TARIFS_URL='${URLS_EDITEUR.tarifs}'`).join(`TARIFS_URL='${b.inscription}'`),
    );
    expect(() => new Script(r.code)).not.toThrow();
    expect([r.barre, r.lbl]).toEqual(["Compte gratuit", "Compte gratuit"]);
    // La pastille de la barre : l'inscription, dans le même onglet (plus de target="_blank").
    expect(r.puce).toEqual({ "aria-label": "Compte gratuit", href: b.inscription });
    // « Compte gratuit » : l'inscription (intention /plan, source editeur-plan), comme l'invitation, dans le même onglet.
    expect(r.urls.inscription).toBe("/inscription?next=%2Fplan&source=editeur-plan");
    (r.win.passerPro as (o: string) => void)("type");
    expect(r.appels).toEqual(["suivre:clic_passer_pro:type", "creer"]);
    // Un lien vers /tarifs (la barre, « Passer Pro » des fenêtres) : capté, l'inscription à la place.
    const clic = r.ecouteurs.find(([type]) => type === "click");
    expect(clic?.[2]).toBe(true);
    let empeche = 0;
    const lien = (href: string) => ({ target: { closest: () => ({ getAttribute: () => href }) }, preventDefault: () => { empeche++; } });
    clic?.[1](lien(URLS_EDITEUR.tarifs));
    clic?.[1](lien(b.inscription));
    clic?.[1](lien("/logiciel-plan-maison"));
    expect(empeche).toBe(2);
    expect(r.appels.filter((x) => x === "creer")).toHaveLength(3);
    /* des valeurs qui pourraient casser le script (guillemet, accolade…) ou mener ailleurs sont refusées : l'éditeur d'avant */
    r = await jouer({
      connecte: false, pro: false, limite: 1, utilises: 0,
      beta: { prix: b.prix, passer: "x'+alert(1)+'", reserve: "x');alert(1);('", plans: "x'};alert(1);{'", inscription: "https://evil.com/inscription?x" },
    });
    expect(r.code).toBe(editeur);
    expect(r.urls.inscription).toBe(URLS_EDITEUR.inscription);
    expect(r.ecouteurs.filter(([type]) => type === "click")).toEqual([]);
    for (const inscription of ["/inscription?next=%2F%2Fevil.com'+x", "//evil.com/inscription?", "/inscription"]) {
      r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0, beta: { ...b, inscription } });
      expect(r.urls.inscription, inscription).toBe(URLS_EDITEUR.inscription);
    }
    /* hors bêta : le script, la phrase du prix, la barre et les adresses d'avant */
    r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0 });
    expect(r.code).toBe(editeur);
    expect(r.prix).not.toBe(b.prix);
    expect([r.barre, r.lbl]).toEqual(["Passer Pro", "Passer Pro"]);
    expect(r.urls.inscription).toBe(URLS_EDITEUR.inscription);
    expect(r.ecouteurs.filter(([type]) => type === "click")).toEqual([]);
  });
});

/* ─── Membres fondateurs : aucun chiffre pendant la bêta ───────────────────────── */

describe("Membres fondateurs : aucun prix d'après la bêta, nulle part (décision de Dani du 16/10/2026)", () => {
  /** Un prix d'abonnement : 18,85 €, €18.85, 169 €, 14,08, 16,15, 29 €, 199 €… (le « 0 € » de la bêta n'en est pas un). */
  const PRIX = /18[,.]85|16[,.]15|14[,.]08|\b169\b|€ ?\d|\d[\u00a0 ]?€|\/ ?mois|\/ ?month|\/ ?an\b|\/ ?year/;

  it("Tarifs, inscription, Mon compte, pastille, CGU, CGV : la promesse sans chiffre, en FR et en EN", async () => {
    a(PENDANT);
    for (const locale of LOCALES) {
      const b = dict(locale).beta;
      for (const user of ["anonyme", "fondateur"] as const) {
        const r = await charger({ locale, user, plans: true });
        const Tarifs = (await import("@/app/tarifs/page")).default;
        const h = await r.rendre(await Tarifs({ searchParams: Promise.resolve({ source: "editeur-plan" }) }));
        expect(h, `tarifs ${locale} ${user}`).not.toMatch(PRIX);
        expect(h).toContain(esc(user === "anonyme" ? b.tarifsFondateurTitre : b.membreFondateurTitre));
      }
      let r = await charger({ locale });
      const Inscription = (await import("@/app/inscription/page")).default;
      const ins = await r.rendre(await Inscription({ searchParams: Promise.resolve({}) }));
      expect(ins, `inscription ${locale}`).not.toMatch(PRIX);
      expect(ins).toContain(esc(b.benefices[2]));
      r = await charger({ locale, user: "fondateur" });
      const { PastilleFondateur } = await import("@/components/BandeauBeta");
      const AbonnementSection = (await import("@/components/AbonnementSection")).default;
      const compte = await r.rendre(createElement("div", null,
        createElement(PastilleFondateur, { locale }),
        createElement(AbonnementSection, { isPro: false, beta: { fin: libellesBeta(locale).fin }, fondateur: true })));
      expect(compte, `compte ${locale}`).not.toMatch(PRIX);
      expect(compte).toContain(esc(b.membreFondateurTitre));
    }
    for (const page of ["cgu", "cgv"] as const) {
      const r = await charger({ locale: "fr" });
      const Page = (await import(`@/app/(legal)/${page}/page`)).default as () => ReactElement;
      const h = await r.rendre(Page());
      expect(h, page).not.toMatch(PRIX);
      expect(h).not.toContain("tarif de lancement");
      expect(h).toContain("tarif préférentiel");
      expect(h).toContain("annoncé aux membres avant la fin de la bêta");
    }
  });

  it("CGU art. 3 : le compte par lien e-mail, le mot de passe facultatif (avec ou sans la bêta)", async () => {
    for (const etat of ["allumée", "coupée"] as const) {
      bêta(etat);
      const r = await charger({ locale: "fr" });
      const CGU = (await import("@/app/(legal)/cgu/page")).default;
      const h = await r.rendre(CGU());
      expect(h).toContain("confirmée par un lien envoyé à cette adresse");
      expect(h).toContain("est facultatif");
      expect(h).not.toContain("requiert une adresse e-mail valide et un mot de passe");
    }
  });
});

/* ─── Accueil : chaque remplacement trouve sa phrase ─────────────────────────── */

describe("Accueil pendant la bêta (lib/accueil-beta.ts)", () => {
  it("chaque phrase remplacée figure exactement une fois dans le gabarit, et plus aucun prix ni « Pro » n'en sort", async () => {
    const { remplacementsAccueilBeta } = await import("@/lib/accueil-beta");
    for (const locale of LOCALES) {
      a(LENDEMAIN);
      let r = await charger({ locale });
      let Accueil = (await import("@/app/page")).default;
      const avant = await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }));
      a(PENDANT);
      r = await charger({ locale });
      Accueil = (await import("@/app/page")).default;
      const pendant = await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }));
      for (const [x, y] of remplacementsAccueilBeta(locale)) {
        expect(avant.split(x).length - 1, x).toBe(1);
        expect(pendant).not.toContain(x);
        expect(pendant).toContain(y);
      }
      // Plus d'appel à payer, et aucun prix d'après la bêta, pas même dans la promesse des membres fondateurs (décision
      // de Dani du 16/10/2026 : « un tarif préférentiel garanti à vie, annoncé avant la fin de la bêta »).
      expect(pendant).not.toMatch(/AVYORA Pro|Passer Pro|Go Pro|Voir les tarifs|See pricing|dès 18,85|from €18\.85|href="\/tarifs" class="promo"/);
      expect(pendant).not.toMatch(/18[,.]85|€ ?169|169 ?€|14[,.]08|16[,.]15/);
      expect(pendant).toContain(locale === "fr" ? "tarif préférentiel garanti à vie</b>, annoncé avant la fin de la bêta" : "preferred rate guaranteed for life</b>, announced before the beta ends");
    }
  });
});

/* ─── 4. Témoins pendant la bêta ─────────────────────────────────────────────── */

describe("Témoins · pendant la bêta (12/10/2026)", () => {
  beforeEach(() => a(PENDANT));

  it("Tarifs (FR, EN ; anonyme, gratuit, Pro ; venu de l'éditeur)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro", "fondateur"] as const) {
        const r = await charger({ locale, user });
        const Tarifs = (await import("@/app/tarifs/page")).default;
        expect(await r.rendre(await Tarifs({ searchParams: Promise.resolve({}) }))).toMatchSnapshot(`tarifs bêta ${locale} ${user}`);
      }
      const r = await charger({ locale, plans: true });
      const Tarifs = (await import("@/app/tarifs/page")).default;
      expect(await r.rendre(await Tarifs({ searchParams: Promise.resolve({ source: "editeur-plan" }) }))).toMatchSnapshot(`tarifs bêta ${locale} anonyme editeur-plan`);
    }
  });

  it("écran de choix (FR, EN ; rénovation, neuf ; anonyme, connecté)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale, plans: true });
      const Choix = (await import("@/components/ChoixEstimation")).default;
      for (const nature of ["reno", "neuf"] as const) {
        for (const isPro of [false, true]) {
          expect(await r.rendre(await Choix({ isPro, nature }))).toMatchSnapshot(`choix bêta ${locale} ${nature} ${isPro ? "connecte" : "anonyme"}`);
        }
      }
    }
  });

  it("accueil (FR, EN)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale });
      const Accueil = (await import("@/app/page")).default;
      expect(await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }))).toMatchSnapshot(`accueil bêta ${locale}`);
    }
  });

  it("inscription venue de l'écran de choix (FR, EN)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale });
      const Inscription = (await import("@/app/inscription/page")).default;
      const h = await r.rendre(await Inscription({ searchParams: Promise.resolve({ source: "choix-reno", next: "/projets/nouveau/detaille?new=1" }) }));
      expect(h).toMatchSnapshot(`inscription bêta ${locale} choix-reno`);
    }
  });

  it("en-tête : plus de « Passer Pro » pour un inscrit (FR, EN ; anonyme, gratuit)", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit"] as const) {
        const r = await charger({ locale, user });
        const Layout = (await import("@/app/layout")).default;
        const page = await r.rendre(await Layout({ children: createElement("p", null, "contenu") }));
        const tete = entre(page, "<header", "</header>");
        expect(tete).not.toContain(dict(locale).nav.passerPro);
        expect(tete).toMatchSnapshot(`en-tête bêta ${locale} ${user}`);
      }
    }
  });

  it("« Mes projets » : pas de bannière Pro, la pastille « Membre fondateur » (FR, EN ; vide, plein)", async () => {
    for (const locale of LOCALES) {
      for (const [nom, projets] of [["vide", []], ["plein", ["renoRapide", "neufDetaille"]]] as const) {
        const r = await charger({ locale, user: "fondateur", projets: [...projets] });
        const Projets = (await import("@/app/projets/page")).default;
        const h = await r.rendre(await Projets());
        expect(h).toContain(esc(dict(locale).beta.membreFondateur));
        expect(h).not.toContain("av-upsell");
        expect(h).toMatchSnapshot(`projets bêta ${locale} fondateur ${nom}`);
      }
    }
  });

  it("Mon compte : la bêta et le membre fondateur, rien à résilier ; l'abonné garde la gestion de son abonnement", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale });
      const AbonnementSection = (await import("@/components/AbonnementSection")).default;
      const l = libellesBeta(locale);
      const beta = await r.rendre(createElement(AbonnementSection, { isPro: false, beta: { fin: l.fin }, fondateur: true }));
      expect(beta).toContain(l.fin);
      // Membre fondateur, sans chiffre (décision de Dani du 16/10/2026).
      expect(beta).toContain(locale === "fr" ? "tarif préférentiel garanti à vie, annoncé avant la fin de la bêta" : "preferred rate guaranteed for life, announced before the beta ends");
      expect(beta).not.toContain("€");
      expect(beta).not.toContain(locale === "fr" ? "résilier" : "cancel my");
      expect(beta).not.toContain('href="/tarifs"');
      expect(beta).toMatchSnapshot(`abonnement bêta ${locale} fondateur`);
      const abonne = await r.rendre(createElement(AbonnementSection, { isPro: true, beta: { fin: l.fin } }));
      expect(abonne).toContain(locale === "fr" ? "Gérer / résilier mon abonnement" : "Manage / cancel my subscription");
      // Après la bêta, sans fondateur : la section d'avant.
      const apres = await r.rendre(createElement(AbonnementSection, { isPro: false }));
      expect(apres).toContain('href="/tarifs"');
    }
  });

  it("vitrine de l'éditeur de plan : les offres disent la bêta, la FAQ aussi (JSON-LD compris)", async () => {
    for (const locale of LOCALES) {
      const r = await charger({ locale, plans: true });
      const Vitrine = (await import("@/app/logiciel-plan-maison/page")).default;
      const h = await r.rendre(await Vitrine());
      const vb = (await import("@/lib/i18n/plans")).dictPlans(locale).vitrineBeta;
      const fin = libellesBeta(locale).fin;
      expect(h).toContain(esc(vb.offresTitre));
      expect(h).toContain('href="/inscription?next=%2Fplan&amp;source=vitrine-plan"');
      expect(h).not.toContain("/tarifs?source=editeur-plan");
      const faq = vb.faqGratuit(fin, PLANS_MAX_BETA);
      expect(h).toContain(esc(faq.r));
      // R4 : pendant la bêta, un inscrit enregistre 30 plans au plus ; « sans limite » est le droit d'un abonné.
      const colonne = entre(h, 'data-colonne="pro"', "</ul>");
      expect(colonne).toContain(esc(vb.plans(PLANS_MAX_BETA).replace(/^./, (c) => c.toUpperCase())));
      expect(h).not.toMatch(/sans limite|unlimited saved plans/i);
      expect(h).toContain(JSON.stringify(faq.r).slice(1, -1).replace(/</g, "\\u003c"));
    }
  });
});

/* ─── 5. Après la bêta : exactement les témoins d'aujourd'hui ───────────────── */

/** Les références de plans-temoins.test.ts (interrupteur plans éteint), relues telles quelles. */
function temoinsDAujourdhui(): Map<string, string> {
  const src = fs.readFileSync(path.join(__dirname, "__snapshots__", "plans-temoins.test.ts.snap"), "utf8");
  const exportsSnap: Record<string, string> = {};
  new Function("exports", src)(exportsSnap);
  const out = new Map<string, string>();
  const prefixe = "Témoins · interrupteur plans éteint > ";
  for (const [k, brut] of Object.entries(exportsSnap)) {
    // Une référence sur plusieurs lignes est écrite entre deux sauts de ligne (format des snapshots de vitest).
    const v = brut.startsWith("\n") && brut.endsWith("\n") ? brut.slice(1, -1) : brut;
    if (!k.startsWith(prefixe) || !v.startsWith('"') || !v.endsWith('"')) continue;
    out.set(k.slice(k.lastIndexOf(" > ") + 3).replace(/ 1$/, ""), v.slice(1, -1));
  }
  return out;
}

describe("Après la bêta (date simulée) : le site d'aujourd'hui, au caractère près", () => {
  const T = temoinsDAujourdhui();
  const ref = (nom: string) => {
    const v = T.get(nom);
    expect(v, `témoin « ${nom} »`).toBeDefined();
    return v as string;
  };

  for (const instant of [LENDEMAIN, APRES]) {
    const quand = instant.toISOString();

    it(`${quand} : Tarifs, écrans de choix, accueil`, async () => {
      a(instant);
      for (const locale of LOCALES) {
        for (const user of ["anonyme", "gratuit", "pro"] as const) {
          const r = await charger({ locale, user });
          const Tarifs = (await import("@/app/tarifs/page")).default;
          expect(await r.rendre(await Tarifs({ searchParams: Promise.resolve({}) }))).toBe(ref(`tarifs ${locale} ${user}`));
        }
        const r = await charger({ locale });
        const Choix = (await import("@/components/ChoixEstimation")).default;
        for (const nature of ["reno", "neuf"] as const) {
          for (const isPro of [false, true]) {
            expect(await r.rendre(await Choix({ isPro, nature }))).toBe(ref(`choix ${locale} ${nature} ${isPro ? "pro" : "gratuit"}`));
          }
        }
        const Accueil = (await import("@/app/page")).default;
        expect(await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }))).toBe(ref(`accueil ${locale}`));
      }
    });

    it(`${quand} : en-tête, pied de page et menu mobile (anonyme, gratuit, Pro, admin)`, async () => {
      a(instant);
      for (const locale of LOCALES) {
        for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
          const r = await charger({ locale, user });
          const Layout = (await import("@/app/layout")).default;
          const page = await r.rendre(await Layout({ children: createElement("p", null, "contenu") }));
          expect(entre(page, "<header", "</header>")).toBe(ref(`en-tête ${locale} ${user}`));
          // L'année du pied de page suit l'horloge (2027 ici, 2026 dans les témoins) : seule différence admise, hors bêta.
          const annee = (h: string) => h.replace(/© <!-- -->\d{4}<!-- -->/, "© <!-- -->ANNÉE<!-- -->");
          expect(annee(entre(page, "<footer", "</footer>"))).toBe(annee(ref(`pied ${locale} ${user}`)));
        }
      }
    });

    it(`${quand} : « Mes projets » et fiches projet (gratuit, Pro)`, async () => {
      a(instant);
      const tous: CleProjet[] = ["renoRapide", "renoDetaille", "neufRapide", "neufDetaille", "archive"];
      for (const locale of LOCALES) {
        for (const user of ["gratuit", "pro"] as const) {
          for (const [nom, projets] of [["vide", []], ["plein", tous]] as const) {
            const r = await charger({ locale, user, projets: [...projets] });
            const Projets = (await import("@/app/projets/page")).default;
            expect(await r.rendre(await Projets())).toBe(ref(`projets ${locale} ${user} ${nom}`));
          }
          for (const cle of ["renoRapide", "renoDetaille", "neufRapide", "neufDetaille"] as const) {
            const r = await charger({ locale, user, projets: [cle] });
            const Fiche = (await import("@/app/projets/[id]/page")).default;
            expect(await r.rendre(await Fiche({ params: Promise.resolve({ id: PROJETS[cle].id }) }))).toBe(ref(`fiche ${locale} ${user} ${cle}`));
          }
        }
      }
    });
  }

  it("la bêta coupée (NEXT_PUBLIC_BETA=0), en pleine bêta : les mêmes témoins", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(PENDANT);
    bêta("coupée");
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro"] as const) {
        const r = await charger({ locale, user });
        const Tarifs = (await import("@/app/tarifs/page")).default;
        expect(await r.rendre(await Tarifs({ searchParams: Promise.resolve({}) }))).toBe(ref(`tarifs ${locale} ${user}`));
      }
      const r = await charger({ locale });
      const Accueil = (await import("@/app/page")).default;
      expect(await r.rendre(await Accueil({ searchParams: Promise.resolve({}) }))).toBe(ref(`accueil ${locale}`));
    }
  });
});

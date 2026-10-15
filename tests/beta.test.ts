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
  lienInscriptionBeta, lireSourceBeta, SOURCES_BETA, TARIF_FONDATEUR_MOIS, tarifFondateur, betaEditeurPlan,
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
    expect(estMembreFondateur({ created_at: "2026-10-01T10:00:00Z" })).toBe(false);
  });

  it("minuit à Paris, hiver et été (le jour peut déborder sur le mois suivant)", () => {
    expect(minuitParis(2027, 1, 1).toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(minuitParis(2026, 12, 32).toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(minuitParis(2026, 7, 1).toISOString()).toBe("2026-06-30T22:00:00.000Z");
    // Le lendemain du passage à l'heure d'hiver (25/10/2026) : minuit à Paris = 23 h UTC la veille.
    expect(minuitParis(2026, 10, 26).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("les textes datés suivent la fin et la constante du tarif fondateur", () => {
    bêta();
    expect(libellesBeta("fr")).toEqual({ fin: "31 décembre 2026", reprise: "1er janvier 2027", tarif: "18,85\u00a0€" });
    expect(libellesBeta("en")).toEqual({ fin: "December 31, 2026", reprise: "January 1, 2027", tarif: "€18.85" });
    bêta("allumée", "2027-03-31");
    expect(libellesBeta("fr")).toMatchObject({ fin: "31 mars 2027", reprise: "1er avril 2027" });
    expect(TARIF_FONDATEUR_MOIS).toBe(18.85);
    expect(tarifFondateur("fr")).toBe("18,85\u00a0€"); // insécable : « 18,85 » et « € » ne se séparent pas en fin de ligne
    // Le tarif fondateur est celui du plan mensuel affiché sur /tarifs (au type d'espace près).
    expect(tarifFondateur("fr").replace("\u00a0", " ")).toBe(dict("fr").tarifs.plans.mensuel.prix);
    expect(tarifFondateur("en")).toBe(dict("en").tarifs.plans.mensuel.prix);
  });

  it("membre fondateur : un compte créé avant la fin de la bêta, et il le reste après", () => {
    bêta();
    expect(estMembreFondateur({ created_at: "2026-10-01T10:00:00Z" })).toBe(true);
    expect(estMembreFondateur({ created_at: "2026-12-31T22:59:00Z" })).toBe(true);
    expect(estMembreFondateur({ created_at: "2026-12-31T23:00:00Z" })).toBe(false);
    expect(estMembreFondateur({ created_at: "2027-02-01T10:00:00Z" })).toBe(false);
    for (const u of [null, undefined, {}, { created_at: null }, { created_at: "pas une date" }]) expect(estMembreFondateur(u)).toBe(false);
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

const GRATUIT = { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {}, created_at: "2026-10-01T09:00:00.000Z" };
const ABONNE = { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" }, created_at: "2026-09-01T09:00:00.000Z" };

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
  gratuit: { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {} },
  pro: { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" } },
  admin: { id: "u-admin", email: "admin@exemple.fr", user_metadata: {}, app_metadata: {} },
  /* un inscrit de la bêta : `created_at` avant la fin, donc membre fondateur */
  fondateur: { id: "u-fondateur", email: "sam@exemple.fr", user_metadata: { nom: "Sam" }, app_metadata: {}, created_at: "2026-10-12T08:00:00.000Z" },
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
    }
  });

  it("/inscription : l'encart de la bêta ; venu d'une fonction de la bêta, le titre « Gratuit pendant la bêta — crée ton compte »", async () => {
    for (const locale of LOCALES) {
      const b = dict(locale).beta;
      let r = await charger({ locale });
      let Inscription = (await import("@/app/inscription/page")).default;
      let h = await r.rendre(await Inscription({ searchParams: Promise.resolve({}) }));
      expect(h).toContain("data-bandeau-beta");
      expect(h).toContain(esc(b.fondateur(libellesBeta(locale).tarif)));
      expect(h).not.toContain(esc(b.inscriptionTitre));
      r = await charger({ locale });
      Inscription = (await import("@/app/inscription/page")).default;
      h = await r.rendre(await Inscription({ searchParams: Promise.resolve({ source: "choix-neuf", next: "/projets/nouveau/construction?new=1" }) }));
      expect(h).toContain(esc(b.inscriptionTitre));
      expect(h).toContain('name="next" value="/projets/nouveau/construction?new=1"');
      // Une source inconnue est ignorée.
      r = await charger({ locale });
      Inscription = (await import("@/app/inscription/page")).default;
      h = await r.rendre(await Inscription({ searchParams: Promise.resolve({ source: "pirate" }) }));
      expect(h).not.toContain(esc(b.inscriptionTitre));
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
    const beta = { prix: "gratuit pendant la bêta, jusqu'au 31 décembre 2026, avec un compte", passer: "Compte gratuit" };
    expect(await session("anonyme")).toEqual({ connecte: false, pro: false, limite: 1, utilises: 0, beta });
    expect(await session("gratuit")).toEqual({ connecte: true, pro: true, limite: null, utilises: 2, beta });
    vi.setSystemTime(LENDEMAIN);
    expect(await session("anonyme")).toEqual({ connecte: false, pro: false, limite: 1, utilises: 0 });
    expect(await session("gratuit")).toEqual({ connecte: true, pro: false, limite: 1, utilises: 2 });
    for (const m of ["@/lib/plans/data"]) vi.doUnmock(m);
  });

  it("l'amorçage de l'éditeur : pendant la bêta, la phrase du prix et « Compte gratuit » à la place de « Passer Pro » ; sinon, l'éditeur d'avant", async () => {
    vi.resetModules();
    const { editeurHeberge } = await import("@/lib/editeur/heberger");
    const out = await editeurHeberge();
    const [config, amorce, editeur] = [...out.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(editeur).toContain("Passer Pro");
    /* l'amorçage, joué dans un faux navigateur : la session dit (ou non) la bêta, on lit le script qu'il exécute */
    const jouer = async (session: Record<string, unknown>) => {
      const ajoutes: { textContent?: string }[] = [];
      const barre: Record<string, string> = { "aria-label": "Passer Pro" };
      const lbl = { textContent: "Passer Pro" };
      const fetch = async (u: string) => ({
        status: 200,
        text: async () => JSON.stringify(u === "/api/plans/session" ? session : { plans: [], limite: 1, utilises: 0 }),
      });
      const win: Record<string, unknown> = {
        location: { search: "" }, URLSearchParams, AbortController, fetch, Promise, setTimeout, clearTimeout,
        document: {
          readyState: "complete",
          getElementById: (i: string) =>
            i === "avyora-editeur" ? { textContent: editeur }
            : i === "proTop" ? { setAttribute: (k: string, v: string) => { barre[k] = v; }, querySelector: () => lbl }
            : null,
          createElement: () => ({}),
          body: { appendChild: (e: { textContent?: string }) => ajoutes.push(e) },
        },
      };
      win.window = win;
      new Script(config).runInNewContext(win);
      new Script(amorce).runInNewContext(win);
      for (let i = 0; i < 20 && !win.AVYORA_SITE; i++) await new Promise((r) => setTimeout(r, 0));
      return { code: ajoutes[0]?.textContent ?? "", prix: win.AVYORA_PRIX_PRO, barre: barre["aria-label"], lbl: lbl.textContent };
    };
    const b = betaEditeurPlan();
    expect(b.passer).toBe("Compte gratuit");
    let r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0, beta: b });
    expect(r.prix).toBe(b.prix);
    expect(r.code).not.toContain("Passer Pro");
    expect(r.code).toBe(editeur.split("Passer Pro").join("Compte gratuit"));
    expect(() => new Script(r.code)).not.toThrow();
    expect([r.barre, r.lbl]).toEqual(["Compte gratuit", "Compte gratuit"]);
    /* un libellé qui pourrait casser le script (guillemet, accolade…) est refusé : l'éditeur d'avant */
    r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0, beta: { prix: b.prix, passer: "x'+alert(1)+'" } });
    expect(r.code).toBe(editeur);
    /* hors bêta : le script, la phrase du prix et la barre d'avant */
    r = await jouer({ connecte: false, pro: false, limite: 1, utilises: 0 });
    expect(r.code).toBe(editeur);
    expect(r.prix).not.toBe(b.prix);
    expect([r.barre, r.lbl]).toEqual(["Passer Pro", "Passer Pro"]);
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
      // Plus d'appel à payer : le prix ne reste que dans la promesse des membres fondateurs (« à vie », « for life »).
      expect(pendant).not.toMatch(/AVYORA Pro|Passer Pro|Go Pro|Voir les tarifs|See pricing|dès 18,85|from €18\.85|href="\/tarifs" class="promo"/);
      expect(pendant.match(/18,85[ \u00a0]€|€18\.85/g)?.length).toBe(2);
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
      const beta = await r.rendre(createElement(AbonnementSection, { isPro: false, beta: { fin: l.fin }, tarifFondateur: l.tarif }));
      expect(beta).toContain(l.fin);
      expect(beta).toContain(l.tarif);
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
      const faq = vb.faqGratuit(fin);
      expect(h).toContain(esc(faq.r));
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

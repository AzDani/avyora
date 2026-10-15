/**
 * Le PDF du rapport (lib/pdf.ts, Chrome headless) : la session de l'utilisateur ne voyage qu'en cookies de l'ORIGINE du
 * rapport, et aucune requête tierce ne part (contre-examen de la bêta, R5). Avant, `setExtraHTTPHeaders({ cookie })`
 * envoyait les jetons de session Supabase à TOUTES les requêtes de la page, la balise Google Ads comprise.
 * Puppeteer est simulé : aucun navigateur n'est lancé.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Requete = {
  url: () => string;
  isInterceptResolutionHandled: () => boolean;
  continue: (o?: unknown) => Promise<void>;
  abort: (r?: string) => Promise<void>;
};

afterEach(() => {
  vi.doUnmock("puppeteer-core");
  vi.unstubAllEnvs();
});

describe("lib/pdf : la session reste sur le site, rien ne sort", () => {
  it("l'en-tête Cookie, en paires nom / valeur ; les morceaux illisibles sont ignorés", async () => {
    const { cookiesDeLEntete } = await import("@/lib/pdf");
    expect(cookiesDeLEntete("sb-ref-auth-token=base64-eyJhYmMiOjF9; av-lang=fr; vide=; =x; sans-egal")).toEqual([
      { name: "sb-ref-auth-token", value: "base64-eyJhYmMiOjF9" },
      { name: "av-lang", value: "fr" },
      { name: "vide", value: "" },
    ]);
    expect(cookiesDeLEntete(null)).toEqual([]);
    expect(cookiesDeLEntete("")).toEqual([]);
  });

  it("seules l'origine du rapport et les ressources embarquées passent", async () => {
    const { requeteAutorisee } = await import("@/lib/pdf");
    const o = "https://getavyora.fr";
    for (const u of ["https://getavyora.fr/projets/1/rapport", "https://getavyora.fr/_next/static/x.js", "data:image/png;base64,AA", "blob:https://getavyora.fr/1"]) {
      expect(requeteAutorisee(u, o), u).toBe(true);
    }
    for (const u of [
      "https://www.googletagmanager.com/gtag/js?id=AW-1",
      "https://googleads.g.doubleclick.net/pagead/x",
      "https://abc.supabase.co/auth/v1/user",
      "https://getavyora.fr.evil.com/x",
      "http://getavyora.fr/x",
      "pas une adresse",
    ]) {
      expect(requeteAutorisee(u, o), u).toBe(false);
    }
  });

  it("genererRapportPDF : cookies posés pour le domaine du site seulement (jamais en en-tête global), requêtes tierces coupées", async () => {
    const appels: { cookies: unknown[]; entetes: unknown[]; interception: boolean[]; goto: string[] } = { cookies: [], entetes: [], interception: [], goto: [] };
    let surRequete: ((r: Requete) => void) | null = null;
    const page = {
      setRequestInterception: async (v: boolean) => { appels.interception.push(v); },
      on: (ev: string, f: (r: Requete) => void) => { if (ev === "request") surRequete = f; },
      /* l'API de page, dépréciée : ne doit plus servir */
      setCookie: async () => { throw new Error("page.setCookie est dépréciée"); },
      setExtraHTTPHeaders: async (h: unknown) => { appels.entetes.push(h); },
      goto: async (u: string) => { appels.goto.push(u); },
      evaluate: async () => undefined,
      pdf: async () => new Uint8Array([37, 80, 68, 70]),
    };
    const browser = {
      newPage: async () => page,
      setCookie: async (...c: unknown[]) => { appels.cookies.push(...c); },
      close: async () => {},
    };
    vi.doMock("puppeteer-core", () => ({ default: { launch: async () => browser } }));
    vi.resetModules();
    const { genererRapportPDF } = await import("@/lib/pdf");
    const pdf = await genererRapportPDF("https://getavyora.fr/projets/abc/rapport", "sb-ref-auth-token=jeton-secret; av-lang=fr");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(appels.entetes).toEqual([]);
    expect(appels.interception).toEqual([true]);
    const site = { domain: "getavyora.fr", path: "/", secure: true, httpOnly: true, sameSite: "Lax" };
    expect(appels.cookies).toEqual([
      { name: "sb-ref-auth-token", value: "jeton-secret", ...site },
      { name: "av-lang", value: "fr", ...site },
    ]);
    expect(appels.goto).toEqual(["https://getavyora.fr/projets/abc/rapport"]);
    // Les requêtes de la page : le site passe, Google est coupé.
    const issues: string[] = [];
    const requete = (url: string): Requete => ({
      url: () => url,
      isInterceptResolutionHandled: () => false,
      continue: async () => { issues.push(`continue ${url}`); },
      abort: async (r) => { issues.push(`abort ${url} ${r}`); },
    });
    expect(surRequete).not.toBeNull();
    surRequete!(requete("https://getavyora.fr/_next/static/app.js"));
    surRequete!(requete("https://www.googletagmanager.com/gtag/js?id=AW-18449681842"));
    expect(issues).toEqual([
      "continue https://getavyora.fr/_next/static/app.js",
      "abort https://www.googletagmanager.com/gtag/js?id=AW-18449681842 blockedbyclient",
    ]);
  });

  it("sans cookie (appel sans session) : aucun cookie posé", async () => {
    const cookies: unknown[] = [];
    const page = {
      setRequestInterception: async () => {},
      on: () => {},
      goto: async () => {},
      evaluate: async () => undefined,
      pdf: async () => new Uint8Array([1]),
    };
    const browser = { newPage: async () => page, setCookie: async (...c: unknown[]) => { cookies.push(...c); }, close: async () => {} };
    vi.doMock("puppeteer-core", () => ({ default: { launch: async () => browser } }));
    vi.resetModules();
    const { genererRapportPDF } = await import("@/lib/pdf");
    await genererRapportPDF("http://localhost:3021/projets/abc/rapport", null);
    expect(cookies).toEqual([]);
  });
});

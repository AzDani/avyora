import { afterEach, describe, expect, it, vi } from "vitest";

/* Production sans Upstash : « Mes plans » et l'authentification (B2) gardent des limites en mémoire (lib/ratelimit.ts),
   le reste est no-op. */
const CLES = ["VERCEL_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
const env = Object.fromEntries(CLES.map((k) => [k, process.env[k]]));

async function module(vercelEnv: string) {
  vi.resetModules();
  process.env.VERCEL_ENV = vercelEnv;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  return import("@/lib/ratelimit");
}

afterEach(() => {
  for (const k of CLES) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  vi.restoreAllMocks();
});

describe("limites en mémoire sans Upstash", () => {
  it("production : planEstimation 10 / h par compte, les autres comptes à part", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { verifierLimite } = await module("production");
    for (let i = 0; i < 10; i++) expect(await verifierLimite("planEstimation", "u1")).toBe(true);
    expect(await verifierLimite("planEstimation", "u1")).toBe(false);
    expect(await verifierLimite("planEstimation", "u2")).toBe(true);
    /* chaque catégorie a son propre seau */
    expect(await verifierLimite("plan", "u1")).toBe(true);
  });

  it("production : plan 90 / min, puis refusé", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { verifierLimite } = await module("production");
    for (let i = 0; i < 90; i++) expect(await verifierLimite("plan", "u1")).toBe(true);
    expect(await verifierLimite("plan", "u1")).toBe(false);
  });

  it("production : auth 6 / min par identifiant (IP ou adresse du lien d'accès), chacun son seau", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { verifierLimite } = await module("production");
    for (let i = 0; i < 6; i++) expect(await verifierLimite("auth", "1.2.3.4")).toBe(true);
    expect(await verifierLimite("auth", "1.2.3.4")).toBe(false);
    expect(await verifierLimite("auth", "5.6.7.8")).toBe(true);
    expect(await verifierLimite("auth", "lien:camille@exemple.fr")).toBe(true);
  });

  it("les catégories hors « Mes plans » et auth restent sans limite", async () => {
    const { verifierLimite } = await module("production");
    for (const k of ["api", "ia", "pdf"] as const) {
      for (let i = 0; i < 50; i++) expect(await verifierLimite(k, "1.2.3.4")).toBe(true);
    }
  });

  it("préversion et local : sans limite (comme avant)", async () => {
    const { verifierLimite } = await module("preview");
    for (let i = 0; i < 30; i++) expect(await verifierLimite("planCreation", "u1")).toBe(true);
    for (let i = 0; i < 30; i++) expect(await verifierLimite("auth", "1.2.3.4")).toBe(true);
  });
});

describe("avec Upstash", () => {
  it("chaque catégorie sous son propre préfixe : auth ne partage plus sa clé Redis avec api (même IP, même fenêtre)", async () => {
    vi.resetModules();
    const prefixes: string[] = [];
    vi.doMock("@upstash/redis", () => ({ Redis: class {} }));
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        static slidingWindow() {
          return {};
        }
        constructor(o: { prefix: string }) {
          prefixes.push(o.prefix);
        }
      }
      return { Ratelimit };
    });
    process.env.UPSTASH_REDIS_REST_URL = "https://exemple.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "jeton-de-test";
    try {
      await import("@/lib/ratelimit");
    } finally {
      vi.doUnmock("@upstash/redis");
      vi.doUnmock("@upstash/ratelimit");
    }
    expect(prefixes).toHaveLength(7);
    expect(new Set(prefixes).size).toBe(7);
    expect(prefixes).toContain("avyora:auth");
    expect(prefixes).toContain("avyora:api");
  });
});

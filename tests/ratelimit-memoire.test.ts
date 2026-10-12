import { afterEach, describe, expect, it, vi } from "vitest";

/* Production sans Upstash : « Mes plans » garde des limites en mémoire (lib/ratelimit.ts), le reste est no-op. */
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

  it("les catégories hors « Mes plans » restent sans limite", async () => {
    const { verifierLimite } = await module("production");
    for (let i = 0; i < 50; i++) expect(await verifierLimite("auth", "1.2.3.4")).toBe(true);
  });

  it("préversion et local : sans limite (comme avant)", async () => {
    const { verifierLimite } = await module("preview");
    for (let i = 0; i < 30; i++) expect(await verifierLimite("planCreation", "u1")).toBe(true);
  });
});

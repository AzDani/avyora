import { afterEach, describe, expect, it, vi } from "vitest";

/* Production sans Upstash : « Mes plans », l'authentification (B2) et les PDF gardent des limites en mémoire
   (lib/ratelimit.ts), le reste (api, ia) est no-op. */
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

  it("production : le lien d'accès, 3 / h par adresse et IP (l'action passe `empreinte:ip`) et 20 / h par IP", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { verifierLimite } = await module("production");
    for (let i = 0; i < 3; i++) expect(await verifierLimite("lienAdresse", "a".repeat(32))).toBe(true);
    expect(await verifierLimite("lienAdresse", "a".repeat(32))).toBe(false);
    expect(await verifierLimite("lienAdresse", "b".repeat(32))).toBe(true);
    for (let i = 0; i < 20; i++) expect(await verifierLimite("lienIp", "1.2.3.4")).toBe(true);
    expect(await verifierLimite("lienIp", "1.2.3.4")).toBe(false);
  });

  it("production : le PDF du rapport (Chrome headless, ouvert à tout inscrit pendant la bêta), 5 / min et 30 / h par compte", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
      const { verifierLimite } = await module("production");
      for (let i = 0; i < 5; i++) expect(await verifierLimite("pdf", "u1")).toBe(true);
      expect(await verifierLimite("pdf", "u1")).toBe(false);
      expect(await verifierLimite("pdf", "u2")).toBe(true);
      // Une génération toutes les 61 s : la limite par minute laisse passer, la limite horaire arrête la 31ᵉ.
      for (let i = 0; i < 30; i++) {
        vi.setSystemTime(new Date(Date.parse("2026-10-15T11:00:00Z") + i * 61_000));
        expect(await verifierLimite("pdfHeure", "u3"), String(i)).toBe(true);
      }
      expect(await verifierLimite("pdfHeure", "u3")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("production : le PDF, 60 / h par IP (N comptes depuis une même machine ne multiplient pas la facture)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { verifierLimite } = await module("production");
      for (let i = 0; i < 60; i++) {
        vi.setSystemTime(new Date(Date.parse("2026-10-15T11:00:00Z") + i * 30_000));
        expect(await verifierLimite("pdfIp", "6.6.6.6"), String(i)).toBe(true);
      }
      expect(await verifierLimite("pdfIp", "6.6.6.6")).toBe(false);
      expect(await verifierLimite("pdfIp", "81.1.2.3")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("les catégories api et ia restent sans limite", async () => {
    const { verifierLimite } = await module("production");
    for (const k of ["api", "ia"] as const) {
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
    expect(prefixes).toHaveLength(12);
    expect(new Set(prefixes).size).toBe(12);
    for (const p of ["avyora:auth", "avyora:api", "avyora:pdf", "avyora:pdf-heure", "avyora:pdf-ip", "avyora:lien-adresse", "avyora:lien-ip", "avyora:marche"]) expect(prefixes).toContain(p);
  });

  it("store en panne : le plafond horaire des PDF se ferme (fail-closed), le lien d'accès reste ouvert", async () => {
    vi.resetModules();
    vi.doMock("@upstash/redis", () => ({ Redis: class {} }));
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        static slidingWindow() {
          return {};
        }
        async limit() {
          throw new Error("store indisponible");
        }
      }
      return { Ratelimit };
    });
    process.env.UPSTASH_REDIS_REST_URL = "https://exemple.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "jeton-de-test";
    try {
      const { verifierLimite } = await import("@/lib/ratelimit");
      expect(await verifierLimite("pdfHeure", "u1")).toBe(false);
      expect(await verifierLimite("pdfIp", "1.2.3.4")).toBe(false);
      expect(await verifierLimite("planCreation", "u1")).toBe(false);
      expect(await verifierLimite("lienAdresse", "a".repeat(32))).toBe(true);
      expect(await verifierLimite("pdf", "u1")).toBe(true);
    } finally {
      vi.doUnmock("@upstash/redis");
      vi.doUnmock("@upstash/ratelimit");
    }
  });
});

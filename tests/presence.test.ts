/**
 * Compteur « en ligne » de l'admin (22/11/2026) : sans cookie, une empreinte du jour, les robots et l'admin exclus,
 * un visiteur compté une fois même s'il a changé de page, la route du signal hors du proxy.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { readFileSync } from "node:fs";
import path from "node:path";
import { cheminPropre, compter, decoder, empreinte, encoder, estRobot, FENETRE_MS, geo } from "@/lib/presence";

const RACINE = path.join(__dirname, "..");

describe("presence · règles pures", () => {
  it("chemin : sans paramètres, identifiants masqués, /admin et l'extérieur refusés", () => {
    expect(cheminPropre("/")).toBe("/");
    expect(cheminPropre("/tarifs?plan=annuel#x")).toBe("/tarifs");
    expect(cheminPropre("/projets/3f2a9c1e-7b4d-4e2a-9f00-1234567890ab/")).toBe("/projets/…");
    expect(cheminPropre("/admin")).toBeNull();
    expect(cheminPropre("/admin/inscrits")).toBeNull();
    expect(cheminPropre("//evil.example/x")).toBeNull();
    expect(cheminPropre("https://evil.example/")).toBeNull();
    expect(cheminPropre("/<script>")).toBeNull();
    expect(cheminPropre(42)).toBeNull();
  });

  it("robots et clients sans navigateur exclus", () => {
    expect(estRobot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(estRobot("curl/8.0")).toBe(true);
    expect(estRobot(null)).toBe(true);
    expect(estRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
  });

  it("empreinte : courte, stable dans la journée, change le lendemain, ne contient pas l'IP", () => {
    const a = empreinte("1.2.3.4", "UA", "2026-11-22", "sel");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(empreinte("1.2.3.4", "UA", "2026-11-22", "sel")).toBe(a);
    expect(empreinte("1.2.3.4", "UA", "2026-11-23", "sel")).not.toBe(a);
    expect(a).not.toContain("1.2.3.4");
  });

  it("compte chaque visiteur une fois, sur sa page la plus récente, dans la fenêtre", () => {
    const t = 1_000_000;
    const r = compter(
      [
        { membre: "aaa|/", score: t - 40_000 }, /* ancien format (avant le 23/11) : toujours lu */
        { membre: encoder({ id: "aaa", chemin: "/plan", pays: "FR", ville: "Bordeaux" }), score: t - 5_000 }, /* a changé de page */
        { membre: encoder({ id: "u:42", chemin: "/plan", pays: "FR", ville: "Lyon", userId: "42" }), score: t - 10_000 },
        { membre: "ccc|/tarifs", score: t - 20_000 },
        { membre: "ddd|/", score: t - FENETRE_MS - 1 }, /* parti */
        { membre: "invalide", score: t },
      ],
      t,
    );
    expect(r.total).toBe(3);
    expect(r.pages).toEqual([{ chemin: "/plan", n: 2 }, { chemin: "/tarifs", n: 1 }]);
    expect(r.visiteurs.map((v) => [v.chemin, v.ville, v.userId])).toEqual([
      ["/plan", "Bordeaux", undefined],
      ["/plan", "Lyon", "42"],
      ["/tarifs", undefined, undefined],
    ]);
  });

  it("encodage : une ville avec « | » ou des accents survit à l'aller-retour", () => {
    const s = { id: "u:1", chemin: "/", pays: "FR", ville: "Saint-Émilion|x", userId: "1" };
    expect(decoder(encoder(s))).toEqual(s);
  });

  it("géolocalisation Vercel : pays en 2 lettres, ville décodée, rien d'autre ; absente en local", () => {
    expect(geo(new Headers({ "x-vercel-ip-country": "fr", "x-vercel-ip-city": "Saint-%C3%89milion" }))).toEqual({ pays: "FR", ville: "Saint-Émilion" });
    expect(geo(new Headers({ "x-vercel-ip-country": "France", "x-vercel-ip-city": "%3Cscript%3E" }))).toEqual({});
    expect(geo(new Headers())).toEqual({});
  });
});

describe("POST /api/presence", () => {
  afterEach(() => { vi.doUnmock("@/lib/presence"); vi.doUnmock("next/headers"); vi.resetModules(); });
  afterEach(() => vi.doUnmock("@/lib/supabase/server"));
  async function appel(corps: string, ua: string | null, session?: string) {
    vi.resetModules();
    const signaux: Record<string, unknown>[] = [];
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ ...(ua ? { "user-agent": ua } : {}), "x-forwarded-for": "9.9.9.9", "x-vercel-ip-country": "FR", "x-vercel-ip-city": "Bordeaux" }),
      cookies: async () => ({ getAll: () => (session ? [{ name: "sb-abc-auth-token", value: "x" }] : [{ name: "avy_lang", value: "fr" }]) }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: session } } }) } }) }));
    vi.doMock("@/lib/presence", async (orig) => ({ ...(await orig<object>()), signaler: async (sig: Record<string, unknown>) => { signaux.push(sig); } }));
    const { POST } = await import("@/app/api/presence/route");
    const r = await POST(new Request("http://x/api/presence", { method: "POST", body: corps }));
    return { status: r.status, signaux };
  }
  it("un navigateur sur une page : 204 et un signal", async () => {
    const r = await appel("/plan", "Mozilla/5.0 Safari");
    expect(r.status).toBe(204);
    expect(r.signaux).toHaveLength(1);
    expect(r.signaux[0]).toMatchObject({ chemin: "/plan", pays: "FR", ville: "Bordeaux" });
    expect(r.signaux[0].userId).toBeUndefined();
    expect(String(r.signaux[0].id)).toMatch(/^[0-9a-f]{16}$/);
  });
  it("membre connecté : compté sous son compte (jeton vérifié par getClaims)", async () => {
    const r = await appel("/projets", "Mozilla/5.0 Safari", "user-123");
    expect(r.signaux[0]).toMatchObject({ id: "u:user-123", userId: "user-123", chemin: "/projets" });
  });
  it("robot ou chemin refusé : 204 sans signal", async () => {
    expect((await appel("/plan", "Googlebot")).signaux).toEqual([]);
    expect((await appel("/admin", "Mozilla/5.0 Safari")).signaux).toEqual([]);
  });
});

describe("GET /api/admin/en-ligne", () => {
  afterEach(() => { vi.doUnmock("@/lib/auth"); vi.doUnmock("@/lib/presence"); vi.doUnmock("@/lib/supabase/admin"); vi.resetModules(); });
  it("réservé à l'admin ; sans Upstash, « indisponible »", async () => {
    vi.resetModules();
    const { NextResponse } = await import("next/server");
    vi.doMock("@/lib/auth", () => ({ gardeAdmin: async () => NextResponse.json({ error: "Accès refusé" }, { status: 403 }) }));
    expect((await (await import("@/app/api/admin/en-ligne/route")).GET()).status).toBe(403);
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ gardeAdmin: async () => null }));
    vi.doMock("@/lib/presence", () => ({ lireEnLigne: async () => null }));
    const r = await (await import("@/app/api/admin/en-ligne/route")).GET();
    expect(await r.json()).toEqual({ disponible: false });
  });
  it("membre connecté : pseudo et e-mail ajoutés ; visiteur sans compte : rien de plus", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ gardeAdmin: async () => null }));
    vi.doMock("@/lib/presence", () => ({
      lireEnLigne: async () => ({
        total: 2,
        pages: [{ chemin: "/plan", n: 2 }],
        visiteurs: [
          { cle: "u:42", chemin: "/plan", pays: "FR", ville: "Lyon", userId: "42", vuLe: 1 },
          { cle: "abcd1234", chemin: "/plan", pays: "BE", vuLe: 0 },
        ],
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      supabaseAdmin: () => ({ auth: { admin: { getUserById: async (id: string) => ({ data: { user: { id, email: "camille@exemple.fr", user_metadata: { username: "camille" } } } }) } } }),
    }));
    const corps = await (await (await import("@/app/api/admin/en-ligne/route")).GET()).json();
    expect(corps.visiteurs[0].compte).toEqual({ email: "camille@exemple.fr", username: "camille" });
    expect(corps.visiteurs[1]).not.toHaveProperty("compte");
  });
});

describe("branchements", () => {
  it("le signal et son script ne passent pas par le proxy (pas d'auth.getUser toutes les 30 s)", () => {
    const proxy = readFileSync(path.join(RACINE, "proxy.ts"), "utf8");
    expect(proxy).toContain("presence.js|api/presence|");
  });
  it("le script n'écrit rien sur l'appareil et ne signale pas les pages /admin", () => {
    const js = readFileSync(path.join(RACINE, "public", "presence.js"), "utf8");
    expect(js).not.toMatch(/localStorage|sessionStorage|document\.cookie|indexedDB/);
    expect(js).toContain('credentials: "same-origin"');
    expect(js).toContain('chemin.indexOf("/admin/") === 0');
  });
});

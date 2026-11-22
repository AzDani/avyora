/**
 * Mon compte · bloc Abonnement (revue du 12/11/2026) : « Gérer / résilier » seulement pour un vrai abonnement Stripe ;
 * un admin (ou un accès manuel) a les droits Pro sans rien à résilier. Le portail dit clairement un client inconnu.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import type { User } from "@supabase/supabase-js";
import { aUnAbonnementStripe } from "@/lib/auth";

const u = (app_metadata: Record<string, unknown>, email = "x@exemple.fr") => ({ id: "u1", email, app_metadata } as unknown as User);

describe("aUnAbonnementStripe", () => {
  it("plan payant ET client Stripe : oui", () => {
    expect(aUnAbonnementStripe(u({ plan: "pro", stripe_customer_id: "cus_ABC123" }))).toBe(true);
  });
  it("résilié (plan free) avec un vieil identifiant client : non", () => {
    expect(aUnAbonnementStripe(u({ plan: "free", stripe_customer_id: "cus_ABC123" }))).toBe(false);
  });
  it("plan pro sans client Stripe (accès manuel), personne, ou identifiant douteux : non", () => {
    expect(aUnAbonnementStripe(u({ plan: "pro" }))).toBe(false);
    expect(aUnAbonnementStripe(null)).toBe(false);
    expect(aUnAbonnementStripe(u({ plan: "pro", stripe_customer_id: 42 }))).toBe(false);
  });
});

describe("POST /api/abonnement/portail", () => {
  const MOCKS = ["@/lib/auth", "@/lib/stripe", "@/lib/i18n/server"];
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); vi.unstubAllEnvs(); vi.resetModules(); });
  async function appel(erreur: unknown, locale: "fr" | "en" = "fr") {
    vi.resetModules();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_factice");
    vi.doMock("@/lib/auth", () => ({ getUser: async () => u({ plan: "free", stripe_customer_id: "cus_TEST" }) }));
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale }));
    vi.doMock("@/lib/stripe", () => ({ getStripe: () => ({ billingPortal: { sessions: { create: async () => { throw erreur; } } } }) }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/abonnement/portail/route");
    const r = await POST(new Request("http://x/api/abonnement/portail", { method: "POST" }));
    return { status: r.status, corps: await r.json() };
  }
  it("client inconnu de Stripe : un message clair (200), pas une panne", async () => {
    const r = await appel({ code: "resource_missing" });
    expect(r.status).toBe(200);
    expect(r.corps.message).toMatch(/Aucun abonnement actif .* contact@getavyora\.fr/);
  });
  it("autre erreur Stripe : 500 avec un message lisible, en anglais pour un visiteur EN", async () => {
    const r = await appel(new Error("panne"), "en");
    expect(r.status).toBe(500);
    expect(r.corps.message).toMatch(/won't open right now/);
  });
});

describe("Mon compte · abonnement résilié qui court encore (22/11/2026)", () => {
  it("dit « résilié » et la date de fin, propose de réactiver ; sans date, rien ne change", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: AbonnementSection } = await import("@/components/AbonnementSection");
    const resilie = renderToStaticMarkup(createElement(AbonnementSection, { isPro: true, finLe: "22 décembre 2026" }));
    expect(resilie).toContain("Abonnement résilié : tu gardes toutes les fonctionnalités Pro jusqu&#x27;au 22 décembre 2026");
    expect(resilie).toContain("Résilié");
    expect(resilie).toContain("Gérer / réactiver mon abonnement");
    expect(resilie).not.toContain("Tu profites de toutes les fonctionnalités Pro.");
    const actif = renderToStaticMarkup(createElement(AbonnementSection, { isPro: true }));
    expect(actif).toContain("Tu profites de toutes les fonctionnalités Pro.");
    expect(actif).not.toContain("résilié");
  });
});

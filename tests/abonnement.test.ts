/**
 * Un abonné ne repaie pas (constat 17) : `abonnementEnCours` (lib/abonnement.ts) et la route de paiement, qui refuse
 * (409, renvoi vers Mon compte) un compte déjà abonné, ou dont le client Stripe a déjà un abonnement en cours. Aucun
 * appel réel à Stripe (simulé).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { abonnementEnCours, PAGE_GESTION_ABONNEMENT } from "@/lib/abonnement";

vi.mock("server-only", () => ({}));

describe("lib/abonnement", () => {
  it("en cours : actif, essai, impayé ; pas un paiement inachevé, expiré ou résilié", () => {
    for (const s of ["active", "trialing", "past_due", "unpaid"]) expect(abonnementEnCours(s), s).toBe(true);
    for (const s of ["incomplete", "incomplete_expired", "canceled", "paused", "", null, undefined]) expect(abonnementEnCours(s), String(s)).toBe(false);
  });
});

describe("/api/stripe/checkout : pas de deuxième abonnement", () => {
  afterEach(() => {
    for (const m of ["@/lib/auth", "@/lib/stripe"]) vi.doUnmock(m);
    vi.unstubAllEnvs();
  });

  async function payer(o: { abonne?: boolean; client?: string; statuts?: string[]; locale?: string }) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_BETA", "0"); // après la bêta : la route vend
    const creer = vi.fn(async () => ({ url: "https://checkout.stripe.test/s" }));
    const lister = vi.fn(async () => ({ data: (o.statuts ?? []).map((status) => ({ status })) }));
    vi.doMock("@/lib/auth", () => ({
      getUser: async () => ({ id: "u-1", email: "camille@exemple.fr", app_metadata: o.client ? { stripe_customer_id: o.client } : {} }),
      estAbonne: () => !!o.abonne,
    }));
    vi.doMock("@/lib/stripe", () => ({
      priceIdForPlan: () => "price_test",
      getStripe: () => ({ checkout: { sessions: { create: creer } }, subscriptions: { list: lister } }),
    }));
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const res = await POST(new Request("https://getavyora.fr/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "mensuel" }),
      headers: o.locale ? { "x-av-locale": o.locale } : {},
    }));
    return { statut: res.status, corps: await res.json(), creer, lister };
  }

  it("déjà abonné (plan posé par le webhook, accès manuel) : 409 et Mon compte, sans appeler Stripe", async () => {
    const r = await payer({ abonne: true });
    expect(r.statut).toBe(409);
    expect(r.corps).toEqual({ error: expect.stringMatching(/déjà un abonnement/), portail: PAGE_GESTION_ABONNEMENT });
    expect(r.creer).not.toHaveBeenCalled();
    expect(r.lister).not.toHaveBeenCalled();
    expect((await payer({ abonne: true, locale: "en" })).corps.error).toMatch(/already have an active subscription/);
  });

  it("le client Stripe a déjà un abonnement en cours (le webhook n'est pas encore passé) : 409 ; un ancien résilié : on peut repayer", async () => {
    let r = await payer({ client: "cus_1", statuts: ["canceled", "past_due"] });
    expect(r.statut).toBe(409);
    expect(r.lister).toHaveBeenCalledWith({ customer: "cus_1", status: "all", limit: 20 });
    expect(r.creer).not.toHaveBeenCalled();
    r = await payer({ client: "cus_1", statuts: ["canceled", "incomplete_expired"] });
    expect(r.statut).toBe(200);
    expect(r.creer).toHaveBeenCalledTimes(1);
    // Sans client Stripe : rien à lister, le paiement part.
    r = await payer({});
    expect(r.statut).toBe(200);
    expect(r.lister).not.toHaveBeenCalled();
  });
});

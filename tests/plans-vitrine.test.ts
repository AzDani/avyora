/**
 * C5 · la vitrine-hub `/logiciel-plan-maison` : 404 interrupteur éteint ; allumée, son HTML serveur est
 * celui d'un visiteur sans compte (l'appel « Créer mon plan » vers `/plan`), sans lecture de session,
 * en FR et en EN (avec la mention « The editor is in French for now » en anglais seulement).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { prerender } from "react-dom/static";

const MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "server-only"];

async function page(plans: boolean, locale: "fr" | "en") {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale }));
  /* La page ne doit JAMAIS lire la session : toute lecture fait échouer le test. */
  vi.doMock("@/lib/auth", () => ({
    getUser: async () => {
      throw new Error("la vitrine a lu la session");
    },
    estPro: () => false,
  }));
  vi.doMock("server-only", () => ({}));
  const mod = await import("@/app/logiciel-plan-maison/page");
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  const el = await mod.default();
  const { prelude } = await prerender(createElement(LangProvider, { locale, children: el }));
  return { html: await new Response(prelude).text(), metadata: mod.metadata };
}

afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
});

describe("C5 · /logiciel-plan-maison", () => {
  it("interrupteur éteint → 404", async () => {
    await expect(page(false, "fr")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("FR : titre, appel vers /plan, hauteur réservée, aucune mention anglaise", async () => {
    const { html, metadata } = await page(true, "fr");
    expect(html).toContain("<h1");
    expect(html).toContain("Dessine le plan de ta maison, gratuitement, et vois-le en 3D");
    expect(html).toContain('href="/plan"');
    expect(html).toContain("Créer mon plan, gratuit");
    expect(html).toContain("Le dessin se fait sur ordinateur ou tablette.");
    expect(html).toContain("min-h-[19rem]");
    expect(html).not.toContain("The editor is in French");
    expect(html).not.toMatch(/\d+[,.]\d{2}\s?€|€\s?\d/);
    expect(metadata.title.length).toBeLessThanOrEqual(51);
    expect(metadata.description.length).toBeLessThanOrEqual(155);
    expect(metadata.alternates.canonical).toBe("/logiciel-plan-maison");
  });

  it("EN : interface en anglais et « The editor is in French for now »", async () => {
    const { html } = await page(true, "en");
    expect(html).toContain("Draw your house plan for free, and see it in 3D");
    expect(html).toContain("Create my plan, free");
    expect(html).toContain("The editor is in French for now.");
    expect(html).not.toContain("Créer mon plan");
  });
});

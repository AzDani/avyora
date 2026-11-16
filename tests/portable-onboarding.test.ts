/**
 * Portable au questionnaire de bienvenue (décision de Dani du 16/11/2026) : normalisation, refus d'un fixe,
 * revérification côté serveur, champ présent et lié à son aide.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normaliserPortable, afficherPortable } from "@/lib/telephone";

describe("normaliserPortable", () => {
  it("écritures françaises courantes → +33…", () => {
    for (const s of ["06 12 34 56 78", "06.12.34.56.78", "0612345678", "+33 6 12 34 56 78", "0033612345678", "07-12-34-56-78"]) {
      const r = normaliserPortable(s);
      expect(r.ok, s).toBe(true);
    }
    expect(normaliserPortable("06 12 34 56 78")).toEqual({ ok: true, tel: "+33612345678" });
  });
  it("numéro étranger au format international accepté", () => {
    expect(normaliserPortable("+1 305 555 0142")).toEqual({ ok: true, tel: "+13055550142" });
  });
  it("vide, illisible, trop court, fixe français : refusés avec la bonne raison", () => {
    expect(normaliserPortable("  ")).toEqual({ ok: false, erreur: "vide" });
    expect(normaliserPortable("appelle-moi")).toEqual({ ok: false, erreur: "format" });
    expect(normaliserPortable("06 12")).toEqual({ ok: false, erreur: "format" });
    expect(normaliserPortable("05 56 12 34 56")).toEqual({ ok: false, erreur: "pasPortable" });
    expect(normaliserPortable("+33 6 12 34 56 7")).toEqual({ ok: false, erreur: "format" });
  });
  it("affichage lisible", () => {
    expect(afficherPortable("+33612345678")).toBe("+33 6 12 34 56 78");
    expect(afficherPortable("+13055550142")).toBe("+13055550142");
  });
});

describe("enregistrerProfil revérifie le portable", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/server"); vi.resetModules(); });
  async function action() {
    const ecrit: unknown[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { updateUser: async (x: unknown) => { ecrit.push(x); return { error: null }; } } }) }));
    const m = await import("@/lib/actions/profil");
    return { m, ecrit };
  }
  const base = { tuEs: [], objectif: "", maturite: [], region: "", age: "", canal: "Bouche-à-oreille" };
  it("numéro valide : normalisé dans le profil", async () => {
    const { m, ecrit } = await action();
    expect(await m.enregistrerProfil({ ...base, telephone: "06 12 34 56 78" })).toEqual({ ok: true });
    expect((ecrit[0] as { data: { profil: { telephone: string } } }).data.profil.telephone).toBe("+33612345678");
  });
  it("numéro illisible : refusé, rien n'est écrit", async () => {
    const { m, ecrit } = await action();
    expect(await m.enregistrerProfil({ ...base, telephone: "<script>" })).toEqual({ ok: false, erreur: "telephone" });
    expect(ecrit).toHaveLength(0);
  });
});

describe("le questionnaire affiche le champ portable", () => {
  it("label lié, type tel, aide liée, en tête du questionnaire", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
    vi.doMock("@/components/i18n/LangProvider", () => ({ useLocale: () => "fr" }));
    vi.doMock("@/lib/actions/profil", () => ({ enregistrerProfil: async () => ({ ok: true }), sauterOnboarding: async () => ({ ok: true }) }));
    const { default: F } = await import("@/components/OnboardingForm");
    const html = renderToStaticMarkup(createElement(F));
    expect(html).toContain("Ton numéro de portable");
    expect(html).toMatch(/<input[^>]*type="tel"[^>]*autoComplete="tel"|<input[^>]*type="tel"/);
    expect(html.indexOf("Ton numéro de portable")).toBeLessThan(html.indexOf("Tu es…"));
    expect(html).toContain("Jamais revendu, pas de démarchage.");
    vi.doUnmock("next/navigation"); vi.doUnmock("@/components/i18n/LangProvider"); vi.doUnmock("@/lib/actions/profil");
  });
});

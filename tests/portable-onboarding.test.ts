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
    // « Tu es… » a quitté ce formulaire (26/11/2026) : le type de compte a sa rubrique, passer pro demande un SIRET.
    expect(html).not.toContain("Tu es…");
    expect(html).not.toContain("Ton âge");
    expect(html).toContain("Jamais revendu, pas de démarchage.");
    vi.doUnmock("next/navigation"); vi.doUnmock("@/components/i18n/LangProvider"); vi.doUnmock("@/lib/actions/profil");
  });
});

describe("enregistrerPortable (rappel aux inscrits sans numéro) : n'écrit que le portable", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/server"); vi.resetModules(); });
  async function action(meta: Record<string, unknown> | null) {
    const ecrit: { data: Record<string, unknown> }[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        auth: {
          getUser: async () => ({ data: { user: meta ? { id: "u1", user_metadata: meta } : null } }),
          updateUser: async (x: { data: Record<string, unknown> }) => { ecrit.push(x); return { error: null }; },
        },
      }),
    }));
    const m = await import("@/lib/actions/profil");
    return { m, ecrit };
  }
  it("fusionne dans le profil existant, sans toucher au reste ni à onboarding_fait", async () => {
    const { m, ecrit } = await action({ profil: { tuEs: ["investisseur"], canal: "Instagram" }, onboarding_fait: true });
    expect(await m.enregistrerPortable("07 12 34 56 78")).toEqual({ ok: true });
    expect(ecrit[0].data).toEqual({ profil: { tuEs: ["investisseur"], canal: "Instagram", telephone: "+33712345678" } });
  });
  it("sans profil : un profil avec le seul portable", async () => {
    const { m, ecrit } = await action({});
    expect(await m.enregistrerPortable("+1 305 555 0142")).toEqual({ ok: true });
    expect(ecrit[0].data).toEqual({ profil: { telephone: "+13055550142" } });
  });
  it("fixe, illisible ou sans session : refusé, rien n'est écrit", async () => {
    let r = await action({ profil: {} });
    expect(await r.m.enregistrerPortable("05 56 12 34 56")).toEqual({ ok: false, erreur: "telephone" });
    expect(await r.m.enregistrerPortable("<b>")).toEqual({ ok: false, erreur: "telephone" });
    expect(r.ecrit).toHaveLength(0);
    r = await action(null);
    expect(await r.m.enregistrerPortable("06 12 34 56 78")).toEqual({ ok: false, erreur: "session" });
    expect(r.ecrit).toHaveLength(0);
  });
});

describe("admin : recherche d'un inscrit par son portable", () => {
  it("trouve le numéro écrit à la française, à l'internationale ou en morceau ; pas sur un e-mail", async () => {
    const { telCorrespond } = await import("@/components/admin/InscritsTable");
    const tel = "+33 6 12 34 56 78";
    for (const q of ["06 12 34 56 78", "0612", "+33 6 12", "0033612345678", "34 56 78"]) expect(telCorrespond(tel, q), q).toBe(true);
    for (const q of ["07 12", "jean2024", "12", ""]) expect(telCorrespond(tel, q), q).toBe(false);
    expect(telCorrespond("", "0612")).toBe(false);
  });
});

describe("rappel « Ajoute ton portable »", () => {
  it("rendu serveur visible (pas d'insertion après coup), champ tel étiqueté, « Plus tard »", async () => {
    vi.resetModules();
    const { default: RappelPortable } = await import("@/components/RappelPortable");
    const html = renderToStaticMarkup(createElement(RappelPortable, { locale: "fr" }));
    expect(html).toContain("Ajoute ton numéro de portable");
    expect(html).toMatch(/<label for="([^"]+)-tel" class="sr-only">Ton numéro de portable<\/label><input id="\1-tel" type="tel"/);
    expect(html).toContain(">Plus tard</button>");
    const en = renderToStaticMarkup(createElement(RappelPortable, { locale: "en" }));
    expect(en).toContain('placeholder="+33 6 12 34 56 78"');
  });
});

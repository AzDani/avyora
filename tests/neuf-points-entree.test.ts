/**
 * Points d'entrée de la construction neuve (chantier C5), derrière `FEATURES.neuf` :
 * bascule de `/projets/nouveau`, bandeau de l'accueil (FR et EN), puce Pro de `/tarifs`.
 * Flag éteint : le HTML de l'écran de choix et de l'accueil ne porte aucune trace du neuf, et les
 * cartes rénovation sont identiques au caractère près quel que soit le flag.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";

type Locale = "fr" | "en";

async function charger(neuf: boolean, locale: Locale) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    /* les plans à part (leurs points d'entrée ont leurs propres tests) : ici, seul le neuf varie */
    return { ...m, FEATURES: { ...m.FEATURES, neuf, plans: false } };
  });
  vi.doMock("@/lib/i18n/server", () => ({
    getLocale: async () => locale,
    getT: async () => ({ locale, t: dict(locale) }),
  }));
  const Choix = (await import("@/components/ChoixEstimation")).default;
  const Accueil = (await import("@/app/page")).default;
  return {
    choix: async (isPro: boolean, nature?: "reno" | "neuf") =>
      renderToStaticMarkup((await Choix({ isPro, nature })) as ReactElement),
    accueil: async () =>
      renderToStaticMarkup((await Accueil({ searchParams: Promise.resolve({}) })) as ReactElement),
  };
}

/** Les deux cartes (la grille), sans l'en-tête, la bascule ni le CSS. */
const grille = (html: string) => html.slice(html.indexOf('<div class="grid">'), html.indexOf('<div class="hint">'));

beforeEach(() => { vi.doUnmock("@/lib/features"); vi.doUnmock("@/lib/i18n/server"); });

describe("Écran de choix · flag éteint", () => {
  it("aucune bascule, et ?nature=neuf ne change rien", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(false, locale);
      for (const isPro of [true, false]) {
        const reno = await r.choix(isPro), neuf = await r.choix(isPro, "neuf");
        expect(neuf).toBe(reno);
        expect(reno).not.toContain('class="nature"');
        expect(reno).not.toContain("construction");
        expect(reno).toContain('href="/estimation-travaux"');
      }
    }
  });
});

describe("Écran de choix · flag allumé", () => {
  it("les cartes rénovation sont identiques au caractère près à celles du flag éteint", async () => {
    for (const locale of ["fr", "en"] as const) {
      const off = await charger(false, locale);
      const a = [await off.choix(true), await off.choix(false)];
      const on = await charger(true, locale);
      const b = [await on.choix(true), await on.choix(false)];
      expect(grille(b[0])).toBe(grille(a[0]));
      expect(grille(b[1])).toBe(grille(a[1]));
    }
  });

  it("une bascule à deux liens, l'actif marqué aria-current", async () => {
    const r = await charger(true, "fr");
    const reno = await r.choix(false), neuf = await r.choix(false, "neuf");
    const t = dictNeuf("fr").choix;
    expect(reno).toContain(`<nav class="nature" aria-label="${t.natureAria}">`);
    expect(reno).toContain(`<a aria-current="page" href="/projets/nouveau">${t.reno}</a>`);
    expect(reno).toContain(`<a href="/projets/nouveau?nature=neuf">${t.neuf}</a>`);
    expect(neuf).toContain(`<a href="/projets/nouveau">${t.reno}</a>`);
    expect(neuf).toContain(`<a aria-current="page" href="/projets/nouveau?nature=neuf">${t.neuf}</a>`);
  });

  it("en neuf : textes de la construction, rapide public et détaillé Pro du neuf", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(true, locale);
      const t = dictNeuf(locale).choix;
      const pro = await r.choix(true, "neuf"), gratuit = await r.choix(false, "neuf");
      for (const html of [pro, gratuit]) {
        expect(html).toContain('href="/estimation-construction-maison"');
        expect(html).not.toContain('href="/estimation-travaux"');
        for (const k of ["titre", "rapideLead", "rapideF1", "detailLead", "detailF1"] as const) {
          expect(html).toContain(t[k].replace(/'/g, "&#x27;"));
        }
      }
      expect(pro).toContain('href="/projets/nouveau/construction?new=1"');
      expect(gratuit).not.toContain("/projets/nouveau/construction");
      expect(gratuit).toContain('<a class="btn btn-pro" href="/tarifs">');
    }
  });
});

describe("Accueil · bandeau construction neuve", () => {
  it("flag éteint : aucune trace du neuf (FR et EN)", async () => {
    for (const locale of ["fr", "en"] as const) {
      const html = await (await charger(false, locale)).accueil();
      expect(html).not.toContain("estimation-construction-maison");
    }
  });

  it("flag allumé : un seul bandeau vers la page publique, sans prix ni emoji, juste après les étapes", async () => {
    for (const locale of ["fr", "en"] as const) {
      const off = await (await charger(false, locale)).accueil();
      const on = await (await charger(true, locale)).accueil();
      // Le bandeau = son <style> (variante « lien » de .strip) + le lien lui-même.
      const liens = on.match(/<style>\.av-home a\.strip-neuf[^]*?<\/style><a href="\/estimation-construction-maison" class="strip strip-neuf"[^]*?<\/a>/g) ?? [];
      expect(liens).toHaveLength(1);
      const bandeau = liens[0] ?? "";
      const texte = bandeau.replace(/<style>[^]*?<\/style>/, "").replace(/<[^>]*>/g, " ");
      expect(texte).not.toMatch(/€|\d{3}/);
      expect(texte).not.toMatch(/\p{Extended_Pictographic}/u);
      // Retirer le bandeau redonne l'accueil d'origine au caractère près.
      expect(on.replace("\n  " + bandeau, "")).toBe(off);
    }
  });
});

describe("Textes ajoutés", () => {
  it("puce Pro, pied de page et bascule : FR et EN présents, sans emoji", () => {
    for (const locale of ["fr", "en"] as const) {
      const t = dict(locale);
      const textes = [t.tarifs.featureNeuf, t.footer.construction, ...Object.values(dictNeuf(locale).choix)];
      for (const s of textes) {
        expect(s.length).toBeGreaterThan(0);
        expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(s).not.toMatch(/€/);
      }
      expect(t.tarifs.features).not.toContain(t.tarifs.featureNeuf);
    }
  });
});

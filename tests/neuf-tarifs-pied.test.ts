/**
 * Points d'entrée de la construction neuve (C5), rendus pour de vrai : la 6ᵉ puce Pro de `/tarifs`
 * et le lien « construction » du pied de page (layout racine), flag éteint et allumé, FR et EN.
 * Flag éteint : aucune trace du neuf. Flag allumé : la puce en dernier, le lien juste après
 * « Prix par ville », et retirer l'ajout redonne le HTML d'origine au caractère près.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "@/lib/i18n/dictionaries";

type Locale = "fr" | "en";
const vide = () => null;

async function charger(neuf: boolean, locale: Locale) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, neuf } };
  });
  vi.doMock("@/lib/i18n/server", () => ({
    getLocale: async () => locale,
    getT: async () => ({ locale, t: dict(locale) }),
  }));
  vi.doMock("@/lib/auth", () => ({ getUser: async () => null, estPro: () => false }));
  // Le layout : polices, scripts tiers et navigation connectée hors sujet ici.
  vi.doMock("next/font/google", () => ({ Geist: () => ({ variable: "" }), Geist_Mono: () => ({ variable: "" }) }));
  vi.doMock("next/script", () => ({ default: vide }));
  vi.doMock("@vercel/analytics/react", () => ({ Analytics: vide }));
  vi.doMock("@/components/auth/AuthNav", () => ({ AuthNav: vide }));
  vi.doMock("@/components/MobileNav", () => ({ MobileNav: vide }));
  vi.doMock("@/components/i18n/LangSwitch", () => ({ default: vide }));
  vi.doMock("@/app/globals.css", () => ({}));
  const Tarifs = (await import("@/app/tarifs/page")).default;
  const Layout = (await import("@/app/layout")).default;
  return {
    tarifs: async () => renderToStaticMarkup((await Tarifs({ searchParams: Promise.resolve({}) })) as ReactElement),
    pied: async () => {
      const html = renderToStaticMarkup((await Layout({ children: createElement("p", null, "contenu") })) as ReactElement);
      return html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    },
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

beforeEach(() => {
  for (const m of ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "next/font/google", "next/script",
    "@vercel/analytics/react", "@/components/auth/AuthNav", "@/components/MobileNav", "@/components/i18n/LangSwitch", "@/app/globals.css"]) vi.doUnmock(m);
});

describe("/tarifs · 6ᵉ puce Pro", () => {
  it("flag éteint : les 5 puces d'origine, pas de puce neuf ; allumé : la puce neuf en dernier, rien d'autre ne bouge", async () => {
    for (const locale of ["fr", "en"] as const) {
      const t = dict(locale).tarifs;
      const off = await (await charger(false, locale)).tarifs();
      const on = await (await charger(true, locale)).tarifs();
      for (const f of t.features) expect(off).toContain(esc(f));
      expect(off).not.toContain(esc(t.featureNeuf));
      expect(on.split(esc(t.featureNeuf))).toHaveLength(2);
      // La puce neuf vient après la dernière puce d'origine.
      expect(on.indexOf(esc(t.featureNeuf))).toBeGreaterThan(on.indexOf(esc(t.features[t.features.length - 1])));
      // Retirer l'élément de liste ajouté redonne la page d'origine au caractère près.
      const li = on.match(new RegExp(`<li[^>]*>(?:(?!<li).)*?${esc(t.featureNeuf).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</li>`, "s"));
      expect(li).not.toBeNull();
      expect(on.replace(li![0], "")).toBe(off);
    }
  });
});

describe("Pied de page · lien construction neuve", () => {
  it("flag éteint : aucun lien ; allumé : un seul lien, juste après « Prix par ville »", async () => {
    for (const locale of ["fr", "en"] as const) {
      const t = dict(locale).footer;
      const off = await (await charger(false, locale)).pied();
      const on = await (await charger(true, locale)).pied();
      expect(off).not.toContain("estimation-construction-maison");
      const lien = `<a class="transition-colors hover:text-brand-700" href="/estimation-construction-maison">${esc(t.construction)}</a>`;
      expect(on.split(lien)).toHaveLength(2);
      const ville = `<a class="transition-colors hover:text-brand-700" href="/prix-renovation">${esc(t.prixVille)}</a>`;
      expect(on).toContain(ville + lien);
      expect(on.replace(lien, "")).toBe(off);
    }
  });
});

describe("/projets/nouveau · metadata", () => {
  // La metadata d'avant le neuf, recopiée : flag éteint, elle doit revenir à l'identique.
  const AVANT = {
    title: "Estimer ses travaux de rénovation — gratuit, sans inscription",
    description:
      "Choisis ton mode d'estimation : rapide et gratuite en 4 questions, ou détaillée poste par poste. Prix du marché français ajustés à ta région.",
    alternates: { canonical: "/projets/nouveau" },
  };
  const meta = async (neuf: boolean, sp: { nature?: string | string[] }) => {
    await charger(neuf, "fr");
    const { generateMetadata } = await import("@/app/projets/nouveau/page");
    return generateMetadata({ searchParams: Promise.resolve(sp) });
  };

  it("flag éteint : identique à avant, quel que soit ?nature", async () => {
    for (const sp of [{}, { nature: "neuf" }, { nature: ["neuf"] }, { nature: "reno" }]) {
      expect(JSON.stringify(await meta(false, sp))).toBe(JSON.stringify(AVANT));
    }
  });

  it("flag allumé : titre et description du neuf seulement pour ?nature=neuf, canonical inchangé", async () => {
    expect(JSON.stringify(await meta(true, {}))).toBe(JSON.stringify(AVANT));
    expect(JSON.stringify(await meta(true, { nature: "autre" }))).toBe(JSON.stringify(AVANT));
    const n = await meta(true, { nature: "neuf" });
    expect(n.title).not.toBe(AVANT.title);
    expect(String(n.title)).toMatch(/construction/i);
    expect(n.description).not.toBe(AVANT.description);
    expect(n.alternates).toEqual({ canonical: "/projets/nouveau" });
    expect(`${n.title} ${n.description}`).not.toMatch(/€|\p{Extended_Pictographic}/u);
  });
});

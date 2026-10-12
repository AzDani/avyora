/**
 * Points d'entrée de la construction neuve (chantier C5), derrière `FEATURES.neuf` :
 * pré-page « Quel est ton projet ? » de `/projets/nouveau` (N2, elle remplace la bascule), bandeau de
 * l'accueil (FR et EN), puce Pro de `/tarifs`. Flag éteint : `/projets/nouveau` rend l'écran de la
 * rénovation quel que soit `?nature`, sans pré-page ni surtitre, et les cartes rénovation sont
 * identiques au caractère près quel que soit le flag (hors la source de mesure des liens vers /tarifs).
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
  // La page lit la session pour l'écran Rapide / Détaillée, jamais pour la pré-page : les lectures sont comptées.
  const session = { lectures: 0, pro: false };
  vi.doMock("@/lib/auth", () => ({
    getUser: async () => { session.lectures++; return session.pro ? { id: "u", app_metadata: { plan: "pro" } } : null; },
    estPro: (u: { app_metadata?: { plan?: string } } | null) => u?.app_metadata?.plan === "pro",
  }));
  const Choix = (await import("@/components/ChoixEstimation")).default;
  const ChoixNature = (await import("@/components/ChoixNature")).default;
  const Page = (await import("@/app/projets/nouveau/page")).default;
  const Accueil = (await import("@/app/page")).default;
  return {
    session,
    choix: async (isPro: boolean, nature?: "reno" | "neuf") =>
      renderToStaticMarkup((await Choix({ isPro, nature })) as ReactElement),
    prePage: async () => renderToStaticMarkup((await ChoixNature()) as ReactElement),
    // La page rend un composant serveur asynchrone (ChoixNature ou ChoixEstimation) : on l'appelle avant le rendu statique.
    page: async (sp: { nature?: string | string[] }, pro = false) => {
      session.pro = pro;
      const el = (await Page({ searchParams: Promise.resolve(sp) })) as ReactElement<Record<string, unknown>>;
      const composant = el.type as (p: Record<string, unknown>) => Promise<ReactElement>;
      return renderToStaticMarkup(await composant(el.props));
    },
    accueil: async () =>
      renderToStaticMarkup((await Accueil({ searchParams: Promise.resolve({}) })) as ReactElement),
  };
}

/** Les deux cartes (la grille), sans l'en-tête, la bascule ni le CSS. */
const grille = (html: string) => html.slice(html.indexOf('<div class="grid">'), html.indexOf('<div class="hint">'));

beforeEach(() => { vi.doUnmock("@/lib/features"); vi.doUnmock("@/lib/i18n/server"); vi.doUnmock("@/lib/auth"); });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("Écran de choix · flag éteint", () => {
  it("ni surtitre de nature ni source, et ?nature=neuf ne change rien", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(false, locale);
      for (const isPro of [true, false]) {
        const reno = await r.choix(isPro), neuf = await r.choix(isPro, "neuf");
        expect(neuf).toBe(reno);
        expect(reno).not.toContain('class="nature"');
        expect(reno).not.toContain('class="sur"');
        expect(reno).not.toContain("changer");
        expect(reno).not.toContain("?source=");
        expect(reno).not.toContain("construction");
        expect(reno).toContain(`<p class="eyebrow">${esc(dict(locale).choix.eyebrow)}</p>`);
        expect(reno).toContain('href="/estimation-travaux"');
      }
    }
  });

  it("/projets/nouveau : l'écran de la rénovation quel que soit ?nature, jamais la pré-page", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(false, locale);
      for (const pro of [false, true]) {
        const attendu = await r.choix(pro);
        for (const sp of [{}, { nature: "reno" }, { nature: "neuf" }, { nature: "autre" }, { nature: ["neuf"] }]) {
          const html = await r.page(sp, pro);
          expect(html).toBe(attendu);
          expect(html).not.toContain("natures");
          expect(html).not.toContain("data-choix-nature");
        }
      }
    }
  });
});

describe("Pré-page « Quel est ton projet ? » · flag allumé", () => {
  it("le h1, deux cartes-liens mesurées (rénovation puis neuf), l'indice ; pas les cartes Rapide / Détaillée", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(true, locale);
      const t = dictNeuf(locale).choix;
      const html = await r.prePage();
      expect(html).toContain(`<h1 class="ttl">${esc(t.preTitre)}</h1>`);
      const liens = html.match(/<a [^>]*>/g) ?? [];
      expect(liens).toEqual([
        '<a class="nat" aria-labelledby="nat-reno-t" aria-describedby="nat-reno-d" data-choix-nature="reno" href="/projets/nouveau?nature=reno">',
        '<a class="nat" aria-labelledby="nat-neuf-t" aria-describedby="nat-neuf-d" data-choix-nature="neuf" href="/projets/nouveau?nature=neuf">',
      ]);
      expect(html).toContain(`<nav class="natures" aria-label="${esc(t.natureAria)}">`);
      expect(html).toContain(`<h2 id="nat-reno-t">${esc(t.reno)}</h2><p id="nat-reno-d">${esc(t.renoDesc)}</p>`);
      expect(html).toContain(`<h2 id="nat-neuf-t">${esc(t.neuf)}</h2><p id="nat-neuf-d">${esc(t.neufDesc)}</p>`);
      expect(html).toContain(esc(t.preHint));
      // Pas un choix payant : ni carte Pro, ni pastille, ni lien vers les tarifs ou un estimateur (hors CSS partagé).
      const corps = html.replace(/<style>[^]*?<\/style>/, "");
      for (const x of ["ch-card", "propill", "/tarifs", "/estimation-travaux", "/estimation-construction-maison", "plan-band"]) {
        expect(corps).not.toContain(x);
      }
    }
  });

  it("/projets/nouveau sans nature (ou inconnue) : la pré-page, sans lire la session ; reno / neuf : l'écran de la nature", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(true, locale);
      const pre = await r.prePage();
      r.session.lectures = 0;
      for (const sp of [{}, { nature: "autre" }, { nature: "" }, { nature: ["neuf"] }, { nature: "NEUF" }]) {
        expect(await r.page(sp)).toBe(pre);
      }
      expect(r.session.lectures).toBe(0);
      for (const pro of [false, true]) {
        expect(await r.page({ nature: "reno" }, pro)).toBe(await r.choix(pro, "reno"));
        expect(await r.page({ nature: "neuf" }, pro)).toBe(await r.choix(pro, "neuf"));
      }
      expect(r.session.lectures).toBe(4);
    }
  });
});

describe("Écran de choix · flag allumé", () => {
  it("les cartes rénovation sont identiques au caractère près à celles du flag éteint, hors la source des liens Tarifs", async () => {
    for (const locale of ["fr", "en"] as const) {
      const off = await charger(false, locale);
      const a = [await off.choix(true), await off.choix(false)];
      const on = await charger(true, locale);
      const b = [await on.choix(true), await on.choix(false)];
      expect(grille(b[0])).toBe(grille(a[0]));
      expect(grille(b[1]).split('href="/tarifs?source=choix-reno"')).toHaveLength(3);
      expect(grille(b[1]).replaceAll('href="/tarifs?source=choix-reno"', 'href="/tarifs"')).toBe(grille(a[1]));
    }
  });

  it("plus de bascule : le surtitre dit la nature, avec un lien « Changer » vers la pré-page", async () => {
    for (const locale of ["fr", "en"] as const) {
      const r = await charger(true, locale);
      const t = dictNeuf(locale).choix, eyebrow = dict(locale).choix.eyebrow;
      const changer = `<a class="changer" aria-label="${esc(t.changerAria)}" href="/projets/nouveau">${esc(t.changer)}</a>`;
      for (const isPro of [false, true]) {
        const reno = await r.choix(isPro), neuf = await r.choix(isPro, "neuf");
        expect(reno).toContain(`<div class="sur"><p class="eyebrow">${esc(`${eyebrow} · ${t.reno}`)}</p>${changer}</div>`);
        expect(neuf).toContain(`<div class="sur"><p class="eyebrow">${esc(`${eyebrow} · ${t.neuf}`)}</p>${changer}</div>`);
        for (const html of [reno, neuf]) {
          expect(html).not.toContain('class="nature"');
          expect(html).not.toContain("aria-current");
          expect(html.split('href="/projets/nouveau"')).toHaveLength(2); // le seul lien vers la pré-page : « Changer »
        }
      }
      // Le libellé accessible contient le texte visible (WCAG 2.5.3).
      expect(t.changerAria.startsWith(t.changer)).toBe(true);
    }
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
      expect(gratuit).toContain('<a class="btn btn-pro" href="/tarifs?source=choix-neuf">');
      expect(gratuit).not.toContain("source=choix-reno");
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
  it("puce Pro, pied de page, pré-page et surtitre : FR et EN présents, sans emoji", () => {
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

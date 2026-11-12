/**
 * Revue « version anglaise » : la 404, l'écran d'erreur et le mot de passe oublié dans la langue choisie (constats 41,
 * 86, 121), les titres d'onglet et descriptions en anglais (55, 122) sans toucher au français des robots, le format
 * monétaire anglais « €80,000 » partout (123), la navigation nommée en anglais (128) et le bouton EN d'une page qui
 * n'existe qu'en français (120).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import { dict } from "@/lib/i18n/dictionaries";
import { euros, eurosM2, euroAvant, euroApres } from "@/lib/i18n/nombres";
import { META_EN, metaSelonLangue } from "@/lib/i18n/meta";
import { validerMotDePasse } from "@/lib/password";
import { LangProvider } from "@/components/i18n/LangProvider";
import { pageFigee, FRANCAIS_SEULEMENT } from "@/components/i18n/LangSwitch";
import type { Locale } from "@/lib/i18n/config";

const LOCALES = ["fr", "en"] as const;
const MOCKS = ["@/lib/i18n/server", "server-only", "@/components/auth/forms", "next/navigation"];
afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.resetModules();
});

/** Les pages serveur avec la langue choisie (le proxy pose `x-av-locale` ; ici, getT/getLocale simulés). */
async function avecLangue(locale: Locale) {
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
  vi.doMock("@/components/auth/forms", () => ({ ResetRequestForm: () => null, UpdatePasswordForm: () => null }));
}
async function html(el: ReactElement, locale: Locale): Promise<string> {
  const { prelude } = await prerender(createElement(LangProvider, { locale, children: el }));
  return (await new Response(prelude).text()).replace(/&#x27;/g, "'");
}

/* ─── 123 · le format monétaire ─────────────────────────────────────────────────────────────── */

describe("123 · l'euro selon la langue", () => {
  it("français : inchangé, l'euro après le montant", () => {
    expect(euros("fr", 80000).replace(/ /g, " ")).toBe("80 000 €");
    expect(eurosM2("fr", 967).replace(/ /g, " ")).toBe("967 €/m²");
    expect(euroAvant("fr") + "•••" + euroApres("fr")).toBe("••• €");
  });
  it("anglais : l'euro devant, comme l'accueil et /tarifs (« €80,000 »)", () => {
    expect(euros("en", 80000)).toBe("€80,000");
    expect(euros("en", 101077.4)).toBe("€101,077");
    expect(euros("en", -1200)).toBe("-€1,200");
    expect(euros("en", -0.2)).toBe("€0"); // jamais « -€0 »
    expect(euros("en", Number.NaN)).toBe("€0");
    expect(eurosM2("en", 2475)).toBe("€2,475/m²");
    expect(euroAvant("en") + "•••" + euroApres("en")).toBe("€•••");
  });
  it("le dictionnaire anglais l'écrit déjà ainsi : aucune unité « € incl. VAT » qui suivrait un montant", async () => {
    const { dictDetail } = await import("@/lib/i18n/detail");
    const { dictNeuf } = await import("@/lib/i18n/neuf");
    expect(dictDetail("en").live.ttc).not.toContain("€");
    expect(dictNeuf("en").detail.ttc).not.toContain("€");
    expect(dictNeuf("en").saisie.parM2).toBe("/m²");
    expect(dictDetail("fr").live.ttc).toBe("€ TTC"); // le français ne bouge pas
  });
});

/* ─── 55 / 122 · titres et descriptions ─────────────────────────────────────────────────────── */

describe("55 / 122 · métadonnées dans la langue de la page", () => {
  const FR = {
    title: "Estimation travaux gratuite",
    description: "Une description française.",
    alternates: { canonical: "/estimation-travaux" },
    robots: { index: false, follow: true },
  };
  it("français (les robots, sans cookie) : l'objet reçu, tel quel", () => {
    expect(metaSelonLangue("fr", FR, META_EN.estimationTravaux)).toBe(FR);
  });
  it("anglais : titre, description, Open Graph en_US ; canonical et robots gardés", () => {
    const m = metaSelonLangue("en", FR, META_EN.estimationTravaux);
    expect(m.title).toBe(META_EN.estimationTravaux.title);
    expect(m.description).toBe(META_EN.estimationTravaux.description);
    expect(m.alternates).toEqual(FR.alternates);
    expect(m.robots).toEqual(FR.robots);
    expect((m.openGraph as { locale?: string }).locale).toBe("en_US");
  });
  it("anglais sans description propre : celle du site en anglais, jamais celle du layout en français", () => {
    const m = metaSelonLangue("en", {}, META_EN.defaut);
    expect(m.title).toEqual({ absolute: META_EN.defaut.title });
    expect(m.description).toBe(META_EN.accueil.description);
  });
  it("les textes anglais tiennent dans les mêmes longueurs que le français, sans un mot français", () => {
    for (const [cle, v] of Object.entries(META_EN) as [string, { title?: string; description?: string }][]) {
      if (v.title) expect(v.title.length, cle).toBeLessThanOrEqual(51);
      if (v.description) expect(v.description.length, cle).toBeLessThanOrEqual(155);
      expect(`${v.title ?? ""} ${v.description ?? ""}`, cle).not.toMatch(/[éèàùç]|\b(ton|tes|travaux|gratuit)\b/i);
    }
  });
});

/* ─── 41 / 121 · la 404 et l'écran d'erreur ─────────────────────────────────────────────────── */

describe("41 / 121 · la 404 et l'écran d'erreur suivent la langue", () => {
  for (const l of LOCALES) {
    it(`${l} · 404 : textes et titre d'onglet`, async () => {
      await avecLangue(l);
      const mod = await import("@/app/not-found");
      const h = await html(await mod.default(), l);
      const t = dict(l).introuvable;
      for (const s of [t.titre, t.texte, t.accueil, t.estimer]) expect(h).toContain(s);
      const meta = await mod.generateMetadata();
      expect(meta.title).toBe(t.titre);
      if (l === "en") {
        expect(h).not.toContain("Page introuvable");
        expect(meta.description).toBe(META_EN.accueil.description);
      } else {
        expect(meta).toEqual({ title: "Page introuvable" }); // le français d'avant, au caractère près
      }
    });

    it(`${l} · écran d'erreur`, async () => {
      vi.resetModules(); // le composant et SON LangProvider : la même instance de contexte
      const { default: Erreur } = await import("@/app/error");
      const { LangProvider } = await import("@/components/i18n/LangProvider");
      const h = renderToStaticMarkup(
        createElement(LangProvider, { locale: l, children: createElement(Erreur, { error: Object.assign(new Error("x"), { digest: "abc" }), reset: () => {} }) }),
      ).replace(/&#x27;/g, "'");
      const t = dict(l).erreur;
      for (const s of [t.titre, t.texte, t.reessayer, t.accueil, `${t.ref} abc`]) expect(h).toContain(s);
      if (l === "en") expect(h).not.toMatch(/Réessayer|Une erreur/);
    });
  }
});

/* ─── 86 / 121 · mot de passe oublié ────────────────────────────────────────────────────────── */

describe("86 / 121 · /reset et /reset/definir dans la langue choisie", () => {
  for (const l of LOCALES) {
    it(`${l} · /reset : surtitre, titre, introduction, retour, titre d'onglet`, async () => {
      await avecLangue(l);
      const mod = await import("@/app/reset/page");
      const h = await html(await mod.default(), l);
      const t = dict(l).auth.reset;
      for (const s of [t.eyebrow, t.titre, t.sous, t.retour]) expect(h).toContain(s);
      expect((await mod.generateMetadata()).title).toBe(t.metaTitre);
      if (l === "en") expect(h).not.toMatch(/Réinitialisation|Mot de passe oublié|Retour à la connexion/);
    });
  }

  it("les deux langues ont les mêmes messages, et l'anglais n'en garde aucun en français", () => {
    const fr = dict("fr").auth.reset, en = dict("en").auth.reset;
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const [k, v] of Object.entries(en)) expect(v, k).not.toMatch(/[éèàùç]|\bton\b|\btu\b/i);
    expect(fr.titre).toBe("Mot de passe oublié"); // le français d'avant
  });

  it("validerMotDePasse : français par défaut, anglais sur demande", () => {
    expect(validerMotDePasse("court1")).toBe("Le mot de passe doit faire au moins 12 caractères.");
    expect(validerMotDePasse("court1", "en")).toBe("Your password must be at least 12 characters long.");
    expect(validerMotDePasse("sanschiffreaucun", "en")).toBe("Add at least one number.");
    expect(validerMotDePasse("123456789012", "en")).toBe("Add at least one letter.");
    expect(validerMotDePasse("bonne-phrase-42", "en")).toBeNull();
  });
});

/* ─── 128 · la navigation de l'en-tête ──────────────────────────────────────────────────────── */

describe("128 · le nom de la navigation principale", () => {
  it("traduit, le français inchangé", () => {
    expect(dict("fr").nav.navPrincipale).toBe("Navigation principale");
    expect(dict("en").nav.navPrincipale).toBe("Main navigation");
  });
});

/* ─── 120 · le bouton EN d'une page en français seulement ───────────────────────────────────── */

describe("120 · sélecteur de langue sur une page pré-rendue en français", () => {
  it("figée quand la langue choisie n'est pas celle du rendu, une fois le rafraîchissement fini", () => {
    expect(pageFigee("fr", "en", false)).toBe(true); // /cgu, /guides… après un clic sur EN
    expect(pageFigee("fr", "en", true)).toBe(false); // rafraîchissement en cours : on attend
    expect(pageFigee("en", "en", false)).toBe(false); // page traduite
    expect(pageFigee("fr", "fr", false)).toBe(false);
    expect(pageFigee("fr", null, false)).toBe(false); // pas encore de choix (ou côté serveur)
  });
  it("l'info-bulle le dit dans les deux langues", () => {
    expect(FRANCAIS_SEULEMENT).toBe("Page available in French only · Page disponible en français uniquement");
  });
  it("rendu serveur : les deux boutons actifs, rien de désactivé (le cookie se lit au navigateur)", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
    const { default: LangSwitch } = await import("@/components/i18n/LangSwitch");
    const { LangProvider } = await import("@/components/i18n/LangProvider");
    const h = renderToStaticMarkup(createElement(LangProvider, { locale: "fr", children: createElement(LangSwitch) }));
    expect(h).toContain('aria-pressed="true"');
    expect(h).not.toContain("aria-disabled");
    expect(h).not.toContain("title=");
  });
});

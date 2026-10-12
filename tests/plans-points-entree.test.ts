/**
 * C9 · la mise en avant de l'éditeur de plan, derrière `FEATURES.plans` : l'onglet « Plan 3D » (en-tête desktop et
 * menu mobile), la section de l'accueil juste après le hero, le bandeau « Partir de mon plan » de l'écran de choix,
 * la puce et l'encart de Tarifs, le pied de page, la ligne de la page neuf, la vitrine complète et le sitemap.
 *
 * Interrupteur éteint : aucune trace (les témoins C0 figent le HTML au caractère près, `plans-temoins.test.ts`).
 * Interrupteur allumé : chaque surface est celle d'avant PLUS l'ajout, et seulement lui (on retire l'ajout, on
 * retrouve le HTML éteint au caractère près) ; la grille Gratuit / Pro de l'écran de choix ne bouge pas.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dict } from "@/lib/i18n/dictionaries";
import { dictPlans } from "@/lib/i18n/plans";
import { COLONNE_GRATUIT, COLONNE_PRO, PUCE_TARIFS } from "@/lib/plans/droits";

type Locale = "fr" | "en";
type Utilisateur = "anonyme" | "gratuit" | "pro" | "admin";
const LOCALES = ["fr", "en"] as const;
const vide = () => null;

const UTILISATEURS: Record<Utilisateur, unknown> = {
  anonyme: null,
  gratuit: { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {} },
  pro: { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" } },
  admin: { id: "u-admin", email: "admin@exemple.fr", user_metadata: {}, app_metadata: {} },
};
const estAdmin = (u: unknown) => (u as { email?: string } | null)?.email === "admin@exemple.fr";
const estPro = (u: unknown) =>
  !!u && (estAdmin(u) || (u as { app_metadata?: { plan?: string } }).app_metadata?.plan === "pro");

const MOCKS = [
  "@/lib/features", "@/lib/i18n/server", "@/lib/auth", "next/navigation", "next/font/google", "next/script",
  "@vercel/analytics/react", "@/app/globals.css", "server-only", "react", "@/components/neuf/EstimateurRapideNeuf",
];

type Options = { plans: boolean; locale: Locale; user?: Utilisateur; neuf?: boolean; menuOuvert?: boolean; chemin?: string };

async function charger({ plans, locale, user = "anonyme", neuf = true, menuOuvert = false, chemin = "/" }: Options) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, neuf, plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
  vi.doMock("@/lib/auth", () => ({ getUser: async () => UTILISATEURS[user], estPro, estAdmin }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const routeur = { push: vide, replace: vide, refresh: vide, back: vide, forward: vide, prefetch: vide };
    return { ...m, useRouter: () => routeur, usePathname: () => chemin, useSearchParams: () => new URLSearchParams() };
  });
  vi.doMock("server-only", () => ({}));
  vi.doMock("next/font/google", () => ({ Geist: () => ({ variable: "" }), Geist_Mono: () => ({ variable: "" }) }));
  vi.doMock("next/script", () => ({ default: vide }));
  vi.doMock("@vercel/analytics/react", () => ({ Analytics: vide }));
  vi.doMock("@/app/globals.css", () => ({}));
  vi.doMock("@/components/neuf/EstimateurRapideNeuf", () => ({ default: () => createElement("div", { id: "estimateur" }) }));
  if (menuOuvert) {
    vi.doMock("react", async (orig) => {
      const m = await orig<typeof import("react")>();
      const useState = ((init: unknown) => m.useState(init === false ? true : init)) as typeof m.useState;
      return { ...m, useState, default: { ...m, useState } };
    });
  }
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  return {
    rendre: async (el: ReactNode) => {
      const { prelude } = await prerender(createElement(LangProvider, { locale, children: el }));
      return await new Response(prelude).text();
    },
  };
}

afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.unstubAllEnvs();
});

const entre = (s: string, debut: string, fin: string) => {
  const i = s.indexOf(debut), j = s.indexOf(fin, i);
  expect(i).toBeGreaterThanOrEqual(0);
  expect(j).toBeGreaterThan(i);
  return s.slice(i, j + fin.length);
};
/** Retire exactement une occurrence de `re` (et vérifie qu'il y en a une et une seule). */
const retirerUne = (h: string, re: RegExp) => {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  expect(h.match(g)?.length ?? 0, re.source).toBe(1);
  return h.replace(g, "");
};
/** Les mots d'un fragment, dans l'ordre (balises et attributs retirés). */
const texte = (h: string) => h.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
const echap = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

const PRIX = /\d+[,.]\d{2}\s?€|€\s?\d/;
const EMOJI = /\p{Extended_Pictographic}/u;

async function layout(o: Options) {
  const r = await charger(o);
  const Layout = (await import("@/app/layout")).default;
  const page = await r.rendre(await Layout({ children: createElement("p", null, "contenu") }));
  return { header: entre(page, "<header", "</header>"), footer: entre(page, "<footer", "</footer>") };
}

/* ─── L'onglet (desktop) et le pied de page ─────────────────────────────────── */

describe("C9 · onglet « Plan 3D » de l'en-tête desktop, et pied de page", () => {
  /* C10 : le lien porte son origine de mesure (data-clic-plan, liste fermée de lib/plans/mesure.ts) */
  const ONGLET = /<a data-onglet-plan="" class="[^"]*" data-clic-plan="nav" href="\/logiciel-plan-maison">[\s\S]*?<\/a>/;

  it("interrupteur éteint : ni onglet, ni lien de pied, aucune trace de l'éditeur", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
        const { header, footer } = await layout({ plans: false, locale, user });
        expect(header + footer).not.toContain("logiciel-plan-maison");
        expect(header + footer).not.toMatch(/href="\/plan[?"]/);
      }
    }
  });

  it("allumé : premier lien de la nav (avant Projets), blanc plein, pastille ; sans lui, l'en-tête d'avant au caractère près", async () => {
    for (const locale of LOCALES) {
      const t = dict(locale).nav;
      for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
        const avant = await layout({ plans: false, locale, user });
        const apres = await layout({ plans: true, locale, user });
        const onglet = apres.header.match(ONGLET)?.[0] ?? "";
        expect(onglet).toContain(`${t.plan}<span`);
        expect(onglet).toContain(`>${t.planPastille}</span>`);
        expect(onglet).toContain("text-white");
        expect(onglet).toContain("<svg");
        expect(onglet).not.toContain("aria-current");
        const nav = apres.header.slice(apres.header.indexOf('<nav aria-label="Navigation principale"'));
        expect(nav.indexOf("data-onglet-plan")).toBeLessThan(nav.indexOf('href="/projets"'));
        expect(nav.indexOf("<a")).toBe(nav.indexOf("<a data-onglet-plan"));
        /* le reste de l'en-tête dit les mêmes mots, dans le même ordre (seule la mise en page compacte change) */
        expect(texte(retirerUne(apres.header, ONGLET))).toBe(texte(avant.header));
      }
    }
  });

  it("allumé : la largeur (mesurée à 640, 768 et 1 024 px) — nav inline dès md, menu en dessous ; prénom en icône sous xl, Admin et Déconnexion sous lg, langue au pied entre md et lg", async () => {
    for (const locale of LOCALES) {
      const t = dict(locale).nav;
      for (const user of ["anonyme", "gratuit", "admin"] as const) {
        const { header } = await layout({ plans: true, locale, user });
        expect(header).toContain('<nav aria-label="Navigation principale" class="hidden items-center gap-1 text-sm md:flex">');
        expect(header).toContain('<div class="md:hidden">');
        expect(header).toMatch(/<span class="hidden items-center lg:inline-flex"><span class="mx-1 h-4 w-px bg-white\/15" aria-hidden="true"><\/span><div class="inline-flex/);
        if (user === "anonyme") continue;
        const prenom = user === "gratuit" ? "Camille" : "admin";
        expect(header).toContain(`aria-label="${t.monCompte} · ${prenom}"`);
        expect(header).toContain(`<span class="hidden truncate xl:inline">${prenom}</span>`);
        expect(header).toContain(`aria-label="${t.deconnexion}"`);
        expect(header).toContain(`<span class="hidden lg:inline">${t.deconnexion}</span>`);
        if (user === "admin") expect(header).toContain('<span class="hidden lg:inline">Admin</span>');
      }
    }
  });

  it("allumé : aria-current sur la vitrine seulement", async () => {
    const ici = await layout({ plans: true, locale: "fr", chemin: "/logiciel-plan-maison" });
    expect(ici.header).toMatch(/<a aria-current="page" data-onglet-plan=""/);
    const ailleurs = await layout({ plans: true, locale: "fr", chemin: "/projets" });
    expect(ailleurs.header).not.toContain('aria-current="page"');
  });

  it("allumé : le pied de page gagne « Plan de maison 3D » (FR, EN), et seulement lui", async () => {
    for (const locale of LOCALES) {
      const avant = await layout({ plans: false, locale });
      const apres = await layout({ plans: true, locale });
      const lien = new RegExp(`<a class="[^"]*" data-clic-plan="pied" href="/logiciel-plan-maison">${dict(locale).footer.plan}</a>`);
      expect(retirerUne(apres.footer, lien).replace(/© \d{4}/, "")).toBe(avant.footer.replace(/© \d{4}/, ""));
    }
  });
});

/* ─── Le menu mobile ─────────────────────────────────────────────────────────── */

describe("C9 · menu mobile", () => {
  const LIGNE = /<a data-onglet-plan="" class="[^"]*" data-clic-plan="nav_mobile" href="\/logiciel-plan-maison">[\s\S]*?<\/a>/;

  it("allumé : une ligne contrastée juste sous « Nouveau projet », pas un 2ᵉ bouton plein ; sans elle, le menu d'avant", async () => {
    for (const locale of LOCALES) {
      for (const user of ["anonyme", "gratuit", "pro", "admin"] as const) {
        const rendu: string[] = [];
        for (const plans of [false, true]) {
          const r = await charger({ plans, locale, user, menuOuvert: true });
          const { MobileNav } = await import("@/components/MobileNav");
          rendu.push(await r.rendre(createElement(MobileNav)));
        }
        expect(rendu[0]).not.toContain("logiciel-plan-maison");
        const ligne = rendu[1].match(LIGNE)?.[0] ?? "";
        expect(ligne).toContain("bg-brand-50");
        expect(ligne).toContain("text-brand-700");
        expect(ligne).not.toContain("bg-brand-600");
        expect(ligne).toContain(dict(locale).nav.planPastille);
        const iNouveau = rendu[1].indexOf('href="/projets/nouveau"'), iLigne = rendu[1].indexOf("data-onglet-plan"), iProjets = rendu[1].indexOf('href="/projets"');
        expect(iNouveau).toBeLessThan(iLigne);
        expect(iLigne).toBeLessThan(iProjets);
        expect(retirerUne(rendu[1], LIGNE)).toBe(rendu[0]);
      }
    }
  });
});

/* ─── L'accueil ──────────────────────────────────────────────────────────────── */

describe("C9 · accueil", () => {
  async function accueil(plans: boolean, locale: Locale, neuf = true) {
    const r = await charger({ plans, locale, neuf });
    const Accueil = (await import("@/app/page")).default;
    return r.rendre(await Accueil({ searchParams: Promise.resolve({}) }));
  }
  const BAND = /\n<style>\.av-home \.planb[\s\S]*?<\/section>/;
  const TRUST = { fr: "<span>plan <b>3D</b></span>", en: "<span><b>3D</b> floor plan</span>" };

  it("éteint : aucune section, aucune puce, aucune image de l'éditeur", async () => {
    for (const locale of LOCALES) {
      const h = await accueil(false, locale);
      expect(h).not.toContain("planb");
      expect(h).not.toContain("/plans/");
      expect(h).not.toContain(TRUST[locale]);
    }
  });

  it("allumé : la section une seule fois, JUSTE après le hero, la 5ᵉ puce de confiance ; le reste au caractère près", async () => {
    for (const locale of LOCALES) {
      const avant = await accueil(false, locale);
      const apres = await accueil(true, locale);
      expect(apres.split('class="planb"').length - 1).toBe(1);
      const finHero = apres.indexOf("</div></header></div>") + "</div></header></div>".length;
      expect(apres.slice(finHero)).toMatch(/^\n<style>\.av-home \.planb/);
      expect(apres).toContain(TRUST[locale] + "\n  </div>");
      expect(retirerUne(retirerUne(apres, BAND), new RegExp(TRUST[locale].replace(/[/<>]/g, (c) => "\\" + c)))).toBe(avant);
      /* le hero et ses deux boutons ne bougent pas */
      expect(entre(apres, '<header class="hero">', "</header>").replace(TRUST[locale], "")).toBe(entre(avant, '<header class="hero">', "</header>"));
    }
  });

  it("allumé : deux vraies captures (webp 760 / 1040 + PNG, largeur et hauteur), « Créer mon plan » → /plan, la vitrine, la note", async () => {
    for (const locale of LOCALES) {
      const band = (await accueil(true, locale)).match(BAND)?.[0] ?? "";
      for (const nom of ["maison-2d", "maison-3d"]) {
        expect(band).toContain(`srcset="/plans/${nom}-760.webp 760w, /plans/${nom}-1040.webp 1040w"`);
        /* la 2D est l'élément LCP au bureau : chargée tout de suite ; la 3D reste différée (jury) */
        expect(band).toContain(`src="/plans/${nom}.png" width="1040" height="650" loading="${nom === "maison-2d" ? "eager" : "lazy"}"`);
      }
      /* au bureau « Créer mon plan » → /plan ; au téléphone (on n'y dessine pas) → la vitrine (jury) */
      expect(band).toMatch(/<a href="\/plan" class="btn btn-p bureau" data-clic-plan="accueil">(Créer mon plan|Create my plan) →<\/a>/);
      expect(band).toMatch(/<a href="\/logiciel-plan-maison" class="btn btn-p tel" data-clic-plan="accueil">(Créer mon plan|Create my plan) →<\/a>/);
      expect(band).toContain("@media(max-width:600px){.av-home .planb .bureau{display:none}.av-home .planb .tel{display:inline-flex}}");
      expect(band).toContain('href="/logiciel-plan-maison" class="lien bureau" data-clic-plan="accueil"');
      expect(band).toContain('href="/logiciel-plan-maison"');
      expect(band).toContain(locale === "fr" ? "Le dessin se fait sur ordinateur ou tablette." : "The editor is in French for now.");
      expect(band).not.toMatch(PRIX);
      expect(band).not.toMatch(EMOJI);
      expect(band).not.toMatch(/\b(estimer|budget|neuf|travaux)\b/i);
    }
  });

  it("la 3ᵉ puce (chiffrer depuis le plan) seulement si le neuf est en ligne", async () => {
    expect(await accueil(true, "fr", true)).toContain("<li>Ta future maison chiffrée depuis ton plan</li>");
    expect(await accueil(true, "fr", false)).not.toContain("Ta future maison chiffrée");
    expect(await accueil(true, "en", true)).toContain("<li>Your future house priced from your plan</li>");
    expect(await accueil(true, "en", false)).not.toContain("Your future house priced");
  });
});

/* ─── L'écran de choix ───────────────────────────────────────────────────────── */

describe("C9 · écran de choix : le bandeau « Partir de mon plan »", () => {
  async function choix(plans: boolean, locale: Locale, isPro: boolean, nature: "reno" | "neuf") {
    const r = await charger({ plans, locale });
    const Choix = (await import("@/components/ChoixEstimation")).default;
    return r.rendre(await Choix({ isPro, nature }));
  }
  const BANDEAU = /<aside class="plan-band"[\s\S]*?<\/aside>/;
  const grille = (h: string) => h.slice(h.indexOf('<div class="grid">'), h.indexOf("</section></div>") + "</section></div>".length);

  it("allumé : la grille identique, le bandeau entre la grille et l'indice, et rien d'autre (hors son CSS)", async () => {
    for (const locale of LOCALES) {
      for (const nature of ["reno", "neuf"] as const) {
        for (const isPro of [false, true]) {
          const avant = await choix(false, locale, isPro, nature);
          const apres = await choix(true, locale, isPro, nature);
          expect(avant).not.toContain("plan-band");
          expect(grille(apres)).toBe(grille(avant));
          const iBandeau = apres.indexOf('<aside class="plan-band"');
          expect(iBandeau).toBeGreaterThan(apres.indexOf("</section></div>"));
          expect(iBandeau).toBeLessThan(apres.indexOf('<div class="hint">'));
          const sansCss = (h: string) => h.replace(/\n\.av-choix \.plan-band[\s\S]*?(?=<\/style>)/, "");
          expect(sansCss(retirerUne(apres, BANDEAU))).toBe(avant);
        }
      }
    }
  });

  it("neuf → Plan final ; rénovation Pro → Projet rénovation ; rénovation gratuit → pastille Pro et Tarifs", async () => {
    for (const locale of LOCALES) {
      const t = dictPlans(locale).choix;
      const b = async (isPro: boolean, nature: "reno" | "neuf") => (await choix(true, locale, isPro, nature)).match(BANDEAU)![0];
      for (const isPro of [false, true]) {
        const n = await b(isPro, "neuf");
        expect(n).toContain(`href="/plan?type=final"`);
        expect(n).toContain(echap(t.neufTexte));
        expect(n).not.toContain("propill");
        expect(n).toContain('class="plan-partir"');
      }
      const pro = await b(true, "reno");
      expect(pro).toContain(`href="/plan?type=renovation"`);
      expect(pro).toContain(echap(t.renoLien));
      expect(pro).not.toContain("propill");
      const gratuit = await b(false, "reno");
      expect(gratuit).toContain(`href="/tarifs?source=choix-plan"`);
      expect(gratuit).toContain(echap(t.renoLienGratuit));
      expect(gratuit).toContain(`<span class="tag propill">${t.pro}</span>`);
      expect(gratuit).not.toContain("plan-partir");
      expect(gratuit).not.toContain("/plan?");
    }
  });
});

/* ─── Tarifs ─────────────────────────────────────────────────────────────────── */

describe("C9 · Tarifs", () => {
  async function tarifs(plans: boolean, locale: Locale, user: Utilisateur, sp: Record<string, string> = {}) {
    const r = await charger({ plans, locale, user });
    const Tarifs = (await import("@/app/tarifs/page")).default;
    return r.rendre(await Tarifs({ searchParams: Promise.resolve(sp) }));
  }

  it("la puce reprend DROITS mot pour mot (FR), et l'encart les droits Pro de la vitrine", () => {
    const t = dict("fr").tarifs;
    expect(t.featurePlan).toBe("Éditeur de plan : " + PUCE_TARIFS.join(" ; "));
    expect(t.depuisEditeurDroits).toEqual([...COLONNE_PRO]);
    expect(dict("en").tarifs.depuisEditeurDroits).toHaveLength(COLONNE_PRO.length);
    for (const l of LOCALES) {
      const tt = dict(l);
      for (const s of [tt.nav.plan, tt.nav.planPastille, tt.footer.plan, tt.tarifs.featurePlan, tt.tarifs.planGratuit, tt.tarifs.depuisEditeur, ...tt.tarifs.depuisEditeurDroits]) {
        expect(s, s).not.toMatch(PRIX);
        expect(s, s).not.toMatch(EMOJI);
      }
    }
  });

  it("allumé : la 7ᵉ puce juste après celle du neuf, puis la ligne « dessiner reste gratuit » ; le reste au caractère près", async () => {
    for (const locale of LOCALES) {
      const t = dict(locale).tarifs;
      for (const user of ["anonyme", "gratuit", "pro"] as const) {
        const avant = await tarifs(false, locale, user);
        const apres = await tarifs(true, locale, user);
        expect(avant).not.toContain(echap(t.featurePlan));
        const iNeuf = apres.indexOf(echap(t.featureNeuf)), iPlan = apres.indexOf(echap(t.featurePlan));
        expect(iNeuf).toBeGreaterThan(0);
        expect(iPlan).toBeGreaterThan(iNeuf);
        const puce = new RegExp(`<li class="[^"]*"><svg(?:(?!<li).)*?</svg>${echap(t.featurePlan).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</li>`);
        const ligne = `<p class="mt-4 text-[13px] text-muted">${echap(t.planGratuit)}</p>`;
        expect(apres).toContain(ligne);
        expect(retirerUne(apres, puce).replace(ligne, "")).toBe(avant);
      }
    }
  });

  it("?source=editeur-plan : l'encart « Tu viens de l'éditeur de plan » (pas pour un Pro) ; éteint ou source inconnue : rien", async () => {
    for (const locale of LOCALES) {
      const t = dict(locale).tarifs;
      const encart = await tarifs(true, locale, "anonyme", { source: "editeur-plan" });
      expect(encart).toContain("data-depuis-editeur");
      expect(encart).toContain(echap(t.depuisEditeur));
      for (const d of t.depuisEditeurDroits) expect(encart).toContain(echap(d.charAt(0).toUpperCase() + d.slice(1)));
      expect(await tarifs(true, locale, "gratuit", { source: "editeur-plan" })).toContain("data-depuis-editeur");
      expect(await tarifs(true, locale, "pro", { source: "editeur-plan" })).not.toContain("data-depuis-editeur");
      expect(await tarifs(true, locale, "anonyme", { source: "choix-plan" })).not.toContain("data-depuis-editeur");
      expect(await tarifs(true, locale, "anonyme", { source: "autre" })).toBe(await tarifs(true, locale, "anonyme"));
      expect(await tarifs(false, locale, "anonyme", { source: "editeur-plan" })).toBe(await tarifs(false, locale, "anonyme"));
    }
  });
});

/* ─── La page neuf ───────────────────────────────────────────────────────────── */

describe("C9 · /estimation-construction-maison", () => {
  async function neufPage(plans: boolean, locale: Locale, sp: Record<string, string> = {}) {
    const r = await charger({ plans, locale });
    const Page = (await import("@/app/estimation-construction-maison/page")).default;
    return r.rendre(await Page({ searchParams: Promise.resolve(sp) }));
  }
  const LIGNE = /<p class="mt-3 text-\[14px\] text-muted" data-ligne-plan="">[\s\S]*?<\/p>/;

  it("allumé : « Pas encore de plan ? Dessine ta maison… » vers un Plan final, dans l'en-tête ; éteint : rien", async () => {
    for (const locale of LOCALES) {
      const t = dictPlans(locale).neuf;
      const avant = await neufPage(false, locale);
      const apres = await neufPage(true, locale);
      expect(avant).not.toContain("/plan?");
      const ligne = apres.match(LIGNE)?.[0] ?? "";
      expect(ligne).toContain(`href="/plan?type=final"`);
      expect(ligne).toContain(echap(t.lien));
      expect(apres.indexOf("data-ligne-plan")).toBeLessThan(apres.indexOf("</header>"));
      expect(retirerUne(apres, LIGNE)).toBe(avant);
      /* une balise <a> (pas de préchargement de /plan), et au téléphone la note « sur ordinateur ou tablette » */
      expect(ligne).toMatch(/<a href="\/plan\?type=final"/);
      expect(ligne).toContain(echap(dictPlans(locale).hub.dessinNote));
    }
  });

  it("arrivée depuis l'éditeur (?source=editeur-plan) : pas de « Pas encore de plan ? » (jury)", async () => {
    for (const locale of LOCALES) {
      const html = await neufPage(true, locale, { source: "editeur-plan" });
      expect(html).not.toContain("data-ligne-plan");
      expect(html).not.toContain(echap(dictPlans(locale).neuf.avant));
    }
  });
});

/* ─── La vitrine ─────────────────────────────────────────────────────────────── */

describe("C9 · la vitrine /logiciel-plan-maison", () => {
  async function vitrine(locale: Locale, neuf = true) {
    const r = await charger({ plans: true, locale, neuf });
    vi.doMock("@/lib/auth", () => ({
      getUser: async () => {
        throw new Error("la vitrine a lu la session");
      },
      estPro: () => false,
    }));
    const mod = await import("@/app/logiciel-plan-maison/page");
    return { html: await r.rendre(await mod.default()), metadata: mod.metadata };
  }
  const jsonLd = (h: string) => {
    const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    return JSON.parse(m![1]) as { "@graph": Record<string, unknown>[] };
  };

  it("le contenu : trois gestes, ce que tu peux faire, après le plan, Gratuit / Pro (mots de DROITS), FAQ, appel du bas", async () => {
    for (const locale of LOCALES) {
      const v = dictPlans(locale).vitrine;
      const { html } = await vitrine(locale);
      expect(html.match(/<h1/g)).toHaveLength(1);
      for (const g of v.gestes) expect(html).toContain(echap(g.titre));
      for (const c of v.capacites) expect(html).toContain(echap(c));
      expect(html).toContain(echap(v.construireTexte));
      expect(html).toContain(echap(v.renoverTexte));
      const maj = (s: string) => echap(s.charAt(0).toUpperCase() + s.slice(1));
      const gratuit = entre(html, 'data-colonne="gratuit"', "</ul>"), pro = entre(html, 'data-colonne="pro"', "</ul>");
      for (const x of v.gratuitListe) expect(gratuit).toContain(maj(x));
      for (const x of v.proListe) expect(pro).toContain(maj(x));
      expect(html).toContain('href="/tarifs?source=editeur-plan"');
      expect(html.match(/<details/g)).toHaveLength(v.faq.length);
      for (const f of v.faq) {
        expect(html).toContain(echap(f.q));
        expect(html).toContain(echap(f.r));
      }
      for (const nom of ["maison-2d", "maison-3d"]) expect(html).toContain(`src="/plans/${nom}.png"`);
      expect(html).not.toMatch(PRIX);
      expect(html).not.toMatch(EMOJI);
    }
    expect([...dictPlans("fr").vitrine.gratuitListe]).toEqual([...COLONNE_GRATUIT]);
    expect([...dictPlans("fr").vitrine.proListe]).toEqual([...COLONNE_PRO]);
  });

  it("FAQ permis : architecte obligatoire au-delà de 150 m² de SURFACE DE PLANCHER (pas d'emprise au sol)", () => {
    const fr = dictPlans("fr").vitrine.faq.find((f) => /permis/.test(f.q))!;
    expect(fr.r).toContain("au-delà de 150 m² de surface de plancher");
    expect(fr.r).not.toMatch(/emprise/i);
    const en = dictPlans("en").vitrine.faq.find((f) => /permit/.test(f.q))!;
    expect(en.r).toContain("above 150 m² of floor area");
  });

  it("« Tu fais construire » seulement si le neuf est en ligne ; « Tu rénoves » toujours, avec la pastille Pro", async () => {
    const v = dictPlans("fr").vitrine;
    expect((await vitrine("fr", true)).html).toContain(echap(v.construireTexte));
    const sans = (await vitrine("fr", false)).html;
    expect(sans).not.toContain(echap(v.construireTexte));
    expect(sans).toContain(echap(v.renoverTexte));
  });

  it("JSON-LD : WebApplication gratuite sans note ni avis, fil d'Ariane, FAQPage = les questions affichées", async () => {
    for (const locale of LOCALES) {
      const { html } = await vitrine(locale);
      const g = jsonLd(html)["@graph"];
      const app = g.find((x) => x["@type"] === "WebApplication")!;
      expect(app.isAccessibleForFree).toBe(true);
      expect((app.offers as { price: string }).price).toBe("0");
      expect(JSON.stringify(g)).not.toMatch(/aggregateRating|review|ratingValue/i);
      const fil = g.find((x) => x["@type"] === "BreadcrumbList")!;
      expect((fil.itemListElement as unknown[]).length).toBe(2);
      const faq = g.find((x) => x["@type"] === "FAQPage")!;
      const questions = (faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[]);
      expect(questions.map((q) => q.name)).toEqual(dictPlans(locale).vitrine.faq.map((f) => f.q));
      expect(questions.map((q) => q.acceptedAnswer.text)).toEqual(dictPlans(locale).vitrine.faq.map((f) => f.r));
    }
  });

  it("métadonnées : titre ≤ 51, description ≤ 155, canonique, image de partage composée 1200 × 630", async () => {
    const { metadata } = await vitrine("fr");
    expect(metadata.title.length).toBeLessThanOrEqual(51);
    expect(metadata.description.length).toBeLessThanOrEqual(155);
    expect(metadata.alternates.canonical).toBe("/logiciel-plan-maison");
    const img = (metadata.openGraph.images as { url: string; width: number; height: number }[])[0];
    expect(img).toMatchObject({ url: "https://getavyora.fr/plans/og-plan.png", width: 1200, height: 630 });
    expect(metadata.openGraph.siteName).toBe("AVYORA");
  });
});

/* ─── Les captures (vraies, produites en headless : public/plans) ────────────── */

describe("C9 · captures de l'éditeur", () => {
  const dossier = path.join(__dirname, "..", "public", "plans");
  /** Largeur et hauteur d'un PNG (en-tête IHDR) ou d'un WebP (VP8 / VP8L / VP8X). */
  const taille = (f: string): [number, number] => {
    const b = readFileSync(f);
    if (b.toString("ascii", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
    expect(b.toString("ascii", 0, 4)).toBe("RIFF");
    const k = b.toString("ascii", 12, 16);
    if (k === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (k === "VP8L") { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  };

  it("2D et 3D : webp 760 et 1040, PNG 1040 × 650 ; l'image de partage 1200 × 630", () => {
    for (const nom of ["maison-2d", "maison-3d"]) {
      expect(taille(path.join(dossier, `${nom}.png`))).toEqual([1040, 650]);
      expect(taille(path.join(dossier, `${nom}-1040.webp`))).toEqual([1040, 650]);
      expect(taille(path.join(dossier, `${nom}-760.webp`))).toEqual([760, 475]);
    }
    expect(taille(path.join(dossier, "og-plan.png"))).toEqual([1200, 630]);
  });
});

/* ─── Le sitemap ─────────────────────────────────────────────────────────────── */

describe("C9 · sitemap", () => {
  it("allumé : la vitrine (0,9, mensuelle), jamais /plan ; éteint : ni l'une ni l'autre", async () => {
    const urls = async (plans: boolean) => {
      await charger({ plans, locale: "fr" });
      const sitemap = (await import("@/app/sitemap")).default;
      return sitemap();
    };
    const off = await urls(false), on = await urls(true);
    expect(off.some((e) => e.url.includes("logiciel-plan-maison"))).toBe(false);
    const v = on.filter((e) => e.url === "https://getavyora.fr/logiciel-plan-maison");
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ priority: 0.9, changeFrequency: "monthly" });
    for (const l of [off, on]) expect(l.some((e) => /\/plan(\?|$)/.test(e.url))).toBe(false);
    expect(on.filter((e) => e.url !== v[0].url).map((e) => e.url)).toEqual(off.map((e) => e.url));
  });
});

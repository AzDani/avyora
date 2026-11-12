/**
 * C5 · la vitrine-hub `/logiciel-plan-maison` : 404 interrupteur éteint ; allumée, une page PUBLIQUE, en FR et en EN
 * (avec la mention « The editor is in French for now » en anglais seulement).
 *
 * Depuis le 12/11/2026, l'éditeur demande un compte (décision de Dani) : la page ne lit que la présence d'une session.
 * Sans compte (et pour Google), ses appels à l'action mènent à l'inscription, qui ramène à l'éditeur, et le disent
 * (« Crée ton compte gratuit pour dessiner ») ; connecté, « Ouvrir l'éditeur » mène à /plan. Aucune phrase ne promet
 * plus de dessiner sans compte.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { prerender } from "react-dom/static";
import { dictPlans } from "@/lib/i18n/plans";

/** Les métadonnées de la vitrine, dans la langue de la page (lib/i18n/meta.ts). */
type MetaVitrine = { title: string; description: string; alternates: { canonical: string }; openGraph: { images: unknown; siteName: string; locale: string } };
const MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "server-only"];
const CAMILLE = { id: "u1", email: "camille@exemple.fr", email_confirmed_at: "2026-11-01T10:00:00Z", app_metadata: {}, user_metadata: {} };

async function page(plans: boolean, locale: "fr" | "en", user: unknown = null) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale }));
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user, estPro: () => !!user }));
  vi.doMock("server-only", () => ({}));
  const mod = await import("@/app/logiciel-plan-maison/page");
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  const el = await mod.default();
  const { prelude } = await prerender(createElement(LangProvider, { locale, children: el }));
  return { html: await new Response(prelude).text(), metadata: (await mod.generateMetadata()) as unknown as MetaVitrine };
}

const INSCRIPTION = 'href="/inscription?next=%2Fplan&amp;source=vitrine-plan"';
const INSCRIPTION_FINAL = 'href="/inscription?next=%2Fplan%3Ftype%3Dfinal&amp;source=vitrine-plan"';
const echap = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
/** Une promesse de dessiner sans compte (FR, EN). */
const SANS_COMPTE = /sans compte|sans inscription|sans t[’']inscrire|avec ou sans compte|no account|no sign-?up|without an account|with or without an account/i;

afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("C5 · /logiciel-plan-maison", () => {
  it("interrupteur éteint → 404", async () => {
    await expect(page(false, "fr")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("FR, sans compte : titre, appel vers l'inscription (retour à l'éditeur), hauteur réservée, aucune mention anglaise", async () => {
    const { html, metadata } = await page(true, "fr");
    expect(html).toContain("<h1");
    expect(html).toContain("Dessine le plan de ta maison, gratuitement, et vois-le en 3D");
    expect(html).toContain(INSCRIPTION);
    expect(html).toContain("Crée ton compte gratuit pour dessiner");
    expect(html).toContain("Le dessin se fait sur ordinateur ou tablette.");
    /* « Déjà un compte ? » : la connexion, avec la même intention */
    expect(html).toContain('href="/connexion?next=%2Fplan"');
    expect(html).toContain("Déjà un compte ? ");
    expect(html).toContain("min-h-[19rem]");
    /* jury : au-dessus de la ligne de flottaison, la vraie capture 3D (chargée tout de suite), plus l'illustration */
    expect(html).toMatch(/<img src="\/plans\/maison-3d\.png"[^>]*loading="eager"[^>]*fetchPriority="high"|<img src="\/plans\/maison-3d\.png"[^>]*loading="eager"[^>]*fetchpriority="high"/);
    /* revue : l'appel porte déjà la 3D ; la grille ne la répète pas tant qu'il est affiché (une seule 3D visible) */
    expect(html).toContain("data-vitrine-appel");
    expect(html).toMatch(/<figure class="min-w-0 \[body:has\(\[data-vitrine-appel\]\)_&amp;\]:hidden">\s*<picture><source type="image\/webp" srcSet="\/plans\/maison-3d-760/);
    expect(html).not.toContain("The editor is in French");
    expect(html).not.toMatch(/\d+[,.]\d{2}\s?€|€\s?\d/);
    expect(metadata.title.length).toBeLessThanOrEqual(51);
    expect(metadata.description.length).toBeLessThanOrEqual(155);
    expect(metadata.alternates.canonical).toBe("/logiciel-plan-maison");
  });

  it("sans compte : aucun lien direct vers l'éditeur, tous ses appels passent par l'inscription (FR, EN)", async () => {
    for (const locale of ["fr", "en"] as const) {
      const { html } = await page(true, locale);
      const t = dictPlans(locale);
      expect(html, locale).not.toMatch(/href="\/plan[?"]/);
      /* en haut (l'îlot) et en bas (BoutonCreerPlan) ; « Tu fais construire » garde son Plan final */
      expect(html.split(INSCRIPTION).length - 1, locale).toBe(2);
      expect(html, locale).toContain(INSCRIPTION_FINAL);
      expect(html.split(echap(t.hub.creer)).length - 1, locale).toBe(3);
      expect(html, locale).not.toContain(echap(t.hub.ouvrirEditeur));
    }
  });

  it("aucune promesse de dessiner sans compte : textes, FAQ, JSON-LD et métadonnées (FR, EN)", async () => {
    for (const locale of ["fr", "en"] as const) {
      const { html, metadata } = await page(true, locale);
      expect(html.match(SANS_COMPTE)?.[0] ?? null, locale).toBeNull();
      expect(JSON.stringify(metadata).match(SANS_COMPTE)?.[0] ?? null, locale).toBeNull();
      const v = dictPlans(locale).vitrine;
      /* la FAQ dit le compte, gratuit */
      expect(v.faq.map((f) => f.r).join(" ")).toMatch(locale === "fr" ? /avec un compte gratuit/ : /with a free account/);
      expect(v.faq.some((f) => (locale === "fr" ? /Faut-il créer un compte/ : /Do I need an account/).test(f.q))).toBe(true);
      expect(v.offresGratuitSous).toBe(locale === "fr" ? "Avec un compte gratuit." : "With a free account.");
    }
    const ld = (await page(true, "fr")).html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    expect(JSON.parse(ld)["@graph"][0].offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Gratuit, avec un compte" });
  });

  it("connecté : « Ouvrir l'éditeur » vers /plan, « Dessiner ma maison » vers un Plan final ; ni inscription ni « Déjà un compte ? »", async () => {
    for (const locale of ["fr", "en"] as const) {
      const { html } = await page(true, locale, CAMILLE);
      const t = dictPlans(locale);
      expect(html, locale).toContain(`href="/plan" class="btn btn-primary max-w-full whitespace-normal px-5 py-3 text-center text-[15px] leading-snug" data-clic-plan="vitrine_haut">${echap(t.hub.ouvrirEditeur)}</a>`);
      expect(html, locale).toContain(`href="/plan" class="btn btn-primary max-w-full whitespace-normal px-5 py-3 text-center text-[15px] leading-snug" data-clic-plan="vitrine_bas">${echap(t.hub.ouvrirEditeur)}</a>`);
      expect(html, locale).toContain(`href="/plan?type=final"`);
      expect(html, locale).toContain(`${echap(t.vitrine.construireLien)} →`);
      expect(html, locale).not.toContain("/inscription?");
      expect(html, locale).not.toContain("data-deja-compte");
      expect(html, locale).not.toContain(echap(t.hub.creer));
    }
  });

  it("pendant la bêta : l'encart des offres mène à l'inscription sans compte, à l'éditeur connecté ; la FAQ ne parle plus de dessiner sans compte", async () => {
    vi.stubEnv("NEXT_PUBLIC_BETA", "1");
    vi.stubEnv("NEXT_PUBLIC_BETA_FIN", "2026-12-31");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T12:00:00+01:00"));
    for (const locale of ["fr", "en"] as const) {
      const t = dictPlans(locale);
      const pro = (h: string) => h.slice(h.indexOf('data-colonne="pro"'), h.indexOf("</section>", h.indexOf('data-colonne="pro"')));
      const anonyme = (await page(true, locale)).html;
      expect(pro(anonyme), locale).toContain(`${INSCRIPTION} class="btn btn-outline mt-5 max-w-full whitespace-normal py-2.5 text-center leading-snug">${echap(t.vitrineBeta.offresVoir)}</a>`);
      expect(anonyme.match(SANS_COMPTE)?.[0] ?? null, locale).toBeNull();
      const faq = t.vitrineBeta.faqGratuit("31 décembre 2026", 30).r;
      expect(faq).not.toMatch(SANS_COMPTE);
      expect(faq).toMatch(locale === "fr" ? /Il te faut seulement un compte/ : /All you need is an account/);
      const connecte = (await page(true, locale, CAMILLE)).html;
      expect(pro(connecte), locale).toContain(`href="/plan" class="btn btn-outline mt-5 max-w-full whitespace-normal py-2.5 text-center leading-snug">${echap(t.hub.ouvrirEditeur)}</a>`);
    }
  });

  it("EN : interface en anglais et « The editor is in French for now »", async () => {
    const { html, metadata } = await page(true, "en");
    expect(html).toContain("Draw your house plan for free, and see it in 3D");
    expect(html).toContain("Create your free account to start drawing");
    expect(html).toContain("Already have an account? ");
    expect(html).toContain("The editor is in French for now.");
    expect(html).not.toContain("Crée ton compte");
    /* revue anglais (constat 122) : l'onglet et l'aperçu de partage en anglais, le canonical et l'image gardés */
    expect(metadata.title).toBe("Free house floor plan software, in 2D and 3D");
    expect(metadata.title.length).toBeLessThanOrEqual(51);
    expect(metadata.description.length).toBeLessThanOrEqual(155);
    expect(metadata.alternates.canonical).toBe("/logiciel-plan-maison");
    expect(metadata.openGraph.locale).toBe("en_US");
    expect(metadata.openGraph.siteName).toBe("AVYORA");
  });
});

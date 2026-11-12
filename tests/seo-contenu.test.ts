/**
 * Lot « SEO et contenu » de la revue du 12/11/2026 : métadonnées propres à chaque page, titles courts,
 * villes « autour de » réellement proches, phrases des pages ville (coefficients, outre-mer, coquilles),
 * année des prix dérivée d'une seule constante, sitemap sans date de build, /projets/nouveau en noindex,
 * TTC sur /prix-poste, méthodologie qui lit le catalogue (et sa version anglaise), tutoiement.
 *
 * Les pages sont importées pour de vrai (generateMetadata, rendu serveur) : un test qui relirait seulement
 * les sources ne verrait ni un title recomposé trop long, ni une phrase mal assemblée.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { prerender } from "react-dom/static";
import { readFileSync, existsSync } from "node:fs";
import type { Metadata } from "next";

vi.mock("server-only", () => ({}));

const lire = (f: string) => readFileSync(f, "utf8");
/** Longueur du <title> rendu : le gabarit du layout ajoute « · AVYORA » sauf en `absolute`. */
const longueurTitre = (t: Metadata["title"]): number =>
  typeof t === "string" ? t.length + " · AVYORA".length : (t as { absolute: string }).absolute.length;
const texteTitre = (t: Metadata["title"]): string => (typeof t === "string" ? t : (t as { absolute: string }).absolute);

async function rendre(el: ReturnType<typeof createElement>): Promise<string> {
  const { prelude } = await prerender(el);
  const reader = prelude.getReader();
  let html = "";
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += dec.decode(value);
  }
  return html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/* ─── Métadonnées : og:url, og:title et carte X propres à chaque page ─────────── */

describe("métadonnées propres à chaque page (plus l'URL ni le titre de l'accueil)", () => {
  it("le layout racine ne porte plus que les valeurs de marque", () => {
    const src = lire("app/layout.tsx");
    const og = src.slice(src.indexOf("openGraph: {"), src.indexOf("},", src.indexOf("openGraph: {")));
    expect(og).toContain('siteName: "AVYORA"');
    expect(og).not.toMatch(/\burl:|\btitle:|\bdescription/);
    const tw = src.slice(src.indexOf("twitter: {"), src.indexOf("},", src.indexOf("twitter: {")));
    expect(tw).toContain('card: "summary_large_image"');
    expect(tw).not.toMatch(/\btitle:|\bdescription/);
  });

  it("seoMeta : canonical, og:url, og:title et twitter:title de LA page", async () => {
    const { seoMeta } = await import("@/lib/seo-og");
    const m = seoMeta({ title: "Tarifs", description: "La bêta gratuite.", path: "/tarifs" });
    expect(m.alternates?.canonical).toBe("/tarifs");
    expect(m.openGraph).toMatchObject({ url: "https://getavyora.fr/tarifs", title: "Tarifs", description: "La bêta gratuite.", siteName: "AVYORA" });
    expect(m.twitter).toMatchObject({ title: "Tarifs", description: "La bêta gratuite." });
  });

  it("les pages indexables passent toutes par seoMeta (ou déclarent openGraph ET twitter)", () => {
    const pages = [
      "app/page.tsx", "app/estimation-travaux/page.tsx", "app/tarifs/page.tsx", "app/methodologie/page.tsx",
      "app/guides/page.tsx", "app/guides/[slug]/page.tsx", "app/prix-travaux/page.tsx", "app/prix-travaux/[projet]/page.tsx",
      "app/prix-travaux/[projet]/[ville]/page.tsx", "app/prix-renovation/page.tsx", "app/prix-renovation/[ville]/page.tsx",
      "app/prix-poste/page.tsx", "app/prix-poste/[slug]/page.tsx", "app/estimation-construction-maison/page.tsx",
      "app/logiciel-plan-maison/page.tsx",
      ...["cgu", "cgv", "mentions-legales", "confidentialite", "cookies"].map((s) => `app/(legal)/${s}/page.tsx`),
    ];
    const sans = pages.filter((p) => {
      const s = lire(p);
      return !s.includes("seoMeta(") && !(s.includes("openGraph:") && s.includes("twitter:"));
    });
    expect(sans).toEqual([]);
  });

  it("pages légales : une description propre à chacune, différente de celle de l'accueil", async () => {
    const { DESCRIPTION_SITE } = await import("@/lib/seo-og");
    const vues = new Set<string>();
    for (const s of ["cgu", "cgv", "mentions-legales", "confidentialite", "cookies"]) {
      const { metadata } = await import(`@/app/(legal)/${s}/page`);
      expect(metadata.description, s).toBeTruthy();
      expect(metadata.description).not.toBe(DESCRIPTION_SITE);
      expect((metadata.openGraph as { url: string }).url).toBe(`https://getavyora.fr/${s}`);
      vues.add(metadata.description);
    }
    expect(vues.size).toBe(5);
  });

  it("accueil : JSON-LD à jour (BusinessApplication, gratuit, aucune offre « Première estimation gratuite »)", () => {
    const src = lire("app/page.tsx");
    expect(src).toContain('applicationCategory: "BusinessApplication"');
    expect(src).toContain("isAccessibleForFree: true");
    expect(src).not.toContain("FinanceApplication");
    expect(src).not.toContain("Première estimation gratuite");
    expect(src).toContain("Gratuit pendant la bêta, jusqu'au ${libellesBeta(\"fr\").fin}");
  });
});

/* ─── Titles ≤ 60 caractères, suffixe compris ─────────────────────────────────── */

describe("titles : 60 caractères au plus, « · AVYORA » compris", () => {
  it("titreCourt : la première formulation qui tient, sinon la plus courte sans la marque", async () => {
    const { titreCourt } = await import("@/lib/seo-og");
    expect(titreCourt("Court")).toBe("Court");
    expect(titreCourt("x".repeat(52), "y".repeat(40))).toBe("y".repeat(40));
    expect(titreCourt("x".repeat(70), "y".repeat(55))).toEqual({ absolute: "y".repeat(55) });
  });

  it("toutes les pages de prix, de guides et d'entrée", async () => {
    const trop: string[] = [];
    const voir = (url: string, t: Metadata["title"]) => {
      if (longueurTitre(t) > 60) trop.push(`${url} (${longueurTitre(t)}) ${texteTitre(t)}`);
    };
    const { VILLES_SEO } = await import("@/lib/villes");
    const ville = await import("@/app/prix-renovation/[ville]/page");
    for (const v of VILLES_SEO) voir(v.slug, (await ville.generateMetadata({ params: Promise.resolve({ ville: v.slug }) })).title);
    const { PROJETS, projetsMatrix, MATRIX_VILLES } = await import("@/lib/seo-projets");
    const projet = await import("@/app/prix-travaux/[projet]/page");
    for (const p of PROJETS) voir(p.slug, (await projet.generateMetadata({ params: Promise.resolve({ projet: p.slug }) })).title);
    const matrice = await import("@/app/prix-travaux/[projet]/[ville]/page");
    for (const p of projetsMatrix())
      for (const v of MATRIX_VILLES)
        voir(`${p.slug}/${v.slug}`, (await matrice.generateMetadata({ params: Promise.resolve({ projet: p.slug, ville: v.slug }) })).title);
    const { GUIDES } = await import("@/lib/guides");
    for (const g of GUIDES) voir(g.slug, g.title);
    const { POSTES_PAGES } = await import("@/lib/seo-postes");
    for (const p of POSTES_PAGES) voir(p.slug, p.title);
    for (const f of ["@/app/estimation-travaux/page", "@/app/guides/page", "@/app/prix-travaux/page", "@/app/prix-renovation/page", "@/app/prix-poste/page"])
      voir(f, (await import(f)).metadata.title);
    const { dict } = await import("@/lib/i18n/dictionaries");
    voir("/tarifs (bêta)", dict("fr").beta.tarifsMetaTitre);
    expect(trop).toEqual([]);
  }, 60_000);
});

/* ─── Villes « autour de » : la distance, pas la région ni la rotation ────────── */

describe("villes « autour de » : réellement proches", () => {
  it("chaque ville qui a une page a une position", async () => {
    const { VILLES_SEO, COORDS } = await import("@/lib/villes");
    expect(VILLES_SEO.filter((v) => !COORDS[v.slug]).map((v) => v.slug)).toEqual([]);
  });

  it("« autour » ne liste que des villes à moins de 150 km, de la plus proche à la plus lointaine", async () => {
    const { VILLES_SEO, villesProches, distanceKm, RAYON_PROCHES_KM } = await import("@/lib/villes");
    for (const v of VILLES_SEO) {
      const { autour, ailleurs } = villesProches(v.slug);
      const d = autour.map((x) => distanceKm(v.slug, x.slug));
      expect(d.every((k) => k <= RAYON_PROCHES_KM), v.slug).toBe(true);
      expect([...d].sort((a, b) => a - b)).toEqual(d);
      expect(autour.length + ailleurs.length).toBe(12);
      const slugs = [...autour, ...ailleurs].map((x) => x.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs).not.toContain(v.slug);
    }
    // Le cas relevé : Roubaix ne cite plus Cannes, Gap ou Foix « autour » d'elle.
    const roubaix = villesProches("roubaix").autour.map((x) => x.slug);
    expect(roubaix.slice(0, 2).sort()).toEqual(["lille", "tourcoing"]);
    expect(roubaix).not.toContain("cannes");
    // Outre-mer : aucune ville « autour », seulement « ailleurs ».
    expect(villesProches("cayenne").autour).toEqual([]);
  });

  it("le maillage tient : chaque ville est citée par au moins une autre page ville", async () => {
    const { VILLES_SEO, villesProches } = await import("@/lib/villes");
    const citees = new Set(VILLES_SEO.flatMap((v) => { const p = villesProches(v.slug); return [...p.autour, ...p.ailleurs].map((x) => x.slug); }));
    expect(VILLES_SEO.filter((v) => !citees.has(v.slug)).map((v) => v.slug)).toEqual([]);
  });
});

/* ─── Phrases des pages ville et de la matrice ─────────────────────────────────── */

describe("phrases des pages ville : honnêtes et sans coquilles", () => {
  it("lib/seo-textes : coefficients appliqués, fournitures majorées outre-mer et en Corse, pas de répétition", async () => {
    const { phraseCoef, phraseFournitures, lieuVille, situationVille, regionParenthese } = await import("@/lib/seo-textes");
    const { regionCoef } = await import("@/lib/estimateur/core");
    const { deptInfo } = await import("@/lib/geo");
    expect(phraseCoef(regionCoef("69001"))).toBe("AVYORA applique un coefficient de +10 % sur la main-d'œuvre");
    expect(phraseCoef(regionCoef("23000"))).toBe("AVYORA applique un coefficient de −10 % sur la main-d'œuvre");
    expect(phraseCoef(regionCoef("97300"))).toBe("AVYORA applique un coefficient de +5 % sur la main-d'œuvre et de +15 % sur les fournitures");
    expect(phraseFournitures(regionCoef("69001"))).toBe("Les fournitures sont à un prix national ; c'est la main-d'œuvre qui varie.");
    expect(phraseFournitures(regionCoef("97200"))).toContain("15 % de plus");
    expect(phraseFournitures(regionCoef("97200"))).toContain("octroi de mer");
    expect(phraseFournitures(regionCoef("20000"))).toContain("5 % de plus");
    expect(lieuVille("Cayenne", deptInfo("97300"))).toBe("Cayenne (973 · Guyane)");
    expect(lieuVille("Lyon", deptInfo("69001"))).toBe("Lyon (69 · Rhône), en Auvergne-Rhône-Alpes");
    expect(lieuVille("Roubaix", deptInfo("59100"))).toBe("Roubaix (59 · Nord), dans les Hauts-de-France");
    expect(situationVille("Cayenne", deptInfo("97300"))).toBe("Cayenne se situe en Guyane, département d'outre-mer (973).");
    expect(situationVille("Saint-Denis de La Réunion", deptInfo("97400"))).toBe("Saint-Denis de La Réunion se situe à La Réunion, département d'outre-mer (974).");
    expect(situationVille("Ajaccio", deptInfo("20000"))).toBe("Ajaccio se situe en Corse.");
    expect(regionParenthese(deptInfo("97300"))).toBe(" (Guyane)");
  });

  it("page ville rendue (Lyon, Fort-de-France) : ni « zone « Zone », ni « y applique », ni fait de marché, tutoiement", async () => {
    const { default: Page } = await import("@/app/prix-renovation/[ville]/page");
    const lyon = await rendre(await Page({ params: Promise.resolve({ ville: "lyon" }) }));
    expect(lyon).toContain("Pour Lyon, classée « Zone tendue », AVYORA applique un coefficient de +10 % sur la main-d'œuvre.");
    const fdf = await rendre(await Page({ params: Promise.resolve({ ville: "fort-de-france" }) }));
    expect(fdf).toContain("octroi de mer");
    expect(fdf).not.toContain("Les fournitures sont à un prix national");
    expect(fdf).toContain("Fort-de-France se situe en Martinique, département d'outre-mer (972).");
    for (const html of [lyon, fdf]) {
      expect(html).not.toMatch(/zone « Zone|y applique|tarif horaire des artisans y est|moyenne française/);
      expect(html).not.toMatch(/\b(vous|votre|vos|Comptez|Utilisez)\b/);
      expect(html).not.toMatch(/\) \(/);
    }
    const roubaix = await rendre(await Page({ params: Promise.resolve({ ville: "roubaix" }) }));
    const autour = roubaix.slice(roubaix.indexOf("autour de Roubaix"), roubaix.indexOf("ailleurs en France"));
    expect(autour).toContain("Lille");
    expect(autour).not.toContain("Cannes");
  });

  it("matrice rendue (salle de bain à Marseille) : barème interne, pas de double parenthèse", async () => {
    const { default: Page } = await import("@/app/prix-travaux/[projet]/[ville]/page");
    const html = await rendre(await Page({ params: Promise.resolve({ projet: "renovation-salle-de-bain", ville: "marseille" }) }));
    expect(html).toContain("Classement « Zone tendue » : AVYORA applique un coefficient de +10 % sur la main-d'œuvre (barème interne).");
    // (Les libellés de lignes du moteur, « Ventilation (VMC) (simple flux) », relèvent de l'estimateur.)
    expect(html).not.toMatch(/zone « Zone|Zone « Zone|plus chère que la moyenne nationale|\) \(finition/);
    expect(html).not.toMatch(/\b(vous|votre|vos|comptez|Comptez)\b/);
  });

  it("le h1 des pages /prix-travaux ne contient plus l'emoji (ni « ◻️ »)", () => {
    for (const f of ["app/prix-travaux/[projet]/page.tsx", "app/prix-travaux/[projet]/[ville]/page.tsx"])
      expect(lire(f)).not.toMatch(/<h1>\{p\.emoji\}/);
    expect(lire("lib/seo-projets.ts")).not.toContain("◻️");
  });
});

/* ─── Année des prix : une constante ───────────────────────────────────────────── */

describe("année des prix : ANNEE_PRIX, dérivée de PRIX_MAJ", () => {
  it("ANNEE_PRIX suit PRIX_MAJ", async () => {
    const { ANNEE_PRIX, PRIX_MAJ } = await import("@/lib/prix-maj");
    expect(ANNEE_PRIX).toBe(PRIX_MAJ.slice(0, 4));
  });

  it("plus aucune année écrite en dur dans les textes des pages de prix et des guides", () => {
    const fichiers = [
      "app/prix-renovation/page.tsx", "app/prix-renovation/[ville]/page.tsx", "app/prix-travaux/page.tsx",
      "app/prix-travaux/[projet]/page.tsx", "app/prix-travaux/[projet]/[ville]/page.tsx", "app/guides/page.tsx",
      "app/guides/[slug]/page.tsx", "lib/seo-projets.ts", "lib/seo-postes.ts", "lib/guides.ts",
    ];
    const vus: string[] = [];
    for (const f of fichiers)
      lire(f).split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return; // commentaires
        if (/\b20\d\d\b/.test(l)) vus.push(`${f}:${i + 1}`);
      });
    expect(vus).toEqual([]);
  });
});

/* ─── Sitemap ──────────────────────────────────────────────────────────────────── */

describe("sitemap : lastmod réel, /projets/nouveau retiré", () => {
  it("aucune date de build, aucune entrée /projets/nouveau", async () => {
    const code = lire("app/sitemap.ts").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    expect(code).not.toMatch(/new Date\(|\bnow\b/);
    const { default: sitemap } = await import("@/app/sitemap");
    const s = sitemap();
    expect(s.some((e) => e.url.includes("/projets/nouveau"))).toBe(false);
    for (const e of s) expect(String(e.lastModified), e.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("LEGAL_MAJ = la date « Dernière mise à jour » affichée sur chaque page légale", async () => {
    const { LEGAL_MAJ } = await import("@/lib/prix-maj");
    const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    for (const [slug, date] of Object.entries(LEGAL_MAJ)) {
      const m = lire(`app/(legal)/${slug}/page.tsx`).match(/Dernière mise à jour : [^\n]*?(\d{1,2}) (\p{L}+) (\d{4})/u);
      expect(m, slug).not.toBeNull();
      const iso = `${m![3]}-${String(mois.indexOf(m![2]) + 1).padStart(2, "0")}-${m![1].padStart(2, "0")}`;
      expect(iso, slug).toBe(date);
    }
  });

  it("/projets/nouveau : noindex, follow dans ses trois états, et toujours explorable (robots.txt)", () => {
    const src = lire("app/projets/nouveau/page.tsx");
    expect(src).toContain("const ROBOTS = { index: false, follow: true }");
    expect(src.match(/robots: ROBOTS/g)).toHaveLength(3);
    expect(lire("app/robots.ts")).toContain('allow: ["/", "/projets/nouveau"]');
  });
});

/* ─── /prix-poste : TTC comme le reste du site ─────────────────────────────────── */

describe("/prix-poste : prix TTC, plus de « pour l'instant »", () => {
  it("posteRef porte le taux de TVA de l'estimateur ; ttc() l'applique", async () => {
    const { posteRef, ttc, TVA_FOURNITURE_SEULE } = await import("@/lib/seo-prix");
    const p = posteRef("Peinture des murs")!;
    expect(p.tva).toBe(10);
    expect(ttc(100, 10)).toBe(110);
    expect(TVA_FOURNITURE_SEULE).toBe(20);
    const iso = posteRef("Isolation des combles perdus (soufflage)");
    if (iso) expect(iso.tva).toBe(5.5);
  });

  it("la page corps d'état annonce du TTC, le hub ne montre plus de chantier en cours", async () => {
    const src = lire("app/prix-poste/[slug]/page.tsx");
    expect(src).not.toContain("Prix HT, fourni-posé");
    expect(src).toContain("Fourni-posé (TTC)");
    const hub = lire("app/prix-poste/page.tsx");
    expect(hub).not.toMatch(/pour l&apos;instant|pour l'instant/);
    expect(hub).not.toContain("<th>Page</th>");
  });
});

/* ─── Méthodologie : les chiffres du catalogue, en français et en anglais ──────── */

describe("méthodologie : compteurs lus dans le catalogue, tableaux qui tiennent sur mobile, version anglaise", () => {
  const charger = async (locale: "fr" | "en") => {
    vi.resetModules();
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale }));
    return import("@/app/methodologie/page");
  };

  it("les compteurs affichés sont ceux du catalogue (total et répartition par unité)", async () => {
    const { catalogueStats, postesParUnite } = await import("@/lib/seo-prix");
    const s = catalogueStats();
    expect(postesParUnite().reduce((n, x) => n + x.n, 0)).toBe(s.postes);
    const { default: Page } = await charger("fr");
    const html = await rendre(await Page());
    expect(html).toContain(`Le référentiel : ${s.postes} postes, ${s.lots} corps d'état`);
    const m2 = postesParUnite().find((x) => x.unite === "m2")!;
    expect(html).toContain(`au m² (${m2.n}`);
    expect(lire("app/methodologie/page.tsx")).not.toMatch(/200 postes|\(77 postes\)/);
  });

  it("plus de largeur minimale imposée aux tableaux", () => {
    expect(lire("app/methodologie/style.ts")).not.toMatch(/min-width:\s*520px/);
  });

  it("en anglais (cookie av-lang=en) : la page est traduite, mêmes chiffres", async () => {
    const { catalogueStats } = await import("@/lib/seo-prix");
    const s = catalogueStats();
    const { default: Page, generateMetadata } = await charger("en");
    const html = await rendre(await Page());
    expect(html).toContain("Where AVYORA prices come from");
    expect(html).toContain(`The reference catalogue: ${s.postes} items, ${s.lots} trades`);
    expect(html).not.toContain("D'où viennent les prix AVYORA");
    expect(texteTitre((await generateMetadata()).title)).toBe("Methodology — where AVYORA prices come from");
  });
});

/* ─── Tutoiement, CTA mobile, image de partage ─────────────────────────────────── */

describe("tutoiement, CTA mobile, image de partage", () => {
  it("aucun vouvoiement dans les pages de prix, les guides et prix-poste", () => {
    const fichiers = [
      "app/prix-renovation/page.tsx", "app/prix-renovation/[ville]/page.tsx", "app/prix-travaux/page.tsx",
      "app/prix-travaux/[projet]/page.tsx", "app/prix-travaux/[projet]/[ville]/page.tsx", "app/guides/page.tsx",
      "app/guides/[slug]/page.tsx", "app/prix-poste/page.tsx", "app/prix-poste/[slug]/page.tsx",
      "lib/seo-postes.ts", "lib/seo-projets.ts", "lib/guides.ts",
    ];
    const vus: string[] = [];
    for (const f of fichiers)
      lire(f).split("\n").forEach((l, i) => {
        const m = l.match(/\b(vous|votre|vos|Vous|Votre|Vos|Comptez|Utilisez|Vérifiez|Demandez|Comparez|Exigez)\b/);
        if (m && !/^\s*(\/\/|\*|\/\*)/.test(l)) vus.push(`${f}:${i + 1} ${m[0]}`);
      });
    expect(vus).toEqual([]);
  });

  it("le bouton des CTA passe à la ligne au lieu de déborder de l'écran", () => {
    const src = lire("components/CtaEstimation.tsx");
    for (const c of ["whitespace-normal", "max-w-full", "leading-snug", "text-center"]) expect(src).toContain(c);
  });

  it("l'image de partage fournit sa police (gras réel) et ne vise plus les seuls investisseurs", () => {
    const src = lire("app/opengraph-image.tsx");
    expect(src).toMatch(/fonts: \[/);
    for (const f of ["assets/fonts/Geist-Regular.ttf", "assets/fonts/Geist-Bold.ttf", "assets/fonts/LICENSE.txt"]) expect(existsSync(f), f).toBe(true);
    expect(src).not.toContain("copilote des investisseurs locatifs");
  });
});

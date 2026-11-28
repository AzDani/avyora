/** L'Agent SEO (28/11/2026) : règles d'analyse, santé des pages, résumé affiché, salle Marketing et robots des bureaux. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { bilanSante, opportunites, periodes, problemesPage, tranche, urlsDuSitemap, type LigneSeo } from "@/lib/seo/regles.mjs";
import { resumerSeo, seoEnService } from "@/lib/seo/resume";
import { ligneSeo, salleMarketing } from "@/lib/bureaux/donnees";
import { fenetres, jourGsc, ligneGsc } from "../scripts/seo.mjs";

const L = (requete: string, page: string, impressions: number, position: number, clics = 0): LigneSeo => ({ requete, page, impressions, position, clics, ctr: impressions ? clics / impressions : 0 });

describe("règles · classement et opportunités", () => {
  it("totaux : position moyenne pondérée par les impressions, 28 jours face aux 28 d'avant", () => {
    const jours = Array.from({ length: 56 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, clics: i < 28 ? 1 : 2, impressions: 10, ctr: 0, position: i < 28 ? 30 : 20 }));
    const { actuelle, precedente } = periodes(jours);
    expect(actuelle).toMatchObject({ clics: 56, impressions: 280, position: 20 });
    expect(precedente).toMatchObject({ clics: 28, impressions: 280, position: 30 });
    expect(actuelle.ctr).toBeCloseTo(0.2);
  });
  it("page 2 : positions 8 à 20 avec assez d'impressions, les plus vues d'abord", () => {
    const o = opportunites([L("a", "/a", 100, 12), L("b", "/b", 500, 9.5), L("c", "/c", 10, 11), L("d", "/d", 300, 4), L("e", "/e", 80, 21)]);
    expect(o.page2.map((l) => l.requete)).toEqual(["b", "a"]);
  });
  it("taux de clic faible : comparé au site à la même place, jamais à une courbe inventée", () => {
    const lignes = [L("x1", "/1", 200, 2, 40), L("x2", "/2", 200, 2.5, 36), L("x3", "/3", 200, 3, 30), L("faible", "/4", 400, 2, 8)];
    const o = opportunites(lignes);
    expect(o.ctrFaible.map((l) => l.requete)).toEqual(["faible"]);
    expect(o.ctrFaible[0].ctrReference).toBeCloseTo(0.165, 3);
    expect(opportunites(lignes.slice(2)).ctrFaible).toEqual([]);   // trop peu de requêtes à cette place pour juger
    expect(tranche(3)).toBe("1-3"); expect(tranche(15)).toBe("11-20"); expect(tranche(40)).toBe("21+");
  });
  it("deux pages sur la même requête, et les reculs d'au moins 5 places", () => {
    const o = opportunites([L("prix sdb", "/a", 50, 9), L("prix sdb", "/b", 30, 14), L("seul", "/c", 80, 7)], [L("seul", "/c", 80, 1.5)]);
    expect(o.cannibales).toEqual([{ requete: "prix sdb", impressions: 80, pages: [{ page: "/a", impressions: 50, position: 9 }, { page: "/b", impressions: 30, position: 14 }] }]);
    expect(o.reculs.map((l) => [l.requete, l.positionAvant])).toEqual([["seul", 1.5]]);
  });
});

describe("règles · santé des pages du sitemap", () => {
  const ok = '<html><head><title>Prix salle de bain · AVYORA</title><meta name="description" content="Combien coûte…"><link rel="canonical" href="https://getavyora.fr/prix"></head></html>';
  it("une page saine n'a aucun problème", () => {
    expect(problemesPage({ url: "https://getavyora.fr/prix", statut: 200, html: ok })).toEqual([]);
  });
  it("erreur, redirection, noindex (balise ou en-tête), canonique ailleurs, titre trop long, description absente", () => {
    expect(problemesPage({ url: "u", statut: 404 })[0].code).toBe("erreur");
    expect(problemesPage({ url: "u", statut: 308, enTetes: { location: "/x" } })[0].code).toBe("redirection");
    expect(problemesPage({ url: "https://getavyora.fr/prix", statut: 200, html: ok.replace("<title>", '<meta name="robots" content="noindex, follow"><title>') }).map((p) => p.code)).toEqual(["noindex"]);
    expect(problemesPage({ url: "https://getavyora.fr/prix", statut: 200, html: ok, enTetes: { "x-robots-tag": "noindex" } }).map((p) => p.code)).toEqual(["noindex"]);
    expect(problemesPage({ url: "https://getavyora.fr/autre", statut: 200, html: ok }).map((p) => p.code)).toEqual(["canonique"]);
    const long = ok.replace("Prix salle de bain · AVYORA", "Prix d'une salle de bain complète refaite à neuf en 2026 · AVYORA");
    expect(problemesPage({ url: "https://getavyora.fr/prix", statut: 200, html: long.replace(/<meta name="description"[^>]*>/, "") }).map((p) => p.code)).toEqual(["titre-long", "description-absente"]);
  });
  it("le bilan sépare ce qui sort de Google des finitions", () => {
    const b = bilanSante([
      { url: "https://getavyora.fr/prix", statut: 200, html: ok },
      { url: "https://getavyora.fr/a", statut: 500 },
      { url: "https://getavyora.fr/prix", statut: 200, html: ok.replace(/<meta name="description"[^>]*>/, "") },
    ]);
    expect(b).toMatchObject({ verifiees: 3, graves: 1, finitions: 1, parCode: { erreur: 1, "description-absente": 1 } });
  });
  it("lit les adresses d'un sitemap", () => {
    expect(urlsDuSitemap("<urlset><url><loc>https://getavyora.fr/</loc></url><url><loc> https://getavyora.fr/a?x=1&amp;y=2 </loc></url></urlset>")).toEqual(["https://getavyora.fr/", "https://getavyora.fr/a?x=1&y=2"]);
  });
});

describe("script du Mac", () => {
  it("fenêtres : s'arrêtent avant-hier (retard de Search Console), 28 jours et les 28 d'avant", () => {
    expect(fenetres(new Date("2026-11-30T07:30:00Z"))).toEqual({
      jours: { debut: "2026-08-31", fin: "2026-11-28" }, actuelle: { debut: "2026-11-01", fin: "2026-11-28" }, avant: { debut: "2026-10-04", fin: "2026-10-31" },
    });
  });
  it("lignes de l'API : la page réduite à son chemin, la position arrondie", () => {
    expect(ligneGsc({ keys: ["prix sdb", "https://getavyora.fr/prix-travaux/salle-de-bain"], clicks: 3, impressions: 120, ctr: 0.025, position: 11.46 }))
      .toEqual({ requete: "prix sdb", page: "/prix-travaux/salle-de-bain", clics: 3, impressions: 120, ctr: 0.025, position: 11.5 });
    expect(jourGsc({ keys: ["2026-11-20"], clicks: 1, impressions: 50, ctr: 0.02, position: 42.04 })).toEqual({ date: "2026-11-20", clics: 1, impressions: 50, ctr: 0.02, position: 42 });
  });
  it("la clé Search Console ne vit jamais dans le dépôt", () => {
    const src = readFileSync("scripts/seo.mjs", "utf8");
    expect(src).toContain('join(homedir(), ".avyora", "gsc-robot.json")');
    expect(src).toContain("webmasters.readonly");
    expect(readFileSync(".gitignore", "utf8")).toMatch(/\.env/);
  });
});

describe("site · résumé, salle Marketing, robots", () => {
  const gsc = { jour: "2026-11-30", donnees: { propriete: "sc-domain:getavyora.fr", jours: [{ date: "2026-11-28", clics: 12, impressions: 900, ctr: 0.013, position: 38.2 }], lignes: [L("prix sdb", "/a", 300, 12, 2)], avant: [] } };
  it("sans relevé : l'agent n'est pas en service (robot en hologramme), la cabine dit quoi brancher", () => {
    const r = resumerSeo(null, null, null);
    expect(seoEnService(r)).toBe(false);
    expect(ligneSeo(r, false)).toEqual(["Agent SEO", "Branche Search Console (mode d'emploi sur le Mac)", "vide", "à brancher"]);
    expect(ligneSeo(null, true)[1]).toBe("Migration 0020 à appliquer");
  });
  it("avec un relevé : en service, clics et position ; un rapport nouveau t'attend ; une page grave passe avant", () => {
    const r = resumerSeo(gsc, null, { id: "x", jour: "2026-11-30", resume: "…", points: [{ titre: "T", detail: "D", gain: "G" }, { pas: "un point" }], statut: "nouveau" });
    expect(seoEnService(r)).toBe(true);
    expect(r.rapport!.points).toEqual([{ titre: "T", detail: "D", gain: "G" }]);
    expect(r.gsc!.opportunites.page2).toHaveLength(1);
    expect(ligneSeo(r, false)).toEqual(["Agent SEO", "12 clics en 28 jours · position 38,2 · rapport à lire", "attention", "t'attend"]);
    const grave = resumerSeo(gsc, { jour: "2026-11-30", donnees: { verifiees: 507, graves: 2, finitions: 0, parCode: { erreur: 2 }, pages: [] } }, null);
    expect(ligneSeo(grave, false)[1]).toBe("12 clics en 28 jours · position 38,2 · 2 pages hors de Google");
  });
  it("la salle Marketing compte l'Agent SEO parmi les agents actifs", () => {
    const r = resumerSeo(gsc, null, null);
    const m = salleMarketing(null, false, r, false);
    expect(m.kpis[0]).toEqual(["Agents actifs", "1"]);
    expect(m.liste.map((l) => l[0])).toEqual(["Agent Prospection", "Agent SEO", "Agent Réseaux"]);
  });
  it("la scène : un agent en service a un robot plein et « EN SERVICE » au sol", () => {
    const gens = readFileSync("maquettes/bureaux/src/gens.js", "utf8"), pieces = readFileSync("maquettes/bureaux/src/pieces.js", "utf8"), donnees = readFileSync("maquettes/bureaux/src/donnees.js", "utf8");
    expect(gens).toContain("function majRobots(actifs)");
    expect(gens).toMatch(/m\.transparent = !on; m\.opacity = on \? 1 : GENS\.voile/);
    expect(pieces).toContain('id: ["prospection", "seo", "reseaux"][i]');
    expect(donnees).toContain("d.cabines.seo === true");
    expect(readFileSync("lib/bureaux/scene-fichiers.ts", "utf8")).toContain("majRobots");
  });
});

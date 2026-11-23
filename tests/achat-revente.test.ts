/**
 * Page de service « achat-revente » (23/11/2026) : les règles de Dani tiennent dans le texte. Aucun chiffre (ni prix,
 * ni montant, ni pourcentage de plus-value), aucune promesse de gain, pas de planning dans le temps (un carnet de
 * tâches à la place), une page reliée depuis l'accompagnement et présente dans le plan du site.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACHAT_REVENTE } from "@/lib/accompagnement/pages-services";

/** Tous les textes de la page (les valeurs seulement : un nom de champ comme `h1` n'est pas du texte affiché). */
const textes = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(textes) : v && typeof v === "object" ? Object.values(v).flatMap(textes) : [];
const texte = textes(ACHAT_REVENTE).join(" \n ");

describe("accompagnement achat-revente", () => {
  it("aucun chiffre, aucun prix, aucun pourcentage", () => {
    expect(texte).not.toMatch(/\d/);
    expect(texte).not.toMatch(/€|%|euros?\b/i);
  });

  it("aucune promesse de gain : la page dit au contraire qu'elle n'en promet pas", () => {
    expect(texte).not.toMatch(/(gains?|plus-values?|rentabilit[ée]|b[ée]n[ée]fices?) (garanti|assur)|assur[ée]e? de gagner/i);
    expect(ACHAT_REVENTE.aSavoir.join(" ")).toContain("Je ne promets aucune plus-value");
  });

  it("aucun délai promis (Daniel ne fait pas les travaux), et les risques de retard sont dits", () => {
    expect(ACHAT_REVENTE.aSavoir.join(" ")).toContain("Je ne m'engage sur aucun délai : ce n'est pas moi qui fais les travaux.");
    expect(texte).toContain("risques de retard");
  });

  it("ne vise pas les investisseurs à distance : c'est le client qui gère sur place", () => {
    expect(texte).not.toMatch(/loin de chez eux|achat-revente à distance/i);
  });

  it("pas de planning dans le temps : un carnet de tâches, la prochaine étape", () => {
    const planning = texte.match(/planning/gi) ?? [];
    expect(planning).toHaveLength(1); /* « Un carnet de tâches, pas un planning » */
    expect(texte).toContain("Un carnet de tâches, pas un planning");
    expect(texte).toContain("ta prochaine étape");
  });

  it("reliée depuis la page Accompagnement (service « visite ») et présente dans le plan du site", () => {
    const racine = path.join(__dirname, "..");
    expect(readFileSync(path.join(racine, "lib/accompagnement/contenu.ts"), "utf8")).toContain('href: "/accompagnement-achat-revente"');
    expect(readFileSync(path.join(racine, "app/sitemap.ts"), "utf8")).toContain("/accompagnement-achat-revente");
    expect(ACHAT_REVENTE.chemin).toBe("/accompagnement-achat-revente");
  });

  it("maillage interne : l'accueil (FR et EN), les pages voisines, deux guides, le catalogue de services", () => {
    const racine = path.join(__dirname, "..");
    const lire = (f: string) => readFileSync(path.join(racine, f), "utf8");
    expect(lire("app/page.tsx").match(/accItem\(ACC_IC\.revente,[^\n]*"\/accompagnement-achat-revente"\)/g) ?? []).toHaveLength(2);
    expect(lire("lib/accompagnement/pages-services.ts").match(/href: "\/accompagnement-achat-revente"/g) ?? []).toHaveLength(2);
    expect(lire("app/guides/[slug]/page.tsx").match(/href="\/accompagnement-achat-revente"/g) ?? []).toHaveLength(2);
    expect(lire("app/accompagnement-travaux/page.tsx")).toMatch(/url: `\$\{siteUrl\}\$\{s\.lien\.href\}`/);
  });
});

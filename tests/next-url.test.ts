import { describe, it, expect } from "vitest";
import { cheminInterne } from "@/lib/next-url";

/**
 * Cette garde est la seule chose qui sépare un paramètre d'URL d'une redirection ouverte.
 * Elle est désormais partagée par trois appelants (connexion, inscription, page d'inscription) :
 * une régression ici enverrait un visiteur d'AVYORA sur un domaine choisi par un tiers, depuis
 * un lien qui a l'air d'être le nôtre. D'où ces cas, y compris les deux formes qui ressemblent
 * à un chemin interne sans en être un.
 */
describe("cheminInterne", () => {
  it("accepte un chemin interne, query comprise", () => {
    expect(cheminInterne("/tarifs")).toBe("/tarifs");
    expect(cheminInterne("/tarifs?plan=mensuel")).toBe("/tarifs?plan=mensuel");
  });

  it("refuse une URL absolue", () => {
    expect(cheminInterne("https://exemple.test/phishing")).toBe("/projets");
    expect(cheminInterne("javascript:alert(1)")).toBe("/projets");
  });

  it("refuse les deux formes qui imitent un chemin interne", () => {
    // « //hote » est une URL protocol-relative : le navigateur y voit un domaine externe.
    expect(cheminInterne("//exemple.test")).toBe("/projets");
    // « /\hote » est interprété comme « //hote » par plusieurs navigateurs.
    expect(cheminInterne("/\\exemple.test")).toBe("/projets");
  });

  it("refuse les caractères de contrôle et les espaces (le navigateur les retire avant de lire l'URL)", () => {
    // « /<tab>/evil.com » : la tabulation retirée, il reste « //evil.com », un domaine externe.
    // C'est ce que /connexion?next=%2F%09%2Fevil.com faisait d'une personne déjà connectée.
    for (const x of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\t\\evil.com", "/\u0000/evil.com", "/\u007f/evil.com", " //evil.com", "/ /evil.com", "/projets\n"]) {
      expect(cheminInterne(x), JSON.stringify(x)).toBe("/projets");
      expect(cheminInterne(x, ""), JSON.stringify(x)).toBe("");
    }
    // Les mêmes, tels que les décode searchParams.
    expect(cheminInterne(new URLSearchParams("next=%2F%09%2Fevil.com").get("next") ?? undefined)).toBe("/projets");
    expect(cheminInterne(new URLSearchParams("next=%2F%0A%2Fevil.com").get("next") ?? undefined)).toBe("/projets");
    // Un chemin légitime encodé reste accepté.
    expect(cheminInterne("/prix-renovation?ville=saint%20denis")).toBe("/prix-renovation?ville=saint%20denis");
  });

  it("retombe sur le défaut quand il n'y a pas de destination", () => {
    expect(cheminInterne(undefined)).toBe("/projets");
    expect(cheminInterne("")).toBe("/projets");
  });

  it("respecte le défaut fourni — l'inscription atterrit sur /onboarding, pas /projets", () => {
    expect(cheminInterne("", "/onboarding")).toBe("/onboarding");
    expect(cheminInterne(undefined, "/onboarding")).toBe("/onboarding");
    expect(cheminInterne("//exemple.test", "/onboarding")).toBe("/onboarding");
    expect(cheminInterne("/tarifs?plan=annuel", "/onboarding")).toBe("/tarifs?plan=annuel");
  });
});

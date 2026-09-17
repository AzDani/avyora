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

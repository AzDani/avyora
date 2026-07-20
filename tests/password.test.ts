import { describe, it, expect } from "vitest";
import { validerMotDePasse } from "@/lib/password";

describe("politique de mots de passe", () => {
  it("refuse moins de 12 caractères", () => {
    expect(validerMotDePasse("Court1")).not.toBeNull();
    expect(validerMotDePasse("Abcdef123")).not.toBeNull();
  });
  it("exige au moins une lettre et un chiffre", () => {
    expect(validerMotDePasse("123456789012")).toContain("lettre");
    expect(validerMotDePasse("abcdefghijkl")).toContain("chiffre");
  });
  it("refuse les mots de passe trop courants", () => {
    expect(validerMotDePasse("azerty123")).not.toBeNull();
    expect(validerMotDePasse("motdepasse1")).not.toBeNull();
  });
  it("refuse un mot de passe démesuré", () => {
    expect(validerMotDePasse("a1".repeat(150))).not.toBeNull();
  });
  it("accepte un mot de passe robuste", () => {
    expect(validerMotDePasse("Renovation2026!maison")).toBeNull();
    expect(validerMotDePasse("chantier-bordeaux-33000")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { projetCreateSchema, pieceSchema, depenseSchema, artisanSchema, chantierStatutSchema } from "@/lib/validation";

describe("schémas de validation d'entrée (zod)", () => {
  it("projet : accepte une entrée valide", () => {
    const r = projetCreateSchema.safeParse({ nom: "Maison", typeBien: "maison", surface: 90, codePostal: "33000", reponses: { typeProjet: "renovation" } });
    expect(r.success).toBe(true);
  });
  it("projet : refuse un code postal invalide", () => {
    expect(projetCreateSchema.safeParse({ nom: "x", surface: 90, codePostal: "ABC", reponses: {} }).success).toBe(false);
  });
  it("projet : refuse une surface négative ou nulle", () => {
    expect(projetCreateSchema.safeParse({ nom: "x", surface: -5, codePostal: "33000", reponses: {} }).success).toBe(false);
    expect(projetCreateSchema.safeParse({ nom: "x", surface: 0, codePostal: "33000", reponses: {} }).success).toBe(false);
  });
  it("projet : refuse un nom vide et borne sa longueur", () => {
    expect(projetCreateSchema.safeParse({ nom: "", surface: 90, codePostal: "33000", reponses: {} }).success).toBe(false);
    expect(projetCreateSchema.safeParse({ nom: "a".repeat(200), surface: 90, codePostal: "33000", reponses: {} }).success).toBe(false);
  });
  it("projet : refuse des réponses démesurées (anti-abus)", () => {
    const gros = { grosChamp: "x".repeat(50000) };
    expect(projetCreateSchema.safeParse({ nom: "x", surface: 90, codePostal: "33000", reponses: gros }).success).toBe(false);
  });
  it("pièce : bornes dimensions", () => {
    expect(pieceSchema.safeParse({ nom: "Salon", longueur: 5, largeur: 4 }).success).toBe(true);
    expect(pieceSchema.safeParse({ nom: "Salon", longueur: -1, largeur: 4 }).success).toBe(false);
    expect(pieceSchema.safeParse({ nom: "Salon", longueur: 99999, largeur: 4 }).success).toBe(false);
  });
  it("dépense : montant positif", () => {
    expect(depenseSchema.safeParse({ corpsEtat: "peinture", libelle: "Pots", montant: 250 }).success).toBe(true);
    expect(depenseSchema.safeParse({ corpsEtat: "peinture", libelle: "Pots", montant: 0 }).success).toBe(false);
  });
  it("statut de tâche : valeur dans l'énumération", () => {
    expect(chantierStatutSchema.safeParse({ taskId: "abc", statut: "fait" }).success).toBe(true);
    expect(chantierStatutSchema.safeParse({ taskId: "abc", statut: "n_importe_quoi" }).success).toBe(false);
  });
  it("artisan : nom requis", () => {
    expect(artisanSchema.safeParse({ nom: "Elec SARL", ville: "Lyon" }).success).toBe(true);
    expect(artisanSchema.safeParse({ ville: "Lyon" }).success).toBe(false);
  });
});

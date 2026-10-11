import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Règle du neuf : aucun prix écrit en dur dans les écrans. Tout montant vient du moteur, ou d'une
 * constante sourcée de `lib/estimateur/` (ex. `EXTERIEURS_HORS_PERIMETRE`). Ce test lit les
 * sources des écrans du neuf ; la liste est vide tant qu'ils n'existent pas, puis grossit.
 */
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIERS = ["components/neuf", "app/estimation-construction-maison", "app/projets/nouveau/construction"];

function sources(dir: string): string[] {
  const abs = path.join(RACINE, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(path.join(RACINE, p)).isDirectory()) return sources(p);
    return /\.(tsx?|jsx?|mdx?)$/.test(f) ? [p] : [];
  });
}

/** Un nombre suivi de « € » (espaces, insécables, points ou virgules permis entre les chiffres), ou d'« €/m² ». */
const PRIX = /\d[\d\s  .,]*\s?€/;
const PRIX_M2 = /\d[\d\s  .,]*\s?€\s?\/\s?m²/;
const prixEnDur = (src: string) => PRIX.test(src) || PRIX_M2.test(src);

describe("Neuf · aucun prix écrit en dur dans les écrans", () => {
  it("le détecteur reconnaît un prix écrit, pas un montant formaté par le code", () => {
    for (const s of ["≈ 8 000 à 20 000 €", "1 850 €/m²", "12,5 €", "8 000 €"]) expect(prixEnDur(s), s).toBe(true);
    for (const s of ["{eur(total)} €", "{fmt(x)} €/m²", "TVA 20 %", "100 m²"]) expect(prixEnDur(s), s).toBe(false);
  });

  it("aucune source des écrans du neuf ne contient de prix", () => {
    const fautifs = DOSSIERS.flatMap(sources).filter((f) => prixEnDur(readFileSync(path.join(RACINE, f), "utf8")));
    expect(fautifs).toEqual([]);
  });
});

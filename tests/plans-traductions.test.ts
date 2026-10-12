/**
 * C5 · les textes du site autour de l'éditeur (`lib/i18n/plans.ts`) : même forme en FR et en EN, aucun
 * prix, aucun emoji, le tutoiement, et les droits dits avec les mots de l'éditeur (`DROITS`).
 *
 * C5 n'ajoute aucune clé à `lib/i18n/dictionaries.ts` (nav, pied et Tarifs arrivent en C9) : le test
 * vérifie quand même que le dictionnaire global garde la même forme dans les deux langues.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dictPlans } from "@/lib/i18n/plans";
import { dict } from "@/lib/i18n/dictionaries";

type Arbre = unknown;

/** La forme d'un dictionnaire : clés, types, et nombre d'arguments des fonctions. */
function forme(v: Arbre): unknown {
  if (typeof v === "function") return `fn/${v.length}`;
  if (v === null) return "texte-ou-null";
  if (Array.isArray(v)) return v.map(forme);
  if (typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, forme((v as Record<string, unknown>)[k])]));
  return typeof v === "string" ? "texte-ou-null" : typeof v;
}

/** Toutes les chaînes d'un dictionnaire, fonctions appelées avec des valeurs d'exemple. */
function textes(v: Arbre, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") {
    const f = v as (...a: unknown[]) => unknown;
    for (const essai of [["Ma maison"], [1], [3], ["2,5"]]) {
      try {
        const r = f(...essai);
        if (typeof r === "string") out.push(r);
      } catch {
        /* argument d'un autre type */
      }
    }
  } else if (v && typeof v === "object") for (const x of Object.values(v)) textes(x, out);
  return out;
}

const PRIX = /\d+[,.]\d{2}\s?€|€\s?\d/;
const EMOJI = /\p{Extended_Pictographic}/u;

describe("C5 · lib/i18n/plans.ts", () => {
  const fr = dictPlans("fr"), en = dictPlans("en");

  it("même forme d'objet en FR et en EN (clés, fonctions et leur nombre d'arguments)", () => {
    expect(forme(en)).toEqual(forme(fr));
  });

  it("aucun prix, aucun emoji, aucune chaîne vide", () => {
    for (const s of [...textes(fr), ...textes(en)]) {
      expect(s, s).not.toMatch(PRIX);
      expect(s, s).not.toMatch(EMOJI);
      expect(s.trim().length, JSON.stringify(s)).toBeGreaterThan(0);
    }
  });

  it("le tutoiement en français ; l'anglais ne garde pas de français (hors noms de l'éditeur cités)", () => {
    for (const s of textes(fr)) expect(s, s).not.toMatch(/\b(vous|votre|vos)\b/i);
    for (const s of textes(en)) {
      const sansCitation = s.replace(/“[^”]*”/g, "");
      expect(sansCitation, s).not.toMatch(/\b(le|la|les|des|ton|tes|ta|avec|sans|pour|dans|appareil|compte)\b/i);
    }
  });

  it("l'anglais cite « Mes plans » sous le nom que l'éditeur affiche (il reste en français), jamais “My plans”", () => {
    const tous = textes(en);
    expect(tous.filter((s) => /my plans/i.test(s))).toEqual([]);
    const cites = tous.filter((s) => s.includes("“Mes plans”"));
    expect(cites.length).toBeGreaterThanOrEqual(4);
    expect(cites).toContain(en.rappel.texte);
  });

  it("la mention « éditeur en français » n'existe qu'en anglais", () => {
    expect(fr.page.enFrancais).toBeNull();
    expect(en.page.enFrancais).toBe("The editor is in French for now.");
  });

  it("les droits reprennent les mots de DROITS dans l'éditeur", () => {
    const html = readFileSync(path.join(__dirname, "..", "maquettes", "plan-editor.html"), "utf8");
    const m = html.match(/plans:\{gratuit:'([^']+)',pro:'([^']+)'\}/);
    expect(m).not.toBeNull();
    const [, gratuit, pro] = m!;
    expect(fr.commun.gratuit).toBe(`Version gratuite : ${gratuit}.`);
    expect(fr.commun.avecPro).toBe(`Avec Pro : ${pro}.`);
    expect(fr.hub.limitePro).toBe(`Avec Pro : ${pro}`);
  });

  it("un Plan final n'est jamais décrit avec les mots interdits (D75) dans les textes du hub", () => {
    const interdits = /\b(estimer|budget|neuf|travaux)\b/i;
    for (const k of ["typeFinal", "m2", "pieces", "gratuit", "avecPro"] as const) {
      for (const s of textes(fr.commun[k])) expect(s, s).not.toMatch(interdits);
    }
    for (const s of [...textes(fr.page), ...textes(fr.rappel)]) expect(s, s).not.toMatch(interdits);
  });
});

describe("C5 · lib/i18n/dictionaries.ts", () => {
  it("même forme en FR et en EN (aucune clé ajoutée sans sa traduction)", () => {
    expect(forme(dict("en"))).toEqual(forme(dict("fr")));
  });
});

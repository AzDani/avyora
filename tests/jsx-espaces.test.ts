/**
 * Le piège SWC des mots collés (2e contre-examen) : dans un texte JSX qui court sur plusieurs lignes ET contient une
 * entité HTML (`&apos;`, `&nbsp;`…), le compilateur de Next (SWC) retire l'espace de tête. Placé juste après un élément
 * ou une expression, le texte se colle au mot d'avant : « service AVYORA(« le Service ») », « indicatifet comportent »
 * (CGU, CGV, pages de prix et guides, vérifié dans le HTML du build). Babel et TypeScript, eux, gardent l'espace : seul
 * le build de production le montre. La règle : `{" "}` explicite, comme dans /methodologie.
 *
 * Ce test lit chaque fichier .tsx d'app/, components/ et lib/ avec l'analyseur de TypeScript et refuse tout texte JSX
 * qui suit un élément ou une expression, commence par une espace, court sur plusieurs lignes et contient une entité.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ts from "typescript";

const RACINE = path.resolve(__dirname, "..");

function fichiers(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : fichiers(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

/** Les textes JSX dont SWC perdrait l'espace de tête : `fichier:ligne: début du texte`. */
function textesColles(p: string): string[] {
  const src = fs.readFileSync(p, "utf8");
  const sf = ts.createSourceFile(p, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const voir = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const brut = n.getFullText();
      const freres = (n.parent as ts.JsxElement | ts.JsxFragment).children ? Array.from((n.parent as ts.JsxElement).children) : [];
      if (freres.indexOf(n) > 0 && /^[ \t]+\S/.test(brut) && brut.includes("\n") && /&[a-zA-Z#][a-zA-Z0-9]*;/.test(brut)) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        out.push(`${path.relative(RACINE, p)}:${line + 1}: ${brut.trim().split("\n")[0].slice(0, 80)}`);
      }
    }
    ts.forEachChild(n, voir);
  };
  voir(sf);
  return out;
}

describe("Mots collés (piège SWC) : une espace après un élément, dans un texte JSX sur plusieurs lignes avec une entité", () => {
  it("aucun dans app/, components/, lib/ : `{\" \"}` explicite", () => {
    const tous = ["app", "components", "lib"].flatMap((d) => fichiers(path.join(RACINE, d))).flatMap(textesColles);
    expect(tous).toEqual([]);
  });

  it("le détecteur reconnaît le cas des CGU d'avant, et laisse passer `{\" \"}` et les textes sans entité", () => {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "jsx-espaces-"));
    const tmp = path.join(dossier, "cgu.tsx");
    try {
      fs.writeFileSync(tmp, [
        "export const a = <p>",
        "  du service <strong>AVYORA</strong> (« le Service »), un outil",
        "  d&apos;estimation.",
        "</p>;",
        "export const b = <p>",
        "  <strong>AVYORA</strong>{\" \"}(« le Service »), un outil",
        "  d&apos;estimation.",
        "</p>;",
        "export const c = <p>",
        "  <strong>AVYORA</strong> Deux maisons du",
        "  même âge.",
        "</p>;",
      ].join("\n"));
      const trouves = textesColles(tmp);
      expect(trouves).toHaveLength(1);
      expect(trouves[0]).toMatch(/cgu\.tsx:2: \(« le Service »\), un outil$/);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true });
    }
  });
});

/**
 * « Mes plans » (jury) : aucun `next/link` vers `/plan`.
 *
 * `/plan` est un route handler qui sert l'éditeur entier (1,3 Mo de HTML). Le routeur ne le sait pas : un `<Link>`
 * visible le précharge (`/plan?_rsc=…`), puis refait une requête au clic avant la navigation complète. Les liens vers
 * l'éditeur sont donc de simples balises `<a>` (comme l'accueil), ce que la doc Next prévoit pour une autre application.
 *
 * Le test lit le source de `app/` et `components/` : chaque élément `<Link …>` est relevé (jusqu'au `>` de fin, hors
 * accolades et chaînes), puis refusé si son `href` vaut `/plan…` : en clair, ou par une variable du même fichier
 * initialisée avec `/plan…` (`planHref`, `trouve.href`…).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = path.join(__dirname, "..");
const VERS_PLAN = /["'`]\/plan(?:[?"'`]|\$\{)/;

function fichiers(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) out.push(...fichiers(p));
    else if (/\.(tsx|ts)$/.test(n)) out.push(p);
  }
  return out;
}

/** Les attributs de chaque `<Link …>` : on avance jusqu'au `>` qui n'est ni dans des accolades ni dans une chaîne. */
export function elementsLink(src: string): string[] {
  const res: string[] = [];
  for (let i = src.indexOf("<Link"); i >= 0; i = src.indexOf("<Link", i + 5)) {
    if (/[A-Za-z0-9_]/.test(src[i + 5] ?? "")) continue;
    let prof = 0;
    let chaine: string | null = null;
    let j = i + 5;
    for (; j < src.length; j++) {
      const c = src[j];
      if (chaine) {
        if (c === "\\") j++;
        else if (c === chaine) chaine = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") chaine = c;
      else if (c === "{") prof++;
      else if (c === "}") prof--;
      else if (c === ">" && prof === 0) break;
    }
    res.push(src.slice(i + 5, j));
  }
  return res;
}

/** Le `href` de ce `<Link>` mène-t-il à `/plan` ? */
export function versPlan(attrs: string, fichier: string): boolean {
  const m = attrs.match(/\bhref=(\{[\s\S]*?\}|"[^"]*")/);
  if (!m) return false;
  const h = m[1];
  if (VERS_PLAN.test(h)) return true;
  const v = h.match(/^\{\s*([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?\s*\}$/);
  if (!v) return false;
  const nom = v[2] ?? v[1];
  const def = new RegExp(`\\b${nom}\\s*[:=][^;\\n]*["'\`]/plan(?:[?"'\`]|\\$\\{)`);
  return def.test(fichier);
}

describe("aucun next/link vers /plan (préchargement de l'éditeur entier)", () => {
  it("le relevé sait reconnaître un lien vers /plan, en clair ou par une variable", () => {
    const src = 'const planHref = `/plan?id=${x}`;\n<Link href={planHref} a={() => 1}>x</Link>\n<Link href="/tarifs">y</Link>';
    const els = elementsLink(src);
    expect(els).toHaveLength(2);
    expect(versPlan(els[0], src)).toBe(true);
    expect(versPlan(els[1], src)).toBe(false);
    expect(versPlan(' href="/plan?type=final" className="x"', "")).toBe(true);
    expect(versPlan(' href="/plans/og-plan.png"', "")).toBe(false);
  });

  it("app/ et components/ : chaque lien vers l'éditeur est une balise <a>", () => {
    const fautifs: string[] = [];
    for (const f of [...fichiers(path.join(RACINE, "app")), ...fichiers(path.join(RACINE, "components"))]) {
      const src = readFileSync(f, "utf8");
      if (!src.includes("<Link")) continue;
      for (const a of elementsLink(src)) if (versPlan(a, src)) fautifs.push(`${path.relative(RACINE, f)} : <Link${a.slice(0, 80)}…`);
    }
    expect(fautifs).toEqual([]);
  });
});

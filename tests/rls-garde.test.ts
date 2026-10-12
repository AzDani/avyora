/**
 * La garde de `tests/rls.test.ts` (chantier C1b) : elle refuse toute URL de production, même quand
 * `.env.local` n'est pas chargé dans l'environnement (cas de vitest). Aucune base n'est touchée.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hote, lireEnv, production, rlsAutorise } from "./rls-garde";

const PROD = "https://prodabcdef.supabase.co";
const CLE_PROD = "eyJ.prod.anon";

function depot(fichiers: Record<string, string>): string {
  const d = mkdtempSync(path.join(tmpdir(), "rls-garde-"));
  for (const [f, t] of Object.entries(fichiers)) writeFileSync(path.join(d, f), t);
  return d;
}

describe("garde de tests/rls.test.ts", () => {
  it("lit l'URL de production dans .env.local, même absente de l'environnement", () => {
    const d = depot({ ".env.local": `# prod\nNEXT_PUBLIC_SUPABASE_URL=${PROD}\nNEXT_PUBLIC_SUPABASE_ANON_KEY="${CLE_PROD}"\n` });
    try {
      const prod = production(d, {});
      expect([...prod.hotes]).toEqual(["prodabcdef.supabase.co"]);
      const test = { anon: "eyJ.test", service: "eyJ.service" };
      for (const url of [PROD, PROD + "/", "HTTPS://PRODABCDEF.SUPABASE.CO", PROD + "/rest/v1", PROD + ":443", " " + PROD + " "]) {
        expect(rlsAutorise({ ...test, url }, prod), url).toBe(false);
      }
      expect(rlsAutorise({ ...test, url: "https://testxyz.supabase.co" }, prod)).toBe(true);
      /* la clé anon de production, même sur un autre hôte */
      expect(rlsAutorise({ url: "https://testxyz.supabase.co", anon: CLE_PROD, service: "s" }, prod)).toBe(false);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("l'environnement courant compte aussi, et chaque fichier d'environnement du dépôt", () => {
    const d = depot({ ".env": "SUPABASE_URL=https://autre.supabase.co" });
    try {
      const prod = production(d, { NEXT_PUBLIC_SUPABASE_URL: PROD });
      expect([...prod.hotes].sort()).toEqual(["autre.supabase.co", "prodabcdef.supabase.co"]);
      expect(rlsAutorise({ url: "https://autre.supabase.co", anon: "a", service: "s" }, prod)).toBe(false);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("refuse sans les trois variables ou avec une URL illisible", () => {
    const prod = { hotes: new Set<string>(), anons: new Set<string>() };
    expect(rlsAutorise({}, prod)).toBe(false);
    expect(rlsAutorise({ url: "https://t.supabase.co", anon: "a" }, prod)).toBe(false);
    expect(rlsAutorise({ url: "pas une url", anon: "a", service: "s" }, prod)).toBe(false);
    expect(hote("https://Ex.Supabase.co./x")).toBe("ex.supabase.co");
  });

  it("lecture des fichiers .env : guillemets, export, commentaires", () => {
    expect(lireEnv('export A="x y"\nB=\'z\'\n# C=1\nD=v # note\n')).toEqual({ A: "x y", B: "z", D: "v" });
  });

  it("dans ce dépôt : si .env.local existe, son hôte est reconnu comme production", () => {
    const racine = path.join(__dirname, "..");
    if (!existsSync(path.join(racine, ".env.local"))) return; /* CI : pas de fichier, rien à protéger */
    expect(production(racine, {}).hotes.size).toBeGreaterThan(0);
  });
});

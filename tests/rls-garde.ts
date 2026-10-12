import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * La garde de `tests/rls.test.ts` : ce test CRÉE des comptes, il ne doit jamais viser la production.
 *
 * Vitest ne charge pas `.env.local` : comparer à `process.env.NEXT_PUBLIC_SUPABASE_URL` seul laisserait
 * passer l'URL de production quand elle n'est pas dans l'environnement. La garde lit donc elle-même les
 * fichiers d'environnement du dépôt et refuse tout hôte (et toute clé anon) qu'ils désignent, quelle
 * que soit l'écriture de l'URL (casse, barre finale, chemin, port).
 */
export const FICHIERS_ENV = [".env.local", ".env", ".env.production", ".env.production.local", ".env.development.local"];
const CLES_URL = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"];
const CLES_ANON = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"];

/** `KEY=valeur`, `export KEY="valeur"`, commentaires et lignes vides ignorés. */
export function lireEnv(texte: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const ligne of texte.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ligne);
    if (!m) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    r[m[1]] = v;
  }
  return r;
}

export function hote(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.hostname ? u.hostname.toLowerCase().replace(/\.$/, "") : null;
  } catch {
    return null;
  }
}

/** Les hôtes et les clés anon de production : fichiers d'environnement du dépôt ET environnement courant. */
export function production(racine: string, env: Record<string, string | undefined> = process.env): { hotes: Set<string>; anons: Set<string> } {
  const hotes = new Set<string>();
  const anons = new Set<string>();
  const sources: Record<string, string | undefined>[] = [env];
  for (const f of FICHIERS_ENV) {
    try {
      sources.push(lireEnv(readFileSync(path.join(racine, f), "utf8")));
    } catch {
      /* fichier absent (CI) */
    }
  }
  for (const s of sources) {
    for (const k of CLES_URL) {
      const h = hote(s[k]);
      if (h) hotes.add(h);
    }
    for (const k of CLES_ANON) if (s[k]) anons.add(String(s[k]).trim());
  }
  return { hotes, anons };
}

/** Vrai seulement si les trois variables de test sont posées ET ne désignent pas la production. */
export function rlsAutorise(
  test: { url?: string; anon?: string; service?: string },
  prod: { hotes: Set<string>; anons: Set<string> },
): boolean {
  if (!test.url || !test.anon || !test.service) return false;
  const h = hote(test.url);
  if (!h) return false;
  if (prod.hotes.has(h)) return false;
  if (prod.anons.has(test.anon.trim())) return false;
  return true;
}

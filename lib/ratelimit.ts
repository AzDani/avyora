import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Rate-limiting via Upstash Redis (store partagé, adapté au serverless Vercel).
 * FALLBACK : si UPSTASH_REDIS_REST_URL/TOKEN ne sont pas définis (ex. dev local), les limites
 * sont désactivées (no-op) → l'app fonctionne sans dépendance. À activer en fournissant les 2 clés.
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

function make(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix = "avyora"): Ratelimit | null {
  return redis ? new Ratelimit({ redis, limiter, prefix, analytics: true }) : null;
}

// Fenêtres calibrées : auth serrée (anti-brute-force), IA très serrée (coût $), API modérée.
const LIMITERS: Record<LimitKind, Ratelimit | null> = {
  auth: make(Ratelimit.slidingWindow(6, "60 s")), // 6 tentatives / min / IP
  api: make(Ratelimit.slidingWindow(40, "60 s")), // 40 req / min
  ia: make(Ratelimit.slidingWindow(8, "60 s")), // 8 analyses IA / min
  pdf: make(Ratelimit.slidingWindow(5, "60 s")), // 5 PDF / min (génération Chrome headless = coûteux)
  // « Mes plans », indexés sur user.id, chacun sous son propre préfixe (le compteur d'une catégorie
  // ne mange pas celui de l'autre). La sauvegarde automatique de l'éditeur est groupée à ~2 s.
  plan: make(Ratelimit.slidingWindow(90, "60 s"), "avyora:plan"), // 90 écritures / min
  planCreation: make(Ratelimit.slidingWindow(20, "3600 s"), "avyora:plan-creation"), // 20 créations / h
  // Une estimation née d'un plan crée un projet à chaque validation : sa propre catégorie, serrée.
  planEstimation: make(Ratelimit.slidingWindow(10, "3600 s"), "avyora:plan-estimation"), // 10 / h
};

export type LimitKind = "auth" | "api" | "ia" | "pdf" | "plan" | "planCreation" | "planEstimation";

/**
 * « Mes plans » : les catégories qui CRÉENT des lignes en base se ferment si le store tombe (fail-closed) ;
 * les autres restent ouvertes (une sauvegarde de plan refusée ferait croire à une perte).
 */
const FERMEES_EN_PANNE = new Set<LimitKind>(["planCreation", "planEstimation"]);

/** IP client (best-effort) depuis les en-têtes de proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff?.split(",")[0].trim() || h.get("x-real-ip") || "unknown");
}

/**
 * En PRODUCTION sans Upstash, « Mes plans » garde ses limites EN MÉMOIRE, par instance : moins strictes qu'un
 * store partagé (chaque instance compte de son côté), mais un compte ne peut plus enchaîner les écritures
 * sans fin, et les plans restent enregistrables. Les autres catégories gardent le no-op d'avant.
 */
const MEMOIRE: Partial<Record<LimitKind, { max: number; fenetreMs: number }>> = {
  plan: { max: 90, fenetreMs: 60_000 },
  planCreation: { max: 20, fenetreMs: 3_600_000 },
  planEstimation: { max: 10, fenetreMs: 3_600_000 },
};
const traces = new Map<string, number[]>();
let memoireSignalee = false;

function limiteMemoire(kind: LimitKind, identifiant: string): boolean {
  const regle = MEMOIRE[kind];
  if (!regle || process.env.VERCEL_ENV !== "production") return true;
  if (!memoireSignalee) {
    memoireSignalee = true;
    console.warn("[ratelimit] Upstash absent en production : limites de « Mes plans » tenues en mémoire, par instance.");
  }
  const maintenant = Date.now();
  if (traces.size > 5000) {
    for (const [k, t] of traces) if (!t.length || maintenant - t[t.length - 1] > 3_600_000) traces.delete(k);
  }
  const cle = kind + ":" + identifiant;
  const t = (traces.get(cle) ?? []).filter((x) => maintenant - x < regle.fenetreMs);
  const ok = t.length < regle.max;
  if (ok) t.push(maintenant);
  traces.set(cle, t);
  return ok;
}

/** true = autorisé, false = limite dépassée. Sans Upstash : no-op, sauf « Mes plans » en production (en mémoire). */
export async function verifierLimite(kind: LimitKind, identifiant: string): Promise<boolean> {
  const rl = LIMITERS[kind];
  if (!rl) return limiteMemoire(kind, identifiant);
  try {
    const { success } = await rl.limit(identifiant);
    return success;
  } catch {
    // Panne du store : on ne bloque pas l'utilisateur légitime (fail-open contrôlé), sauf pour les créations
    // de « Mes plans » (fail-closed : sans limite, un compte pourrait créer des lignes sans fin).
    return !FERMEES_EN_PANNE.has(kind);
  }
}

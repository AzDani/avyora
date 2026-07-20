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

function make(limiter: ReturnType<typeof Ratelimit.slidingWindow>): Ratelimit | null {
  return redis ? new Ratelimit({ redis, limiter, prefix: "avyora", analytics: true }) : null;
}

// Fenêtres calibrées : auth serrée (anti-brute-force), IA très serrée (coût $), API modérée.
const LIMITERS: Record<LimitKind, Ratelimit | null> = {
  auth: make(Ratelimit.slidingWindow(6, "60 s")), // 6 tentatives / min / IP
  api: make(Ratelimit.slidingWindow(40, "60 s")), // 40 req / min
  ia: make(Ratelimit.slidingWindow(8, "60 s")), // 8 analyses IA / min
};

export type LimitKind = "auth" | "api" | "ia";

/** IP client (best-effort) depuis les en-têtes de proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff?.split(",")[0].trim() || h.get("x-real-ip") || "unknown");
}

/** true = autorisé, false = limite dépassée. No-op (true) si Upstash non configuré. */
export async function verifierLimite(kind: LimitKind, identifiant: string): Promise<boolean> {
  const rl = LIMITERS[kind];
  if (!rl) return true;
  try {
    const { success } = await rl.limit(identifiant);
    return success;
  } catch {
    // Panne du store : on ne bloque pas l'utilisateur légitime (fail-open contrôlé).
    return true;
  }
}

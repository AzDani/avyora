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

function make(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string): Ratelimit | null {
  return redis ? new Ratelimit({ redis, limiter, prefix, analytics: true }) : null;
}

// Fenêtres calibrées : auth serrée (anti-brute-force), IA très serrée (coût $), API modérée.
// Chaque catégorie sous SON préfixe : indexées sur la même IP avec la même fenêtre, auth et api écrivaient sous un
// préfixe commun dans la même clé Redis, et quelques appels d'API suffisaient à refuser une demande de lien d'accès.
const LIMITERS: Record<LimitKind, Ratelimit | null> = {
  auth: make(Ratelimit.slidingWindow(6, "60 s"), "avyora:auth"), // 6 tentatives / min / IP (et / adresse, en empreinte)
  api: make(Ratelimit.slidingWindow(40, "60 s"), "avyora:api"), // 40 req / min
  ia: make(Ratelimit.slidingWindow(8, "60 s"), "avyora:ia"), // 8 analyses IA / min
  pdf: make(Ratelimit.slidingWindow(5, "60 s"), "avyora:pdf"), // 5 PDF / min (génération Chrome headless = coûteux)
  // Bêta gratuite : tout inscrit génère des PDF ; un plafond horaire par compte borne la facture (Chrome headless, 60 s max).
  pdfHeure: make(Ratelimit.slidingWindow(30, "3600 s"), "avyora:pdf-heure"), // 30 PDF / h / compte
  // Les comptes ne coûtent rien (alias +étiquette, inscription directe auprès de Supabase) : un plafond par IP borne
  // ce que N comptes ouverts depuis une même machine peuvent demander (2e contre-examen).
  pdfIp: make(Ratelimit.slidingWindow(60, "3600 s"), "avyora:pdf-ip"), // 60 PDF / h / IP
  // Le lien d'accès envoie un e-mail à chaque demande : en plus de `auth` (6 / min / IP), deux plafonds horaires,
  // l'adresse depuis une même IP (en empreinte ; jamais toutes IP confondues : un tiers bloquerait la vraie personne)
  // et l'IP (un robot qui fait défiler les adresses).
  lienAdresse: make(Ratelimit.slidingWindow(3, "3600 s"), "avyora:lien-adresse"), // 3 liens / h / adresse et IP (un envoi, deux « Renvoyer »)
  lienIp: make(Ratelimit.slidingWindow(20, "3600 s"), "avyora:lien-ip"), // 20 liens / h / IP
  // « Mes plans », indexés sur user.id, chacun sous son propre préfixe (le compteur d'une catégorie
  // ne mange pas celui de l'autre). La sauvegarde automatique de l'éditeur est groupée à ~2 s.
  plan: make(Ratelimit.slidingWindow(90, "60 s"), "avyora:plan"), // 90 écritures / min
  planCreation: make(Ratelimit.slidingWindow(20, "3600 s"), "avyora:plan-creation"), // 20 créations / h
  // Une estimation née d'un plan crée un projet à chaque validation : sa propre catégorie, serrée.
  planEstimation: make(Ratelimit.slidingWindow(10, "3600 s"), "avyora:plan-estimation"), // 10 / h
};

export type LimitKind =
  | "auth" | "api" | "ia" | "pdf" | "pdfHeure" | "pdfIp" | "lienAdresse" | "lienIp" | "plan" | "planCreation" | "planEstimation";

/**
 * Les catégories qui CRÉENT des lignes en base (« Mes plans ») ou qui coûtent cher (le plafond horaire des PDF) se
 * ferment si le store tombe (fail-closed) ; les autres restent ouvertes (une sauvegarde de plan refusée ferait croire à
 * une perte, une demande de lien refusée empêcherait d'entrer).
 */
const FERMEES_EN_PANNE = new Set<LimitKind>(["planCreation", "planEstimation", "pdfHeure", "pdfIp"]);

/** IP client (best-effort) depuis les en-têtes de proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff?.split(",")[0].trim() || h.get("x-real-ip") || "unknown");
}

/**
 * En PRODUCTION sans Upstash, « Mes plans », l'authentification et les PDF gardent leurs limites EN MÉMOIRE, par
 * instance : moins strictes qu'un store partagé (chaque instance compte de son côté), mais un compte ne peut plus
 * enchaîner les écritures ni les PDF sans fin, ni un robot les demandes de lien d'accès (B2 : chaque demande envoie un
 * e-mail). Les autres catégories (api, ia) gardent le no-op d'avant.
 */
const MEMOIRE: Partial<Record<LimitKind, { max: number; fenetreMs: number }>> = {
  /* Connexion, inscription, lien d'accès, mot de passe oublié : comme Upstash, par IP et (lien) par adresse et IP. */
  auth: { max: 6, fenetreMs: 60_000 },
  lienAdresse: { max: 3, fenetreMs: 3_600_000 },
  lienIp: { max: 20, fenetreMs: 3_600_000 },
  /* Le PDF du rapport (Chrome headless) : ouvert à tout inscrit pendant la bêta. */
  pdf: { max: 5, fenetreMs: 60_000 },
  pdfHeure: { max: 30, fenetreMs: 3_600_000 },
  pdfIp: { max: 60, fenetreMs: 3_600_000 },
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
    console.warn("[ratelimit] Upstash absent en production : limites de « Mes plans », de l'authentification et des PDF tenues en mémoire, par instance.");
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

/** true = autorisé, false = limite dépassée. Sans Upstash : no-op, sauf « Mes plans », l'auth et les PDF en production (en mémoire). */
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

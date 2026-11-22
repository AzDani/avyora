import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Visiteurs en ligne (compteur de l'admin, 22/11/2026), sur le modèle de Vercel Analytics : AUCUN cookie, rien
 * d'écrit sur l'appareil. Chaque onglet visible se signale toutes les 30 s (`public/presence.js`) ; le serveur
 * en tire une empreinte (IP + navigateur + jour, salée, tronquée : ni l'IP ni l'identité ne sont gardées) et la
 * note dans un ensemble trié Upstash, avec la page vue. « En ligne » = signalé dans les FENETRE_MS dernières.
 *
 * Coût : UNE commande Upstash par signal (`ZADD`), plus un ménage de temps en temps. Sans Upstash (dev local),
 * tout est inerte et l'admin affiche « indisponible ».
 */
export const INTERVALLE_MS = 30_000;
export const FENETRE_MS = 90_000;
const CLE = "avyora:presence";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const ROBOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch|go-http/i;

export function estRobot(ua: string | null | undefined): boolean {
  return !ua || ROBOTS.test(ua);
}

/**
 * Le chemin tel qu'on le montre à l'admin : sans paramètres, borné, les identifiants remplacés par « … »
 * (/projets/3f2a… → /projets/…), pour regrouper et ne rien exposer. `null` : chemin refusé (pas interne, /admin).
 */
export function cheminPropre(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const chemin = brut.split(/[?#]/)[0].slice(0, 200);
  if (!/^\/[A-Za-z0-9/_.\-%]*$/.test(chemin) || chemin.startsWith("//")) return null;
  if (chemin === "/admin" || chemin.startsWith("/admin/")) return null;
  const morceaux = chemin
    .split("/")
    .map((m) => (/^[0-9a-f-]{16,}$/i.test(m) || /^\d{3,}$/.test(m) ? "…" : m));
  return morceaux.join("/").replace(/\/+$/, "") || "/";
}

/** Empreinte d'un visiteur pour la journée (heure de Paris) : on ne peut pas remonter à l'IP, et elle change chaque jour. */
export function empreinte(ip: string, ua: string, jour: string, sel: string): string {
  return createHash("sha256").update(`${sel}|${jour}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

export type EnLigne = { total: number; pages: { chemin: string; n: number }[] };

/**
 * Les membres de l'ensemble sont « empreinte|chemin » : un visiteur qui change de page laisse un ancien membre, qui
 * sort de la fenêtre tout seul ; on garde, par empreinte, le signal le plus récent.
 */
export function compter(membres: { membre: string; score: number }[], maintenant: number): EnLigne {
  const dernier = new Map<string, { chemin: string; score: number }>();
  for (const { membre, score } of membres) {
    if (score < maintenant - FENETRE_MS) continue;
    const i = membre.indexOf("|");
    if (i <= 0) continue;
    const id = membre.slice(0, i);
    const prec = dernier.get(id);
    if (!prec || score > prec.score) dernier.set(id, { chemin: membre.slice(i + 1), score });
  }
  const parPage = new Map<string, number>();
  for (const { chemin } of dernier.values()) parPage.set(chemin, (parPage.get(chemin) ?? 0) + 1);
  const pages = [...parPage].map(([chemin, n]) => ({ chemin, n })).sort((a, b) => b.n - a.n || a.chemin.localeCompare(b.chemin));
  return { total: dernier.size, pages };
}

export async function signaler(id: string, chemin: string, maintenant = Date.now()): Promise<void> {
  if (!redis) return;
  await redis.zadd(CLE, { score: maintenant, member: `${id}|${chemin}` });
  // Ménage de temps en temps (≈ 1 signal sur 20) : sans lui, l'ensemble grossirait tant que l'admin n'est pas ouvert.
  if (Math.random() < 0.05) await redis.zremrangebyscore(CLE, 0, maintenant - FENETRE_MS);
}

/** `null` : pas d'Upstash (dev local) ou lecture impossible. */
export async function lireEnLigne(maintenant = Date.now()): Promise<EnLigne | null> {
  if (!redis) return null;
  await redis.zremrangebyscore(CLE, 0, maintenant - FENETRE_MS);
  const brut = await redis.zrange<(string | number)[]>(CLE, 0, -1, { withScores: true });
  const membres: { membre: string; score: number }[] = [];
  for (let i = 0; i + 1 < brut.length; i += 2) membres.push({ membre: String(brut[i]), score: Number(brut[i + 1]) });
  return compter(membres, maintenant);
}

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Visiteurs en ligne (compteur de l'admin, 22/11/2026), sur le modèle de Vercel Analytics : aucun cookie ajouté,
 * rien d'écrit sur l'appareil. Chaque onglet visible se signale toutes les 30 s (`public/presence.js`) ; le serveur
 * note dans un ensemble trié Upstash la page vue, la ville et le pays approximatifs (en-têtes de Vercel, l'IP n'est
 * pas gardée) et, pour un membre connecté, son compte (décision de Dani du 23/11/2026, page Confidentialité à jour).
 * Un visiteur sans compte n'est qu'une empreinte du jour (IP + navigateur + jour, salée, tronquée). « En ligne » =
 * signalé dans les FENETRE_MS dernières ; au-delà, la trace est effacée.
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

/** Un signal : qui (empreinte, ou `u:<id>` pour un membre connecté), où sur le site, d'où (approximatif). */
export type Signal = { id: string; chemin: string; pays?: string; ville?: string; userId?: string };
export type Visiteur = Omit<Signal, "id"> & { cle: string; vuLe: number };
export type EnLigne = { total: number; pages: { chemin: string; n: number }[]; visiteurs: Visiteur[] };

/** Le membre de l'ensemble trié : les champs encodés, séparés par « | » (une ville peut contenir n'importe quoi). */
export function encoder(s: Signal): string {
  return [s.id, s.chemin, s.pays ?? "", s.ville ?? "", s.userId ?? ""].map(encodeURIComponent).join("|");
}

export function decoder(membre: string): Signal | null {
  const [id, chemin, pays, ville, userId] = membre.split("|").map((x) => {
    try { return decodeURIComponent(x); } catch { return ""; }
  });
  if (!id || !chemin) return null;
  return { id, chemin, ...(pays ? { pays } : {}), ...(ville ? { ville } : {}), ...(userId ? { userId } : {}) };
}

/** Ville et pays approximatifs, depuis les en-têtes de géolocalisation de Vercel (absents en local). */
export function geo(h: Headers): { pays?: string; ville?: string } {
  const pays = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  let ville = h.get("x-vercel-ip-city") ?? "";
  try { ville = decodeURIComponent(ville); } catch { ville = ""; }
  return {
    ...(/^[A-Z]{2}$/.test(pays) ? { pays } : {}),
    ...(ville && ville.length <= 80 && !/[<>|]/.test(ville) ? { ville } : {}),
  };
}

/**
 * Un visiteur qui change de page laisse un ancien membre, qui sort de la fenêtre tout seul : on garde, par visiteur,
 * le signal le plus récent. Les visiteurs, du plus récent au plus ancien.
 */
export function compter(membres: { membre: string; score: number }[], maintenant: number): EnLigne {
  const dernier = new Map<string, Visiteur>();
  for (const { membre, score } of membres) {
    if (score < maintenant - FENETRE_MS) continue;
    const sig = decoder(membre);
    if (!sig) continue;
    const prec = dernier.get(sig.id);
    if (!prec || score > prec.vuLe) {
      const { id, ...reste } = sig;
      dernier.set(id, { ...reste, cle: id.startsWith("u:") ? id : id.slice(0, 8), vuLe: score });
    }
  }
  const visiteurs = [...dernier.values()].sort((a, b) => b.vuLe - a.vuLe);
  const parPage = new Map<string, number>();
  for (const { chemin } of visiteurs) parPage.set(chemin, (parPage.get(chemin) ?? 0) + 1);
  const pages = [...parPage].map(([chemin, n]) => ({ chemin, n })).sort((a, b) => b.n - a.n || a.chemin.localeCompare(b.chemin));
  return { total: visiteurs.length, pages, visiteurs };
}

export async function signaler(signal: Signal, maintenant = Date.now()): Promise<void> {
  if (!redis) return;
  await redis.zadd(CLE, { score: maintenant, member: encoder(signal) });
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

/* ── Historique de la journée (23/11/2026, demande de Dani) ─────────────────────────────────────────────────────
   Qui est passé aujourd'hui : chaque visiteur (membre sous son compte, sinon l'empreinte du jour), son heure
   d'arrivée, sa dernière activité, les pages vues, ville et pays approximatifs. Deux ensembles triés par jour (heure
   de Paris) : la dernière vue de chaque page (`ZADD`, le score avance) et l'arrivée de chaque visiteur (`ZADD NX`,
   le premier score reste). Effacés JOUR_TTL_S après la dernière écriture. Pour ne pas tripler les commandes Upstash,
   le navigateur ne demande cette écriture (`?j=1`) qu'à l'arrivée sur une page puis environ toutes les 2 min 30. */
export const JOUR_TTL_S = 48 * 3600;
const cleJour = (jour: string) => `avyora:presence:jour:${jour}`;
const cleArrivee = (jour: string) => `avyora:presence:jour:${jour}:arrivee`;

export type VisiteJour = {
  cle: string;
  userId?: string;
  pays?: string;
  ville?: string;
  arrivee: number;
  dernier: number;
  /** Les pages vues, de la plus ancienne à la plus récente (heure de leur dernière vue). */
  pages: string[];
};
export type Journee = { total: number; membres: number; visiteurs: VisiteJour[] };

export function regrouperJournee(vues: { membre: string; score: number }[], arrivees: { membre: string; score: number }[]): Journee {
  const arr = new Map(arrivees.map((a) => [a.membre, a.score]));
  const parId = new Map<string, { sig: Signal; score: number }[]>();
  for (const { membre, score } of vues) {
    const sig = decoder(membre);
    if (!sig) continue;
    const liste = parId.get(sig.id) ?? [];
    liste.push({ sig, score });
    parId.set(sig.id, liste);
  }
  const visiteurs: VisiteJour[] = [];
  for (const [id, liste] of parId) {
    liste.sort((a, b) => a.score - b.score);
    const dernier = liste[liste.length - 1];
    const pages: string[] = [];
    for (const { sig } of liste) {
      const i = pages.indexOf(sig.chemin);
      if (i >= 0) pages.splice(i, 1);
      pages.push(sig.chemin);
    }
    visiteurs.push({
      cle: id.startsWith("u:") ? id : id.slice(0, 8),
      ...(dernier.sig.userId ? { userId: dernier.sig.userId } : {}),
      ...(dernier.sig.pays ? { pays: dernier.sig.pays } : {}),
      ...(dernier.sig.ville ? { ville: dernier.sig.ville } : {}),
      arrivee: Math.min(arr.get(id) ?? Infinity, liste[0].score),
      dernier: dernier.score,
      pages,
    });
  }
  visiteurs.sort((a, b) => b.dernier - a.dernier);
  return { total: visiteurs.length, membres: visiteurs.filter((v) => v.userId).length, visiteurs };
}

export async function noterJournee(signal: Signal, jour: string, maintenant = Date.now()): Promise<void> {
  if (!redis) return;
  const p = redis.pipeline();
  p.zadd(cleJour(jour), { score: maintenant, member: encoder(signal) });
  p.zadd(cleArrivee(jour), { nx: true }, { score: maintenant, member: signal.id });
  p.expire(cleJour(jour), JOUR_TTL_S);
  p.expire(cleArrivee(jour), JOUR_TTL_S);
  await p.exec();
}

const paires = (brut: unknown): { membre: string; score: number }[] => {
  const t = Array.isArray(brut) ? brut : [];
  const out: { membre: string; score: number }[] = [];
  for (let i = 0; i + 1 < t.length; i += 2) out.push({ membre: String(t[i]), score: Number(t[i + 1]) });
  return out;
};

/** `null` : pas d'Upstash (dev local) ou lecture impossible. */
export async function lireJournee(jour: string): Promise<Journee | null> {
  if (!redis) return null;
  const p = redis.pipeline();
  p.zrange(cleJour(jour), 0, -1, { withScores: true });
  p.zrange(cleArrivee(jour), 0, -1, { withScores: true });
  const [vues, arrivees] = await p.exec();
  return regrouperJournee(paires(vues), paires(arrivees));
}

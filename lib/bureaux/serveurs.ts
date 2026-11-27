import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planDe } from "@/lib/bureaux/limites";

/**
 * Ce que la salle des serveurs mesure elle-même, sans clé d'hébergeur (27/11/2026) : la place prise par les fichiers
 * (tous les dossiers du stockage Supabase) et la taille de la base (fonction `avyora_taille_base`, migration 0015).
 * Les comptes actifs se comptent à partir des inscrits, déjà lus par la route.
 *
 * Lecture seule, et mémorisée 10 minutes par instance : parcourir le stockage coûte des appels, la page relit chaque minute.
 * Une mesure qui échoue vaut null (la jauge dit « mesure impossible ») ; la base vaut null tant que 0015 n'est pas appliquée.
 */
export type MesureServeurs = {
  planSupabase: "gratuit" | "pro";
  planVercel: "gratuit" | "pro";
  /** Octets de tous les fichiers, et si le parcours a dû s'arrêter avant la fin (alors c'est un minimum). */
  fichiers: { octets: number; nb: number; partiel: boolean } | null;
  base: number | null;
  mesureLe: string;
};

const MEMOIRE_MS = 10 * 60 * 1000;
/** Garde-fou : au-delà, on s'arrête et on dit « au moins ». */
const APPELS_MAX = 400;
let memoire: { t: number; m: MesureServeurs } | null = null;

async function tailleFichiers(): Promise<MesureServeurs["fichiers"]> {
  const sb = supabaseAdmin();
  const { data: dossiers, error } = await sb.storage.listBuckets();
  if (error) throw new Error(error.message);
  let octets = 0, nb = 0, appels = 0, partiel = false;
  const parcourir = async (bucket: string, prefixe: string): Promise<void> => {
    for (let depart = 0; ; depart += 1000) {
      if (++appels > APPELS_MAX) { partiel = true; return; }
      const { data, error: e } = await sb.storage.from(bucket).list(prefixe, { limit: 1000, offset: depart });
      if (e) throw new Error(e.message);
      const liste = data ?? [];
      for (const o of liste) {
        const chemin = prefixe ? `${prefixe}/${o.name}` : o.name;
        // Un dossier n'a pas d'identifiant ; un fichier porte sa taille dans ses métadonnées.
        if (!o.id) await parcourir(bucket, chemin);
        else { octets += Number((o.metadata as { size?: number } | null)?.size ?? 0); nb++; }
      }
      if (liste.length < 1000) return;
    }
  };
  for (const d of dossiers ?? []) await parcourir(d.id, "");
  return { octets, nb, partiel };
}

async function tailleBase(): Promise<number | null> {
  const { data, error } = await supabaseAdmin().rpc("avyora_taille_base");
  if (error) return null;
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function mesurerServeurs(maintenant = Date.now()): Promise<MesureServeurs> {
  if (memoire && maintenant - memoire.t < MEMOIRE_MS) return memoire.m;
  const [fichiers, base] = await Promise.all([tailleFichiers().catch(() => null), tailleBase().catch(() => null)]);
  const m: MesureServeurs = {
    planSupabase: planDe(process.env.SUPABASE_PLAN),
    planVercel: planDe(process.env.VERCEL_PLAN),
    fichiers,
    base,
    mesureLe: new Date(maintenant).toISOString(),
  };
  memoire = { t: maintenant, m };
  return m;
}

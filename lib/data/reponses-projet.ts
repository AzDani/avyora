import { supabaseServer } from "@/lib/supabase/server";
import { getProjet } from "@/lib/data/projects";
import { statutsApres } from "@/lib/estimateur/statuts";

/**
 * Écritures d'UNE clé de `projects.reponses` (suivi de chantier, investissement), sans réécrire le reste.
 *
 * Voie normale : une fonction SQL (supabase/migrations/0006_reponses_maj_cle.sql) qui modifie la clé dans
 * un seul UPDATE, donc atomique : deux clics de statut rapprochés, ou un statut et une sauvegarde de
 * l'Investissement, ne s'effacent plus. Session de l'utilisateur : la RLS s'applique.
 *
 * Tant que la migration n'est pas appliquée (fonction inconnue de PostgREST), on retombe sur l'écriture
 * d'avant (lecture puis réécriture de `reponses`), pour ne rien casser en production.
 */
/** « refuse » : aucune ligne modifiée alors que le projet se lit (membre sans droit d'écriture, RLS). */
export type ResultatMaj = "ok" | "introuvable" | "refuse" | "erreur";

type ErreurPg = { code?: string; message?: string } | null;

/** La fonction SQL n'existe pas encore (migration non appliquée) : PGRST202 (PostgREST) ou 42883 (Postgres). */
export function fonctionAbsente(e: ErreurPg): boolean {
  return !!e && (e.code === "PGRST202" || e.code === "42883");
}

/** Aucune ligne modifiée par la fonction SQL : projet absent (404) ou lisible mais pas modifiable (403). */
async function sansLigne(id: string): Promise<ResultatMaj> {
  return (await getProjet(id)) ? "refuse" : "introuvable";
}

/** Repli sans la fonction SQL : lecture, modification, réécriture (l'ancien comportement). */
async function majParReecriture(id: string, modifier: (reponses: Record<string, unknown>) => Record<string, unknown>): Promise<ResultatMaj> {
  const projet = await getProjet(id);
  if (!projet) return "introuvable";
  const reponses = modifier({ ...(projet.reponses as Record<string, unknown>) });
  const sb = await supabaseServer();
  const { data, error } = await sb.from("projects").update({ reponses }).eq("id", id).select("id");
  if (error) { console.error("Écriture de reponses échouée:", error); return "erreur"; }
  return (data ?? []).length === 1 ? "ok" : "refuse";
}

/** Statut d'une tâche du suivi de chantier (`reponses.statuts[cle]`). */
export async function majStatut(id: string, cle: string, etat: 0 | 1 | 2): Promise<ResultatMaj> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("projet_statut_maj", { p_projet: id, p_cle: cle, p_etat: etat });
  if (!error) return data === true ? "ok" : await sansLigne(id);
  if (!fonctionAbsente(error)) { console.error("projet_statut_maj échouée:", error); return "erreur"; }
  return majParReecriture(id, (r) => ({ ...r, statuts: statutsApres(r.statuts, cle, etat) }));
}

/** Une clé de module hors estimation (`invest`). */
export async function majCleReponses(id: string, cle: "invest", valeur: unknown): Promise<ResultatMaj> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("projet_reponses_cle_maj", { p_projet: id, p_cle: cle, p_valeur: valeur });
  if (!error) return data === true ? "ok" : await sansLigne(id);
  if (!fonctionAbsente(error)) { console.error("projet_reponses_cle_maj échouée:", error); return "erreur"; }
  return majParReecriture(id, (r) => ({ ...r, [cle]: valeur }));
}

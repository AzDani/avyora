import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { estCible, estStatut, resumerProspection, type Prospect, type ResumeProspection } from "@/lib/prospection/statuts";

/**
 * L'Agent Prospection (28/11/2026) : la lecture. Table de la migration 0019 ; tant qu'elle n'est pas appliquée, la lecture
 * lève une ErreurProspection avec `migrationAbsente` (la salle Marketing et /admin/marketing le disent). Lecture seule :
 * le site n'envoie aucun e-mail de prospection.
 */
export const TABLE_PROSPECTS = "admin_prospects";

export class ErreurProspection extends Error {
  readonly migrationAbsente: boolean;
  constructor(message: string, migrationAbsente: boolean) { super(message); this.migrationAbsente = migrationAbsente; }
}

type Ligne = {
  id: string; email: string; entreprise: string; contact: string | null; cible: string; metier: string | null; commune: string | null; ville: string | null;
  lot: string | null; envoye_le: string | null; relance_le: string | null; reponse_le: string | null; statut: string; note: string | null; maj_le: string;
};
const COLONNES = "id, email, entreprise, contact, cible, metier, commune, ville, lot, envoye_le, relance_le, reponse_le, statut, note, maj_le";

/** Postgres « relation does not exist » (42P01) ou PostgREST « table introuvable » (PGRST205). */
const tableAbsente = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(e.message ?? "");

/** Tous les prospects et leur résumé, les derniers envoyés d'abord. Lève si la table n'existe pas. */
export async function lireProspection(maintenant = new Date()): Promise<ResumeProspection> {
  const { data, error } = await supabaseAdmin().from(TABLE_PROSPECTS).select(COLONNES)
    .order("envoye_le", { ascending: false, nullsFirst: false }).order("cree_le", { ascending: false }).limit(5000);
  if (error) throw new ErreurProspection(error.message, tableAbsente(error));
  const prospects: Prospect[] = ((data ?? []) as Ligne[])
    .filter((l) => estStatut(l.statut) && estCible(l.cible))
    .map((l) => ({
      id: l.id, email: l.email, entreprise: l.entreprise, contact: l.contact, cible: l.cible as Prospect["cible"], metier: l.metier, commune: l.commune, ville: l.ville,
      lot: l.lot, envoyeLe: l.envoye_le, relanceLe: l.relance_le, reponseLe: l.reponse_le, statut: l.statut as Prospect["statut"], note: l.note, majLe: l.maj_le,
    }));
  return resumerProspection(prospects, maintenant);
}

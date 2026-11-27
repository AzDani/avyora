import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enParis, instantParis } from "@/lib/admin/gestion";
import type { AppelsMois, ReleveClaude } from "@/lib/bureaux/claude";

/**
 * La salle Claude Code (27/11/2026) : les lectures. Tables de la migration 0018 ; tant qu'elle n'est pas appliquée, les
 * lectures échouent et la salle le dit (« migration 0018 à appliquer »).
 */
export const TABLE_RELEVES = "admin_claude_releves";
export const TABLE_APPELS = "admin_agents_appels";

type LigneReleve = { releve_le: string; cinq_heures: number | null; cinq_heures_fin: string | null; semaine: number | null; semaine_fin: string | null; semaine_fable: number | null; semaine_fable_fin: string | null };
const num = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Le dernier relevé des limites de Claude Code ; null s'il n'y en a encore aucun. Lève si la table n'existe pas. */
export async function dernierReleve(): Promise<ReleveClaude | null> {
  const { data, error } = await supabaseAdmin().from(TABLE_RELEVES).select("releve_le, cinq_heures, cinq_heures_fin, semaine, semaine_fin, semaine_fable, semaine_fable_fin").order("releve_le", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const r = (data?.[0] ?? null) as LigneReleve | null;
  return r && { releveLe: r.releve_le, cinqHeures: num(r.cinq_heures), cinqHeuresFin: r.cinq_heures_fin, semaine: num(r.semaine), semaineFin: r.semaine_fin, semaineFable: num(r.semaine_fable), semaineFableFin: r.semaine_fable_fin };
}

/** Le début du mois en cours, en heure de France. */
export function debutDuMois(maintenant: Date): Date {
  const p = enParis(maintenant);
  return instantParis(p.y, p.m, 1, 0, 0);
}

/** Les appels des agents depuis le début du mois : nombre, coût, et nombre par tâche. Lève si la table n'existe pas. */
export async function appelsDuMois(maintenant: Date): Promise<AppelsMois> {
  const { data, error } = await supabaseAdmin().from(TABLE_APPELS).select("tache, cout_micro").gte("le", debutDuMois(maintenant).toISOString()).limit(5000);
  if (error) throw new Error(error.message);
  const a: AppelsMois = { nb: 0, coutMicro: 0, sansTarif: 0, parTache: {} };
  for (const l of (data ?? []) as { tache: string; cout_micro: number | null }[]) {
    a.nb++; a.parTache[l.tache] = (a.parTache[l.tache] ?? 0) + 1;
    if (l.cout_micro == null) a.sansTarif++; else a.coutMicro += Number(l.cout_micro);
  }
  return a;
}

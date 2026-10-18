import { supabaseServer } from "@/lib/supabase/server";
import type { Depense } from "@/lib/estimateur/budget-reel";

/**
 * Couche d'accès « dépenses réelles » (module M5) — table `expenses` (migration 0001), scopée par la
 * RLS `expenses_access` (propriétaire ou membre du projet). Aucune clé de service ici.
 */

type Ligne = { id: string; corps_etat: string; libelle: string; montant: number; created_at: string };

const versDepense = (l: Ligne): Depense => ({ id: l.id, corps: l.corps_etat, libelle: l.libelle, montant: Number(l.montant) || 0, date: l.created_at });

/** Les dépenses d'un projet, de la plus récente à la plus ancienne. Une panne rend une liste vide. */
export async function listDepenses(projectId: string): Promise<Depense[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("expenses")
    .select("id, corps_etat, libelle, montant, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as Ligne[]).map(versDepense);
}

export async function ajouterDepense(projectId: string, d: { corps: string; libelle: string; montant: number }): Promise<Depense | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("expenses")
    .insert({ project_id: projectId, corps_etat: d.corps, libelle: d.libelle, montant: Math.round(d.montant * 100) / 100 })
    .select("id, corps_etat, libelle, montant, created_at")
    .single();
  if (error || !data) return null;
  return versDepense(data as Ligne);
}

/** Supprime une dépense du projet (la RLS refuse celle d'un autre). true si une ligne est partie. */
export async function supprimerDepense(projectId: string, depenseId: string): Promise<boolean> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("expenses").delete().eq("id", depenseId).eq("project_id", projectId).select("id");
  return !error && (data ?? []).length > 0;
}

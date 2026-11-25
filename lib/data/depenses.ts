import { supabaseServer } from "@/lib/supabase/server";
import { TAUX_DEPENSE, type Depense, type NatureDepense, type TauxDepense } from "@/lib/estimateur/budget-reel";

/**
 * Couche d'accès « dépenses réelles » (module M5) — table `expenses` (migration 0001), scopée par la
 * RLS `expenses_access` (propriétaire ou membre du projet). Aucune clé de service ici.
 */

type Ligne = { id: string; corps_etat: string; libelle: string; montant: number; created_at: string; nature?: string | null; tva?: number | string | null; taux_tva?: string | null };

const COLONNES = "id, corps_etat, libelle, montant, created_at";
/** La colonne `nature` (migration 0010) n'existe pas encore : 42703 (Postgres) ou PGRST204 (PostgREST). */
const sansColonneNature = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /nature/.test(e.message ?? ""));
const nature = (n: unknown): NatureDepense => (n === "mo" || n === "mat" ? n : "fp");
/** Les colonnes `tva` / `taux_tva` (migration 0011) n'existent pas encore. */
const sansColonneTva = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /tva/.test(e.message ?? ""));
const tauxDe = (t: unknown): TauxDepense | null => (TAUX_DEPENSE.includes(t as TauxDepense) ? (t as TauxDepense) : null);

/** Plafond de dépenses par projet : bien au-delà d'un vrai chantier, il borne la table pendant la bêta. */
export const MAX_DEPENSES = 500;

const versDepense = (l: Ligne): Depense => ({
  id: l.id, corps: l.corps_etat, libelle: l.libelle, montant: Number(l.montant) || 0, date: l.created_at, nature: nature(l.nature),
  ...(l.tva != null && Number.isFinite(Number(l.tva)) ? { tva: Number(l.tva), taux: tauxDe(l.taux_tva) ?? "multi" } : {}),
});

/** Les dépenses d'un projet, de la plus récente à la plus ancienne. Une panne rend une liste vide. */
export async function listDepenses(projectId: string): Promise<Depense[]> {
  const sb = await supabaseServer();
  const lire = (colonnes: string) =>
    sb.from("expenses").select(colonnes).eq("project_id", projectId).order("created_at", { ascending: false }).limit(MAX_DEPENSES);
  let { data, error } = await lire(`${COLONNES}, nature, tva, taux_tva`);
  if (sansColonneTva(error)) ({ data, error } = await lire(`${COLONNES}, nature`));
  if (sansColonneNature(error)) ({ data, error } = await lire(COLONNES));
  if (error) return [];
  return ((data ?? []) as unknown as Ligne[]).map(versDepense);
}

/** Nombre de dépenses d'un projet (pour le plafond). */
export async function compterDepenses(projectId: string): Promise<number> {
  const sb = await supabaseServer();
  const { count } = await sb.from("expenses").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  return count ?? 0;
}

export async function ajouterDepense(projectId: string, d: { corps: string; libelle: string; montant: number; nature?: NatureDepense; tva?: number | null; taux?: TauxDepense | null }): Promise<Depense | null> {
  const sb = await supabaseServer();
  const ligne = { project_id: projectId, corps_etat: d.corps, libelle: d.libelle, montant: Math.round(d.montant * 100) / 100 };
  const avecTva = d.tva != null && d.taux ? { tva: Math.round(d.tva * 100) / 100, taux_tva: d.taux } : {};
  let { data, error } = await sb.from("expenses").insert({ ...ligne, nature: nature(d.nature), ...avecTva }).select(`${COLONNES}, nature, tva, taux_tva`).single();
  // Migration 0011 pas encore appliquée : la dépense est gardée avec sa nature, sans sa TVA.
  if (sansColonneTva(error)) ({ data, error } = await sb.from("expenses").insert({ ...ligne, nature: nature(d.nature) }).select(`${COLONNES}, nature`).single());
  // Migration 0010 pas encore appliquée : la dépense est gardée, sans sa nature (elle compte en fourni-posé).
  if (sansColonneNature(error)) ({ data, error } = await sb.from("expenses").insert(ligne).select(COLONNES).single());
  if (error || !data) return null;
  return versDepense(data as unknown as Ligne);
}

/** Supprime une dépense du projet (la RLS refuse celle d'un autre). true si une ligne est partie. */
export async function supprimerDepense(projectId: string, depenseId: string): Promise<boolean> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("expenses").delete().eq("id", depenseId).eq("project_id", projectId).select("id");
  return !error && (data ?? []).length > 0;
}

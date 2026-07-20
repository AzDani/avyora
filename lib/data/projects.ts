import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import type { Reponses } from "@/lib/estimation";
import type { PieceRow } from "@/lib/metre";
import type { ExpenseRow, TaskRow } from "@/lib/budget";

/**
 * Couche d'accès « projets » — Supabase, scopée par utilisateur via la RLS
 * (supabaseServer = session cookie → auth.uid()). Les tables enfant héritent de la
 * tenancy via project_id (policy peut_acceder_projet). Remplace l'accès SQLite direct.
 */

export type Projet = {
  id: string;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  reponses: Reponses;
  archived: boolean;
  created_at: string;
};

// ── Projets ──
export async function listProjets(archived: boolean): Promise<Projet[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("projects")
    .select("id, nom, type_bien, surface, code_postal, reponses, archived, created_at")
    .eq("archived", archived)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Projet[];
}

export async function getProjet(id: string): Promise<Projet | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("projects")
    .select("id, nom, type_bien, surface, code_postal, reponses, archived, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Projet) ?? null;
}

export async function createProjet(input: {
  nom: string;
  typeBien?: string;
  surface: number;
  codePostal: string;
  reponses: unknown;
}): Promise<string | null> {
  const user = await getUser();
  if (!user) return null; // funnel anonyme = rattachement à l'inscription (étape 7)
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("projects")
    .insert({
      owner_id: user.id,
      nom: input.nom,
      type_bien: input.typeBien ?? "appartement",
      surface: Number(input.surface),
      code_postal: String(input.codePostal),
      reponses: input.reponses ?? {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateProjet(
  id: string,
  patch: { nom: string; typeBien?: string; surface: number; codePostal: string; reponses: unknown }
): Promise<void> {
  const sb = await supabaseServer();
  const { error } = await sb
    .from("projects")
    .update({
      nom: String(patch.nom).trim(),
      type_bien: patch.typeBien ?? "appartement",
      surface: Number(patch.surface),
      code_postal: String(patch.codePostal),
      reponses: patch.reponses ?? {},
      derniere_activite_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const sb = await supabaseServer();
  const { error } = await sb
    .from("projects")
    .update({ archived, statut: archived ? "archive" : "en_cours" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProjet(id: string): Promise<void> {
  const sb = await supabaseServer();
  // Les enfants tombent par ON DELETE CASCADE (FK Postgres).
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Pièces (métré) ──
export async function getPieces(projectId: string): Promise<PieceRow[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("rooms").select("*").eq("project_id", projectId).order("created_at");
  return (data ?? []).map(toPiece);
}

function toPiece(r: Record<string, unknown>): PieceRow {
  return {
    id: r.id as string,
    nom: r.nom as string,
    type_piece: r.type_piece as PieceRow["type_piece"],
    longueur: r.longueur as number,
    largeur: r.largeur as number,
    hauteur: r.hauteur as number,
    portes: r.portes as number,
    fenetres: r.fenetres as number,
    carrelage_sol: r.carrelage_sol ? 1 : 0,
    faience: r.faience ? 1 : 0,
  };
}

export async function addPiece(projectId: string, p: {
  nom: string; typePiece?: string; longueur: number; largeur: number; hauteur?: number;
  portes?: number; fenetres?: number; carrelageSol?: boolean; faience?: boolean;
}): Promise<string> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("rooms").insert({
    project_id: projectId, nom: String(p.nom).trim(), type_piece: p.typePiece ?? "autre",
    longueur: Number(p.longueur), largeur: Number(p.largeur), hauteur: Number(p.hauteur) || 2.5,
    portes: Math.max(0, Math.round(Number(p.portes) ?? 1)), fenetres: Math.max(0, Math.round(Number(p.fenetres) ?? 0)),
    carrelage_sol: !!p.carrelageSol, faience: !!p.faience,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updatePiece(projectId: string, pieceId: string, p: {
  nom: string; typePiece?: string; longueur: number; largeur: number; hauteur?: number;
  portes?: number; fenetres?: number; carrelageSol?: boolean; faience?: boolean;
}): Promise<void> {
  const sb = await supabaseServer();
  const { error } = await sb.from("rooms").update({
    nom: String(p.nom).trim(), type_piece: p.typePiece ?? "autre",
    longueur: Number(p.longueur), largeur: Number(p.largeur), hauteur: Number(p.hauteur) || 2.5,
    portes: Math.max(0, Math.round(Number(p.portes) ?? 1)), fenetres: Math.max(0, Math.round(Number(p.fenetres) ?? 0)),
    carrelage_sol: !!p.carrelageSol, faience: !!p.faience,
  }).eq("id", pieceId).eq("project_id", projectId);
  if (error) throw new Error(error.message);
}

export async function deletePiece(projectId: string, pieceId: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("rooms").delete().eq("id", pieceId).eq("project_id", projectId);
}
export async function deleteAllPieces(projectId: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("rooms").delete().eq("project_id", projectId);
}
export async function replacePieces(projectId: string, pieces: Array<{
  nom: string; type_piece: string; longueur: number; largeur: number; hauteur: number;
  portes: number; fenetres: number; carrelage_sol: boolean; faience: boolean;
}>): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("rooms").delete().eq("project_id", projectId);
  if (pieces.length)
    await sb.from("rooms").insert(pieces.map((p) => ({ project_id: projectId, ...p })));
}

// ── Devis ──
export async function countDevis(projectId: string): Promise<number> {
  const sb = await supabaseServer();
  const { count } = await sb.from("quotes").select("*", { count: "exact", head: true }).eq("project_id", projectId);
  return count ?? 0;
}
export async function listDevis(projectId: string): Promise<{ id: string; nom: string; note: number | null; created_at: string }[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("quotes").select("id, nom, note, created_at").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []) as { id: string; nom: string; note: number | null; created_at: string }[];
}
export async function getDevisDetail(projectId: string, devisId: string): Promise<{ nom: string; analyse: unknown } | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("quotes").select("nom, analyse_json").eq("id", devisId).eq("project_id", projectId).maybeSingle();
  if (!data) return null;
  return { nom: data.nom as string, analyse: data.analyse_json };
}
export async function addDevis(projectId: string, q: { nom: string; fichier: string | null; texte: string; analyse: unknown; note: number | null }): Promise<string> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("quotes").insert({
    project_id: projectId, nom: q.nom, fichier: q.fichier, texte: q.texte, analyse_json: q.analyse, note: q.note,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

// ── Documents ──
export async function listDocuments(projectId: string): Promise<{ id: string; type: string; nom: string; note_ia: string | null; created_at: string }[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("documents").select("id, type, nom, note_ia, created_at").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []) as { id: string; type: string; nom: string; note_ia: string | null; created_at: string }[];
}
export async function getDocument(projectId: string, docId: string): Promise<{ id: string; type: string; fichier: string } | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("documents").select("id, type, fichier").eq("id", docId).eq("project_id", projectId).maybeSingle();
  return (data as { id: string; type: string; fichier: string }) ?? null;
}
export async function addDocument(projectId: string, d: { type: string; fichier: string; nom: string }): Promise<string> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("documents").insert({ project_id: projectId, type: d.type, fichier: d.fichier, nom: d.nom }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
export async function setDocumentNote(docId: string, note: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("documents").update({ note_ia: note }).eq("id", docId);
}
export async function deleteDocument(projectId: string, docId: string): Promise<{ fichier: string } | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("documents").select("fichier").eq("id", docId).eq("project_id", projectId).maybeSingle();
  await sb.from("documents").delete().eq("id", docId).eq("project_id", projectId);
  return (data as { fichier: string }) ?? null;
}

// ── Dépenses ──
export async function listDepenses(projectId: string): Promise<ExpenseRow[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("expenses").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []) as ExpenseRow[];
}
export async function addDepense(projectId: string, e: { corpsEtat: string; libelle: string; montant: number }): Promise<string> {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("expenses").insert({ project_id: projectId, corps_etat: e.corpsEtat, libelle: String(e.libelle).trim(), montant: Number(e.montant) }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
export async function deleteDepense(projectId: string, depId: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("expenses").delete().eq("id", depId).eq("project_id", projectId);
}

// ── Tâches (chantier) ──
export async function listTaches(projectId: string): Promise<TaskRow[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("tasks").select("*").eq("project_id", projectId).order("ordre").order("created_at");
  return (data ?? []) as TaskRow[];
}
export async function countTaches(projectId: string): Promise<number> {
  const sb = await supabaseServer();
  const { count } = await sb.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", projectId);
  return count ?? 0;
}
export async function insertTaches(projectId: string, taches: { corps_etat: string; titre: string; ordre: number }[]): Promise<number> {
  if (!taches.length) return 0;
  const sb = await supabaseServer();
  const { error } = await sb.from("tasks").insert(taches.map((t) => ({ project_id: projectId, ...t })));
  if (error) throw new Error(error.message);
  return taches.length;
}
export async function setTacheStatut(projectId: string, taskId: string, statut: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("tasks").update({ statut }).eq("id", taskId).eq("project_id", projectId);
}

// ── Scénarios (rentabilité) ──
export async function dernierScenarioParams(projectId: string): Promise<unknown | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("scenarios").select("params").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.params ?? null;
}
export async function addScenario(projectId: string, params: unknown, resultats: unknown): Promise<void> {
  const sb = await supabaseServer();
  const { error } = await sb.from("scenarios").insert({ project_id: projectId, params, resultats });
  if (error) throw new Error(error.message);
}

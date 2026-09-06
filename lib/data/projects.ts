import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

/**
 * Couche d'accès « projets » — Supabase, scopée par utilisateur via la RLS
 * (supabaseServer = session cookie → auth.uid()). Estimateur uniquement : CRUD projet.
 */

export type Projet = {
  id: string;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  reponses: Record<string, unknown>;
  archived: boolean;
  created_at: string;
};

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
  if (!user) return null; // funnel anonyme = rattachement à l'inscription
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

/** Renommage seul (n'altère pas l'estimation). */
export async function renameProjet(id: string, nom: string): Promise<void> {
  const sb = await supabaseServer();
  const { error } = await sb
    .from("projects")
    .update({ nom: String(nom).trim(), derniere_activite_at: new Date().toISOString() })
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

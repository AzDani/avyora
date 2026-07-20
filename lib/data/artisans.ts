import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

/** Carnet artisans — personnel (owner_id), scopé RLS via supabaseServer. */
export type Artisan = {
  id: string; nom: string; corps_etat: string;
  telephone: string | null; email: string | null; ville: string | null; note: string | null;
};

export async function listArtisans(): Promise<Artisan[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("artisans").select("*").order("corps_etat").order("nom");
  return (data ?? []) as Artisan[];
}

export async function createArtisan(a: {
  nom: string; corpsEtat?: string; telephone?: string; email?: string; ville?: string; note?: string;
}): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const sb = await supabaseServer();
  const { data, error } = await sb.from("artisans").insert({
    owner_id: user.id, nom: String(a.nom).trim(), corps_etat: a.corpsEtat ?? "divers",
    telephone: a.telephone?.trim() || null, email: a.email?.trim() || null,
    ville: a.ville?.trim() || null, note: a.note?.trim() || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteArtisan(id: string): Promise<void> {
  const sb = await supabaseServer();
  await sb.from("artisans").delete().eq("id", id);
}

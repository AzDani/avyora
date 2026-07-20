import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Fichiers de projet (devis, plans, photos) dans Supabase Storage (bucket privé `projets`).
 * Opérations serveur uniquement (service_role) — le contrôle d'accès se fait au niveau des
 * lignes documents/quotes (RLS). Les fichiers ne sont jamais servis directement au navigateur,
 * seulement relus côté serveur par l'analyse IA (lib/vision).
 */
const BUCKET = "projets";

/** Chemin objet convention : <projectId>/<horodatage>-<nom nettoyé>. */
export function cheminFichier(projectId: string, nom: string): string {
  return `${projectId}/${Date.now()}-${nom.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

export async function uploadFichier(chemin: string, data: ArrayBuffer, contentType?: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(chemin, data, {
    contentType: contentType || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function telechargerBase64(chemin: string): Promise<string> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(chemin);
  if (error || !data) throw new Error(error?.message || "fichier introuvable");
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}

export async function supprimerFichier(chemin: string): Promise<void> {
  await supabaseAdmin().storage.from(BUCKET).remove([chemin]);
}

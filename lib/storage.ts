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

/**
 * Détecte le VRAI type d'un fichier par sa signature binaire (magic bytes) — indépendamment
 * de son extension/du Content-Type déclaré. null = type non autorisé (à rejeter).
 */
export function detecterTypeFichier(data: ArrayBuffer): "pdf" | "jpeg" | "png" | "webp" | "gif" | null {
  const b = new Uint8Array(data.slice(0, 16));
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf"; // %PDF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp"; // RIFF..WEBP
  return null;
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

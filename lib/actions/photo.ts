"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { verifierLimite } from "@/lib/ratelimit";
import { TABLE_ARTISANS } from "@/lib/data/reseau";
import { BUCKET_PHOTOS, TAILLE_MAX_PHOTO, cheminPhotoValide } from "@/lib/compte/photo";

/**
 * La photo de profil (décision de Dani du 26/11/2026, migration 0014). Le navigateur recadre et réencode la photo
 * (lib/reseau/image.ts › preparerPortrait), demande ici une URL d'envoi signée pour un chemin choisi par le serveur
 * (`<compte>/<uuid>.jpg`), envoie le fichier, puis fait enregistrer le chemin : dans `app_metadata.photo` (le serveur
 * seul l'écrit) et, pour un artisan, dans `reseau_artisans.photo`. L'ancienne photo est supprimée du stockage.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = "Ta session a expiré : reconnecte-toi.";
const RESSAIE = "Réessaie dans un instant.";

/** Une URL d'envoi signée pour la nouvelle photo du compte connecté. JPEG seulement (le navigateur l'a réencodée). */
export async function preparerPhotoProfil(f: { taille?: unknown; mime?: unknown }): Promise<{ ok: true; chemin: string; jeton: string } | { ok: false; erreur: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: SESSION };
  if (f?.mime !== "image/jpeg") return { ok: false, erreur: "Choisis une photo (JPEG, PNG ou WebP)." };
  if (!(typeof f.taille === "number" && f.taille > 0 && f.taille <= TAILLE_MAX_PHOTO)) return { ok: false, erreur: "Cette photo est trop lourde : essaie une autre image." };
  if (!(await verifierLimite("artisanFichier", `photo:${user.id}`))) return { ok: false, erreur: "Trop d'envois : réessaie dans une heure." };
  const chemin = `${user.id}/${randomUUID()}.jpg`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_PHOTOS).createSignedUploadUrl(chemin);
  if (error || !data) return { ok: false, erreur: RESSAIE };
  return { ok: true, chemin: data.path, jeton: data.token };
}

/** Le chemin a-t-il bien été envoyé, dans le dossier du compte ? */
async function presente(userId: string, chemin: string): Promise<boolean> {
  const nom = chemin.slice(chemin.indexOf("/") + 1);
  const { data } = await supabaseAdmin().storage.from(BUCKET_PHOTOS).list(userId, { limit: 100, search: nom });
  return (data ?? []).some((o) => o.name === nom);
}

/** Les fichiers du dossier d'un compte, sauf `garder`. */
async function autresFichiers(userId: string, garder?: string): Promise<string[]> {
  const { data } = await supabaseAdmin().storage.from(BUCKET_PHOTOS).list(userId, { limit: 100 });
  return (data ?? []).map((o) => `${userId}/${o.name}`).filter((c) => c !== garder);
}

/** Écrit (ou efface) la photo d'un compte : app_metadata, puis la copie de l'artisan s'il en a un. */
async function ecrire(userId: string, chemin: string | null): Promise<boolean> {
  const sb = supabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(userId, { app_metadata: { photo: chemin } });
  if (error) return false;
  await sb.from(TABLE_ARTISANS).update({ photo: chemin }).eq("user_id", userId);
  return true;
}

function rafraichir() {
  revalidatePath("/", "layout");
}

/** Enregistre la photo envoyée comme photo du compte, et supprime les précédentes. */
export async function enregistrerPhotoProfil(chemin: unknown): Promise<{ ok: boolean; erreur?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: SESSION };
  if (!cheminPhotoValide(chemin, user.id)) return { ok: false, erreur: "Envoi invalide : recommence." };
  if (!(await presente(user.id, chemin))) return { ok: false, erreur: "La photo n'est pas arrivée : recommence." };
  if (!(await ecrire(user.id, chemin))) return { ok: false, erreur: RESSAIE };
  const anciennes = await autresFichiers(user.id, chemin);
  if (anciennes.length) await supabaseAdmin().storage.from(BUCKET_PHOTOS).remove(anciennes);
  await journaliser("action_admin", { userId: user.id, payload: { action: "photo_profil" } });
  rafraichir();
  return { ok: true };
}

/** Retire la photo du compte connecté (fichiers compris). */
export async function retirerPhotoProfil(): Promise<{ ok: boolean; erreur?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: SESSION };
  if (!(await ecrire(user.id, null))) return { ok: false, erreur: RESSAIE };
  const fichiers = await autresFichiers(user.id);
  if (fichiers.length) await supabaseAdmin().storage.from(BUCKET_PHOTOS).remove(fichiers);
  rafraichir();
  return { ok: true };
}

/** L'admin retire la photo d'un artisan (inadaptée) : du compte, de sa fiche et du stockage. */
export async function retirerPhotoArtisan(artisanId: string): Promise<{ ok: boolean; erreur?: string }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, erreur: "Réservé à l'admin." };
  if (typeof artisanId !== "string" || !UUID.test(artisanId)) return { ok: false, erreur: "Demande invalide." };
  const { data } = await supabaseAdmin().from(TABLE_ARTISANS).select("user_id").eq("id", artisanId).maybeSingle();
  if (!data?.user_id) return { ok: false, erreur: "Artisan introuvable." };
  const userId = String(data.user_id);
  if (!(await ecrire(userId, null))) return { ok: false, erreur: RESSAIE };
  const fichiers = await autresFichiers(userId);
  if (fichiers.length) await supabaseAdmin().storage.from(BUCKET_PHOTOS).remove(fichiers);
  await journaliser("action_admin", { userId: admin.id, payload: { action: "artisan_photo_retiree", artisan: artisanId } });
  rafraichir();
  return { ok: true };
}

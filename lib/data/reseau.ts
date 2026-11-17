import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUCKET_ARTISANS } from "@/lib/reseau/candidature";
import { COLONNES_ARTISAN, lireArtisan, lireDocument, type Artisan, type DocumentArtisan } from "@/lib/reseau/artisan";

/**
 * Lectures du Réseau AVYORA (tables `reseau_artisans` et `reseau_documents`, migration 0007 ; à ne pas confondre avec
 * `artisans`, le carnet personnel de 0001). Clé service_role : les tables n'ont AUCUNE policy. Chaque appelant vérifie
 * d'abord la session (l'artisan ne lit que sa ligne : `userId` vient de getUser(), jamais du navigateur) ou le droit
 * admin (pages /admin, gardées par le layout et le proxy).
 */
export const TABLE_ARTISANS = "reseau_artisans";
export const TABLE_DOCUMENTS = "reseau_documents";
export { BUCKET_ARTISANS } from "@/lib/reseau/candidature";

/**
 * La candidature d'un compte, ou null s'il n'en a pas. Une lecture qui ÉCHOUE lève une erreur au lieu de répondre
 * null : sinon un artisan déjà validé, le temps d'une panne, passerait pour un nouveau venu et pourrait renvoyer une
 * candidature par-dessus la sienne.
 */
export async function candidatureDe(userId: string): Promise<Artisan | null> {
  const { data, error } = await supabaseAdmin().from(TABLE_ARTISANS).select(COLONNES_ARTISAN).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? lireArtisan(data as Record<string, unknown>) : null;
}

/** Les documents déposés par un compte, les plus anciens d'abord. */
export async function documentsDe(userId: string): Promise<DocumentArtisan[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE_DOCUMENTS)
    .select("id, type, chemin, nom, taille, mime, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(lireDocument);
}

/** URL signées (10 minutes) pour ouvrir des fichiers du stockage privé ; chemin → URL. */
export async function urlsSignees(chemins: string[]): Promise<Map<string, string>> {
  if (!chemins.length) return new Map();
  const { data } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).createSignedUrls(chemins, 600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}

export type ArtisanListe = Artisan & { nbPhotos: number; nbDecennales: number };

/** Toutes les candidatures (admin), les plus récentes d'abord, avec le compte de leurs documents. Mémorisée le temps d'une requête. */
export const listArtisansAdmin = cache(async (): Promise<ArtisanListe[]> => {
  const sb = supabaseAdmin();
  const [{ data, error }, docs] = await Promise.all([
    sb.from(TABLE_ARTISANS).select(COLONNES_ARTISAN).order("soumise_le", { ascending: false }).limit(1000),
    sb.from(TABLE_DOCUMENTS).select("user_id, type").limit(20000),
  ]);
  if (error) throw new Error(error.message);
  const compte = new Map<string, { photo: number; decennale: number }>();
  for (const d of (docs.data ?? []) as { user_id: string; type: string }[]) {
    const c = compte.get(d.user_id) ?? { photo: 0, decennale: 0 };
    if (d.type === "photo") c.photo++;
    if (d.type === "decennale") c.decennale++;
    compte.set(d.user_id, c);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const a = lireArtisan(r);
    const c = compte.get(a.userId);
    return { ...a, nbPhotos: c?.photo ?? 0, nbDecennales: c?.decennale ?? 0 };
  });
});

/** Une candidature (admin) avec ses documents, chacun avec une URL signée pour l'ouvrir. */
export async function getArtisanAdmin(id: string): Promise<{ artisan: Artisan; documents: (DocumentArtisan & { url: string | null })[] } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data } = await supabaseAdmin().from(TABLE_ARTISANS).select(COLONNES_ARTISAN).eq("id", id).maybeSingle();
  if (!data) return null;
  const artisan = lireArtisan(data as Record<string, unknown>);
  const docs = await documentsDe(artisan.userId);
  const urls = await urlsSignees(docs.map((d) => d.chemin));
  return { artisan, documents: docs.map((d) => ({ ...d, url: urls.get(d.chemin) ?? null })) };
}

/**
 * Vide le dossier d'un compte dans le stockage privé (attestations, photos). La suppression du compte efface les lignes
 * en cascade, pas les fichiers : appelée AVANT (lib/actions/compte.ts), comme le promet la politique de confidentialité.
 */
export async function supprimerFichiersArtisan(userId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return;
  const st = supabaseAdmin().storage.from(BUCKET_ARTISANS);
  for (const type of ["decennale", "rc_pro", "photo"]) {
    const { data } = await st.list(`${userId}/${type}`, { limit: 1000 });
    const chemins = (data ?? []).filter((o) => o.name).map((o) => `${userId}/${type}/${o.name}`);
    if (chemins.length) await st.remove(chemins);
  }
}

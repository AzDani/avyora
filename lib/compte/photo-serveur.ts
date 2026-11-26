import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUCKET_PHOTOS } from "@/lib/compte/photo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * À la suppression d'un compte : son dossier de photos de profil (le stockage ne part pas en cascade). Hors des actions
 * serveur exprès (une action exportée serait appelable depuis le navigateur, avec n'importe quel compte). Ne lève jamais.
 */
export async function supprimerPhotosCompte(userId: string): Promise<void> {
  if (!UUID.test(userId)) return;
  try {
    const { data } = await supabaseAdmin().storage.from(BUCKET_PHOTOS).list(userId, { limit: 100 });
    const fichiers = (data ?? []).map((o) => `${userId}/${o.name}`);
    if (fichiers.length) await supabaseAdmin().storage.from(BUCKET_PHOTOS).remove(fichiers);
  } catch {
    /* un dossier introuvable ou une panne ne bloque pas la suppression du compte */
  }
}

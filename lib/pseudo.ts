import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unicité du pseudo public (lib/actions/username.ts). Hors du fichier « use server » : toute fonction exportée
 * d'un fichier d'actions devient appelable depuis le navigateur.
 */

/** Taille d'une page de l'API admin (son maximum) ; borne de pages par sécurité (100 000 comptes). */
const PAR_PAGE = 1000;
const PAGES_MAX = 100;

/** Le client service-role, réduit à ce que la recherche utilise (testable sans Supabase). */
type Admin = Pick<SupabaseClient, "auth">;

/**
 * Un AUTRE compte porte-t-il déjà ce pseudo (en minuscules) ? Parcourt TOUTES les pages de l'API admin : la
 * première page seule laissait passer un doublon au-delà de 1 000 inscrits. `null` = panne (on ne conclut pas).
 */
export async function pseudoPris(admin: Admin, userId: string, lc: string): Promise<boolean | null> {
  for (let page = 1; page <= PAGES_MAX; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAR_PAGE });
    if (error) return null;
    const users = data?.users ?? [];
    const pris = users.some(
      (u) => u.id !== userId && String((u.user_metadata as { username?: string } | undefined)?.username ?? "").toLowerCase() === lc,
    );
    if (pris) return true;
    if (users.length < PAR_PAGE) return false;
  }
  return null;
}

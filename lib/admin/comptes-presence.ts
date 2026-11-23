import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CompteVu = { email: string; username: string };

/**
 * Pseudo et e-mail des membres vus par le compteur de présence (en ligne, ou passés aujourd'hui), pour l'admin seul.
 * Une lecture par membre : au-delà de `max`, les suivants restent comptés mais sans nom.
 */
export async function comptesMembres(ids: string[], max: number): Promise<Map<string, CompteVu>> {
  const uniques = [...new Set(ids)].slice(0, max);
  const comptes = new Map<string, CompteVu>();
  if (!uniques.length) return comptes;
  const admin = supabaseAdmin();
  await Promise.all(
    uniques.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const u = data?.user;
      if (u) comptes.set(id, { email: u.email ?? "", username: String(u.user_metadata?.username ?? "") });
    }),
  );
  return comptes;
}

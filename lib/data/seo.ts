import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resumerSeo, type ReleveGsc, type ReleveSante, type ResumeSeo } from "@/lib/seo/resume";

/**
 * L'Agent SEO (28/11/2026) : la lecture des relevés et du dernier rapport (migration 0020). Tant que la migration n'est pas
 * appliquée, la lecture lève une ErreurSeo avec `migrationAbsente`. Lecture seule : le site ne parle jamais à Google.
 */
export class ErreurSeo extends Error {
  readonly migrationAbsente: boolean;
  constructor(message: string, migrationAbsente: boolean) { super(message); this.migrationAbsente = migrationAbsente; }
}
const tableAbsente = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(e.message ?? "");

export async function lireSeo(): Promise<ResumeSeo> {
  const sb = supabaseAdmin();
  const dernier = (sorte: "gsc" | "sante") => sb.from("admin_seo_releves").select("jour, donnees").eq("sorte", sorte).order("jour", { ascending: false }).limit(1).maybeSingle();
  const [g, s, r] = await Promise.all([
    dernier("gsc"), dernier("sante"),
    sb.from("admin_seo_rapports").select("id, jour, resume, points, statut").order("jour", { ascending: false }).order("cree_le", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const x of [g, s, r]) if (x.error) throw new ErreurSeo(x.error.message, tableAbsente(x.error));
  return resumerSeo(
    g.data as { jour: string; donnees: ReleveGsc } | null,
    s.data as { jour: string; donnees: ReleveSante } | null,
    r.data as { id: string; jour: string; resume: string; points: unknown; statut: string } | null,
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";

/**
 * L'Agent SEO (28/11/2026) : la seule écriture du site, réservée à l'admin. Daniel marque le rapport de l'agent comme lu
 * (il sort alors de ses priorités). Le « go » sur une proposition se donne à l'agent, pas ici : le site ne change rien seul.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function marquerRapportSeoLu(f: FormData): Promise<void> {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:seo" } });
    return;
  }
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) return;
  await supabaseAdmin().from("admin_seo_rapports").update({ statut: "lu" }).eq("id", id);
  revalidatePath("/admin/marketing");
}

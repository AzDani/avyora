"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { TYPE_DEMANDE_ACCOMPAGNEMENT } from "@/lib/data/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * « Marquer traitée » / « Remettre à traiter » sur une demande d'accompagnement (admin seulement).
 * La demande vit dans le journal : on y pose (ou retire) `traitee_le`, rien d'autre ne change. Seules les lignes de ce
 * type peuvent être touchées, quel que soit l'identifiant envoyé.
 */
export async function marquerDemandeTraitee(id: string, traitee: boolean): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:accompagnement" } });
    return { ok: false };
  }
  if (typeof id !== "string" || !UUID.test(id) || typeof traitee !== "boolean") return { ok: false };

  const sb = supabaseAdmin();
  const { data } = await sb.from("activity_log").select("payload").eq("id", id).eq("type", TYPE_DEMANDE_ACCOMPAGNEMENT).maybeSingle();
  if (!data) return { ok: false };
  const payload = { ...((data.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, unknown>) };
  if (traitee) payload.traitee_le = new Date().toISOString();
  else delete payload.traitee_le;

  const { error } = await sb.from("activity_log").update({ payload }).eq("id", id).eq("type", TYPE_DEMANDE_ACCOMPAGNEMENT);
  if (error) return { ok: false };

  await journaliser("action_admin", { userId: admin.id, payload: { action: traitee ? "accompagnement_traitee" : "accompagnement_a_traiter", demande: id } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

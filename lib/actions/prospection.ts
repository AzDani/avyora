"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { TABLE_PROSPECTS } from "@/lib/data/prospection";
import { NOMS_STATUTS, datesAPoser, estStatut, transition } from "@/lib/prospection/statuts";

/**
 * L'Agent Prospection (28/11/2026) : la seule écriture du site, réservée à l'admin. Daniel change le statut d'un prospect
 * (il a répondu, il est intéressé, rendez-vous pris, STOP…) et sa note. Mêmes règles que scripts/prospection.mjs :
 * après un STOP, plus jamais d'envoi. Rien n'est envoyé à personne d'ici.
 */
export type Retour = { ok: boolean; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function garde(): Promise<{ id: string } | null> {
  const admin = await getAdmin();
  if (admin) return admin;
  const user = await getUser();
  if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:marketing" } });
  return null;
}

export async function changerProspect(_: Retour | null, f: FormData): Promise<Retour> {
  const admin = await garde();
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  const id = String(f.get("id") ?? ""), statut = f.get("statut");
  const note = String(f.get("note") ?? "").trim().replace(/[ \t]+/g, " ").slice(0, 1000);
  if (!UUID.test(id)) return { ok: false, message: "Demande illisible." };
  if (!estStatut(statut)) return { ok: false, message: "Statut inconnu." };
  const t = supabaseAdmin().from(TABLE_PROSPECTS);
  const { data, error } = await t.select("statut, envoye_le, relance_le, reponse_le").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: "Pas enregistré : la migration 0019 est-elle appliquée ?" };
  if (!data) return { ok: false, message: "Prospect introuvable." };
  const ok = transition(data.statut, statut);
  if (!ok.ok) return { ok: false, message: ok.raison };
  const maintenant = new Date();
  const { error: e2 } = await supabaseAdmin().from(TABLE_PROSPECTS)
    .update({ statut, note: note || null, maj_le: maintenant.toISOString(), ...datesAPoser(statut, data, maintenant) }).eq("id", id);
  if (e2) return { ok: false, message: "Pas enregistré : réessaie." };
  await journaliser("action_admin", { userId: admin.id, payload: { action: "prospect_statut", prospect: id, avant: data.statut, statut } });
  revalidatePath("/admin/marketing");
  return { ok: true, message: `Enregistré : ${NOMS_STATUTS[statut]}.` };
}

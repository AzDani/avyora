"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { TABLE_RDV } from "@/lib/data/gestion";
import { envoyerCompteRendu, preparerFiche, redigerCompteRendu, type Resultat } from "@/lib/agents/travail";

/**
 * Les gestes de Daniel sur les agents Rappels et Agenda (27/11/2026), depuis le planning. Chaque action relit la garde
 * admin, puis délègue à lib/agents/travail.ts. L'envoi au client n'a lieu QUE sur le bouton « Envoyer au client ».
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

async function garde(id: unknown): Promise<{ id: string } | null> {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:agents" } });
    return null;
  }
  return typeof id === "string" && UUID.test(id) ? admin : null;
}
async function faire(id: unknown, action: string, travail: () => Promise<Resultat>): Promise<Resultat> {
  const admin = await garde(id);
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  let r: Resultat;
  try { r = await travail(); } catch (e) { r = { ok: false, message: e instanceof Error ? e.message : "Échec." }; }
  if (r.ok) { await journaliser("action_admin", { userId: admin.id, payload: { action, rdv: id } }); revalidatePath("/admin/planning"); revalidatePath("/admin", "layout"); }
  return r;
}
const ecrire = (id: string, champs: Record<string, unknown>, message: string) => async (): Promise<Resultat> => {
  const { error } = await supabaseAdmin().from(TABLE_RDV).update(champs).eq("id", id);
  return error ? { ok: false, message: "Pas enregistré : la migration 0017 est-elle appliquée ?" } : { ok: true, message };
};

export async function agentFiche(id: string): Promise<Resultat> { return faire(id, "agent_fiche", () => preparerFiche(id)); }
export async function agentCompteRendu(id: string): Promise<Resultat> { return faire(id, "agent_compte_rendu", () => redigerCompteRendu(id)); }
export async function agentEnvoyer(id: string): Promise<Resultat> { return faire(id, "agent_compte_rendu_envoye", () => envoyerCompteRendu(id)); }

export async function agentNotes(id: string, notes: string): Promise<Resultat> {
  const t = String(notes ?? "").slice(0, 60000);
  return faire(id, "agent_notes", ecrire(id, { notes: t.trim() ? t : null }, "Notes enregistrées."));
}
export async function agentTexteCompteRendu(id: string, texte: string): Promise<Resultat> {
  const t = String(texte ?? "").slice(0, 20000);
  return faire(id, "agent_compte_rendu_modifie", ecrire(id, { compte_rendu_texte: t.trim() ? t : null }, "Compte rendu enregistré."));
}
export async function agentEmail(id: string, email: string): Promise<Resultat> {
  const e = String(email ?? "").trim().toLowerCase();
  if (e && !EMAIL.test(e)) return { ok: false, message: "Adresse e-mail illisible." };
  return faire(id, "agent_email", ecrire(id, { email: e || null }, "Adresse enregistrée."));
}

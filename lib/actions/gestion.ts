"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { TABLE_CHARGES, TABLE_RDV } from "@/lib/data/gestion";
import { estCompteRendu, estModeRdv, estStatutRdv, estTypeRdv, lireDebut, lireMontant } from "@/lib/admin/gestion";

/**
 * Comptabilité et planning de l'admin (27/11/2026) : les écritures, réservées à l'admin. Chaque action relit la garde,
 * valide tout ce qui arrive du formulaire, et rend un message court (affiché sous le formulaire). Rien n'est envoyé au
 * client : un rendez-vous calé ici n'écrit à personne.
 */
export type Retour = { ok: boolean; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texte = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

async function garde(cible: string): Promise<{ id: string } | null> {
  const admin = await getAdmin();
  if (admin) return admin;
  const user = await getUser();
  if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible } });
  return null;
}
const fini = (chemin: string, message: string): Retour => { revalidatePath(chemin); revalidatePath("/admin", "layout"); return { ok: true, message }; };
const PAS_DE_TABLE = "Pas enregistré : la migration 0016 est-elle appliquée ?";

/* ─── Charges fixes ─────────────────────────────────────────────────────────── */

export async function ajouterCharge(_: Retour | null, f: FormData): Promise<Retour> {
  const admin = await garde("admin:compta");
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  const nom = texte(f.get("nom"), 80), centimes = lireMontant(f.get("montant")), devise = f.get("devise"), frequence = f.get("frequence");
  const echeance = String(f.get("echeance") ?? "");
  if (!nom) return { ok: false, message: "Donne un nom à la charge." };
  if (centimes == null) return { ok: false, message: "Montant illisible : écris par exemple 19,99." };
  if (devise !== "EUR" && devise !== "USD") return { ok: false, message: "Devise inconnue." };
  if (frequence !== "mois" && frequence !== "an") return { ok: false, message: "Fréquence inconnue." };
  if (echeance && !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return { ok: false, message: "Date d'échéance illisible." };
  const { error } = await supabaseAdmin().from(TABLE_CHARGES).insert({ nom, montant_centimes: centimes, devise, frequence, echeance: echeance || null });
  if (error) return { ok: false, message: PAS_DE_TABLE };
  await journaliser("action_admin", { userId: admin.id, payload: { action: "charge_ajoutee" } });
  return fini("/admin/compta", "Charge ajoutée.");
}

/** Mettre en pause (elle ne compte plus) ou réactiver une charge, ou la supprimer pour de bon. */
export async function changerCharge(id: string, action: "pause" | "reprendre" | "supprimer"): Promise<Retour> {
  const admin = await garde("admin:compta");
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  if (typeof id !== "string" || !UUID.test(id) || !["pause", "reprendre", "supprimer"].includes(action)) return { ok: false, message: "Demande illisible." };
  const t = supabaseAdmin().from(TABLE_CHARGES);
  const { error } = action === "supprimer" ? await t.delete().eq("id", id) : await t.update({ actif: action === "reprendre" }).eq("id", id);
  if (error) return { ok: false, message: PAS_DE_TABLE };
  await journaliser("action_admin", { userId: admin.id, payload: { action: `charge_${action}`, charge: id } });
  return fini("/admin/compta", action === "supprimer" ? "Charge supprimée." : action === "pause" ? "Charge en pause." : "Charge reprise.");
}

/* ─── Rendez-vous ───────────────────────────────────────────────────────────── */

export async function ajouterRendezVous(_: Retour | null, f: FormData): Promise<Retour> {
  const admin = await garde("admin:planning");
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  const debut = lireDebut(f.get("debut")), client = texte(f.get("client"), 80), sujet = texte(f.get("sujet"), 300);
  const type = f.get("type"), mode = f.get("mode"), duree = Number(f.get("duree") ?? 45), demande = String(f.get("demande") ?? "");
  if (!debut) return { ok: false, message: "Date et heure illisibles." };
  if (!client) return { ok: false, message: "Indique le nom du client." };
  if (!estTypeRdv(type) || !estModeRdv(mode)) return { ok: false, message: "Type ou mode inconnu." };
  if (!Number.isInteger(duree) || duree < 10 || duree > 240) return { ok: false, message: "Durée entre 10 et 240 minutes." };
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) return { ok: false, message: "Adresse e-mail illisible." };
  const ligne: Record<string, unknown> = {
    debut: debut.toISOString(), duree_min: duree, client, sujet: sujet || null, type, mode, statut: f.get("confirme") === "on" ? "confirme" : "a_confirmer",
    demande_id: UUID.test(demande) ? demande : null,
  };
  // Avec l'e-mail du client si la migration 0017 est appliquée ; sinon sans (le planning marche quand même).
  let { error } = await supabaseAdmin().from(TABLE_RDV).insert(email ? { ...ligne, email } : ligne);
  if (error && email) ({ error } = await supabaseAdmin().from(TABLE_RDV).insert(ligne));
  if (error) return { ok: false, message: PAS_DE_TABLE };
  await journaliser("action_admin", { userId: admin.id, payload: { action: "rdv_ajoute" } });
  return fini("/admin/planning", "Rendez-vous calé.");
}

/** Le statut d'un rendez-vous (confirmé, fait, annulé…) ou l'état de son compte rendu. */
export async function changerRendezVous(id: string, champ: "statut" | "compte_rendu", valeur: string): Promise<Retour> {
  const admin = await garde("admin:planning");
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, message: "Demande illisible." };
  if (!(champ === "statut" ? estStatutRdv(valeur) : champ === "compte_rendu" && estCompteRendu(valeur))) return { ok: false, message: "Valeur inconnue." };
  const { error } = await supabaseAdmin().from(TABLE_RDV).update({ [champ]: valeur }).eq("id", id);
  if (error) return { ok: false, message: PAS_DE_TABLE };
  await journaliser("action_admin", { userId: admin.id, payload: { action: `rdv_${champ}`, valeur, rdv: id } });
  return fini("/admin/planning", "Enregistré.");
}

export async function supprimerRendezVous(id: string): Promise<Retour> {
  const admin = await garde("admin:planning");
  if (!admin) return { ok: false, message: "Réservé à l'admin." };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, message: "Demande illisible." };
  const { error } = await supabaseAdmin().from(TABLE_RDV).delete().eq("id", id);
  if (error) return { ok: false, message: PAS_DE_TABLE };
  await journaliser("action_admin", { userId: admin.id, payload: { action: "rdv_supprime", rdv: id } });
  return fini("/admin/planning", "Rendez-vous supprimé.");
}

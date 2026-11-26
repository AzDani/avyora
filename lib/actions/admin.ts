"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/audit";
import { TYPE_DEMANDE_ACCOMPAGNEMENT } from "@/lib/data/admin";
import { TABLE_ARTISANS, documentsDe } from "@/lib/data/reseau";
import { COLONNES_ARTISAN, bloquantsValidation, lireArtisan, type StatutArtisan } from "@/lib/reseau/artisan";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { verifierSiret } from "@/lib/reseau/siret";
import { emailArtisan, envoyerEmailSuivi, type EvenementArtisan } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";

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

/* ─── Réseau AVYORA : la décision sur une candidature d'artisan (17/11/2026) ─────────────────── */

export type ActionArtisan = "appel_fait" | "appel_annule" | "valider" | "completer" | "refuser" | "suspendre" | "reactiver" | "reexaminer";

/** Les statuts depuis lesquels chaque décision est possible, et le statut d'arrivée (null : le statut ne change pas). */
const TRANSITIONS: Record<ActionArtisan, { depuis: StatutArtisan[]; vers: StatutArtisan | null; message: "requis" | "facultatif" | "aucun"; email?: EvenementArtisan }> = {
  appel_fait: { depuis: ["en_attente", "a_completer", "valide", "suspendu"], vers: null, message: "aucun" },
  appel_annule: { depuis: ["en_attente", "a_completer"], vers: null, message: "aucun" },
  valider: { depuis: ["en_attente"], vers: "valide", message: "facultatif", email: "validee" },
  // Depuis « suspendu » aussi : une décennale expirée (le motif de suspension le plus probable) ne se met à jour que par
  // un complément ; sans lui, « Réactiver » resterait bloqué pour toujours.
  completer: { depuis: ["en_attente", "valide", "suspendu"], vers: "a_completer", message: "requis", email: "completer" },
  refuser: { depuis: ["en_attente", "a_completer"], vers: "refuse", message: "facultatif", email: "refusee" },
  suspendre: { depuis: ["valide"], vers: "suspendu", message: "facultatif", email: "suspendue" },
  reactiver: { depuis: ["suspendu"], vers: "valide", message: "facultatif", email: "reactivee" },
  reexaminer: { depuis: ["refuse"], vers: "en_attente", message: "aucun" },
};

function urlSiteAdmin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}

/** Texte libre de l'admin : sans caractère de contrôle (retours à la ligne gardés), borné. */
function texteAdmin(v: unknown, max: number): string {
  return String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}

/**
 * Une décision sur une candidature : appel fait, valider, demander un complément, refuser, suspendre, réactiver.
 * Valider (ou réactiver) exige l'appel, une décennale en cours, une attestation déposée et un établissement non fermé
 * (`bloquantsValidation`). L'artisan reçoit un e-mail à chaque changement de statut, avec le message s'il y en a un.
 */
export async function deciderArtisan(id: string, action: ActionArtisan, message?: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:artisans" } });
    return { ok: false, erreur: "Accès refusé." };
  }
  if (typeof id !== "string" || !UUID.test(id) || !(action in TRANSITIONS)) return { ok: false, erreur: "Demande invalide." };
  const t = TRANSITIONS[action];
  const msg = texteAdmin(message, 2000);
  if (t.message === "requis" && !msg) return { ok: false, erreur: "Écris à l'artisan ce qu'il doit compléter." };

  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_ARTISANS).select(COLONNES_ARTISAN).eq("id", id).maybeSingle();
  if (!data) return { ok: false, erreur: "Candidature introuvable." };
  const a = lireArtisan(data as Record<string, unknown>);
  if (!t.depuis.includes(a.statut)) return { ok: false, erreur: "Cette action n'est pas possible dans l'état actuel de la candidature." };

  if (action === "valider" || action === "reactiver") {
    const nbDec = (await documentsDe(a.userId)).filter((d) => d.type === "decennale").length;
    const bloquants = bloquantsValidation(a, nbDec, aujourdhuiParis());
    if (bloquants.length) return { ok: false, erreur: bloquants.join(" ") };
  }

  const maintenant = new Date().toISOString();
  const maj: Record<string, unknown> = { updated_at: maintenant };
  if (action === "appel_fait") maj.appel_le = maintenant;
  if (action === "appel_annule") maj.appel_le = null;
  if (t.vers) {
    maj.statut = t.vers;
    maj.message_admin = t.message === "aucun" ? a.messageAdmin : msg || null;
  }
  if (action === "valider") maj.valide_le = maintenant;
  // Une décision ne s'applique que si la candidature est TOUJOURS dans l'état lu (deux onglets, un renvoi de l'artisan).
  const { data: fait, error } = await sb.from(TABLE_ARTISANS).update(maj).eq("id", id).eq("statut", a.statut).select("id");
  if (error) return { ok: false, erreur: "Enregistrement impossible : réessaie." };
  if (!fait?.length) return { ok: false, erreur: "La candidature a changé entre-temps : recharge la page." };

  if (t.email) {
    const m = emailArtisan(t.email, { nom: a.contactNom, message: msg || null, espaceUrl: `${urlSiteAdmin()}/espace-artisan` });
    await envoyerEmailSuivi({ to: a.email, subject: m.subject, html: m.html, replyTo: DESTINATAIRE_DEFAUT });
  }
  await journaliser("action_admin", { userId: admin.id, payload: { action: `artisan_${action}`, artisan: id } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Masquer un artisan du réseau, ou l'y remettre (26/11/2026, migration 0013). Masqué, il reste validé et garde tout son
 * espace (demandes en cours, avis, galerie) mais n'est plus proposé aux clients ni affiché aux membres Pro. Seulement
 * pour un artisan validé ; aucun e-mail (l'espace artisan l'affiche).
 */
export async function masquerArtisan(id: string, masquer: boolean): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const admin = await getAdmin();
  if (!admin) {
    const user = await getUser();
    if (user) await journaliser("acces_refuse", { userId: user.id, email: user.email, payload: { cible: "admin:artisans" } });
    return { ok: false, erreur: "Accès refusé." };
  }
  if (typeof id !== "string" || !UUID.test(id) || typeof masquer !== "boolean") return { ok: false, erreur: "Demande invalide." };
  const maintenant = new Date().toISOString();
  const { data, error } = await supabaseAdmin().from(TABLE_ARTISANS)
    .update({ masque_le: masquer ? maintenant : null, updated_at: maintenant })
    .eq("id", id).eq("statut", "valide").select("id");
  if (error) return { ok: false, erreur: "Enregistrement impossible : réessaie." };
  if (!data?.length) return { ok: false, erreur: "Seul un artisan validé peut être masqué ou remis dans le réseau." };
  await journaliser("action_admin", { userId: admin.id, payload: { action: masquer ? "artisan_masquer" : "artisan_afficher", artisan: id } });
  revalidatePath("/admin", "layout");
  revalidatePath("/avis-artisans", "layout");
  revalidatePath("/espace-artisan", "layout");
  return { ok: true };
}

/** Les notes internes de l'admin sur une candidature (jamais montrées à l'artisan). */
export async function noterArtisan(id: string, notes: string): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin || typeof id !== "string" || !UUID.test(id)) return { ok: false };
  const { error } = await supabaseAdmin().from(TABLE_ARTISANS).update({ notes_admin: texteAdmin(notes, 5000) || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false };
  revalidatePath(`/admin/artisans/${id}`);
  return { ok: true };
}

/** Relance la vérification du SIRET auprès du répertoire des entreprises (API muette au moment de la candidature…). */
export async function reverifierSiretArtisan(id: string): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin || typeof id !== "string" || !UUID.test(id)) return { ok: false };
  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_ARTISANS).select("siret").eq("id", id).maybeSingle();
  if (!data) return { ok: false };
  const verif = await verifierSiret(String(data.siret));
  const maj: Record<string, unknown> = { siret_verif: verif, updated_at: new Date().toISOString() };
  if (verif.nom) maj.raison_sociale = verif.nom;
  if (verif.rge) maj.rge = true;
  const { error } = await sb.from(TABLE_ARTISANS).update(maj).eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

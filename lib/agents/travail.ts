import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listDemandesAccompagnement, listInscrits, listPlansAdmin } from "@/lib/data/admin";
import { COLONNES_RDV_AGENTS, TABLE_RDV, lireRdv } from "@/lib/data/gestion";
import { MODES_RDV, TYPES_RDV, enParis, heureParis, instantParis, libelle, type RendezVous } from "@/lib/admin/gestion";
import { emailCompteRendu, emailRappelRendezVous, envoyerEmailSuivi } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";
import { AgentErreur, demanderJson, type ClientClaude } from "@/lib/agents/claude";
import {
  SCHEMA_COMPTE_RENDU, SCHEMA_FICHE, SYSTEME_COMPTE_RENDU, SYSTEME_FICHE, compteRenduEnTexte, compteRenduValide, contexteEnTexte, decouperCompteRendu, ficheValide,
  type ContexteClient,
} from "@/lib/agents/rappels";

/**
 * Le travail des agents Rappels et Agenda, côté serveur (27/11/2026). Ces fonctions ne vérifient PAS qui les appelle :
 * elles ne sont appelées que par les actions gardées (lib/actions/agents.ts) et par la tâche quotidienne (cron, gardée
 * par CRON_SECRET). Elles ne sont surtout pas dans un fichier « use server » (tout export y devient appelable du navigateur).
 */
export type Resultat = { ok: boolean; message: string };
const ok = (message: string): Resultat => ({ ok: true, message });
const non = (message: string): Resultat => ({ ok: false, message });
const SANS_0017 = "La migration 0017 n'est pas encore appliquée.";

async function lireUn(id: string): Promise<RendezVous | null> {
  const { data, error } = await supabaseAdmin().from(TABLE_RDV).select(COLONNES_RDV_AGENTS).eq("id", id).maybeSingle();
  if (error) throw new Error(SANS_0017);
  return data ? lireRdv(data as unknown as Parameters<typeof lireRdv>[0]) : null;
}
const quand = (r: RendezVous) => { const t = new Date(r.debut), p = enParis(t); return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y} à ${heureParis(t)}`; };

/** Ce que l'agent sait du client : sa demande de rappel, ses estimations et ses plans s'il a un compte. Sans e-mail ni téléphone. */
export async function contexteDe(r: RendezVous): Promise<ContexteClient> {
  const [demandes, inscrits, plans] = await Promise.all([
    r.demandeId ? listDemandesAccompagnement().catch(() => []) : Promise.resolve([]),
    listInscrits().catch(() => []),
    listPlansAdmin().catch(() => []),
  ]);
  const demande = demandes.find((d) => d.id === r.demandeId) ?? null;
  const email = (r.agents?.email || demande?.email || "").toLowerCase();
  const compte = email ? inscrits.find((i) => i.email.toLowerCase() === email) : undefined;
  return {
    prenom: r.client,
    rdv: { type: libelle(TYPES_RDV, r.type), mode: libelle(MODES_RDV, r.mode), quand: quand(r), sujet: r.sujet },
    demande: demande ? { typeProjet: demande.typeProjet, besoins: demande.besoins, message: demande.message, recueLe: demande.recueLe } : null,
    projets: (compte?.projets ?? []).map((p) => ({ nom: p.nom, nature: p.nature, mode: p.mode, typeBien: p.typeBien, surface: p.surface, codePostal: p.codePostal, ttc: p.ttc, creeLe: p.createdAt })),
    plans: compte ? plans.filter((p) => p.ownerId === compte.id).length : 0,
  };
}

/** Agent Rappels, avant l'appel : la fiche du client. */
export async function preparerFiche(id: string, client?: ClientClaude): Promise<Resultat> {
  const r = await lireUn(id);
  if (!r) return non("Rendez-vous introuvable.");
  try {
    const brut = await demanderJson({ systeme: SYSTEME_FICHE, contenu: contexteEnTexte(await contexteDe(r)), schema: SCHEMA_FICHE, maxTokens: 6000, client });
    const fiche = ficheValide(brut);
    if (!fiche) return non("La fiche reçue était vide. Réessaie.");
    const { error } = await supabaseAdmin().from(TABLE_RDV).update({ fiche, fiche_le: new Date().toISOString() }).eq("id", id);
    return error ? non(SANS_0017) : ok("Fiche prête.");
  } catch (e) {
    return non(e instanceof AgentErreur ? e.message : "La fiche n'a pas pu être préparée.");
  }
}

/** Agent Rappels, après l'appel : le compte rendu, à partir des notes ou de la transcription collées par Daniel. */
export async function redigerCompteRendu(id: string, client?: ClientClaude): Promise<Resultat> {
  const r = await lireUn(id);
  if (!r) return non("Rendez-vous introuvable.");
  const notes = r.agents?.notes?.trim();
  if (!notes || notes.length < 40) return non("Colle d'abord la transcription de l'appel ou tes notes (quelques lignes au moins).");
  try {
    const contenu = `${contexteEnTexte(await contexteDe(r))}\n\n--- Transcription ou notes de l'appel ---\n${notes}`;
    const cr = compteRenduValide(await demanderJson({ systeme: SYSTEME_COMPTE_RENDU, contenu, schema: SCHEMA_COMPTE_RENDU, maxTokens: 10000, client }));
    if (!cr) return non("Le compte rendu reçu était vide. Réessaie.");
    const { error } = await supabaseAdmin().from(TABLE_RDV).update({ compte_rendu_texte: compteRenduEnTexte(cr, r.client), compte_rendu: "a_relire", compte_rendu_le: new Date().toISOString() }).eq("id", id);
    return error ? non(SANS_0017) : ok("Compte rendu rédigé : relis-le avant de l'envoyer.");
  } catch (e) {
    return non(e instanceof AgentErreur ? e.message : "Le compte rendu n'a pas pu être rédigé.");
  }
}

/** L'envoi du compte rendu relu, au client. Jamais deux fois. */
export async function envoyerCompteRendu(id: string): Promise<Resultat> {
  const r = await lireUn(id);
  if (!r) return non("Rendez-vous introuvable.");
  const a = r.agents;
  if (a?.compteRenduEnvoyeLe) return non("Ce compte rendu est déjà parti.");
  if (!a?.email) return non("Ajoute d'abord l'adresse e-mail du client.");
  if (!a.compteRenduTexte?.trim()) return non("Il n'y a pas encore de compte rendu à envoyer.");
  const { objet, corps } = decouperCompteRendu(a.compteRenduTexte);
  // On réserve l'envoi d'abord (une seule ligne passe) : deux clics rapides n'envoient pas deux e-mails.
  const maintenant = new Date().toISOString();
  const { data: pris } = await supabaseAdmin().from(TABLE_RDV).update({ compte_rendu_envoye_le: maintenant }).eq("id", id).is("compte_rendu_envoye_le", null).select("id");
  if (!pris?.length) return non("Ce compte rendu est déjà parti.");
  const issue = await envoyerEmailSuivi({ to: a.email, ...emailCompteRendu({ objet, corps }), replyTo: DESTINATAIRE_DEFAUT });
  if (issue !== "envoye") {
    await supabaseAdmin().from(TABLE_RDV).update({ compte_rendu_envoye_le: null }).eq("id", id);
    return non(issue === "non_configure" ? "L'envoi d'e-mails n'est pas configuré ici." : "L'e-mail n'est pas parti. Réessaie.");
  }
  await supabaseAdmin().from(TABLE_RDV).update({ compte_rendu: "envoye" }).eq("id", id);
  return ok(`Compte rendu envoyé à ${a.email}.`);
}

/** Agent Agenda, chaque matin (tâche quotidienne) : le rappel aux clients du lendemain, et leur fiche préparée d'avance. */
export async function tourneeAgenda(maintenant = new Date()): Promise<{ rappels: number; fiches: number; echecs: number }> {
  const p = enParis(maintenant), demain = new Date(Date.UTC(p.y, p.m - 1, p.d) + 864e5), apres = new Date(demain.getTime() + 864e5);
  const debut = instantParis(demain.getUTCFullYear(), demain.getUTCMonth() + 1, demain.getUTCDate(), 0, 0), fin = instantParis(apres.getUTCFullYear(), apres.getUTCMonth() + 1, apres.getUTCDate(), 0, 0);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_RDV).select(COLONNES_RDV_AGENTS).gte("debut", debut.toISOString()).lt("debut", fin.toISOString()).in("statut", ["a_confirmer", "confirme"]).limit(30);
  if (error) return { rappels: 0, fiches: 0, echecs: 0 };
  const rdvs = (data as unknown as Parameters<typeof lireRdv>[0][]).map(lireRdv);
  let rappels = 0, fiches = 0, echecs = 0;
  const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
  for (const r of rdvs) {
    if (r.statut === "confirme" && r.agents?.email && !r.agents.rappelEnvoyeLe) {
      const { data: pris } = await sb.from(TABLE_RDV).update({ rappel_envoye_le: new Date().toISOString() }).eq("id", r.id).is("rappel_envoye_le", null).select("id");
      if (pris?.length) {
        const t = new Date(r.debut);
        const issue = await envoyerEmailSuivi({ to: r.agents.email, ...emailRappelRendezVous({ prenom: r.client, quoi: libelle(TYPES_RDV, r.type), mode: libelle(MODES_RDV, r.mode), jour: jour.format(t), heure: heureParis(t) }), replyTo: DESTINATAIRE_DEFAUT });
        if (issue === "envoye") rappels++;
        else { echecs++; await sb.from(TABLE_RDV).update({ rappel_envoye_le: null }).eq("id", r.id); }
      }
    }
    if (!r.agents?.ficheLe && process.env.ANTHROPIC_API_KEY) { const f = await preparerFiche(r.id); if (f.ok) fiches++; else echecs++; }
  }
  return { rappels, fiches, echecs };
}

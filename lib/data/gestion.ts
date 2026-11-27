import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { encaissements, enParis, instantParis, lundiParis, type Charge, type EntreesStripe, type RendezVous } from "@/lib/admin/gestion";

/**
 * Comptabilité et planning de l'admin (27/11/2026) : les lectures. Les tables viennent de la migration 0016 ; tant
 * qu'elle n'est pas appliquée, les lectures échouent et les pages le disent. Stripe : lecture seule des opérations de
 * solde (aucun paiement, aucune écriture), mémorisée 10 minutes.
 */
export const TABLE_CHARGES = "admin_charges";
export const TABLE_RDV = "admin_rendez_vous";

type LigneCharge = { id: string; nom: string; montant_centimes: number; devise: string; frequence: string; echeance: string | null; actif: boolean };
type LigneRdv = { id: string; debut: string; duree_min: number; client: string; sujet: string | null; type: string; mode: string; statut: string; compte_rendu: string; demande_id: string | null };

export const lireCharge = (r: LigneCharge): Charge => ({
  id: r.id, nom: r.nom, montantCentimes: r.montant_centimes, devise: r.devise === "USD" ? "USD" : "EUR",
  frequence: r.frequence === "an" ? "an" : "mois", echeance: r.echeance, actif: r.actif,
});
export const lireRdv = (r: LigneRdv): RendezVous => ({
  id: r.id, debut: r.debut, dureeMin: r.duree_min, client: r.client, sujet: r.sujet, type: r.type as RendezVous["type"], mode: r.mode as RendezVous["mode"],
  statut: r.statut as RendezVous["statut"], compteRendu: r.compte_rendu as RendezVous["compteRendu"], demandeId: r.demande_id,
});

export const listCharges = cache(async (): Promise<Charge[]> => {
  const { data, error } = await supabaseAdmin().from(TABLE_CHARGES).select("id, nom, montant_centimes, devise, frequence, echeance, actif").order("actif", { ascending: false }).order("nom").limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as LigneCharge[]).map(lireCharge);
});

/** Les rendez-vous d'une fenêtre (par défaut : du lundi de la semaine dernière à la fin de la semaine prochaine). */
export const listRendezVous = cache(async (depuisSemaines = -1, jusquaSemaines = 2): Promise<RendezVous[]> => {
  const lundi = lundiParis(new Date());
  const borne = (semaines: number) => { const t = new Date(lundi + semaines * 7 * 864e5); return instantParis(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), 0, 0).toISOString(); };
  const { data, error } = await supabaseAdmin().from(TABLE_RDV)
    .select("id, debut, duree_min, client, sujet, type, mode, statut, compte_rendu, demande_id")
    .gte("debut", borne(depuisSemaines)).lt("debut", borne(jusquaSemaines)).order("debut").limit(300);
  if (error) throw new Error(error.message);
  return ((data ?? []) as LigneRdv[]).map(lireRdv);
});

let memoire: { t: number; e: EntreesStripe } | null = null;
/** Ce que Stripe a encaissé ce mois-ci et le mois dernier (en France). null si Stripe ne répond pas ou n'est pas configuré. */
export async function entreesStripe(maintenant = Date.now()): Promise<EntreesStripe | null> {
  if (memoire && maintenant - memoire.t < 10 * 60 * 1000) return memoire.e;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const p = enParis(new Date(maintenant));
  const debutMois = instantParis(p.y, p.m, 1, 0, 0), debutPrecedent = instantParis(p.m === 1 ? p.y - 1 : p.y, p.m === 1 ? 12 : p.m - 1, 1, 0, 0);
  const ops: { type: string; amount: number; fee: number; currency: string; created: number }[] = [];
  for await (const o of getStripe().balanceTransactions.list({ created: { gte: Math.floor(debutPrecedent.getTime() / 1000) }, limit: 100 })) {
    ops.push({ type: o.type, amount: o.amount, fee: o.fee, currency: o.currency, created: o.created });
    if (ops.length >= 2000) break;
  }
  const seuil = debutMois.getTime() / 1000;
  const e: EntreesStripe = { mois: encaissements(ops.filter((o) => o.created >= seuil)), precedent: encaissements(ops.filter((o) => o.created < seuil)), lu: new Date(maintenant).toISOString() };
  memoire = { t: maintenant, e };
  return e;
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailDemandeAvis, emailRelanceArtisan, emailSansReponse, envoyerEmailSuivi } from "@/lib/email";
import { DESTINATAIRE_DEFAUT } from "@/lib/accompagnement/constantes";
import { TABLE_ARTISANS, TABLE_DEMANDES, TABLE_MER } from "@/lib/data/reseau";
import { EXPIRATION_JOURS, RELANCE_JOURS, SONDAGE_JOURS, placesRestantes, type StatutMiseEnRelation } from "@/lib/reseau/demande";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Réseau AVYORA, phase 3 : la tournée quotidienne (Vercel Cron, vercel.json). Dans l'ordre :
 * 1. une demande sans réponse depuis 5 jours EXPIRE pour cet artisan ; le client reçoit UN e-mail par demande (les
 *    artisans du jour regroupés), qui ne lui promet un remplacement que s'il reste de la place sur la demande ;
 * 2. une demande sans réponse depuis 2 jours vaut UNE relance, seulement à un artisan encore VALIDÉ ;
 * 3. 14 jours après une acceptation, le client est invité à donner son avis (une fois).
 * Chaque mise à jour est gardée par l'état lu (jamais deux e-mails pour le même évènement, même si la tâche tourne deux
 * fois). Une relance ou une demande d'avis dont l'e-mail échoue est remise en file pour le lendemain. 50 lignes au plus
 * par étape et par jour : le reste passe le lendemain.
 */
type Mer = { id: string; demande_id: string; artisan_id: string };
const LOT = 50;

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const ilYa = (jours: number) => new Date(Date.now() - jours * 864e5).toISOString();

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) console.error("[cron reseau] CRON_SECRET absent : appel refusé.");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const bilan = { expirees: 0, relances: 0, avis: 0 };

  // Les demandes et les artisans d'un lot, en deux lectures.
  async function contexte(lot: Mer[]) {
    const [{ data: dem }, { data: art }] = await Promise.all([
      sb.from(TABLE_DEMANDES).select("id, prenom, email, metiers, departement, code_postal, ville").in("id", [...new Set(lot.map((m) => m.demande_id))]),
      sb.from(TABLE_ARTISANS).select("id, statut, raison_sociale, nom_commercial, contact_nom, email").in("id", [...new Set(lot.map((m) => m.artisan_id))]),
    ]);
    type D = { id: string; prenom: string; email: string; metiers: string[]; departement: string; code_postal: string; ville: string | null };
    type A = { id: string; statut: string; raison_sociale: string; nom_commercial: string | null; contact_nom: string; email: string };
    return { dem: new Map(((dem ?? []) as D[]).map((d) => [d.id, d])), art: new Map(((art ?? []) as A[]).map((a) => [a.id, a])) };
  }

  try {
    // 1. Les expirations, puis UN e-mail par demande.
    const { data: aExpirer } = await sb.from(TABLE_MER).select("id, demande_id, artisan_id").eq("statut", "envoyee").lt("envoyee_le", ilYa(EXPIRATION_JOURS)).limit(LOT);
    const lot1 = (aExpirer ?? []) as Mer[];
    if (lot1.length) {
      const { dem, art } = await contexte(lot1);
      const parDemande = new Map<string, string[]>();
      for (const m of lot1) {
        const { data: fait } = await sb.from(TABLE_MER).update({ statut: "expiree", repondu_le: new Date().toISOString() }).eq("id", m.id).eq("statut", "envoyee").select("id");
        if (!fait?.length) continue;
        bilan.expirees++;
        const a = art.get(m.artisan_id);
        parDemande.set(m.demande_id, [...(parDemande.get(m.demande_id) ?? []), a ? a.nom_commercial || a.raison_sociale : "Un artisan"]);
      }
      if (parDemande.size) {
        const { data: statuts } = await sb.from(TABLE_MER).select("demande_id, statut").in("demande_id", [...parDemande.keys()]);
        for (const [demandeId, noms] of parDemande) {
          const d = dem.get(demandeId);
          if (!d) continue;
          const s = ((statuts ?? []) as { demande_id: string; statut: StatutMiseEnRelation }[]).filter((x) => x.demande_id === demandeId).map((x) => x.statut);
          const mail = emailSansReponse({ prenom: d.prenom, artisans: noms, peutRemplacer: placesRestantes(s) > 0, suiviUrl: `${site()}/demandes-devis` });
          const issue = await envoyerEmailSuivi({ to: d.email, subject: mail.subject, html: mail.html, replyTo: DESTINATAIRE_DEFAUT });
          // L'expiration reste (l'artisan n'a pas répondu) ; seul l'e-mail est perdu, et le suivi le montre au client.
          if (issue === "echec") console.error(`[cron reseau] e-mail « sans réponse » non parti (demande ${demandeId}).`);
        }
      }
    }

    // 2. Les relances : une seule par mise en relation, à un artisan encore validé.
    const { data: aRelancer } = await sb.from(TABLE_MER).select("id, demande_id, artisan_id").eq("statut", "envoyee").is("relance_le", null).lt("envoyee_le", ilYa(RELANCE_JOURS)).limit(LOT);
    const lot2 = (aRelancer ?? []) as Mer[];
    if (lot2.length) {
      const { dem, art } = await contexte(lot2);
      for (const m of lot2) {
        const d = dem.get(m.demande_id);
        const a = art.get(m.artisan_id);
        if (!d || !a || a.statut !== "valide") continue;
        const { data: fait } = await sb.from(TABLE_MER).update({ relance_le: new Date().toISOString() }).eq("id", m.id).eq("statut", "envoyee").is("relance_le", null).select("id");
        if (!fait?.length) continue;
        const lieu = `${d.ville ? `${d.ville}, ` : ""}${nomDepartement(d.departement)} (${d.code_postal})`;
        const mail = emailRelanceArtisan({ nomArtisan: a.contact_nom, travaux: d.metiers.map(labelMetier), lieu, joursRestants: EXPIRATION_JOURS - RELANCE_JOURS, espaceUrl: `${site()}/espace-artisan/demandes` });
        const issue = await envoyerEmailSuivi({ to: a.email, subject: mail.subject, html: mail.html, replyTo: DESTINATAIRE_DEFAUT });
        if (issue === "echec") await sb.from(TABLE_MER).update({ relance_le: null }).eq("id", m.id);
        else bilan.relances++;
      }
    }

    // 3. L'avis du client, 14 jours après l'acceptation (une fois, et seulement s'il n'en a pas déjà donné).
    const { data: aSonder } = await sb.from(TABLE_MER).select("id, demande_id, artisan_id").eq("statut", "acceptee").is("sondage_le", null).is("avis_le", null).lt("repondu_le", ilYa(SONDAGE_JOURS)).limit(LOT);
    const lot3 = (aSonder ?? []) as Mer[];
    if (lot3.length) {
      const { dem, art } = await contexte(lot3);
      for (const m of lot3) {
        const d = dem.get(m.demande_id);
        const a = art.get(m.artisan_id);
        if (!d || !a) continue;
        const { data: fait } = await sb.from(TABLE_MER).update({ sondage_le: new Date().toISOString() }).eq("id", m.id).is("sondage_le", null).select("id");
        if (!fait?.length) continue;
        const mail = emailDemandeAvis({ prenom: d.prenom, nomArtisan: a.nom_commercial || a.raison_sociale, suiviUrl: `${site()}/demandes-devis` });
        const issue = await envoyerEmailSuivi({ to: d.email, subject: mail.subject, html: mail.html, replyTo: DESTINATAIRE_DEFAUT });
        if (issue === "echec") await sb.from(TABLE_MER).update({ sondage_le: null }).eq("id", m.id);
        else bilan.avis++;
      }
    }
  } catch (e) {
    console.error("[cron reseau]", e);
    return NextResponse.json({ error: "Erreur cron", ...bilan }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...bilan });
}

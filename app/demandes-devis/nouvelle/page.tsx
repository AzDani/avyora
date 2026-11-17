import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser, estPro } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { afficherPortable } from "@/lib/telephone";
import { estimationProjet, lotsProjet } from "@/lib/estimateur/projet";
import { metiersDesLots } from "@/lib/reseau/demande";
import FormulaireDemandeDevis, { type InitialDemande } from "@/components/reseau/FormulaireDemandeDevis";

/**
 * Nouvelle demande de devis au Réseau AVYORA (phase 2, 17/11/2026). Réservée à AVYORA Pro (pendant la bêta : tout
 * compte confirmé). Depuis un projet (`?projet=`, un projet DU COMPTE, lu avec la session et la RLS) : travaux et code
 * postal pré-remplis, estimation proposée en pièce jointe. En français : le réseau est en France.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demander des devis · Réseau AVYORA", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NouvelleDemande({ searchParams }: { searchParams: Promise<{ projet?: string | string[] }> }) {
  const user = await getUser();
  const sp = await searchParams;
  const projetParam = Array.isArray(sp.projet) ? sp.projet[0] : sp.projet;
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/demandes-devis/nouvelle${projetParam ? `?projet=${projetParam}` : ""}`)}`);

  if (!estPro(user)) {
    return (
      <div className="mx-auto max-w-2xl py-6" lang="fr">
        <p className="eyebrow">Réseau AVYORA</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Des devis d&apos;artisans vérifiés</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Demander des devis aux artisans du Réseau AVYORA est réservé à <b className="text-ink">AVYORA Pro</b> : SIRET, assurance décennale
          et chantiers vérifiés, entretien avec Daniel, 3 artisans au plus par demande.
        </p>
        <Link href="/tarifs" className="btn btn-primary mt-5 min-h-12 px-6 text-[15px]">Découvrir AVYORA Pro</Link>
      </div>
    );
  }

  const meta = (user.user_metadata ?? {}) as { nom?: string; profil?: { telephone?: string } };
  const initial: InitialDemande = {
    metiers: [], codePostal: "", ville: "",
    prenom: typeof meta.nom === "string" ? meta.nom.trim().split(/\s+/)[0]?.slice(0, 60) ?? "" : "",
    telephone: meta.profil?.telephone ? afficherPortable(meta.profil.telephone) : "",
    projetId: "", projetNom: "", estimationTtc: null,
  };
  if (projetParam && UUID.test(projetParam)) {
    const sb = await supabaseServer();
    const { data: p } = await sb.from("projects").select("id, nom, code_postal, reponses").eq("id", projetParam).maybeSingle();
    if (p) {
      initial.projetId = String(p.id);
      initial.projetNom = String(p.nom ?? "");
      initial.codePostal = /^\d{5}$/.test(String(p.code_postal ?? "")) ? String(p.code_postal) : "";
      initial.metiers = metiersDesLots(lotsProjet(p.reponses));
      const est = estimationProjet(p.reponses);
      initial.estimationTtc = est ? Math.round(est.ttc) : null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2" lang="fr">
      <div>
        <Link href="/demandes-devis" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Mes demandes de devis
        </Link>
        <p className="eyebrow mt-3">Réseau AVYORA</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Demande des devis à des artisans vérifiés</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Choisis jusqu&apos;à 3 artisans de ton département. Ils voient ta demande, et ceux qui l&apos;acceptent te contactent pour établir leur devis.
        </p>
      </div>
      <FormulaireDemandeDevis initial={initial} />
    </div>
  );
}

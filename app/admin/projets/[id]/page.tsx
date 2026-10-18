import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjetAdmin, getInscrit } from "@/lib/data/admin";
import EstimationResultat from "@/components/EstimationResultat";
import ResultatRapide from "@/components/ResultatRapide";
import ResultatRapideNeuf from "@/components/neuf/ResultatRapideNeuf";
import PastillesProjet from "@/components/PastillesProjet";
import { regionLabel, estNeuf, modeProjet, type Ctx, type Selection, type Ampleur, type QuiRealise } from "@/lib/estimateur";

export const dynamic = "force-dynamic";

/**
 * Vue projet ADMIN — le VRAI écran de l'utilisateur, nourri par ses `reponses` récupérées en bypass
 * RLS, mais en lecture seule (readOnly = pas d'écriture des statuts, pas de boutons vers les écrans du
 * particulier). Le même composant que sa fiche (N14) : le résultat rapide de la rénovation ou du neuf
 * pour un projet rapide (en clair, comme un compte qui a les droits), sinon `EstimationResultat`.
 */
export default async function AdminProjet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projet = await getProjetAdmin(id);
  if (!projet) notFound();

  const proprietaire = await getInscrit(projet.ownerId);
  const reponses = projet.reponses as { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; codePostal?: string; ampleur?: Ampleur; qui?: QuiRealise };
  const neuf = estNeuf(reponses.ctx);
  const rapide = modeProjet(reponses) === "rapide";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/admin/inscrits/${projet.ownerId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {proprietaire ? proprietaire.email : "Retour"}
          </Link>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">{projet.nom}</h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <PastillesProjet nature={neuf ? "neuf" : "reno"} mode={rapide ? "rapide" : "detaille"} locale="fr" />
            {!neuf && <span className="chip capitalize">{projet.typeBien}</span>}
            <span className="chip num">{projet.surface} m²</span>
            <span className="chip num">{projet.codePostal}</span>
            <span className="chip">{regionLabel(projet.codePostal)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f0c98a] bg-[#fdf1e1] px-3 py-1.5 text-[12px] font-semibold text-[#b06d10]">
          👁 Vue admin · lecture seule
        </span>
      </div>

      {rapide
        ? (neuf
          ? <ResultatRapideNeuf reponses={reponses} projectId={projet.id} isPro readOnly />
          : <ResultatRapide reponses={reponses} projectId={projet.id} isPro readOnly />)
        : <EstimationResultat reponses={reponses} projectId={projet.id} readOnly />}
    </div>
  );
}

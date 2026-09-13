import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Estimateur from "@/components/Estimateur";
import EstimateurRapide from "@/components/EstimateurRapide";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import type { Ctx, Ampleur, Finition, QuiRealise } from "@/lib/estimateur";

export const dynamic = "force-dynamic";

const TR = {
  fr: { retour: "Retour au projet", titre: "Modifier l'estimation", sous: "ajuste ta saisie, tes choix sont déjà là." },
  en: { retour: "Back to project", titre: "Edit the estimate", sous: "adjust your entries, your choices are already here." },
} as const;

// Édition d'un projet. FREE = éditeur RAPIDE uniquement (le détaillé est réservé au Pro).
// PRO = éditeur détaillé (poste par poste). Non connecté → connexion.
export default async function ModifierProjet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/projets/${id}/modifier`);

  const projet = await getProjet(id);
  if (!projet) notFound();

  const locale = await getLocale();
  const s = TR[locale];
  const pro = estPro(user);
  const rep = (projet.reponses ?? {}) as { ctx?: Ctx; codePostal?: string; ampleur?: Ampleur; qui?: QuiRealise };

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <Link
          href={`/projets/${projet.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {s.retour}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{s.titre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{projet.nom} — {s.sous}</p>
      </header>

      {pro ? (
        <Estimateur initialState={(projet.reponses as Record<string, unknown>) ?? {}} projectId={projet.id} />
      ) : (
        <EstimateurRapide
          edit={{
            projectId: projet.id,
            type: rep.ctx?.type,
            surface: rep.ctx?.surface,
            cp: projet.code_postal ?? rep.codePostal,
            ampleur: rep.ampleur,
            finition: rep.ctx?.finition,
            qui: rep.qui,
          }}
        />
      )}
    </div>
  );
}

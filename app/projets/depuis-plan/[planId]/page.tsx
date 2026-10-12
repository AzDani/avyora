import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { getUser, estPro } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { dictPlans } from "@/lib/i18n/plans";
import { supabaseServer } from "@/lib/supabase/server";
import { planIdSchema } from "@/lib/plans/schema";
import { choisirProjet, preparer } from "@/lib/plans/estimation";
import { piecesEff, sdbEff } from "@/lib/estimateur/core";
import DepuisPlan, { type ResumeBien } from "@/components/plans/DepuisPlan";
import type { Ctx } from "@/lib/estimateur/core";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
};

const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Le bien tel que l'écran le résume (surface, type, niveaux, pièces, salles de bain, WC, fenêtres). */
function resumeDe(c: Ctx): ResumeBien {
  return { surface: c.surface, type: c.type, niveaux: c.niveaux, pieces: piecesEff(c), sdb: sdbEff(c), wc: c.wc, fenetres: c.fenetres };
}

/**
 * « Mes plans », C7 : l'estimation détaillée de rénovation née d'un plan (Pro). L'éditeur envoie son
 * contrat (`PATCH /api/plans/[id]`), puis ouvre cette page. Elle montre ce que le plan remplirait
 * (`preparer`, sans rien écrire), demande le code postal s'il manque, et la validation part vers
 * `POST /api/plans/[id]/estimation`, qui recalcule tout.
 *
 * Privée (`proxy.ts` : `/projets/*`). Interrupteur éteint → 404. Gratuit → Tarifs.
 * `?projet=<id>` : l'estimation reliée à mettre à jour ; sinon la plus récente ; sinon création.
 * `?nouvelle=1` : création, même si une estimation est déjà reliée.
 */
export default async function DepuisPlanPage({ params, searchParams }: Props) {
  if (!FEATURES.plans) notFound();
  const { planId: brut } = await params;
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/projets/depuis-plan/${brut}`)}`);
  if (!estPro(user)) redirect("/tarifs?source=editeur-plan");
  if (!planIdSchema.safeParse(brut).success) notFound();
  const planId = brut.toLowerCase();

  const sp = await searchParams;
  const projetVoulu = un(sp.projet);
  const nouvelle = un(sp.nouvelle) === "1";
  const locale = await getLocale();
  const t = dictPlans(locale).estimation;
  const sb = await supabaseServer();

  const choix = await choisirProjet(sb, planId, {
    projetId: projetVoulu && planIdSchema.safeParse(projetVoulu).success ? projetVoulu : null,
    nouvelle,
  });
  const projet = choix.ok ? choix.projet : null;
  const prep = choix.ok ? await preparer(sb, planId, projet) : choix;
  if (!prep.ok && prep.code === "introuvable" && choix.ok) notFound();

  const lienPlan = `/plan?id=${encodeURIComponent(planId)}`;
  const nomPlan = prep.ok ? prep.plan.nom : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-rise">
        <a
          href={lienPlan}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.ouvrirPlan}
        </a>
        <p className="eyebrow mt-3">{t.eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{projet ? t.titreMaj : t.titreCreer}</h1>
        {prep.ok && <p className="mt-1.5 text-[15px] text-muted">{t.sous(nomPlan)}</p>}
        {projet && (
          <p className="mt-2 text-[14px] text-muted">
            {t.majDe(projet.nom)}{" "}
            <Link href={`/projets/depuis-plan/${planId}?nouvelle=1`} className="font-medium text-brand-700 underline underline-offset-2">
              {t.nouvelle}
            </Link>
          </p>
        )}
      </header>

      {prep.ok ? (
        <DepuisPlan
          planId={planId}
          projetId={projet?.id ?? null}
          nouvelle={nouvelle}
          lignes={prep.lignes}
          bilan={prep.bilan}
          manqueCodePostal={prep.manqueCodePostal}
          resume={resumeDe(prep.ctxPropose)}
          avant={prep.ctxAvant ? resumeDe(prep.ctxAvant) : null}
        />
      ) : (
        <div className="card p-5 sm:p-6">
          <p className="text-[15px] text-ink">{t.erreurs[prep.code === "contrat_version" ? "contrat_invalide" : prep.code] ?? t.erreurs.erreur}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={lienPlan} className="btn btn-primary py-2.5">{t.ouvrirPlan}</a>
            {prep.code === "introuvable" && (
              <Link href={`/projets/depuis-plan/${planId}?nouvelle=1`} className="btn btn-outline py-2.5">{t.nouvelle}</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getUser, estPro } from "@/lib/auth";
import { artisansPublics } from "@/lib/data/reseau";
import { DEPARTEMENTS, nomDepartement } from "@/lib/reseau/departements";
import { METIERS, labelMetier } from "@/lib/reseau/metiers";
import { MOTIFS_REFUS, noteFr } from "@/lib/reseau/avis";
import { ControleAvis, Etoiles } from "@/components/reseau/avis/Affichage";
import AccesPro from "@/components/reseau/avis/AccesPro";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Avis sur les artisans du Réseau AVYORA",
  description: "Les artisans vérifiés du Réseau AVYORA, notés par des clients qui ont fait appel à eux via AVYORA.",
  robots: { index: false, follow: false },
};

/**
 * L'onglet « Avis artisans » (25/11/2026), réservé aux membres AVYORA Pro : les artisans validés du réseau (décennale
 * en cours), filtrés par département et métier, avec leur note, leur nombre d'avis et de réalisations. Les règles
 * des avis (motifs de refus) restent visibles par tous : la loi demande de les afficher à côté des avis.
 */
export default async function AvisArtisans({ searchParams }: { searchParams: Promise<{ dep?: string; metier?: string }> }) {
  const user = await getUser();
  const pro = !!user && estPro(user);
  const sp = await searchParams;
  const dep = DEPARTEMENTS.some(([c]) => c === sp.dep) ? sp.dep! : "";
  const metier = METIERS.some((m) => m.cle === sp.metier) ? sp.metier! : "";
  const artisans = pro ? await artisansPublics({ departement: dep || null, metier: metier || null }).catch(() => null) : [];

  return (
    <div className="space-y-6" lang="fr">
      <div>
        <p className="eyebrow">Réseau AVYORA · membres Pro</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">Les artisans du réseau et leurs avis</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-muted">
          Des artisans vérifiés par AVYORA (SIRET actif, assurance décennale, appel avec Daniel), notés par des clients qui ont réellement fait appel à eux via AVYORA.
        </p>
      </div>

      {!pro ? (
        <AccesPro connecte={!!user} retour="/avis-artisans" />
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-2.5" role="search" aria-label="Filtrer les artisans">
            <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
              Département
              <select name="dep" defaultValue={dep} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-normal text-ink">
                <option value="">Tous les départements</option>
                {DEPARTEMENTS.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
              Métier
              <select name="metier" defaultValue={metier} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-normal text-ink">
                <option value="">Tous les métiers</option>
                {METIERS.map((m) => <option key={m.cle} value={m.cle}>{m.label}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-primary min-h-11 px-5">Filtrer</button>
          </form>

          {artisans === null ? (
            <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">La liste ne s&apos;affiche pas pour l&apos;instant. Recharge la page dans un instant.</p>
          ) : artisans.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">
              Pas encore d&apos;artisan du réseau {dep ? `en ${nomDepartement(dep)}` : ""}{metier ? ` pour « ${labelMetier(metier)} »` : ""}. Le réseau grandit : reviens bientôt.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {artisans.map((a) => (
                <li key={a.id}>
                  <Link href={`/avis-artisans/${a.id}`} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-200">
                    {a.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- petite image publique déjà réduite
                      <img src={a.photo} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-[14px] object-cover ring-1 ring-line" />
                    ) : (
                      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-brand-600 to-[#7c3aed] text-[15px] font-bold text-white">
                        {a.nom.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{a.nom}</span>
                      <span className="block truncate text-[12.5px] text-muted">{[a.commune, a.metiers.map(labelMetier).join(" · ")].filter(Boolean).join(" · ")}</span>
                      <span className="block text-[12.5px] text-faint">{a.nbRealisations} réalisation{a.nbRealisations > 1 ? "s" : ""}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {a.resume.n ? (
                        <>
                          <span className="num block text-[20px] font-semibold text-ink">{noteFr(a.resume.moyenne)}</span>
                          <Etoiles note={a.resume.moyenne ?? 0} />
                          <span className="block text-[12px] text-muted">{a.resume.n} avis</span>
                        </>
                      ) : (
                        <span className="block text-[12px] leading-tight text-muted">Pas encore<br />d&apos;avis</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <section id="regles" className="scroll-mt-28 space-y-3" aria-labelledby="regles-titre">
        <h2 id="regles-titre" className="text-[18px] font-semibold text-ink">Les règles des avis</h2>
        <ControleAvis />
        <div className="rounded-2xl border border-line bg-surface p-4 text-[13.5px] leading-relaxed text-muted">
          <p className="font-semibold text-ink">Motifs de refus d&apos;un avis</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">{MOTIFS_REFUS.map(([k, l]) => <li key={k}>{l}.</li>)}</ul>
          <p className="mt-2">L&apos;auteur reçoit le motif par e-mail et peut corriger son avis. Un avis publié reste en ligne tant que l&apos;artisan fait partie du réseau ; son auteur peut demander son retrait à contact@getavyora.fr.</p>
        </div>
      </section>
    </div>
  );
}

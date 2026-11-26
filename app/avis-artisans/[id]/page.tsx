import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser, estPro } from "@/lib/auth";
import { avisPublies, ficheArtisan, realisationsDe } from "@/lib/data/reseau";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import { labelMois } from "@/lib/reseau/avis";
import { BlocNote, CarteAvis, ControleAvis } from "@/components/reseau/avis/Affichage";
import AccesPro from "@/components/reseau/avis/AccesPro";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiche artisan · Réseau AVYORA", robots: { index: false, follow: false } };

const COCHE = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/**
 * La fiche d'un artisan du réseau (membres Pro, 25/11/2026) : ce qu'AVYORA a vérifié, sa note, ses avis publiés (du
 * plus récent au plus ancien) et sa galerie. Jamais ses coordonnées : elles passent par une demande de devis acceptée.
 */
export default async function FicheArtisan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vue?: string }> }) {
  const [{ id }, { vue }, user] = await Promise.all([params, searchParams, getUser()]);
  const pro = !!user && estPro(user);
  if (!pro) {
    return (
      <div className="space-y-6" lang="fr">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Fiche artisan</h1>
        <AccesPro connecte={!!user} retour={`/avis-artisans/${id}`} />
      </div>
    );
  }
  const a = await ficheArtisan(id).catch(() => null);
  if (!a) notFound();
  const realisations = vue === "realisations";
  const [avis, reals] = await Promise.all([
    realisations ? Promise.resolve([]) : avisPublies(a.id).catch(() => null),
    realisations ? realisationsDe(a.id).catch(() => null) : Promise.resolve([]),
  ]);
  const initiales = a.nom.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
  const onglet = (on: boolean) => "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-semibold " + (on ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:text-ink");
  const pastille = (on: boolean) => "num rounded-full px-2 text-[11.5px] leading-5 " + (on ? "bg-brand-600 text-white" : "border border-line bg-surface-2 text-muted");

  return (
    <div className="space-y-5" lang="fr">
      <Link href="/avis-artisans" className="text-[13.5px] font-semibold text-brand-700 hover:underline">← Tous les artisans</Link>

      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {a.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- petite image publique déjà réduite
            <img src={a.photo} alt={`Photo de ${a.nom}`} width={64} height={64} className="h-16 w-16 shrink-0 rounded-[18px] object-cover ring-1 ring-line" />
          ) : (
            <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-brand-600 to-[#7c3aed] text-[20px] font-bold text-white">{initiales}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">{a.nom}</h1>
            <p className="mt-1 text-[13.5px] text-muted">{[a.commune, resumeDepartements(a.departements, 4)].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-[13.5px] text-muted">{a.metiers.map(labelMetier).join(" · ")}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {["SIRET actif", "Décennale vérifiée", "Appel avec Daniel", ...(a.rge ? ["RGE"] : [])].map((b) => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full bg-[#e3f5ed] px-2.5 py-0.5 text-[12px] font-semibold text-[#0b7a53]">{COCHE}{b}</span>
              ))}
            </div>
          </div>
          <Link href="/demandes-devis/nouvelle" className="btn btn-primary min-h-11 w-full px-5 sm:w-auto">Lui demander un devis</Link>
        </div>
        {a.presentation && <p className="mt-4 max-w-[70ch] whitespace-pre-line text-[14px] leading-relaxed text-ink">{a.presentation}</p>}
        {a.siteWeb && (
          <p className="mt-2 text-[13.5px]"><a href={a.siteWeb} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 hover:underline">Son site web</a></p>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5"><BlocNote r={a.resume} /></section>

      <div className="flex gap-1 overflow-x-auto border-b border-line-strong">
        <Link href={`/avis-artisans/${a.id}`} aria-current={!realisations ? "page" : undefined} className={onglet(!realisations)}>Avis<span className={pastille(!realisations)}>{a.resume.n}</span></Link>
        <Link href={`/avis-artisans/${a.id}?vue=realisations`} aria-current={realisations ? "page" : undefined} className={onglet(realisations)}>Réalisations<span className={pastille(realisations)}>{a.nbRealisations}</span></Link>
      </div>

      {!realisations ? (
        avis === null ? (
          <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Les avis ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>
        ) : avis.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">Pas encore d&apos;avis : {a.nom} est peut-être nouveau dans le réseau. Regarde ses réalisations.</p>
        ) : (
          <section className="rounded-3xl border border-line bg-surface p-5" aria-label="Avis des clients">
            {avis.map((x) => <CarteAvis key={x.id} a={x} nomArtisan={a.nom} />)}
          </section>
        )
      ) : reals === null ? (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Les réalisations ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>
      ) : reals.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">{a.nom} n&apos;a pas encore publié de réalisation.</p>
      ) : (
        <ul className="space-y-4">
          {reals.map((r) => (
            <li key={r.id} className="rounded-3xl border border-line bg-surface p-5">
              <h2 className="text-[16px] font-semibold text-ink">{r.titre}</h2>
              <p className="mt-0.5 text-[12.5px] text-faint">{[r.ville, r.mois ? labelMois(r.mois) : null].filter(Boolean).join(" · ")}</p>
              <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[14px] leading-relaxed text-ink">{r.description}</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {r.photos.filter((p) => p.url).map((p, i) => (
                  <li key={p.chemin}>
                    <a href={p.url!} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url!} alt={`${r.titre} : photo ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <ControleAvis />
      <p className="text-[12.5px] text-faint">
        Les réalisations sont publiées par l&apos;artisan, sous sa responsabilité ; AVYORA peut en retirer. <Link href="/avis-artisans#regles" className="underline">Les règles des avis</Link>.
      </p>
    </div>
  );
}

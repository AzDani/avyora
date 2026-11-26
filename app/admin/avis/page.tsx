import Link from "next/link";
import { aModerer, realisationsRecentes } from "@/lib/data/reseau";
import { labelMois } from "@/lib/reseau/avis";
import { Etoiles } from "@/components/reseau/avis/Affichage";
import { BoutonRetirerRealisation, BoutonsAvis, BoutonsReponse, BoutonsSignalement } from "@/components/admin/reseau/ModerationAvis";
import type { AvisAModerer } from "@/lib/data/reseau";

export const dynamic = "force-dynamic";

const quand = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function Avis({ a, children }: { a: AvisAModerer; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-line bg-surface p-4 sm:p-5" data-avis-admin={a.miseId}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <b className="text-[14.5px] text-ink">{a.auteur}</b>
        <Etoiles note={a.note} />
        <Link href={`/admin/artisans/${a.artisanId}`} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-muted hover:text-ink">sur {a.artisanNom}</Link>
      </div>
      <p className="mt-1 text-[12.5px] text-faint">{a.mois ? `Travaux faits en ${labelMois(a.mois)} · ` : ""}envoyé le {quand(a.envoyeLe)}</p>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink">{a.texte}</p>
      {a.photos.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {a.photos.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${i + 1}`} className="h-20 w-24 rounded-lg border border-line object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2.5 inline-block rounded-xl bg-[#e3f5ed] px-3 py-1.5 text-[12.5px] text-[#0b5e40]">
        Vraie mise en relation : demande du {quand(a.demande.creeLe)}, {a.demande.ville ? `${a.demande.ville} ` : ""}({a.demande.codePostal}), acceptée le {quand(a.demande.acceptee ?? "")}
      </p>
      {a.signalement && (
        <p className="mt-2 rounded-xl bg-[#fdf1e1] px-3 py-2 text-[13px] text-[#8a5208]"><b>Signalé par l&apos;artisan le {quand(a.signalement.le)} :</b> {a.signalement.texte}</p>
      )}
      {children}
    </article>
  );
}

/**
 * Les avis et galeries du Réseau AVYORA (25/11/2026) : avis à valider (publier, ou refuser avec un motif de la liste),
 * réponses d'artisans à valider, avis signalés par un artisan (garder ou retirer), dernières réalisations publiées
 * sans validation (en retirer une). Un avis négatif mais correct se publie (L111-7-2).
 */
export default async function AdminAvis() {
  let m: Awaited<ReturnType<typeof aModerer>> | null = null;
  let reals: Awaited<ReturnType<typeof realisationsRecentes>> = [];
  try {
    [m, reals] = await Promise.all([aModerer(), realisationsRecentes(30)]);
  } catch {
    m = null;
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Réseau AVYORA</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Avis et galeries</h1>
        <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-muted">
          Publie, ou refuse avec un motif de la liste : l&apos;auteur le reçoit par e-mail. Un avis négatif mais correct se publie. Un avis publié est figé.
        </p>
      </div>
      {!m ? (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">
          Impossible de lire les avis. La migration 0012 est-elle appliquée dans Supabase ?
        </p>
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="a-valider">
            <h2 id="a-valider" className="text-[17px] font-semibold text-ink">Avis à valider <span className="num text-muted">({m.avis.length})</span></h2>
            {m.avis.length === 0 ? <p className="text-[14px] text-muted">Rien à valider.</p> : m.avis.map((a) => <Avis key={a.miseId} a={a}><BoutonsAvis miseId={a.miseId} /></Avis>)}
          </section>

          <section className="space-y-3" aria-labelledby="reponses">
            <h2 id="reponses" className="text-[17px] font-semibold text-ink">Réponses d&apos;artisans à valider <span className="num text-muted">({m.reponses.length})</span></h2>
            {m.reponses.length === 0 ? <p className="text-[14px] text-muted">Rien à valider.</p> : m.reponses.map((r) => (
              <article key={r.miseId} className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
                <p className="text-[13px] text-muted">Avis de <b className="text-ink">{r.auteur}</b> ({r.note}/5) : « {r.texteAvis.slice(0, 220)}{r.texteAvis.length > 220 ? "…" : ""} »</p>
                <div className="mt-2 rounded-r-xl border-l-[3px] border-brand-200 bg-surface-2 px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-brand-700">Réponse de {r.artisanNom}</p>
                  <p className="mt-1 whitespace-pre-line text-[14px] text-ink">{r.reponse}</p>
                </div>
                <BoutonsReponse miseId={r.miseId} />
              </article>
            ))}
          </section>

          <section className="space-y-3" aria-labelledby="signales">
            <h2 id="signales" className="text-[17px] font-semibold text-ink">Avis signalés par un artisan <span className="num text-muted">({m.signales.length})</span></h2>
            {m.signales.length === 0 ? <p className="text-[14px] text-muted">Aucun signalement.</p> : m.signales.map((a) => <Avis key={a.miseId} a={a}><BoutonsSignalement miseId={a.miseId} /></Avis>)}
          </section>
        </>
      )}

      <section className="space-y-3" aria-labelledby="reals">
        <h2 id="reals" className="text-[17px] font-semibold text-ink">Dernières réalisations publiées</h2>
        <p className="text-[13px] text-muted">En ligne sans validation : tu peux en retirer une (l&apos;artisan voit le motif).</p>
        {reals.length === 0 ? <p className="text-[14px] text-muted">Aucune réalisation.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {reals.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-3.5">
                {r.photos[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photos[0].url} alt="" className="mb-2 aspect-[16/9] w-full rounded-xl border border-line object-cover" />
                )}
                <p className="text-[14px] font-semibold text-ink">{r.titre}</p>
                <p className="text-[12.5px] text-faint">{r.artisanNom} · {r.photos.length} photo{r.photos.length > 1 ? "s" : ""} · {quand(r.creeLe)}</p>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link href={`/avis-artisans/${r.artisanId}?vue=realisations`} className="text-[13px] font-semibold text-brand-700 underline">Voir sur la fiche</Link>
                  <BoutonRetirerRealisation id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

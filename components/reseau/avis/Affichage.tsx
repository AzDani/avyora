import { MOTIFS_REFUS, labelMois, noteFr, type ResumeNotes } from "@/lib/reseau/avis";
import type { AvisPublic } from "@/lib/data/reseau";

/**
 * L'affichage des avis du Réseau AVYORA (25/11/2026) : étoiles, carte d'un avis, résumé de la note, et l'encadré
 * « comment les avis sont contrôlés » que la loi demande à côté des avis (L111-7-2 et D111-17 du Code de la
 * consommation : contrôle ou non, critères de classement, motifs de refus, absence de contrepartie).
 */

const dateCourte = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }) : "");
const ETOILE = "M8 1.4l1.95 4 4.4.6-3.2 3.1.76 4.38L8 11.4l-3.9 2.08.76-4.38L1.65 6l4.4-.6L8 1.4z";

/** Cinq étoiles, pleines jusqu'à la note arrondie à la demi-étoile près. */
export function Etoiles({ note, taille = 15 }: { note: number; taille?: number }) {
  const n = Math.round(note * 2) / 2;
  return (
    <span className="inline-flex shrink-0 gap-px align-[-2px]" role="img" aria-label={`${noteFr(note)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const part = n >= i ? 1 : n >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={taille} height={taille} viewBox="0 0 16 16" aria-hidden="true">
            <path d={ETOILE} fill="#dcdeec" />
            {part > 0 && <path d={ETOILE} fill="#f59e0b" style={part < 1 ? { clipPath: "inset(0 50% 0 0)" } : undefined} />}
          </svg>
        );
      })}
    </span>
  );
}

/** Un avis publié : auteur, note, mois des travaux, texte, photos et la réponse de l'artisan. */
export function CarteAvis({ a, nomArtisan, children }: { a: AvisPublic; nomArtisan: string; children?: React.ReactNode }) {
  return (
    <article className="border-t border-line py-4 first:border-t-0 first:pt-1" data-avis={a.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <b className="text-[14.5px] text-ink">{a.auteur}</b>
        <Etoiles note={a.note} />
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b7a53]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Client mis en relation par AVYORA
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-faint">
        {a.mois ? `Travaux faits en ${labelMois(a.mois)} · ` : ""}publié le {dateCourte(a.publieLe)}
      </p>
      <p className="mt-2 max-w-[68ch] whitespace-pre-line text-[14px] leading-relaxed text-ink">{a.texte}</p>
      {a.photos.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {a.photos.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${i + 1} du client`} loading="lazy" className="h-16 w-20 rounded-lg border border-line object-cover sm:h-20 sm:w-24" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {a.reponse && (
        <div className="mt-3 rounded-r-xl border-l-[3px] border-brand-200 bg-surface-2 px-3 py-2.5">
          <p className="text-[13px] font-semibold text-brand-700">Réponse de {nomArtisan}</p>
          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{a.reponse.texte}</p>
          {a.reponse.le && <p className="mt-1 text-[12px] text-faint">le {dateCourte(a.reponse.le)}</p>}
        </div>
      )}
      {children}
    </article>
  );
}

/** La note moyenne, le nombre d'avis et la répartition 5 → 1 étoiles. */
export function BlocNote({ r }: { r: ResumeNotes }) {
  const total = r.n || 1;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div>
        <p className="num text-[42px] font-semibold leading-none tracking-tight text-ink">{noteFr(r.moyenne)}</p>
        {r.moyenne != null && <div className="mt-1.5"><Etoiles note={r.moyenne} taille={20} /></div>}
        <p className="mt-1 text-[13px] text-muted">{r.n ? `${r.n} avis vérifié${r.n > 1 ? "s" : ""}` : "Pas encore d'avis"}</p>
      </div>
      <div className="grid min-w-[180px] max-w-[320px] flex-1 gap-1.5" aria-label="Répartition des notes">
        {r.repartition.map((nb, i) => (
          <div key={i} className="grid grid-cols-[26px_1fr_22px] items-center gap-2 text-[12px] text-muted">
            <span>{5 - i} ★</span>
            <span className="h-[7px] overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-[#f59e0b]" style={{ width: `${(nb / total) * 100}%` }} /></span>
            <span className="num text-right">{nb}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** L'encadré obligatoire à côté des avis : comment ils sont contrôlés, classés, et pour quels motifs ils sont refusés. */
export function ControleAvis() {
  return (
    <aside className="rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted" aria-labelledby="controle-avis">
      <p id="controle-avis" className="font-semibold text-ink">Comment les avis sont contrôlés</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        <li>Seuls les clients mis en relation avec l&apos;artisan par AVYORA, et dont l&apos;artisan a accepté la demande, peuvent laisser un avis.</li>
        <li>Daniel lit chaque avis avant de le publier. Les avis négatifs sont publiés comme les autres ; aucune contrepartie n&apos;est donnée pour un avis.</li>
        <li>Un avis n&apos;est refusé que pour un de ces motifs, que l&apos;auteur reçoit : {MOTIFS_REFUS.map(([, l]) => l.split(" (")[0].split(" :")[0].toLowerCase()).join(", ")}.</li>
        <li>Les avis sont classés du plus récent au plus ancien, avec le mois des travaux et la date de publication. Un avis publié n&apos;est plus modifiable ; l&apos;artisan peut y répondre.</li>
      </ul>
    </aside>
  );
}

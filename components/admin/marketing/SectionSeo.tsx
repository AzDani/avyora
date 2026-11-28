import { marquerRapportSeoLu } from "@/lib/actions/seo";
import { position, type ResumeSeo } from "@/lib/seo/resume";
import type { LigneSeo, Totaux } from "@/lib/seo/regles.mjs";

/**
 * L'Agent SEO sur /admin/marketing (28/11/2026) : le classement (Search Console, 28 derniers jours face aux 28 d'avant), le
 * rapport de l'agent, les points d'amélioration et la santé des pages du sitemap. Lecture seule : le « go » sur une
 * proposition se donne à l'agent, le site ne change rien seul.
 */
const nf = new Intl.NumberFormat("fr-FR");
const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")} %`;
const ecart = (a: number, b: number, inverse = false) => {
  if (!b) return "pas de période d'avant";
  const d = a - b, bon = inverse ? d < 0 : d > 0;
  const signe = d > 0 ? "+" : d < 0 ? "−" : "±";
  return <span className={d === 0 ? "" : bon ? "text-[#0b7a53]" : "text-[#b42318]"}>{signe}{inverse ? Math.abs(d).toFixed(1).replace(".", ",") : nf.format(Math.abs(Math.round(d)))} vs 28 j d&apos;avant</span>;
};

export default function SectionSeo({ r, migrationAbsente }: { r: ResumeSeo | null; migrationAbsente: boolean }) {
  return (
    <section aria-labelledby="agent-seo" className="mt-10">
      <h2 id="agent-seo" className="mb-1 text-[18px] font-semibold text-ink">Agent SEO</h2>
      <p className="mb-4 text-[13.5px] text-muted">Chaque matin, il relève Search Console et vérifie les pages du sitemap ; chaque lundi, il écrit le classement et les points d&apos;amélioration. Il ne change rien sur le site sans ton go.</p>
      {!r ? (
        <Encart>{migrationAbsente ? "Les tables de l'Agent SEO n'existent pas encore : applique la migration 0020 dans Supabase." : "La lecture a échoué. Recharge la page dans une minute."}</Encart>
      ) : !r.gsc && !r.sante ? (
        <Encart>Aucun relevé pour l&apos;instant. Branche Search Console (mode d&apos;emploi : avyora-marketing/seo/BRANCHER-SEARCH-CONSOLE.md sur ton Mac) : l&apos;agent fera son premier relevé le matin suivant.</Encart>
      ) : (
        <>
          {r.gsc && <Classement a={r.gsc.actuelle} b={r.gsc.precedente} jour={r.gsc.jour} />}
          {r.rapport && (
            <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">Rapport du {jourFr(r.rapport.jour)} {r.rapport.statut === "nouveau" && <span className="ml-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11.5px] text-[#b54708]">nouveau</span>}</p>
                {r.rapport.statut === "nouveau" && (
                  <form action={marquerRapportSeoLu}><input type="hidden" name="id" value={r.rapport.id} />
                    <button type="submit" className="rounded-lg border border-line-strong px-2.5 py-1 text-[12.5px] text-ink hover:bg-surface-2">Marquer comme lu</button></form>
                )}
              </div>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{r.rapport.resume}</p>
              {r.rapport.points.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {r.rapport.points.map((p, i) => (
                    <li key={i} className="rounded-xl border border-line p-3 text-[13.5px]">
                      <p className="font-semibold text-ink">{i + 1}. {p.titre}{p.gain && <span className="ml-2 text-[12px] font-normal text-muted">{p.gain}</span>}</p>
                      {p.page && <p className="text-[12.5px] text-muted">{p.page}</p>}
                      <p className="mt-1 whitespace-pre-line text-muted">{p.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {r.gsc && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Tableau titre="Page 2 de Google : les plus faciles à faire monter" lignes={r.gsc.opportunites.page2} />
              <Tableau titre="Vues mais peu cliquées : titre à réécrire" lignes={r.gsc.opportunites.ctrFaible} />
              <Tableau titre="Requêtes qui reculent (5 places ou plus)" lignes={r.gsc.opportunites.reculs} avant />
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="mb-2 text-[13px] font-semibold text-ink">Deux pages sur la même requête</p>
                {r.gsc.opportunites.cannibales.length === 0 ? <p className="text-[13px] text-muted">Aucune.</p> : (
                  <ul className="space-y-1.5 text-[13px]">
                    {r.gsc.opportunites.cannibales.map((c) => (
                      <li key={c.requete}><b className="text-ink">« {c.requete} »</b> <span className="text-muted">{c.pages.map((p) => `${p.page} (pos. ${position(p.position)})`).join(" · ")}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {r.sante && (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
              <p className="mb-2 text-[13px] font-semibold text-ink">Santé des pages · {jourFr(r.sante.jour)} · {nf.format(r.sante.verifiees)} pages du sitemap vérifiées</p>
              <p className={"mb-2 text-[13.5px] " + (r.sante.graves ? "text-[#b42318]" : "text-muted")}>
                {r.sante.graves ? `${r.sante.graves} page${r.sante.graves > 1 ? "s" : ""} qui sor${r.sante.graves > 1 ? "tent" : "t"} de Google (erreur, redirection, noindex ou canonique)` : "Aucune page ne sort de Google."}
                {r.sante.finitions ? ` · ${r.sante.finitions} à peaufiner (titre, description)` : ""}
              </p>
              {r.sante.pages.length > 0 && (
                <ul className="max-h-72 space-y-1 overflow-auto text-[12.5px]">
                  {r.sante.pages.map((p) => (
                    <li key={p.url}><span className="text-ink">{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span> <span className="text-muted">— {p.problemes.map((x) => x.detail).join(" ; ")}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Encart({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">{children}</p>;
}

const jourFr = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

function Classement({ a, b, jour }: { a: Totaux; b: Totaux; jour: string }) {
  const tuile = (titre: string, valeur: string, detail: React.ReactNode) => (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[12.5px] font-semibold text-muted">{titre}</p>
      <p className="num mt-1 text-[24px] font-semibold text-ink">{valeur}</p>
      <p className="mt-1 text-[12.5px] text-muted">{detail}</p>
    </div>
  );
  return (
    <>
      <section aria-label="Le classement" className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tuile("Clics (28 jours)", nf.format(a.clics), ecart(a.clics, b.clics))}
        {tuile("Impressions", nf.format(a.impressions), ecart(a.impressions, b.impressions))}
        {tuile("Position moyenne", position(a.position), b.position ? ecart(a.position, b.position, true) : "pas de période d'avant")}
        {tuile("Taux de clic", pct(a.ctr), b.impressions ? `${pct(b.ctr)} les 28 j d'avant` : "pas de période d'avant")}
      </section>
      <p className="mb-6 text-[12px] text-muted">Search Console, relevé du {jourFr(jour)} (Google publie ses chiffres avec ~2 jours de retard). Position : plus petit = mieux.</p>
    </>
  );
}

function Tableau({ titre, lignes, avant }: { titre: string; lignes: (LigneSeo & { positionAvant?: number })[]; avant?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-2 text-[13px] font-semibold text-ink">{titre}</p>
      {lignes.length === 0 ? <p className="text-[13px] text-muted">Aucune.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="text-muted"><tr><th className="py-1 pr-2 font-medium">Requête · page</th><th className="py-1 pr-2 font-medium">Pos.</th><th className="py-1 pr-2 font-medium">Impr.</th><th className="py-1 font-medium">Clics</th></tr></thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.requete + l.page} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2"><span className="text-ink">{l.requete}</span><br /><span className="text-muted">{l.page}</span></td>
                  <td className="num py-1.5 pr-2">{position(l.position)}{avant && l.positionAvant != null && <span className="text-muted"> (avant {position(l.positionAvant)})</span>}</td>
                  <td className="num py-1.5 pr-2">{nf.format(l.impressions)}</td>
                  <td className="num py-1.5">{nf.format(l.clics)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

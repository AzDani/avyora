import Link from "next/link";
import { listArtisansAdmin, type ArtisanListe } from "@/lib/data/reseau";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { joursAvantFinDecennale } from "@/lib/reseau/artisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import { dateCourte } from "@/lib/admin/outils";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import { PastilleDecennale, PastilleSiret, PastilleStatut } from "@/components/admin/reseau/Pastilles";

export const dynamic = "force-dynamic";

const VUES = [
  ["a-examiner", "À examiner"],
  ["complement", "Complément demandé"],
  ["valides", "Validés"],
  ["sortis", "Refusés, suspendus"],
  ["tous", "Tous"],
] as const;
type Vue = (typeof VUES)[number][0];

const FILTRE: Record<Vue, (a: ArtisanListe) => boolean> = {
  "a-examiner": (a) => a.statut === "en_attente",
  complement: (a) => a.statut === "a_completer",
  valides: (a) => a.statut === "valide",
  sortis: (a) => a.statut === "refuse" || a.statut === "suspendu",
  tous: () => true,
};

/** Les candidatures au Réseau AVYORA (phase 1, 17/11/2026). Chaque carte ouvre la fiche, où se prennent les décisions. */
export default async function AdminArtisans({ searchParams }: { searchParams: Promise<{ vue?: string | string[] }> }) {
  const brut = (await searchParams).vue;
  const vue: Vue = VUES.some(([v]) => v === brut) ? (brut as Vue) : "a-examiner";
  let tous: ArtisanListe[];
  try {
    tous = await listArtisansAdmin();
  } catch {
    return (
      <>
        <EnTeteAdmin titre="Artisans" />
        <p role="alert" className="rounded-3xl border border-[#f1b8b2] bg-[#fdf0ef] p-5 text-[14px] text-[#8a1f15]">
          Les candidatures ne se lisent pas. Si la migration <code>0007_reseau_artisans.sql</code>{" "}n&apos;est pas encore appliquée dans Supabase, c&apos;est la cause : colle-la dans Supabase › SQL editor.
        </p>
      </>
    );
  }
  const jour = aujourdhuiParis();
  const liste = tous.filter(FILTRE[vue]);
  const aRenouveler = tous.filter((a) => a.statut === "valide" && joursAvantFinDecennale(a.decennaleFin, jour) <= 30).length;

  return (
    <>
      <EnTeteAdmin
        titre="Artisans du Réseau AVYORA"
        texte="Les candidatures des artisans. Ouvre une fiche pour vérifier le dossier, noter l'appel, puis valider, demander un complément ou refuser."
      >
        <Link href="/reseau-artisans" className="text-[13px] font-semibold text-brand-700 hover:underline">Page publique du réseau →</Link>
      </EnTeteAdmin>

      {aRenouveler > 0 && (
        <p className="mb-4 rounded-2xl bg-[#fff4dc] px-4 py-3 text-[13.5px] font-medium text-[#8a5300]">
          {aRenouveler} artisan{aRenouveler > 1 ? "s" : ""} validé{aRenouveler > 1 ? "s" : ""} {aRenouveler > 1 ? "ont" : "a"} une décennale expirée ou qui finit dans moins de 30 jours : demande-leur la nouvelle attestation.
        </p>
      )}

      <nav aria-label="Filtrer les candidatures" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
          {VUES.map(([v, label]) => {
            const n = tous.filter(FILTRE[v]).length;
            return (
              <Link
                key={v}
                href={v === "a-examiner" ? "/admin/artisans" : `/admin/artisans?vue=${v}`}
                aria-current={vue === v ? "page" : undefined}
                className={"inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors " + (vue === v ? "bg-brand-600 text-white" : "text-muted hover:text-ink")}
              >
                {label}
                <span className={"num text-[12px] " + (vue === v ? "text-white/80" : "text-faint")}>{n}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {liste.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface px-4 py-10 text-center text-[14px] text-muted">
          {vue === "a-examiner" ? "Aucune candidature à examiner." : "Aucune candidature dans cette catégorie."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {liste.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/artisans/${a.id}`} className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-600">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{a.raisonSociale}{a.nomCommercial ? <span className="font-normal text-muted"> · {a.nomCommercial}</span> : null}</p>
                    <p className="truncate text-[12.5px] text-muted">{a.contactNom} · {resumeDepartements(a.departements, 3)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PastilleSiret v={a.siretVerif} />
                    <PastilleStatut statut={a.statut} />
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
                  <span className="text-ink">{a.metiers.slice(0, 3).map(labelMetier).join(" · ")}{a.metiers.length > 3 ? ` · +${a.metiers.length - 3}` : ""}</span>
                  <PastilleDecennale fin={a.decennaleFin} aujourdhui={jour} />
                  <span className="text-muted">{a.nbPhotos} photo{a.nbPhotos > 1 ? "s" : ""}</span>
                  {a.appelLe ? <span className="font-semibold text-[#0b5e40]">Appel fait</span> : a.statut === "en_attente" ? <span className="font-semibold text-brand-700">Appel à faire</span> : null}
                  <span className="num ml-auto text-faint">Envoyée le {dateCourte(a.soumiseLe)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

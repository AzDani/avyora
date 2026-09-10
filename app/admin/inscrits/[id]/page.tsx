import Link from "next/link";
import { notFound } from "next/navigation";
import { getInscrit, labelTues, labelObjectif, labelMaturite } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fdate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const STATUT_LABEL: Record<string, string> = { estimation: "Estimé", en_cours: "En cours", termine: "Terminé" };
const STATUT_DOT: Record<string, string> = { estimation: "#4f46e5", en_cours: "#e0a325", termine: "#0f9d6b" };

function KV({ lab, val }: { lab: string; val: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-faint">{lab}</div>
      <div className="mt-0.5 text-[14px] font-medium text-ink">{val || "—"}</div>
    </div>
  );
}

export default async function FicheInscrit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await getInscrit(id);
  if (!i) notFound();
  const p = i.profil;

  return (
    <div className="space-y-6">
      <Link href="/admin/inscrits" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Inscrits
      </Link>

      {/* En-tête */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="num text-[19px] font-semibold text-ink">{i.email}</h2>
            <p className="mt-1 text-[13px] text-muted">Inscrit le {fdate(i.createdAt)}{i.lastSignIn ? ` · dernière connexion ${fdate(i.lastSignIn)}` : ""}</p>
          </div>
          <span className={"inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold " + (i.plan === "pro" ? "bg-brand text-white" : "border border-line bg-surface-2 text-muted")}>
            {i.plan === "pro" ? "Pro" : "Free"}
          </span>
        </div>
      </div>

      {/* Profil d'onboarding */}
      <div>
        <p className="eyebrow mb-3">Profil d'inscription</p>
        {p ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-3">
            <KV lab="Type" val={(p.tuEs ?? []).map(labelTues).join(", ")} />
            <KV lab="Objectif" val={labelObjectif(p.objectif)} />
            <KV lab="Maturité" val={(p.maturite ?? []).map(labelMaturite).join(", ")} />
            <KV lab="Région" val={p.region} />
            <KV lab="Âge" val={p.age} />
            <KV lab="Canal d'acquisition" val={p.canal} />
          </div>
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-5 text-[13px] text-muted">Onboarding non complété.</p>
        )}
      </div>

      {/* Projets */}
      <div>
        <p className="eyebrow mb-3">Projets enregistrés ({i.projets.length})</p>
        {i.projets.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-5 text-[13px] text-muted">Aucun projet enregistré.</p>
        ) : (
          <div className="space-y-2.5">
            {i.projets.map((pr) => (
              <Link
                key={pr.id}
                href={`/admin/projets/${pr.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-[#c7ccfe] hover:bg-[#eef1ff]"
              >
                <div>
                  <div className="font-semibold text-ink">{pr.nom}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted capitalize">
                    {pr.typeBien} · <span className="num">{pr.surface} m²</span> · <span className="num">{pr.codePostal}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUT_DOT[pr.statut] }} />
                    {STATUT_LABEL[pr.statut]}{pr.statut === "en_cours" ? ` · ${pr.pct} %` : ""}
                  </span>
                  <span className="num font-semibold text-brand-700">{pr.ttc != null ? euros(pr.ttc) : "—"}</span>
                  <span className="text-[12px] font-semibold text-brand">Voir →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

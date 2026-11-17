import Link from "next/link";
import { listDemandesAccompagnement } from "@/lib/data/admin";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import DemandeCarte from "@/components/admin/DemandeCarte";

export const dynamic = "force-dynamic";

const VUES = [
  ["a-traiter", "À traiter"],
  ["traitees", "Traitées"],
  ["toutes", "Toutes"],
] as const;
type Vue = (typeof VUES)[number][0];

/**
 * Les demandes de rappel de la page /accompagnement-travaux (17/11/2026). Jusqu'ici elles n'arrivaient que par e-mail ;
 * elles sont toutes ici, avec les gestes pour rappeler et « Marquer traitée ».
 */
export default async function AdminAccompagnement({ searchParams }: { searchParams: Promise<{ vue?: string | string[] }> }) {
  const brut = (await searchParams).vue;
  const vue: Vue = VUES.some(([v]) => v === brut) ? (brut as Vue) : "a-traiter";
  const toutes = await listDemandesAccompagnement();
  const compte: Record<Vue, number> = {
    "a-traiter": toutes.filter((d) => !d.traiteeLe).length,
    traitees: toutes.filter((d) => d.traiteeLe).length,
    toutes: toutes.length,
  };
  const liste = vue === "toutes" ? toutes : toutes.filter((d) => (vue === "traitees" ? !!d.traiteeLe : !d.traiteeLe));

  return (
    <>
      <EnTeteAdmin
        titre="Demandes d'accompagnement"
        texte="Les demandes de rappel de la page Accompagnement. Rappelle la personne, puis marque la demande traitée : elle quitte la liste « À traiter »."
      />
      <nav aria-label="Filtrer les demandes" className="mb-4 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
        {VUES.map(([v, label]) => (
          <Link
            key={v}
            href={v === "a-traiter" ? "/admin/accompagnement" : `/admin/accompagnement?vue=${v}`}
            aria-current={vue === v ? "page" : undefined}
            className={
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors " +
              (vue === v ? "bg-brand-600 text-white" : "text-muted hover:text-ink")
            }
          >
            {label}
            <span className={"num text-[12px] " + (vue === v ? "text-white/80" : "text-faint")}>{compte[v]}</span>
          </Link>
        ))}
      </nav>

      {liste.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface px-4 py-10 text-center text-[14px] text-muted">
          {vue === "a-traiter" ? "Rien à traiter : toutes les demandes sont traitées." : vue === "traitees" ? "Aucune demande traitée pour l'instant." : "Aucune demande reçue pour l'instant."}
        </p>
      ) : (
        <div className="space-y-3">
          {liste.map((d) => <DemandeCarte key={d.id} d={d} />)}
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictNeufCommun, libelleTypeBien } from "@/lib/i18n/neuf-commun";
import PastillesProjet from "@/components/PastillesProjet";
import { euros as eurosLocale, nombre, pourcent } from "@/lib/i18n/nombres";
import type { Locale } from "@/lib/i18n/config";
import { clicPlan } from "@/lib/plans/mesure";
import { casErreurApi, messageCasApi } from "@/lib/i18n/erreurs-api";

const TR = {
  fr: {
    statutArchive: "Archivé",
    statutTermine: "Terminé",
    statutEnCours: "En cours",
    statutEstimation: "Estimation",
    chantierTermine: "Chantier terminé",
    chantierEnCours: "Chantier en cours",
    estimationTravaux: "Estimation travaux",
    ttc: "TTC",
    mesProjets: "Mes projets",
    desarchiver: "Désarchiver",
    archiver: "Archiver",
    suppression: "Suppression…",
    confirmerSuppr: (n: number) => `Confirmer la suppression (${n}) ?`,
    confirmerSupprCourt: (n: number) => `Confirmer (${n}) ?`,
    echecSuppr: (k: number, n: number) => (n === 1 ? "Le projet n'a pas pu être supprimé." : `${k} projet${k > 1 ? "s" : ""} sur ${n} n'${k > 1 ? "ont" : "a"} pas pu être supprimé${k > 1 ? "s" : ""}.`),
    echecArchive: (k: number, n: number) => (n === 1 ? "Le projet n'a pas pu être modifié." : `${k} projet${k > 1 ? "s" : ""} sur ${n} n'${k > 1 ? "ont" : "a"} pas pu être modifié${k > 1 ? "s" : ""}.`),
    reessaie: "Réessaie.",
    supprimer: (n: number) => `Supprimer (${n})`,
    annuler: "Annuler",
    selectionner: "Sélectionner",
    nouveauProjet: "Nouveau projet",
    aucunProjet: "Aucun projet pour l'instant",
    aucunProjetSub: "Crée ton premier projet et obtiens une estimation en 2 minutes.",
    aucunActif: "Aucun projet actif",
    aucunActifSub: "Tes projets archivés sont plus bas. Tu peux en désarchiver un ou démarrer un nouveau projet.",
    estimerPremier: "Estimer mon premier projet",
    projetsArchives: "Projets archivés",
  },
  en: {
    statutArchive: "Archived",
    statutTermine: "Done",
    statutEnCours: "In progress",
    statutEstimation: "Estimate",
    chantierTermine: "Project done",
    chantierEnCours: "Project in progress",
    estimationTravaux: "Work estimate",
    ttc: "incl. tax",
    mesProjets: "My projects",
    desarchiver: "Unarchive",
    archiver: "Archive",
    suppression: "Deleting…",
    confirmerSuppr: (n: number) => `Confirm deletion (${n})?`,
    confirmerSupprCourt: (n: number) => `Confirm (${n})?`,
    echecSuppr: (k: number, n: number) => (n === 1 ? "The project couldn't be deleted." : `${k} of ${n} projects couldn't be deleted.`),
    echecArchive: (k: number, n: number) => (n === 1 ? "The project couldn't be updated." : `${k} of ${n} projects couldn't be updated.`),
    reessaie: "Try again.",
    supprimer: (n: number) => `Delete (${n})`,
    annuler: "Cancel",
    selectionner: "Select",
    nouveauProjet: "New project",
    aucunProjet: "No projects yet",
    aucunProjetSub: "Create your first project and get an estimate in 2 minutes.",
    aucunActif: "No active projects",
    aucunActifSub: "Your archived projects are below. You can unarchive one or start a new project.",
    estimerPremier: "Estimate my first project",
    projetsArchives: "Archived projects",
  },
} as const;
type Str = (typeof TR)[keyof typeof TR];

export type StatutChantier = "estimation" | "en_cours" | "termine";

export type ProjetCarte = {
  id: number | string;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  ttc: number;
  archived: boolean;
  eurM2: number;
  statut: StatutChantier;
  donePct: number;
  progPct: number;
  /** Rénovation ou construction neuve (`natureProjet`). Absent : rénovation. */
  nature?: "reno" | "neuf";
  /** Estimation rapide ou détaillée (`modeProjet`). Absent : détaillée, comme la fiche. */
  mode?: "rapide" | "detaille";
  /** « Mes plans » (C8) : le plan dont l'estimation est née. Absent : aucun lien (ou interrupteur éteint). */
  plan?: { id: string; nom: string };
};

/**
 * « Mes plans » (C8), passé par la page serveur seulement interrupteur allumé : le nombre de plans du
 * compte et les quelques textes (le dictionnaire des plans reste hors du paquet client). Absent : la
 * liste rend exactement le HTML d'avant.
 */
export type PlansListe = {
  total: number;
  textes: { pastille: string; bande: string; bandeSous: string; dessiner: string };
};

/** Français : le format monétaire d'avant, au caractère près. Anglais : « 92,000 € », comme le rapide (N14). */
function euros(n: number, locale: Locale): string {
  if (locale === "en") return eurosLocale(locale, n);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function IconBien({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.startsWith("appart"))
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
      </svg>
    );
  if (t.startsWith("immeu"))
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M6 21V6l6-3 6 3v15" />
        <path d="M10 9h4M10 13h4M10 17h4" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function StatutBadge({ statut, archived, s }: { statut: StatutChantier; archived: boolean; s: Str }) {
  const cfg = archived
    ? { cls: "bg-surface-2 text-faint", dot: "bg-line-strong", label: s.statutArchive }
    : statut === "termine"
      ? { cls: "bg-positive-soft text-positive", dot: "bg-positive", label: s.statutTermine }
      : statut === "en_cours"
        ? { cls: "bg-warning-soft text-warning", dot: "bg-[#efb44d]", label: s.statutEnCours }
        : { cls: "bg-brand-50 text-brand-600", dot: "bg-brand-600", label: s.statutEstimation };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function ListeProjets({
  projets,
  archives,
  plans,
}: {
  projets: ProjetCarte[];
  archives: ProjetCarte[];
  plans?: PlansListe;
}) {
  const router = useRouter();
  const locale = useLocale();
  const s = TR[locale];
  const n = dictNeufCommun(locale);
  const [selection, setSelection] = useState<Set<number | string>>(new Set());
  const [modeSelection, setModeSelection] = useState(false);
  const [busy, setBusy] = useState<"" | "suppr" | "archive">("");
  const [confirmSuppr, setConfirmSuppr] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const archiveIds = new Set(archives.map((a) => a.id));
  const toutArchive = selection.size > 0 && [...selection].every((id) => archiveIds.has(id));
  const aDesProjets = projets.length + archives.length > 0;

  // La confirmation de suppression vaut pour CETTE sélection, quelques secondes : elle repart de zéro
  // quand la sélection change, à l'annulation et au bout de 5 s (sinon, après une annulation, la
  // suppression suivante partait en un seul clic).
  useEffect(() => {
    if (!confirmSuppr) return;
    const h = setTimeout(() => setConfirmSuppr(false), 5000);
    return () => clearTimeout(h);
  }, [confirmSuppr]);

  function toggle(id: number | string) {
    setConfirmSuppr(false);
    setErreur(null);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Une action sur chaque projet sélectionné. Chaque échec (réseau, 403, 500…) est compté : les projets
   * en échec restent sélectionnés et un message dit combien ; les boutons sont toujours réactivés.
   */
  async function surSelection(action: "suppr" | "archive", requete: (id: number | string) => Promise<Response>, echec: (k: number, n: number) => string) {
    const ids = [...selection];
    setBusy(action);
    setErreur(null);
    try {
      const res = await Promise.allSettled(ids.map((id) => requete(id)));
      const rates = ids.filter((_, i) => { const r = res[i]; return r.status === "rejected" || !r.value.ok; });
      if (rates.length) {
        const premier = res.find((r) => r.status === "rejected" || !r.value.ok);
        const cas = casErreurApi(premier?.status === "fulfilled" ? premier.value.status : 0);
        setErreur(`${echec(rates.length, ids.length)} ${cas ? messageCasApi(locale, cas) : s.reessaie}`);
        setSelection(new Set(rates));
      } else {
        setSelection(new Set());
        setModeSelection(false);
      }
      if (rates.length < ids.length) router.refresh();
    } finally {
      setConfirmSuppr(false);
      setBusy("");
    }
  }

  // Suppression groupée : confirmation EN LIGNE (2 clics), pas de window.confirm (bloqué en iframe sandbox).
  async function supprimerSelection() {
    if (!confirmSuppr) { setConfirmSuppr(true); return; }
    await surSelection("suppr", (id) => fetch(`/api/projects/${id}`, { method: "DELETE" }), s.echecSuppr);
  }

  async function archiverSelection(archived: boolean) {
    await surSelection("archive", (id) =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      }), s.echecArchive);
  }

  function Carte({ p }: { p: ProjetCarte }) {
    const coche = selection.has(p.id);
    const contenu = (
      <>
        <div className="flex items-start gap-3">
          {modeSelection && (
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-bold transition-colors ${
                coche ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong text-transparent"
              }`}
              aria-hidden="true"
            >
              ✓
            </span>
          )}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <IconBien type={p.type_bien} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-ink">{p.nom}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {/* La nature et le mode d'abord, comme sur la fiche (N14). */}
              <PastillesProjet nature={p.nature === "neuf" ? "neuf" : "reno"} mode={p.mode ?? "detaille"} locale={locale} />
              {p.nature !== "neuf" && <span className="chip capitalize">{libelleTypeBien(locale, p.type_bien)}</span>}
              <span className="chip num">{p.surface} m²</span>
              <span className="chip num">{p.code_postal}</span>
              {/* Une pastille, jamais un lien : la carte entière est déjà un lien (aucun <a> dans un <a>). */}
              {p.plan && plans && (
                <span className="chip border-brand-200 bg-brand-50 text-brand-700" title={p.plan.nom} data-depuis-plan="">
                  {plans.textes.pastille}
                </span>
              )}
            </div>
          </div>
          {!modeSelection && (
            <svg
              width="18" height="18" viewBox="0 0 18 18" fill="none"
              className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
              aria-hidden="true"
            >
              <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {!p.archived && p.statut !== "estimation" && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-faint">
              <span>{p.statut === "termine" ? s.chantierTermine : s.chantierEnCours}</span>
              <b className="data font-semibold text-muted">{pourcent(locale, p.donePct, 0)}</b>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
              <span className="bg-positive" style={{ width: p.donePct + "%" }} />
              <span className="bg-[#efb44d]" style={{ width: p.progPct + "%" }} />
            </div>
          </div>
        )}

        <div className="my-4 h-px bg-line" />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{p.nature === "neuf" ? n.eyebrowListe : s.estimationTravaux}</p>
            <p className="data mt-1 text-[17px] font-semibold text-ink">
              {euros(p.ttc, locale)} <span className="text-faint text-sm font-normal">{s.ttc}</span>
            </p>
            {p.surface > 0 && (
              <p className="mt-0.5 text-[11.5px] text-muted">
                ≈ <b className="data font-semibold text-ink">{nombre(locale, p.eurM2)}</b> €/m²
              </p>
            )}
          </div>
          <StatutBadge statut={p.statut} archived={p.archived} s={s} />
        </div>
      </>
    );

    const base = `group relative overflow-hidden card p-5 transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-gradient-to-b before:from-brand-600 before:to-accent-600 before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100 ${
      p.archived ? "opacity-70 hover:opacity-100" : ""
    } ${coche ? "!border-brand-500 ring-2 ring-brand-500/20" : "hover:-translate-y-0.5"}`;

    if (modeSelection) {
      return (
        <button type="button" onClick={() => toggle(p.id)} className={`${base} card-interactive w-full cursor-pointer text-left`}>
          {contenu}
        </button>
      );
    }
    return (
      <Link href={`/projets/${p.id}`} className={`${base} card-interactive block`}>
        {contenu}
      </Link>
    );
  }

  return (
    <div>
      {plans && plans.total > 0 && (
        <Link
          href="/logiciel-plan-maison"
          className="group card card-interactive mb-5 flex items-center gap-3 px-4 py-3"
          data-bande-plans=""
          {...clicPlan("projets")}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
              <path d="M3.5 12h7v8.5M10.5 7.5v1.5M14 12h6.5M14 3.5V9" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">
              {plans.textes.bande} <span className="num font-normal text-faint">({plans.total})</span>
            </span>
            <span className="block text-[13px] text-muted">{plans.textes.bandeSous}</span>
          </span>
          <svg
            width="18" height="18" viewBox="0 0 18 18" fill="none"
            className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
            aria-hidden="true"
          >
            <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      {/* flex-wrap : sur mobile, les boutons passent à la ligne au lieu de faire défiler la page. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          {s.mesProjets} <span className="ml-1 text-sm font-normal text-faint">{projets.length}</span>
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {modeSelection && selection.size > 0 && (
            <>
              <button
                onClick={() => archiverSelection(!toutArchive)}
                disabled={!!busy}
                className="btn btn-outline py-1.5 text-[13px]"
              >
                {busy === "archive" ? "…" : <>{toutArchive ? s.desarchiver : s.archiver} ({selection.size})</>}
              </button>
              <button onClick={supprimerSelection} disabled={!!busy} className="btn btn-danger py-1.5 text-[13px]">
                {busy === "suppr" ? s.suppression : confirmSuppr ? (
                  <>
                    <span className="sm:hidden">{s.confirmerSupprCourt(selection.size)}</span>
                    <span className="hidden sm:inline">{s.confirmerSuppr(selection.size)}</span>
                  </>
                ) : s.supprimer(selection.size)}
              </button>
            </>
          )}
          {aDesProjets && (
            <button
              onClick={() => {
                setModeSelection(!modeSelection);
                setSelection(new Set());
                setConfirmSuppr(false);
                setErreur(null);
              }}
              disabled={!!busy}
              className="btn btn-ghost py-1.5 text-[13px]"
            >
              {modeSelection ? s.annuler : s.selectionner}
            </button>
          )}
          {!modeSelection && (
            <Link href="/projets/nouveau" className="btn btn-primary py-1.5 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              {s.nouveauProjet}
            </Link>
          )}
        </div>
      </div>

      {erreur && (
        <p role="alert" className="mb-4 rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {erreur}
        </p>
      )}

      {projets.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <IconBien type="maison" />
          </span>
          {/* Des projets archivés existent : ce n'est pas un « premier projet ». */}
          <div>
            <p className="font-semibold text-ink">{archives.length > 0 ? s.aucunActif : s.aucunProjet}</p>
            <p className="mt-1 text-sm text-muted">{archives.length > 0 ? s.aucunActifSub : s.aucunProjetSub}</p>
          </div>
          <Link href="/projets/nouveau" className="btn btn-primary mt-1 py-2.5">
            {archives.length > 0 ? s.nouveauProjet : s.estimerPremier}
          </Link>
          {plans && plans.total === 0 && (
            <Link href="/logiciel-plan-maison" className="text-sm font-medium text-brand-700 hover:underline" data-dessiner-plan="" {...clicPlan("projets")}>
              {plans.textes.dessiner}
            </Link>
          )}
        </div>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
          {projets.map((p) => (
            <li key={p.id}>
              <Carte p={p} />
            </li>
          ))}
        </ul>
      )}

      {archives.length > 0 && (
        <details className="group mt-6" open={projets.length === 0 || undefined}>
          <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-open:rotate-90" aria-hidden="true">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {s.projetsArchives} ({archives.length})
          </summary>
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {archives.map((p) => (
              <li key={p.id}>
                <Carte p={p} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

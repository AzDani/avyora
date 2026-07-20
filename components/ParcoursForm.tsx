"use client";

/**
 * Formulaire de création / édition de projet DATA-DRIVEN (brique 3 de la migration).
 * Remplace NouveauProjetForm : la structure du questionnaire vient de la base (parcours),
 * pas d'un JSX codé en dur. Le rendu est délégué à ParcoursRenderer ; ce composant gère
 * la navigation par étapes, les méta (nom/surface/CP/type de bien), l'auto-sauvegarde du
 * projet et la soumission. Le moteur d'estimation reste inchangé (contrat de bindings).
 *
 * L'ÉDITION de la structure (ajouter/masquer/réordonner des questions) se fait désormais
 * dans l'admin /admin/parcours, plus en surimpression du formulaire.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ParcoursRenderer, { type Reponses, type Meta } from "@/components/ParcoursRenderer";
import { reponsesParDefaut, type ParcoursComplet, type ParcoursDef } from "@/lib/parcours-schema";
import { estimer, type Reponses as ReponsesEstim } from "@/lib/estimation";
import AnimatedEuros from "@/components/AnimatedEuros";

/** Nom auto-généré si l'utilisateur n'en saisit pas (retire un champ requis du chemin critique). */
function nomAuto(meta: Meta): string {
  const t = meta.typeBien ? meta.typeBien.charAt(0).toUpperCase() + meta.typeBien.slice(1) : "Projet";
  const s = Number(meta.surface) > 0 ? ` · ${meta.surface} m²` : "";
  const cp = /^\d{5}$/.test(meta.codePostal) ? ` · ${meta.codePostal}` : "";
  return `${t}${s}${cp}`;
}

type EditData = {
  id: number | string;
  nom: string;
  typeBien: string;
  surface: number;
  codePostal: string;
  reponses: Record<string, unknown>;
};

/**
 * Auto-sauvegarde débouncée, SÉRIALISÉE (une requête à la fois, dans l'ordre), avec flush à la
 * fermeture/navigation. `send(keepalive)` lit l'état via des refs et renvoie null si rien ne peut
 * être envoyé (le composant reste alors « à sauver »). Repris du mécanisme éprouvé de l'ancien form.
 */
function useAutoSave(send: (keepalive: boolean) => Promise<boolean> | null, delay: number, deps: unknown[]) {
  const [etat, setEtat] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = useRef(false);
  const monte = useRef(false);
  const chaine = useRef<Promise<void>>(Promise.resolve());
  const sendRef = useRef(send);
  sendRef.current = send;

  const flush = (keepalive = false): Promise<void> => {
    chaine.current = chaine.current.then(async () => {
      if (!dirty.current) return;
      const req = sendRef.current(keepalive);
      if (!req) return;
      dirty.current = false;
      setEtat("saving");
      const ok = await req.catch(() => false);
      setEtat(ok ? "saved" : "idle");
      if (!ok) dirty.current = true;
    });
    return chaine.current;
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    if (!monte.current) { monte.current = true; return; } // pas de sauvegarde au montage
    dirty.current = true;
    const t = setTimeout(() => flushRef.current(), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const auRevoir = () => flushRef.current(true);
    window.addEventListener("pagehide", auRevoir);
    return () => { window.removeEventListener("pagehide", auRevoir); auRevoir(); };
  }, []);

  return { etat, flush };
}

/** Clé du brouillon anonyme (localStorage) : réclamé à l'inscription/connexion. */
export const DRAFT_KEY = "avyora:draft";

export default function ParcoursForm({
  parcours,
  edit,
  isAuthenticated = true,
}: {
  parcours: ParcoursComplet;
  edit?: EditData;
  isAuthenticated?: boolean;
}) {
  const router = useRouter();

  const typeInitial = edit?.reponses?.typeProjet === "neuf" ? "neuf" : "renovation";

  const [reponses, setReponses] = useState<Reponses>(() => {
    const base = parcours[typeInitial] ? reponsesParDefaut(parcours[typeInitial]!) : {};
    return { ...base, typeProjet: typeInitial, ...(edit?.reponses as Reponses | undefined) };
  });
  const [meta, setMetaState] = useState<Meta>({
    nom: edit?.nom ?? "",
    surface: edit ? String(edit.surface) : "",
    codePostal: edit?.codePostal ?? "",
    typeBien: edit?.typeBien ?? "appartement",
  });
  const [etape, setEtape] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeProjet = (reponses.typeProjet as string) === "neuf" ? "neuf" : "renovation";
  const def: ParcoursDef | null = parcours[typeProjet];

  // Écrit une réponse ; le changement de type de projet bascule le parcours + réinjecte ses défauts.
  const setReponse = (b: string, v: Reponses[string]) => {
    if (b === "typeProjet") {
      const t = v === "neuf" ? "neuf" : "renovation";
      const nouveau = parcours[t];
      setReponses((prev) => ({ ...(nouveau ? reponsesParDefaut(nouveau) : {}), ...prev, typeProjet: t }));
      setEtape(0);
      return;
    }
    setReponses((prev) => ({ ...prev, [b]: v }));
  };
  const setMeta = (k: keyof Meta, v: string) => setMetaState((p) => ({ ...p, [k]: v }));

  // Visiteur sans compte : restaure un brouillon local éventuel (progression conservée au reload).
  useEffect(() => {
    if (isAuthenticated || edit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { nom?: string; typeBien?: string; surface?: number; codePostal?: string; reponses?: Reponses };
      if (d.reponses) setReponses((prev) => ({ ...prev, ...d.reponses }));
      setMetaState((p) => ({
        nom: d.nom ?? p.nom,
        surface: d.surface != null ? String(d.surface) : p.surface,
        codePostal: d.codePostal ?? p.codePostal,
        typeBien: d.typeBien ?? p.typeBien,
      }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le nom n'est plus requis : auto-généré s'il est vide (moins de friction). Seuls surface + CP gouvernent.
  const etape1Valide = Number(meta.surface) > 5 && /^\d{5}$/.test(meta.codePostal.trim());

  // Estimation LIVE : le moteur est pur → on le fait tourner côté client à chaque réponse.
  const estLive = useMemo(() => {
    if (!etape1Valide) return null;
    try {
      return estimer(Number(meta.surface), meta.codePostal.trim(), reponses as unknown as ReponsesEstim, null, undefined);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reponses, meta.surface, meta.codePostal, etape1Valide]);

  // ── Auto-sauvegarde du projet : chaque changement est enregistré (débounce). ──
  // Dès l'étape 1 valide, le projet est créé ; ensuite chaque modification fait un PATCH.
  const projetIdRef = useRef<number | string | null>(edit?.id ?? null);
  const stateRef = useRef({ reponses, meta });
  stateRef.current = { reponses, meta };

  const metaValide = () => {
    const m = stateRef.current.meta;
    return Number(m.surface) > 5 && /^\d{5}$/.test(m.codePostal.trim());
  };
  const payloadProjet = () => {
    const m = stateRef.current.meta;
    return {
      nom: m.nom.trim() || nomAuto(m),
      typeBien: m.typeBien,
      surface: Number(m.surface),
      codePostal: m.codePostal.trim(),
      reponses: stateRef.current.reponses,
    };
  };

  const { etat: saveState, flush: flushProjet } = useAutoSave(
    (keepalive) => {
      if (!metaValide()) return null;
      // Visiteur sans compte : on garde le projet en BROUILLON local (aucune ligne anonyme en base).
      // Il sera réclamé après inscription/connexion (voir components/ClaimDraft).
      if (!isAuthenticated) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payloadProjet()));
        } catch {}
        return Promise.resolve(true);
      }
      const id = projetIdRef.current;
      if (id) {
        return fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadProjet()),
          keepalive,
        }).then((r) => r.ok);
      }
      return fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadProjet()),
      }).then(async (r) => {
        if (!r.ok) return false;
        projetIdRef.current = (await r.json()).id;
        return true;
      });
    },
    800,
    [reponses, meta]
  );

  async function creer() {
    setSaving(true);
    setError(null);
    // Sans compte : on fige le brouillon et on envoie vers l'inscription (le projet sera réclamé ensuite).
    if (!isAuthenticated) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payloadProjet()));
      } catch {}
      router.push("/inscription?next=/mon-espace");
      return;
    }
    await flushProjet();
    const id = projetIdRef.current;
    if (id) {
      router.push(`/projets/${id}`);
      router.refresh();
    } else {
      setError(edit ? "Impossible d'enregistrer les modifications." : "Impossible de créer le projet. Réessaie.");
      setSaving(false);
    }
  }

  const nbEtapes = def?.steps.length ?? 1;
  const etapeCourante = Math.min(etape, nbEtapes - 1);
  const derniere = etapeCourante >= nbEtapes - 1;

  const enregistrable = useMemo(() => etape1Valide, [etape1Valide]);

  if (!def) return <p className="text-sm text-danger">Parcours introuvable. Recharge la page.</p>;

  const neuf = typeProjet === "neuf";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Colonne principale */}
      <div className="min-w-0 space-y-5">
        {/* Bandeau estimation live — mobile (collant sous le header) */}
        {estLive && (
          <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-canvas/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Estimation en direct</span>
              <span className="data text-sm font-semibold text-ink">
                <AnimatedEuros value={estLive.totalBas} /> <span className="text-faint">–</span>{" "}
                <AnimatedEuros value={estLive.totalHaut} />
              </span>
            </div>
          </div>
        )}

        {/* Stepper + auto-save */}
        <div className="flex items-center gap-4">
          <ol className="flex flex-1 items-center">
            {def.steps.map((s, i) => {
              const fait = i < etapeCourante;
              const courant = i === etapeCourante;
              const last = i === def.steps.length - 1;
              return (
                <li key={s.id} className={`flex items-center ${last ? "" : "flex-1"}`}>
                  <button
                    type="button"
                    title={s.titre}
                    onClick={() => i <= etapeCourante && setEtape(i)}
                    disabled={i > etapeCourante}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-all duration-200 ${
                      fait
                        ? "border-brand-600 bg-brand-600 text-white"
                        : courant
                          ? "border-brand-600 bg-brand-50 text-brand-700 ring-4 ring-brand-500/15"
                          : "border-line-strong bg-surface text-faint"
                    } ${i <= etapeCourante ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {fait ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </button>
                  {!last && (
                    <div className="mx-2 h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: fait ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <SaveIndicator state={saveState} />
        </div>

        {/* Progression sémantique — encouragement */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-muted">
            Étape <span className="num">{etapeCourante + 1}</span> sur <span className="num">{nbEtapes}</span>
          </span>
          <span className="font-medium text-brand-600">
            {derniere
              ? "Dernière étape — presque fini 🎉"
              : etapeCourante === 0
                ? "≈ 2 min · sans compte"
                : `Plus que ${nbEtapes - etapeCourante - 1} étape${nbEtapes - etapeCourante - 1 > 1 ? "s" : ""}`}
          </span>
        </div>

        <ParcoursRenderer
          parcours={def}
          etape={etapeCourante}
          reponses={reponses}
          meta={meta}
          setReponse={setReponse}
          setMeta={setMeta}
        />

        {etapeCourante === 0 && !etape1Valide && (
          <p className="flex items-start gap-2 text-xs text-muted">
            <span className="mt-px text-brand-500">ⓘ</span>
            Indique une surface (&gt; 5 m²) et un code postal à 5 chiffres pour voir ton estimation apparaître.
          </p>
        )}

        <div className="flex gap-3">
          {etapeCourante > 0 && (
            <button onClick={() => setEtape((e) => Math.max(0, e - 1))} className="btn btn-outline flex-1 py-3">
              Retour
            </button>
          )}
          {!derniere ? (
            <button
              onClick={() => setEtape((e) => Math.min(nbEtapes - 1, e + 1))}
              disabled={etapeCourante === 0 && !etape1Valide}
              className="btn btn-primary flex-1 py-3"
            >
              Continuer
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button onClick={creer} disabled={saving || !enregistrable} className="btn btn-primary flex-1 py-3">
              {saving ? (
                "Calcul en cours…"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 1.5 9.6 5.4 13.8 5.7 10.6 8.5 11.6 12.6 8 10.3 4.4 12.6 5.4 8.5 2.2 5.7 6.4 5.4z" fill="currentColor" opacity="0.9" />
                  </svg>
                  {edit
                    ? "Enregistrer les modifications"
                    : isAuthenticated
                      ? "Obtenir mon estimation"
                      : "Créer un compte pour enregistrer"}
                </>
              )}
            </button>
          )}
        </div>
        {!edit && !isAuthenticated && enregistrable && (
          <p className="text-xs leading-relaxed text-muted">
            Ton estimation est prête et affichée en direct. Crée un compte gratuit pour
            l&apos;enregistrer, la retrouver et suivre ton chantier — ton projet est conservé.
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Récapitulatif collant (desktop) */}
      <aside className="hidden lg:block">
        <div className="card sticky top-24 space-y-4 p-5">
          {/* Estimation en direct — la récompense, montrée tôt et en continu */}
          <div>
            <p className="eyebrow">Estimation en direct</p>
            {estLive ? (
              <>
                <div className="data mt-1.5 text-xl font-semibold text-ink">
                  <AnimatedEuros value={estLive.totalBas} /> <span className="text-faint">–</span>{" "}
                  <AnimatedEuros value={estLive.totalHaut} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {estLive.mode === "detaille" ? "Précision ±15 %" : "S'affine à chaque réponse"} ·{" "}
                  <span className="num">{estLive.dureeSemaines[0]}–{estLive.dureeSemaines[1]} sem.</span>
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Renseigne surface et code postal — ton estimation apparaîtra ici et se précisera à chaque réponse.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="badge-brand">{neuf ? "Construction neuve" : "Rénovation"}</span>
            {meta.typeBien && <span className="chip capitalize">{meta.typeBien}</span>}
            {Number(meta.surface) > 0 && <span className="chip num">{meta.surface} m²</span>}
            {/^\d{5}$/.test(meta.codePostal) && <span className="chip num">{meta.codePostal}</span>}
          </div>

          {/* Insight expert le plus récent (remonté du moteur, réagit aux réponses) */}
          {estLive && estLive.conseils.length > 0 && <InsightLive conseils={estLive.conseils} />}

          <div className="h-px bg-line" />

          <ol className="space-y-2.5">
            {def.steps.map((s, i) => {
              const fait = i < etapeCourante;
              const courant = i === etapeCourante;
              return (
                <li key={s.id} className="flex items-center gap-2.5">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      fait ? "bg-brand-600 text-white" : courant ? "bg-brand-100 text-brand-700" : "bg-surface-2 text-faint"
                    }`}
                  >
                    {fait ? "✓" : i + 1}
                  </span>
                  <span className={`text-[13px] ${courant ? "font-medium text-ink" : fait ? "text-muted" : "text-faint"}`}>
                    {s.titre}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}

/** Remonte le conseil expert le plus récent du moteur, ré-animé quand il change (encouragement contextuel). */
function InsightLive({ conseils }: { conseils: string[] }) {
  const dernier = conseils[conseils.length - 1];
  const extrait = dernier.length > 150 ? dernier.slice(0, 150).trimEnd() + "…" : dernier;
  return (
    <div key={dernier} className="animate-fade rounded-field border border-brand-100 bg-brand-50/60 p-3">
      <p className="flex gap-2 text-xs leading-relaxed text-brand-900">
        <span aria-hidden className="shrink-0">💡</span>
        <span>{extrait}</span>
      </p>
      {conseils.length > 1 && (
        <p className="mt-1.5 pl-6 text-[11px] font-medium text-brand-600">
          +{conseils.length - 1} autre{conseils.length > 2 ? "s" : ""} point{conseils.length > 2 ? "s" : ""} d&apos;expertise dans ton estimation
        </p>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return <span className="min-w-[104px]" />;
  return (
    <span className="inline-flex min-w-[104px] shrink-0 items-center justify-end gap-1.5 text-xs text-muted">
      {state === "saving" ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
          Enregistrement…
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-positive" aria-hidden="true">
            <path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Enregistré
        </>
      )}
    </span>
  );
}

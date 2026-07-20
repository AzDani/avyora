"use client";

/**
 * Aperçu du parcours DATA-DRIVEN (Palier 1) — ne remplace pas encore le formulaire live.
 * Charge la définition depuis la base, la rend via ParcoursRenderer, et calcule l'estimation
 * en direct avec le MÊME moteur `estimer()` → preuve de parité de bout en bout.
 */
import { useEffect, useMemo, useState } from "react";
import ParcoursRenderer, { type Reponses, type Meta } from "@/components/ParcoursRenderer";
import EstimationTable from "@/components/EstimationTable";
import { estimer, type Reponses as ReponsesMoteur } from "@/lib/estimation";
import { reponsesParDefaut, type ParcoursComplet } from "@/lib/parcours-schema";

export default function ParcoursPreview() {
  const [pc, setPc] = useState<ParcoursComplet | null>(null);
  const [reponses, setReponses] = useState<Reponses>({ typeProjet: "renovation", modeEstimation: "detaille" });
  const [meta, setMetaState] = useState<Meta>({ nom: "", surface: "80", codePostal: "33000", typeBien: "maison" });
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    fetch("/api/admin/parcours")
      .then((r) => r.json())
      .then((d: { parcours: ParcoursComplet }) => {
        setPc(d.parcours);
        // Initialise les réponses avec les défauts du parcours réno (état de départ du formulaire).
        if (d.parcours.renovation)
          setReponses((prev) => ({ ...reponsesParDefaut(d.parcours.renovation!), ...prev }));
      });
  }, []);

  const setReponse = (b: string, v: Reponses[string]) => setReponses((p) => ({ ...p, [b]: v }));
  const setMeta = (k: keyof Meta, v: string) => setMetaState((p) => ({ ...p, [k]: v }));

  const typeProjet = (reponses.typeProjet as string) === "neuf" ? "neuf" : "renovation";
  const parcours = pc?.[typeProjet] ?? null;

  const est = useMemo(() => {
    const surface = Number(meta.surface) || 0;
    if (surface <= 0) return null;
    try {
      return estimer(surface, meta.codePostal, reponses as unknown as ReponsesMoteur, null, undefined);
    } catch (e) {
      return { erreur: (e as Error).message };
    }
  }, [reponses, meta.surface, meta.codePostal]);

  if (!pc) return <div className="p-8 text-sm text-slate-500">Chargement du parcours…</div>;
  if (!parcours) return <div className="p-8 text-sm text-slate-500">Parcours introuvable.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
        Aperçu data-driven (Palier 1) — le formulaire officiel n'est pas encore remplacé.
      </div>

      {/* Barre d'étapes */}
      <div className="mb-4 flex gap-1.5">
        {parcours.steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setEtape(i)}
            className={`h-1.5 flex-1 rounded-full ${i === etape ? "bg-indigo-500" : i < etape ? "bg-indigo-300" : "bg-slate-200"}`}
            title={s.titre}
          />
        ))}
      </div>

      <ParcoursRenderer
        parcours={parcours}
        etape={etape}
        reponses={reponses}
        meta={meta}
        setReponse={setReponse}
        setMeta={setMeta}
      />

      <div className="mt-4 flex gap-3">
        <button
          disabled={etape === 0}
          onClick={() => setEtape((e) => Math.max(0, e - 1))}
          className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium disabled:opacity-40"
        >
          Retour
        </button>
        <button
          disabled={etape >= parcours.steps.length - 1}
          onClick={() => setEtape((e) => Math.min(parcours.steps.length - 1, e + 1))}
          className="flex-1 rounded-lg bg-slate-900 py-2.5 text-white font-medium disabled:opacity-40"
        >
          Continuer
        </button>
      </div>

      {/* Estimation live */}
      <div className="mt-8">
        <h2 className="mb-2 font-medium">Estimation (moteur inchangé)</h2>
        {est == null ? (
          <p className="text-sm text-slate-400">Renseigne une surface pour estimer.</p>
        ) : "erreur" in est ? (
          <p className="text-sm text-red-600">Erreur moteur : {est.erreur}</p>
        ) : (
          <EstimationTable est={est} />
        )}
      </div>
    </div>
  );
}

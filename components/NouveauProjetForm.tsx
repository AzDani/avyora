"use client";

import { useState, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_VIDE, type FormConfig, type BuiltinCustom, type CustomOption } from "@/lib/customq";

type Choix = { value: string; label: string; hint?: string };

type EditCtxType = {
  perso: boolean;
  builtinOf: (label: string) => BuiltinCustom;
  hideOption: (label: string, value: string) => void;
  unhideOption: (label: string, value: string) => void;
  addOption: (label: string) => void;
  updateOption: (label: string, id: string, patch: Partial<CustomOption>) => void;
  removeOption: (label: string, id: string) => void;
  answers: Record<string, string | string[] | number | boolean>;
  toggleAdded: (id: string) => void;
  isEditing: (id: string) => boolean;
  setEditing: (id: string, on: boolean) => void;
};
const EditCtx = createContext<EditCtxType | null>(null);

async function suggererPrix(libelle: string): Promise<number | null> {
  try {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: libelle }),
    });
    const d = await res.json();
    return d.suggestion?.prix ?? null;
  } catch {
    return null;
  }
}

function AddedOptionEdit({ label, o }: { label: string; o: CustomOption }) {
  const ctx = useContext(EditCtx)!;
  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/40 rounded-lg px-2 py-1.5">
      <input
        className="flex-1 min-w-28 rounded border border-slate-200 px-2 py-1 text-sm"
        value={o.label}
        placeholder="Réponse"
        onChange={(e) => ctx.updateOption(label, o.id, { label: e.target.value })}
      />
      <input
        type="number"
        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm text-right"
        value={o.prix || ""}
        placeholder="prix"
        onChange={(e) => ctx.updateOption(label, o.id, { prix: Number(e.target.value) || 0 })}
      />
      <button
        type="button"
        title="Suggérer un prix depuis la base"
        onClick={async () => {
          const p = await suggererPrix(o.label);
          if (p) ctx.updateOption(label, o.id, { prix: p });
        }}
        className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-500 hover:text-indigo-600"
      >
        ≈
      </button>
      <select
        className="rounded border border-slate-200 px-1 py-1 text-xs"
        value={o.mode}
        onChange={(e) => ctx.updateOption(label, o.id, { mode: e.target.value as CustomOption["mode"] })}
      >
        <option value="forfait">€ forfait</option>
        <option value="m2">€/m²</option>
      </select>
      <button
        type="button"
        disabled={!o.label.trim()}
        onClick={() => ctx.setEditing(o.id, false)}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-600 disabled:opacity-40"
      >
        ✓ Valider
      </button>
      <button type="button" onClick={() => ctx.removeOption(label, o.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Retirer">✕</button>
    </div>
  );
}

function ChoixGroupe({
  label,
  choix,
  value,
  onChange,
}: {
  label: string;
  choix: Choix[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ctx = useContext(EditCtx);
  const bc = ctx?.builtinOf(label) ?? { hidden: [], added: [] };
  const perso = ctx?.perso ?? false;
  const visibles = choix.filter((c) => !bc.hidden.includes(c.value));

  const addedValides = bc.added.filter((o) => !ctx?.isEditing(o.id));
  const addedEnEdition = bc.added.filter((o) => ctx?.isEditing(o.id));

  return (
    <div>
      <div className="text-sm font-medium mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {visibles.map((c) => (
          <span key={c.value} className="relative inline-flex">
            <button
              type="button"
              onClick={() => onChange(c.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                value === c.value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              title={c.hint}
            >
              {c.label}
            </button>
            {perso && (
              <button
                type="button"
                onClick={() => ctx!.hideOption(label, c.value)}
                className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] leading-none flex items-center justify-center ring-2 ring-white shadow-sm hover:bg-red-600"
                aria-label={`Retirer ${c.label}`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {/* Réponses ajoutées validées : pastilles au milieu des autres */}
        {addedValides.map((o) => {
          const sel = !!ctx?.answers[o.id];
          return (
            <span key={o.id} className="relative inline-flex">
              <button
                type="button"
                onClick={() => (perso ? ctx?.setEditing(o.id, true) : ctx?.toggleAdded(o.id))}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  !perso && sel
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={perso ? "Cliquer pour modifier" : undefined}
              >
                {o.label}
                {o.prix > 0 && <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span>}
              </button>
              {perso && (
                <button
                  type="button"
                  onClick={() => ctx!.removeOption(label, o.id)}
                  className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] leading-none flex items-center justify-center ring-2 ring-white shadow-sm hover:bg-red-600"
                  aria-label={`Retirer ${o.label}`}
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      {/* Masquées : possibilité de réafficher en mode perso */}
      {perso && bc.hidden.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {choix
            .filter((c) => bc.hidden.includes(c.value))
            .map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => ctx!.unhideOption(label, c.value)}
                className="rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-400 line-through hover:text-slate-600"
              >
                {c.label} ↺
              </button>
            ))}
        </div>
      )}
      {/* Lignes de saisie : uniquement pour les réponses en cours de création */}
      {perso && (
        <div className="mt-1.5 space-y-1.5">
          {addedEnEdition.map((o) => (
            <AddedOptionEdit key={o.id} label={label} o={o} />
          ))}
          <button
            type="button"
            onClick={() => ctx!.addOption(label)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs text-[#4F46E5] font-medium hover:bg-indigo-100/60"
          >
            + Ajouter une réponse
          </button>
        </div>
      )}
    </div>
  );
}

type EditData = {
  id: number;
  nom: string;
  typeBien: string;
  surface: number;
  codePostal: string;
  reponses: Record<string, unknown>;
};

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function NouveauProjetForm({
  edit,
  formConfig = CONFIG_VIDE,
}: {
  edit?: EditData;
  formConfig?: FormConfig;
}) {
  const router = useRouter();
  const [perso, setPerso] = useState(false);
  const [config, setConfig] = useState<FormConfig>(formConfig);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const setEditing = (id: string, on: boolean) =>
    setEditingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  function commit(updater: (prev: FormConfig) => FormConfig) {
    setConfig((prev) => {
      const next = updater(prev);
      queueMicrotask(() =>
        fetch("/api/questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: next }),
        })
      );
      return next;
    });
  }
  function builtinOf(label: string): BuiltinCustom {
    return config.builtin[label] ?? { hidden: [], added: [], corps: "divers" };
  }
  function updateBuiltin(label: string, fn: (bc: BuiltinCustom) => BuiltinCustom) {
    commit((prev) => {
      const bc = prev.builtin[label] ?? { hidden: [], added: [], corps: "divers" };
      return { ...prev, builtin: { ...prev.builtin, [label]: fn(bc) } };
    });
  }
  const [etape, setEtape] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState(edit?.nom ?? "");
  const [typeBien, setTypeBien] = useState(edit?.typeBien ?? "appartement");
  const [surface, setSurface] = useState(edit ? String(edit.surface) : "");
  const [codePostal, setCodePostal] = useState(edit?.codePostal ?? "");

  const [r, setR] = useState({
    typeProjet: "renovation",
    finition: "locatif",
    curage: "aucun",
    electricite: "ok",
    plomberie: "ok",
    sdb: "aucune",
    cuisine: "aucune",
    sols: "aucun",
    solsType: "stratifie",
    peinture: "complete",
    fenetres: 0,
    cloisons: "aucune",
    chauffage: "aucun",
    vmc: false,
    solSupport: "dalle_ok",
    mursEtat: "ok",
    humidite: false,
    gammeNeuf: "standard",
    garageM2: 0,
    terrainAViabiliser: false,
    modeEstimation: "rapide",
    chapeType: "traditionnelle",
    carrelageFormat: "standard",
    menuiserieMateriau: "pvc",
    cuisineGamme: "milieu",
    sdbCarrelageTouteHauteur: false,
    sdbWc: "suspendu",
    sdbVasque: "simple",
    sdbDouche: "standard",
    sdbPlomberie: "encastree",
    sdbSecheServiettes: true,
    nbChambres: 3,
    nbSdb: 1,
    nbWc: 1,
    niveaux: "plain_pied",
    terrasseM2: 0,
    cuisineIncluse: false,
    dpe: "inconnu",
    anneeConstruction: "inconnue",
    ecs: "inchange",
    cellier: false,
    buanderie: false,
    facadeAFaire: false,
    murExtType: "parpaing",
    murExtEtat: "bon",
    facadeReno: "peinture",
    facadeM2: 0,
    assainissement: "raccorde",
    cloisonMlManuel: 0,
    plintheMateriau: "assorti",
    porteEntree: "aucune",
    nbPortesInt: 0,
    menuiserieMateriauFenetre: "pvc",
    reseauxEvac: false,
    nouvelleSurfaceM2: 0,
    plancherType: "bois",
    doublageMl: 0,
    isolantType: "laine_verre",
    isolantEpaisseur: 120,
    nbVmc: 1,
    vmcType: "simple",
    voletRoulant: false,
    voletType: "electrique",
    alimElec: false,
    alimEau: false,
    alimGaz: false,
    solsDetail: [] as { type: string; m2: number }[],
    spotsLumieres: "non",
    nbPointsLumineux: 0,
    custom: {} as Record<string, string | string[] | number | boolean>,
    sdbConfigs: [] as {
      surface: number;
      douche: string;
      wc: string;
      vasque: string;
      plomberie: string;
      faienceTouteHauteur: boolean;
      secheServiettes: boolean;
    }[],
    ...(edit?.reponses ?? {}),
  });

  const detaille = r.modeEstimation === "detaille";

  const set = (k: string, v: string | number | boolean) =>
    setR((prev) => ({ ...prev, [k]: v }));

  type SdbCfg = {
    surface: number;
    douche: string;
    wc: string;
    vasque: string;
    plomberie: string;
    faienceTouteHauteur: boolean;
    secheServiettes: boolean;
  };
  const sdbDefaut = (): SdbCfg => ({
    surface: 0,
    douche: "standard",
    wc: "suspendu",
    vasque: "simple",
    plomberie: "encastree",
    faienceTouteHauteur: false,
    secheServiettes: true,
  });
  const sdbConfigs = (r.sdbConfigs as SdbCfg[] | undefined) ?? [];
  const setNbSdb = (n: number) =>
    setR((prev) => {
      const cur = ((prev.sdbConfigs as SdbCfg[] | undefined) ?? []).slice();
      while (cur.length < n) cur.push(sdbDefaut());
      cur.length = Math.max(0, n);
      return { ...prev, sdbConfigs: cur, nbSdb: n };
    });
  const updateSdb = (i: number, key: keyof SdbCfg, v: string | number | boolean) =>
    setR((prev) => {
      const cur = ((prev.sdbConfigs as SdbCfg[] | undefined) ?? []).slice();
      cur[i] = { ...cur[i], [key]: v };
      return { ...prev, sdbConfigs: cur };
    });

  const customRep = r.custom as Record<string, string | string[] | number | boolean>;
  const setCustom = (qid: string, v: string | string[] | number | boolean) =>
    setR((prev) => ({ ...prev, custom: { ...(prev.custom as object), [qid]: v } }));
  const toggleMultiple = (qid: string, optId: string) =>
    setR((prev) => {
      const cur = (((prev.custom as Record<string, unknown>)[qid] as string[]) ?? []).slice();
      const idx = cur.indexOf(optId);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(optId);
      return { ...prev, custom: { ...(prev.custom as object), [qid]: cur } };
    });

  // Handlers config (options ajoutées / masquées sur les questions intégrées)
  const editCtx: EditCtxType = {
    perso,
    builtinOf,
    hideOption: (label, value) => updateBuiltin(label, (bc) => ({ ...bc, hidden: [...bc.hidden, value] })),
    unhideOption: (label, value) => updateBuiltin(label, (bc) => ({ ...bc, hidden: bc.hidden.filter((v) => v !== value) })),
    addOption: (label) => {
      const id = uid();
      updateBuiltin(label, (bc) => ({ ...bc, added: [...bc.added, { id, label: "", prix: 0, mode: "forfait" }] }));
      setEditing(id, true);
    },
    updateOption: (label, id, patch) => updateBuiltin(label, (bc) => ({ ...bc, added: bc.added.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    removeOption: (label, id) => {
      updateBuiltin(label, (bc) => ({ ...bc, added: bc.added.filter((o) => o.id !== id) }));
      setEditing(id, false);
    },
    answers: customRep,
    toggleAdded: (id) => setCustom(id, !customRep[id]),
    isEditing: (id) => editingIds.has(id),
    setEditing,
  };

  // Handlers questions personnalisées (standalone) — mises à jour fonctionnelles
  const mapQuestions = (fn: (qs: FormConfig["questions"]) => FormConfig["questions"]) =>
    commit((prev) => ({ ...prev, questions: fn(prev.questions) }));
  const addQuestion = (section: 1 | 2 | 3) =>
    mapQuestions((qs) => [
      ...qs,
      { id: uid(), section, label: "Nouvelle question", type: "unique", corps: "divers", ordre: qs.length, options: [{ id: uid(), label: "Réponse 1", prix: 0, mode: "forfait" }] },
    ]);
  const updateQuestion = (id: string, patch: Partial<FormConfig["questions"][number]>) =>
    mapQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQuestion = (id: string) => mapQuestions((qs) => qs.filter((q) => q.id !== id));
  const addQOption = (qid: string) =>
    mapQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: [...q.options, { id: uid(), label: "Réponse", prix: 0, mode: "forfait" }] } : q)));
  const updateQOption = (qid: string, oid: string, patch: Partial<CustomOption>) =>
    mapQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) } : q)));
  const removeQOption = (qid: string, oid: string) =>
    mapQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.filter((o) => o.id !== oid) } : q)));

  function QuestionsCustom({ section }: { section: 1 | 2 | 3 }) {
    const qs = config.questions.filter((q) => q.section === section);
    return (
      <>
        {qs.map((q) =>
          perso ? (
            <div key={q.id} className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input className="flex-1 min-w-36 rounded border border-slate-300 px-2 py-1.5 text-sm font-medium" value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
                <select className="rounded border border-slate-300 px-1.5 py-1.5 text-xs" value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as FormConfig["questions"][number]["type"] })}>
                  <option value="unique">choix unique</option>
                  <option value="multiple">choix multiple</option>
                  <option value="nombre">nombre × prix</option>
                </select>
                <button type="button" onClick={() => removeQuestion(q.id)} className="text-xs text-red-500">Retirer la question</button>
              </div>
              <div className="pl-2 border-l-2 border-indigo-100 space-y-1.5">
                {(q.type === "nombre" ? q.options.slice(0, 1) : q.options).map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-1.5">
                    <input className="flex-1 min-w-24 rounded border border-slate-200 px-2 py-1 text-sm" placeholder={q.type === "nombre" ? "unité (ex. spot)" : "réponse"} value={o.label} onChange={(e) => updateQOption(q.id, o.id, { label: e.target.value })} />
                    <input type="number" className="w-20 rounded border border-slate-200 px-2 py-1 text-sm text-right" placeholder="prix" value={o.prix || ""} onChange={(e) => updateQOption(q.id, o.id, { prix: Number(e.target.value) || 0 })} />
                    {q.type !== "nombre" && (
                      <select className="rounded border border-slate-200 px-1 py-1 text-xs" value={o.mode} onChange={(e) => updateQOption(q.id, o.id, { mode: e.target.value as CustomOption["mode"] })}>
                        <option value="forfait">€ forfait</option>
                        <option value="m2">€/m²</option>
                      </select>
                    )}
                    {q.type !== "nombre" && q.options.length > 1 && (
                      <button type="button" onClick={() => removeQOption(q.id, o.id)} className="text-xs text-slate-400 hover:text-red-600">✕</button>
                    )}
                  </div>
                ))}
                {q.type !== "nombre" && (
                  <button type="button" onClick={() => addQOption(q.id)} className="text-xs text-[#4F46E5] font-medium">+ Réponse</button>
                )}
              </div>
            </div>
          ) : (
            <div key={q.id}>
              <div className="text-sm font-medium mb-1.5">{q.label}</div>
              {q.type === "nombre" ? (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={(customRep[q.id] as number) ?? 0} onChange={(e) => setCustom(q.id, Number(e.target.value) || 0)} />
                  <span className="text-xs text-slate-400">{q.options[0]?.label} ({q.options[0]?.prix} € / unité)</span>
                </div>
              ) : q.type === "multiple" ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const sel = ((customRep[q.id] as string[]) ?? []).includes(o.id);
                    return (
                      <button key={o.id} type="button" onClick={() => toggleMultiple(q.id, o.id)} className={`rounded-lg border px-3 py-2 text-sm ${sel ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                        {o.label}{o.prix > 0 && <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button key={o.id} type="button" onClick={() => setCustom(q.id, customRep[q.id] === o.id ? "" : o.id)} className={`rounded-lg border px-3 py-2 text-sm ${customRep[q.id] === o.id ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      {o.label}{o.prix > 0 && <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {perso && (
          <button type="button" onClick={() => addQuestion(section)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-sm text-[#4F46E5] font-medium hover:bg-indigo-100/60">
            + Ajouter une question
          </button>
        )}
      </>
    );
  }

  const etape1Valide =
    nom.trim().length > 0 &&
    Number(surface) > 5 &&
    /^\d{5}$/.test(codePostal.trim());

  async function creer() {
    setSaving(true);
    setError(null);
    const payload = {
      nom: nom.trim(),
      typeBien,
      surface: Number(surface),
      codePostal: codePostal.trim(),
      reponses: r,
    };
    try {
      if (edit) {
        const res = await fetch(`/api/projects/${edit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erreur serveur");
        router.push(`/projets/${edit.id}`);
        router.refresh();
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erreur serveur");
        const { id } = await res.json();
        router.push(`/projets/${id}`);
      }
    } catch {
      setError(edit ? "Impossible d'enregistrer les modifications." : "Impossible de créer le projet. Réessaie.");
      setSaving(false);
    }
  }

  return (
    <EditCtx.Provider value={editCtx}>
    <div className={`space-y-6 ${perso ? "rounded-2xl ring-2 ring-[#A78BFA]/50 ring-offset-4 ring-offset-slate-50" : ""}`}>
      {perso && (
        <div className="sticky top-2 z-30 rounded-2xl bg-[#1E1B4B] text-white px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-indigo-900/20">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#A78BFA] font-semibold">
              Mode personnalisation
            </div>
            <div className="text-sm text-indigo-100/90 mt-0.5">
              Retire, renomme ou ajoute tes questions et réponses.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPerso(false)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white text-[#1E1B4B] px-4 py-2 text-sm font-semibold hover:bg-indigo-50"
          >
            ✓ Terminer
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= etape ? "bg-indigo-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        {!perso && (
          <button
            type="button"
            onClick={() => setPerso(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
          >
            ✎ Personnaliser
          </button>
        )}
      </div>
      {perso && (
        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
          Croix rouge pour retirer une réponse · « + réponse » pour en créer une (avec son prix, ou
          « ≈ » pour le suggérer) · « + question » en bas de chaque étape. Prix laissé vide = à
          chiffrer plus tard. Tes réglages valent pour tous tes projets.
        </p>
      )}

      {etape === 1 && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">1 · Le projet</h2>
          <ChoixGroupe
            label="Type de projet"
            choix={[
              { value: "renovation", label: "Rénovation" },
              { value: "neuf", label: "Construction neuve" },
            ]}
            value={r.typeProjet}
            onChange={(v) => set("typeProjet", v)}
          />
          <ChoixGroupe
            label="Niveau d'estimation"
            choix={[
              { value: "rapide", label: "Rapide", hint: "quelques questions, fourchette large" },
              { value: "detaille", label: "Détaillée (±15 %)", hint: "plus de questions, fourchette resserrée" },
            ]}
            value={r.modeEstimation}
            onChange={(v) => set("modeEstimation", v)}
          />
          <div>
            <label className="text-sm font-medium">Nom du projet</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex. : T2 rue de la République"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <ChoixGroupe
            label="Type de bien"
            choix={[
              { value: "appartement", label: "Appartement" },
              { value: "maison", label: "Maison" },
              { value: "immeuble", label: "Immeuble" },
            ]}
            value={typeBien}
            onChange={setTypeBien}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Surface actuelle (m²)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="45"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Surface existante, sans les travaux. Si tu crées de la surface
                (extension), tu l&apos;ajouteras à l&apos;étape suivante.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Code postal</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="69003"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
              />
            </div>
          </div>
          <QuestionsCustom section={1} />
          <button
            disabled={!etape1Valide}
            onClick={() => setEtape(2)}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-white font-medium disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      )}

      {etape === 2 && r.typeProjet === "neuf" && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">2 · Ta construction</h2>
          <ChoixGroupe
            label="Niveau de gamme"
            choix={[
              { value: "entree", label: "Entrée de gamme", hint: "~1 400-1 800 €/m²" },
              { value: "standard", label: "Standard", hint: "~1 800-2 300 €/m²" },
              { value: "haut", label: "Haut de gamme", hint: "~2 300-3 200 €/m²" },
              { value: "luxe", label: "Prestige / luxe", hint: "~3 200-5 000 €/m²" },
            ]}
            value={r.gammeNeuf}
            onChange={(v) => set("gammeNeuf", v)}
          />
          <ChoixGroupe
            label="Le terrain est-il déjà viabilisé ?"
            choix={[
              { value: "oui", label: "Oui, viabilisé" },
              { value: "non", label: "Non", hint: "terrassement + raccordements à prévoir" },
            ]}
            value={r.terrainAViabiliser ? "non" : "oui"}
            onChange={(v) => set("terrainAViabiliser", v === "non")}
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Chambres</label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbChambres} onChange={(e) => set("nbChambres", Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium">Salles de bain</label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbSdb} onChange={(e) => set("nbSdb", Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm font-medium">Garage (m²)</label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.garageM2} onChange={(e) => set("garageM2", Number(e.target.value) || 0)} />
            </div>
          </div>
          {detaille && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">WC (total)</label>
                  <input type="number" min={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbWc} onChange={(e) => set("nbWc", Number(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Terrasse (m², 0 si aucune)</label>
                  <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.terrasseM2} onChange={(e) => set("terrasseM2", Number(e.target.value) || 0)} />
                </div>
              </div>
              <ChoixGroupe
                label="Configuration"
                choix={[
                  { value: "plain_pied", label: "Plain-pied" },
                  { value: "etage", label: "À étage (R+1)" },
                ]}
                value={r.niveaux}
                onChange={(v) => set("niveaux", v)}
              />
              <ChoixGroupe
                label="Menuiseries extérieures"
                choix={[
                  { value: "pvc", label: "PVC" },
                  { value: "alu", label: "Aluminium" },
                  { value: "bois", label: "Bois" },
                ]}
                value={r.menuiserieMateriau}
                onChange={(v) => set("menuiserieMateriau", v)}
              />
              <ChoixGroupe
                label="Cuisine équipée incluse dans le budget ?"
                choix={[
                  { value: "non", label: "Non" },
                  { value: "oui", label: "Oui" },
                ]}
                value={r.cuisineIncluse ? "oui" : "non"}
                onChange={(v) => set("cuisineIncluse", v === "oui")}
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={r.cellier} onChange={(e) => set("cellier", e.target.checked)} />
                  Cellier
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={r.buanderie} onChange={(e) => set("buanderie", e.target.checked)} />
                  Buanderie (arrivée + évacuation)
                </label>
              </div>
            </>
          )}
          <ChoixGroupe
            label="Eau chaude sanitaire"
            choix={[
              { value: "inchange", label: "Standard incluse", hint: "ballon élec. dans le prix au m²" },
              { value: "thermo", label: "Thermodynamique", hint: "surcoût, éligible aides" },
              { value: "solaire", label: "Solaire (CESI)", hint: "surcoût" },
            ]}
            value={r.ecs}
            onChange={(v) => set("ecs", v)}
          />
          <ChoixGroupe
            label="Assainissement"
            choix={[
              { value: "tout_egout", label: "Tout-à-l'égout", hint: "raccordement au réseau" },
              { value: "individuel_fosse", label: "Fosse toutes eaux" },
              { value: "individuel_micro", label: "Microstation" },
            ]}
            value={r.assainissement === "raccorde" ? "tout_egout" : r.assainissement}
            onChange={(v) => set("assainissement", v)}
          />
          <div className="flex gap-3">
            <button onClick={() => setEtape(1)} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium">
              Retour
            </button>
            <button
              onClick={creer}
              disabled={saving}
              className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-white font-medium disabled:opacity-50"
            >
              {saving
                ? "Calcul en cours…"
                : edit
                  ? "Enregistrer les modifications"
                  : "Obtenir mon estimation"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {etape === 2 && r.typeProjet === "renovation" && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">2 · État du bien et travaux prévus</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">DPE actuel</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                value={r.dpe}
                onChange={(e) => set("dpe", e.target.value)}
              >
                <option value="inconnu">Je ne sais pas</option>
                {["A", "B", "C", "D", "E", "F", "G"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Année de construction</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                value={r.anneeConstruction}
                onChange={(e) => set("anneeConstruction", e.target.value)}
              >
                <option value="inconnue">Je ne sais pas</option>
                <option value="avant_1949">Avant 1949</option>
                <option value="1949_1974">1949 – 1974</option>
                <option value="1975_1997">1975 – 1997</option>
                <option value="apres_1997">Après 1997</option>
              </select>
            </div>
          </div>
          <ChoixGroupe
            label="Démolition / curage"
            choix={[
              { value: "aucun", label: "Aucun" },
              { value: "leger", label: "Léger", hint: "dépose revêtements, équipements" },
              { value: "complet", label: "Complet", hint: "tout à nu + évacuation" },
            ]}
            value={r.curage}
            onChange={(v) => set("curage", v)}
          />
          <ChoixGroupe
            label="Électricité"
            choix={[
              { value: "ok", label: "Aux normes" },
              { value: "partielle", label: "Mise en sécurité" },
              { value: "totale", label: "À refaire entièrement", hint: "tableau, câblage, prises, points lumineux, terre, Consuel" },
            ]}
            value={r.electricite}
            onChange={(v) => set("electricite", v)}
          />
          {detaille && r.electricite !== "ok" && (
            <div className="flex flex-wrap items-end gap-3">
              <ChoixGroupe
                label="Luminaires / spots (hors câblage, non compris par défaut)"
                choix={[
                  { value: "non", label: "Je les fournis" },
                  { value: "spots", label: "Spots LED encastrés" },
                  { value: "luminaires", label: "Luminaires équipés" },
                ]}
                value={r.spotsLumieres}
                onChange={(v) => set("spotsLumieres", v)}
              />
              {r.spotsLumieres !== "non" && (
                <div>
                  <label className="text-sm font-medium">Nombre de points</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={r.nbPointsLumineux ?? 0}
                    onChange={(e) => set("nbPointsLumineux", Number(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          )}
          <ChoixGroupe
            label="Plomberie"
            choix={[
              { value: "ok", label: "OK" },
              { value: "reprise", label: "Reprise partielle" },
              { value: "complete", label: "À refaire" },
            ]}
            value={r.plomberie}
            onChange={(v) => set("plomberie", v)}
          />
          <ChoixGroupe
            label="Salle de bain"
            choix={[
              { value: "aucune", label: "Rien à faire" },
              { value: "rafraichir", label: "Rafraîchir" },
              { value: "complete", label: "Refaire entièrement" },
            ]}
            value={r.sdb}
            onChange={(v) => set("sdb", v)}
          />
          {detaille && r.sdb === "complete" && (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Salles de bain à équiper</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Combien ?</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={sdbConfigs.length || 1}
                    onChange={(e) => setNbSdb(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
              {(sdbConfigs.length ? sdbConfigs : [sdbDefaut()]).map((c, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Salle de bain #{i + 1}</div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      Surface m²
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={c.surface || ""}
                        placeholder="ex. 6"
                        onChange={(e) => updateSdb(i, "surface", Number(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                  <ChoixGroupe
                    label="Douche / baignoire"
                    choix={[
                      { value: "italienne", label: "Douche italienne" },
                      { value: "standard", label: "Douche standard" },
                      { value: "baignoire", label: "Baignoire" },
                      { value: "douche_et_baignoire", label: "Douche + baignoire" },
                    ]}
                    value={c.douche}
                    onChange={(v) => updateSdb(i, "douche", v)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ChoixGroupe
                      label="WC"
                      choix={[
                        { value: "suspendu", label: "Suspendu" },
                        { value: "classique", label: "Classique" },
                        { value: "aucun", label: "Aucun" },
                      ]}
                      value={c.wc}
                      onChange={(v) => updateSdb(i, "wc", v)}
                    />
                    <ChoixGroupe
                      label="Vasque"
                      choix={[
                        { value: "simple", label: "Simple" },
                        { value: "double", label: "Double" },
                      ]}
                      value={c.vasque}
                      onChange={(v) => updateSdb(i, "vasque", v)}
                    />
                    <ChoixGroupe
                      label="Plomberie"
                      choix={[
                        { value: "encastree", label: "Encastrée" },
                        { value: "apparente", label: "Apparente" },
                      ]}
                      value={c.plomberie}
                      onChange={(v) => updateSdb(i, "plomberie", v)}
                    />
                    <ChoixGroupe
                      label="Faïence"
                      choix={[
                        { value: "mi", label: "Mi-hauteur + douche" },
                        { value: "toute", label: "Toute hauteur" },
                      ]}
                      value={c.faienceTouteHauteur ? "toute" : "mi"}
                      onChange={(v) => updateSdb(i, "faienceTouteHauteur", v === "toute")}
                    />
                  </div>
                  <ChoixGroupe
                    label="Sèche-serviettes"
                    choix={[
                      { value: "oui", label: "Oui" },
                      { value: "non", label: "Non" },
                    ]}
                    value={c.secheServiettes ? "oui" : "non"}
                    onChange={(v) => updateSdb(i, "secheServiettes", v === "oui")}
                  />
                </div>
              ))}
              <p className="text-xs text-slate-400">
                Chaque salle de bain est chiffrée séparément selon son équipement et
                sa taille — pas besoin de passer par le métré pièce par pièce.
              </p>
            </div>
          )}
          <ChoixGroupe
            label="Cuisine"
            choix={[
              { value: "aucune", label: "Rien à faire" },
              { value: "rafraichir", label: "Rafraîchir" },
              { value: "complete", label: "Refaire entièrement" },
            ]}
            value={r.cuisine}
            onChange={(v) => set("cuisine", v)}
          />
          {detaille && r.cuisine === "complete" && (
            <ChoixGroupe
              label="Gamme de la cuisine"
              choix={[
                { value: "entree", label: "Entrée de gamme", hint: "~2 500-5 000 €" },
                { value: "milieu", label: "Milieu de gamme", hint: "~5 000-9 000 €" },
                { value: "haut", label: "Haut de gamme", hint: "~9 000-16 000 €" },
              ]}
              value={r.cuisineGamme}
              onChange={(v) => set("cuisineGamme", v)}
            />
          )}
          <ChoixGroupe
            label="Sols"
            choix={[
              { value: "aucun", label: "À garder" },
              { value: "partiel", label: "Refaire en partie" },
              { value: "complet", label: "Tout refaire" },
            ]}
            value={r.sols}
            onChange={(v) => set("sols", v)}
          />
          {r.sols !== "aucun" && (
            <ChoixGroupe
              label="Sous le revêtement, le support c'est quoi ?"
              choix={[
                { value: "dalle_ok", label: "Dalle / chape saine" },
                { value: "carrelage_existant", label: "Carrelage existant" },
                { value: "plancher_bois", label: "Plancher bois fatigué" },
                { value: "terre_battue", label: "Terre battue", hint: "vieille maison, cave, grange" },
              ]}
              value={r.solSupport}
              onChange={(v) => set("solSupport", v)}
            />
          )}
          {detaille && r.sols !== "aucun" && r.solSupport === "terre_battue" && (
            <ChoixGroupe
              label="Type de chape"
              choix={[
                { value: "traditionnelle", label: "Chape traditionnelle", hint: "ciment, tirée à la règle" },
                { value: "liquide", label: "Chape liquide", hint: "pompée — idéale plancher chauffant" },
              ]}
              value={r.chapeType}
              onChange={(v) => set("chapeType", v)}
            />
          )}
          {r.sols !== "aucun" && (
            <ChoixGroupe
              label="Revêtement de sol principal"
              choix={[
                { value: "carrelage", label: "Carrelage" },
                { value: "stratifie", label: "Parquet stratifié" },
                { value: "massif", label: "Parquet massif" },
                { value: "beton_cire", label: "Béton ciré" },
                { value: "pvc", label: "Sol PVC / vinyle" },
              ]}
              value={r.solsType}
              onChange={(v) => set("solsType", v)}
            />
          )}
          {detaille && r.sols !== "aucun" && (
            <div className="rounded-lg bg-slate-50 p-3 space-y-2">
              <div className="text-sm font-medium">
                Plusieurs revêtements ? (précise les surfaces)
              </div>
              {(r.solsDetail as { type: string; m2: number }[]).map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    value={s.type}
                    onChange={(e) =>
                      setR((prev) => {
                        const d = [...(prev.solsDetail as { type: string; m2: number }[])];
                        d[i] = { ...d[i], type: e.target.value };
                        return { ...prev, solsDetail: d };
                      })
                    }
                  >
                    <option value="carrelage">Carrelage</option>
                    <option value="stratifie">Parquet stratifié</option>
                    <option value="massif">Parquet massif</option>
                    <option value="beton_cire">Béton ciré</option>
                    <option value="pvc">Sol PVC / vinyle</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="m²"
                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={s.m2 || ""}
                    onChange={(e) =>
                      setR((prev) => {
                        const d = [...(prev.solsDetail as { type: string; m2: number }[])];
                        d[i] = { ...d[i], m2: Number(e.target.value) || 0 };
                        return { ...prev, solsDetail: d };
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setR((prev) => ({
                        ...prev,
                        solsDetail: (prev.solsDetail as { type: string; m2: number }[]).filter((_, j) => j !== i),
                      }))
                    }
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setR((prev) => ({
                    ...prev,
                    solsDetail: [...(prev.solsDetail as { type: string; m2: number }[]), { type: "carrelage", m2: 0 }],
                  }))
                }
                className="text-xs text-[#4F46E5] font-medium"
              >
                + Ajouter un revêtement
              </button>
              <p className="text-xs text-slate-400">
                Si tu remplis des surfaces ici, elles remplacent le revêtement unique
                ci-dessus (ex. : 60 m² carrelage + 40 m² parquet).
              </p>
            </div>
          )}
          {detaille && r.sols !== "aucun" && r.solsType !== "beton_cire" && (
            <ChoixGroupe
              label="Plinthes"
              choix={[
                { value: "assorti", label: "Assorties au sol" },
                { value: "bois", label: "Bois" },
                { value: "mdf", label: "MDF" },
                { value: "pvc", label: "PVC" },
                { value: "carrelage", label: "Carrelage" },
                { value: "aucune", label: "Aucune" },
              ]}
              value={r.plintheMateriau}
              onChange={(v) => set("plintheMateriau", v)}
            />
          )}
          {detaille && r.sols !== "aucun" && r.solsType === "carrelage" && (
            <ChoixGroupe
              label="Format du carrelage"
              choix={[
                { value: "standard", label: "Standard (≤ 45×45)" },
                { value: "grand", label: "Grand format (≥ 60×60)", hint: "pose plus technique, plus cher" },
              ]}
              value={r.carrelageFormat}
              onChange={(v) => set("carrelageFormat", v)}
            />
          )}
          <ChoixGroupe
            label="État des murs"
            choix={[
              { value: "ok", label: "Sains (placo/plâtre OK)" },
              { value: "platre_abime", label: "Plâtre abîmé", hint: "fissures, cloques → enduit avant peinture" },
              { value: "pierre_nue", label: "Pierre / brique nue", hint: "doublage + isolation à prévoir" },
            ]}
            value={r.mursEtat}
            onChange={(v) => set("mursEtat", v)}
          />
          <ChoixGroupe
            label="Traces d'humidité ?"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui", hint: "salpêtre, moisissures, odeur — à traiter en premier" },
            ]}
            value={r.humidite ? "oui" : "non"}
            onChange={(v) => set("humidite", v === "oui")}
          />
          {detaille && (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div>
                <label className="text-sm font-medium">
                  Doublage isolant des murs (ml, 0 = auto selon l&apos;état)
                </label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={r.doublageMl}
                  onChange={(e) => set("doublageMl", Number(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Linéaire de murs à doubler par l&apos;intérieur (×2,5 m de hauteur).
                </p>
              </div>
              {((r.doublageMl ?? 0) > 0 || r.mursEtat === "pierre_nue") && (
                <>
                  <ChoixGroupe
                    label="Type d'isolant"
                    choix={[
                      { value: "laine_verre", label: "Laine de verre", hint: "le plus courant, économique" },
                      { value: "laine_roche", label: "Laine de roche", hint: "acoustique/feu, +10-20 %" },
                      { value: "polystyrene", label: "Polystyrène (PSE)" },
                      { value: "polyurethane", label: "Polyuréthane", hint: "fin et performant, plus cher" },
                      { value: "biosource", label: "Biosourcé", hint: "laine de bois / ouate" },
                    ]}
                    value={r.isolantType}
                    onChange={(v) => set("isolantType", v)}
                  />
                  <ChoixGroupe
                    label="Épaisseur d'isolant"
                    choix={[
                      { value: "100", label: "100 mm" },
                      { value: "120", label: "120 mm", hint: "≈ R 3,7 en laine, seuil aides" },
                      { value: "140", label: "140 mm" },
                      { value: "160", label: "160 mm" },
                      { value: "200", label: "200 mm" },
                    ]}
                    value={String(r.isolantEpaisseur)}
                    onChange={(v) => set("isolantEpaisseur", Number(v))}
                  />
                </>
              )}
            </div>
          )}
          <ChoixGroupe
            label="Peinture"
            choix={[
              { value: "aucune", label: "Rien" },
              { value: "partielle", label: "Quelques pièces" },
              { value: "complete", label: "Tout le logement" },
            ]}
            value={r.peinture}
            onChange={(v) => set("peinture", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Fenêtres à remplacer</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={r.fenetres}
                onChange={(e) => set("fenetres", Number(e.target.value) || 0)}
              />
            </div>
            {detaille && (
              <div>
                <label className="text-sm font-medium">Blocs-portes intérieurs</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={r.nbPortesInt}
                  onChange={(e) => set("nbPortesInt", Number(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
          {detaille && r.fenetres > 0 && (
            <ChoixGroupe
              label="Matériau des fenêtres"
              choix={[
                { value: "pvc", label: "PVC", hint: "~450-1 200 € posée" },
                { value: "alu", label: "Aluminium", hint: "~700-1 500 € posée" },
                { value: "bois", label: "Bois", hint: "~800-1 500 € posée" },
              ]}
              value={r.menuiserieMateriauFenetre}
              onChange={(v) => set("menuiserieMateriauFenetre", v)}
            />
          )}
          <ChoixGroupe
            label="Porte d'entrée"
            choix={[
              { value: "aucune", label: "À garder" },
              { value: "pvc", label: "PVC" },
              { value: "alu", label: "Aluminium" },
              { value: "bois", label: "Bois" },
            ]}
            value={r.porteEntree}
            onChange={(v) => set("porteEntree", v)}
          />
          {r.fenetres > 0 && (
            <ChoixGroupe
              label="Volets roulants intégrés aux fenêtres ?"
              choix={[
                { value: "non", label: "Non" },
                { value: "oui", label: "Oui" },
              ]}
              value={r.voletRoulant ? "oui" : "non"}
              onChange={(v) => set("voletRoulant", v === "oui")}
            />
          )}
          {r.fenetres > 0 && r.voletRoulant && (
            <ChoixGroupe
              label="Type de volet roulant"
              choix={[
                { value: "manuel", label: "Manuel (sangle/manivelle)" },
                { value: "electrique", label: "Électrique", hint: "fenêtre + volet ≈ 1500-2000 €" },
                { value: "solaire", label: "Solaire", hint: "sans câblage" },
              ]}
              value={r.voletType}
              onChange={(v) => set("voletType", v)}
            />
          )}
          <ChoixGroupe
            label="Cloisons à créer"
            choix={[
              { value: "aucune", label: "Aucune" },
              { value: "quelques", label: "1-2 cloisons" },
              { value: "beaucoup", label: "Redistribution" },
            ]}
            value={r.cloisons}
            onChange={(v) => set("cloisons", v)}
          />
          {detaille && r.cloisons !== "aucune" && (
            <div>
              <label className="text-sm font-medium">
                Mètres linéaires de cloison (0 = estimé automatiquement)
              </label>
              <input
                type="number"
                min={0}
                className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={r.cloisonMlManuel}
                onChange={(e) => set("cloisonMlManuel", Number(e.target.value) || 0)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Renseigne le linéaire exact pour un chiffrage 100 % précis, sinon
                il est estimé d&apos;après le nombre de pièces.
              </p>
            </div>
          )}
          <ChoixGroupe
            label="Chauffage"
            choix={[
              { value: "aucun", label: "À garder" },
              { value: "radiateurs", label: "Radiateurs élec." },
              { value: "chaudiere", label: "Chaudière gaz" },
              { value: "pac", label: "PAC air-eau" },
            ]}
            value={r.chauffage}
            onChange={(v) => set("chauffage", v)}
          />
          <ChoixGroupe
            label="VMC à installer ?"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui" },
            ]}
            value={r.vmc ? "oui" : "non"}
            onChange={(v) => set("vmc", v === "oui")}
          />
          {r.vmc && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-sm font-medium">Nombre de VMC</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={r.nbVmc}
                  onChange={(e) => set("nbVmc", Number(e.target.value) || 1)}
                />
              </div>
              <ChoixGroupe
                label="Type de VMC"
                choix={[
                  { value: "simple", label: "Simple flux", hint: "hygro B, le standard" },
                  { value: "double", label: "Double flux", hint: "récupère la chaleur, 4-6× plus cher" },
                ]}
                value={r.vmcType}
                onChange={(v) => set("vmcType", v)}
              />
            </div>
          )}
          <ChoixGroupe
            label="Eau chaude sanitaire"
            choix={[
              { value: "inchange", label: "Inchangée" },
              { value: "ballon_elec", label: "Ballon électrique" },
              { value: "thermo", label: "Thermodynamique", hint: "économe, éligible aides" },
              { value: "chaudiere", label: "Par la chaudière" },
              { value: "solaire", label: "Solaire (CESI)" },
            ]}
            value={r.ecs}
            onChange={(v) => set("ecs", v)}
          />
          <ChoixGroupe
            label="Créer / refaire les réseaux d'évacuation ?"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui", hint: "eaux usées + eaux vannes" },
            ]}
            value={r.reseauxEvac ? "oui" : "non"}
            onChange={(v) => set("reseauxEvac", v === "oui")}
          />
          <ChoixGroupe
            label="Configuration du logement"
            choix={[
              { value: "plain_pied", label: "Plain-pied" },
              { value: "etage", label: "Avec étage" },
            ]}
            value={r.niveaux}
            onChange={(v) => set("niveaux", v)}
          />
          <div>
            <label className="text-sm font-medium">
              Création de nouvelle surface (m², 0 si aucune)
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={r.nouvelleSurfaceM2}
              onChange={(e) => set("nouvelleSurfaceM2", Number(e.target.value) || 0)}
            />
          </div>
          {(r.nouvelleSurfaceM2 ?? 0) > 0 && (
            <ChoixGroupe
              label="Plancher de la nouvelle surface"
              choix={[
                { value: "bois", label: "Plancher bois", hint: "solivage + panneaux" },
                { value: "beton", label: "Dalle béton" },
              ]}
              value={r.plancherType}
              onChange={(v) => set("plancherType", v)}
            />
          )}
          <ChoixGroupe
            label="Assainissement"
            choix={[
              { value: "raccorde", label: "Déjà raccordé", hint: "rien à faire" },
              { value: "tout_egout", label: "Raccordement tout-à-l'égout" },
              { value: "individuel_fosse", label: "Fosse toutes eaux", hint: "assainissement individuel" },
              { value: "individuel_micro", label: "Microstation" },
            ]}
            value={r.assainissement}
            onChange={(v) => set("assainissement", v)}
          />
          <div>
            <div className="text-sm font-medium mb-1.5">Raccordements / compteurs à créer</div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={r.alimElec} onChange={(e) => set("alimElec", e.target.checked)} />
                Électricité (compteur Enedis)
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={r.alimEau} onChange={(e) => set("alimEau", e.target.checked)} />
                Eau (compteur)
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={r.alimGaz} onChange={(e) => set("alimGaz", e.target.checked)} />
                Gaz
              </label>
            </div>
          </div>

          {detaille && (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="text-sm font-semibold">Programme du logement</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Chambres</label>
                  <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbChambres} onChange={(e) => set("nbChambres", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-medium">WC (total)</label>
                  <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbWc} onChange={(e) => set("nbWc", Number(e.target.value) || 0)} />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Le nombre de salles de bain se règle dans la section « Salle de bain » ci-dessus.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={r.cellier} onChange={(e) => set("cellier", e.target.checked)} />
                  Cellier
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={r.buanderie} onChange={(e) => set("buanderie", e.target.checked)} />
                  Buanderie (arrivée + évacuation)
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Pour un chiffrage encore plus précis, saisis la surface de chaque
                pièce dans le métré (sur la page du projet, après création).
              </p>
            </div>
          )}

          {/* Travaux extérieurs / façade */}
          <ChoixGroupe
            label="Travaux extérieurs / façade ?"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui" },
            ]}
            value={r.facadeAFaire ? "oui" : "non"}
            onChange={(v) => set("facadeAFaire", v === "oui")}
          />
          {r.facadeAFaire && (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <ChoixGroupe
                label="Type de murs extérieurs"
                choix={[
                  { value: "parpaing", label: "Parpaing / béton" },
                  { value: "brique", label: "Brique" },
                  { value: "pierre", label: "Pierre" },
                  { value: "autre", label: "Autre / enduit" },
                ]}
                value={r.murExtType}
                onChange={(v) => set("murExtType", v)}
              />
              <ChoixGroupe
                label="État de la façade"
                choix={[
                  { value: "bon", label: "Bon (juste embellir)" },
                  { value: "encrasse", label: "Encrassée" },
                  { value: "fissure", label: "Fissurée" },
                  { value: "degrade", label: "Dégradée", hint: "enduit qui cloque, infiltrations" },
                ]}
                value={r.murExtEtat}
                onChange={(v) => set("murExtEtat", v)}
              />
              <ChoixGroupe
                label="Rénovation souhaitée"
                choix={[
                  { value: "nettoyage", label: "Nettoyage + hydrofuge" },
                  { value: "peinture", label: "Peinture / ravalement" },
                  { value: "enduit", label: "Enduit / crépi neuf" },
                  { value: "ite", label: "Isolation extérieure (ITE)", hint: "gros gain énergétique" },
                ]}
                value={r.facadeReno}
                onChange={(v) => set("facadeReno", v)}
              />
              <div>
                <label className="text-xs font-medium">
                  Surface de façade (m², 0 = estimée automatiquement)
                </label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={r.facadeM2}
                  onChange={(e) => set("facadeM2", Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <QuestionsCustom section={2} />

          <div className="flex gap-3">
            <button
              onClick={() => setEtape(1)}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium"
            >
              Retour
            </button>
            <button
              onClick={() => setEtape(3)}
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-white font-medium"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">3 · Objectif et finition</h2>
          <ChoixGroupe
            label="Niveau de finition visé"
            choix={[
              { value: "locatif", label: "Locatif simple", hint: "robuste et économique" },
              { value: "standard", label: "Standard" },
              { value: "premium", label: "Premium", hint: "haut de gamme (+20 %)" },
              { value: "luxe", label: "Luxe", hint: "matériaux nobles, sur-mesure (+45 %)" },
            ]}
            value={r.finition}
            onChange={(v) => set("finition", v)}
          />
          <QuestionsCustom section={3} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setEtape(2)}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium"
            >
              Retour
            </button>
            <button
              onClick={creer}
              disabled={saving}
              className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-white font-medium disabled:opacity-50"
            >
              {saving
                ? "Calcul en cours…"
                : edit
                  ? "Enregistrer les modifications"
                  : "Obtenir mon estimation"}
            </button>
          </div>
        </div>
      )}
    </div>
    </EditCtx.Provider>
  );
}

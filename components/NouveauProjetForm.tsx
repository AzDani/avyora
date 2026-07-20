"use client";

import { useState, useContext, createContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_VIDE, trierQuestionsParCorps, ordreEffectif, CORPS_ORDRE, CORPS_LABEL, type FormConfig, type BuiltinCustom, type CustomOption, type CustomQuestion, type CustomSection } from "@/lib/customq";

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
  renameQuestion: (label: string, nom: string) => void;
  renameOption: (label: string, value: string, nom: string) => void;
};
const EditCtx = createContext<EditCtxType | null>(null);

/** Texte renommable au double-clic (mode perso). */
function Renommable({
  texte,
  onSave,
  className,
  actif,
}: {
  texte: string;
  onSave: (v: string) => void;
  className?: string;
  actif: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(texte);
  if (editing) {
    const save = () => {
      onSave(val.trim() || texte);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="rounded border border-indigo-400 px-1.5 py-0.5 text-sm"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span
      className={className}
      title={actif ? "Double-clic pour renommer" : undefined}
      onDoubleClick={
        actif
          ? (e) => {
              e.stopPropagation();
              setVal(texte);
              setEditing(true);
            }
          : undefined
      }
    >
      {texte}
    </span>
  );
}

/**
 * Palier 2 — libellé intégré renommable (labels de champs, sous-titres…).
 * Réutilise le même stockage que les questions ChoixGroupe (builtin[k].labelOverride),
 * la clé `k` étant le libellé d'origine (doit être unique dans le formulaire).
 */
function Libelle({ k, children }: { k: string; children: string }) {
  const ctx = useContext(EditCtx);
  const nom = ctx?.builtinOf(k).labelOverride || children;
  if (ctx?.perso)
    return <Renommable texte={nom} actif onSave={(v) => ctx.renameQuestion(k, v)} className="cursor-text" />;
  return <>{nom}</>;
}

/**
 * Palier 4 — ordonnancement des blocs par glisser-déposer.
 * Fourni par SectionBlocs, consommé par chaque bloc (via son `order` CSS).
 */
type OrderCtxType = {
  perso: boolean;
  orderOf: (id: string) => number;
  dragId: string | null;
  overId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  setOver: (id: string | null) => void;
  onDropBefore: (id: string) => void;
  estMasque: (id: string) => boolean;
  onMasquer: (id: string) => void;
  onAfficher: (id: string) => void;
  voirMasques: boolean; // false = les blocs masqués sont invisibles ; true = affichés (grisés) pour restauration
};
const OrderCtx = createContext<OrderCtxType | null>(null);

type BlocItem = { id: string; node: ReactNode } | null | false | undefined;

/**
 * Conteneur de blocs réordonnables. `items` = liste ordonnée {id, node} ; les entrées
 * falsy (conditions non remplies) sont ignorées SANS décaler les ids. En mode perso,
 * chaque bloc reçoit une poignée de glissement ; l'ordre est piloté par CSS `order`
 * (flex-col + gap) donc le DOM ne bouge pas — le moteur/état restent intacts.
 */
function SectionBlocs({
  items,
  ctx,
}: {
  items: BlocItem[];
  ctx: OrderCtxType;
}) {
  const [voir, setVoir] = useState(false);
  // Tri dans le DOM (pas en CSS `order`) : l'ordre visuel = l'ordre de tabulation
  // et de lecture d'écran. Les `key` stables préservent l'état des blocs déplacés.
  const visibles = items
    .filter((it): it is { id: string; node: ReactNode } => !!it)
    .sort((a, b) => ctx.orderOf(a.id) - ctx.orderOf(b.id));
  const nbMasques = visibles.filter((it) => ctx.estMasque(it.id)).length;
  const ctx2 = { ...ctx, voirMasques: voir };
  return (
    <OrderCtx.Provider value={ctx2}>
      <div className="flex flex-col gap-5">
        {visibles.map((it) => (
          <Bloc key={it.id} id={it.id}>
            {it.node}
          </Bloc>
        ))}
      </div>
      {ctx.perso && nbMasques > 0 && (
        <button
          type="button"
          onClick={() => setVoir((v) => !v)}
          className="mt-2 self-start text-[11px] text-slate-400 underline decoration-dotted hover:text-indigo-600"
        >
          {voir ? "Masquer les éléments retirés" : `↺ ${nbMasques} élément${nbMasques > 1 ? "s" : ""} retiré${nbMasques > 1 ? "s" : ""} — restaurer`}
        </button>
      )}
    </OrderCtx.Provider>
  );
}

function Bloc({ id, children }: { id: string; children: ReactNode }) {
  const o = useContext(OrderCtx);
  if (!o) return <>{children}</>;
  const masque = o.estMasque(id);
  // Hors perso : un bloc masqué disparaît du vrai formulaire.
  if (!o.perso) return masque ? null : <div>{children}</div>;
  // En perso : un bloc masqué est INVISIBLE par défaut (comme supprimé). Il ne réapparaît,
  // grisé avec « Réafficher », que si l'utilisateur clique « restaurer » en bas de section.
  if (masque && !o.voirMasques) return null;
  if (masque)
    return (
      <div
          className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50/60 pl-7 pr-3 pt-5 pb-2"
      >
        <div className="pointer-events-none select-none opacity-40">{children}</div>
        <span className="absolute top-1 left-2 text-[10px] uppercase tracking-wide text-slate-400">masqué</span>
        <button type="button" onClick={() => o.onAfficher(id)} className="absolute top-1 right-2 text-[11px] font-medium text-slate-400 hover:text-indigo-600">↺ Réafficher</button>
      </div>
    );
  const estCustom = id.startsWith("q:") || id.startsWith("h:");
  const essentiel = BLOCS_ESSENTIELS.has(id);
  const dragging = o.dragId === id;
  const cible = o.overId === id && o.dragId != null && o.dragId !== id;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (o.overId !== id) o.setOver(id);
      }}
      onDragLeave={() => {
        if (o.overId === id) o.setOver(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        o.onDropBefore(id);
      }}
      className={`relative rounded-lg pl-7 transition ${dragging ? "opacity-40" : ""} ${
        cible ? "ring-2 ring-indigo-400 ring-offset-2 before:absolute before:-top-2.5 before:left-6 before:right-0 before:h-0.5 before:bg-indigo-500" : ""
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col items-center pt-1 gap-1">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
            // Différer le setState : changer le rendu du bloc pendant dragstart annule le drag natif.
            setTimeout(() => o.onDragStart(id), 0);
          }}
          onDragEnd={o.onDragEnd}
          className="cursor-grab active:cursor-grabbing select-none rounded bg-slate-50 px-0.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 text-lg leading-none"
          title="Glisser pour déplacer"
        >
          ⠿
        </span>
        {/* Masquer : blocs intégrés seulement (les custom ont leur propre suppression),
            et jamais les blocs essentiels (nom/surface/CP — sans eux, plus de projet possible). */}
        {!estCustom && !essentiel && (
          <button
            type="button"
            onClick={() => o.onMasquer(id)}
            className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs leading-none flex items-center justify-center hover:bg-red-500 hover:text-white"
            title="Masquer / supprimer ce bloc"
            aria-label="Masquer"
          >
            ✕
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

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
  cle,
  choix,
  value,
  onChange,
  obligatoire,
  neutre,
}: {
  label: string;
  /** Clé de personnalisation (défaut : label). À préciser quand le même libellé existe 2 fois (ex. « Plomberie » travaux vs SDB). */
  cle?: string;
  choix: Choix[];
  value: string;
  onChange: (v: string) => void;
  obligatoire?: boolean; // true = une réponse toujours sélectionnée (re-clic sans effet)
  /** Valeur « rien à faire » : re-cliquer l'option sélectionnée y revient (dé-sélection sûre, jamais de valeur vide). */
  neutre?: string;
}) {
  const k = cle ?? label;
  const ctx = useContext(EditCtx);
  const bc = ctx?.builtinOf(k) ?? { hidden: [], added: [] };
  const perso = ctx?.perso ?? false;
  const visibles = choix.filter((c) => !bc.hidden.includes(c.value));
  const nomQuestion = bc.labelOverride || label;
  const nomOption = (c: Choix) => bc.optionLabels?.[c.value] ?? c.label;

  const addedValides = bc.added.filter((o) => !ctx?.isEditing(o.id));
  const addedEnEdition = bc.added.filter((o) => ctx?.isEditing(o.id));

  return (
    <div>
      <div className="text-sm font-medium mb-1.5">
        {perso ? (
          <Renommable texte={nomQuestion} actif onSave={(v) => ctx!.renameQuestion(k, v)} className="cursor-text" />
        ) : (
          nomQuestion
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibles.map((c) => (
          <span key={c.value} className="relative inline-flex">
            {perso ? (
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 inline-flex">
                <Renommable texte={nomOption(c)} actif onSave={(v) => ctx!.renameOption(k, c.value, v)} className="cursor-text" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onChange(value === c.value ? (!obligatoire && neutre != null ? neutre : c.value) : c.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  value === c.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={c.hint}
              >
                {nomOption(c)}
              </button>
            )}
            {perso && (
              <button
                type="button"
                onClick={() => ctx!.hideOption(k, c.value)}
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
                onClick={perso ? undefined : () => ctx?.toggleAdded(o.id)}
                onDoubleClick={perso ? () => ctx?.setEditing(o.id, true) : undefined}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  !perso && sel
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={perso ? "Double-clic pour modifier" : undefined}
              >
                {o.label || "(sans nom)"}
                {o.prix > 0 && <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span>}
              </button>
              {perso && (
                <button
                  type="button"
                  onClick={() => ctx!.removeOption(k, o.id)}
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
                onClick={() => ctx!.unhideOption(k, c.value)}
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
            <AddedOptionEdit key={o.id} label={k} o={o} />
          ))}
          <button
            type="button"
            onClick={() => ctx!.addOption(k)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs text-[#4F46E5] font-medium hover:bg-indigo-100/60"
          >
            + Ajouter une réponse
          </button>
        </div>
      )}
    </div>
  );
}

/** Configuration d'une salle de bain dans le formulaire (version saisie de Reponses["sdbConfigs"]). */
type SdbCfg = {
  surface: number;
  douche: string;
  wc: string;
  vasque: string;
  plomberie: string;
  faienceTouteHauteur: boolean;
  secheServiettes: boolean;
  custom?: Record<string, string | string[] | number>;
};

type EditData = {
  id: number;
  nom: string;
  typeBien: string;
  surface: number;
  codePostal: string;
  reponses: Record<string, unknown>;
};

/**
 * Auto-sauvegarde débouncée, SÉRIALISÉE (une requête à la fois, dans l'ordre) avec
 * flush à la fermeture/navigation. Un seul mécanisme pour la config perso et les
 * réponses du projet.
 * `send(keepalive)` lit l'état via des refs et renvoie null si rien ne peut être
 * sauvegardé maintenant (ex. formulaire invalide) — l'état reste alors « à sauver ».
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
      if (!req) return; // pas sauvegardable maintenant : on reste « à sauver »
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

  // Débounce : chaque changement des deps marque « à sauver » et (re)lance le minuteur.
  useEffect(() => {
    if (!monte.current) {
      monte.current = true; // pas de sauvegarde au montage (état initial déjà en base)
      return;
    }
    dirty.current = true;
    const t = setTimeout(() => flushRef.current(), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Flush à la fermeture / navigation (keepalive = la requête survit au démontage).
  useEffect(() => {
    const auRevoir = () => {
      flushRef.current(true);
    };
    window.addEventListener("pagehide", auRevoir);
    return () => {
      window.removeEventListener("pagehide", auRevoir);
      auRevoir();
    };
  }, []);

  return { etat, flush };
}

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Ids des blocs intégrés, par section, dans leur ordre JSX (registre central pour l'ordonnancement). */
const BLOCS_INTEGRES: Record<number, string[]> = {
  1: ["typeProjet", "modeEstimation", "nom", "typeBien", "surface_cp"],
  2: [
    "dpe_annee", "solSupport", "mursEtat", "humidite", "humiditeSource",
    "head_structure", "fissuresStructure", "toitureEtat", "charpenteEtat", "zinguerie_isolToit", "toitureM2",
    "head_enveloppe", "enduitExtEtat", "menuiseriesEtat", "encadrementsEtat", "nbEncadrementsReprise",
    "head_sol", "niveau_isolSol",
  ],
  3: [
    "curage", "electricite", "elec_spots", "plomberie", "sdb", "sdb_config", "cuisine", "cuisine_gamme",
    "sols", "chape", "sols_revetement", "sols_detail", "plinthes", "carrelage_format", "doublage",
    "peinture", "fenetres_portes", "fenetres_materiau", "porteEntree", "volets", "volet_type",
    "cloisons", "cloison_ml", "chauffage", "vmc", "vmc_config", "ecs", "reseauxEvac", "niveaux",
    "nouvelleSurface", "plancherType", "assainissement", "raccordements", "programme", "facade", "facade_config",
  ],
  4: ["finition"],
  20: ["gammeNeuf", "terrain", "prog_grid", "neuf_detaille", "ecs_neuf", "assainissement_neuf"],
};

/** Champs intégrés du configurateur de salle de bain, masquables individuellement (id `sdb:<id>`). */
const SDB_CHAMPS: { id: string; label: string }[] = [
  { id: "douche", label: "Douche / baignoire" },
  { id: "wc", label: "WC" },
  { id: "vasque", label: "Vasque" },
  { id: "plomberie", label: "Plomberie" },
  { id: "faience", label: "Faïence" },
  { id: "seche", label: "Sèche-serviettes" },
];

/** Blocs vitaux : sans eux le formulaire ne peut plus créer de projet — jamais masquables. */
const BLOCS_ESSENTIELS = new Set(["typeProjet", "modeEstimation", "nom", "surface_cp"]);

/** Style d'une pastille de réponse (partagé par toutes les questions du formulaire). */
const pastilleCls = (sel: boolean) =>
  `rounded-lg border px-3 py-2 text-sm ${sel ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`;

/** Suffixe prix d'une pastille (· 400 € / · 30 €/m²). */
const pastillePrix = (o: CustomOption) =>
  o.prix > 0 ? <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span> : null;

/**
 * Rendu des réponses d'une question personnalisée (mode réponse, pas édition).
 * Utilisé pour les questions de section ET les options SDB : même logique, mêmes styles.
 */
function ReponsesQuestion({
  q,
  valeur,
  onUnique,
  onToggle,
  onNombre,
}: {
  q: CustomQuestion;
  valeur: string | string[] | number | boolean | undefined;
  onUnique: (optId: string) => void;
  onToggle: (optId: string) => void;
  onNombre: (n: number) => void;
}) {
  if (q.type === "nombre")
    return (
      <div className="flex items-center gap-2">
        <input type="number" min={0} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={(valeur as number) ?? 0} onChange={(e) => onNombre(Number(e.target.value) || 0)} />
        <span className="text-xs text-slate-400">{q.options[0]?.label} ({q.options[0]?.prix} € / unité)</span>
      </div>
    );
  if (q.type === "multiple")
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => {
          const sel = ((valeur as string[]) ?? []).includes(o.id);
          return (
            <button key={o.id} type="button" onClick={() => onToggle(o.id)} className={pastilleCls(sel)}>
              {o.label}{pastillePrix(o)}
            </button>
          );
        })}
      </div>
    );
  return (
    <div className="flex flex-wrap gap-2">
      {q.options.map((o) => (
        <button key={o.id} type="button" onClick={() => onUnique(o.id)} className={pastilleCls(valeur === o.id)}>
          {o.label}{pastillePrix(o)}
        </button>
      ))}
    </div>
  );
}

/** Sous-titres intégrés (catégories natives) par section, pour le menu « ranger sous… ». */
const HEADINGS_INTEGRES: Record<number, { id: string; label: string }[]> = {
  2: [
    { id: "head_structure", label: "Structure & couverture" },
    { id: "head_enveloppe", label: "Enveloppe & menuiseries" },
    { id: "head_sol", label: "Sol & niveaux" },
  ],
};

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

  // Sauvegarde auto de la config perso (sérialisée : jamais un ancien PUT qui écrase un récent).
  const configRef = useRef(config);
  configRef.current = config;
  const { etat: saveState } = useAutoSave(
    (keepalive) =>
      fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configRef.current }),
        keepalive,
      }).then((r) => r.ok),
    300,
    [config]
  );
  function commit(updater: (prev: FormConfig) => FormConfig) {
    setConfig(updater);
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

  // ── Palier 3 + 4 : ordre des blocs par section (défaut chronologique + glisser-déposer) ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const headingsDe = (section: number) => (config.headings ?? []).filter((h) => h.section === section);
  /** Ordre naturel d'une section : blocs intégrés (JSX) puis catégories custom puis questions custom (triées par corps). */
  const naturelSection = (section: number): string[] => {
    const builtinIds = BLOCS_INTEGRES[section] ?? [];
    const headingIds = headingsDe(section).map((h) => `h:${h.id}`);
    const customs = trierQuestionsParCorps(config.questions.filter((q) => q.section === section)).map(
      (q) => `q:${q.id}`
    );
    return [...builtinIds, ...headingIds, ...customs];
  };
  const orderCtxFor = (section: number): OrderCtxType => {
    const naturel = naturelSection(section);
    const eff = ordreEffectif(config.order?.[section], naturel);
    const idx = new Map(eff.map((id, i) => [id, i]));
    return {
      perso,
      orderOf: (id) => idx.get(id) ?? 9999,
      dragId,
      overId,
      onDragStart: setDragId,
      onDragEnd: () => {
        setDragId(null);
        setOverId(null);
      },
      setOver: setOverId,
      onDropBefore: (target) => {
        const src = dragId;
        setDragId(null);
        setOverId(null);
        if (!src || src === target) return;
        const cur = ordreEffectif(config.order?.[section], naturel).filter((id) => id !== src);
        const at = cur.indexOf(target);
        cur.splice(at < 0 ? cur.length : at, 0, src);
        commit((prev) => ({ ...prev, order: { ...(prev.order ?? {}), [section]: cur } }));
      },
      estMasque: (id) => (config.hiddenBlocs ?? []).includes(id),
      onMasquer: (id) => commit((prev) => ({ ...prev, hiddenBlocs: [...(prev.hiddenBlocs ?? []), id] })),
      onAfficher: (id) => commit((prev) => ({ ...prev, hiddenBlocs: (prev.hiddenBlocs ?? []).filter((x) => x !== id) })),
      voirMasques: false,
    };
  };
  // Catégories disponibles d'une section (intégrées + custom) pour le menu « ranger sous… ».
  const categoriesDe = (section: number): { id: string; label: string }[] => [
    ...(HEADINGS_INTEGRES[section] ?? []).map((h) => ({
      id: h.id,
      label: config.builtin[h.label]?.labelOverride || h.label,
    })),
    ...headingsDe(section).map((h) => ({ id: `h:${h.id}`, label: h.label })),
  ];
  // Place un bloc (question `q:` ou catégorie `h:`) juste après une cible (matérialise l'ordre).
  const placerApres = (section: number, movingId: string, cible: string) => {
    if (!cible || cible === movingId) return;
    const naturel = naturelSection(section);
    const cur = ordreEffectif(config.order?.[section], naturel).filter((id) => id !== movingId);
    const at = cur.indexOf(cible);
    cur.splice(at < 0 ? cur.length : at + 1, 0, movingId);
    commit((prev) => ({ ...prev, order: { ...(prev.order ?? {}), [section]: cur } }));
  };
  const rangerSous = (section: number, qid: string, cible: string) => placerApres(section, `q:${qid}`, cible);
  // Catégories (sous-titres) ajoutées par l'utilisateur.
  const addHeading = (section: CustomSection) =>
    commit((prev) => ({ ...prev, headings: [...(prev.headings ?? []), { id: uid(), section, label: "Nouvelle catégorie" }] }));
  const renameHeading = (id: string, label: string) =>
    commit((prev) => ({ ...prev, headings: (prev.headings ?? []).map((h) => (h.id === id ? { ...h, label } : h)) }));
  const removeHeading = (id: string) =>
    commit((prev) => ({ ...prev, headings: (prev.headings ?? []).filter((h) => h.id !== id) }));
  const updateHeading = (id: string, patch: Partial<{ parent?: string }>) =>
    commit((prev) => ({ ...prev, headings: (prev.headings ?? []).map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  // Rattache une catégorie à une catégorie parente (la range juste après + retient le parent pour l'indentation).
  const rattacherCategorie = (section: number, hid: string, parent: string) => {
    if (!parent) {
      updateHeading(hid, { parent: undefined });
      return;
    }
    updateHeading(hid, { parent });
    placerApres(section, `h:${hid}`, parent);
  };
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
    humiditeSource: "inconnue",
    fissuresStructure: "aucune",
    toitureEtat: "bon",
    charpenteEtat: "saine",
    zinguerieAFaire: false,
    toitureM2: 0,
    isolationToiture: false,
    enduitExtEtat: "sain",
    menuiseriesEtat: "bon",
    encadrementsEtat: "bon",
    nbEncadrementsReprise: 0,
    niveauARattraper: 0,
    isolationSol: false,
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
    sdbConfigs: [] as SdbCfg[],
    ...(edit?.reponses ?? {}),
  });

  const detaille = r.modeEstimation === "detaille";

  const set = (k: string, v: string | number | boolean) =>
    setR((prev) => ({ ...prev, [k]: v }));

  const sdbDefaut = (): SdbCfg => ({
    surface: 0,
    douche: "standard",
    wc: "suspendu",
    vasque: "simple",
    plomberie: "encastree",
    faienceTouteHauteur: false,
    secheServiettes: true,
    custom: {},
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
  // Réponse à une option SDB personnalisée, pour la salle de bain i
  const updateSdbCustom = (i: number, qid: string, v: string | string[] | number) =>
    setR((prev) => {
      const cur = ((prev.sdbConfigs as SdbCfg[] | undefined) ?? []).slice();
      const c = cur[i] ?? sdbDefaut();
      cur[i] = { ...c, custom: { ...(c.custom ?? {}), [qid]: v } };
      return { ...prev, sdbConfigs: cur };
    });
  const toggleSdbMultiple = (i: number, qid: string, optId: string) =>
    setR((prev) => {
      const cur = ((prev.sdbConfigs as SdbCfg[] | undefined) ?? []).slice();
      const c = cur[i] ?? sdbDefaut();
      const arr = (((c.custom ?? {})[qid] as string[]) ?? []).slice();
      const idx = arr.indexOf(optId);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(optId);
      cur[i] = { ...c, custom: { ...(c.custom ?? {}), [qid]: arr } };
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
    renameQuestion: (label, nom) => updateBuiltin(label, (bc) => ({ ...bc, labelOverride: nom === label ? undefined : nom })),
    renameOption: (label, value, nom) =>
      updateBuiltin(label, (bc) => ({ ...bc, optionLabels: { ...(bc.optionLabels ?? {}), [value]: nom } })),
  };

  // CRUD des questions personnalisées : une seule implémentation, instanciée pour les
  // questions de section (config.questions) ET les options SDB (config.sdbQuestions).
  const creerCrudQuestions = (mapper: (fn: (qs: FormConfig["questions"]) => FormConfig["questions"]) => void) => ({
    add: (section: CustomSection, corps: string) => {
      const nid = uid();
      mapper((qs) => [
        ...qs,
        { id: nid, section, label: "", type: "unique", corps, ordre: qs.length, options: [{ id: uid(), label: "Réponse 1", prix: 0, mode: "forfait" }] },
      ]);
      setEditing(nid, true); // ouvre l'éditeur ; l'utilisateur valide ensuite
    },
    update: (id: string, patch: Partial<FormConfig["questions"][number]>) =>
      mapper((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q))),
    remove: (id: string) => mapper((qs) => qs.filter((q) => q.id !== id)),
    addOption: (qid: string) => {
      const oid = uid();
      mapper((qs) => qs.map((q) => (q.id === qid ? { ...q, options: [...q.options, { id: oid, label: "", prix: 0, mode: "forfait" }] } : q)));
      setEditing(oid, true); // nouvelle réponse en saisie ; « ✓ » la valide en pastille
    },
    updateOption: (qid: string, oid: string, patch: Partial<CustomOption>) =>
      mapper((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) } : q))),
    removeOption: (qid: string, oid: string) =>
      mapper((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.filter((o) => o.id !== oid) } : q))),
  });

  const crudQ = creerCrudQuestions((fn) => commit((prev) => ({ ...prev, questions: fn(prev.questions) })));
  const addQuestion = (section: CustomSection) => crudQ.add(section, "divers");
  const updateQuestion = crudQ.update;
  const removeQuestion = crudQ.remove;
  const addQOption = crudQ.addOption;
  const updateQOption = crudQ.updateOption;
  const removeQOption = crudQ.removeOption;

  // Champs SDB intégrés masquables (id `sdb:<id>` dans hiddenBlocs) — ex. « WC »
  const estMasqueSdb = (id: string) => (config.hiddenBlocs ?? []).includes(`sdb:${id}`);
  const toggleSdbChamp = (id: string) =>
    commit((prev) => {
      const key = `sdb:${id}`;
      const has = (prev.hiddenBlocs ?? []).includes(key);
      return { ...prev, hiddenBlocs: has ? (prev.hiddenBlocs ?? []).filter((x) => x !== key) : [...(prev.hiddenBlocs ?? []), key] };
    });

  // ── Options SDB personnalisées (config.sdbQuestions) : éditées une fois, répondues par salle de bain ──
  const sdbQuestions = config.sdbQuestions ?? [];
  const crudSdb = creerCrudQuestions((fn) => commit((prev) => ({ ...prev, sdbQuestions: fn(prev.sdbQuestions ?? []) })));
  const addSdbQuestion = () => crudSdb.add(3, "salle_de_bain");
  const updateSdbQuestion = crudSdb.update;
  const removeSdbQuestion = crudSdb.remove;
  const addSdbQOption = crudSdb.addOption;
  const updateSdbQOption = crudSdb.updateOption;
  const removeSdbQOption = crudSdb.removeOption;

  // Réponses aux options SDB, pour la salle de bain i (mode normal : boutons sélectionnables).
  function renderSdbAnswers(i: number, c: SdbCfg): ReactNode {
    if (sdbQuestions.length === 0) return null;
    const rep = c.custom ?? {};
    return (
      <>
        {sdbQuestions.map((q) => (
          <div key={q.id}>
            <div className="text-sm font-medium mb-1.5">{q.label || "Option"}</div>
            <ReponsesQuestion
              q={q}
              valeur={rep[q.id]}
              onUnique={(optId) => updateSdbCustom(i, q.id, rep[q.id] === optId ? "" : optId)}
              onToggle={(optId) => toggleSdbMultiple(i, q.id, optId)}
              onNombre={(n) => updateSdbCustom(i, q.id, n)}
            />
          </div>
        ))}
      </>
    );
  }

  // Éditeur des options SDB personnalisées (mode perso, une fois — s'applique à toutes les SDB).
  function renderSdbEditor(): ReactNode {
    return (
      <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/20 p-3 space-y-2">
        <div className="text-xs font-semibold text-slate-600">Options personnalisées — s&apos;appliquent à chaque salle de bain</div>
        {sdbQuestions.map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <input className="flex-1 min-w-36 rounded border border-slate-300 px-2 py-1 text-sm font-medium" placeholder="Intitulé (ex. Type de miroir)" value={q.label} onChange={(e) => updateSdbQuestion(q.id, { label: e.target.value })} />
              <select className="rounded border border-slate-300 px-1 py-1 text-xs" value={q.type} onChange={(e) => updateSdbQuestion(q.id, { type: e.target.value as FormConfig["questions"][number]["type"] })}>
                <option value="unique">une seule</option>
                <option value="multiple">plusieurs</option>
                <option value="nombre">un nombre</option>
              </select>
              <button type="button" onClick={() => removeSdbQuestion(q.id)} className="text-xs text-red-500">Retirer</button>
            </div>
            <div className="pl-2 border-l-2 border-indigo-100 space-y-1">
              {(q.type === "nombre" ? q.options.slice(0, 1) : q.options).map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-1.5">
                  <input className="flex-1 min-w-24 rounded border border-slate-200 px-2 py-1 text-sm" placeholder={q.type === "nombre" ? "unité (ex. miroir)" : "réponse"} value={o.label} onChange={(e) => updateSdbQOption(q.id, o.id, { label: e.target.value })} />
                  <input type="number" className="w-20 rounded border border-slate-200 px-2 py-1 text-sm text-right" placeholder="prix" value={o.prix || ""} onChange={(e) => updateSdbQOption(q.id, o.id, { prix: Number(e.target.value) || 0 })} />
                  <button type="button" title="Suggérer un prix" onClick={async () => { const p = await suggererPrix(o.label); if (p) updateSdbQOption(q.id, o.id, { prix: p }); }} className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-500 hover:text-indigo-600">≈</button>
                  {q.type !== "nombre" && (
                    <select className="rounded border border-slate-200 px-1 py-1 text-xs" value={o.mode} onChange={(e) => updateSdbQOption(q.id, o.id, { mode: e.target.value as CustomOption["mode"] })}>
                      <option value="forfait">€ forfait</option>
                      <option value="m2">€/m²</option>
                    </select>
                  )}
                  {q.type !== "nombre" && q.options.length > 1 && (
                    <button type="button" onClick={() => removeSdbQOption(q.id, o.id)} className="text-xs text-slate-400 hover:text-red-600">✕</button>
                  )}
                </div>
              ))}
              {q.type !== "nombre" && (
                <button type="button" onClick={() => addSdbQOption(q.id)} className="text-xs text-[#4F46E5] font-medium">+ Réponse</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addSdbQuestion} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs text-[#4F46E5] font-medium hover:bg-indigo-100/60">+ Ajouter une option SDB</button>
      </div>
    );
  }

  // Rendu d'une question personnalisée : éditeur (perso, en édition), fiche compacte
  // déplaçable (perso, validée), ou champ de saisie (mode normal).
  function renderQuestionCustom(q: FormConfig["questions"][number]): ReactNode {
    // Mode perso : rendu IDENTIQUE à une question intégrée (titre + pastilles + « + Ajouter une réponse »),
    // sans carte ni bouton « Modifier ». Les réglages (type, corps, catégorie) tiennent sur une ligne discrète.
    if (perso) {
      const cats = categoriesDe(q.section);
      const opts = q.type === "nombre" ? q.options.slice(0, 1) : q.options;
      return (
        <div>
          <div className="text-sm font-medium mb-1.5">
            {q.label ? (
              <Renommable texte={q.label} actif onSave={(v) => updateQuestion(q.id, { label: v })} className="cursor-text" />
            ) : (
              <input autoFocus className="rounded border border-slate-300 px-2 py-1 text-sm font-medium" placeholder="Intitulé de la question" value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            {opts.map((o) =>
              q.type === "nombre" || editingIds.has(o.id) ? (
                <div key={o.id} className="flex flex-wrap items-center gap-1.5 bg-indigo-50/40 rounded-lg px-2 py-1.5">
                  <input className="min-w-28 rounded border border-slate-200 px-2 py-1 text-sm" placeholder={q.type === "nombre" ? "unité (ex. spot)" : "réponse"} value={o.label} onChange={(e) => updateQOption(q.id, o.id, { label: e.target.value })} />
                  <input type="number" className="w-20 rounded border border-slate-200 px-2 py-1 text-sm text-right" placeholder="prix" value={o.prix || ""} onChange={(e) => updateQOption(q.id, o.id, { prix: Number(e.target.value) || 0 })} />
                  <button type="button" title="Suggérer un prix depuis la base" onClick={async () => { const p = await suggererPrix(o.label); if (p) updateQOption(q.id, o.id, { prix: p }); }} className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-500 hover:text-indigo-600">≈</button>
                  {q.type !== "nombre" && (
                    <select className="rounded border border-slate-200 px-1 py-1 text-xs" value={o.mode} onChange={(e) => updateQOption(q.id, o.id, { mode: e.target.value as CustomOption["mode"] })}>
                      <option value="forfait">€ forfait</option>
                      <option value="m2">€/m²</option>
                    </select>
                  )}
                  {q.type !== "nombre" && (
                    <button type="button" disabled={!o.label.trim()} onClick={() => setEditing(o.id, false)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-600 disabled:opacity-40">✓</button>
                  )}
                  {q.type !== "nombre" && q.options.length > 1 && (
                    <button type="button" onClick={() => removeQOption(q.id, o.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Retirer">✕</button>
                  )}
                </div>
              ) : (
                <span key={o.id} className="relative inline-flex">
                  <button type="button" onDoubleClick={() => setEditing(o.id, true)} title="Double-clic pour modifier" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-300">
                    {o.label || "(réponse)"}{o.prix > 0 && <span className="text-xs text-slate-400"> · {o.prix} €{o.mode === "m2" ? "/m²" : ""}</span>}
                  </button>
                  <button type="button" onClick={() => removeQOption(q.id, o.id)} className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] leading-none flex items-center justify-center ring-2 ring-white shadow-sm hover:bg-red-600" aria-label="Retirer">✕</button>
                </span>
              )
            )}
          </div>
          {q.type !== "nombre" && (
            <div className="mt-1.5">
              <button type="button" onClick={() => addQOption(q.id)} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs text-[#4F46E5] font-medium hover:bg-indigo-100/60">+ Ajouter une réponse</button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <label className="flex items-center gap-1">
              Réponses&nbsp;:
              <select className="rounded border border-slate-200 px-1 py-0.5 text-[11px]" value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as FormConfig["questions"][number]["type"] })}>
                <option value="unique">une seule</option>
                <option value="multiple">plusieurs</option>
                <option value="nombre">un nombre</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              Corps&nbsp;:
              <select className="rounded border border-slate-200 px-1 py-0.5 text-[11px]" value={q.corps} onChange={(e) => updateQuestion(q.id, { corps: e.target.value })}>
                {CORPS_ORDRE.map((c) => (
                  <option key={c} value={c}>{CORPS_LABEL[c] ?? c}</option>
                ))}
              </select>
            </label>
            {cats.length > 0 && (
              <label className="flex items-center gap-1">
                Ranger sous&nbsp;:
                <select className="rounded border border-slate-200 px-1 py-0.5 text-[11px]" value="" onChange={(e) => { if (e.target.value) rangerSous(q.section, q.id, e.target.value); }}>
                  <option value="">— catégorie —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" onClick={() => removeQuestion(q.id)} className="hover:text-red-600">Supprimer la question</button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="text-sm font-medium mb-1.5">{q.label}</div>
        <ReponsesQuestion
          q={q}
          valeur={customRep[q.id]}
          onUnique={(optId) => setCustom(q.id, customRep[q.id] === optId ? "" : optId)}
          onToggle={(optId) => toggleMultiple(q.id, optId)}
          onNombre={(n) => setCustom(q.id, n)}
        />
      </div>
    );
  }

  // Palier 3 : les questions custom d'une section, triées par corps d'état (chronologie), en BlocItems.
  const customItems = (section: CustomSection): BlocItem[] =>
    trierQuestionsParCorps(config.questions.filter((q) => q.section === section)).map((q) => ({
      id: `q:${q.id}`,
      node: renderQuestionCustom(q),
    }));

  // Catégories custom d'une section, en BlocItems (sous-titre renommable + rattachement + suppression, déplaçable).
  const customHeadingItems = (section: CustomSection): BlocItem[] =>
    headingsDe(section).map((h) => {
      const sousCategorie = !!h.parent;
      return {
        id: `h:${h.id}`,
        node: (
          <div className={sousCategorie ? "pl-4" : "border-t border-slate-200 pt-4"}>
            <div className="flex items-center justify-between gap-2">
              <h3 className={sousCategorie ? "text-xs font-semibold text-slate-500 flex items-center gap-1" : "text-sm font-semibold text-slate-700"}>
                {sousCategorie && <span className="text-slate-300">↳</span>}
                {perso ? (
                  <Renommable texte={h.label} actif onSave={(v) => renameHeading(h.id, v)} className="cursor-text" />
                ) : (
                  h.label
                )}
              </h3>
              {perso && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-slate-400">
                    Rattacher à&nbsp;:
                    <select
                      className="rounded border border-slate-300 px-1.5 py-1 text-[11px] text-slate-600"
                      value={h.parent ?? ""}
                      onChange={(e) => rattacherCategorie(section, h.id, e.target.value)}
                    >
                      <option value="">— catégorie principale —</option>
                      {categoriesDe(section)
                        .filter((c) => c.id !== `h:${h.id}`)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => removeHeading(h.id)} className="text-xs text-slate-400 hover:text-red-600" title="Supprimer la catégorie">✕</button>
                </div>
              )}
            </div>
          </div>
        ),
      };
    });

  // Boutons de bas de section (mode perso) : ajouter une question / une catégorie.
  // Fonction de rendu simple (pas un composant imbriqué : un composant défini dans le
  // rendu serait démonté/remonté à chaque frappe, avec perte de focus).
  const ajoutBoutons = (section: CustomSection) =>
    perso ? (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => addQuestion(section)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-sm text-[#4F46E5] font-medium hover:bg-indigo-100/60">
          + Ajouter une question
        </button>
        <button type="button" onClick={() => addHeading(section)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 font-medium hover:border-indigo-300 hover:text-indigo-600">
          + Ajouter une catégorie
        </button>
      </div>
    ) : null;

  const etape1Valide =
    nom.trim().length > 0 &&
    Number(surface) > 5 &&
    /^\d{5}$/.test(codePostal.trim());

  // ── Auto-sauvegarde des réponses du projet : chaque changement est enregistré (débounce) ──
  // Dès que l'étape 1 est valide, le projet est créé/mis à jour tout seul — plus besoin d'attendre le bouton.
  const projetIdRef = useRef<number | null>(edit?.id ?? null);
  const rRef = useRef(r);
  rRef.current = r;
  const metaRef = useRef({ nom, typeBien, surface, codePostal });
  metaRef.current = { nom, typeBien, surface, codePostal };

  // Validité lue via metaRef pour que le flush (fermeture/démontage) ne PATCHe
  // jamais un nom vide ou une surface 0 dans un projet existant.
  const metaValide = () => {
    const m = metaRef.current;
    return m.nom.trim().length > 0 && Number(m.surface) > 5 && /^\d{5}$/.test(m.codePostal.trim());
  };
  const payloadProjet = () => {
    const m = metaRef.current;
    return { nom: m.nom.trim(), typeBien: m.typeBien, surface: Number(m.surface), codePostal: m.codePostal.trim(), reponses: rRef.current };
  };
  const { etat: answerSave, flush: flushProjet } = useAutoSave(
    (keepalive) => {
      if (!metaValide()) return null; // invalide : rien n'est envoyé, l'état reste « à sauver »
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
      })
        .then(async (r) => {
          if (!r.ok) return false;
          projetIdRef.current = (await r.json()).id;
          return true;
        });
    },
    800,
    [r, nom, typeBien, surface, codePostal]
  );

  async function creer() {
    setSaving(true);
    setError(null);
    await flushProjet(); // attend aussi une éventuelle sauvegarde déjà en cours (sérialisé)
    const id = projetIdRef.current;
    if (id) {
      router.push(`/projets/${id}`);
      router.refresh();
    } else {
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
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-indigo-200/80 min-w-[92px] text-right">
              {saveState === "saving" ? "Enregistrement…" : saveState === "saved" ? "✓ Enregistré" : ""}
            </span>
            <button
              type="button"
              onClick={() => setPerso(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-[#1E1B4B] px-4 py-2 text-sm font-semibold hover:bg-indigo-50"
            >
              ✓ Terminer
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {Array.from({ length: r.typeProjet === "neuf" ? 2 : 4 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= etape ? "bg-indigo-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        {!perso && (
          <span className="shrink-0 min-w-[92px] text-right text-xs text-slate-400">
            {answerSave === "saving" ? "Enregistrement…" : answerSave === "saved" ? "✓ Enregistré" : ""}
          </span>
        )}
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
          <SectionBlocs
            ctx={orderCtxFor(1)}
            items={[
              {
                id: "typeProjet",
                node: (
                  <ChoixGroupe
                    label="Type de projet"
                    obligatoire
                    choix={[
                      { value: "renovation", label: "Rénovation" },
                      { value: "neuf", label: "Construction neuve" },
                    ]}
                    value={r.typeProjet}
                    onChange={(v) => set("typeProjet", v)}
                  />
                ),
              },
              {
                id: "modeEstimation",
                node: (
                  <ChoixGroupe
                    label="Niveau d'estimation"
                    obligatoire
                    choix={[
                      { value: "rapide", label: "Rapide", hint: "quelques questions, fourchette large" },
                      { value: "detaille", label: "Détaillée (±15 %)", hint: "plus de questions, fourchette resserrée" },
                    ]}
                    value={r.modeEstimation}
                    onChange={(v) => set("modeEstimation", v)}
                  />
                ),
              },
              {
                id: "nom",
                node: (
                  <div>
                    <label className="text-sm font-medium"><Libelle k="Nom du projet">Nom du projet</Libelle></label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Ex. : T2 rue de la République"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                    />
                  </div>
                ),
              },
              {
                id: "typeBien",
                node: (
                  <ChoixGroupe
                    label="Type de bien"
                    obligatoire
                    choix={[
                      { value: "appartement", label: "Appartement" },
                      { value: "maison", label: "Maison" },
                      { value: "immeuble", label: "Immeuble" },
                    ]}
                    value={typeBien}
                    onChange={setTypeBien}
                  />
                ),
              },
              {
                id: "surface_cp",
                node: (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium"><Libelle k="Surface actuelle (m²)">Surface actuelle (m²)</Libelle></label>
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
                      <label className="text-sm font-medium"><Libelle k="Code postal">Code postal</Libelle></label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="69003"
                        value={codePostal}
                        onChange={(e) => setCodePostal(e.target.value)}
                      />
                    </div>
                  </div>
                ),
              },
              ...customHeadingItems(1),
              ...customItems(1),
            ]}
          />
          {ajoutBoutons(1)}
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
          <SectionBlocs
            ctx={orderCtxFor(20)}
            items={[
              { id: "gammeNeuf", node: (
          <ChoixGroupe
            label="Niveau de gamme"
            obligatoire
            choix={[
              { value: "entree", label: "Entrée de gamme", hint: "~1 400-1 800 €/m²" },
              { value: "standard", label: "Standard", hint: "~1 800-2 300 €/m²" },
              { value: "haut", label: "Haut de gamme", hint: "~2 300-3 200 €/m²" },
              { value: "luxe", label: "Prestige / luxe", hint: "~3 200-5 000 €/m²" },
            ]}
            value={r.gammeNeuf}
            onChange={(v) => set("gammeNeuf", v)}
          />
              ) },
              { id: "terrain", node: (
          <ChoixGroupe
            label="Le terrain est-il déjà viabilisé ?"
            neutre="oui"
            choix={[
              { value: "oui", label: "Oui, viabilisé" },
              { value: "non", label: "Non", hint: "terrassement + raccordements à prévoir" },
            ]}
            value={r.terrainAViabiliser ? "non" : "oui"}
            onChange={(v) => set("terrainAViabiliser", v === "non")}
          />
              ) },
              { id: "prog_grid", node: (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium"><Libelle k="Chambres (neuf)">Chambres</Libelle></label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbChambres} onChange={(e) => set("nbChambres", Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium"><Libelle k="Salles de bain (neuf)">Salles de bain</Libelle></label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbSdb} onChange={(e) => set("nbSdb", Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm font-medium"><Libelle k="Garage (m²)">Garage (m²)</Libelle></label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.garageM2} onChange={(e) => set("garageM2", Number(e.target.value) || 0)} />
            </div>
          </div>
              ) },
              detaille && { id: "neuf_detaille", node: (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium"><Libelle k="WC (total, neuf)">WC (total)</Libelle></label>
                  <input type="number" min={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={r.nbWc} onChange={(e) => set("nbWc", Number(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="text-sm font-medium"><Libelle k="Terrasse (m², 0 si aucune)">Terrasse (m², 0 si aucune)</Libelle></label>
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
            neutre="non"
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
            </div>
              ) },
              { id: "ecs_neuf", node: (
          <ChoixGroupe
            label="Eau chaude sanitaire"
            cle="Eau chaude sanitaire (neuf)"
            neutre="inchange"
            choix={[
              { value: "inchange", label: "Standard incluse", hint: "ballon élec. dans le prix au m²" },
              { value: "thermo", label: "Thermodynamique", hint: "surcoût, éligible aides" },
              { value: "solaire", label: "Solaire (CESI)", hint: "surcoût" },
            ]}
            value={r.ecs}
            onChange={(v) => set("ecs", v)}
          />
              ) },
              { id: "assainissement_neuf", node: (
          <ChoixGroupe
            label="Assainissement"
            cle="Assainissement (neuf)"
            choix={[
              { value: "tout_egout", label: "Tout-à-l'égout", hint: "raccordement au réseau" },
              { value: "individuel_fosse", label: "Fosse toutes eaux" },
              { value: "individuel_micro", label: "Microstation" },
            ]}
            value={r.assainissement === "raccorde" ? "tout_egout" : r.assainissement}
            onChange={(v) => set("assainissement", v)}
          />
              ) },
            ]}
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

      {/* Onglet 2 — Diagnostic (état actuel), pilote les travaux */}
      {etape === 2 && r.typeProjet === "renovation" && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">2 · État actuel du bien</h2>
          <p className="text-xs text-slate-500 -mt-2">
            Décris l&apos;état réel du bien : ça détermine les travaux proposés à l&apos;étape suivante.
          </p>
          <SectionBlocs
            ctx={orderCtxFor(2)}
            items={[
              {
                id: "dpe_annee",
                node: (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium"><Libelle k="DPE actuel">DPE actuel</Libelle></label>
                      <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={r.dpe} onChange={(e) => set("dpe", e.target.value)}>
                        <option value="inconnu">Je ne sais pas</option>
                        {["A", "B", "C", "D", "E", "F", "G"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium"><Libelle k="Année de construction">Année de construction</Libelle></label>
                      <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={r.anneeConstruction} onChange={(e) => set("anneeConstruction", e.target.value)}>
                        <option value="inconnue">Je ne sais pas</option>
                        <option value="avant_1949">Avant 1949</option>
                        <option value="1949_1974">1949 – 1974</option>
                        <option value="1975_1997">1975 – 1997</option>
                        <option value="apres_1997">Après 1997</option>
                      </select>
                    </div>
                  </div>
                ),
              },
              {
                id: "solSupport",
                node: (
                  <ChoixGroupe
                    label="État du sol existant"
            neutre="dalle_ok"
                    choix={[
                      { value: "dalle_ok", label: "Dalle / chape saine" },
                      { value: "carrelage_existant", label: "Carrelage existant" },
                      { value: "plancher_bois", label: "Plancher bois fatigué" },
                      { value: "terre_battue", label: "Terre battue", hint: "vieille maison, cave, grange" },
                    ]}
                    value={r.solSupport}
                    onChange={(v) => set("solSupport", v)}
                  />
                ),
              },
              {
                id: "mursEtat",
                node: (
                  <ChoixGroupe
                    label="État des murs"
            neutre="ok"
                    choix={[
                      { value: "ok", label: "Sains (placo/plâtre OK)" },
                      { value: "platre_abime", label: "Plâtre abîmé", hint: "fissures, cloques → enduit avant peinture" },
                      { value: "pierre_nue", label: "Pierre / brique nue", hint: "doublage + isolation à prévoir" },
                    ]}
                    value={r.mursEtat}
                    onChange={(v) => set("mursEtat", v)}
                  />
                ),
              },
              {
                id: "humidite",
                node: (
                  <ChoixGroupe
                    label="Traces d'humidité ?"
            neutre="non"
                    choix={[
                      { value: "non", label: "Non" },
                      { value: "oui", label: "Oui", hint: "salpêtre, moisissures, odeur — à traiter en premier" },
                    ]}
                    value={r.humidite ? "oui" : "non"}
                    onChange={(v) => set("humidite", v === "oui")}
                  />
                ),
              },
              r.humidite && {
                id: "humiditeSource",
                node: (
                  <ChoixGroupe
                    label="Origine de l'humidité"
            neutre="inconnue"
                    choix={[
                      { value: "inconnue", label: "À diagnostiquer" },
                      { value: "remontees", label: "Remontées capillaires", hint: "bas des murs, salpêtre au sol" },
                      { value: "infiltration", label: "Infiltration", hint: "façade, appui, joint" },
                      { value: "condensation", label: "Condensation", hint: "manque de ventilation" },
                      { value: "toiture", label: "Toiture", hint: "le toit prend l'eau" },
                    ]}
                    value={r.humiditeSource}
                    onChange={(v) => set("humiditeSource", v)}
                  />
                ),
              },
              {
                id: "head_structure",
                node: (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700"><Libelle k="Structure & couverture">Structure & couverture</Libelle></h3>
                  </div>
                ),
              },
              {
                id: "fissuresStructure",
                node: (
                  <ChoixGroupe
                    label="Fissures visibles (structure)"
            neutre="aucune"
                    choix={[
                      { value: "aucune", label: "Aucune" },
                      { value: "microfissures", label: "Microfissures", hint: "fines, superficielles, esthétiques" },
                      { value: "traversantes", label: "Traversantes", hint: "visibles des deux côtés du mur" },
                      { value: "evolutives", label: "Évolutives", hint: "en escalier, > 2 mm, qui bougent → expertise" },
                    ]}
                    value={r.fissuresStructure}
                    onChange={(v) => set("fissuresStructure", v)}
                  />
                ),
              },
              {
                id: "toitureEtat",
                node: (
                  <ChoixGroupe
                    label="État de la toiture"
            neutre="bon"
                    choix={[
                      { value: "bon", label: "Bon état / étanche" },
                      { value: "entretien", label: "Entretien", hint: "nettoyage, quelques tuiles" },
                      { value: "reprise_partielle", label: "Reprise partielle" },
                      { value: "refaire", label: "À refaire", hint: "réfection complète — priorité hors d'eau" },
                      { value: "inconnu", label: "Je ne sais pas" },
                    ]}
                    value={r.toitureEtat}
                    onChange={(v) => set("toitureEtat", v)}
                  />
                ),
              },
              {
                id: "charpenteEtat",
                node: (
                  <ChoixGroupe
                    label="État de la charpente"
            neutre="saine"
                    choix={[
                      { value: "saine", label: "Saine" },
                      { value: "traiter", label: "À traiter", hint: "insectes / champignons (curatif)" },
                      { value: "renforcer", label: "À renforcer" },
                      { value: "refaire", label: "À refaire" },
                    ]}
                    value={r.charpenteEtat}
                    onChange={(v) => set("charpenteEtat", v)}
                  />
                ),
              },
              {
                id: "zinguerie_isolToit",
                node: (
                  <div className="grid grid-cols-2 gap-3">
                    <ChoixGroupe
                      label="Reprendre la zinguerie ?"
            neutre="non"
                      choix={[
                        { value: "non", label: "Non" },
                        { value: "oui", label: "Oui", hint: "gouttières, descentes, solins" },
                      ]}
                      value={r.zinguerieAFaire ? "oui" : "non"}
                      onChange={(v) => set("zinguerieAFaire", v === "oui")}
                    />
                    <ChoixGroupe
                      label="Isoler la toiture (rampants) ?"
            neutre="non"
                      choix={[
                        { value: "non", label: "Non" },
                        { value: "oui", label: "Oui", hint: "isolation par l'intérieur" },
                      ]}
                      value={r.isolationToiture ? "oui" : "non"}
                      onChange={(v) => set("isolationToiture", v === "oui")}
                    />
                  </div>
                ),
              },
              (r.toitureEtat !== "bon" || r.isolationToiture) && {
                id: "toitureM2",
                node: (
                  <div>
                    <label className="text-sm font-medium"><Libelle k="Surface de toiture (m², optionnel)">Surface de toiture (m², optionnel)</Libelle></label>
                    <input
                      type="number"
                      min={0}
                      placeholder="estimée depuis la surface si vide"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={r.toitureM2 || ""}
                      onChange={(e) => set("toitureM2", Number(e.target.value) || 0)}
                    />
                  </div>
                ),
              },
              {
                id: "head_enveloppe",
                node: (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700"><Libelle k="Enveloppe & menuiseries">Enveloppe & menuiseries</Libelle></h3>
                  </div>
                ),
              },
              {
                id: "enduitExtEtat",
                node: (
                  <ChoixGroupe
                    label="État de l'enduit / revêtement extérieur"
            neutre="sain"
                    choix={[
                      { value: "sain", label: "Sain" },
                      { value: "encrasse", label: "Encrassé", hint: "sale mais adhérent → nettoyage" },
                      { value: "microfissures", label: "Micro-fissuré" },
                      { value: "a_piquer", label: "À piquer", hint: "cloque, sonne creux, se décolle" },
                      { value: "brut_sans_revetement", label: "Brut (sans revêtement)", hint: "pierre/parpaing nu" },
                    ]}
                    value={r.enduitExtEtat}
                    onChange={(v) => set("enduitExtEtat", v)}
                  />
                ),
              },
              {
                id: "menuiseriesEtat",
                node: (
                  <ChoixGroupe
                    label="État des menuiseries existantes"
            neutre="bon"
                    choix={[
                      { value: "bon", label: "Bon (double vitrage)" },
                      { value: "simple_vitrage", label: "Simple vitrage", hint: "à remplacer pour le DPE" },
                      { value: "vetuste", label: "Vétustes" },
                      { value: "absentes", label: "Absentes / à créer" },
                    ]}
                    value={r.menuiseriesEtat}
                    onChange={(v) => set("menuiseriesEtat", v)}
                  />
                ),
              },
              {
                id: "encadrementsEtat",
                node: (
                  <ChoixGroupe
                    label="Encadrements pour la pose des menuiseries"
            neutre="bon"
                    choix={[
                      { value: "bon", label: "Prêts (sains, d'équerre)" },
                      { value: "reprise", label: "À reprendre", hint: "appuis, tableaux, linteaux" },
                      { value: "creer", label: "À créer", hint: "nouvelle ouverture" },
                    ]}
                    value={r.encadrementsEtat}
                    onChange={(v) => set("encadrementsEtat", v)}
                  />
                ),
              },
              (r.encadrementsEtat === "reprise" || r.encadrementsEtat === "creer") && {
                id: "nbEncadrementsReprise",
                node: (
                  <div>
                    <label className="text-sm font-medium"><Libelle k="Nombre d'ouvertures concernées">Nombre d&apos;ouvertures concernées</Libelle></label>
                    <input
                      type="number"
                      min={0}
                      placeholder="estimé si vide"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={r.nbEncadrementsReprise || ""}
                      onChange={(e) => set("nbEncadrementsReprise", Number(e.target.value) || 0)}
                    />
                  </div>
                ),
              },
              {
                id: "head_sol",
                node: (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700"><Libelle k="Sol & niveaux">Sol & niveaux</Libelle></h3>
                  </div>
                ),
              },
              {
                id: "niveau_isolSol",
                node: (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium"><Libelle k="Niveau à rattraper (cm)">Niveau à rattraper (cm)</Libelle></label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0 si niveau OK"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={r.niveauARattraper || ""}
                        onChange={(e) => set("niveauARattraper", Number(e.target.value) || 0)}
                      />
                      <p className="mt-1 text-xs text-slate-500">hauteur jusqu&apos;au niveau fini souhaité</p>
                    </div>
                    <ChoixGroupe
                      label="Isolation du sol à prévoir ?"
            neutre="non"
                      choix={[
                        { value: "non", label: "Non" },
                        { value: "oui", label: "Oui", hint: "sous chape / dalle" },
                      ]}
                      value={r.isolationSol ? "oui" : "non"}
                      onChange={(v) => set("isolationSol", v === "oui")}
                    />
                  </div>
                ),
              },
              ...customHeadingItems(2),
              ...customItems(2),
            ]}
          />
          {ajoutBoutons(2)}
          <div className="flex gap-3">
            <button onClick={() => setEtape(1)} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium">
              Retour
            </button>
            <button onClick={() => setEtape(3)} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-white font-medium">
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Onglet 3 — Travaux prévus */}
      {etape === 3 && r.typeProjet === "renovation" && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">3 · Travaux prévus</h2>
          <SectionBlocs
            ctx={orderCtxFor(3)}
            items={[
              { id: "curage", node: (
          <ChoixGroupe
            label="Démolition / curage"
            neutre="aucun"
            choix={[
              { value: "aucun", label: "Aucun" },
              { value: "leger", label: "Léger", hint: "dépose revêtements, équipements" },
              { value: "complet", label: "Complet", hint: "tout à nu + évacuation" },
            ]}
            value={r.curage}
            onChange={(v) => set("curage", v)}
          />
              ) },
              { id: "electricite", node: (
          <ChoixGroupe
            label="Électricité"
            neutre="ok"
            choix={[
              { value: "ok", label: "Aux normes" },
              { value: "partielle", label: "Mise en sécurité" },
              { value: "totale", label: "À refaire entièrement", hint: "tableau, câblage, prises, points lumineux, terre, Consuel" },
            ]}
            value={r.electricite}
            onChange={(v) => set("electricite", v)}
          />
              ) },
              (detaille && r.electricite !== "ok") && { id: "elec_spots", node: (
            <div className="flex flex-wrap items-end gap-3">
              <ChoixGroupe
                label="Luminaires / spots (hors câblage, non compris par défaut)"
            neutre="non"
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
                  <label className="text-sm font-medium"><Libelle k="Nombre de points">Nombre de points</Libelle></label>
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
              ) },
              { id: "plomberie", node: (
          <ChoixGroupe
            label="Plomberie"
            neutre="ok"
            choix={[
              { value: "ok", label: "OK" },
              { value: "reprise", label: "Reprise partielle" },
              { value: "complete", label: "À refaire" },
            ]}
            value={r.plomberie}
            onChange={(v) => set("plomberie", v)}
          />
              ) },
              { id: "sdb", node: (
          <ChoixGroupe
            label="Salle de bain"
            neutre="aucune"
            choix={[
              { value: "aucune", label: "Rien à faire" },
              { value: "rafraichir", label: "Rafraîchir" },
              { value: "complete", label: "Refaire entièrement" },
            ]}
            value={r.sdb}
            onChange={(v) => set("sdb", v)}
          />
              ) },
              (detaille && r.sdb === "complete") && { id: "sdb_config", node: (
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
              {perso && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-2">
                  <div className="text-[11px] text-slate-500 mb-1">Champs de la salle de bain — clique pour masquer / réafficher :</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SDB_CHAMPS.map((ch) => {
                      const masque = estMasqueSdb(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleSdbChamp(ch.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs ${masque ? "border-dashed border-slate-300 text-slate-400 line-through" : "border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"}`}
                          title={masque ? "Réafficher" : "Masquer"}
                        >
                          {ch.label} {masque ? "↺" : "✕"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  {!estMasqueSdb("douche") && (
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
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {!estMasqueSdb("wc") && (
                      <ChoixGroupe
                        label="WC"
            neutre="aucun"
                        choix={[
                          { value: "suspendu", label: "Suspendu" },
                          { value: "classique", label: "Classique" },
                          { value: "aucun", label: "Aucun" },
                        ]}
                        value={c.wc}
                        onChange={(v) => updateSdb(i, "wc", v)}
                      />
                    )}
                    {!estMasqueSdb("vasque") && (
                      <ChoixGroupe
                        label="Vasque"
                        choix={[
                          { value: "simple", label: "Simple" },
                          { value: "double", label: "Double" },
                        ]}
                        value={c.vasque}
                        onChange={(v) => updateSdb(i, "vasque", v)}
                      />
                    )}
                    {!estMasqueSdb("plomberie") && (
                      <ChoixGroupe
                        label="Plomberie"
                        cle="Plomberie (SDB)"
                        choix={[
                          { value: "encastree", label: "Encastrée" },
                          { value: "apparente", label: "Apparente" },
                        ]}
                        value={c.plomberie}
                        onChange={(v) => updateSdb(i, "plomberie", v)}
                      />
                    )}
                    {!estMasqueSdb("faience") && (
                      <ChoixGroupe
                        label="Faïence"
                        choix={[
                          { value: "mi", label: "Mi-hauteur + douche" },
                          { value: "toute", label: "Toute hauteur" },
                        ]}
                        value={c.faienceTouteHauteur ? "toute" : "mi"}
                        onChange={(v) => updateSdb(i, "faienceTouteHauteur", v === "toute")}
                      />
                    )}
                  </div>
                  {!estMasqueSdb("seche") && (
                    <ChoixGroupe
                      label="Sèche-serviettes"
            neutre="non"
                      choix={[
                        { value: "oui", label: "Oui" },
                        { value: "non", label: "Non" },
                      ]}
                      value={c.secheServiettes ? "oui" : "non"}
                      onChange={(v) => updateSdb(i, "secheServiettes", v === "oui")}
                    />
                  )}
                  {renderSdbAnswers(i, c)}
                </div>
              ))}
              {perso && renderSdbEditor()}
              <p className="text-xs text-slate-400">
                Chaque salle de bain est chiffrée séparément selon son équipement et
                sa taille — pas besoin de passer par le métré pièce par pièce.
              </p>
            </div>
              ) },
              { id: "cuisine", node: (
          <ChoixGroupe
            label="Cuisine"
            neutre="aucune"
            choix={[
              { value: "aucune", label: "Rien à faire" },
              { value: "rafraichir", label: "Rafraîchir" },
              { value: "complete", label: "Refaire entièrement" },
            ]}
            value={r.cuisine}
            onChange={(v) => set("cuisine", v)}
          />
              ) },
              (detaille && r.cuisine === "complete") && { id: "cuisine_gamme", node: (
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
              ) },
              { id: "sols", node: (
          <ChoixGroupe
            label="Sols"
            neutre="aucun"
            choix={[
              { value: "aucun", label: "À garder" },
              { value: "partiel", label: "Refaire en partie" },
              { value: "complet", label: "Tout refaire" },
            ]}
            value={r.sols}
            onChange={(v) => set("sols", v)}
          />
              ) },
              (detaille && r.sols !== "aucun" && r.solSupport === "terre_battue") && { id: "chape", node: (
            <ChoixGroupe
              label="Type de chape"
              choix={[
                { value: "traditionnelle", label: "Chape traditionnelle", hint: "ciment, tirée à la règle" },
                { value: "liquide", label: "Chape liquide", hint: "pompée — idéale plancher chauffant" },
              ]}
              value={r.chapeType}
              onChange={(v) => set("chapeType", v)}
            />
              ) },
              (r.sols !== "aucun") && { id: "sols_revetement", node: (
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
              ) },
              (detaille && r.sols !== "aucun") && { id: "sols_detail", node: (
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
              ) },
              (detaille && r.sols !== "aucun" && r.solsType !== "beton_cire") && { id: "plinthes", node: (
            <ChoixGroupe
              label="Plinthes"
            neutre="aucune"
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
              ) },
              (detaille && r.sols !== "aucun" && r.solsType === "carrelage") && { id: "carrelage_format", node: (
            <ChoixGroupe
              label="Format du carrelage"
              choix={[
                { value: "standard", label: "Standard (≤ 45×45)" },
                { value: "grand", label: "Grand format (≥ 60×60)", hint: "pose plus technique, plus cher" },
              ]}
              value={r.carrelageFormat}
              onChange={(v) => set("carrelageFormat", v)}
            />
              ) },
              detaille && { id: "doublage", node: (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div>
                <label className="text-sm font-medium">
                  <Libelle k="Doublage isolant des murs (ml, 0 = auto selon l’état)">Doublage isolant des murs (ml, 0 = auto selon l&apos;état)</Libelle>
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
              ) },
              { id: "peinture", node: (
          <ChoixGroupe
            label="Peinture"
            neutre="aucune"
            choix={[
              { value: "aucune", label: "Rien" },
              { value: "partielle", label: "Quelques pièces" },
              { value: "complete", label: "Tout le logement" },
            ]}
            value={r.peinture}
            onChange={(v) => set("peinture", v)}
          />
              ) },
              { id: "fenetres_portes", node: (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium"><Libelle k="Fenêtres à remplacer">Fenêtres à remplacer</Libelle></label>
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
                <label className="text-sm font-medium"><Libelle k="Blocs-portes intérieurs">Blocs-portes intérieurs</Libelle></label>
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
              ) },
              (detaille && r.fenetres > 0) && { id: "fenetres_materiau", node: (
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
              ) },
              { id: "porteEntree", node: (
          <ChoixGroupe
            label="Porte d'entrée"
            neutre="aucune"
            choix={[
              { value: "aucune", label: "À garder" },
              { value: "pvc", label: "PVC" },
              { value: "alu", label: "Aluminium" },
              { value: "bois", label: "Bois" },
            ]}
            value={r.porteEntree}
            onChange={(v) => set("porteEntree", v)}
          />
              ) },
              (r.fenetres > 0) && { id: "volets", node: (
            <ChoixGroupe
              label="Volets roulants intégrés aux fenêtres ?"
            neutre="non"
              choix={[
                { value: "non", label: "Non" },
                { value: "oui", label: "Oui" },
              ]}
              value={r.voletRoulant ? "oui" : "non"}
              onChange={(v) => set("voletRoulant", v === "oui")}
            />
              ) },
              (r.fenetres > 0 && r.voletRoulant) && { id: "volet_type", node: (
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
              ) },
              { id: "cloisons", node: (
          <ChoixGroupe
            label="Cloisons à créer"
            neutre="aucune"
            choix={[
              { value: "aucune", label: "Aucune" },
              { value: "quelques", label: "1-2 cloisons" },
              { value: "beaucoup", label: "Redistribution" },
            ]}
            value={r.cloisons}
            onChange={(v) => set("cloisons", v)}
          />
              ) },
              (detaille && r.cloisons !== "aucune") && { id: "cloison_ml", node: (
            <div>
              <label className="text-sm font-medium">
                <Libelle k="Mètres linéaires de cloison (0 = estimé automatiquement)">Mètres linéaires de cloison (0 = estimé automatiquement)</Libelle>
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
              ) },
              { id: "chauffage", node: (
          <ChoixGroupe
            label="Chauffage"
            neutre="aucun"
            choix={[
              { value: "aucun", label: "À garder" },
              { value: "radiateurs", label: "Radiateurs élec." },
              { value: "chaudiere", label: "Chaudière gaz" },
              { value: "pac", label: "PAC air-eau" },
            ]}
            value={r.chauffage}
            onChange={(v) => set("chauffage", v)}
          />
              ) },
              { id: "vmc", node: (
          <ChoixGroupe
            label="VMC à installer ?"
            neutre="non"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui" },
            ]}
            value={r.vmc ? "oui" : "non"}
            onChange={(v) => set("vmc", v === "oui")}
          />
              ) },
              r.vmc && { id: "vmc_config", node: (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-sm font-medium"><Libelle k="Nombre de VMC">Nombre de VMC</Libelle></label>
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
              ) },
              { id: "ecs", node: (
          <ChoixGroupe
            label="Eau chaude sanitaire"
            neutre="inchange"
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
              ) },
              { id: "reseauxEvac", node: (
          <ChoixGroupe
            label="Créer / refaire les réseaux d'évacuation ?"
            neutre="non"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui", hint: "eaux usées + eaux vannes" },
            ]}
            value={r.reseauxEvac ? "oui" : "non"}
            onChange={(v) => set("reseauxEvac", v === "oui")}
          />
              ) },
              { id: "niveaux", node: (
          <ChoixGroupe
            label="Configuration du logement"
            choix={[
              { value: "plain_pied", label: "Plain-pied" },
              { value: "etage", label: "Avec étage" },
            ]}
            value={r.niveaux}
            onChange={(v) => set("niveaux", v)}
          />
              ) },
              { id: "nouvelleSurface", node: (
          <div>
            <label className="text-sm font-medium">
              <Libelle k="Création de nouvelle surface (m², 0 si aucune)">Création de nouvelle surface (m², 0 si aucune)</Libelle>
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={r.nouvelleSurfaceM2}
              onChange={(e) => set("nouvelleSurfaceM2", Number(e.target.value) || 0)}
            />
          </div>
              ) },
              ((r.nouvelleSurfaceM2 ?? 0) > 0) && { id: "plancherType", node: (
            <ChoixGroupe
              label="Plancher de la nouvelle surface"
              choix={[
                { value: "bois", label: "Plancher bois", hint: "solivage + panneaux" },
                { value: "beton", label: "Dalle béton" },
              ]}
              value={r.plancherType}
              onChange={(v) => set("plancherType", v)}
            />
              ) },
              { id: "assainissement", node: (
          <ChoixGroupe
            label="Assainissement"
            neutre="raccorde"
            choix={[
              { value: "raccorde", label: "Déjà raccordé", hint: "rien à faire" },
              { value: "tout_egout", label: "Raccordement tout-à-l'égout" },
              { value: "individuel_fosse", label: "Fosse toutes eaux", hint: "assainissement individuel" },
              { value: "individuel_micro", label: "Microstation" },
            ]}
            value={r.assainissement}
            onChange={(v) => set("assainissement", v)}
          />
              ) },
              { id: "raccordements", node: (
          <div>
            <div className="text-sm font-medium mb-1.5"><Libelle k="Raccordements / compteurs à créer">Raccordements / compteurs à créer</Libelle></div>
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
              ) },
              detaille && { id: "programme", node: (
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="text-sm font-semibold"><Libelle k="Programme du logement">Programme du logement</Libelle></div>
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
              ) },
              { id: "facade", node: (
          <ChoixGroupe
            label="Travaux extérieurs / façade ?"
            neutre="non"
            choix={[
              { value: "non", label: "Non" },
              { value: "oui", label: "Oui" },
            ]}
            value={r.facadeAFaire ? "oui" : "non"}
            onChange={(v) => set("facadeAFaire", v === "oui")}
          />
              ) },
              r.facadeAFaire && { id: "facade_config", node: (
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
                  <Libelle k="Surface de façade (m², 0 = estimée automatiquement)">Surface de façade (m², 0 = estimée automatiquement)</Libelle>
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
              ) },
              ...customHeadingItems(3),
              ...customItems(3),
            ]}
          />
          {ajoutBoutons(3)}

          <div className="flex gap-3">
            <button
              onClick={() => setEtape(2)}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium"
            >
              Retour
            </button>
            <button
              onClick={() => setEtape(4)}
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-white font-medium"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {etape === 4 && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium">4 · Objectif et finition</h2>
          <SectionBlocs
            ctx={orderCtxFor(4)}
            items={[
              { id: "finition", node: (
          <ChoixGroupe
            label="Niveau de finition visé"
            obligatoire
            choix={[
              { value: "locatif", label: "Locatif simple", hint: "robuste et économique" },
              { value: "standard", label: "Standard" },
              { value: "premium", label: "Premium", hint: "haut de gamme (+20 %)" },
              { value: "luxe", label: "Luxe", hint: "matériaux nobles, sur-mesure (+45 %)" },
            ]}
            value={r.finition}
            onChange={(v) => set("finition", v)}
          />
              ) },
              ...customHeadingItems(4),
              ...customItems(4),
            ]}
          />
          {ajoutBoutons(4)}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setEtape(3)}
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

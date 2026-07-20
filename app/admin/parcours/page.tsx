"use client";

/**
 * Admin form-builder du parcours (Palier 2) — créer / éditer / supprimer / réordonner
 * étapes, sections, questions et réponses SANS code. Lit/écrit les tables de définition.
 * Suppression = archivage (corbeille), restaurable ; suppression définitive depuis la corbeille.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CORPS_ORDRE, CORPS_LABEL } from "@/lib/customq";
import type { ParcoursComplet, QuestionDef, GroupDef, StepDef, OptionDef, QuestionType } from "@/lib/parcours-schema";

type Entite = "step" | "group" | "question" | "option";
type CorbeilleItem = { entity: Entite; id: string; libelle: string };

const TYPES: { v: QuestionType; l: string }[] = [
  { v: "unique", l: "Choix unique" },
  { v: "multiple", l: "Choix multiple" },
  { v: "bool", l: "Oui / Non" },
  { v: "liste", l: "Liste déroulante" },
  { v: "nombre", l: "Nombre" },
  { v: "surface", l: "Surface (m²)" },
  { v: "longueur", l: "Longueur" },
  { v: "largeur", l: "Largeur" },
  { v: "hauteur", l: "Hauteur" },
  { v: "volume", l: "Volume" },
  { v: "quantite", l: "Quantité" },
  { v: "curseur", l: "Curseur" },
  { v: "texte", l: "Texte libre" },
  { v: "commentaire", l: "Commentaire" },
  { v: "photo", l: "Photo" },
  { v: "document", l: "Document" },
  { v: "configurateur_sdb", l: "Widget : configurateur SDB" },
  { v: "metre_pieces", l: "Widget : métré pièces" },
];
const typeLabel = (t: string) => TYPES.find((x) => x.v === t)?.l ?? t;

export default function AdminParcours() {
  const [pc, setPc] = useState<ParcoursComplet | null>(null);
  const [corb, setCorb] = useState<CorbeilleItem[]>([]);
  const [type, setType] = useState<"renovation" | "neuf">("renovation");
  const [voirCorbeille, setVoirCorbeille] = useState(false);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const d = await (await fetch("/api/admin/parcours")).json();
    setPc(d.parcours);
    setCorb(d.corbeille ?? []);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Toute mutation passe par ici : POST puis rechargement de l'arbre.
  const op = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch("/api/admin/parcours/mutation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await reload();
    },
    [reload]
  );

  const toggleOuvert = (id: string) =>
    setOuverts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (!pc) return <div className="py-8 text-sm text-muted">Chargement…</div>;
  const parcours = pc[type];

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-brand-700">Questionnaire</span>
        <span className="text-line-strong">·</span>
        <Link href="/admin/referentiel" className="font-medium text-muted transition-colors hover:text-brand-700">Catalogue de prix</Link>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Personnalisation</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Éditeur de parcours</h1>
          <p className="mt-1.5 text-[15px] text-muted">Construis le questionnaire sans code — enregistré automatiquement.</p>
        </div>
        <button onClick={() => setVoirCorbeille((v) => !v)} className="btn btn-outline py-2 text-[13px]">
          🗑 Corbeille {corb.length > 0 && <span className="text-faint">({corb.length})</span>}
        </button>
      </div>

      {/* Sélecteur de parcours */}
      <div className="flex gap-2">
        {(["renovation", "neuf"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-field border px-3.5 py-2 text-sm transition-all ${
              type === t
                ? "border-brand-500 bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-500/25"
                : "border-line-strong bg-surface font-medium text-muted hover:border-brand-300 hover:text-ink"
            }`}
          >
            {t === "renovation" ? "Rénovation" : "Construction neuve"}
          </button>
        ))}
      </div>

      {voirCorbeille && (
        <div className="card bg-surface-2 p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Corbeille</h2>
          {corb.length === 0 ? (
            <p className="text-xs text-faint">Vide.</p>
          ) : (
            <ul className="space-y-1.5">
              {corb.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted"><span className="text-xs text-faint">{c.entity}</span> · {c.libelle}</span>
                  <span className="flex gap-3">
                    <button onClick={() => op({ action: "restore", entity: c.entity, id: c.id })} className="text-xs font-medium text-brand-600 hover:text-brand-700">Restaurer</button>
                    <button onClick={() => { if (confirm("Supprimer définitivement ?")) op({ action: "delete", entity: c.entity, id: c.id }); }} className="text-xs font-medium text-danger hover:underline">Supprimer</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!parcours ? (
        <p className="text-sm text-muted">Parcours introuvable.</p>
      ) : (
        <div className="space-y-4">
          {parcours.steps.map((s, i) => (
            <StepCard key={s.id} step={s} premier={i === 0} dernier={i === parcours.steps.length - 1} op={op} ouverts={ouverts} toggleOuvert={toggleOuvert} />
          ))}
          <button onClick={() => op({ action: "create", entity: "step", parentId: parcours.id })} className="w-full rounded-field border border-dashed border-brand-300 bg-brand-50/40 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50">
            + Ajouter une étape
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sous-composants ──

type Op = (body: Record<string, unknown>) => Promise<void>;

function Ctrls({ entity, id, premier, dernier, op }: { entity: Entite; id: string; premier: boolean; dernier: boolean; op: Op }) {
  return (
    <span className="flex items-center gap-1 text-faint">
      <button disabled={premier} onClick={() => op({ action: "move", entity, id, sens: "up" })} className="px-1 hover:text-brand-600 disabled:opacity-30" title="Monter">↑</button>
      <button disabled={dernier} onClick={() => op({ action: "move", entity, id, sens: "down" })} className="px-1 hover:text-brand-600 disabled:opacity-30" title="Descendre">↓</button>
      <button onClick={() => op({ action: "archive", entity, id })} className="px-1 hover:text-danger" title="Retirer (corbeille)">✕</button>
    </span>
  );
}

/** Champ texte édité en local, persisté au blur (rechargement ensuite). */
function ChampTexte({ valeur, onSave, placeholder, className }: { valeur: string; onSave: (v: string) => void; placeholder?: string; className?: string }) {
  const [v, setV] = useState(valeur);
  useEffect(() => setV(valeur), [valeur]);
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== valeur && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={className ?? "rounded-lg border border-line-strong px-2 py-1 text-sm"}
    />
  );
}

function StepCard({ step, premier, dernier, op, ouverts, toggleOuvert }: { step: StepDef; premier: boolean; dernier: boolean; op: Op; ouverts: Set<string>; toggleOuvert: (id: string) => void }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <ChampTexte valeur={step.titre} onSave={(v) => op({ action: "update", entity: "step", id: step.id, patch: { titre: v } })} className="flex-1 rounded-lg border border-transparent px-2 py-1 text-base font-semibold text-ink hover:border-line" />
        <Ctrls entity="step" id={step.id} premier={premier} dernier={dernier} op={op} />
      </div>
      <div className="space-y-3 border-l-2 border-line pl-2">
        {step.groups.map((g, gi) => (
          <GroupCard key={g.id} group={g} premier={gi === 0} dernier={gi === step.groups.length - 1} op={op} ouverts={ouverts} toggleOuvert={toggleOuvert} />
        ))}
        <button onClick={() => op({ action: "create", entity: "group", parentId: step.id })} className="text-xs font-medium text-muted hover:text-brand-600">+ Ajouter une section</button>
      </div>
    </div>
  );
}

function GroupCard({ group, premier, dernier, op, ouverts, toggleOuvert }: { group: GroupDef; premier: boolean; dernier: boolean; op: Op; ouverts: Set<string>; toggleOuvert: (id: string) => void }) {
  return (
    <div className="rounded-field bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <ChampTexte valeur={group.titre ?? ""} placeholder="(section sans titre)" onSave={(v) => op({ action: "update", entity: "group", id: group.id, patch: { titre: v } })} className="flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-ink hover:border-line" />
        <Ctrls entity="group" id={group.id} premier={premier} dernier={dernier} op={op} />
      </div>
      <div className="space-y-2">
        {group.questions.map((q, qi) => (
          <QuestionCard key={q.id} q={q} premier={qi === 0} dernier={qi === group.questions.length - 1} op={op} ouvert={ouverts.has(q.id)} toggle={() => toggleOuvert(q.id)} />
        ))}
        <button onClick={() => op({ action: "create", entity: "question", parentId: group.id })} className="text-xs font-semibold text-brand-600 hover:text-brand-700">+ Ajouter une question</button>
      </div>
    </div>
  );
}

function QuestionCard({ q, premier, dernier, op, ouvert, toggle }: { q: QuestionDef; premier: boolean; dernier: boolean; op: Op; ouvert: boolean; toggle: () => void }) {
  const maj = (patch: Record<string, unknown>) => op({ action: "update", entity: "question", id: q.id, patch });
  return (
    <div className="rounded-field border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button onClick={toggle} className="flex-1 text-left text-sm">
          <span className="font-medium text-ink">{q.titre || "(sans titre)"}</span>
          <span className="ml-2 text-[11px] text-faint">{typeLabel(q.type)}{q.binding ? " · lié" : " · libre"}{q.obligatoire ? " · requis" : ""}</span>
        </button>
        <Ctrls entity="question" id={q.id} premier={premier} dernier={dernier} op={op} />
      </div>
      {ouvert && (
        <div className="space-y-3 border-t border-line p-3">
          <div className="flex flex-wrap items-center gap-3">
            <ChampTexte valeur={q.titre} onSave={(v) => maj({ titre: v })} className="min-w-48 flex-1 rounded-lg border border-line-strong px-2 py-1.5 text-sm font-medium" placeholder="Intitulé" />
            <select value={q.type} onChange={(e) => maj({ type: e.target.value })} className="rounded-lg border border-line-strong px-2 py-1.5 text-xs">
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" className="accent-brand-600" checked={q.obligatoire} onChange={(e) => maj({ obligatoire: e.target.checked ? 1 : 0 })} /> Obligatoire
            </label>
          </div>
          <ChampTexte valeur={q.description ?? ""} onSave={(v) => maj({ description: v })} className="w-full rounded-lg border border-line-strong px-2 py-1.5 text-xs" placeholder="Description (optionnel)" />
          <ChampTexte valeur={q.aide ?? ""} onSave={(v) => maj({ aide: v })} className="w-full rounded-lg border border-line-strong px-2 py-1.5 text-xs" placeholder="Texte d'aide (optionnel)" />

          {/* Avancé : liaison moteur / corps d'état (pour le prix des questions libres) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-faint">Avancé (liaison moteur, prix)</summary>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-muted">
                Variable liée
                <ChampTexte valeur={q.binding ?? ""} onSave={(v) => maj({ binding: v || null })} className="rounded-lg border border-line-strong px-2 py-1 text-xs" placeholder="ex. sols (vide = libre)" />
              </label>
              <label className="flex items-center gap-1 text-muted">
                Corps d&apos;état (prix)
                <select value={q.corpsEtat ?? ""} onChange={(e) => maj({ corps_etat: e.target.value || null })} className="rounded-lg border border-line-strong px-1.5 py-1 text-xs">
                  <option value="">—</option>
                  {CORPS_ORDRE.map((c) => <option key={c} value={c}>{CORPS_LABEL[c] ?? c}</option>)}
                </select>
              </label>
            </div>
          </details>

          {/* Réponses */}
          {(q.type === "unique" || q.type === "multiple" || q.type === "liste" || q.type === "bool") && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">Réponses</div>
              {q.options.map((o, oi) => (
                <OptionRow key={o.id} o={o} liee={!!q.binding} premier={oi === 0} dernier={oi === q.options.length - 1} op={op} />
              ))}
              <button onClick={() => op({ action: "create", entity: "option", parentId: q.id })} className="text-xs font-semibold text-brand-600 hover:text-brand-700">+ Réponse</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OptionRow({ o, liee, premier, dernier, op }: { o: OptionDef; liee: boolean; premier: boolean; dernier: boolean; op: Op }) {
  const maj = (patch: Record<string, unknown>) => op({ action: "update", entity: "option", id: o.id, patch });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChampTexte valeur={o.label} onSave={(v) => maj({ label: v })} className="min-w-28 flex-1 rounded-lg border border-line px-2 py-1 text-sm" placeholder="Réponse" />
      {liee ? (
        <ChampTexte valeur={o.valeur ?? ""} onSave={(v) => maj({ valeur: v })} className="w-28 rounded-lg border border-line px-2 py-1 text-xs text-muted" placeholder="valeur moteur" />
      ) : (
        <>
          <ChampTexte valeur={o.impactPrix ? String(o.impactPrix) : ""} onSave={(v) => maj({ impact_prix: Number(v) || 0 })} className="num w-20 rounded-lg border border-line px-2 py-1 text-right text-xs" placeholder="prix" />
          <select value={o.mode ?? "forfait"} onChange={(e) => maj({ mode: e.target.value })} className="rounded-lg border border-line px-1 py-1 text-xs">
            <option value="forfait">€ forfait</option>
            <option value="m2">€/m²</option>
            <option value="pu">€/u.</option>
          </select>
        </>
      )}
      <Ctrls entity="option" id={o.id} premier={premier} dernier={dernier} op={op} />
    </div>
  );
}

"use client";

/**
 * Moteur de rendu générique du parcours data-driven.
 * Lit un ParcoursDef (chargé depuis la base) et rend les questions par type, en écrivant les
 * réponses selon le `binding` de chaque question → le blob `reponses` a la MÊME forme que le
 * formulaire codé en dur → `estimation.ts` fonctionne à l'identique (contrat de variables).
 *
 * Palier 1 : types courants gérés (unique/liste/bool/nombre/surface/texte/multiple/curseur/
 * commentaire). Widgets experts (configurateur_sdb, metre_pieces) affichés en repère, à brancher
 * au palier suivant. Règles conditionnelles = palier suivant (ici toutes les questions s'affichent).
 */
import { estVisible, type ParcoursDef, type QuestionDef } from "@/lib/parcours-schema";
import SdbConfigurateur, { type SdbCfg } from "@/components/SdbConfigurateur";

/** Champs qui vont dans les MÉTA du projet (colonnes dédiées), pas dans le blob réponses. */
const META_BINDINGS = new Set(["nom", "surface", "codePostal", "typeBien"]);

export type Reponses = Record<string, string | string[] | number | boolean | SdbCfg[]>;
export type Meta = { nom: string; surface: string; codePostal: string; typeBien: string };

const NUM_TYPES = new Set(["nombre", "surface", "longueur", "largeur", "hauteur", "volume", "quantite", "curseur"]);

const pastille = (sel: boolean) =>
  `inline-flex items-center rounded-field border px-3.5 py-2.5 text-sm transition-all duration-150 ${
    sel
      ? "border-brand-500 bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-500/25"
      : "border-line-strong bg-surface font-medium text-muted hover:border-brand-300 hover:text-ink"
  }`;

export default function ParcoursRenderer({
  parcours,
  etape,
  reponses,
  meta,
  setReponse,
  setMeta,
}: {
  parcours: ParcoursDef;
  etape: number; // index de l'étape affichée
  reponses: Reponses;
  meta: Meta;
  setReponse: (binding: string, v: Reponses[string]) => void;
  setMeta: (key: keyof Meta, v: string) => void;
}) {
  const step = parcours.steps[etape];
  if (!step) return null;

  // Lecture d'une variable pour les conditions d'affichage (réponses puis méta).
  const lire = (b: string): unknown => (META_BINDINGS.has(b) ? meta[b as keyof Meta] : reponses[b]);
  // Masquée (config.masque) = non affichée mais son défaut reste appliqué au chiffrage (cf. reponsesParDefaut).
  const questionsVisibles = (qs: QuestionDef[]) =>
    qs.filter((q) => !q.config?.masque && estVisible(q.config?.visibleSi, lire));

  // Questions LIBRES (sans binding moteur) : la réponse vit dans reponses.custom[q.id] (impact prix configurable).
  const customStore = () => (reponses.custom as unknown as Record<string, unknown> | undefined) ?? {};
  const lireCustom = (id: string): unknown => customStore()[id];
  const ecrireCustom = (id: string, v: unknown) =>
    setReponse("custom", { ...customStore(), [id]: v } as unknown as Reponses[string]);

  // Valeur affichée (quelle option est sélectionnée) pour une question liée OU libre.
  const valeurAffichee = (q: QuestionDef): string => {
    const b = q.binding;
    if (!b) { const v = lireCustom(q.id); return v == null ? "" : String(v); }
    if (META_BINDINGS.has(b)) return meta[b as keyof Meta] ?? "";
    const v = reponses[b];
    if (q.type === "bool") {
      const inverse = !!q.config?.inverse;
      const vrai = v === true;
      return inverse ? (vrai ? "non" : "oui") : vrai ? "oui" : "non";
    }
    return v == null ? "" : String(v);
  };

  // Écrit la valeur choisie dans reponses/meta/custom, avec coercition selon le type/binding.
  const choisir = (q: QuestionDef, valeur: string) => {
    const b = q.binding;
    if (!b) { ecrireCustom(q.id, NUM_TYPES.has(q.type) ? Number(valeur) || 0 : valeur); return; }
    if (META_BINDINGS.has(b)) { setMeta(b as keyof Meta, valeur); return; }
    if (q.type === "bool") {
      const inverse = !!q.config?.inverse;
      setReponse(b, inverse ? valeur !== "oui" : valeur === "oui");
      return;
    }
    if (NUM_TYPES.has(q.type)) { setReponse(b, Number(valeur) || 0); return; }
    if (q.config?.bindingType === "number") { setReponse(b, Number(valeur) || 0); return; } // liste numérique (ex. épaisseur)
    setReponse(b, valeur);
  };

  const rendreQuestion = (q: QuestionDef) => {
    const b = q.binding;
    const affiche = valeurAffichee(q);

    // Widget : configurateur de salle de bain (écrit sdbConfigs).
    if (q.type === "configurateur_sdb")
      return (
        <SdbConfigurateur
          value={b ? (reponses[b] as SdbCfg[] | undefined) : undefined}
          onChange={(v) => b && setReponse(b, v)}
          config={q.config?.sdbCustom}
        />
      );
    // Widget métré — page dédiée dans l'app (hors formulaire de création).
    if (q.type === "metre_pieces")
      return (
        <div className="rounded-field border border-dashed border-line-strong bg-surface-2 px-3.5 py-3 text-xs text-faint">
          {q.titre} — se saisit sur la page du projet (métré pièce par pièce).
        </div>
      );

    const label = (
      <div className="field-label">
        {q.titre}
        {q.obligatoire && <span className="text-danger"> *</span>}
      </div>
    );

    // Champs texte / méta
    if (q.type === "texte")
      return (
        <div>
          {label}
          <input className="input" value={affiche} onChange={(e) => choisir(q, e.target.value)} />
          {q.aide && <p className="mt-1.5 text-xs text-faint">{q.aide}</p>}
        </div>
      );

    if (q.type === "commentaire")
      return (
        <div>
          {label}
          <textarea className="input" rows={3} value={affiche} onChange={(e) => choisir(q, e.target.value)} />
        </div>
      );

    // Nombre / surface / dimensions / quantité
    if (NUM_TYPES.has(q.type) && q.type !== "curseur")
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={q.config?.min ?? 0}
              className="input num w-40"
              value={affiche /* méta-aware : surface vit dans meta, les autres nombres dans reponses */}
              onChange={(e) => choisir(q, e.target.value)}
            />
            {q.config?.unite && <span className="text-sm text-faint">{q.config.unite}</span>}
          </div>
        </div>
      );

    if (q.type === "curseur")
      return (
        <div>
          {label}
          <div className="flex items-center gap-3">
            <input
              type="range"
              className="accent-brand-600"
              min={q.config?.min ?? 0}
              max={q.config?.max ?? 100}
              step={q.config?.pas ?? 1}
              value={b && reponses[b] != null ? Number(reponses[b]) : (q.config?.min ?? 0)}
              onChange={(e) => choisir(q, e.target.value)}
            />
            <span className="data text-sm font-semibold text-ink">
              {b ? Number(reponses[b] ?? 0) : 0}
              {q.config?.unite}
            </span>
          </div>
        </div>
      );

    // Liste déroulante
    if (q.type === "liste")
      return (
        <div>
          {label}
          <select className="input" value={affiche} onChange={(e) => choisir(q, e.target.value)}>
            {q.options.map((o) => (
              <option key={o.id} value={o.valeur ?? ""}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    // Choix multiple (pastilles à bascule) — liée (reponses[b]) ou libre (reponses.custom[q.id]).
    if (q.type === "multiple") {
      const brut = b ? reponses[b] : lireCustom(q.id);
      const sel = new Set(Array.isArray(brut) ? (brut as string[]) : []);
      const ecrire = (arr: string[]) => (b ? setReponse(b, arr) : ecrireCustom(q.id, arr));
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => {
              const val = o.valeur ?? o.id;
              const on = sel.has(val);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    const next = new Set(sel);
                    if (next.has(val)) next.delete(val);
                    else next.add(val);
                    ecrire([...next]);
                  }}
                  className={pastille(on)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Choix unique / oui-non (pastilles) — re-clic revient au neutre (dé-sélection sûre)
    const neutre = q.config?.neutre;
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => {
            const val = o.valeur ?? "";
            const sel = affiche === val;
            return (
              <button
                key={o.id}
                type="button"
                title={o.hint}
                onClick={() => choisir(q, sel && !q.obligatoire && neutre != null ? neutre : val)}
                className={pastille(sel)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {q.aide && <p className="mt-1.5 text-xs text-faint">{q.aide}</p>}
      </div>
    );
  };

  return (
    <div className="card p-6 sm:p-7">
      <div className="mb-6">
        <p className="eyebrow">Étape {etape + 1}</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">{step.titre}</h2>
        {step.description && <p className="mt-1 text-sm text-muted">{step.description}</p>}
      </div>

      <div className="space-y-6">
        {step.groups.map((g) => {
          const visibles = questionsVisibles(g.questions);
          if (visibles.length === 0) return null;
          return (
            <div key={g.id} className="space-y-5">
              {g.titre && (
                <div className="flex items-center gap-3 pt-1">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint">{g.titre}</h3>
                  <div className="h-px flex-1 bg-line" />
                </div>
              )}
              {visibles.map((q) => (
                <div key={q.id}>{rendreQuestion(q)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

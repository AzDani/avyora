"use client";

/**
 * Briques du questionnaire des estimations détaillées (« Parle-nous du bien ») : celles de la
 * rénovation (`components/Estimateur.tsx`), partagées avec le neuf (chantier N6 de la revue
 * rénovation / neuf ; le questionnaire du neuf les prend depuis N9). Aucun texte ici : chaque appelant
 * passe les siens (`dictDetail`, `dictNeuf`). Styles : `EST_CSS` (`.tpills`, `.segf`, `.finc`, `.uinp`,
 * `.drtoggle`, `.recap`).
 *
 * Accessibilité : un choix est un groupe nommé (`role="group"`, `aria-label`) de boutons qui disent
 * s'ils sont pressés (`aria-pressed`), comme les pastilles du neuf ; la classe `on` garde le style.
 */
import { useEffect, useState, type ReactNode } from "react";
import type { RegionCoef } from "@/lib/estimateur";

/** Intertitre d'une rubrique du questionnaire. */
export function Intertitre({ children }: { children: ReactNode }) {
  return <div className="gl">{children}</div>;
}

export interface OptionChoix<T extends string> { v: T; label: ReactNode }

/** Pastilles : un choix parmi plusieurs (type de bien), ou plusieurs (`actif` vrai sur chaque pièce choisie). */
export function Pastilles<T extends string>({ options, actif, onChoix, aria }: {
  options: OptionChoix<T>[]; actif: (v: T) => boolean; onChoix: (v: T) => void; aria: string;
}) {
  return (
    <div className="tpills" role="group" aria-label={aria}>
      {options.map((o) => (
        <button key={o.v} type="button" className={"tpill" + (actif(o.v) ? " on" : "")} aria-pressed={actif(o.v)} onClick={() => onChoix(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Segment : deux (ou trois) choix exclusifs côte à côte (périmètre, régime de TVA). */
export function Segment<T extends string>({ options, valeur, onChoix, aria }: {
  options: OptionChoix<T>[]; valeur: T; onChoix: (v: T) => void; aria: string;
}) {
  return (
    <div className="segf" role="group" aria-label={aria}>
      {options.map((o) => (
        <button key={o.v} type="button" className={valeur === o.v ? "on" : ""} aria-pressed={valeur === o.v} onClick={() => onChoix(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Une carte : objectif, nom, description, et la jauge de 1 à 3 barres d'un niveau de finition
 *  (`lvl`). Sans `lvl` (chauffage du neuf, N9), pas de jauge. */
export interface CarteFinition<T extends string> { v: T; lvl?: number; eye: string; label: string; desc: string }

/** Cartes à description : le niveau de finition (avec sa jauge) ; le chauffage du neuf (sans). */
export function CartesFinition<T extends string>({ cartes, valeur, onChoix, aria }: {
  cartes: CarteFinition<T>[]; valeur: T; onChoix: (v: T) => void; aria: string;
}) {
  return (
    <div className="finc" role="group" aria-label={aria}>
      {cartes.map((f) => (
        <button key={f.v} type="button" className={"fc" + (valeur === f.v ? " on" : "")} aria-pressed={valeur === f.v} onClick={() => onChoix(f.v)}>
          <span className="fh">{f.lvl != null ? <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl! ? "f" : ""} />)}</span> : <span />}<span className="ck" /></span>
          <span className="fe">{f.eye}</span>
          <span className="ft">{f.label}</span>
          <span className="fd">{f.desc}</span>
        </button>
      ))}
    </div>
  );
}

/** Code postal : 5 chiffres au plus, rien d'autre ne passe. `id` le relie à son libellé (`Field htmlFor`).
 *  `invalide` (facultatif) : le champ en faute à l'enregistrement (`aria-invalid`, lié à `erreurId`). */
export function ChampCodePostal({ valeur, onChange, placeholder, id, invalide, erreurId }: {
  valeur: string; onChange: (cp: string) => void; placeholder: string; id?: string; invalide?: boolean; erreurId?: string;
}) {
  return (
    <div className="uinp">
      <input id={id} inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder={placeholder} value={valeur}
        aria-invalid={invalide || undefined} aria-describedby={invalide ? erreurId : undefined}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))} />
    </div>
  );
}

/**
 * Le champ en faute à l'enregistrement (« Enregistrer » sans code postal) : `signaler` le marque
 * (`champ`, que l'appelant passe en `aria-invalid`), puis le centre et lui donne le focus, une fois
 * la saisie réaffichée. Le même comportement dans les deux détaillés (A7) ; `effacer` le démarque.
 */
export function useChampEnFaute<K extends string>() {
  const [faute, setFaute] = useState<{ champ: K; id: string; n: number } | null>(null);
  useEffect(() => {
    if (!faute) return;
    const el = document.getElementById(faute.id);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); }
  }, [faute]);
  return {
    champ: faute?.champ ?? null,
    /** `id` : celui du champ à focaliser (son `htmlFor`). Signaler deux fois de suite refocalise. */
    signaler: (champ: K, id: string) => setFaute((f) => ({ champ, id, n: (f?.n ?? 0) + 1 })),
    effacer: () => setFaute(null),
  };
}

/** Une case de la grille de compteurs qui se lit sans se régler : le nombre de niveaux du neuf, que le
 *  type de maison décide (A7 : la grille garde les paires de la rénovation, dont « Niveaux » ouvre la
 *  première). Même case que `Stepper` ; la valeur à la place des boutons, alignée sur les leurs. */
export function CompteurFixe({ label, hint, valeur, id }: { label: string; hint?: string; valeur: number; id: string }) {
  return (
    <div className="stp fixe">
      <span className="l" id={id + "-l"}>{label}{hint && <small>{hint}</small>}</span>
      <output id={id} className="c" aria-labelledby={id + "-l"}><span className="v num">{valeur}</span></output>
    </div>
  );
}

/** Interrupteur oui / non sous une grille (dressing de la suite ; « cuisine équipée comprise » du neuf, N9). */
export function Interrupteur({ actif, onBascule, texteActif, texteInactif }: {
  actif: boolean; onBascule: () => void; texteActif: ReactNode; texteInactif: ReactNode;
}) {
  return (
    <button type="button" className={"drtoggle" + (actif ? " on" : "")} aria-pressed={actif} onClick={onBascule}>
      <span className="dot" aria-hidden="true" />{actif ? texteActif : texteInactif}
    </button>
  );
}

/** Récapitulatif du bien : une ligne de tête, puis une ligne par élément (`lignes`, puis la zone). */
export function Recap({ tete, lignes = [], zone }: { tete: ReactNode; lignes?: ReactNode[]; zone?: ReactNode }) {
  return (
    <div className="recap">
      {tete}
      {lignes.map((l, i) => <div key={i} style={{ marginTop: 6 }}>{l}</div>)}
      {zone && <div style={{ marginTop: 6 }}>{zone}</div>}
    </div>
  );
}

/** Ligne « zone » du récapitulatif : la zone du code postal et ses écarts de main-d'œuvre et de matériaux. */
export function ZoneRecap({ reg, zone, mo, mat }: { reg: RegionCoef; zone: string; mo: (p: string) => string; mat: (p: string) => string }) {
  return (
    <>
      📍 <b>{zone}</b>
      {reg.mo !== 1 && <> · {mo((reg.mo > 1 ? "+" : "") + Math.round((reg.mo - 1) * 100))}</>}
      {reg.mat !== 1 && <> · {mat("+" + Math.round((reg.mat - 1) * 100))}</>}
    </>
  );
}

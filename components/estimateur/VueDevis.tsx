"use client";

/**
 * « Mon devis » des estimations détaillées, partagé par la rénovation (`DevisView`) et le neuf
 * (`DevisNeuf`) : héros (total, pilules, découpe facultative), bilan de tes choix, répartition par
 * phase et par lot, détail ligne par ligne, pied. Chaque appelant prépare ses données (`DonneesDevis`) :
 * catalogue, TVA, frais, jalons et textes lui appartiennent ; aucun montant n'est calculé ici.
 * Plus la bascule « Ma saisie » / « Mon devis » (`ChoixVue`). Chantier N6 de la revue rénovation / neuf.
 */
import type { ReactNode } from "react";
import { CountUp } from "./CountUp";
import { fmt } from "./partage";

export interface LotDevisVue { cle: string; nom: string; v: number; pct: number }
export interface LigneDevisVue {
  cle: string; nom: string; q: string;
  /** Pastille de mode : « fait faire » (mA), « je fais » (mS), location (mL) ; `dem` : une démarche (neuf). */
  mode: "mA" | "mS" | "mL" | "dem"; modeTxt: string;
  /** Montant affiché (vide pour une démarche). */
  m: string;
}
export interface DonneesDevis {
  eb: string; ttc: number; ttcUnite: string;
  pilules: { k: string; v: number }[];
  /** Sous les pilules (le neuf : construction / annexes). */
  apresPilules?: ReactNode;
  hint: string;
  bilan: {
    titre: string; titreNote?: string; sous: string;
    paye: string; payeV: number; payeSous: string; achat: string; achatV: number; eco: string; ecoV: number;
  };
  repartition: {
    titre: string; sous: string;
    /** Texte affiché à la place des phases quand rien n'est coché (sinon `null`). */
    vide: string | null;
    phases: { cle: string; nom: string; lots: LotDevisVue[] }[];
    perso: LotDevisVue | null;
  };
  detail: { titre: string; sous: string; lignes: LigneDevisVue[] };
  pied: string;
}

export function VueDevis({ d }: { d: DonneesDevis }) {
  const { bilan: b, repartition: r } = d;
  return (
    <div>
      <div className="hero">
        <span className="glow g1" /><span className="glow g2" />
        <div className="eb"><span className="dot" />{d.eb}</div>
        <div className="tt"><CountUp value={d.ttc} /><small>{d.ttcUnite}</small></div>
        <div className="brk">
          {d.pilules.map((p) => (
            <div key={p.k} className="pill"><span className="k">{p.k}</span><br /><span className="v num">{fmt(p.v)}</span></div>
          ))}
        </div>
        {d.apresPilules}
        <div className="tvahint">{d.hint}</div>
      </div>

      <div className="card">
        <h2>{b.titre}{b.titreNote && <> <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>{b.titreNote}</span></>}</h2>
        <div className="sub">{b.sous}</div>
        <div className="bilan">
          <div className="btile pre"><div className="k">{b.paye}</div><div className="v num">{fmt(b.payeV)}</div><div className="sub2">{b.payeSous}</div></div>
          <div className="btile mat"><div className="k">{b.achat}</div><div className="v num">{fmt(b.achatV)}</div></div>
          <div className="btile eco"><div className="k">{b.eco}</div><div className="v num">{b.ecoV > 0 ? "+ " + fmt(b.ecoV) : fmt(0)}</div></div>
        </div>
      </div>

      <div className="card">
        <h2>{r.titre}</h2>
        <div className="sub">{r.sous}</div>
        {r.vide != null ? <div className="empty">{r.vide}</div> : r.phases.map((ph) => (
          <div key={ph.cle}>
            <div className="phase-t">{ph.nom}</div>
            {ph.lots.map((x) => <LigneRepartition key={x.cle} x={x} />)}
          </div>
        ))}
        {r.perso && <LigneRepartition x={r.perso} />}
      </div>

      {!!d.detail.lignes.length && (
        <div className="card">
          <h2>{d.detail.titre}</h2>
          <div className="sub">{d.detail.sous}</div>
          {d.detail.lignes.map((li) => (
            <div key={li.cle} className="dtl">
              <span>{li.nom}</span>
              <span className="q">{li.q}</span>
              <span className={li.mode === "dem" ? "dem" : "mode " + li.mode}>{li.modeTxt}</span>
              <span className="m">{li.m}</span>
            </div>
          ))}
        </div>
      )}

      <div className="foot">{d.pied}</div>
    </div>
  );
}

function LigneRepartition({ x }: { x: LotDevisVue }) {
  return (
    <div className="devlot">
      <span>{x.nom}</span>
      <span className="track"><span className="fill" style={{ width: x.pct + "%" }} /></span>
      <span className="v">{fmt(x.v)}</span>
    </div>
  );
}

/** Bascule « Ma saisie » / « Mon devis », en haut à droite. */
export function ChoixVue({ vue, onVue, saisie, devis, aria }: { vue: "saisie" | "devis"; onVue: (v: "saisie" | "devis") => void; saisie: string; devis: string; aria: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div className="views" role="group" aria-label={aria}>
        <button type="button" className={vue === "saisie" ? "on" : ""} aria-pressed={vue === "saisie"} onClick={() => onVue("saisie")}>{saisie}</button>
        <button type="button" className={vue === "devis" ? "on" : ""} aria-pressed={vue === "devis"} onClick={() => onVue("devis")}>{devis}</button>
      </div>
    </div>
  );
}

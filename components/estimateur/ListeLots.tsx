"use client";

/**
 * La liste des postes des estimations détaillées, partagée par la rénovation et le neuf (chantier N6
 * de la revue rénovation / neuf) : titres de phase, lots repliables (en-tête accessible au clavier,
 * repris du neuf), lignes `Row` branchées sur la sélection, outils « Seulement les postes cochés » et
 * « Tout déplier ». Aucun texte en dur : chaque appelant passe les siens ; aucun montant calculé ici.
 *
 * Les outils ne servent qu'au neuf pour l'instant : la rénovation les reçoit quand son écran pourra
 * changer (N6 la garde identique). Depuis N10, le neuf est rangé comme la rénovation : 4 titres de phase
 * (simples intertitres), chaque lot une fois ; il y ajoute ses sous-titres d'étape (`SousEtape`) et ses
 * lignes de choix (`LigneChoix`, `SelecteurChoix`) pour les postes qui s'excluent. Le titre de phase
 * repliable (`TitrePhase` avec `onBascule`) reste disponible. Depuis N11, les notes de lot du neuf ne sont plus
 * écrites dans la liste : elles sont en infobulle, sur l'icône d'information de leur sous-titre d'étape ou de
 * l'en-tête du lot (`notes`), et se déplient d'un clic (`TexteInfo`).
 */
import { useState, type ReactNode } from "react";
import { Row } from "./Row";
import { BoutonInfo, IconeInfo, TexteInfo } from "./partage";
import { ligneQuantite, lignePrix, ligneMateriaux } from "@/lib/estimateur/detaille-reno";
import type { Ctx, Selection, LigneSel, Lot, Tache, RaisonPro } from "@/lib/estimateur";

/** Titre d'une phase : simple intertitre (rénovation, « Mon devis ») ou bouton qui la replie (neuf). */
export function TitrePhase({ num, nom, meta, ouvert, onBascule }: {
  num?: number; nom: ReactNode; meta?: ReactNode; ouvert?: boolean; onBascule?: () => void;
}) {
  if (!onBascule) return <div className="phase-t">{num != null ? <>{num} · {nom}</> : nom}</div>;
  return (
    <button type="button" className={"phase-t" + (ouvert ? " open" : "")} aria-expanded={!!ouvert} onClick={onBascule}>
      <span className="chev" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="pt-lbl"><span className="pt-num">{num}</span> · {nom}</span>
      <span className="pt-meta">{meta}</span>
    </button>
  );
}

/**
 * En-tête d'un lot : bouton (clavier : Entrée, Espace) qui l'ouvre ; icône, nom, postes cochés, montant HT.
 * `notes` (neuf, N11, déjà traduites) : une icône d'information après le nom, l'infobulle au survol ; un clic sur l'icône
 * déplie les notes sous l'en-tête (`infoOuverte`, `onInfo`) sans ouvrir le lot. L'icône n'est pas un second
 * bouton dans le bouton : les lecteurs d'écran lisent les notes dans la description de l'en-tête.
 */
export function EnteteLot({ icone, nom, cnt, montant, ouvert, onBascule, notes, infoOuverte, onInfo }: {
  icone: ReactNode; nom: ReactNode; cnt: number; montant: ReactNode; ouvert: boolean; onBascule: () => void;
  notes?: string[]; infoOuverte?: boolean; onInfo?: () => void;
}) {
  const textes = notes ?? [];
  return (
    <div className="acc-h" role="button" tabIndex={0} aria-expanded={ouvert} onClick={onBascule}
      aria-description={textes.length ? textes.join(" ") : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBascule(); } }}>
      <span className="ic" aria-hidden="true">{icone}</span>
      <span className="nm">{nom}{textes.length > 0 && (
        <span className={"ibtn" + (infoOuverte ? " on" : "")} aria-hidden="true" title={textes.join("\n\n")}
          onClick={(e) => { e.stopPropagation(); onInfo?.(); }}><IconeInfo /></span>
      )}</span>
      {cnt > 0 && <span className="cnt">{cnt}</span>}
      <span className="amt num">{montant}</span>
      <span className="car">›</span>
    </div>
  );
}

/** Un lot repliable : son en-tête, ses notes dépliées (neuf, N11), et ouvert, son contenu (lignes, lignes perso). */
export function BlocLot({ ouvert, entete, children }: {
  ouvert: boolean; entete: Omit<Parameters<typeof EnteteLot>[0], "infoOuverte" | "onInfo">; children: ReactNode;
}) {
  const [info, setInfo] = useState(false);
  const notes = entete.notes ?? [];
  return (
    <div className={"acc" + (ouvert ? " open" : "")}>
      <EnteteLot {...entete} infoOuverte={info} onInfo={() => setInfo((o) => !o)} />
      {info && notes.length > 0 && <div className="acc-info"><TexteInfo morceaux={notes} /></div>}
      {ouvert && <div className="acc-b">{children}</div>}
    </div>
  );
}

/**
 * Les lignes d'un lot, chacune branchée sur la sélection : `maj(lot, poste, réglage)` applique un
 * réglage de ligne (`lib/estimateur/detaille-reno.ts`) ; cocher et l'interrupteur auto / manuel
 * restent à l'appelant (le neuf coche avec ses postes exclusifs). `options` : ce que le neuf ajoute à
 * une ligne (badge « % » ou « démarche », raison d'un poste réservé aux pros, boutons d'une ligne de choix).
 */
export function LignesLot({ l, taches, ctx, sel, loc, maj, onCocher, onAuto, options }: {
  l: Lot; taches: Tache[]; ctx: Ctx; sel: Selection; loc: boolean;
  maj: (c: string, n: string, patch: (s: LigneSel) => LigneSel) => void;
  onCocher: (l: Lot, t: Tache) => void; onAuto: (l: Lot, t: Tache) => void;
  options?: (t: Tache) => { badge?: "pct" | "jalon"; proRaison?: RaisonPro | null; choix?: ReactNode };
}) {
  return (
    <>
      {taches.map((t) => (
        <Row key={t.n} l={l} t={t} ctx={ctx} sel={sel} loc={loc} {...options?.(t)}
          onCheck={() => onCocher(l, t)}
          onChoice={(self) => maj(l.c, t.n, (s) => ({ ...s, self }))}
          onAuto={() => onAuto(l, t)}
          /* D12 : corriger une quantité à la main épingle la ligne — le plan cesse de l'alimenter. */
          onQty={(v) => maj(l.c, t.n, ligneQuantite(ctx, l, t, v))}
          onMat={(m) => maj(l.c, t.n, (s) => ({ ...s, mat: m }))}
          onVit={(v) => maj(l.c, t.n, (s) => ({ ...s, vit: v }))}
          onMot={(m) => maj(l.c, t.n, (s) => ({ ...s, mot: m }))}
          onTai={(z) => maj(l.c, t.n, (s) => ({ ...s, tai: z }))}
          /* Une option qui désigne un poste (`induit`) en ajoute le prix à CETTE ligne — rien à cocher
             ailleurs : choisir « à galandage » change le prix de la baie, là où l'on clique. */
          onVar={(g, o) => maj(l.c, t.n, (s) => ({ ...s, vsel: { ...(s.vsel || {}), [g]: o } }))}
          onNote={(v) => maj(l.c, t.n, (s) => ({ ...s, note: v }))}
          onPu={(v) => maj(l.c, t.n, lignePrix(v))}
          onPm={(v) => maj(l.c, t.n, ligneMateriaux(v))}
        />
      ))}
    </>
  );
}

/** Sous-titre d'étape du chantier dans un lot qui revient à plusieurs étapes (neuf, N10). `notes` (N11, déjà
 *  traduites) : les notes de ses blocs du catalogue, en infobulle sur l'icône d'information (`labelInfo`) ; un
 *  clic les déplie dessous. */
export function SousEtape({ children, notes, labelInfo }: { children: ReactNode; notes?: string[]; labelInfo?: string }) {
  const [info, setInfo] = useState(false);
  if (!notes || !notes.length) return <div className="setape">{children}</div>;
  return (
    <>
      <div className="setape">{children}<BoutonInfo ouvert={info} onBascule={() => setInfo((o) => !o)} label={labelInfo ?? ""} titre={notes.join("\n\n")} /></div>
      {info && <TexteInfo morceaux={notes} />}
    </>
  );
}

/**
 * Les alternatives d'une ligne de choix (neuf, N10) : un groupe de boutons sous le libellé du poste. Un
 * clic choisit l'alternative (l'appelant la coche, décoche les autres, met la réponse à jour). Une
 * alternative indisponible pour cette maison est désactivée, avec sa raison en infobulle.
 */
export function SelecteurChoix({ titre, alternatives, onChoisir }: {
  titre: string;
  alternatives: { v: string; label: string; actif: boolean; indisponible?: string | null }[];
  onChoisir: (v: string) => void;
}) {
  return (
    <span className="vg choix-g" role="group" aria-label={titre}>
      <span className="vlab" aria-hidden="true">{titre}</span>
      <span className="vseg">
        {alternatives.map((a) => (
          <button type="button" key={a.v} className={a.actif ? "on" : ""} aria-pressed={a.actif} disabled={!!a.indisponible}
            title={a.indisponible ?? undefined} onClick={() => onChoisir(a.v)}>{a.label}</button>
        ))}
      </span>
    </span>
  );
}

/** Une ligne de choix : la ligne du poste retenu (ses boutons d'alternatives dessous). Deux alternatives
 *  cochées (un ancien projet) : les deux lignes, sous un avertissement. */
export function LigneChoix({ avertissement, children }: { avertissement?: ReactNode; children: ReactNode }) {
  return (
    <div className={"choixl" + (avertissement ? " doublon" : "")}>
      {avertissement && <p className="choixl-av" role="note">{avertissement}</p>}
      {children}
    </div>
  );
}

export interface OutilsListe {
  seulement: boolean; onSeulement: (v: boolean) => void; texteSeulement: string;
  toutOuvert: boolean; onTout: () => void; texteDeplier: string; texteReplier: string;
}

/** La liste : les outils (facultatifs), puis chaque phase, son titre et son contenu. */
export function ListeLots({ outils, phases }: { outils?: OutilsListe; phases: { cle: string; titre: ReactNode; contenu: ReactNode }[] }) {
  return (
    <>
      {outils && (
        <div className="tools">
          <label className="only">
            <input type="checkbox" checked={outils.seulement} onChange={(e) => outils.onSeulement(e.target.checked)} />
            {outils.texteSeulement}
          </label>
          <button type="button" className="linkbtn" onClick={outils.onTout}>{outils.toutOuvert ? outils.texteReplier : outils.texteDeplier}</button>
        </div>
      )}
      {phases.map((ph) => <div key={ph.cle}>{ph.titre}{ph.contenu}</div>)}
    </>
  );
}

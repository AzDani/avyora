"use client";

/**
 * La liste des postes des estimations détaillées, partagée par la rénovation et le neuf (chantier N6
 * de la revue rénovation / neuf) : titres de phase, lots repliables (en-tête accessible au clavier,
 * repris du neuf), lignes `Row` branchées sur la sélection, outils « Seulement les postes cochés » et
 * « Tout déplier ». Aucun texte en dur : chaque appelant passe les siens ; aucun montant calculé ici.
 *
 * Les outils et les phases repliables ne servent qu'au neuf pour l'instant : la rénovation les reçoit
 * quand son écran pourra changer (N6 la garde identique).
 */
import type { ReactNode } from "react";
import { Row } from "./Row";
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

/** En-tête d'un lot : bouton (clavier : Entrée, Espace) qui l'ouvre ; icône, nom, postes cochés, montant HT. */
export function EnteteLot({ icone, nom, cnt, montant, ouvert, onBascule }: {
  icone: ReactNode; nom: ReactNode; cnt: number; montant: ReactNode; ouvert: boolean; onBascule: () => void;
}) {
  return (
    <div className="acc-h" role="button" tabIndex={0} aria-expanded={ouvert} onClick={onBascule}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBascule(); } }}>
      <span className="ic" aria-hidden="true">{icone}</span>
      <span className="nm">{nom}</span>
      {cnt > 0 && <span className="cnt">{cnt}</span>}
      <span className="amt num">{montant}</span>
      <span className="car">›</span>
    </div>
  );
}

/** Un lot repliable : son en-tête, et ouvert, son contenu (lignes, lignes perso). */
export function BlocLot({ ouvert, entete, children }: {
  ouvert: boolean; entete: Parameters<typeof EnteteLot>[0]; children: ReactNode;
}) {
  return (
    <div className={"acc" + (ouvert ? " open" : "")}>
      <EnteteLot {...entete} />
      {ouvert && <div className="acc-b">{children}</div>}
    </div>
  );
}

/**
 * Les lignes d'un lot, chacune branchée sur la sélection : `maj(lot, poste, réglage)` applique un
 * réglage de ligne (`lib/estimateur/detaille-reno.ts`) ; cocher et l'interrupteur auto / manuel
 * restent à l'appelant (le neuf coche avec ses postes exclusifs). `options` : ce que le neuf ajoute à
 * une ligne (badge « % » ou « démarche », raison d'un poste réservé aux pros).
 */
export function LignesLot({ l, taches, ctx, sel, loc, maj, onCocher, onAuto, options }: {
  l: Lot; taches: Tache[]; ctx: Ctx; sel: Selection; loc: boolean;
  maj: (c: string, n: string, patch: (s: LigneSel) => LigneSel) => void;
  onCocher: (l: Lot, t: Tache) => void; onAuto: (l: Lot, t: Tache) => void;
  options?: (t: Tache) => { badge?: "pct" | "jalon"; proRaison?: RaisonPro | null };
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

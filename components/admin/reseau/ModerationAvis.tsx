"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { modererAvis, modererReponse, retirerRealisation, traiterMajArtisan } from "@/lib/actions/avis";
import { MOTIFS_REFUS, MOTIFS_REFUS_REPONSE } from "@/lib/reseau/avis";

/**
 * Les boutons de modération de Daniel (/admin/avis, 25/11/2026). Refuser demande un motif de la liste (envoyé à
 * l'auteur) ; retirer un avis publié ou une réalisation demande une confirmation.
 */
function useAction() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const lancer = (f: () => Promise<{ ok: boolean; erreur?: string }>) =>
    demarrer(async () => {
      setErreur("");
      const r = await f().catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      if (r.ok) router.refresh();
      else setErreur(r.erreur ?? "Réessaie dans un instant.");
    });
  return { enCours, erreur, lancer };
}

function ChoixMotif({ onValider, enCours, libelle, motifs = MOTIFS_REFUS }: { onValider: (motif: string) => void; enCours: boolean; libelle: string; motifs?: readonly (readonly [string, string])[] }) {
  const [motif, setMotif] = useState<string>(motifs[0][0]);
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <select aria-label="Motif du refus" value={motif} onChange={(e) => setMotif(e.target.value)} className="min-h-10 min-w-[220px] flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[13.5px] text-ink">
        {motifs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <button type="button" disabled={enCours} onClick={() => onValider(motif)} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">{libelle}</button>
    </div>
  );
}

export function BoutonsAvis({ miseId }: { miseId: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [refus, setRefus] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <button type="button" disabled={enCours} onClick={() => lancer(() => modererAvis(miseId, "publier"))} className="btn min-h-10 bg-[#0b7a53] px-4 text-[13.5px] text-white hover:bg-[#096845]">Publier</button>
      {!refus && <button type="button" disabled={enCours} onClick={() => setRefus(true)} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">Refuser…</button>}
      {refus && <ChoixMotif enCours={enCours} libelle="Refuser et prévenir l'auteur" onValider={(m) => lancer(() => modererAvis(miseId, "refuser", m))} />}
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

export function BoutonsReponse({ miseId }: { miseId: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [refus, setRefus] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" disabled={enCours} onClick={() => lancer(() => modererReponse(miseId, "publier"))} className="btn min-h-10 bg-[#0b7a53] px-4 text-[13.5px] text-white hover:bg-[#096845]">Publier la réponse</button>
      {!refus && <button type="button" disabled={enCours} onClick={() => setRefus(true)} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">Refuser…</button>}
      {refus && <ChoixMotif enCours={enCours} libelle="Refuser et prévenir l'artisan" motifs={MOTIFS_REFUS_REPONSE} onValider={(m) => lancer(() => modererReponse(miseId, "refuser", m))} />}
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

export function BoutonsSignalement({ miseId }: { miseId: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [confirmer, setConfirmer] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <button type="button" disabled={enCours} onClick={() => lancer(() => modererAvis(miseId, "garder"))} className="btn btn-outline min-h-10 px-4 text-[13.5px]">Garder l&apos;avis en ligne</button>
      <button type="button" disabled={enCours} onClick={() => (confirmer ? lancer(() => modererAvis(miseId, "retirer")) : setConfirmer(true))} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">
        {confirmer ? "Confirmer : retirer et effacer l'avis" : "Retirer l'avis"}
      </button>
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

export function BoutonRetirerAvis({ miseId }: { miseId: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [confirmer, setConfirmer] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {confirmer ? (
        <>
          <button type="button" disabled={enCours} onClick={() => lancer(() => modererAvis(miseId, "retirer"))} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">Confirmer : retirer et effacer</button>
          <button type="button" onClick={() => setConfirmer(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
          <span className="w-full text-[12.5px] text-faint">Le texte, la note, les photos et la réponse de l&apos;artisan sont effacés. Impossible de revenir en arrière.</span>
        </>
      ) : (
        <button type="button" onClick={() => setConfirmer(true)} className="text-[13px] font-semibold text-[#b42318] underline">Retirer et effacer…</button>
      )}
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

export function BoutonRetirerRealisation({ id }: { id: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="text-[13px] font-semibold text-[#b42318] underline">Retirer…</button>;
  return (
    <div className="mt-2 flex w-full flex-wrap items-center gap-2">
      <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} placeholder="Motif (vu par l'artisan)" className="min-h-10 min-w-[200px] flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[13.5px] text-ink" />
      <button type="button" disabled={enCours} onClick={() => lancer(() => retirerRealisation(id, motif))} className="btn min-h-10 border border-[#f3c9c4] bg-surface px-4 text-[13.5px] text-[#b42318]">Retirer de la fiche</button>
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

export function BoutonsMaj({ artisanId, decennale }: { artisanId: string; decennale: boolean }) {
  const { enCours, erreur, lancer } = useAction();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {decennale && <button type="button" disabled={enCours} onClick={() => lancer(() => traiterMajArtisan(artisanId, true))} className="btn min-h-10 bg-[#0b7a53] px-4 text-[13.5px] text-white hover:bg-[#096845]">Appliquer la nouvelle décennale</button>}
      <button type="button" disabled={enCours} onClick={() => lancer(() => traiterMajArtisan(artisanId, false))} className="btn btn-outline min-h-10 px-4 text-[13.5px]">{decennale ? "Ignorer" : "C'est traité"}</button>
      {erreur && <p role="alert" className="w-full text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { laisserAvis, suivreArtisan } from "@/lib/actions/devis";
import { ISSUES, type Issue } from "@/lib/reseau/demande";

/**
 * Pour un artisan qui a accepté (page « Mes demandes de devis ») : où en est le client avec lui (devis reçu, signé,
 * pas retenu) et son avis (1 à 5, commentaire facultatif). L'avis n'est pas publié : seul Daniel le lit.
 */
export default function SuiviArtisan({
  miseId, nom, issue, avis,
}: { miseId: string; nom: string; issue: Issue | null; avis: { note: number; commentaire: string | null } | null }) {
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<Issue | null>(issue);
  const [note, setNote] = useState(avis?.note ?? 0);
  const [commentaire, setCommentaire] = useState(avis?.commentaire ?? "");
  const [ouvert, setOuvert] = useState(!avis && (issue === "signe" || issue === "non_retenu"));
  const [retour, setRetour] = useState<"" | "ok" | "erreur">("");
  const [avisDonne, setAvisDonne] = useState(!!avis);

  const choisir = (i: Issue) =>
    demarrer(async () => {
      const suivant = etat === i ? null : i;
      const r = await suivreArtisan(miseId, suivant).catch(() => ({ ok: false }));
      if (r.ok) { setEtat(suivant); if (suivant === "signe" || suivant === "non_retenu") setOuvert(!avisDonne); }
    });
  const envoyerAvis = () =>
    demarrer(async () => {
      const r = await laisserAvis(miseId, note, commentaire).catch(() => ({ ok: false }));
      setRetour(r.ok ? "ok" : "erreur");
      if (r.ok) { setAvisDonne(true); setOuvert(false); }
    });

  return (
    <div className="mt-3 border-t border-line pt-3" data-suivi-artisan={miseId}>
      <p className="text-[12.5px] font-semibold text-muted" id={`suivi-${miseId}`}>Où en es-tu avec {nom} ?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`suivi-${miseId}`}>
        {ISSUES.map(([k, l]) => (
          <button key={k} type="button" disabled={enCours} aria-pressed={etat === k} onClick={() => choisir(k)}
            className={"inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60 " + (etat === k ? "border-brand-600 bg-brand-600 text-white" : "border-line text-ink hover:border-brand-600")}>
            {l}
          </button>
        ))}
      </div>

      {avisDonne && !ouvert ? (
        <p className="mt-2.5 text-[13px] text-muted">
          Ton avis : <span className="num font-semibold text-ink">{note}/5</span>{" "}
          <button type="button" onClick={() => setOuvert(true)} className="py-2 font-semibold text-brand-700 underline">Modifier</button>
        </p>
      ) : !ouvert ? (
        <button type="button" onClick={() => setOuvert(true)} className="mt-2 py-2 text-[13px] font-semibold text-brand-700 underline">Donner mon avis sur {nom}</button>
      ) : (
        <div className="mt-3 rounded-2xl bg-surface-2 p-3.5">
          <fieldset>
            <legend className="text-[13.5px] font-semibold text-ink">Ton avis sur {nom} (réactivité, sérieux du devis)</legend>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={"inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 " + (note >= n ? "border-[#b7791f] bg-[#fff4dc] text-[#8a5300]" : "border-line bg-surface text-faint")}>
                  <input type="radio" name={`note-${miseId}`} value={n} checked={note === n} onChange={() => setNote(n)} className="sr-only" />
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">{n} sur 5</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={`avis-${miseId}`} className="mt-3 block text-[13px] font-semibold text-ink">Un commentaire (facultatif)</label>
          <textarea id={`avis-${miseId}`} rows={3} maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600" />
          <p className="mt-1 text-[12px] text-muted">Ton avis n&apos;est pas publié : seul Daniel le lit, pour garder des artisans sérieux dans le réseau.</p>
          <div className="mt-2.5 flex items-center gap-3">
            <button type="button" disabled={enCours || note < 1} onClick={envoyerAvis} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Envoyer mon avis</button>
            {retour === "erreur" && <span role="alert" className="text-[12.5px] text-[#b42318]">Pas enregistré : réessaie.</span>}
          </div>
        </div>
      )}
      {retour === "ok" && <p role="status" className="mt-1.5 text-[12.5px] font-medium text-[#0b5e40]">Merci, ton avis est enregistré.</p>}
    </div>
  );
}

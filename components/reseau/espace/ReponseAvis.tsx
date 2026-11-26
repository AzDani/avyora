"use client";

import { useState, useTransition } from "react";
import { repondreAvis, signalerAvis } from "@/lib/actions/avis";
import type { AvisRecu } from "@/lib/data/reseau";

/**
 * Sous un avis publié, dans l'espace artisan : sa réponse publique (validée par Daniel, modifiable tant qu'elle n'est
 * pas publiée) et « Signaler cet avis » (Daniel tranche : l'artisan ne peut pas supprimer un avis).
 */
export default function ReponseAvis({ a }: { a: AvisRecu }) {
  const [enCours, demarrer] = useTransition();
  const r = a.maReponse;
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState(r && r.statut !== "publie" ? r.texte : "");
  const [statut, setStatut] = useState(r?.statut ?? null);
  const [signaler, setSignaler] = useState(false);
  const [raison, setRaison] = useState("");
  const [signale, setSignale] = useState(!!a.signaleLe);
  const [erreur, setErreur] = useState("");

  const envoyer = () =>
    demarrer(async () => {
      setErreur("");
      const res = await repondreAvis(a.id, texte).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      if (res.ok) { setStatut("en_attente"); setOuvert(false); } else setErreur(res.erreur ?? "Réessaie dans un instant.");
    });
  const envoyerSignalement = () =>
    demarrer(async () => {
      setErreur("");
      const res = await signalerAvis(a.id, raison).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      if (res.ok) { setSignale(true); setSignaler(false); } else setErreur(res.erreur ?? "Réessaie dans un instant.");
    });

  return (
    <div className="mt-3 space-y-2">
      {statut === "en_attente" && !ouvert && (
        <p className="text-[13px] text-muted">Ta réponse est en cours de vérification par Daniel. <button type="button" onClick={() => setOuvert(true)} className="font-semibold text-brand-700 underline">Modifier</button></p>
      )}
      {statut === "refuse" && !ouvert && (
        <p className="rounded-xl bg-[#fdf1e1] px-3 py-2 text-[13px] text-[#8a5208]">
          Ta réponse n&apos;a pas été publiée{r?.motif ? ` (motif : ${r.motif})` : ""}. <button type="button" onClick={() => setOuvert(true)} className="font-semibold underline">La corriger</button>
        </p>
      )}
      {!statut && !ouvert && (
        <button type="button" onClick={() => setOuvert(true)} className="btn btn-outline min-h-10 px-4 text-[13.5px]">Répondre publiquement</button>
      )}
      {ouvert && statut !== "publie" && (
        <div className="rounded-r-xl border-l-[3px] border-brand-600 bg-surface-2 px-3 py-3">
          <label htmlFor={`rep-${a.id}`} className="text-[13px] font-semibold text-brand-700">Ta réponse publique</label>
          <textarea id={`rep-${a.id}`} rows={3} maxLength={1000} value={texte} onChange={(e) => setTexte(e.target.value)}
            placeholder="Remercie le client, ou explique ce qui s'est passé. Reste courtois : ta réponse est lue par Daniel avant d'être publiée."
            className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" disabled={enCours || texte.trim().length < 2} onClick={envoyer} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Envoyer ma réponse</button>
            <button type="button" onClick={() => setOuvert(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
          </div>
        </div>
      )}
      {signale ? (
        <p className="text-[12.5px] text-faint">Tu as signalé cet avis : Daniel l&apos;examine.</p>
      ) : signaler ? (
        <div className="rounded-xl border border-line bg-surface px-3 py-3">
          <label htmlFor={`sig-${a.id}`} className="text-[13px] font-semibold text-ink">Pourquoi cet avis enfreint-il les règles ?</label>
          <textarea id={`sig-${a.id}`} rows={2} maxLength={1000} value={raison} onChange={(e) => setRaison(e.target.value)}
            placeholder="Ex. : ce n'est pas un de mes clients, il contient des insultes…"
            className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" disabled={enCours || raison.trim().length < 5} onClick={envoyerSignalement} className="btn btn-outline min-h-10 px-4 text-[13.5px]">Envoyer le signalement</button>
            <button type="button" onClick={() => setSignaler(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setSignaler(true)} className="text-[12.5px] font-semibold text-faint underline hover:text-muted">Signaler cet avis</button>
      )}
      {erreur && <p role="alert" className="text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

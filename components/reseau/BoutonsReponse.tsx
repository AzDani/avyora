"use client";

import { useState, useTransition } from "react";
import { repondreDemande } from "@/lib/actions/devis";

/** Accepter (les coordonnées s'échangent) ou refuser une demande de devis. Refuser demande une confirmation. */
export default function BoutonsReponse({ miseId }: { miseId: string }) {
  const [enCours, demarrer] = useTransition();
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const agir = (r: "accepter" | "refuser") =>
    demarrer(async () => {
      setErreur("");
      const res = await repondreDemande(miseId, r).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      if (!res.ok) setErreur(res.erreur ?? "Réessaie dans un instant.");
    });
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={enCours} onClick={() => agir("accepter")} className="btn btn-primary min-h-11 px-5">Accepter la demande</button>
        <button type="button" disabled={enCours} onClick={() => (confirmer ? agir("refuser") : setConfirmer(true))} className="btn btn-outline min-h-11 px-4">
          {confirmer ? "Confirmer : je ne suis pas disponible" : "Refuser"}
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">En acceptant, tu reçois les coordonnées du client et il reçoit les tiennes.</p>
      {erreur && <p role="alert" className="mt-1.5 text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

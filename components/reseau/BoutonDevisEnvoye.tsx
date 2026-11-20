"use client";

import { useState, useTransition } from "react";
import { marquerDevisEnvoye } from "@/lib/actions/devis";

/** L'artisan indique qu'il a envoyé son devis au client (une fois) : le client et Daniel le voient. */
export default function BoutonDevisEnvoye({ miseId }: { miseId: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  return (
    <div className="mt-3">
      <button type="button" disabled={enCours} className="btn btn-outline min-h-10 px-4 text-[13.5px]"
        onClick={() => demarrer(async () => { setErreur(""); const r = await marquerDevisEnvoye(miseId).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." })); if (!r.ok) setErreur(r.erreur ?? "Réessaie dans un instant."); })}>
        J&apos;ai envoyé mon devis
      </button>
      {erreur && <p role="alert" className="mt-1.5 text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

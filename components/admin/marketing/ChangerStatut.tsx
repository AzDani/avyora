"use client";

import { useActionState } from "react";
import { changerProspect, type Retour } from "@/lib/actions/prospection";
import { INTERDITS_APRES_STOP, NOMS_STATUTS, STATUTS, type Statut } from "@/lib/prospection/statuts";

/** Le sélecteur de statut et la note d'un prospect (/admin/marketing). Après un STOP, les statuts d'envoi sont grisés. */
const champ = "rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink";

export default function ChangerStatut({ id, statut, note }: { id: string; statut: Statut; note: string | null }) {
  const [r, action, enCours] = useActionState<Retour | null, FormData>(changerProspect, null);
  return (
    <form action={action} className="flex min-w-[240px] flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`statut-${id}`}>Statut</label>
        <select id={`statut-${id}`} name="statut" defaultValue={statut} className={champ}>
          {STATUTS.map((k) => (
            <option key={k} value={k} disabled={statut === "stop" && INTERDITS_APRES_STOP.includes(k)}>{NOMS_STATUTS[k]}</option>
          ))}
        </select>
        <button type="submit" disabled={enCours} className="inline-flex min-h-8 items-center rounded-lg bg-brand-600 px-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {enCours ? "…" : "OK"}
        </button>
      </div>
      <label className="sr-only" htmlFor={`note-${id}`}>Note</label>
      <input id={`note-${id}`} name="note" defaultValue={note ?? ""} maxLength={1000} placeholder="Note (facultatif)" className={champ} />
      {r && <p role={r.ok ? "status" : "alert"} className={"text-[12px] " + (r.ok ? "text-[#0b7a53]" : "text-[#b42318]")}>{r.message}</p>}
    </form>
  );
}

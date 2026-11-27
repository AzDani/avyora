"use client";

import { useActionState, useTransition, useState } from "react";
import { ajouterCharge, ajouterRendezVous, changerCharge, changerRendezVous, supprimerRendezVous, type Retour } from "@/lib/actions/gestion";
import { COMPTES_RENDUS, MODES_RDV, STATUTS_RDV, TYPES_RDV } from "@/lib/admin/gestion";

/** Les formulaires et les boutons de /admin/compta et /admin/planning (27/11/2026). La page se met à jour seule. */
const champ = "mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink";
const etiquette = "block text-[12.5px] font-semibold text-muted";
const bouton = "inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-[13.5px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60";
const petit = "inline-flex min-h-8 items-center rounded-lg px-2.5 text-[12.5px] font-semibold text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60";

function Message({ r }: { r: Retour | null }) {
  if (!r) return null;
  return <p role={r.ok ? "status" : "alert"} className={"text-[13px] " + (r.ok ? "text-[#0b7a53]" : "text-[#b42318]")}>{r.message}</p>;
}

export function FormulaireCharge() {
  const [r, action, enCours] = useActionState(ajouterCharge, null);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_minmax(0,1fr)] sm:items-end">
      <label className={etiquette}>Nom<input name="nom" required maxLength={80} placeholder="Abonnement Claude" className={champ} /></label>
      <label className={etiquette}>Montant<input name="montant" required inputMode="decimal" placeholder="19,99" className={champ} /></label>
      <label className={etiquette}>Devise<select name="devise" defaultValue="EUR" className={champ}><option value="EUR">€</option><option value="USD">$</option></select></label>
      <label className={etiquette}>Fréquence<select name="frequence" defaultValue="mois" className={champ}><option value="mois">par mois</option><option value="an">par an</option></select></label>
      <label className={etiquette}>Prochaine échéance (facultatif)<input name="echeance" type="date" className={champ} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
        <button type="submit" disabled={enCours} className={bouton}>{enCours ? "Enregistrement…" : "Ajouter la charge"}</button>
        <Message r={r} />
      </div>
    </form>
  );
}

export function BoutonsCharge({ id, actif }: { id: string; actif: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [r, setR] = useState<Retour | null>(null);
  const faire = (a: "pause" | "reprendre" | "supprimer") => {
    if (a === "supprimer" && !window.confirm("Supprimer cette charge pour de bon ?")) return;
    demarrer(async () => setR(await changerCharge(id, a).catch(() => ({ ok: false, message: "Pas enregistré : réessaie." }))));
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <button type="button" disabled={enCours} onClick={() => faire(actif ? "pause" : "reprendre")} className={petit}>{actif ? "Mettre en pause" : "Reprendre"}</button>
      <button type="button" disabled={enCours} onClick={() => faire("supprimer")} className={petit}>Supprimer</button>
      {r && !r.ok && <Message r={r} />}
    </div>
  );
}

export function FormulaireRdv({ client = "", demande = "", sujet = "" }: { client?: string; demande?: string; sujet?: string }) {
  const [r, action, enCours] = useActionState(ajouterRendezVous, null);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className={etiquette}>Client<input name="client" required maxLength={80} defaultValue={client} placeholder="Prénom et initiale" className={champ} /></label>
      <label className={etiquette}>Date et heure (heure de France)<input name="debut" type="datetime-local" required className={champ} /></label>
      <label className={etiquette}>Type<select name="type" defaultValue="avis_achat" className={champ}>{TYPES_RDV.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className={etiquette}>Mode<select name="mode" defaultValue="telephone" className={champ}>{MODES_RDV.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className={etiquette + " sm:col-span-2 lg:col-span-3"}>Sujet (facultatif)<input name="sujet" maxLength={300} defaultValue={sujet} placeholder="Maison de 1975 à Pessac, doute sur la toiture" className={champ} /></label>
      <label className={etiquette}>Durée (minutes)<input name="duree" type="number" min={10} max={240} defaultValue={45} className={champ} /></label>
      <input type="hidden" name="demande" value={demande} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
        <label className="inline-flex items-center gap-2 text-[13.5px] text-ink"><input type="checkbox" name="confirme" className="h-4 w-4" /> Déjà confirmé avec le client</label>
        <button type="submit" disabled={enCours} className={bouton}>{enCours ? "Enregistrement…" : "Caler le rendez-vous"}</button>
        <Message r={r} />
      </div>
    </form>
  );
}

export function ActionsRdv({ id, statut, compteRendu, passe }: { id: string; statut: string; compteRendu: string; passe: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [r, setR] = useState<Retour | null>(null);
  const lancer = (f: () => Promise<Retour>) => demarrer(async () => setR(await f().catch(() => ({ ok: false, message: "Pas enregistré : réessaie." }))));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`statut-${id}`}>Statut</label>
      <select id={`statut-${id}`} value={statut} disabled={enCours} onChange={(e) => lancer(() => changerRendezVous(id, "statut", e.target.value))} className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-[12.5px] text-ink">
        {STATUTS_RDV.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {(passe || statut === "fait") && (
        <>
          <label className="sr-only" htmlFor={`cr-${id}`}>Compte rendu</label>
          <select id={`cr-${id}`} value={compteRendu} disabled={enCours} onChange={(e) => lancer(() => changerRendezVous(id, "compte_rendu", e.target.value))} className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-[12.5px] text-ink">
            {COMPTES_RENDUS.map(([k, l]) => <option key={k} value={k}>Compte rendu : {l.toLowerCase()}</option>)}
          </select>
        </>
      )}
      <button type="button" disabled={enCours} onClick={() => window.confirm("Supprimer ce rendez-vous ?") && lancer(() => supprimerRendezVous(id))} className={petit}>Supprimer</button>
      {r && !r.ok && <Message r={r} />}
    </div>
  );
}

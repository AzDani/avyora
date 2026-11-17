"use client";

import { useState, useTransition } from "react";
import { deciderArtisan, noterArtisan, reverifierSiretArtisan, type ActionArtisan } from "@/lib/actions/admin";
import type { StatutArtisan } from "@/lib/reseau/artisan";

/**
 * Les décisions sur une candidature (fiche admin d'un artisan) : l'appel, puis valider, demander un complément,
 * refuser ; plus tard suspendre ou réactiver. Chaque changement de statut envoie un e-mail à l'artisan (avec le message
 * écrit ici). Refuser et suspendre demandent une confirmation. Les règles sont revérifiées côté serveur.
 */
const LIBELLE: Record<ActionArtisan, string> = {
  appel_fait: "Marquer l'appel comme fait",
  appel_annule: "Annuler",
  valider: "Valider la candidature",
  completer: "Demander un complément",
  refuser: "Refuser",
  suspendre: "Suspendre",
  reactiver: "Réactiver",
  reexaminer: "Réexaminer la candidature",
};
const SUCCES: Record<ActionArtisan, string> = {
  appel_fait: "Appel noté.",
  appel_annule: "Appel retiré.",
  valider: "Candidature validée : l'artisan a reçu un e-mail de bienvenue.",
  completer: "Complément demandé : l'artisan a reçu ton message par e-mail.",
  refuser: "Candidature refusée : l'artisan a été prévenu par e-mail.",
  suspendre: "Artisan suspendu : il a été prévenu par e-mail.",
  reactiver: "Artisan réactivé : il a été prévenu par e-mail.",
  reexaminer: "La candidature est de nouveau à examiner.",
};
const A_CONFIRMER = new Set<ActionArtisan>(["refuser", "suspendre"]);

export default function PanneauDecision({
  id, statut, appelLe, bloquants, notes,
}: { id: string; statut: StatutArtisan; appelLe: string | null; bloquants: string[]; notes: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState("");
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [confirmer, setConfirmer] = useState<ActionArtisan | null>(null);
  const [note, setNote] = useState(notes);
  const [noteEtat, setNoteEtat] = useState<"" | "ok" | "erreur">("");

  function agir(action: ActionArtisan) {
    if (A_CONFIRMER.has(action) && confirmer !== action) { setConfirmer(action); return; }
    setConfirmer(null); setRetour(null);
    demarrer(async () => {
      const r = await deciderArtisan(id, action, message).catch(() => ({ ok: false as const, erreur: "Enregistrement impossible : réessaie." }));
      if (r.ok) { setRetour({ ok: true, texte: SUCCES[action] }); if (action !== "appel_fait" && action !== "appel_annule") setMessage(""); }
      else setRetour({ ok: false, texte: r.erreur });
    });
  }

  const bouton = (action: ActionArtisan, style: "primaire" | "secondaire" | "danger", desactive = false) => (
    <button
      key={action}
      type="button"
      disabled={enCours || desactive}
      onClick={() => agir(action)}
      className={
        "inline-flex min-h-10 items-center justify-center rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (style === "primaire" ? "bg-brand-600 text-white hover:bg-brand-700" : style === "danger" ? "border border-[#f1b8b2] bg-surface text-[#b42318] hover:bg-[#fdf0ef]" : "border border-line-strong bg-surface text-ink hover:border-brand-600 hover:text-brand-700")
      }
    >
      {confirmer === action ? `Confirmer : ${LIBELLE[action].toLowerCase()}` : LIBELLE[action]}
    </button>
  );

  const avecMessage = statut === "en_attente" || statut === "a_completer" || statut === "valide" || statut === "suspendu";
  const appelEtape = statut === "en_attente" || statut === "a_completer";

  return (
    <div className="space-y-4" data-panneau-decision="">
      {appelEtape && (
        <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="dec-appel">
          <h2 id="dec-appel" className="text-[14px] font-semibold text-ink">1. L&apos;appel avec l&apos;artisan</h2>
          {appelLe ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-[#0b5e40]">Fait le {new Date(appelLe).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</p>
              {bouton("appel_annule", "secondaire")}
            </div>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-muted">Appelle-le avec le bouton en haut de la fiche, puis note-le ici : la validation l&apos;exige.</p>
              <div className="mt-2.5">{bouton("appel_fait", "secondaire")}</div>
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="dec-decision">
        <h2 id="dec-decision" className="text-[14px] font-semibold text-ink">{appelEtape ? "2. Ta décision" : "Décision"}</h2>
        {statut === "a_completer" && <p className="mt-1 text-[13px] text-muted">En attente du complément de l&apos;artisan : sa candidature revient « À examiner » dès qu&apos;il la renvoie.</p>}
        {statut === "refuse" && <p className="mt-1 text-[13px] text-muted">Candidature refusée. Tu peux la remettre à examiner (sans e-mail à l&apos;artisan).</p>}
        {avecMessage && (
          <div className="mt-2.5">
            <label htmlFor="dec-message" className="text-[13px] font-semibold text-ink">Message à l&apos;artisan</label>
            <p id="dec-message-aide" className="text-[12px] text-muted">Il le reçoit par e-mail et le voit dans son espace. Obligatoire pour un complément.</p>
            <textarea
              id="dec-message"
              aria-describedby="dec-message-aide"
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600"
              placeholder={statut === "valide" ? "Ex. : ton attestation décennale expire, envoie la nouvelle." : "Ex. : il manque l'attestation de ton assureur pour la plomberie."}
            />
          </div>
        )}
        {statut === "en_attente" && bloquants.length > 0 && (
          <ul className="mt-2.5 space-y-1 rounded-xl bg-[#fff4dc] px-3 py-2 text-[12.5px] text-[#8a5300]">
            {bloquants.map((b) => <li key={b}>Pour valider : {b.charAt(0).toLowerCase() + b.slice(1)}</li>)}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {statut === "en_attente" && [bouton("valider", "primaire", bloquants.length > 0), bouton("completer", "secondaire", !message.trim()), bouton("refuser", "danger")]}
          {statut === "a_completer" && bouton("refuser", "danger")}
          {statut === "valide" && [bouton("completer", "secondaire", !message.trim()), bouton("suspendre", "danger")]}
          {statut === "suspendu" && [bouton("reactiver", "primaire"), bouton("completer", "secondaire", !message.trim())]}
          {statut === "refuse" && bouton("reexaminer", "secondaire")}
        </div>
        {confirmer && <p className="mt-2 text-[12.5px] text-muted">Clique une seconde fois pour confirmer ; l&apos;artisan recevra un e-mail.</p>}
        {retour && (
          <p role={retour.ok ? "status" : "alert"} className={"mt-2.5 text-[13px] font-medium " + (retour.ok ? "text-[#0b5e40]" : "text-[#b42318]")}>{retour.texte}</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="dec-notes">
        <h2 id="dec-notes" className="text-[14px] font-semibold text-ink">Notes internes</h2>
        <p className="text-[12px] text-muted">Pour toi seul : jamais montrées à l&apos;artisan.</p>
        <label htmlFor="dec-notes-texte" className="sr-only">Notes internes</label>
        <textarea id="dec-notes-texte" rows={4} maxLength={5000} value={note} onChange={(e) => { setNote(e.target.value); setNoteEtat(""); }}
          className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600"
          placeholder="Ce qui s'est dit pendant l'appel, ses délais, ton impression…" />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await noterArtisan(id, note).catch(() => ({ ok: false })); setNoteEtat(r.ok ? "ok" : "erreur"); })}
            className="inline-flex min-h-9 items-center rounded-xl border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:border-brand-600 hover:text-brand-700 disabled:opacity-50">
            Enregistrer les notes
          </button>
          {noteEtat === "ok" && <span role="status" className="text-[12.5px] font-medium text-[#0b5e40]">Enregistré.</span>}
          {noteEtat === "erreur" && <span role="alert" className="text-[12.5px] text-[#b42318]">Pas enregistré : réessaie.</span>}
        </div>
      </section>
    </div>
  );
}

/** Relancer la vérification du SIRET (le répertoire ne répondait pas, ou l'entreprise vient d'être créée). */
export function BoutonReverifierSiret({ id }: { id: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await reverifierSiretArtisan(id).catch(() => ({ ok: false })); setErreur(!r.ok); })}
        className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
        {enCours ? "Vérification…" : "Revérifier le SIRET"}
      </button>
      {erreur && <span role="alert" className="text-[12px] text-[#b42318]">Échec : réessaie.</span>}
    </span>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { agentCompteRendu, agentEmail, agentEnvoyer, agentFiche, agentNotes, agentTexteCompteRendu } from "@/lib/actions/agents";
import type { Resultat } from "@/lib/agents/travail";

/**
 * Sous un rendez-vous du planning : ce que font les agents Rappels et Agenda (27/11/2026).
 * Après l'appel : la transcription (ou les notes), le compte rendu à relire, puis l'envoi au client. Avant l'appel, un
 * pense-bête facultatif (les questions à poser), seulement si Daniel le demande.
 * Rien ne part sans le bouton « Envoyer au client » (décision de Dani : relecture au début).
 */
type Fiche = { resume?: string; points?: string[]; questions?: string[]; vigilance?: string[] } | null;
export type AgentsRdv = { email: string | null; fiche: Fiche; ficheLe: string | null; notes: string | null; compteRenduTexte: string | null; compteRenduEnvoyeLe: string | null; rappelEnvoyeLe: string | null };

const petit = "inline-flex min-h-9 items-center rounded-lg px-3 text-[12.5px] font-semibold disabled:opacity-60";
const plein = petit + " bg-brand-600 text-white hover:bg-brand-700";
const leger = petit + " text-brand-700 hover:bg-surface-2";
const zone = "mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink";
const date = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function PanneauAgents({ id, client, passe, a }: { id: string; client: string; passe: boolean; a: AgentsRdv }) {
  const [enCours, demarrer] = useTransition();
  const [r, setR] = useState<Resultat | null>(null);
  const [email, setEmail] = useState(a.email ?? "");
  const [notes, setNotes] = useState(a.notes ?? "");
  const [texte, setTexte] = useState(a.compteRenduTexte ?? "");
  const lancer = (f: () => Promise<Resultat>) => demarrer(async () => setR(await f().catch(() => ({ ok: false, message: "Échec : réessaie." }))));
  // Après « Rédiger », la page se recharge avec le nouveau texte : la case doit le reprendre (sinon elle reste vide).
  useEffect(() => { setTexte(a.compteRenduTexte ?? ""); }, [a.compteRenduTexte]);
  const envoye = !!a.compteRenduEnvoyeLe, f = a.fiche;

  return (
    <details className="mt-2 w-full rounded-xl border border-line bg-surface-2/40 px-3 py-2" open={passe && !envoye && !!a.compteRenduTexte}>
      <summary className="cursor-pointer text-[12.5px] font-semibold text-brand-700">
        Compte rendu · {a.compteRenduTexte ? (envoye ? "envoyé" : "à relire") : "à rédiger après l'appel"}{a.rappelEnvoyeLe ? " · rappel envoyé" : ""}
      </summary>
      <div className="mt-2 grid gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[16rem] flex-1 text-[12.5px] font-semibold text-muted">E-mail du client (rappel la veille, compte rendu)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={zone} placeholder="client@exemple.fr" />
          </label>
          <button type="button" disabled={enCours} onClick={() => lancer(() => agentEmail(id, email))} className={leger}>Enregistrer</button>
        </div>

        <section>
          <h4 className="text-[13px] font-semibold text-ink">Après l'appel</h4>
          <label className="mt-1 block text-[12.5px] text-muted">Colle la transcription de l'enregistrement, ou tes notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={60000} className={zone} />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={enCours} onClick={() => lancer(() => agentNotes(id, notes))} className={leger}>Enregistrer les notes</button>
            <button type="button" disabled={enCours || envoye} onClick={() => lancer(async () => { const n = await agentNotes(id, notes); return n.ok ? agentCompteRendu(id) : n; })} className={plein}>
              {enCours ? "L'agent rédige…" : texte ? "Rédiger à nouveau" : "Rédiger le compte rendu"}
            </button>
          </div>
        </section>

        {(texte || a.compteRenduTexte) && (
          <section>
            <h4 className="text-[13px] font-semibold text-ink">Compte rendu {envoye ? <span className="font-normal text-[#0b7a53]">· envoyé le {date(a.compteRenduEnvoyeLe!)}</span> : <span className="font-normal text-faint">· à relire et corriger avant l'envoi</span>}</h4>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={14} maxLength={20000} readOnly={envoye} className={zone + " font-mono text-[12.5px]"} />
            {!envoye && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={enCours} onClick={() => lancer(() => agentTexteCompteRendu(id, texte))} className={leger}>Enregistrer mes corrections</button>
                <button type="button" disabled={enCours || !email} onClick={() => window.confirm(`Envoyer ce compte rendu à ${client} (${email}) ? Il partira tel quel.`) && lancer(async () => { const s = await agentTexteCompteRendu(id, texte); return s.ok ? agentEnvoyer(id) : s; })} className={plein}>
                  Envoyer au client
                </button>
              </div>
            )}
          </section>
        )}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-ink">Pense-bête avant l'appel <span className="font-normal text-faint">(facultatif)</span>{a.ficheLe && <span className="ml-2 font-normal text-faint">préparée le {date(a.ficheLe)}</span>}</h4>
            <button type="button" disabled={enCours} onClick={() => lancer(() => agentFiche(id))} className={leger}>{enCours ? "L'agent travaille…" : f ? "Refaire le pense-bête" : "Préparer les questions à poser"}</button>
          </div>
          {f?.resume && (
            <div className="mt-1 space-y-2 text-[13px] text-ink">
              <p>{f.resume}</p>
              {[["À vérifier", f.points], ["Questions à poser", f.questions], ["Vigilance", f.vigilance]].map(([titre, l]) => Array.isArray(l) && l.length > 0 && (
                <div key={titre as string}><p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-faint">{titre as string}</p><ul className="ml-4 list-disc">{(l as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              ))}
            </div>
          )}
        </section>

        {r && <p role={r.ok ? "status" : "alert"} className={"text-[13px] " + (r.ok ? "text-[#0b7a53]" : "text-[#b42318]")}>{r.message}</p>}
      </div>
    </details>
  );
}

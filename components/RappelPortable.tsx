"use client";

import { useId, useState } from "react";
import { enregistrerPortable } from "@/lib/actions/profil";
import { normaliserPortable, COOKIE_RAPPEL_PORTABLE } from "@/lib/telephone";
import type { Locale } from "@/lib/i18n/config";

/**
 * Rappel « Ajoute ton portable » (décision de Dani du 16/11/2026) : les inscrits d'avant le champ portable du
 * questionnaire n'ont pas de numéro. Encart discret en haut de « Mes projets », affiché seulement à un connecté sans
 * portable qui n'a pas cliqué « Plus tard » (la page décide, côté serveur : rien ne s'insère après coup, la liste ne
 * saute pas). Le numéro se saisit sur place ; « Plus tard » pose un cookie de préférence de 14 jours. Ni prix ni emoji.
 */
const PAUSE_S = 14 * 86400;

const TR = {
  fr: {
    titre: "Ajoute ton numéro de portable",
    texte: "Pour qu'on puisse te rappeler au sujet de ton projet, en appel ou sur WhatsApp. Jamais revendu, pas de démarchage.",
    label: "Ton numéro de portable",
    exemple: "06 12 34 56 78",
    bouton: "Enregistrer",
    envoi: "Enregistrement…",
    plusTard: "Plus tard",
    merci: "C'est noté, merci ! Tu peux le modifier à tout moment dans Mon compte.",
    err: {
      vide: "Indique ton numéro de portable.",
      format: "Ce numéro n'est pas lisible : écris-le comme 06 12 34 56 78, ou +33 6 12 34 56 78.",
      pasPortable: "Il faut un numéro de portable (06 ou 07), pas un fixe.",
    },
    errServeur: "Ce numéro n'a pas pu être enregistré : réessaie, ou ajoute-le depuis Mon compte.",
  },
  en: {
    titre: "Add your mobile number",
    texte: "So we can call you back about your project, by phone or WhatsApp. Never sold, no cold calling.",
    label: "Your mobile number",
    exemple: "+33 6 12 34 56 78",
    bouton: "Save",
    envoi: "Saving…",
    plusTard: "Later",
    merci: "Got it, thank you! You can change it any time in My account.",
    err: {
      vide: "Enter your mobile number.",
      format: "This number can't be read: write it like +33 6 12 34 56 78, or with your country code.",
      pasPortable: "Please enter a mobile number (French mobiles start with 06 or 07), not a landline.",
    },
    errServeur: "This number couldn't be saved: try again, or add it from My account.",
  },
} as const;

export default function RappelPortable({ locale }: { locale: Locale }) {
  const s = TR[locale];
  const id = useId();
  const [visible, setVisible] = useState(true);
  const [valeur, setValeur] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);

  if (!visible) return null;

  function plusTard() {
    document.cookie = `${COOKIE_RAPPEL_PORTABLE}=1; Max-Age=${PAUSE_S}; Path=/; SameSite=Lax`;
    setVisible(false);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const r = normaliserPortable(valeur);
    if (!r.ok) { setErreur(s.err[r.erreur]); return; }
    setErreur(""); setEnvoi(true);
    try {
      const res = await enregistrerPortable(valeur);
      if (res.ok) { setFait(true); return; }
      setErreur(res.erreur === "telephone" ? s.err.format : s.errServeur);
    } catch {
      setErreur(s.errServeur);
    } finally {
      setEnvoi(false);
    }
  }

  if (fait) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-positive/25 bg-positive-soft px-4 py-3.5 text-sm text-positive">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {s.merci}
      </div>
    );
  }

  return (
    <section aria-labelledby={`${id}-titre`} data-rappel-portable="" className="rounded-2xl border border-line-strong bg-surface p-4 shadow-[0_1px_3px_rgba(30,27,75,.04)] sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 sm:inline-flex">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="5.5" y="2" width="9" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-titre`} className="text-[15px] font-semibold text-ink">{s.titre}</h2>
          <p className="mt-1 text-[13.5px] leading-snug text-muted">{s.texte}</p>
          <form onSubmit={envoyer} noValidate className="mt-3 flex flex-wrap items-start gap-2">
            <label htmlFor={`${id}-tel`} className="sr-only">{s.label}</label>
            <input
              id={`${id}-tel`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={40}
              placeholder={s.exemple}
              value={valeur}
              onChange={(e) => { setValeur(e.target.value); if (erreur) setErreur(""); }}
              aria-invalid={erreur ? true : undefined}
              aria-describedby={erreur ? `${id}-err` : undefined}
              className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-[15px] text-ink outline-none focus:border-brand-600 sm:w-auto sm:max-w-[16rem]"
            />
            <button type="submit" disabled={envoi} className="btn btn-primary min-h-11 py-2 disabled:opacity-60">
              {envoi ? s.envoi : s.bouton}
            </button>
            <button type="button" onClick={plusTard} className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink">
              {s.plusTard}
            </button>
          </form>
          {erreur && <p id={`${id}-err`} role="alert" className="mt-2 text-[13px] text-[#b42318]">{erreur}</p>}
        </div>
      </div>
    </section>
  );
}

"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { demanderAccompagnement } from "@/lib/actions/accompagnement";
import { suivre } from "@/lib/track";
import type { TextesFormulaire } from "@/lib/accompagnement/contenu";
import {
  BESOINS, BORNES, CHAMPS, CHAMP_JETON, CHAMP_PIEGE, TYPES_PROJET, DESTINATAIRE_DEFAUT,
  type Champ, type EtatDemande, type SourceAccompagnement,
} from "@/lib/accompagnement/constantes";

/**
 * Formulaire « Comment puis-je t'aider ? » de /accompagnement-travaux. Accessible : chaque champ a son libellé, ses
 * erreurs lui sont liées (aria-invalid + aria-describedby), le résumé d'erreur est annoncé (role="alert"), le focus va
 * sur le premier champ en erreur, puis sur le message de réussite. Toute la validation est faite par le serveur (une
 * seule source de règles, lib/accompagnement/schema.ts) : le formulaire envoie tel quel (noValidate).
 *
 * L'envoi part d'une transition (comme components/auth/forms.tsx) : avec `<form action>` seul, React 19 vide le
 * formulaire à chaque envoi, même refusé. `action` reste sur le formulaire pour un envoi avant l'hydratation.
 */
export default function FormulaireAccompagnement({ t, jeton, src }: { t: TextesFormulaire; jeton: string; src?: SourceAccompagnement }) {
  const [etat, action, envoi] = useActionState<EtatDemande, FormData>(demanderAccompagnement, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const succesRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLParagraphElement>(null);
  /** Les champs corrigés depuis la dernière réponse : leur erreur s'efface dès la saisie. */
  const [corriges, setCorriges] = useState<Set<Champ>>(new Set());
  const mesure = useRef(false);
  /** Le dernier envoi (type et nombre de besoins), pour la mesure : le formulaire disparaît à la réussite. */
  const dernier = useRef<{ type: string; besoins: number } | null>(null);

  const champs = etat?.statut === "erreur" ? etat.champs ?? {} : {};
  const erreur = (c: Champ) => (corriges.has(c) ? undefined : champs[c]);
  const premier = CHAMPS.find((c) => champs[c]);

  useEffect(() => {
    if (!etat) return;
    setCorriges(new Set());
    if (etat.statut === "ok") {
      succesRef.current?.focus();
      if (!mesure.current) {
        mesure.current = true;
        suivre("demande_accompagnement", {
          type: dernier.current?.type ?? "inconnu",
          besoins: dernier.current?.besoins ?? 0,
          src: src ?? "direct",
        });
      }
      return;
    }
    const c = CHAMPS.find((k) => etat.champs?.[k]);
    if (c) formRef.current?.querySelector<HTMLElement>(`[data-champ="${c}"]`)?.focus();
    else resumeRef.current?.focus();
  }, [etat, src]);

  const surSaisie = (c: Champ) => () => {
    if (champs[c] && !corriges.has(c)) setCorriges((s) => new Set(s).add(c));
  };

  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get("typeProjet");
    dernier.current = {
      type: typeof type === "string" && (TYPES_PROJET as readonly string[]).includes(type) ? type : "inconnu",
      besoins: fd.getAll("besoins").length,
    };
    startTransition(() => action(fd));
  };

  if (etat?.statut === "ok") {
    return (
      <div ref={succesRef} tabIndex={-1} role="status" className="rounded-card border border-positive/30 bg-positive-soft p-5 outline-none sm:p-6">
        <p className="flex items-center gap-2 text-lg font-semibold text-ink">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-positive">
            <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {etat.prenom ? t.succesTitre.replace("{prenom}", etat.prenom) : t.succesTitreSansPrenom}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.succesTexte}</p>
      </div>
    );
  }

  const global = etat?.statut === "erreur" ? etat.global : undefined;
  const idErr = (c: Champ) => `acc-err-${c}`;
  const decrit = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;
  const msgErreur = (c: Champ) => {
    const code = erreur(c);
    if (!code) return null;
    return (
      <p id={idErr(c)} className="mt-1.5 text-[13px] font-medium text-danger">
        {t.erreurs[c][code]}
      </p>
    );
  };
  const facultatif = <span className="font-normal text-faint"> ({t.facultatif})</span>;
  const carte =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-field border border-line-strong bg-surface px-3 py-2.5 text-[14.5px] leading-snug text-ink transition-colors hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500";

  return (
    <form ref={formRef} action={action} onSubmit={envoyer} noValidate className="space-y-5" aria-describedby="acc-rgpd">
      {(global || premier) && (
        <p ref={resumeRef} tabIndex={-1} role="alert" className="rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger outline-none">
          {global ? t.globales[global] : t.resumeErreurs}
          {(global === "envoi" || global === "limite") && (
            <>
              {" "}
              <a href={`mailto:${DESTINATAIRE_DEFAUT}`} className="font-semibold underline">{DESTINATAIRE_DEFAUT}</a>
            </>
          )}
        </p>
      )}

      <input type="hidden" name={CHAMP_JETON} value={jeton} />
      {src && <input type="hidden" name="src" value={src} />}
      {/* Le piège : hors de l'écran, hors du parcours clavier, ignoré des lecteurs d'écran. Un robot le remplit. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="acc-site-web">{t.piege}</label>
        <input id="acc-site-web" type="text" name={CHAMP_PIEGE} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-prenom" className="field-label">{t.prenom}</label>
          <input
            id="acc-prenom" name="prenom" type="text" autoComplete="given-name" required maxLength={BORNES.prenom}
            data-champ="prenom" className="input min-h-11" onInput={surSaisie("prenom")}
            aria-invalid={erreur("prenom") ? true : undefined} aria-describedby={decrit(erreur("prenom") && idErr("prenom"))}
          />
          {msgErreur("prenom")}
        </div>
        <div>
          <label htmlFor="acc-email" className="field-label">{t.email}</label>
          <input
            id="acc-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={BORNES.email}
            data-champ="email" className="input min-h-11" onInput={surSaisie("email")}
            aria-invalid={erreur("email") ? true : undefined} aria-describedby={decrit(erreur("email") && idErr("email"))}
          />
          {msgErreur("email")}
        </div>
      </div>

      <div>
        <label htmlFor="acc-telephone" className="field-label">{t.telephone}{facultatif}</label>
        <input
          id="acc-telephone" name="telephone" type="tel" inputMode="tel" autoComplete="tel" maxLength={BORNES.telephone}
          data-champ="telephone" className="input min-h-11 sm:max-w-xs" onInput={surSaisie("telephone")}
          aria-invalid={erreur("telephone") ? true : undefined} aria-describedby={decrit("acc-tel-aide", erreur("telephone") && idErr("telephone"))}
        />
        <p id="acc-tel-aide" className="mt-1.5 text-[13px] leading-snug text-faint">{t.telephoneAide}</p>
        {msgErreur("telephone")}
      </div>

      <fieldset aria-describedby={decrit(erreur("typeProjet") && idErr("typeProjet"))}>
        <legend className="field-label">{t.typeProjet}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES_PROJET.map((v, i) => (
            <label key={v} className={carte}>
              <input
                type="radio" name="typeProjet" value={v} required data-champ={i === 0 ? "typeProjet" : undefined}
                aria-invalid={erreur("typeProjet") ? true : undefined}
                className="h-4 w-4 shrink-0 accent-brand-600" onChange={surSaisie("typeProjet")}
              />
              {t.types[v]}
            </label>
          ))}
        </div>
        {msgErreur("typeProjet")}
      </fieldset>

      <fieldset aria-describedby={decrit("acc-besoins-aide", erreur("besoins") && idErr("besoins"))}>
        <legend className="field-label">{t.besoins}{facultatif}</legend>
        <p id="acc-besoins-aide" className="-mt-1 mb-2 text-[13px] text-faint">{t.besoinsAide}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BESOINS.map((v, i) => (
            <label key={v} className={carte}>
              <input
                type="checkbox" name="besoins" value={v} data-champ={i === 0 ? "besoins" : undefined}
                className="h-4 w-4 shrink-0 rounded accent-brand-600" onChange={surSaisie("besoins")}
              />
              {t.listeBesoins[v]}
            </label>
          ))}
        </div>
        {msgErreur("besoins")}
      </fieldset>

      <div>
        <label htmlFor="acc-message" className="field-label">{t.message}{facultatif}</label>
        <textarea
          id="acc-message" name="message" rows={4} maxLength={BORNES.message}
          data-champ="message" className="input min-h-28 resize-y leading-relaxed" onInput={surSaisie("message")}
          aria-invalid={erreur("message") ? true : undefined} aria-describedby={decrit("acc-message-aide", erreur("message") && idErr("message"))}
        />
        <p id="acc-message-aide" className="mt-1.5 text-[13px] leading-snug text-faint">{t.messageAide.replace("{max}", String(BORNES.message))}</p>
        {msgErreur("message")}
      </div>

      <div className="space-y-3">
        <button type="submit" disabled={envoi} className="btn btn-primary min-h-12 w-full whitespace-normal px-5 py-3 text-[15px] leading-snug sm:w-auto">
          {envoi ? t.envoi : t.envoyer}
        </button>
        <p id="acc-rgpd" className="text-[13px] leading-relaxed text-faint">
          {t.rgpd}{" "}
          <Link href="/confidentialite" className="font-medium text-brand-700 underline underline-offset-2">{t.rgpdLien}</Link>
        </p>
      </div>
      <p className="sr-only" aria-live="polite">{envoi ? t.envoi : ""}</p>
    </form>
  );
}

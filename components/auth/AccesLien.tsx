"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { envoyerLienAcces, type LienState } from "@/lib/actions/auth";
import { useT } from "@/components/i18n/LangProvider";
import { LoginForm, SignupForm } from "@/components/auth/forms";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { DELAI_RENVOI_S, destinationLien, messagerieDe, reclamationEnAttente, type PageAcces } from "@/lib/auth-lien";
import type { SourceBeta } from "@/lib/beta";
import { suivre } from "@/lib/track";

/** Préférence de l'appareil : la dernière fois, le mot de passe a été déplié (on le redéplie). */
const CLE_PREFERE_MDP = "av-acces-mdp";

/**
 * Inscription facile (B2) : /inscription et /connexion commencent par UN champ, l'adresse e-mail, et un bouton
 * qui envoie un lien d'accès (lib/actions/auth.ts, `envoyerLienAcces`). Puis l'écran « C'est envoyé ». En dessous,
 * Google (interrupteur `FEATURES.authGoogle`) et, replié, le formulaire à mot de passe d'avant.
 *
 * `next` est l'intention (où le lien ramène ; l'action la revérifie). Sans intention, un anonyme qui a voulu
 * « Enregistrer » (drapeaux de ClaimDraft / ClaimPlan) est ramené à /projets, où son estimation est rangée.
 */
export function AccesParLien({ page, next, source, google }: {
  page: PageAcces;
  next?: string;
  /** D'où vient le visiteur (bêta, liste fermée) : seulement pour la mesure `lien_acces_envoye`. */
  source?: SourceBeta;
  /** « Continuer avec Google » (FEATURES.authGoogle) */
  google: boolean;
}) {
  const ta = useT().auth;
  const t = ta.lien;
  const [state, action, pending] = useActionState<LienState, FormData>(envoyerLienAcces, undefined);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);
  const [restant, setRestant] = useState(0);
  const [suite, setSuite] = useState(next ?? "");
  const [mdpOuvert, setMdpOuvert] = useState(false);
  /* L'état dont l'erreur a déjà été lue (« Changer d'adresse » repart d'un formulaire propre). */
  const [vu, setVu] = useState<LienState>(undefined);
  const champ = useRef<HTMLInputElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      if (!next && reclamationEnAttente((k) => localStorage.getItem(k))) setSuite("/projets");
      if (localStorage.getItem(CLE_PREFERE_MDP) === "1") setMdpOuvert(true);
    } catch {
      /* stockage indisponible : l'intention reçue, le mot de passe replié */
    }
  }, [next]);

  /* Chaque envoi confirmé : l'écran « C'est envoyé », le minuteur du renvoi, la mesure (jamais l'adresse). */
  useEffect(() => {
    if (!state || !("envoye" in state)) return;
    setEnvoyeA(state.email);
    setRestant(DELAI_RENVOI_S);
    suivre("lien_acces_envoye", { source: source ?? page, renvoi: state.renvoi });
  }, [state, source, page]);

  useEffect(() => {
    if (restant <= 0) return;
    const id = setTimeout(() => setRestant((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [restant]);

  /* Le focus suit l'écran : le titre « C'est envoyé » (lu par les lecteurs d'écran), ou le champ au retour. */
  useEffect(() => {
    if (envoyeA) titre.current?.focus();
  }, [envoyeA]);

  const erreur = state && state !== vu && "erreur" in state ? state.erreur : null;

  if (envoyeA) {
    return (
      <EcranEnvoye
        email={envoyeA}
        page={page}
        next={suite}
        newsletter={newsletter}
        retour={!!suite}
        restant={restant}
        pending={pending}
        action={action}
        renvoye={!!state && "envoye" in state && state.renvoi}
        erreur={erreur ? t.erreurs[erreur] : null}
        titreRef={titre}
        onChanger={() => {
          setVu(state);
          setEnvoyeA(null);
          setRestant(0);
          setTimeout(() => champ.current?.focus(), 0);
        }}
      />
    );
  }

  const inscription = page === "inscription";
  return (
    <div>
      <form
        action={action}
        className="space-y-4"
        onSubmit={(e) => {
          try { localStorage.removeItem(CLE_PREFERE_MDP); } catch { /* noop */ }
          // L'action part d'ici, et non du `action` du formulaire : React remettrait alors le formulaire à zéro après
          // une erreur, et la case des nouveautés paraîtrait décochée alors qu'elle est cochée (le consentement
          // envoyé doit être celui qu'on voit). `action` reste pour un envoi avant l'hydratation.
          e.preventDefault();
          const donnees = new FormData(e.currentTarget);
          startTransition(() => action(donnees));
        }}
      >
        <input type="hidden" name="page" value={page} />
        {suite && <input type="hidden" name="next" value={suite} />}
        <div aria-live="assertive" aria-atomic="true">
          {erreur && (
            <p className="rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{t.erreurs[erreur]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lien-email" className="field-label">{t.emailLabel}</label>
          <input
            ref={champ}
            id="lien-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="input"
            placeholder={ta.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="lien-aide"
            aria-invalid={erreur === "email" ? true : undefined}
          />
          <p id="lien-aide" className="pt-0.5 text-[12.5px] leading-snug text-muted">
            {inscription ? t.aideInscription : t.aideConnexion}
          </p>
        </div>
        {inscription && (
          <label htmlFor="lien-newsletter" className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug text-muted">
            <input
              id="lien-newsletter"
              name="newsletter"
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 accent-brand-600"
            />
            <span>{t.newsletter}</span>
          </label>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 disabled:opacity-60" data-lien-bouton="">
          {pending ? t.envoiEnCours : inscription ? t.boutonInscription : t.boutonConnexion}
        </button>
        <p className="text-center text-[12px] leading-snug text-faint">
          {t.mentionAvant}
          <Link href="/cgu" className="text-brand-600 hover:underline">{t.mentionCgu}</Link>
          {t.mentionEt}
          <Link href="/confidentialite" className="text-brand-600 hover:underline">{t.mentionConfid}</Link>.
        </p>
      </form>

      {google && <SocialAuth next={destinationLien(suite, page)} />}

      <details
        className="group mt-6 rounded-field border border-line px-4 py-3"
        open={mdpOuvert}
        onToggle={(e) => {
          const ouvert = e.currentTarget.open;
          setMdpOuvert(ouvert);
          try {
            if (ouvert) localStorage.setItem(CLE_PREFERE_MDP, "1");
            else localStorage.removeItem(CLE_PREFERE_MDP);
          } catch { /* noop */ }
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
          {inscription ? t.plieInscription : t.plieConnexion}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-faint transition-transform group-open:rotate-180">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="mt-4 pb-1">
          {inscription ? <SignupForm next={suite || undefined} /> : <LoginForm next={suite || undefined} />}
        </div>
      </details>
    </div>
  );
}

/**
 * L'écran « C'est envoyé » : l'adresse rappelée, « Ouvrir ma messagerie » si son domaine est connu, le conseil
 * d'ouvrir le lien sur cet appareil, dans ce navigateur et sans tarder (indispensable tant que les modèles d'e-mail
 * de Supabase envoient le lien PKCE, simple prudence avec le format token_hash : docs/beta.md §6), « Renvoyer » après
 * {@link DELAI_RENVOI_S} s, « Changer d'adresse ». Présentation seule (testée à part) ; l'état vit dans `AccesParLien`.
 */
export function EcranEnvoye({
  email, page, next, newsletter, retour, restant, pending, action, renvoye, erreur, titreRef, onChanger,
}: {
  email: string;
  page: PageAcces;
  next: string;
  newsletter: boolean;
  /** Le lien ramène à une intention : on le dit. */
  retour: boolean;
  /** Secondes avant de pouvoir renvoyer (0 : tout de suite). */
  restant: number;
  pending: boolean;
  action: (fd: FormData) => void;
  renvoye: boolean;
  erreur: string | null;
  titreRef?: RefObject<HTMLHeadingElement | null>;
  onChanger: () => void;
}) {
  const t = useT().auth.lien;
  const boite = messagerieDe(email);
  return (
    <div className="space-y-4" data-lien-envoye="">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 ref={titreRef} tabIndex={-1} className="text-[17px] font-semibold leading-snug text-ink outline-none">
            {t.envoyeTitre}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            {t.envoyeAvant}
            <b className="break-words font-semibold text-ink">{email}</b>
            {t.envoyeApres}
            {retour && <> {t.envoyeRetour}</>}
          </p>
        </div>
      </div>

      {boite && (
        <a href={boite.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full py-3" data-ouvrir-messagerie="">
          {t.ouvrirMessagerie(boite.nom)}
        </a>
      )}

      <div className="rounded-field border border-warning/30 bg-warning-soft px-3.5 py-3 text-[13px] leading-relaxed">
        <p className="font-semibold text-ink">{t.memeAppareilTitre}</p>
        <p className="mt-0.5 text-muted">{t.memeAppareil}</p>
      </div>

      <p className="text-[13px] leading-relaxed text-muted">{t.rienRecu}</p>

      <div role="status" aria-live="polite" aria-atomic="true" className="text-[13px] leading-snug">
        {erreur ? <p className="text-danger">{erreur}</p> : renvoye ? <p className="text-positive">{t.renvoye}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="page" value={page} />
          {next && <input type="hidden" name="next" value={next} />}
          {newsletter && <input type="hidden" name="newsletter" value="on" />}
          <input type="hidden" name="renvoi" value="1" />
          <button
            type="submit"
            disabled={restant > 0 || pending}
            className="text-sm font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
          >
            {pending ? t.envoiEnCours : restant > 0 ? t.renvoyerDans(restant) : t.renvoyer}
          </button>
        </form>
        <button type="button" onClick={onChanger} className="text-sm font-medium text-muted hover:text-ink hover:underline">
          {t.changer}
        </button>
      </div>
    </div>
  );
}

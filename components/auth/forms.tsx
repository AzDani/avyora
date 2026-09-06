"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, requestReset, updatePassword, type AuthState } from "@/lib/actions/auth";
import { useT } from "@/components/i18n/LangProvider";

function Feedback({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="mb-4 rounded-field border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="mb-4 rounded-field border border-positive/25 bg-positive-soft px-3.5 py-2.5 text-sm text-positive">
        {state.message}
      </p>
    );
  return null;
}

function Submit({ pending, children }: { pending: boolean; children: string }) {
  const t = useT().auth;
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5 disabled:opacity-60">
      {pending ? t.unInstant : children}
    </button>
  );
}

const field = "space-y-1.5";

// ── Connexion ──
export function LoginForm({ next }: { next?: string }) {
  const t = useT().auth;
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <div className={field}>
        <label htmlFor="email" className="field-label">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t.emailPlaceholder} />
      </div>
      <div className={field}>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="field-label">{t.motDePasse}</label>
          <Link href="/reset" className="text-xs text-brand-600 hover:underline">{t.oublie}</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" />
      </div>
      <label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-line-strong text-brand-600 accent-brand-600"
        />
        {t.resterConnecte}
      </label>
      <Submit pending={pending}>{t.seConnecter}</Submit>
    </form>
  );
}

// ── Inscription ──
export function SignupForm() {
  const t = useT().auth;
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="nom" className="field-label">{t.prenom}</label>
        <input id="nom" name="nom" type="text" autoComplete="given-name" className="input" placeholder={t.prenomPlaceholder} />
      </div>
      <div className={field}>
        <label htmlFor="email" className="field-label">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t.emailPlaceholder} />
      </div>
      <div className={field}>
        <label htmlFor="password" className="field-label">{t.motDePasse}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="input" placeholder={t.mdpMin} />
      </div>
      <label htmlFor="accept" className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug text-muted">
        <input id="accept" name="accept" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 accent-brand-600" />
        <span>
          {t.accepteAvant}<Link href="/cgu" className="text-brand-600 hover:underline">{t.cguLien}</Link>
          {t.et}<Link href="/confidentialite" className="text-brand-600 hover:underline">{t.confidLien}</Link>.
        </span>
      </label>
      <Submit pending={pending}>{t.creerCompte}</Submit>
    </form>
  );
}

// ── Demande de réinitialisation ──
export function ResetRequestForm() {
  const t = useT().auth;
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="email" className="field-label">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t.emailPlaceholder} />
      </div>
      <Submit pending={pending}>{t.envoyerLien}</Submit>
    </form>
  );
}

// ── Définition du nouveau mot de passe ──
export function UpdatePasswordForm() {
  const t = useT().auth;
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="password" className="field-label">{t.nouveauMdp}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="input" placeholder={t.mdpMin} />
      </div>
      <div className={field}>
        <label htmlFor="confirm" className="field-label">{t.confirmMdp}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} className="input" placeholder="••••••••" />
      </div>
      <Submit pending={pending}>{t.enregistrer}</Submit>
    </form>
  );
}

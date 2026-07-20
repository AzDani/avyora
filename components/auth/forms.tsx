"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, requestReset, updatePassword, type AuthState } from "@/lib/actions/auth";

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
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5 disabled:opacity-60">
      {pending ? "Un instant…" : children}
    </button>
  );
}

const field = "space-y-1.5";

// ── Connexion ──
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <div className={field}>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="toi@exemple.fr" />
      </div>
      <div className={field}>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="field-label">Mot de passe</label>
          <Link href="/reset" className="text-xs text-brand-600 hover:underline">Oublié ?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" />
      </div>
      <Submit pending={pending}>Se connecter</Submit>
    </form>
  );
}

// ── Inscription ──
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="nom" className="field-label">Prénom</label>
        <input id="nom" name="nom" type="text" autoComplete="given-name" className="input" placeholder="Daniel" />
      </div>
      <div className={field}>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="toi@exemple.fr" />
      </div>
      <div className={field}>
        <label htmlFor="password" className="field-label">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="8 caractères minimum" />
      </div>
      <Submit pending={pending}>Créer mon compte</Submit>
    </form>
  );
}

// ── Demande de réinitialisation ──
export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="toi@exemple.fr" />
      </div>
      <Submit pending={pending}>Envoyer le lien</Submit>
    </form>
  );
}

// ── Définition du nouveau mot de passe ──
export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className={field}>
        <label htmlFor="password" className="field-label">Nouveau mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="8 caractères minimum" />
      </div>
      <div className={field}>
        <label htmlFor="confirm" className="field-label">Confirme le mot de passe</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="••••••••" />
      </div>
      <Submit pending={pending}>Enregistrer</Submit>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { definirUsername } from "@/lib/actions/username";

const TR = {
  fr: {
    titre: "Pseudo public",
    aide: "Le nom sous lequel tu apparais. Unique — personne d'autre ne peut avoir le même.",
    placeholder: "ex. daniel_reno",
    enregistrer: "Enregistrer",
    enregistrement: "…",
    ok: "✓ Pseudo enregistré",
    format: "3 à 20 caractères : lettres, chiffres, . _ -",
    pris: "Ce pseudo est déjà pris, essaie-en un autre.",
    erreur: "Impossible d'enregistrer. Réessaie.",
    regle: "3–20 caractères · lettres, chiffres, . _ -",
  },
  en: {
    titre: "Public username",
    aide: "The name you appear under. Unique — no one else can have the same.",
    placeholder: "e.g. daniel_reno",
    enregistrer: "Save",
    enregistrement: "…",
    ok: "✓ Username saved",
    format: "3 to 20 characters: letters, digits, . _ -",
    pris: "That username is taken, try another one.",
    erreur: "Couldn't save. Try again.",
    regle: "3–20 characters · letters, digits, . _ -",
  },
} as const;

export default function UsernameForm({ initial = "" }: { initial?: string }) {
  const locale = useLocale();
  const s = TR[locale];
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const r = await definirUsername(value);
      if (r.ok) {
        setValue(r.username);
        setMsg({ kind: "ok", text: s.ok });
      } else {
        setMsg({ kind: "err", text: r.error === "pris" ? s.pris : r.error === "format" ? s.format : s.erreur });
      }
    } catch {
      setMsg({ kind: "err", text: s.erreur });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <h2 className="text-lg font-semibold text-ink">{s.titre}</h2>
      <p className="mt-1 text-sm text-muted">{s.aide}</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="text-muted">@</span>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value.replace(/\s/g, "")); setMsg(null); }}
          placeholder={s.placeholder}
          maxLength={20}
          className="min-w-[180px] flex-1 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-[14px] outline-none focus:border-brand-600"
        />
        <button
          type="submit"
          disabled={saving || value.trim() === initial.trim() || value.trim().length === 0}
          className="btn btn-primary py-2 disabled:opacity-50"
        >
          {saving ? s.enregistrement : s.enregistrer}
        </button>
      </form>
      {msg ? (
        <p className={"mt-2.5 text-[13px] font-medium " + (msg.kind === "ok" ? "text-positive" : "text-red-500")}>{msg.text}</p>
      ) : (
        <p className="mt-2.5 text-[12.5px] text-faint">{s.regle}</p>
      )}
    </section>
  );
}

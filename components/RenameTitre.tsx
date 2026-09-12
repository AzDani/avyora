"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";

const TR = {
  fr: {
    renommageImpossible: "Renommage impossible. Réessaie.",
    nomProjet: "Nom du projet",
    enregistrer: "Enregistrer",
    annuler: "Annuler",
    renommerProjet: "Renommer le projet",
  },
  en: {
    renommageImpossible: "Couldn't rename. Try again.",
    nomProjet: "Project name",
    enregistrer: "Save",
    annuler: "Cancel",
    renommerProjet: "Rename project",
  },
} as const;

/** Titre de la fiche projet, renommable en ligne (crayon → champ → Entrée pour enregistrer). */
export default function RenameTitre({ id, nom }: { id: string; nom: string }) {
  const router = useRouter();
  const locale = useLocale();
  const s = TR[locale];
  const [edit, setEdit] = useState(false);
  const [valeur, setValeur] = useState(nom);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (edit) inputRef.current?.select();
  }, [edit]);

  async function enregistrer() {
    const nouveau = valeur.trim();
    if (!nouveau || nouveau === nom) { annuler(); return; }
    setBusy(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nouveau }),
      });
      if (!res.ok) throw new Error();
      setEdit(false);
      router.refresh();
    } catch {
      setErreur(s.renommageImpossible);
    } finally {
      setBusy(false);
    }
  }

  function annuler() {
    setValeur(nom);
    setErreur(null);
    setEdit(false);
  }

  if (edit) {
    return (
      <div className="mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") enregistrer();
              if (e.key === "Escape") annuler();
            }}
            maxLength={120}
            disabled={busy}
            className="input min-w-0 flex-1 !py-2 text-xl font-semibold sm:text-2xl"
            aria-label={s.nomProjet}
          />
          <button onClick={enregistrer} disabled={busy} className="btn btn-primary py-2 text-[13px] disabled:opacity-60">
            {busy ? "…" : s.enregistrer}
          </button>
          <button onClick={annuler} disabled={busy} className="btn btn-ghost py-2 text-[13px]">
            {s.annuler}
          </button>
        </div>
        {erreur && <p className="mt-1.5 text-sm text-danger">{erreur}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEdit(true)}
      className="group mt-2 flex items-center gap-2 text-left"
      title={s.renommerProjet}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{nom}</h1>
      <span className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
          <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L6 12l-2.7.7L4 10l7.5-7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadDevis({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [texte, setTexte] = useState("");
  const [modeTexte, setModeTexte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function envoyer() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("nom", nom || (fichier ? fichier.name : "Devis"));
      if (fichier) form.set("fichier", fichier);
      if (texte.trim()) form.set("texte", texte);
      const res = await fetch(`/api/projects/${projectId}/devis`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push(`/projets/${projectId}/devis/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'analyse");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-field border border-dashed border-line-strong bg-surface-2/60 p-4">
      <div className="text-sm font-semibold text-ink">Analyser un devis</div>
      <input
        className="input"
        placeholder="Nom (ex. : Devis élec — Entreprise Martin)"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      {!modeTexte ? (
        <input
          type="file"
          accept=".pdf,.txt"
          className="w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
      ) : (
        <textarea
          className="input h-36"
          placeholder="Colle ici le texte complet du devis…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
      )}
      <button
        type="button"
        onClick={() => setModeTexte(!modeTexte)}
        className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        {modeTexte ? "Importer un PDF à la place" : "Ou coller le texte du devis"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        onClick={envoyer}
        disabled={loading || (!fichier && texte.trim().length < 30)}
        className="btn btn-primary w-full py-2.5"
      >
        {loading ? "Analyse en cours…" : "Lancer l'analyse"}
      </button>
    </div>
  );
}

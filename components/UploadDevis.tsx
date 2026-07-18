"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadDevis({ projectId }: { projectId: number }) {
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
    <div className="rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
      <div className="text-sm font-medium">Analyser un devis</div>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Nom (ex. : Devis élec — Entreprise Martin)"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      {!modeTexte ? (
        <input
          type="file"
          accept=".pdf,.txt"
          className="w-full text-sm"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
      ) : (
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm h-36"
          placeholder="Colle ici le texte complet du devis…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
      )}
      <button
        type="button"
        onClick={() => setModeTexte(!modeTexte)}
        className="text-xs text-slate-500 underline"
      >
        {modeTexte ? "Importer un PDF à la place" : "Ou coller le texte du devis"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={envoyer}
        disabled={loading || (!fichier && texte.trim().length < 30)}
        className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-white font-medium disabled:opacity-40"
      >
        {loading ? "Analyse en cours…" : "Lancer l'analyse"}
      </button>
    </div>
  );
}

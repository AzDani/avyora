"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: number;
  type: string;
  nom: string;
  note_ia: string | null;
  created_at: string;
};

export default function DocumentsProjet({
  projectId,
  documents,
  iaDisponible,
}: {
  projectId: number;
  documents: Doc[];
  iaDisponible: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<"plan" | "photo">("plan");
  const [fichier, setFichier] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [analysing, setAnalysing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function envoyer() {
    if (!fichier) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("fichier", fichier);
    form.set("type", type);
    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) setError((await res.json()).error ?? "Erreur");
    setFichier(null);
    setBusy(false);
    router.refresh();
  }

  async function analyser(docId: number) {
    setAnalysing(docId);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Erreur d'analyse");
    setAnalysing(null);
    router.refresh();
  }

  async function supprimer(docId: number) {
    await fetch(`/api/projects/${projectId}/documents?doc=${docId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="font-medium">Plans & photos</h2>
      <p className="text-xs text-slate-500">
        Importe un <strong>plan</strong> (PDF/image) : l&apos;IA en extrait les pièces et le
        métré se calcule automatiquement. Importe des <strong>photos</strong> du bien :
        l&apos;IA repère ce qui impacte le chiffrage (état du sol, murs, humidité…).
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as "plan" | "photo")}
        >
          <option value="plan">Plan</option>
          <option value="photo">Photo</option>
        </select>
        <input
          type="file"
          accept={type === "plan" ? ".pdf,.jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp"}
          className="flex-1 text-sm min-w-40"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={envoyer}
          disabled={busy || !fichier}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white font-medium disabled:opacity-40"
        >
          {busy ? "Envoi…" : "Importer"}
        </button>
      </div>

      {!iaDisponible && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          Les fichiers sont bien stockés, mais l&apos;analyse IA (extraction du plan,
          lecture des photos) nécessite <code className="font-mono">ANTHROPIC_API_KEY</code>{" "}
          dans <code className="font-mono">.env.local</code>. En attendant, saisis les pièces
          à la main dans le métré : le calcul reste identique.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="mr-1.5">{d.type === "plan" ? "📐" : "📷"}</span>
                  <span className="font-medium">{d.nom}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {iaDisponible && (
                    <button
                      onClick={() => analyser(d.id)}
                      disabled={analysing === d.id}
                      className="rounded-lg border border-indigo-300 text-indigo-700 px-3 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      {analysing === d.id
                        ? "Analyse…"
                        : d.type === "plan"
                          ? d.note_ia ? "Ré-extraire les pièces" : "Extraire les pièces (IA)"
                          : d.note_ia ? "Ré-analyser" : "Analyser (IA)"}
                    </button>
                  )}
                  <button onClick={() => supprimer(d.id)} className="text-xs text-slate-400 hover:text-red-600">
                    ✕
                  </button>
                </span>
              </div>
              {d.note_ia && (
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 whitespace-pre-wrap">
                  {d.note_ia}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

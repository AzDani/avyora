"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: number | string;
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
  projectId: string;
  documents: Doc[];
  iaDisponible: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<"plan" | "photo">("plan");
  const [fichier, setFichier] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [analysing, setAnalysing] = useState<number | string | null>(null);
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

  async function analyser(docId: number | string) {
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

  async function supprimer(docId: number | string) {
    await fetch(`/api/projects/${projectId}/documents?doc=${docId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink">Plans &amp; photos</h2>
      <p className="text-xs leading-relaxed text-muted">
        Importe un <strong className="font-semibold text-ink">plan</strong> (PDF/image) : l&apos;IA en extrait les pièces
        et le métré se calcule automatiquement. Importe des <strong className="font-semibold text-ink">photos</strong> du
        bien : l&apos;IA repère ce qui impacte le chiffrage (état du sol, murs, humidité…).
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input w-auto"
          value={type}
          onChange={(e) => setType(e.target.value as "plan" | "photo")}
        >
          <option value="plan">Plan</option>
          <option value="photo">Photo</option>
        </select>
        <input
          type="file"
          accept={type === "plan" ? ".pdf,.jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp"}
          className="min-w-40 flex-1 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
        <button onClick={envoyer} disabled={busy || !fichier} className="btn btn-primary py-2">
          {busy ? "Envoi…" : "Importer"}
        </button>
      </div>

      {!iaDisponible && (
        <p className="rounded-field border border-warning/20 bg-warning-soft p-2.5 text-xs text-warning">
          Les fichiers sont bien stockés, mais l&apos;analyse IA (extraction du plan, lecture des photos) nécessite{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> dans <code className="font-mono">.env.local</code>. En
          attendant, saisis les pièces à la main dans le métré : le calcul reste identique.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="rounded-field border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="mr-1.5">{d.type === "plan" ? "📐" : "📷"}</span>
                  <span className="font-medium text-ink">{d.nom}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {iaDisponible && (
                    <button
                      onClick={() => analyser(d.id)}
                      disabled={analysing === d.id}
                      className="btn btn-outline py-1 text-xs"
                    >
                      {analysing === d.id
                        ? "Analyse…"
                        : d.type === "plan"
                          ? d.note_ia ? "Ré-extraire les pièces" : "Extraire les pièces (IA)"
                          : d.note_ia ? "Ré-analyser" : "Analyser (IA)"}
                    </button>
                  )}
                  <button
                    onClick={() => supprimer(d.id)}
                    className="text-faint transition-colors hover:text-danger"
                    aria-label="Supprimer le document"
                  >
                    ✕
                  </button>
                </span>
              </div>
              {d.note_ia && (
                <div className="mt-2 whitespace-pre-wrap rounded-field bg-surface-2 p-2.5 text-xs text-muted">
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

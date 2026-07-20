"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ArtisanRow = {
  id: number | string;
  nom: string;
  corps_etat: string;
  telephone: string | null;
  email: string | null;
  ville: string | null;
  note: string | null;
};

export default function CarnetArtisans({
  artisans,
  corpsOptions,
}: {
  artisans: ArtisanRow[];
  corpsOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [a, setA] = useState({
    nom: "",
    corpsEtat: corpsOptions[0]?.value ?? "divers",
    telephone: "",
    email: "",
    ville: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [filtre, setFiltre] = useState("tous");

  const set = (k: string, v: string) => setA((p) => ({ ...p, [k]: v }));

  async function ajouter() {
    setBusy(true);
    await fetch("/api/artisans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    setA((p) => ({ ...p, nom: "", telephone: "", email: "", ville: "", note: "" }));
    setBusy(false);
    router.refresh();
  }

  async function supprimer(id: number | string) {
    if (!confirm("Retirer cet artisan du carnet ?")) return;
    await fetch(`/api/artisans?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const labelDe = (v: string) => corpsOptions.find((c) => c.value === v)?.label ?? v;
  const visibles = filtre === "tous" ? artisans : artisans.filter((x) => x.corps_etat === filtre);

  return (
    <div className="space-y-6">
      <div className="card space-y-3 p-5">
        <div className="text-sm font-semibold text-ink">Ajouter un artisan</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Nom / entreprise" value={a.nom} onChange={(e) => set("nom", e.target.value)} />
          <select className="input" value={a.corpsEtat} onChange={(e) => set("corpsEtat", e.target.value)}>
            {corpsOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input className="input" placeholder="Téléphone" value={a.telephone} onChange={(e) => set("telephone", e.target.value)} />
          <input className="input" placeholder="Email" value={a.email} onChange={(e) => set("email", e.target.value)} />
          <input className="input" placeholder="Ville / zone" value={a.ville} onChange={(e) => set("ville", e.target.value)} />
          <input className="input" placeholder="Note (fiable, prix, délais…)" value={a.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <button onClick={ajouter} disabled={busy || !a.nom.trim()} className="btn btn-primary py-2">
          Ajouter au carnet
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">
          {artisans.length} artisan{artisans.length > 1 ? "s" : ""}
        </h2>
        <select className="input w-auto py-1.5" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="tous">Tous les corps d&apos;état</option>
          {corpsOptions.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-ink">Aucun artisan pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted">Ajoute ton réseau : il sera sous la main à chaque chantier.</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibles.map((x) => (
            <li key={x.id} className="card card-interactive p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-ink">{x.nom}</div>
                    <button onClick={() => supprimer(x.id)} className="shrink-0 text-faint transition-colors hover:text-danger" aria-label="Retirer l'artisan">
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="badge-brand">{labelDe(x.corps_etat)}</span>
                    {x.ville && <span className="chip">{x.ville}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {x.telephone && <a className="font-medium text-brand-600 hover:text-brand-700" href={`tel:${x.telephone}`}>{x.telephone}</a>}
                    {x.email && <a className="font-medium text-brand-600 hover:text-brand-700" href={`mailto:${x.email}`}>{x.email}</a>}
                  </div>
                  {x.note && <p className="mt-1.5 text-xs italic text-muted">{x.note}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

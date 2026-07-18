"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ArtisanRow = {
  id: number;
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

  async function supprimer(id: number) {
    if (!confirm("Retirer cet artisan du carnet ?")) return;
    await fetch(`/api/artisans?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const labelDe = (v: string) => corpsOptions.find((c) => c.value === v)?.label ?? v;
  const visibles = filtre === "tous" ? artisans : artisans.filter((x) => x.corps_etat === filtre);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="text-sm font-medium">Ajouter un artisan</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nom / entreprise" value={a.nom} onChange={(e) => set("nom", e.target.value)} />
          <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={a.corpsEtat} onChange={(e) => set("corpsEtat", e.target.value)}>
            {corpsOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Téléphone" value={a.telephone} onChange={(e) => set("telephone", e.target.value)} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={a.email} onChange={(e) => set("email", e.target.value)} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ville / zone" value={a.ville} onChange={(e) => set("ville", e.target.value)} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Note (fiable, prix, délais…)" value={a.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <button
          onClick={ajouter}
          disabled={busy || !a.nom.trim()}
          className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm text-white font-medium disabled:opacity-40"
        >
          Ajouter au carnet
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {artisans.length} artisan{artisans.length > 1 ? "s" : ""}
        </h2>
        <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="tous">Tous les corps d&apos;état</option>
          {corpsOptions.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun artisan pour l&apos;instant. Ajoute ton réseau : il sera sous la
          main à chaque chantier.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map((x) => (
            <li key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{x.nom}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {labelDe(x.corps_etat)}
                    {x.ville ? ` · ${x.ville}` : ""}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 space-x-3">
                    {x.telephone && <a className="text-[#4F46E5] hover:underline" href={`tel:${x.telephone}`}>{x.telephone}</a>}
                    {x.email && <a className="text-[#4F46E5] hover:underline" href={`mailto:${x.email}`}>{x.email}</a>}
                  </div>
                  {x.note && <p className="text-xs text-slate-500 mt-1 italic">{x.note}</p>}
                </div>
                <button onClick={() => supprimer(x.id)} className="text-xs text-slate-400 hover:text-red-600 shrink-0">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

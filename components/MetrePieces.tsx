"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TYPES_PIECES, calculerMetrePiece, type Metre, type PieceRow, type TypePiece } from "@/lib/metre";

type Draft = {
  nom: string;
  typePiece: string;
  longueur: string;
  largeur: string;
  hauteur: string;
  portes: string;
  fenetres: string;
  carrelageSol: boolean;
  faience: boolean;
};

const vide: Draft = {
  nom: "",
  typePiece: "chambre",
  longueur: "",
  largeur: "",
  hauteur: "2.5",
  portes: "1",
  fenetres: "1",
  carrelageSol: false,
  faience: false,
};

function typeLabel(v: string): string {
  return TYPES_PIECES.find((t) => t.value === v)?.label ?? v;
}

export default function MetrePieces({
  projectId,
  pieces,
  metre,
}: {
  projectId: number;
  pieces: PieceRow[];
  metre: Metre | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(pieces.length === 0);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [p, setP] = useState<Draft>(vide);

  const set = (k: keyof Draft, v: string | boolean) => setP((prev) => ({ ...prev, [k]: v }));

  function onTypeChange(v: string) {
    const eau = v === "salle_de_bain" || v === "wc";
    setP((prev) => ({
      ...prev,
      typePiece: v,
      carrelageSol: eau || v === "cuisine" ? true : prev.carrelageSol,
      faience: eau,
    }));
  }

  const payload = () => ({
    ...p,
    longueur: Number(p.longueur),
    largeur: Number(p.largeur),
    hauteur: Number(p.hauteur),
    portes: Number(p.portes),
    fenetres: Number(p.fenetres),
  });

  async function ajouter() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/pieces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    setP(vide);
    setBusy(false);
    router.refresh();
  }

  async function enregistrer() {
    if (editId == null) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/pieces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), pieceId: editId }),
    });
    setEditId(null);
    setP(vide);
    setBusy(false);
    router.refresh();
  }

  async function supprimer(pieceId: number) {
    await fetch(`/api/projects/${projectId}/pieces?piece=${pieceId}`, { method: "DELETE" });
    if (editId === pieceId) {
      setEditId(null);
      setP(vide);
    }
    router.refresh();
  }

  function editer(pc: PieceRow) {
    setEditId(pc.id);
    setOuvert(true);
    setP({
      nom: pc.nom,
      typePiece: pc.type_piece,
      longueur: String(pc.longueur),
      largeur: String(pc.largeur),
      hauteur: String(pc.hauteur),
      portes: String(pc.portes),
      fenetres: String(pc.fenetres),
      carrelageSol: !!pc.carrelage_sol,
      faience: !!pc.faience,
    });
  }

  const formValide = p.nom.trim() && Number(p.longueur) > 0 && Number(p.largeur) > 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Métré pièce par pièce</h2>
        <button onClick={() => setOuvert(!ouvert)} className="text-xs text-slate-500 underline">
          {ouvert ? "Réduire" : `${pieces.length} pièce${pieces.length > 1 ? "s" : ""} — modifier`}
        </button>
      </div>

      {metre && metre.pieces.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            ["Sol", `${metre.totalSol} m²`],
            ["Murs", `${metre.totalMurs} m²`],
            ["Plafonds", `${metre.totalPlafonds} m²`],
            ["Plinthes", `${metre.totalPlinthesMl} ml`],
            ["Sol carrelé", `${metre.totalSolCarrelage} m²`],
            ["Faïence", `${metre.totalFaienceM2} m²`],
            ["Menuiseries", `${metre.totalPortes} portes · ${metre.totalFenetres} fen.`],
            ["Salles d'eau", `${metre.nbSallesDeBain} SDB`],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-[11px] text-slate-500">{l}</div>
              <div className="text-sm font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau récap par pièce */}
      {metre && metre.pieces.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-2 py-2 font-medium">Pièce</th>
                <th className="px-2 py-2 font-medium text-right">Sol</th>
                <th className="px-2 py-2 font-medium text-right">Murs</th>
                <th className="px-2 py-2 font-medium text-right">Plafond</th>
                <th className="px-2 py-2 font-medium text-right">Plinthes</th>
                <th className="px-2 py-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((pc) => {
                const m = calculerMetrePiece({
                  nom: pc.nom,
                  type_piece: pc.type_piece as TypePiece,
                  longueur: pc.longueur,
                  largeur: pc.largeur,
                  hauteur: pc.hauteur,
                  portes: pc.portes,
                  fenetres: pc.fenetres,
                  faience: !!pc.faience,
                });
                return (
                  <tr key={pc.id} className="border-b border-slate-50">
                    <td className="px-2 py-2">
                      <div className="font-medium">{pc.nom}</div>
                      <div className="text-[11px] text-slate-400">
                        {typeLabel(pc.type_piece)} · {pc.longueur}×{pc.largeur} m
                        {pc.carrelage_sol ? " · carrelage" : ""}
                        {pc.faience ? " · faïence" : ""}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{m.surfaceSol} m²</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{m.surfaceMurs} m²</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{m.surfacePlafond} m²</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{m.plinthesMl} ml</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <button onClick={() => editer(pc)} className="text-xs text-[#4F46E5] hover:underline mr-2">
                        Modifier
                      </button>
                      <button onClick={() => supprimer(pc.id)} className="text-xs text-slate-400 hover:text-red-600">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t border-slate-200">
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-right">{metre.totalSol} m²</td>
                <td className="px-2 py-2 text-right">{metre.totalMurs} m²</td>
                <td className="px-2 py-2 text-right">{metre.totalPlafonds} m²</td>
                <td className="px-2 py-2 text-right">{metre.totalPlinthesMl} ml</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {ouvert && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
          <div className="text-sm font-medium">
            {editId != null ? "Modifier la pièce" : "Ajouter une pièce"}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nom (ex. : Chambre 1)"
              value={p.nom}
              onChange={(e) => set("nom", e.target.value)}
            />
            <select
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              value={p.typePiece}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              {TYPES_PIECES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input type="number" step="0.1" className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Long. m" value={p.longueur} onChange={(e) => set("longueur", e.target.value)} />
            <input type="number" step="0.1" className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Larg. m" value={p.largeur} onChange={(e) => set("largeur", e.target.value)} />
            <input type="number" step="0.1" className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm" title="Hauteur sous plafond" value={p.hauteur} onChange={(e) => set("hauteur", e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              Portes
              <input type="number" className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-sm" value={p.portes} onChange={(e) => set("portes", e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5">
              Fenêtres
              <input type="number" className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-sm" value={p.fenetres} onChange={(e) => set("fenetres", e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={p.carrelageSol} onChange={(e) => set("carrelageSol", e.target.checked)} />
              Sol carrelé
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={p.faience} onChange={(e) => set("faience", e.target.checked)} />
              Faïence murale
            </label>
            {editId != null && (
              <button
                onClick={() => { setEditId(null); setP(vide); }}
                className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
              >
                Annuler
              </button>
            )}
            <button
              onClick={editId != null ? enregistrer : ajouter}
              disabled={busy || !formValide}
              className={`rounded-lg bg-[#4F46E5] px-4 py-2 text-sm text-white font-medium disabled:opacity-40 ${editId == null ? "ml-auto" : ""}`}
            >
              {editId != null ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Chaque pièce ajoutée est modifiable (bouton « Modifier » dans le tableau).
            Le métré remplace les ratios dans l&apos;estimation pour un chiffrage précis.
          </p>
        </div>
      )}
    </section>
  );
}

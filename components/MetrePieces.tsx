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
  projectId: string;
  pieces: PieceRow[];
  metre: Metre | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(pieces.length === 0);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);
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

  async function supprimer(pieceId: number | string) {
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
    <section className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Métré pièce par pièce</h2>
        <button onClick={() => setOuvert(!ouvert)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {ouvert ? "Réduire" : `${pieces.length} pièce${pieces.length > 1 ? "s" : ""} — modifier`}
        </button>
      </div>

      {pieces.length === 0 ? (
        <div className="flex items-start gap-3 rounded-field border border-brand-100 bg-brand-50/50 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Gagne en précision — passe au métré réel</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Ajoute tes pièces : murs, sols, plafonds, plinthes et faïence sont calculés <strong className="font-semibold text-ink">exactement</strong>,
              au lieu d&apos;être estimés depuis la surface. Ton estimation se recalcule automatiquement. ~2 min.
            </p>
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2.5 py-1 text-xs font-medium text-positive">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Précision affinée par le métré réel
        </div>
      )}

      {metre && metre.pieces.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
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
            <div key={l as string} className="rounded-field bg-surface-2 p-2.5">
              <div className="text-[11px] text-faint">{l}</div>
              <div className="num mt-1 text-sm font-semibold text-ink">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau récap par pièce */}
      {metre && metre.pieces.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-faint">
                <th className="px-2 py-2 font-medium">Pièce</th>
                <th className="px-2 py-2 text-right font-medium">Sol</th>
                <th className="px-2 py-2 text-right font-medium">Murs</th>
                <th className="px-2 py-2 text-right font-medium">Plafond</th>
                <th className="px-2 py-2 text-right font-medium">Plinthes</th>
                <th className="px-2 py-2 text-right font-medium"></th>
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
                  <tr key={pc.id} className="border-b border-line/60">
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink">{pc.nom}</div>
                      <div className="text-[11px] text-faint">
                        {typeLabel(pc.type_piece)} · {pc.longueur}×{pc.largeur} m
                        {pc.carrelage_sol ? " · carrelage" : ""}
                        {pc.faience ? " · faïence" : ""}
                      </div>
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-muted">{m.surfaceSol} m²</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-muted">{m.surfaceMurs} m²</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-muted">{m.surfacePlafond} m²</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-muted">{m.plinthesMl} ml</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <button onClick={() => editer(pc)} className="mr-2 text-xs font-medium text-brand-600 hover:text-brand-700">
                        Modifier
                      </button>
                      <button onClick={() => supprimer(pc.id)} className="text-xs text-faint transition-colors hover:text-danger" aria-label="Supprimer la pièce">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong font-semibold text-ink">
                <td className="px-2 py-2">Total</td>
                <td className="num px-2 py-2 text-right">{metre.totalSol} m²</td>
                <td className="num px-2 py-2 text-right">{metre.totalMurs} m²</td>
                <td className="num px-2 py-2 text-right">{metre.totalPlafonds} m²</td>
                <td className="num px-2 py-2 text-right">{metre.totalPlinthesMl} ml</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {ouvert && (
        <div className="space-y-3 rounded-field border border-dashed border-line-strong bg-surface-2/60 p-3.5">
          <div className="text-sm font-semibold text-ink">
            {editId != null ? "Modifier la pièce" : "Ajouter une pièce"}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-28 flex-1"
              placeholder="Nom (ex. : Chambre 1)"
              value={p.nom}
              onChange={(e) => set("nom", e.target.value)}
            />
            <select className="input w-auto" value={p.typePiece} onChange={(e) => onTypeChange(e.target.value)}>
              {TYPES_PIECES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input type="number" step="0.1" className="input num w-24" placeholder="Long. m" value={p.longueur} onChange={(e) => set("longueur", e.target.value)} />
            <input type="number" step="0.1" className="input num w-24" placeholder="Larg. m" value={p.largeur} onChange={(e) => set("largeur", e.target.value)} />
            <input type="number" step="0.1" className="input num w-20" title="Hauteur sous plafond" value={p.hauteur} onChange={(e) => set("hauteur", e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <label className="flex items-center gap-1.5">
              Portes
              <input type="number" className="input num w-14 px-2 py-1" value={p.portes} onChange={(e) => set("portes", e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5">
              Fenêtres
              <input type="number" className="input num w-14 px-2 py-1" value={p.fenetres} onChange={(e) => set("fenetres", e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-brand-600" checked={p.carrelageSol} onChange={(e) => set("carrelageSol", e.target.checked)} />
              Sol carrelé
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-brand-600" checked={p.faience} onChange={(e) => set("faience", e.target.checked)} />
              Faïence murale
            </label>
            {editId != null && (
              <button onClick={() => { setEditId(null); setP(vide); }} className="btn btn-outline ml-auto py-2">
                Annuler
              </button>
            )}
            <button
              onClick={editId != null ? enregistrer : ajouter}
              disabled={busy || !formValide}
              className={`btn btn-primary py-2 ${editId == null ? "ml-auto" : ""}`}
            >
              {editId != null ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
          <p className="text-xs text-faint">
            Chaque pièce ajoutée est modifiable (bouton « Modifier » dans le tableau). Le métré remplace les ratios
            dans l&apos;estimation pour un chiffrage précis.
          </p>
        </div>
      )}
    </section>
  );
}

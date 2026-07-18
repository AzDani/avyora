"use client";

import { useState } from "react";
import type { Estimation } from "@/lib/estimation";
import { corpsLabel, uniteLabel } from "@/lib/estimation";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

type Vue = "total" | "mo" | "fourn";

export default function EstimationTable({ est }: { est: Estimation }) {
  const [vue, setVue] = useState<Vue>("total");

  const totalPourVue =
    vue === "mo"
      ? [est.totalMoBas, est.totalMoHaut]
      : vue === "fourn"
        ? [est.totalFournBas, est.totalFournHaut]
        : [est.totalBas, est.totalHaut];

  const ligneVals = (l: Estimation["lignes"][number]): [number, number] =>
    vue === "mo" ? [l.moBas, l.moHaut] : vue === "fourn" ? [l.fournBas, l.fournHaut] : [l.bas, l.haut];

  // En vue « fournitures », on parle de matériaux seuls : on enlève le vocabulaire de pose.
  const posteLabel = (poste: string): string => {
    if (vue !== "fourn") return poste;
    return poste
      .replace(/\s*\(fourni-posé\)|\s*\(fournie-posée\)|\s*\(fournies-posées\)|\s*\(posé\)|\s*\(posée\)|\s*\(MO seule\)/gi, "")
      .replace(/\bfourni-posé\b|\bfournie-posée\b|\bposé\b|\bposée\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-[#1E1B4B] text-white p-4">
        <div className="text-xs uppercase tracking-wide text-indigo-200/70">
          Estimation travaux
        </div>
        <div className="text-2xl font-semibold mt-1">
          {euros(totalPourVue[0])} – {euros(totalPourVue[1])}
        </div>
        <div className="text-xs text-indigo-200/70 mt-1">
          {vue === "total" && "Prix « fait faire » — main d'œuvre + fournitures incluses"}
          {vue === "mo" && "Main d'œuvre seule — ce que facture un artisan pour la pose"}
          {vue === "fourn" && "Fournitures seules — si tu réalises les travaux toi-même"}
          <span className="mx-2">·</span>
          Durée {est.dureeSemaines[0]}–{est.dureeSemaines[1]} sem.
          {est.mode === "detaille" && (
            <span className="ml-2 rounded-full bg-[#A78BFA]/20 text-[#C4B5FD] px-2 py-0.5 font-medium">
              détaillé · ±15 %
            </span>
          )}
        </div>

        {/* Bascule */}
        <div className="mt-3 inline-flex rounded-lg bg-white/10 p-0.5 text-xs">
          {(
            [
              ["total", "Je fais faire"],
              ["mo", "Main d'œuvre"],
              ["fourn", "Je fais moi-même"],
            ] as [Vue, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                vue === v ? "bg-white text-[#1E1B4B]" : "text-indigo-100 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bandeau récap MO / fournitures */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 text-center">
        <div className="p-3">
          <div className="text-xs text-slate-500">Dont main d&apos;œuvre</div>
          <div className="text-sm font-semibold mt-0.5">
            {euros(est.totalMoBas)} – {euros(est.totalMoHaut)}
          </div>
        </div>
        <div className="p-3">
          <div className="text-xs text-slate-500">Dont fournitures</div>
          <div className="text-sm font-semibold mt-0.5">
            {euros(est.totalFournBas)} – {euros(est.totalFournHaut)}
          </div>
        </div>
      </div>

      {est.lignes.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          Aucun travaux sélectionné dans le questionnaire.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-medium">Poste</th>
                <th className="px-4 py-2 font-medium text-right">Quantité</th>
                <th className="px-4 py-2 font-medium text-right">Prix unitaire</th>
                <th className="px-4 py-2 font-medium text-right">
                  {vue === "total" ? "Fait faire" : vue === "mo" ? "Main d'œuvre" : "Fournitures"}
                </th>
              </tr>
            </thead>
            <tbody>
              {est.lignes.map((l, i) => {
                const [b, h] = ligneVals(l);
                const pu =
                  l.unite !== "forfait" && l.quantite > 0
                    ? `${Math.round(b / l.quantite)}–${Math.round(h / l.quantite)} €/${uniteLabel(l.unite)}`
                    : "—";
                return (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{posteLabel(l.poste)}</div>
                      <div className="text-xs text-slate-400">{corpsLabel(l.corpsEtat)}</div>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                      {l.quantite} {uniteLabel(l.unite)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 text-xs whitespace-nowrap">
                      {pu}
                    </td>
                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                      {euros(b)} – {euros(h)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-4 py-3 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
        <strong>Fais-le toi-même</strong> = tu paies les fournitures et tu économises
        la main d&apos;œuvre. Les montants de fournitures sont estimés à partir des
        tarifs marché tout compris — le chiffrage précis des matériaux (catalogue
        fournisseur) sera ajouté plus tard. Certains lots exigent un pro certifié
        (électricité/Consuel, gaz).
      </p>
    </section>
  );
}

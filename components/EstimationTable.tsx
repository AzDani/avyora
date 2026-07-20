"use client";

import { useState } from "react";
import type { Estimation } from "@/lib/estimation";
import { corpsLabel, uniteLabel } from "@/lib/estimation";
import AnimatedEuros from "@/components/AnimatedEuros";

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

  // Regroupement par corps d'état (ordre d'apparition) + sous-total par groupe.
  const groupes = (() => {
    const map = new Map<string, Estimation["lignes"]>();
    for (const l of est.lignes) {
      const arr = map.get(l.corpsEtat) ?? [];
      arr.push(l);
      map.set(l.corpsEtat, arr);
    }
    return [...map.entries()].map(([corps, lignes]) => {
      let sb = 0, sh = 0;
      for (const l of lignes) { const [b, h] = ligneVals(l); sb += b; sh += h; }
      return { corps, lignes, sb, sh };
    });
  })();

  const vueLabel = vue === "total" ? "Fait faire" : vue === "mo" ? "Main d'œuvre" : "Fournitures";

  return (
    <section className="card overflow-hidden p-0">
      {/* En-tête — le chiffre héros */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#241f5e] to-[#191640] p-6 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#7C3AED]/25 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C4B5FD]">Estimation travaux</p>
          <div className="data mt-2 text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
            <AnimatedEuros value={totalPourVue[0]} /> <span className="text-white/40">–</span>{" "}
            <AnimatedEuros value={totalPourVue[1]} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-200/75">
            <span>
              {vue === "total" && "Prix « fait faire » — main d'œuvre + fournitures"}
              {vue === "mo" && "Main d'œuvre seule — la pose facturée par l'artisan"}
              {vue === "fourn" && "Fournitures seules — si tu réalises les travaux"}
            </span>
            <span className="text-white/25">·</span>
            <span className="num">Durée {est.dureeSemaines[0]}–{est.dureeSemaines[1]} sem.</span>
            {est.mode === "detaille" && (
              <span className="rounded-full bg-[#A78BFA]/20 px-2 py-0.5 font-medium text-[#C4B5FD]">détaillé · ±15 %</span>
            )}
          </div>

          {/* Segmented */}
          <div className="mt-4 inline-flex rounded-field bg-white/10 p-1 text-xs">
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
                className={`rounded-[0.45rem] px-3 py-1.5 font-medium transition-colors ${
                  vue === v ? "bg-white text-[#1E1B4B] shadow-sm" : "text-indigo-100 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Récap MO / fournitures */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <div className="px-4 py-3.5 text-center">
          <div className="text-xs text-faint">Dont main d&apos;œuvre</div>
          <div className="data mt-1 text-sm font-semibold text-ink">
            {euros(est.totalMoBas)} – {euros(est.totalMoHaut)}
          </div>
        </div>
        <div className="px-4 py-3.5 text-center">
          <div className="text-xs text-faint">Dont fournitures</div>
          <div className="data mt-1 text-sm font-semibold text-ink">
            {euros(est.totalFournBas)} – {euros(est.totalFournHaut)}
          </div>
        </div>
      </div>

      {est.lignes.length === 0 ? (
        <p className="p-5 text-sm text-muted">Aucun travaux sélectionné dans le questionnaire.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-faint">
                <th className="px-4 py-2.5 font-medium">Poste</th>
                <th className="px-4 py-2.5 text-right font-medium">Quantité</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Prix unitaire</th>
                <th className="px-4 py-2.5 text-right font-medium">{vueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((g) => (
                <GroupeCorps key={g.corps}>
                  <tr className="bg-surface-2">
                    <td colSpan={3} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                      {corpsLabel(g.corps)}
                    </td>
                    <td className="data whitespace-nowrap px-4 py-2 text-right text-xs font-semibold text-brand-700">
                      {euros(g.sb)} – {euros(g.sh)}
                    </td>
                  </tr>
                  {g.lignes.map((l, i) => {
                    const [b, h] = ligneVals(l);
                    const pu =
                      l.unite !== "forfait" && l.quantite > 0
                        ? `${Math.round(b / l.quantite)}–${Math.round(h / l.quantite)} €/${uniteLabel(l.unite)}`
                        : "—";
                    return (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-ink">{posteLabel(l.poste)}</td>
                        <td className="num whitespace-nowrap px-4 py-2.5 text-right text-muted">
                          {l.quantite} {uniteLabel(l.unite)}
                        </td>
                        <td className="num hidden whitespace-nowrap px-4 py-2.5 text-right text-xs text-faint sm:table-cell">{pu}</td>
                        <td className="data whitespace-nowrap px-4 py-2.5 text-right font-semibold text-ink">
                          {euros(b)} – {euros(h)}
                        </td>
                      </tr>
                    );
                  })}
                </GroupeCorps>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-line bg-surface-2 px-4 py-3.5 text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-ink">Fais-le toi-même</strong> = tu paies les fournitures et
        tu économises la main d&apos;œuvre. Les montants de fournitures sont estimés aux tarifs marché tout
        compris — le chiffrage précis des matériaux (catalogue fournisseur) arrivera plus tard. Certains lots
        exigent un pro certifié (électricité/Consuel, gaz).
      </p>
    </section>
  );
}

// Fragment de groupe (évite un wrapper DOM tout en gardant une clé stable).
function GroupeCorps({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

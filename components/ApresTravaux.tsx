"use client";

import { useMemo, useState } from "react";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/* Module 10 — après travaux : valeur, loyer, annonce prête à publier. Déterministe. */
export default function ApresTravaux({
  surface,
  typeBien,
  codePostal,
  nbChambres,
  nbSdb,
  travaux,
}: {
  surface: number;
  typeBien: string;
  codePostal: string;
  nbChambres: number;
  nbSdb: number;
  travaux: string[];
}) {
  const [prixM2, setPrixM2] = useState(0);
  const [loyerM2, setLoyerM2] = useState(0);
  const [copie, setCopie] = useState(false);

  const valeur = Math.round(surface * prixM2);
  const loyer = Math.round(surface * loyerM2);

  const annonce = useMemo(() => {
    const typeLabel =
      typeBien === "appartement"
        ? `Appartement${nbChambres > 0 ? ` ${nbChambres + 1} pièces` : ""}`
        : typeBien === "immeuble"
          ? "Immeuble"
          : `Maison${nbChambres > 0 ? ` ${nbChambres + 1} pièces` : ""}`;
    const lignes = [
      `${typeLabel} entièrement rénové — ${surface} m² (${codePostal})`,
      "",
      `${typeLabel} de ${surface} m² refait à neuf${nbChambres > 0 ? `, ${nbChambres} chambre${nbChambres > 1 ? "s" : ""}` : ""}${nbSdb > 0 ? `, ${nbSdb} salle${nbSdb > 1 ? "s" : ""} de bain` : ""}.`,
      travaux.length > 0
        ? `Rénovation complète réalisée : ${travaux.join(", ").toLowerCase()}.`
        : "",
      "Prestations soignées, aucun travaux à prévoir : posez vos meubles.",
      loyer > 0 ? `Loyer : ${euros(loyer)} par mois hors charges.` : "",
      "Disponible immédiatement — contact et visites par message.",
    ].filter(Boolean);
    return lignes.join("\n");
  }, [typeBien, surface, codePostal, nbChambres, nbSdb, travaux, loyer]);

  async function copier() {
    await navigator.clipboard.writeText(annonce);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="font-medium">Après travaux — valeur, loyer, annonce</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">
            Prix du marché local (€/m² rénové)
          </span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="ex. : 3200"
            value={prixM2 || ""}
            onChange={(e) => setPrixM2(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">
            Loyer du marché (€/m²/mois)
          </span>
          <input
            type="number"
            step="0.5"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="ex. : 13"
            value={loyerM2 || ""}
            onChange={(e) => setLoyerM2(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      {(valeur > 0 || loyer > 0) && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Valeur estimée après travaux</div>
            <div className="font-semibold mt-0.5">{valeur > 0 ? euros(valeur) : "—"}</div>
            <div className="text-[10px] text-slate-400">
              reporte-la dans la rentabilité pour la création de valeur
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Loyer estimé</div>
            <div className="font-semibold mt-0.5">{loyer > 0 ? `${euros(loyer)} /mois` : "—"}</div>
            <div className="text-[10px] text-slate-400">hors charges, à comparer aux annonces locales</div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium">Annonce générée</span>
          <button
            onClick={copier}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:border-indigo-400"
          >
            {copie ? "✓ Copiée" : "Copier l'annonce"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 leading-relaxed font-sans">
          {annonce}
        </pre>
      </div>
    </section>
  );
}

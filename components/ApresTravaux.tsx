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
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink">Après travaux — valeur, loyer, annonce</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">Prix du marché local (€/m² rénové)</span>
          <input
            type="number"
            className="input num mt-1.5"
            placeholder="ex. : 3200"
            value={prixM2 || ""}
            onChange={(e) => setPrixM2(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Loyer du marché (€/m²/mois)</span>
          <input
            type="number"
            step="0.5"
            className="input num mt-1.5"
            placeholder="ex. : 13"
            value={loyerM2 || ""}
            onChange={(e) => setLoyerM2(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      {(valeur > 0 || loyer > 0) && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-field bg-surface-2 p-3.5">
            <div className="text-xs text-faint">Valeur estimée après travaux</div>
            <div className="data mt-1 text-lg font-semibold text-ink">{valeur > 0 ? euros(valeur) : "—"}</div>
            <div className="mt-0.5 text-[10px] text-faint">reporte-la dans la rentabilité (création de valeur)</div>
          </div>
          <div className="rounded-field bg-surface-2 p-3.5">
            <div className="text-xs text-faint">Loyer estimé</div>
            <div className="data mt-1 text-lg font-semibold text-ink">{loyer > 0 ? `${euros(loyer)} /mois` : "—"}</div>
            <div className="mt-0.5 text-[10px] text-faint">hors charges, à comparer aux annonces locales</div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Annonce générée</span>
          <button onClick={copier} className="btn btn-outline py-1.5 text-xs">
            {copie ? "✓ Copiée" : "Copier l'annonce"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-field border border-line bg-surface-2 p-3.5 font-sans text-xs leading-relaxed text-muted">
          {annonce}
        </pre>
      </div>
    </section>
  );
}

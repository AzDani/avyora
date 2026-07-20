"use client";

import { useMemo, useState } from "react";
import {
  calculerRentabilite,
  type ParamsRentabilite,
} from "@/lib/rentabilite";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function Champ({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          type="number"
          className="input num"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        {suffix && <span className="text-xs text-faint">{suffix}</span>}
      </div>
    </label>
  );
}

export default function Rentabilite({
  projectId,
  travauxDefaut,
  paramsInitiaux,
}: {
  projectId: string;
  travauxDefaut: number;
  paramsInitiaux: ParamsRentabilite | null;
}) {
  const [p, setP] = useState<ParamsRentabilite>(
    paramsInitiaux ?? {
      prixAchat: 0,
      travaux: travauxDefaut,
      loyerMensuel: 0,
      chargesAnnuelles: 0,
      apport: 0,
      tauxCredit: 3.5,
      dureeCredit: 20,
      valeurApresTravaux: 0,
    }
  );
  const [saved, setSaved] = useState(false);

  const res = useMemo(() => calculerRentabilite(p), [p]);
  const set = (k: keyof ParamsRentabilite) => (v: number) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const actif = p.prixAchat > 0 && p.loyerMensuel > 0;

  async function sauvegarder() {
    await fetch(`/api/projects/${projectId}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    setSaved(true);
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink">Rentabilité locative</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Champ label="Prix d'achat" value={p.prixAchat} onChange={set("prixAchat")} suffix="€" />
        <Champ label="Travaux (estimation)" value={p.travaux} onChange={set("travaux")} suffix="€" />
        <Champ label="Loyer mensuel visé" value={p.loyerMensuel} onChange={set("loyerMensuel")} suffix="€" />
        <Champ label="Charges annuelles" value={p.chargesAnnuelles} onChange={set("chargesAnnuelles")} suffix="€" />
        <Champ label="Apport" value={p.apport} onChange={set("apport")} suffix="€" />
        <Champ label="Taux crédit" value={p.tauxCredit} onChange={set("tauxCredit")} suffix="%" />
        <Champ label="Durée crédit" value={p.dureeCredit} onChange={set("dureeCredit")} suffix="ans" />
        <Champ
          label="Valeur estimée après travaux"
          value={p.valeurApresTravaux ?? 0}
          onChange={set("valeurApresTravaux")}
          suffix="€"
        />
      </div>

      {actif ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-field bg-surface-2 p-3.5">
              <div className="text-xs text-faint">Coût total</div>
              <div className="data mt-1 font-semibold text-ink">{euros(res.coutTotal)}</div>
              <div className="num mt-0.5 text-[10px] text-faint">dont notaire {euros(res.fraisNotaire)}</div>
            </div>
            <div className="rounded-field bg-surface-2 p-3.5">
              <div className="text-xs text-faint">Mensualité</div>
              <div className="data mt-1 font-semibold text-ink">{euros(res.mensualite)}</div>
              <div className="num mt-0.5 text-[10px] text-faint">emprunt {euros(res.montantEmprunte)}</div>
            </div>
            <div className="rounded-field bg-surface-2 p-3.5">
              <div className="text-xs text-faint">Rendement brut / net</div>
              <div className="data mt-1 font-semibold text-ink">
                {res.rendementBrut} % · {res.rendementNet} %
              </div>
            </div>
            <div className={`rounded-field p-3.5 ${res.cashflowMensuel >= 0 ? "bg-positive-soft" : "bg-danger-soft"}`}>
              <div className="text-xs text-faint">Cash-flow / mois</div>
              <div className={`data mt-1 font-semibold ${res.cashflowMensuel >= 0 ? "text-positive" : "text-danger"}`}>
                {euros(res.cashflowMensuel)}
              </div>
            </div>
          </div>
          {(res.plusValueLatente != null || res.roiApport != null) && (
            <div className="grid grid-cols-2 gap-3 text-center">
              {res.plusValueLatente != null && (
                <div className={`rounded-field p-3.5 ${res.plusValueLatente >= 0 ? "bg-positive-soft" : "bg-danger-soft"}`}>
                  <div className="text-xs text-faint">Création de valeur (valeur − coût total)</div>
                  <div className={`data mt-1 font-semibold ${res.plusValueLatente >= 0 ? "text-positive" : "text-danger"}`}>
                    {res.plusValueLatente >= 0 ? "+" : ""}
                    {euros(res.plusValueLatente)}
                  </div>
                </div>
              )}
              {res.roiApport != null && (
                <div className="rounded-field bg-surface-2 p-3.5">
                  <div className="text-xs text-faint">Rendement de l&apos;apport (cash-on-cash)</div>
                  <div className="data mt-1 font-semibold text-ink">{res.roiApport} % / an</div>
                </div>
              )}
            </div>
          )}
          <button onClick={sauvegarder} className="btn btn-outline py-2">
            {saved ? "✓ Scénario sauvegardé" : "Sauvegarder ce scénario"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">
          Renseigne le prix d&apos;achat et le loyer visé pour calculer rendement et cash-flow.
          Frais de notaire (8 %) calculés automatiquement.
        </p>
      )}
    </section>
  );
}

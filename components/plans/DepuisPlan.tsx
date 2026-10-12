"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";
import { ValidationPlan } from "@/components/ValidationPlan";
import { dictPlans } from "@/lib/i18n/plans";
import type { LigneInjectee, RapportInjection } from "@/lib/estimateur/plan-injection";

/**
 * L'écran « depuis le plan » (C7), partie client : le résumé du bien repris du plan, le code postal s'il
 * manque, l'écran de validation (D1), puis l'envoi. `POST /api/plans/{planId}/estimation` recalcule TOUT
 * depuis la base : ce composant n'envoie que le code postal et le choix de l'estimation. Ensuite, la
 * dernière relecture se fait dans le détaillé : `/projets/{id}/modifier`.
 */
export type ResumeBien = { surface: number; type: string; niveaux: number; pieces: number; sdb: number; wc: number; fenetres: number };

export default function DepuisPlan({
  planId,
  projetId,
  nouvelle,
  lignes,
  bilan,
  manqueCodePostal,
  resume,
}: {
  planId: string;
  /** L'estimation reliée à mettre à jour ; `null` : création. */
  projetId: string | null;
  nouvelle: boolean;
  lignes: LigneInjectee[];
  bilan: RapportInjection["bilan"];
  manqueCodePostal: boolean;
  /** Création seulement : le bien tel que le plan le décrit. */
  resume: ResumeBien | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = dictPlans(locale).estimation;
  const nombre = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 1 });
  const [cp, setCp] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  async function valider() {
    if (occupe) return;
    setCode(null);
    if (manqueCodePostal && !/^\d{5}$/.test(cp)) {
      setCode("code_postal");
      champ.current?.focus();
      return;
    }
    setOccupe(true);
    try {
      const corps = {
        ...(manqueCodePostal ? { codePostal: cp } : {}),
        ...(projetId ? { projetId } : {}),
        ...(nouvelle && !projetId ? { nouvelle: true } : {}),
      };
      const r = await fetch(`/api/plans/${encodeURIComponent(planId)}/estimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const j = (await r.json().catch(() => null)) as { projectId?: unknown; code?: unknown } | null;
      if (r.ok && j && typeof j.projectId === "string") {
        router.push(`/projets/${encodeURIComponent(j.projectId)}/modifier`);
        return;
      }
      setCode(typeof j?.code === "string" ? j.code : "erreur");
      if (j?.code === "code_postal") champ.current?.focus();
    } catch {
      setCode("reseau");
    }
    setOccupe(false);
  }

  const message = code ? (t.erreurs[code] ?? t.erreurs.erreur) : null;

  return (
    <div className="space-y-4">
      {resume && (
        <section className="card p-5 sm:p-6" aria-labelledby="depuis-plan-bien">
          <h2 id="depuis-plan-bien" className="text-[15px] font-semibold text-ink">{t.leBien}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-4">
            {[
              [t.surface, `${nombre.format(resume.surface)} m²`],
              [t.type, t.types[resume.type] ?? resume.type],
              [t.niveaux, nombre.format(resume.niveaux)],
              [t.pieces, nombre.format(resume.pieces)],
              [t.sdb, nombre.format(resume.sdb)],
              [t.wc, nombre.format(resume.wc)],
              [t.fenetres, nombre.format(resume.fenetres)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[12.5px] text-muted">{k}</dt>
                <dd className="num font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] text-muted">{t.leBienNote}</p>
        </section>
      )}

      {manqueCodePostal && (
        <section className="card p-5 sm:p-6">
          <label htmlFor="depuis-plan-cp" className="text-[15px] font-semibold text-ink">{t.codePostal}</label>
          <p id="depuis-plan-cp-aide" className="mt-1 text-[13px] text-muted">{t.codePostalAide}</p>
          <input
            ref={champ}
            id="depuis-plan-cp"
            className="input mt-3 w-40"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            pattern="[0-9]{5}"
            value={cp}
            aria-describedby="depuis-plan-cp-aide"
            aria-invalid={code === "code_postal" || undefined}
            onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
          />
        </section>
      )}

      <ValidationPlan rapport={{ selection: {}, lignes, bilan }} onValider={valider} occupe={occupe} />

      <p role="status" aria-live="polite" className={message ? "text-[14px] font-medium text-danger" : "sr-only"}>
        {message ?? (occupe ? t.envoi : "")}
      </p>
    </div>
  );
}

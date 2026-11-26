"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { choisirTypeCompte } from "@/lib/actions/type-compte";
import type { TypeCompte } from "@/lib/compte/type";
import { Legende, MemeCompte, Req } from "@/components/compte/Communs";

/**
 * « Tu es… * » (26/11/2026) : particulier ou professionnel du bâtiment, une seule fois, obligatoire (pas de « Passer »).
 * Posée juste après l'inscription, et une fois aux comptes d'avant. `suite` : où aller ensuite (sinon la page se recharge
 * et passe à l'étape suivante).
 */
const CARTES: { v: TypeCompte; ic: string; t: string; d: string }[] = [
  { v: "particulier", ic: "🏠", t: "Particulier", d: "Propriétaire, futur acheteur ou investisseur : tu prépares tes propres travaux, avec tous les outils d'AVYORA." },
  { v: "pro", ic: "🛠️", t: "Professionnel du bâtiment", d: "Artisan, entreprise du bâtiment, maître d'œuvre : tu utilises AVYORA comme un particulier, et tu peux en plus rejoindre le Réseau AVYORA." },
];

export default function ChoixTypeCompte({ suite, titre = true }: { suite?: string; titre?: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [choix, setChoix] = useState<TypeCompte | null>(null);
  const [erreur, setErreur] = useState("");
  const continuer = () =>
    demarrer(async () => {
      if (!choix) return;
      setErreur("");
      const r = await choisirTypeCompte(choix).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      if (!r.ok) { setErreur(r.erreur ?? "Réessaie dans un instant."); return; }
      if (suite) router.push(suite);
      router.refresh();
    });
  return (
    <div className="space-y-4">
      {titre && (
        <div>
          <p className="eyebrow">Bienvenue</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink" id="tu-es">Tu es… <Req /></h1>
          <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">Pour savoir si tu peux rejoindre le Réseau AVYORA, réservé aux professionnels du bâtiment.</p>
        </div>
      )}
      <MemeCompte />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-labelledby={titre ? "tu-es" : undefined} aria-label={titre ? undefined : "Tu es…"} aria-required="true">
        {CARTES.map((c) => (
          <button
            key={c.v}
            type="button"
            role="radio"
            aria-checked={choix === c.v}
            onClick={() => setChoix(c.v)}
            className={"grid gap-1.5 rounded-2xl border-[1.5px] p-4 text-left transition-colors " + (choix === c.v ? "border-brand-600 bg-[#fbfbff] shadow-[0_10px_26px_-16px_rgba(79,70,229,.6)]" : "border-line-strong bg-surface hover:border-brand-200")}
          >
            <span aria-hidden="true" className="text-[24px]">{c.ic}</span>
            <span className="text-[16px] font-semibold text-ink">{c.t}</span>
            <span className="text-[13px] leading-snug text-muted">{c.d}</span>
          </button>
        ))}
      </div>
      {!choix && <p className="text-[12.5px] text-faint">Choisis l&apos;un des deux pour continuer. Tu pourras passer en compte pro plus tard, avec ton SIRET.</p>}
      <button type="button" disabled={!choix || enCours} onClick={continuer} className="btn btn-primary min-h-11 px-6 disabled:opacity-45">
        {enCours ? "…" : "Continuer"}
      </button>
      <Legende />
      {erreur && <p role="alert" className="text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

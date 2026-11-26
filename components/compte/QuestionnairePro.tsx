"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerPro } from "@/lib/actions/type-compte";
import type { ErreursPro } from "@/lib/compte/type";
import { METIERS } from "@/lib/reseau/metiers";
import { CHAMP, Fac, Legende, MemeCompte, OptionsRegions, Req } from "@/components/compte/Communs";

/**
 * Le questionnaire du professionnel (26/11/2026) : société, prénom et nom, portable, métier principal, région
 * (obligatoires) ; SIRET facultatif, vérifié s'il est donné. Ces réponses préremplissent sa candidature au réseau.
 */
export default function QuestionnairePro({ nomInitial = "", telephoneInitial = "" }: { nomInitial?: string; telephoneInitial?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [v, setV] = useState({ societe: "", nom: nomInitial, telephone: telephoneInitial, metier: "", region: "", siret: "" });
  const [erreurs, setErreurs] = useState<ErreursPro>({});
  const [global, setGlobal] = useState("");
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobal("");
    demarrer(async () => {
      const r = await enregistrerPro(v).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) { router.push("/onboarding/reseau"); router.refresh(); return; }
      setErreurs(("erreurs" in r && r.erreurs) || {});
      if ("erreur" in r && r.erreur) setGlobal(r.erreur);
    });
  };
  const champ = (k: keyof ErreursPro, label: string, req: boolean, input: React.ReactNode, aide?: string) => (
    <div>
      <label htmlFor={`pr-${k}`} className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">{label} {req ? <Req /> : <Fac />}</label>
      <div className="mt-1.5">{input}</div>
      {aide && <p className="mt-1 text-[12.5px] text-faint">{aide}</p>}
      {erreurs[k] && <p id={`pr-${k}-err`} role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs[k]}</p>}
    </div>
  );
  const attrs = (k: keyof ErreursPro, req = true) => ({
    id: `pr-${k}`, "aria-required": req || undefined, "aria-invalid": erreurs[k] ? true : undefined, "aria-describedby": erreurs[k] ? `pr-${k}-err` : undefined,
  });

  return (
    <form className="space-y-5" noValidate onSubmit={envoyer}>
      <div>
        <p className="eyebrow">Bienvenue · professionnel</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Ton activité</h1>
        <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">Ces infos préparent ta place dans le Réseau AVYORA : tu n&apos;auras pas à les retaper.</p>
      </div>
      <MemeCompte pro />
      <div className="space-y-5 rounded-3xl border border-line bg-surface p-5">
        {champ("societe", "Le nom de ta société", true, <input {...attrs("societe")} autoComplete="organization" maxLength={120} value={v.societe} onChange={maj("societe")} className={CHAMP} />)}
        {champ("nom", "Ton prénom et ton nom", true, <input {...attrs("nom")} autoComplete="name" maxLength={120} value={v.nom} onChange={maj("nom")} className={CHAMP} />)}
        {champ("telephone", "Ton portable", true, <input {...attrs("telephone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={v.telephone} onChange={maj("telephone")} className={CHAMP} />,
          "Pour que Daniel t'appelle avant de te faire entrer dans le réseau. Jamais revendu.")}
        {champ("metier", "Ton métier principal", true,
          <select {...attrs("metier")} value={v.metier} onChange={maj("metier")} className={CHAMP}>
            <option value="">Choisis ton métier</option>
            {METIERS.map((m) => <option key={m.cle} value={m.cle}>{m.label}</option>)}
          </select>, "Les autres métiers se cochent dans ta candidature.")}
        {champ("region", "Ta région", true,
          <select {...attrs("region")} value={v.region} onChange={maj("region")} className={CHAMP}>
            <option value="">Choisis ta région</option>
            <OptionsRegions />
          </select>, "Tu choisiras tes départements exacts dans ta candidature au réseau.")}
        {champ("siret", "Ton SIRET", false, <input {...attrs("siret", false)} inputMode="numeric" placeholder="123 456 789 00012" maxLength={20} value={v.siret} onChange={maj("siret")} className={CHAMP} />,
          "Vérifié auprès du répertoire officiel des entreprises. Obligatoire pour rejoindre le réseau, pas pour utiliser AVYORA.")}
        <div className="border-t border-line pt-4">
          <button type="submit" disabled={enCours} className="btn btn-primary min-h-11 px-6">{enCours ? "Vérification…" : "Continuer"}</button>
        </div>
        <Legende />
        {global && <p role="alert" className="text-[13px] text-[#b42318]">{global}</p>}
      </div>
    </form>
  );
}

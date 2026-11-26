"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerParticulier } from "@/lib/actions/type-compte";
import type { ErreursParticulier } from "@/lib/compte/type";
import { FEATURES } from "@/lib/features";
import { CHAMP, Fac, Legende, OptionsRegions, Req } from "@/components/compte/Communs";

/**
 * Le questionnaire du particulier (26/11/2026) : seul le prénom est obligatoire ; portable, profil, projet, avancement,
 * région et canal sont facultatifs (« Passer les questions facultatives » garde le prénom). Le portable vide ne bloque
 * plus rien ; un portable illisible est signalé.
 */
const PROFILS = [["residence", "Résidence principale"], ["locatif", "Investisseur locatif"], ["revente", "Achat-revente"]] as const;
const PROJETS = [["reno", "Rénovation"], ["neuf", "Construction neuve"], ["nsp", "Je ne sais pas encore"]] as const;
const MATURITES: [string, string, boolean?][] = [
  ["renseigne", "Je me renseigne"], ["bien_en_vue", "J'ai un bien en vue"], ["terrain_en_vue", "J'ai un terrain en vue", true],
  ["terrain", "J'ai mon terrain", true], ["permis", "Permis déposé ou obtenu", true], ["proprietaire", "Déjà propriétaire"], ["travaux", "Travaux en cours"],
];
const CANAUX = ["Google", "Réseaux sociaux", "Bouche-à-oreille", "Autre"];

function Pastilles({ id, opts, sel, set, multi = false }: { id: string; opts: readonly (readonly [string, string])[]; sel: string[]; set: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
      {opts.map(([v, l]) => {
        const on = sel.includes(v);
        return (
          <button key={v} type="button" aria-pressed={on} onClick={() => set(on ? sel.filter((x) => x !== v) : multi ? [...sel, v] : [v])}
            className={"rounded-full border px-3.5 py-2 text-[13.5px] transition-colors " + (on ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line-strong bg-surface text-ink hover:border-brand-200")}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export default function QuestionnaireParticulier({ prenomInitial = "", suite = "/projets" }: { prenomInitial?: string; suite?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [prenom, setPrenom] = useState(prenomInitial);
  const [telephone, setTelephone] = useState("");
  const [objectif, setObjectif] = useState<string[]>([]);
  const [projet, setProjet] = useState<string[]>([]);
  const [maturite, setMaturite] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [canal, setCanal] = useState<string[]>([]);
  const [erreurs, setErreurs] = useState<ErreursParticulier>({});
  const [global, setGlobal] = useState("");
  const maturites = MATURITES.filter(([, , neuf]) => !neuf || FEATURES.neuf).map(([v, l]) => [v, l] as const);

  const envoyer = (seulementPrenom: boolean) =>
    demarrer(async () => {
      setGlobal("");
      const donnees = seulementPrenom ? { prenom } : { prenom, telephone, objectif: objectif[0] ?? "", projet: projet[0] ?? "", maturite, region, canal: canal[0] ?? "" };
      const r = await enregistrerParticulier(donnees).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) { router.push(suite); router.refresh(); return; }
      setErreurs(("erreurs" in r && r.erreurs) || {});
      if ("erreur" in r && r.erreur) setGlobal(r.erreur);
    });
  const err = (k: keyof ErreursParticulier, id: string) => erreurs[k] && <p id={id} role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs[k]}</p>;

  return (
    <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); envoyer(false); }}>
      <div>
        <p className="eyebrow">Bienvenue · particulier</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Fais-nous mieux te connaître</h1>
        <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">Quelques questions en un tap pour adapter AVYORA à ton projet. Seul ton prénom est obligatoire.</p>
      </div>
      <div className="space-y-5 rounded-3xl border border-line bg-surface p-5">
        <div>
          <label htmlFor="pa-prenom" className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ton prénom <Req /></label>
          <input id="pa-prenom" autoComplete="given-name" required aria-required="true" maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} className={CHAMP + " mt-1.5"}
            aria-invalid={erreurs.prenom ? true : undefined} aria-describedby={erreurs.prenom ? "pa-prenom-err" : undefined} />
          {err("prenom", "pa-prenom-err")}
        </div>
        <div>
          <label htmlFor="pa-tel" className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ton portable <Fac /></label>
          <input id="pa-tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={CHAMP + " mt-1.5"}
            aria-describedby={"pa-tel-aide" + (erreurs.telephone ? " pa-tel-err" : "")} aria-invalid={erreurs.telephone ? true : undefined} />
          <p id="pa-tel-aide" className="mt-1 text-[12.5px] text-faint">Pour te rappeler au sujet de ton projet, en appel ou sur WhatsApp. Jamais revendu, pas de démarchage.</p>
          {err("telephone", "pa-tel-err")}
        </div>
        <div><p id="pa-profil" className="mb-2 flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ton profil <Fac /></p><Pastilles id="pa-profil" opts={PROFILS} sel={objectif} set={setObjectif} /></div>
        <div><p id="pa-projet" className="mb-2 flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ton projet <Fac /></p><Pastilles id="pa-projet" opts={PROJETS} sel={projet} set={setProjet} /></div>
        <div><p id="pa-mat" className="mb-2 flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Où en es-tu ? <Fac /></p><Pastilles id="pa-mat" opts={maturites} sel={maturite} set={setMaturite} multi /></div>
        <div>
          <label htmlFor="pa-region" className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ta région <Fac /></label>
          <select id="pa-region" value={region} onChange={(e) => setRegion(e.target.value)} className={CHAMP + " mt-1.5"}>
            <option value="">Choisis ta région</option>
            <OptionsRegions />
          </select>
          {err("region", "pa-region-err")}
        </div>
        <div><p id="pa-canal" className="mb-2 flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Comment nous as-tu connus ? <Fac /></p><Pastilles id="pa-canal" opts={CANAUX.map((c) => [c, c] as const)} sel={canal} set={setCanal} /></div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button type="submit" disabled={enCours} className="btn btn-primary min-h-11 px-6">{enCours ? "…" : "Continuer"}</button>
          <button type="button" disabled={enCours} onClick={() => envoyer(true)} className="text-[14px] font-semibold text-muted underline">Passer les questions facultatives</button>
        </div>
        <Legende />
        {global && <p role="alert" className="text-[13px] text-[#b42318]">{global}</p>}
      </div>
      <p className="text-center text-[12px] text-faint">🔒 Ces infos servent à améliorer le service, jamais revendues.</p>
    </form>
  );
}

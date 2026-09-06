"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerProfil, sauterOnboarding, type ProfilData } from "@/lib/actions/profil";

const TUES = [
  { v: "particulier", l: "🏠 Particulier" },
  { v: "investisseur", l: "📈 Investisseur locatif" },
  { v: "pro", l: "🛠️ Professionnel" },
];
const OBJECTIF = [
  { v: "residence", l: "Résidence principale" },
  { v: "locatif", l: "Investissement locatif" },
  { v: "revente", l: "Achat-revente" },
  { v: "client", l: "Pour un client" },
];
const MATURITE = [
  { v: "renseigne", l: "Je me renseigne" },
  { v: "bien_en_vue", l: "J'ai un bien en vue" },
  { v: "proprietaire", l: "Déjà propriétaire" },
  { v: "travaux", l: "Travaux en cours" },
];
const REGIONS = ["Île-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "PACA", "Hauts-de-France", "Grand Est", "Pays de la Loire", "Bretagne", "Normandie", "Bourgogne-Franche-Comté", "Centre-Val de Loire", "Corse", "Outre-mer"];
const AGES = ["–30 ans", "30–45", "45–60", "+60"];
const CANAUX = ["Google", "Réseaux sociaux", "Bouche-à-oreille", "Autre"];

const CSS = `
.av-onb .eyebrow{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--color-violet,#7c3aed);font-weight:600}
.av-onb h1{font-size:21px;font-weight:600;letter-spacing:-.01em;margin:6px 0 2px;color:var(--color-ink)}
.av-onb .sub{font-size:13px;color:var(--color-muted);margin:0}
.av-onb .q{margin-top:20px}
.av-onb .q .lab{font-size:13.5px;font-weight:600;color:var(--color-ink);margin-bottom:9px}
.av-onb .q .lab .multi{font-size:11px;font-weight:500;color:var(--color-faint);margin-left:6px}
.av-onb .pills{display:flex;flex-wrap:wrap;gap:8px}
.av-onb .pill{font-family:inherit;font-size:13px;font-weight:500;color:var(--color-muted);background:var(--color-surface-2);border:1.5px solid var(--color-line);border-radius:11px;padding:9px 13px;cursor:pointer;transition:.12s}
.av-onb .pill:hover{border-color:var(--color-line-strong)}
.av-onb .pill.on{background:var(--color-brand-50);border-color:var(--color-brand-600);color:var(--color-brand-600);font-weight:600}
.av-onb .acts{display:flex;align-items:center;justify-content:space-between;margin-top:26px;padding-top:18px;border-top:1px solid var(--color-line)}
.av-onb .note{font-size:11px;color:var(--color-faint);margin-top:14px;text-align:center}
`;

function Multi({ opts, sel, set }: { opts: { v: string; l: string }[]; sel: string[]; set: (v: string[]) => void }) {
  return (
    <div className="pills">
      {opts.map((o) => {
        const on = sel.includes(o.v);
        return (
          <button key={o.v} type="button" className={"pill" + (on ? " on" : "")} onClick={() => set(on ? sel.filter((x) => x !== o.v) : [...sel, o.v])}>{o.l}</button>
        );
      })}
    </div>
  );
}

function Single({ opts, sel, set }: { opts: string[]; sel: string; set: (v: string) => void }) {
  return (
    <div className="pills">
      {opts.map((o) => (
        <button key={o} type="button" className={"pill" + (sel === o ? " on" : "")} onClick={() => set(sel === o ? "" : o)}>{o}</button>
      ))}
    </div>
  );
}

export default function OnboardingForm() {
  const router = useRouter();
  const [tuEs, setTuEs] = useState<string[]>([]);
  const [objectif, setObjectif] = useState("");
  const [maturite, setMaturite] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [age, setAge] = useState("");
  const [canal, setCanal] = useState("");
  const [busy, setBusy] = useState(false);

  async function continuer() {
    if (busy) return;
    setBusy(true);
    const data: ProfilData = { tuEs, objectif, maturite, region, age, canal };
    try { await enregistrerProfil(data); } catch { /* best-effort */ }
    router.push("/projets");
  }
  async function passer() {
    if (busy) return;
    setBusy(true);
    try { await sauterOnboarding(); } catch { /* noop */ }
    router.push("/projets");
  }

  return (
    <div className="av-onb card mx-auto max-w-xl p-6 sm:p-7">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="eyebrow">● Bienvenue · 30 secondes</div>
      <h1>Fais-nous mieux te connaître 👋</h1>
      <p className="sub">Pour adapter AVYORA à ton projet. Tout est optionnel, un simple tap suffit.</p>

      <div className="q"><div className="lab">Tu es… <span className="multi">plusieurs choix possibles</span></div><Multi opts={TUES} sel={tuEs} set={setTuEs} /></div>
      <div className="q"><div className="lab">Ton objectif avec ce projet</div><Single opts={OBJECTIF.map((o) => o.l)} sel={OBJECTIF.find((o) => o.v === objectif)?.l ?? ""} set={(l) => setObjectif(OBJECTIF.find((o) => o.l === l)?.v ?? "")} /></div>
      <div className="q"><div className="lab">Où en es-tu ? <span className="multi">plusieurs choix possibles</span></div><Multi opts={MATURITE} sel={maturite} set={setMaturite} /></div>
      <div className="q"><div className="lab">Ta région</div><Single opts={REGIONS} sel={region} set={setRegion} /></div>
      <div className="q"><div className="lab">Ton âge</div><Single opts={AGES} sel={age} set={setAge} /></div>
      <div className="q"><div className="lab">Comment nous as-tu connus ?</div><Single opts={CANAUX} sel={canal} set={setCanal} /></div>

      <div className="acts">
        <button type="button" onClick={passer} disabled={busy} className="text-sm text-faint hover:text-muted">Passer</button>
        <button type="button" onClick={continuer} disabled={busy} className="btn btn-primary py-2.5">{busy ? "…" : "Continuer →"}</button>
      </div>
      <p className="note">🔒 Ces infos servent à améliorer le service — jamais revendues.</p>
    </div>
  );
}

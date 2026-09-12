"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";
import { enregistrerProfil, sauterOnboarding, type ProfilData } from "@/lib/actions/profil";

// Régions françaises : noms propres conservés tels quels (identiques FR/EN) et utilisés
// aussi comme valeur enregistrée. On ne traduit que le libellé de la question « Ta région ».
const REGIONS = ["Île-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "PACA", "Hauts-de-France", "Grand Est", "Pays de la Loire", "Bretagne", "Normandie", "Bourgogne-Franche-Comté", "Centre-Val de Loire", "Corse", "Outre-mer"];

// Traductions co-localisées. IMPORTANT : les `v` (valeurs enregistrées dans le profil) ne changent
// jamais ; seuls les `l` (libellés affichés) sont traduits. Pour l'âge et le canal, la valeur
// enregistrée reste la chaîne française (v), affichée via son libellé traduit.
const TR = {
  fr: {
    tues: [
      { v: "particulier", l: "🏠 Particulier" },
      { v: "investisseur", l: "📈 Investisseur locatif" },
      { v: "pro", l: "🛠️ Professionnel" },
    ],
    objectif: [
      { v: "residence", l: "Résidence principale" },
      { v: "locatif", l: "Investissement locatif" },
      { v: "revente", l: "Achat-revente" },
      { v: "client", l: "Pour un client" },
    ],
    maturite: [
      { v: "renseigne", l: "Je me renseigne" },
      { v: "bien_en_vue", l: "J'ai un bien en vue" },
      { v: "proprietaire", l: "Déjà propriétaire" },
      { v: "travaux", l: "Travaux en cours" },
    ],
    ages: [
      { v: "–30 ans", l: "–30 ans" },
      { v: "30–45", l: "30–45" },
      { v: "45–60", l: "45–60" },
      { v: "+60", l: "+60" },
    ],
    canaux: [
      { v: "Google", l: "Google" },
      { v: "Réseaux sociaux", l: "Réseaux sociaux" },
      { v: "Bouche-à-oreille", l: "Bouche-à-oreille" },
      { v: "Autre", l: "Autre" },
    ],
    compteEyebrow: "● Mon profil",
    compteTitle: "Ton profil AVYORA",
    compteSub: "Ces infos nous aident à adapter le service. Complète ou modifie-les quand tu veux.",
    onbEyebrow: "● Bienvenue · 30 secondes",
    onbTitle: "Fais-nous mieux te connaître 👋",
    onbSub: "Pour adapter AVYORA à ton projet. Tout est optionnel, un simple tap suffit.",
    multi: "plusieurs choix possibles",
    qTuEs: "Tu es…",
    qObjectif: "Ton objectif avec ce projet",
    qMaturite: "Où en es-tu ?",
    qRegion: "Ta région",
    qAge: "Ton âge",
    qCanal: "Comment nous as-tu connus ?",
    saved: "✓ Enregistré",
    skip: "Passer",
    save: "Enregistrer",
    continue: "Continuer →",
    note: "🔒 Ces infos servent à améliorer le service — jamais revendues.",
  },
  en: {
    tues: [
      { v: "particulier", l: "🏠 Individual" },
      { v: "investisseur", l: "📈 Rental investor" },
      { v: "pro", l: "🛠️ Professional" },
    ],
    objectif: [
      { v: "residence", l: "Primary residence" },
      { v: "locatif", l: "Rental investment" },
      { v: "revente", l: "Buy-to-resell" },
      { v: "client", l: "For a client" },
    ],
    maturite: [
      { v: "renseigne", l: "Just researching" },
      { v: "bien_en_vue", l: "I have a property in mind" },
      { v: "proprietaire", l: "Already an owner" },
      { v: "travaux", l: "Renovation underway" },
    ],
    ages: [
      { v: "–30 ans", l: "Under 30" },
      { v: "30–45", l: "30–45" },
      { v: "45–60", l: "45–60" },
      { v: "+60", l: "60+" },
    ],
    canaux: [
      { v: "Google", l: "Google" },
      { v: "Réseaux sociaux", l: "Social media" },
      { v: "Bouche-à-oreille", l: "Word of mouth" },
      { v: "Autre", l: "Other" },
    ],
    compteEyebrow: "● My profile",
    compteTitle: "Your AVYORA profile",
    compteSub: "This info helps us tailor the service. Complete or edit it whenever you want.",
    onbEyebrow: "● Welcome · 30 seconds",
    onbTitle: "Help us get to know you 👋",
    onbSub: "To tailor AVYORA to your project. Everything is optional — a single tap is enough.",
    multi: "multiple choices allowed",
    qTuEs: "You are…",
    qObjectif: "Your goal with this project",
    qMaturite: "Where are you in the process?",
    qRegion: "Your region",
    qAge: "Your age",
    qCanal: "How did you hear about us?",
    saved: "✓ Saved",
    skip: "Skip",
    save: "Save",
    continue: "Continue →",
    note: "🔒 This info is used to improve the service — never sold.",
  },
} as const;

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

function Multi({ opts, sel, set }: { opts: readonly { v: string; l: string }[]; sel: string[]; set: (v: string[]) => void }) {
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

/**
 * Questionnaire de profil. Deux contextes :
 *  - "onboarding" (défaut) : après inscription — bouton « Passer », redirige vers /projets à la validation.
 *  - "compte" : réutilisable depuis Mon compte — pré-rempli, reste sur place et confirme l'enregistrement.
 */
export default function OnboardingForm({ initial, contexte = "onboarding" }: { initial?: Partial<ProfilData>; contexte?: "onboarding" | "compte" }) {
  const router = useRouter();
  const locale = useLocale();
  const s = TR[locale];
  const compte = contexte === "compte";
  const [tuEs, setTuEs] = useState<string[]>(initial?.tuEs ?? []);
  const [objectif, setObjectif] = useState(initial?.objectif ?? "");
  const [maturite, setMaturite] = useState<string[]>(initial?.maturite ?? []);
  const [region, setRegion] = useState(initial?.region ?? "");
  const [age, setAge] = useState(initial?.age ?? "");
  const [canal, setCanal] = useState(initial?.canal ?? "");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  // Reset la confirmation dès qu'on modifie une réponse (mode compte).
  function wrap<T>(s: (v: T) => void) { return (v: T) => { if (ok) setOk(false); s(v); }; }

  async function continuer() {
    if (busy) return;
    setBusy(true); setOk(false);
    const data: ProfilData = { tuEs, objectif, maturite, region, age, canal };
    try { await enregistrerProfil(data); } catch { /* best-effort */ }
    if (compte) { setBusy(false); setOk(true); return; } // reste sur Mon compte
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
      {compte ? (
        <>
          <div className="eyebrow">{s.compteEyebrow}</div>
          <h1>{s.compteTitle}</h1>
          <p className="sub">{s.compteSub}</p>
        </>
      ) : (
        <>
          <div className="eyebrow">{s.onbEyebrow}</div>
          <h1>{s.onbTitle}</h1>
          <p className="sub">{s.onbSub}</p>
        </>
      )}

      <div className="q"><div className="lab">{s.qTuEs} <span className="multi">{s.multi}</span></div><Multi opts={s.tues} sel={tuEs} set={wrap(setTuEs)} /></div>
      <div className="q"><div className="lab">{s.qObjectif}</div><Single opts={s.objectif.map((o) => o.l)} sel={s.objectif.find((o) => o.v === objectif)?.l ?? ""} set={(l) => wrap(setObjectif)(s.objectif.find((o) => o.l === l)?.v ?? "")} /></div>
      <div className="q"><div className="lab">{s.qMaturite} <span className="multi">{s.multi}</span></div><Multi opts={s.maturite} sel={maturite} set={wrap(setMaturite)} /></div>
      <div className="q"><div className="lab">{s.qRegion}</div><Single opts={REGIONS} sel={region} set={wrap(setRegion)} /></div>
      <div className="q"><div className="lab">{s.qAge}</div><Single opts={s.ages.map((o) => o.l)} sel={s.ages.find((o) => o.v === age)?.l ?? ""} set={(l) => wrap(setAge)(s.ages.find((o) => o.l === l)?.v ?? "")} /></div>
      <div className="q"><div className="lab">{s.qCanal}</div><Single opts={s.canaux.map((o) => o.l)} sel={s.canaux.find((o) => o.v === canal)?.l ?? ""} set={(l) => wrap(setCanal)(s.canaux.find((o) => o.l === l)?.v ?? "")} /></div>

      <div className="acts">
        {compte ? (
          <span className="text-sm font-medium" style={{ color: "#0f9d6b", opacity: ok ? 1 : 0, transition: ".2s" }}>{s.saved}</span>
        ) : (
          <button type="button" onClick={passer} disabled={busy} className="text-sm text-faint hover:text-muted">{s.skip}</button>
        )}
        <button type="button" onClick={continuer} disabled={busy} className="btn btn-primary py-2.5">{busy ? "…" : compte ? s.save : s.continue}</button>
      </div>
      <p className="note">{s.note}</p>
    </div>
  );
}

import { REGIONS_FRANCE, REGIONS_OUTRE_MER } from "@/lib/compte/type";

/** L'astérisque des champs obligatoires (lu « obligatoire » par les lecteurs d'écran). */
export function Req() {
  return (
    <>
      <span aria-hidden="true" className="font-bold text-[#b42318]">*</span>
      <span className="sr-only"> (obligatoire)</span>
    </>
  );
}
export function Fac() {
  return <span className="text-[12px] font-medium text-faint">facultatif</span>;
}
export function Legende() {
  return (
    <p className="text-[12.5px] text-muted">
      Les champs marqués d&apos;un <span className="font-bold text-[#b42318]">*</span> sont obligatoires.
    </p>
  );
}

/** « Un seul AVYORA » : particulier ou pro, les mêmes outils ; être pro ajoute seulement le Réseau AVYORA. */
export function MemeCompte({ pro = false }: { pro?: boolean }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5">
      <p className="text-[14.5px] font-semibold text-brand-900">{pro ? "Ton compte AVYORA est complet, comme celui d'un particulier" : "Un seul AVYORA pour tout le monde"}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
        {pro
          ? "Estimer, dessiner des plans, suivre un chantier, AVYORA Pro : tu as accès à tout. Être pro ajoute seulement une possibilité : rejoindre le Réseau AVYORA pour proposer tes services aux clients."
          : "Particulier ou pro, ce sont les mêmes outils : estimer, dessiner des plans, suivre un chantier, AVYORA Pro. Être pro ajoute seulement la possibilité de rejoindre le Réseau AVYORA pour proposer ses services."}
      </p>
    </div>
  );
}

/** Toutes les régions de France (ordre alphabétique), l'outre-mer groupé tout en bas. */
export function OptionsRegions() {
  return (
    <>
      {REGIONS_FRANCE.map((r) => <option key={r} value={r}>{r}</option>)}
      <optgroup label="Outre-mer">
        {REGIONS_OUTRE_MER.map((r) => <option key={r} value={r}>{r}</option>)}
      </optgroup>
    </>
  );
}

export const CHAMP = "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brand-600";

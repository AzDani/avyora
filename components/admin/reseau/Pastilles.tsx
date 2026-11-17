import { LIBELLES_STATUT, joursAvantFinDecennale, type StatutArtisan } from "@/lib/reseau/artisan";
import type { VerifSiret } from "@/lib/reseau/siret";

/** Les pastilles d'état de l'admin du Réseau AVYORA : statut de la candidature, SIRET, décennale. Couleurs AA sur blanc. */
const TON: Record<StatutArtisan, string> = {
  en_attente: "bg-brand-600 text-white",
  a_completer: "bg-[#fff4dc] text-[#8a5300]",
  valide: "bg-[#e3f5ed] text-[#0b5e40]",
  refuse: "bg-surface-2 text-muted border border-line",
  suspendu: "bg-[#fdf0ef] text-[#8a1f15]",
};

export function PastilleStatut({ statut }: { statut: StatutArtisan }) {
  return <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + TON[statut]}>{LIBELLES_STATUT[statut]}</span>;
}

export function PastilleSiret({ v }: { v: VerifSiret | null }) {
  const s = v?.statut ?? "indisponible";
  const [cls, txt] =
    s === "actif" ? ["bg-[#e3f5ed] text-[#0b5e40]", v?.batiment === false ? "SIRET actif · hors bâtiment" : "SIRET actif"]
    : s === "ferme" ? ["bg-[#fdf0ef] text-[#8a1f15]", "SIRET fermé"]
    : s === "introuvable" ? ["bg-[#fff4dc] text-[#8a5300]", "SIRET introuvable"]
    : ["bg-surface-2 text-muted border border-line", "SIRET non vérifié"];
  return <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + cls}>{txt}</span>;
}

/** La décennale : expirée (rouge), finit dans moins de 30 jours (ambre), sinon la date. */
export function PastilleDecennale({ fin, aujourdhui }: { fin: string; aujourdhui: string }) {
  const j = joursAvantFinDecennale(fin, aujourdhui);
  const date = new Date(`${fin}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (j < 0) return <span className="inline-flex rounded-full bg-[#fdf0ef] px-2.5 py-0.5 text-[12px] font-semibold text-[#8a1f15]">Décennale expirée le {date}</span>;
  if (j <= 30) return <span className="inline-flex rounded-full bg-[#fff4dc] px-2.5 py-0.5 text-[12px] font-semibold text-[#8a5300]">Décennale : fin le {date}</span>;
  return <span className="num text-[12.5px] text-muted">Décennale jusqu&apos;au {date}</span>;
}

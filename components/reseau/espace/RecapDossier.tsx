import { afficherPortable } from "@/lib/telephone";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import type { Artisan } from "@/lib/reseau/artisan";

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

/** Le dossier de l'artisan tel que Daniel l'a vérifié : entreprise, SIRET, métiers, zone, décennale, portable. */
export function Recap({ a }: { a: Artisan }) {
  const lignes: [string, string][] = [
    ["Entreprise", `${a.raisonSociale}${a.nomCommercial ? ` (${a.nomCommercial})` : ""}`],
    ["SIRET", a.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")],
    ["Métiers", a.metiers.map(labelMetier).join(", ")],
    ["Zone", resumeDepartements(a.departements, 6)],
    ["Décennale", `${a.decennaleAssureur}, valable jusqu'au ${dateLongue(a.decennaleFin)}`],
    ["Portable", afficherPortable(a.telephone)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {lignes.map(([k, val]) => (
        <div key={k}>
          <dt className="text-[12px] text-faint">{k}</dt>
          <dd className="mt-0.5 text-[14px] text-ink">{val}</dd>
        </div>
      ))}
    </dl>
  );
}

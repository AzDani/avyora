import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import { BoutonsCharge, FormulaireCharge } from "@/components/admin/gestion/Formulaires";
import { entreesStripe, listCharges } from "@/lib/data/gestion";
import { montant, parMois, totalMensuel, totalTexte, type Charge, type Encaissements } from "@/lib/admin/gestion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compta · Admin" };

/**
 * La comptabilité de l'admin (27/11/2026) : ce que Stripe a encaissé (lecture seule) et les charges fixes saisies par
 * Daniel. Le résultat n'est calculé qu'en euros : une charge en dollars s'affiche à part, sans taux de change inventé.
 */
export default async function AdminCompta() {
  const [charges, entrees] = await Promise.all([listCharges().catch(() => null), entreesStripe().catch(() => null)]);
  const total = charges ? totalMensuel(charges) : {};
  const resultat = entrees && charges ? entrees.mois.net - (total.EUR ?? 0) : null;

  return (
    <>
      <EnTeteAdmin titre="Compta" texte="Ce qui entre (Stripe), ce qui sort (tes charges fixes) et ce qu'il reste ce mois-ci. Les montants des charges viennent de toi." />

      <section aria-label="Ce mois-ci" className="mb-6 grid gap-3 sm:grid-cols-3">
        <Tuile titre="Entrées du mois (net)" valeur={entrees ? montant(entrees.mois.net) : "—"} detail={entrees ? detailEntrees(entrees.mois) : "Stripe ne répond pas pour l'instant"} />
        <Tuile titre="Charges fixes par mois" valeur={charges ? totalTexte(total) : "—"} detail={charges ? `${charges.filter((c) => c.actif).length} charge(s) active(s)` : "Migration 0016 à appliquer"} />
        <Tuile titre="Résultat du mois" valeur={resultat == null ? "—" : montant(resultat)} detail={total.USD ? `En euros, hors ${montant(total.USD, "USD")} de charges en dollars` : "Entrées nettes moins charges en euros"} ton={resultat == null ? undefined : resultat >= 0 ? "bon" : "critique"} />
      </section>
      {entrees && <p className="mb-6 text-[13px] text-muted">Le mois dernier : {montant(entrees.precedent.net)} net ({detailEntrees(entrees.precedent)}).</p>}

      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-faint">Charges fixes</h2>
      {charges === null ? (
        <p className="mb-4 rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">La table des charges n'existe pas encore : applique la migration 0016 dans Supabase.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {charges.length === 0 && <li className="p-4 text-[14px] text-muted">Aucune charge saisie. Ajoute la première ci-dessous.</li>}
          {charges.map((c) => <LigneCharge key={c.id} c={c} />)}
        </ul>
      )}
      {charges !== null && <FormulaireCharge />}
    </>
  );
}

function detailEntrees(e: Encaissements): string {
  return `${e.nb} paiement${e.nb > 1 ? "s" : ""} · ${montant(e.brut)} encaissés · ${montant(e.frais)} de frais Stripe${e.rembourse ? ` · ${montant(e.rembourse)} remboursés` : ""}`;
}

function LigneCharge({ c }: { c: Charge }) {
  return (
    <li className={"flex flex-wrap items-center gap-3 px-4 py-3 " + (c.actif ? "" : "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold text-ink">{c.nom}{!c.actif && <span className="ml-2 text-[12px] font-medium text-faint">en pause</span>}</p>
        <p className="text-[12.5px] text-muted">
          {montant(c.montantCentimes, c.devise)} par {c.frequence}
          {c.frequence === "an" && ` · soit ${montant(parMois(c), c.devise)} par mois`}
          {c.echeance && ` · échéance le ${new Date(`${c.echeance}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
        </p>
      </div>
      <BoutonsCharge id={c.id} actif={c.actif} />
    </li>
  );
}

function Tuile({ titre, valeur, detail, ton }: { titre: string; valeur: string; detail: string; ton?: "bon" | "critique" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[12.5px] font-semibold text-muted">{titre}</p>
      <p className={"num mt-1 text-[24px] font-semibold " + (ton === "bon" ? "text-[#0b7a53]" : ton === "critique" ? "text-[#b42318]" : "text-ink")}>{valeur}</p>
      <p className="mt-1 text-[12.5px] text-muted">{detail}</p>
    </div>
  );
}

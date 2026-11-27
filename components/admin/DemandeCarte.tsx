import Link from "next/link";
import ContactRapide from "@/components/admin/ContactRapide";
import BoutonTraitee from "@/components/admin/BoutonTraitee";
import { dateCourte, messageWhatsApp, type DemandeAccompagnement } from "@/lib/admin/outils";

/**
 * Une demande de rappel (page Accompagnement) : qui, quoi, les gestes pour la joindre, et « Marquer traitée ».
 * Si l'e-mail n'est pas parti chez Daniel, la carte le dit en rouge : l'admin est alors le seul endroit où la trouver.
 */
export default function DemandeCarte({ d, compacte = false }: { d: DemandeAccompagnement; compacte?: boolean }) {
  const traitee = !!d.traiteeLe;
  return (
    <article
      data-demande={d.id}
      className={"rounded-2xl border bg-surface p-4 " + (d.emailRecu ? "border-line" : "border-[#f1b8b2]")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">
            {d.prenom}
            {d.langue === "en" && <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">EN</span>}
          </h3>
          <p className="num truncate text-[12.5px] text-muted">{d.email || "Pas d'e-mail"}{d.telephone ? ` · ${d.telephone}` : ""}</p>
        </div>
        <p className="num shrink-0 text-[12px] text-faint">Reçue le {dateCourte(d.recueLe)}</p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700">{d.typeProjet}</span>
        {d.besoins.map((b) => (
          <span key={b} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-muted">{b}</span>
        ))}
        {!compacte && d.source && <span className="text-faint">· depuis {d.source}</span>}
      </div>

      {!d.emailRecu && (
        <p className="mt-2.5 rounded-lg bg-[#fdf0ef] px-3 py-2 text-[12.5px] font-medium text-[#b42318]">
          L'e-mail de cette demande ne t'est pas parvenu : tout est ici.
        </p>
      )}
      {d.message && !compacte && <p className="mt-2.5 whitespace-pre-line text-[13px] leading-snug text-ink">« {d.message} »</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ContactRapide tel={d.telephone} email={d.email} whatsapp={messageWhatsApp.demande(d.prenom)} />
        <div className="flex items-center gap-2">
          {!traitee && (
            <Link href={`/admin/planning?demande=${d.id}`} className="inline-flex min-h-9 items-center rounded-lg px-3 text-[12.5px] font-semibold text-brand-700 hover:bg-surface-2">
              Caler un rendez-vous
            </Link>
          )}
          {traitee && <span className="num text-[12px] font-semibold text-[#0b7a53]">Traitée le {dateCourte(d.traiteeLe!)}</span>}
          <BoutonTraitee id={d.id} traitee={traitee} />
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import DemandeCarte from "@/components/admin/DemandeCarte";
import ContactRapide from "@/components/admin/ContactRapide";
import { dateCourte, messageWhatsApp, type DemandeAccompagnement, type Semaine } from "@/lib/admin/outils";
import type { Repartition } from "@/lib/data/admin";

/**
 * Le tableau de bord de l'admin (refonte du 17/11/2026), sans lecture de base : la page lui passe les données.
 * Dans l'ordre de ce que Daniel en fait : les chiffres d'un coup d'œil, ce qui attend une action (les demandes à
 * rappeler), les derniers inscrits à joindre, puis la courbe d'acquisition et d'où viennent les gens.
 */
export type NouvelInscrit = {
  id: string;
  email: string;
  username: string;
  typeLabel: string;
  region: string;
  /** Portable mis en forme (+33 6 12 34 56 78), ou "". */
  telephone: string;
  nbProjets: number;
  createdAt: string;
};

export type DonneesTableau = {
  chiffres: {
    inscrits: number; inscrits7j: number; inscrits30j: number;
    projets: number; projets7j: number;
    /** null : la lecture a échoué (le reste du tableau s'affiche quand même). */
    plans: number | null;
    demandes30j: number; aTraiter: number;
  };
  /** Les demandes d'accompagnement pas encore traitées, les plus récentes d'abord (5 au plus). */
  demandes: DemandeAccompagnement[];
  /** La lecture des demandes a échoué : le panneau le dit au lieu d'annoncer « rien à traiter ». */
  demandesIndisponibles?: boolean;
  /** Réseau AVYORA : les candidatures à examiner (3 au plus) et les décennales à renouveler. null : pas lisible (migration 0007). */
  artisans?: {
    aExaminer: { id: string; nom: string; detail: string; appelFait: boolean; soumiseLe: string }[];
    nbAExaminer: number;
    decennalesARenouveler: number;
  } | null;
  /** Les inscrits des 7 derniers jours (8 au plus). */
  nouveaux: NouvelInscrit[];
  /** Combien d'inscrits en plus, au-delà des 8 affichés. */
  nouveauxEnPlus: number;
  semaines: Semaine[];
  repartitions: { titre: string; aide: string; data: Repartition; couleur: string }[];
};

const nb = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function Chiffre({ titre, valeur, detail, href }: { titre: string; valeur: number | null; detail: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-600 sm:p-5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{titre}</span>
      <span className="num mt-1.5 block text-[28px] font-bold leading-none tracking-tight text-ink">{valeur == null ? "—" : nb(valeur)}</span>
      <span className="mt-2 block text-[12.5px] font-medium text-muted group-hover:text-brand-700">{detail}</span>
    </Link>
  );
}

function Panneau({ titre, compte, lien, children }: { titre: string; compte?: number; lien?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(30,27,75,.04)] sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-ink">
          {titre}
          {compte != null && <span className="num ml-2 text-[14px] font-semibold text-faint">{compte}</span>}
        </h2>
        {lien && <Link href={lien.href} className="shrink-0 text-[13px] font-semibold text-brand-700 hover:underline">{lien.label} →</Link>}
      </div>
      {children}
    </section>
  );
}

/** Les inscriptions des 12 dernières semaines, en barres ; la semaine en cours est plus claire (elle n'est pas finie). */
function Semaines({ semaines }: { semaines: Semaine[] }) {
  const max = Math.max(1, ...semaines.map((s) => s.n));
  const total = semaines.reduce((a, s) => a + s.n, 0);
  const jm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  return (
    <Panneau titre="Inscriptions par semaine">
      <p className="-mt-2 mb-4 text-[12.5px] text-faint">{nb(total)} sur les 12 dernières semaines · la dernière barre est la semaine en cours</p>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Inscriptions par semaine : ${semaines.map((s) => `semaine du ${jm(s.debut)}, ${s.n}`).join(" ; ")}`}>
        {semaines.map((s, i) => {
          const enCours = i === semaines.length - 1;
          return (
            <div key={s.debut} className="group relative flex h-full flex-1 flex-col justify-end" title={`Semaine du ${jm(s.debut)} : ${s.n} inscrit${s.n > 1 ? "s" : ""}`}>
              <span className={"num mb-1 text-center text-[11px] font-semibold " + (enCours || s.n === max ? "text-ink" : "text-transparent group-hover:text-ink")}>{s.n}</span>
              <span
                className={"block rounded-t-[4px] " + (enCours ? "bg-brand-600/45" : "bg-brand-600")}
                style={{ height: `${(s.n / max) * 82}%`, minHeight: s.n ? 4 : 2 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5" aria-hidden="true">
        {semaines.map((s, i) => (
          <span key={s.debut} className="num flex-1 text-center text-[10.5px] text-faint">{i % 2 === semaines.length % 2 ? "" : jm(s.debut)}</span>
        ))}
      </div>
    </Panneau>
  );
}

function Barres({ titre, aide, data, couleur }: DonneesTableau["repartitions"][number]) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="text-[15px] font-semibold text-ink">{titre}</h3>
      <p className="mb-3.5 mt-0.5 text-[12.5px] text-faint">{aide}</p>
      {data.length === 0 ? (
        <p className="text-[13px] text-faint">Aucune donnée pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.slice(0, 6).map((d) => (
            <div key={d.label} className="grid grid-cols-[minmax(0,120px)_1fr_32px] items-center gap-2.5 text-[13px]">
              <span className="truncate text-muted" title={d.label}>{d.label}</span>
              <span className="h-2.5 overflow-hidden rounded-md bg-surface-2">
                <span className="block h-full rounded-md" style={{ width: `${(d.n / max) * 100}%`, background: couleur }} />
              </span>
              <span className="num text-right font-semibold text-ink">{d.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TableauDeBord({ d }: { d: DonneesTableau }) {
  const c = d.chiffres;
  return (
    <div className="space-y-5" data-tableau-de-bord="">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Chiffre titre="Inscrits" valeur={c.inscrits} detail={`+${nb(c.inscrits7j)} en 7 j · +${nb(c.inscrits30j)} en 30 j`} href="/admin/inscrits" />
        <Chiffre titre="Projets estimés" valeur={c.projets} detail={`+${nb(c.projets7j)} en 7 j`} href="/admin/projets" />
        <Chiffre titre="Plans dessinés" valeur={c.plans} detail={c.plans == null ? "Lecture impossible pour l'instant" : "dans l'éditeur de plan"} href="/admin/plans" />
        <Chiffre
          titre="Accompagnement"
          valeur={d.demandesIndisponibles ? null : c.aTraiter}
          detail={d.demandesIndisponibles ? "Lecture impossible pour l'instant" : `à rappeler · ${nb(c.demandes30j)} demande${c.demandes30j > 1 ? "s" : ""} en 30 j`}
          href="/admin/accompagnement"
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panneau titre="À traiter" compte={d.demandesIndisponibles ? undefined : c.aTraiter} lien={{ href: "/admin/accompagnement", label: "Toutes les demandes" }}>
          {d.artisans && (d.artisans.nbAExaminer > 0 || d.artisans.decennalesARenouveler > 0) && (
            <div className="mb-3 rounded-2xl border border-line bg-surface-2/60 p-3" data-a-traiter-artisans="">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13.5px] font-semibold text-ink">
                  Candidatures d&apos;artisans<span className="num ml-1.5 text-faint">{d.artisans.nbAExaminer}</span>
                </h3>
                <Link href="/admin/artisans" className="shrink-0 text-[12.5px] font-semibold text-brand-700 hover:underline">Réseau AVYORA →</Link>
              </div>
              {d.artisans.aExaminer.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {d.artisans.aExaminer.map((x) => (
                    <li key={x.id}>
                      <Link href={`/admin/artisans/${x.id}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl border border-line bg-surface px-3 py-2 hover:border-brand-600">
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{x.nom}</span>
                          <span className="block truncate text-[12px] text-muted">{x.detail}</span>
                        </span>
                        <span className={"shrink-0 text-[12px] font-semibold " + (x.appelFait ? "text-[#0b5e40]" : "text-brand-700")}>{x.appelFait ? "Appel fait : à décider" : "Appel à faire"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {d.artisans.decennalesARenouveler > 0 && (
                <p className="mt-2 text-[12.5px] font-medium text-[#8a5300]">
                  {d.artisans.decennalesARenouveler} décennale{d.artisans.decennalesARenouveler > 1 ? "s" : ""}{" "}d&apos;artisans validés à renouveler (expirée ou dans moins de 30 jours).
                </p>
              )}
            </div>
          )}
          {d.demandesIndisponibles ? (
            <p role="alert" className="rounded-2xl bg-[#fdf0ef] px-4 py-6 text-center text-[13.5px] font-medium text-[#b42318]">Les demandes n'ont pas pu être lues. Recharge la page dans un instant.</p>
          ) : d.demandes.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-[13.5px] text-muted">Rien à traiter : toutes les demandes de rappel sont traitées.</p>
          ) : (
            <div className="space-y-2.5">
              {d.demandes.map((x) => <DemandeCarte key={x.id} d={x} compacte />)}
              {c.aTraiter > d.demandes.length && (
                <p className="text-center text-[12.5px] text-faint">et {c.aTraiter - d.demandes.length} autre{c.aTraiter - d.demandes.length > 1 ? "s" : ""} dans Accompagnement</p>
              )}
            </div>
          )}
        </Panneau>

        <Panneau titre="Nouveaux inscrits · 7 jours" compte={c.inscrits7j} lien={{ href: "/admin/inscrits", label: "Tous les inscrits" }}>
          {d.nouveaux.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-[13.5px] text-muted">Pas de nouvel inscrit ces 7 derniers jours.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.nouveaux.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/admin/inscrits/${i.id}`} className="num block truncate text-[13.5px] font-semibold text-ink hover:text-brand-700">
                      {i.username || i.email}
                    </Link>
                    <p className="truncate text-[12px] text-faint">
                      {[i.typeLabel !== "—" ? i.typeLabel : "", i.region, i.nbProjets ? `${i.nbProjets} projet${i.nbProjets > 1 ? "s" : ""}` : "", dateCourte(i.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {i.telephone ? (
                    <ContactRapide tel={i.telephone} whatsapp={messageWhatsApp.inscrit()} />
                  ) : (
                    <span className="text-[12px] text-faint">Pas de portable</span>
                  )}
                </li>
              ))}
              {d.nouveauxEnPlus > 0 && (
                <li className="pt-2.5 text-center text-[12.5px] text-faint">et {d.nouveauxEnPlus} autre{d.nouveauxEnPlus > 1 ? "s" : ""}</li>
              )}
            </ul>
          )}
        </Panneau>
      </div>

      <Semaines semaines={d.semaines} />

      <div className="grid gap-4 sm:grid-cols-2">
        {d.repartitions.map((r) => <Barres key={r.titre} {...r} />)}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser, estPro } from "@/lib/auth";
import { demandesDuClient, type DemandeClient } from "@/lib/data/reseau";
import { LIBELLES_MER, labelDelai, placesRestantes } from "@/lib/reseau/demande";
import SuiviArtisan from "@/components/reseau/SuiviArtisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";
import { lienAppel } from "@/lib/admin/outils";
import { afficherPortable } from "@/lib/telephone";

/** Les demandes de devis d'un client et la réponse de chaque artisan (coordonnées de ceux qui ont accepté). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes demandes de devis · Réseau AVYORA", robots: { index: false, follow: false } };

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

const TON = {
  envoyee: "bg-surface-2 text-muted border border-line",
  acceptee: "bg-[#e3f5ed] text-[#0b5e40]",
  refusee: "bg-[#fdf0ef] text-[#8a1f15]",
  expiree: "bg-[#fff4dc] text-[#8a5300]",
} as const;

function Demande({ d, pro }: { d: DemandeClient; pro: boolean }) {
  // Remplacer un refus ou un silence (phase 3), ou retenter une zone qui n'avait personne : 3 en cours, 6 au total.
  const places = placesRestantes(d.reponses.map((r) => r.statut));
  const aRemplacer = d.reponses.length === 0 || d.reponses.some((r) => r.statut === "refusee" || r.statut === "expiree");
  return (
    <article id={`demande-${d.id}`} className="scroll-mt-24 rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[16.5px] font-semibold text-ink">{d.metiers.map(labelMetier).join(", ")}</h2>
          <p className="text-[13px] text-muted">{d.ville ? `${d.ville} · ` : ""}{nomDepartement(d.departement)} ({d.code_postal}) · {labelDelai(d.delai)}</p>
        </div>
        <p className="num text-[12.5px] text-faint">Envoyée le {dateLongue(d.created_at)}</p>
      </div>
      {d.adresse && <p className="mt-1 text-[12.5px] text-faint">Adresse du chantier (transmise aux artisans qui acceptent) : {d.adresse}</p>}
      {d.reponses.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] text-muted">
          Pas encore d&apos;artisan du réseau dans ta zone pour ces travaux : Daniel cherche, et on te prévient par e-mail.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {d.reponses.map((r) => (
            <li key={r.miseId} className="rounded-2xl border border-line p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14.5px] font-semibold text-ink">{r.artisan.nom} <Link href={`/avis-artisans/${r.artisan.id}`} className="ml-1 text-[12.5px] font-semibold text-brand-700 hover:underline">Sa fiche et ses avis</Link></span>
                <span className={"rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + TON[r.statut]}>{LIBELLES_MER[r.statut]}</span>
              </div>
              {r.statut === "acceptee" && r.devisEnvoyeLe && (
                <p className="mt-1.5 text-[12.5px] text-muted">Il indique t&apos;avoir envoyé son devis le {dateLongue(r.devisEnvoyeLe)}.</p>
              )}
              {r.statut === "expiree" && <p className="mt-1.5 text-[12.5px] text-muted">Pas de réponse dans les 5 jours : tu peux choisir un autre artisan à sa place.</p>}
              {r.contact && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13.5px]">
                  <span className="text-muted">{r.contact.nom}</span>
                  {lienAppel(r.contact.telephone) && <a href={lienAppel(r.contact.telephone)!} className="btn btn-outline min-h-10 px-3 text-[13px]">Appeler {afficherPortable(r.contact.telephone)}</a>}
                  <a href={`mailto:${r.contact.email}`} className="btn btn-ghost min-h-10 px-3 text-[13px]">{r.contact.email}</a>
                </div>
              )}
              {r.statut === "acceptee" && <SuiviArtisan miseId={r.miseId} nom={r.artisan.nom} artisanId={r.artisan.id} issue={r.issue} avis={r.avis} />}
            </li>
          ))}
        </ul>
      )}
      {pro && places > 0 && aRemplacer && (
        <Link href={`/demandes-devis/${d.id}/ajouter`} className="btn btn-outline mt-3 min-h-11 px-4 text-[13.5px]">
          {d.reponses.length === 0 ? "Voir si un artisan est disponible" : "Choisir un autre artisan"}
        </Link>
      )}
    </article>
  );
}

export default async function MesDemandesDevis({ searchParams }: { searchParams: Promise<{ envoyee?: string; ajout?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/demandes-devis");
  const sp = await searchParams;
  const envoyee = sp.envoyee === "1";
  const ajout = sp.ajout === "1";
  let demandes: DemandeClient[] = [];
  let panne = false;
  try {
    demandes = await demandesDuClient(user.id);
  } catch {
    panne = true;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2" lang="fr">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Réseau AVYORA</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Mes demandes de devis</h1>
        </div>
        {estPro(user) && <Link href="/demandes-devis/nouvelle" className="btn btn-primary min-h-11 px-5">Nouvelle demande</Link>}
      </div>
      {envoyee && (
        <p role="status" className="rounded-2xl bg-[#e3f5ed] px-4 py-3 text-[14px] font-medium text-[#0b5e40]">
          Ta demande est envoyée. Tu reçois un e-mail dès qu&apos;un artisan accepte, avec ses coordonnées.
        </p>
      )}
      {ajout && (
        <p role="status" className="rounded-2xl bg-[#e3f5ed] px-4 py-3 text-[14px] font-medium text-[#0b5e40]">
          Ta demande est envoyée au nouvel artisan. Tu reçois un e-mail dès qu&apos;il accepte.
        </p>
      )}
      {panne && <p role="alert" className="rounded-2xl bg-[#fdf0ef] px-4 py-3 text-[14px] text-[#8a1f15]">Tes demandes ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>}
      {!panne && demandes.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line-strong bg-surface-2 px-5 py-10 text-center">
          <p className="text-[15px] font-semibold text-ink">Pas encore de demande de devis</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[14px] text-muted">Choisis jusqu&apos;à 3 artisans vérifiés de ton département ; ceux qui acceptent te contactent.</p>
          {estPro(user) ? (
            <Link href="/demandes-devis/nouvelle" className="btn btn-primary mt-4 min-h-11 px-5">Demander des devis</Link>
          ) : (
            <Link href="/tarifs" className="btn btn-primary mt-4 min-h-11 px-5">Réservé à AVYORA Pro</Link>
          )}
        </div>
      )}
      {demandes.map((d) => <Demande key={d.id} d={d} pro={estPro(user)} />)}
    </div>
  );
}

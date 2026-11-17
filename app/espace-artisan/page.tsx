import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { lienInscriptionBeta } from "@/lib/beta";
import { afficherPortable } from "@/lib/telephone";
import { candidatureDe, demandesRecues, documentsDe, urlsSignees, type DemandeRecue } from "@/lib/data/reseau";
import DemandesRecues from "@/components/reseau/DemandesRecues";
import { candidatureModifiable, LIBELLES_STATUT, type Artisan } from "@/lib/reseau/artisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import FormulaireCandidature, { type ValeursCandidature } from "@/components/reseau/FormulaireCandidature";

/**
 * L'espace de l'artisan qui postule au Réseau AVYORA (décisions de Dani du 17/11/2026). Sans compte : l'inscription,
 * qui ramène ici (pas le questionnaire de bienvenue). Avec un compte : le formulaire tant que rien n'est envoyé (ou
 * qu'un complément est demandé), sinon où en est la candidature. En français : le réseau est en France.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace artisan · Réseau AVYORA", robots: { index: false, follow: false } };

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

function Etapes({ a }: { a: Artisan }) {
  const etapes = [
    { label: "Candidature envoyée", fait: true, detail: `le ${dateLongue(a.soumiseLe)}` },
    { label: "Examen du dossier", fait: a.statut === "valide" || !!a.appelLe, detail: "SIRET, assurance décennale, photos" },
    { label: "Appel avec Daniel", fait: !!a.appelLe, detail: "pour faire connaissance" },
    { label: "Entrée dans le réseau", fait: a.statut === "valide", detail: a.valideLe ? `le ${dateLongue(a.valideLe)}` : "" },
  ];
  return (
    <ol className="space-y-3">
      {etapes.map((e) => (
        <li key={e.label} className="flex items-start gap-3">
          <span className={"mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full " + (e.fait ? "bg-[#0b7a53] text-white" : "border border-line-strong bg-surface text-faint")}>
            {e.fait ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            )}
          </span>
          <span>
            <span className={"block text-[14.5px] font-semibold " + (e.fait ? "text-ink" : "text-muted")}>{e.label}<span className="sr-only">{e.fait ? " : fait" : " : à venir"}</span></span>
            {e.detail && <span className="block text-[13px] text-muted">{e.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Recap({ a }: { a: Artisan }) {
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

export default async function EspaceArtisan() {
  const user = await getUser();
  if (!user) redirect(lienInscriptionBeta("/espace-artisan", "artisan"));

  let a: Artisan | null;
  try {
    a = await candidatureDe(user.id);
  } catch {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">Espace artisan</h1>
        <p role="alert" className="mt-4 rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Ton espace ne s'affiche pas pour l'instant. Recharge la page dans un instant.</p>
      </div>
    );
  }

  const meta = (user.user_metadata ?? {}) as { nom?: string; profil?: { telephone?: string } };
  const modifiable = candidatureModifiable(a);

  if (modifiable) {
    const docs = await documentsDe(user.id);
    const urls = await urlsSignees(docs.filter((d) => d.type === "photo").map((d) => d.chemin));
    const initial: ValeursCandidature = a
      ? {
          siret: a.siret, nomCommercial: a.nomCommercial ?? "", contactNom: a.contactNom, telephone: afficherPortable(a.telephone),
          metiers: a.metiers, departements: a.departements, presentation: a.presentation ?? "", siteWeb: a.siteWeb ?? "", lienAvis: a.lienAvis ?? "",
          decennaleAssureur: a.decennaleAssureur, decennalePolice: a.decennalePolice, decennaleFin: a.decennaleFin,
        }
      : {
          siret: "", nomCommercial: "", contactNom: typeof meta.nom === "string" ? meta.nom.slice(0, 120) : "",
          telephone: meta.profil?.telephone ? afficherPortable(meta.profil.telephone) : "",
          metiers: [], departements: [], presentation: "", siteWeb: "", lienAvis: "", decennaleAssureur: "", decennalePolice: "", decennaleFin: "",
        };
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-2" lang="fr">
        <div>
          <p className="eyebrow">Réseau AVYORA</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">{a ? "Complète ta candidature" : "Rejoins le Réseau AVYORA"}</h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
            {a
              ? "Daniel a besoin d'un complément avant de continuer. Corrige ce qu'il demande, puis renvoie ta candidature."
              : "Les clients d'AVYORA arrivent avec une estimation détaillée de leurs travaux et choisissent jusqu'à 3 artisans vérifiés de leur département. Remplis ton dossier : Daniel l'examine, puis t'appelle avant de te faire entrer dans le réseau."}
          </p>
          {!a && (
            <p className="mt-2 text-[13.5px] text-muted">
              <Link href="/reseau-artisans" className="font-semibold text-brand-700 hover:underline">Comment fonctionne le réseau</Link> ·{" "}
              <Link href="/reseau-artisans#criteres" className="font-semibold text-brand-700 hover:underline">Nos critères</Link>
            </p>
          )}
        </div>
        {a?.messageAdmin && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-[13px] font-semibold text-brand-700">Le message de Daniel</p>
            <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{a.messageAdmin}</p>
          </div>
        )}
        <FormulaireCandidature
          initial={initial}
          documents={docs.map((d) => ({ ...d, url: urls.get(d.chemin) ?? null }))}
          email={user.email ?? ""}
          completer={!!a}
        />
      </div>
    );
  }

  const cand = a!;
  const titre: Record<Exclude<Artisan["statut"], "a_completer">, string> = {
    en_attente: "Ta candidature est en cours d'examen",
    valide: "Tu fais partie du Réseau AVYORA",
    refuse: "Ta candidature n'est pas retenue",
    suspendu: "Ta participation est suspendue",
  };
  const st = cand.statut as Exclude<Artisan["statut"], "a_completer">;
  // Les demandes de devis reçues (phase 2) : seulement pour un artisan validé.
  let demandes: DemandeRecue[] | null = [];
  if (st === "valide") demandes = await demandesRecues(cand.id).catch(() => null);
  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2" lang="fr">
      <div>
        <p className="eyebrow">Réseau AVYORA · {LIBELLES_STATUT[cand.statut]}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">{titre[st]}</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          {st === "en_attente" && "Daniel examine ton dossier, puis t'appelle pour faire connaissance. Tu reçois un e-mail dès qu'il y a du nouveau."}
          {st === "valide" && "Les clients d'AVYORA de ta zone peuvent te choisir pour leurs demandes de devis. Chaque demande t'arrive par e-mail, et ici : accepte-la pour recevoir les coordonnées du client."}
          {st === "refuse" && "Merci pour ta candidature. Si ta situation évolue, écris-nous à contact@getavyora.fr."}
          {st === "suspendu" && "Tu ne reçois plus de demandes pour le moment. Pour en parler, écris-nous à contact@getavyora.fr."}
        </p>
      </div>
      {cand.messageAdmin && (st === "refuse" || st === "suspendu" || st === "valide") && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[13px] font-semibold text-muted">Le message de Daniel</p>
          <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{cand.messageAdmin}</p>
        </div>
      )}
      {st === "en_attente" && (
        <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="etapes">
          <h2 id="etapes" className="mb-4 text-[16px] font-semibold text-ink">Où en est ta candidature</h2>
          <Etapes a={cand} />
        </section>
      )}
      {st === "valide" && (demandes ? <DemandesRecues demandes={demandes} /> : (
        <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Tes demandes ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>
      ))}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="recap">
        <h2 id="recap" className="mb-4 text-[16px] font-semibold text-ink">Ton dossier</h2>
        <Recap a={cand} />
        <p className="mt-4 text-[12.5px] text-faint">Une information a changé (assurance renouvelée, nouveau numéro) ? Écris à contact@getavyora.fr : Daniel rouvrira ton dossier.</p>
      </section>
    </div>
  );
}

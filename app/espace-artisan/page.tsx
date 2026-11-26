import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { lienInscriptionBeta } from "@/lib/beta";
import { afficherPortable } from "@/lib/telephone";
import { avisRecus, demandesRecues, documentsDe, statsMisesEnRelation, urlsSignees } from "@/lib/data/reseau";
import { sessionArtisan, dateLimite, dateCourte } from "@/lib/reseau/espace";
import { ALERTE_DECENNALE_JOURS, joursAvant, noteFr, resumeNotes } from "@/lib/reseau/avis";
import { EXPIRATION_JOURS } from "@/lib/reseau/demande";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { Recap } from "@/components/reseau/espace/RecapDossier";
import { candidatureModifiable, LIBELLES_STATUT, type Artisan } from "@/lib/reseau/artisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import FormulaireCandidature, { type ValeursCandidature } from "@/components/reseau/FormulaireCandidature";
import { typeCompte } from "@/lib/compte/type";
import ChoixTypeCompte from "@/components/compte/ChoixTypeCompte";
import PasserEnPro from "@/components/compte/PasserEnPro";

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

export default async function EspaceArtisan() {
  let session: Awaited<ReturnType<typeof sessionArtisan>> | "panne";
  try {
    session = await sessionArtisan();
  } catch {
    session = "panne";
  }
  if (session === null) redirect(lienInscriptionBeta("/espace-artisan", "artisan"));
  if (session === "panne") {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">Espace artisan</h1>
        <p role="alert" className="mt-4 rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Ton espace ne s'affiche pas pour l'instant. Recharge la page dans un instant.</p>
      </div>
    );
  }
  const { user, artisan: a } = session;
  if (a?.statut === "valide") return <Accueil a={a} prenom={(a.contactNom || "").split(" ")[0]} />;

  const meta = (user.user_metadata ?? {}) as { nom?: string; profil?: { telephone?: string }; pro?: { societe?: string; metier?: string; siret?: string | null; siretVerif?: { nom?: string } | null } };
  const modifiable = candidatureModifiable(a);

  // Le réseau est réservé aux professionnels du bâtiment (26/11/2026) : sans candidature, un compte qui n'a pas dit
  // qu'il est pro répond d'abord à « Tu es… », un particulier voit comment passer en compte pro (SIRET vérifié).
  const type = typeCompte(user);
  if (!a && type !== "pro") {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-2" lang="fr">
        <div>
          <p className="eyebrow">Réseau AVYORA</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Le réseau est réservé aux professionnels du bâtiment</h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
            {type === "particulier"
              ? "Ton compte est un compte particulier. Si tu es un professionnel du bâtiment, passe en compte pro avec le SIRET de ton entreprise : il est vérifié automatiquement, puis tu pourras postuler."
              : "Dis-nous d'abord si tu es particulier ou professionnel du bâtiment."}
          </p>
        </div>
        <section className="rounded-3xl border border-line bg-surface p-5">
          {type === "particulier" ? <PasserEnPro nomInitial={typeof meta.nom === "string" ? meta.nom : ""} /> : <ChoixTypeCompte titre={false} />}
        </section>
        <p className="text-[13px] text-muted">
          <Link href="/reseau-artisans" className="font-semibold text-brand-700 hover:underline">Comment fonctionne le réseau</Link> ·{" "}
          <Link href="/reseau-artisans#criteres" className="font-semibold text-brand-700 hover:underline">Nos critères</Link>
        </p>
      </div>
    );
  }

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
          // Prérempli depuis le questionnaire du pro (26/11/2026) : SIRET, nom, portable, métier principal ; la société
          // devient le nom commercial seulement si elle diffère de la raison sociale du répertoire.
          siret: meta.pro?.siret ?? "",
          nomCommercial: meta.pro?.societe && meta.pro.siretVerif?.nom && meta.pro.societe.toLowerCase() !== meta.pro.siretVerif.nom.toLowerCase() ? meta.pro.societe.slice(0, 120) : "",
          contactNom: typeof meta.nom === "string" ? meta.nom.slice(0, 120) : "",
          telephone: meta.profil?.telephone ? afficherPortable(meta.profil.telephone) : "",
          metiers: meta.pro?.metier ? [meta.pro.metier] : [], departements: [], presentation: "", siteWeb: "", lienAvis: "", decennaleAssureur: "", decennalePolice: "", decennaleFin: "",
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
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="recap">
        <h2 id="recap" className="mb-4 text-[16px] font-semibold text-ink">Ton dossier</h2>
        <Recap a={cand} />
        <p className="mt-4 text-[12.5px] text-faint">Une information a changé (assurance renouvelée, nouveau numéro) ? Écris à contact@getavyora.fr : Daniel rouvrira ton dossier.</p>
      </section>
    </div>
  );
}

/* ─── L'accueil de l'artisan validé (25/11/2026) : ce qu'il doit faire maintenant, puis ses chiffres ─── */

function Priorite({ href, titre, texte, lien, ton = "normal" }: { href: string; titre: string; texte: string; lien: string; ton?: "urgent" | "normal" | "alerte" }) {
  return (
    <div className={"flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-surface p-4 " + (ton === "urgent" ? "border-brand-600 shadow-[0_10px_26px_-14px_rgba(79,70,229,.45)]" : ton === "alerte" ? "border-[#f3d9b1]" : "border-line")}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">{titre}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{texte}</p>
      </div>
      <Link href={href} className={"btn min-h-10 w-full px-4 text-[13.5px] sm:w-auto " + (ton === "urgent" ? "btn-primary" : "btn-outline")}>{lien}</Link>
    </div>
  );
}

async function Accueil({ a, prenom }: { a: Artisan; prenom: string }) {
  const [demandes, stats, avis] = await Promise.all([
    demandesRecues(a.id).catch(() => null),
    statsMisesEnRelation(a.id).catch(() => null),
    avisRecus(a.id).catch(() => null),
  ]);
  const aRepondre = (demandes ?? []).filter((d) => d.statut === "envoyee");
  const devisAEnvoyer = (demandes ?? []).filter((d) => d.statut === "acceptee" && !d.devisEnvoyeLe && !d.nonRetenu);
  const sansReponse = (avis?.publies ?? []).filter((x) => !x.maReponse);
  const jours = joursAvant(a.decennaleFin, aujourdhuiParis());
  const resume = resumeNotes((avis?.publies ?? []).map((x) => x.note));
  const repondues = stats ? stats.acceptees + stats.refusees + stats.expirees : 0;
  const taux = stats && repondues ? Math.round(((stats.acceptees + stats.refusees) / repondues) * 100) : null;
  const plusAncienne = aRepondre.length ? aRepondre.reduce((m, d) => (d.envoyeeLe < m.envoyeeLe ? d : m)) : null;
  const nom = a.nomCommercial || a.raisonSociale;
  const CHIP: Record<string, string> = { rep: "bg-brand-600 text-white", cours: "bg-brand-50 text-brand-700", ok: "bg-[#e3f5ed] text-[#0b5e40]", fin: "border border-line bg-surface-2 text-muted" };
  const etat = (d: NonNullable<typeof demandes>[number]) =>
    d.statut === "envoyee" ? ["rep", "À répondre"] : d.signe ? ["ok", "Signé ✓"] : d.statut === "acceptee" && !d.nonRetenu ? ["cours", "En cours"] : ["fin", "Terminée"];

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Bonjour {prenom || nom}</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          {nom} fait partie du Réseau AVYORA{a.valideLe ? ` depuis le ${dateLongue(a.valideLe)}` : ""}. Les clients de ta zone peuvent te choisir pour leurs demandes de devis.
        </p>
      </div>
      {a.messageAdmin && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[13px] font-semibold text-muted">Le message de Daniel</p>
          <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{a.messageAdmin}</p>
        </div>
      )}

      <section aria-label="À faire maintenant" className="space-y-2.5">
        {demandes === null && <p role="alert" className="rounded-2xl bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15]">Tes demandes ne s&apos;affichent pas pour l&apos;instant. Recharge la page dans un instant.</p>}
        {plusAncienne && (
          <Priorite ton="urgent" href="/espace-artisan/demandes" lien={aRepondre.length > 1 ? "Voir les demandes" : "Voir la demande"}
            titre={`${aRepondre.length} demande${aRepondre.length > 1 ? "s" : ""} à répondre`}
            texte={`Réponds avant le ${dateLimite(plusAncienne.envoyeeLe, EXPIRATION_JOURS)} : sans réponse, la demande part à un autre artisan.`} />
        )}
        {devisAEnvoyer.length > 0 && (
          <Priorite href="/espace-artisan/demandes?onglet=cours" lien="Voir"
            titre={`${devisAEnvoyer.length} devis à envoyer`}
            texte="Tu as accepté, le client attend ton devis. Dis-nous quand il est parti : le client le voit dans son suivi." />
        )}
        {sansReponse.length > 0 && (
          <Priorite href="/espace-artisan/avis" lien="Répondre"
            titre={`${sansReponse.length} avis sans réponse`}
            texte="Une réponse courte et courtoise rassure les prochains clients." />
        )}
        {jours <= ALERTE_DECENNALE_JOURS && (
          <Priorite ton="alerte" href="/espace-artisan/dossier" lien="Mettre à jour"
            titre={jours < 0 ? "Ta décennale a expiré" : `Ta décennale arrive à échéance le ${dateLongue(a.decennaleFin)}`}
            texte={jours < 0 ? "Tu ne reçois plus de demandes. Envoie ta nouvelle attestation pour revenir dans les listes." : "Envoie la nouvelle attestation pour continuer à recevoir des demandes."} />
        )}
        {demandes !== null && !plusAncienne && !devisAEnvoyer.length && !sansReponse.length && jours > ALERTE_DECENNALE_JOURS && (
          <p className="rounded-2xl border border-dashed border-line-strong bg-surface-2 p-4 text-[14px] text-muted">
            Rien à faire pour l&apos;instant. Quand un client de ta zone te choisit, tu reçois un e-mail et la demande apparaît ici.
          </p>
        )}
      </section>

      {stats && (
        <section aria-labelledby="chiffres" className="rounded-3xl border border-line bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="chiffres" className="text-[16px] font-semibold text-ink">Tes chiffres</h2>
            <span className="text-[12.5px] text-faint">depuis ton entrée dans le réseau</span>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
            {([
              [String(stats.recues), "demandes reçues"],
              [taux == null ? "–" : `${taux} %`, "de réponse"],
              [String(stats.devisEnvoyes), "devis envoyés"],
              [resume.n ? `${noteFr(resume.moyenne)} ★` : "–", resume.n ? `sur ${resume.n} avis` : "pas encore d'avis"],
            ] as const).map(([v, k]) => (
              <div key={k} className="bg-surface px-3.5 py-3">
                <dt className="sr-only">{k}</dt>
                <dd className="num text-[23px] font-semibold tracking-tight text-ink">{v}</dd>
                <dd className="mt-0.5 text-[12.5px] text-muted">{k}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {demandes && demandes.length > 0 && (
        <section aria-labelledby="dernieres" className="rounded-3xl border border-line bg-surface p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dernieres" className="text-[16px] font-semibold text-ink">Dernières demandes</h2>
            <Link href="/espace-artisan/demandes" className="text-[13.5px] font-semibold text-brand-700 hover:underline">Tout voir →</Link>
          </div>
          <ul className="divide-y divide-line">
            {demandes.slice(0, 4).map((d) => {
              const [ton, label] = etat(d);
              return (
                <li key={d.miseId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{d.demande.metiers.map(labelMetier).join(", ")}</span>
                    <span className="block text-[12.5px] text-muted">{d.demande.ville ? `${d.demande.ville} · ` : ""}{d.demande.code_postal} · reçue le {dateCourte(d.envoyeeLe)}</span>
                  </span>
                  <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + CHIP[ton]}>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { suivreArtisan } from "@/lib/actions/devis";
import { envoyerAvis, preparerPhotoAvis } from "@/lib/actions/avis";
import { ISSUES, type Issue } from "@/lib/reseau/demande";
import { MAX_PHOTOS_AVIS, MAX_TEXTE_AVIS, MIN_TEXTE_AVIS, avisModifiable, labelMois, moisRecents, type ErreursAvis } from "@/lib/reseau/avis";
import type { AvisClient } from "@/lib/data/reseau";
import EnvoiPhotos, { type PhotoEnvoyee } from "@/components/reseau/avis/EnvoiPhotos";

/**
 * Pour un artisan qui a accepté (page « Mes demandes de devis ») : où en est le client avec lui (devis reçu, signé,
 * pas retenu) et son avis. Depuis le 25/11/2026 l'avis est PUBLIC (membres Pro) après vérification par Daniel : note,
 * mois des travaux, texte et jusqu'à 6 photos. Modifiable tant qu'il n'est pas publié ; publié, il est figé.
 */
const NOTES = ["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"];

export default function SuiviArtisan({
  miseId, nom, artisanId, issue, avis,
}: { miseId: string; nom: string; artisanId: string; issue: Issue | null; avis: AvisClient | null }) {
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<Issue | null>(issue);
  const statut = avis?.statut ?? null;
  const modifiable = avisModifiable(statut);
  const [ouvert, setOuvert] = useState(!avis && (issue === "signe" || issue === "non_retenu"));
  const [note, setNote] = useState(avis?.note ?? 0);
  const [texte, setTexte] = useState(avis?.commentaire ?? "");
  const [mois, setMois] = useState(avis?.mois ? avis.mois.slice(0, 7) : "");
  const [photos, setPhotos] = useState<PhotoEnvoyee[]>((avis?.photos ?? []).map((p) => ({ chemin: p.chemin, apercu: p.url })));
  const [certifie, setCertifie] = useState(false);
  const [erreurs, setErreurs] = useState<ErreursAvis>({});
  const [global, setGlobal] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const liste = moisRecents();

  const choisir = (i: Issue) =>
    demarrer(async () => {
      const suivant = etat === i ? null : i;
      const r = await suivreArtisan(miseId, suivant).catch(() => ({ ok: false }));
      if (r.ok) { setEtat(suivant); if ((suivant === "signe" || suivant === "non_retenu") && !avis) setOuvert(true); }
    });
  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobal("");
    if (!certifie) { setGlobal("Coche la case pour confirmer que ton avis reflète ton expérience."); return; }
    demarrer(async () => {
      const r = await envoyerAvis(miseId, { note, texte, mois, photos: photos.map((p) => p.chemin) }).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) { setEnvoye(true); setOuvert(false); setErreurs({}); return; }
      setErreurs(("erreurs" in r && r.erreurs) || {});
      if ("erreur" in r && r.erreur) setGlobal(r.erreur);
    });
  };

  const enAttente = envoye || statut === "en_attente";

  return (
    <div className="mt-3 border-t border-line pt-3" data-suivi-artisan={miseId}>
      <p className="text-[12.5px] font-semibold text-muted" id={`suivi-${miseId}`}>Où en es-tu avec {nom} ?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`suivi-${miseId}`}>
        {ISSUES.map(([k, l]) => (
          <button key={k} type="button" disabled={enCours} aria-pressed={etat === k} onClick={() => choisir(k)}
            className={"inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60 " + (etat === k ? "border-brand-600 bg-brand-600 text-white" : "border-line text-ink hover:border-brand-600")}>
            {l}
          </button>
        ))}
      </div>

      {/* L'état de l'avis */}
      {statut === "publie" && !ouvert && (
        <div className="mt-3 rounded-2xl bg-[#e3f5ed] p-3.5 text-[13.5px] text-[#0b5e40]">
          <p className="font-semibold">Ton avis est publié <span className="num">({avis!.note}/5)</span>{avis!.mois ? ` · travaux de ${labelMois(avis!.mois)}` : ""}.</p>
          <p className="mt-1 flex items-start gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" /></svg>
            Un avis publié ne peut plus être modifié. Pour le faire retirer, écris à contact@getavyora.fr.
          </p>
          <Link href={`/avis-artisans/${artisanId}`} className="mt-1 inline-block font-semibold underline">Voir la fiche de {nom}</Link>
        </div>
      )}
      {statut === "retire" && <p className="mt-2.5 text-[13px] text-muted">Ton avis sur {nom} a été retiré.</p>}
      {enAttente && !ouvert && (
        <p className="mt-2.5 text-[13px] text-muted">
          Ton avis (<span className="num font-semibold text-ink">{note}/5</span>) est en cours de vérification par Daniel : tu reçois un e-mail quand il est en ligne.{" "}
          <button type="button" onClick={() => setOuvert(true)} className="py-2 font-semibold text-brand-700 underline">Modifier mon avis</button>
        </p>
      )}
      {statut === "refuse" && !envoye && !ouvert && (
        <div className="mt-3 rounded-2xl bg-[#fdf1e1] p-3.5 text-[13.5px] text-[#8a5208]">
          <p className="font-semibold">Ton avis n&apos;a pas été publié.</p>
          {avis?.motif && <p className="mt-1">Motif : {avis.motif}</p>}
          <button type="button" onClick={() => setOuvert(true)} className="mt-1 py-1 font-semibold underline">Corriger et renvoyer</button>
        </div>
      )}
      {!avis && !envoye && !ouvert && (
        <button type="button" onClick={() => setOuvert(true)} className="mt-2 py-2 text-[13px] font-semibold text-brand-700 underline">Donner mon avis sur {nom}</button>
      )}
      {avis && statut === null && !envoye && !ouvert && (
        <p className="mt-2.5 text-[13px] text-muted">
          Ton avis privé : <span className="num font-semibold text-ink">{avis.note}/5</span>.{" "}
          <button type="button" onClick={() => setOuvert(true)} className="py-2 font-semibold text-brand-700 underline">Le compléter pour le publier</button>
        </p>
      )}

      {ouvert && modifiable && (
        <form onSubmit={envoyer} className="mt-3 space-y-4 rounded-2xl bg-surface-2 p-4" noValidate>
          <p className="text-[13px] leading-relaxed text-muted">
            Ton avis aide les prochains clients à choisir. Il est publié pour les membres AVYORA Pro avec ton prénom et l&apos;initiale de ton nom, après vérification par Daniel.
          </p>
          <fieldset>
            <legend className="text-[13.5px] font-semibold text-ink">Ta note</legend>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={"inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border text-[18px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 " + (note >= n ? "border-[#e8b34a] bg-[#fffbeb] text-[#f59e0b]" : "border-line bg-surface text-line-strong")}>
                  <input type="radio" name={`note-${miseId}`} value={n} checked={note === n} onChange={() => setNote(n)} className="sr-only" />
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">{n} sur 5</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[12.5px] text-faint">{NOTES[note] || "Touche une étoile"}</p>
            {erreurs.note && <p role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs.note}</p>}
          </fieldset>
          <div>
            <label htmlFor={`mois-${miseId}`} className="block text-[13.5px] font-semibold text-ink">Quand les travaux ont-ils été faits ?</label>
            <select id={`mois-${miseId}`} value={mois} onChange={(e) => setMois(e.target.value)} className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink sm:w-64">
              <option value="">Choisis le mois</option>
              {liste.map((m) => <option key={m.v} value={m.v}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</option>)}
            </select>
            <p className="mt-1 text-[12.5px] text-faint">Si les travaux ne sont pas faits, le mois du devis. Il est affiché avec ton avis.</p>
            {erreurs.mois && <p role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs.mois}</p>}
          </div>
          <div>
            <label htmlFor={`avis-${miseId}`} className="block text-[13.5px] font-semibold text-ink">Ton avis</label>
            <textarea id={`avis-${miseId}`} rows={4} maxLength={MAX_TEXTE_AVIS} value={texte} onChange={(e) => setTexte(e.target.value)}
              placeholder="Comment ça s'est passé ? Le devis, le respect des délais, la propreté, le contact…"
              className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-600" />
            <p className="mt-1 text-[12.5px] text-faint">{MIN_TEXTE_AVIS} caractères au moins. Pas de nom complet, de téléphone ni d&apos;adresse.</p>
            {erreurs.texte && <p role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs.texte}</p>}
          </div>
          <EnvoiPhotos photos={photos} onChange={setPhotos} max={MAX_PHOTOS_AVIS} preparer={preparerPhotoAvis}
            label={`Tes photos · facultatif, ${MAX_PHOTOS_AVIS} au plus`}
            aide="Le résultat des travaux. Évite les visages et les adresses visibles. La position GPS est retirée automatiquement." />
          {erreurs.photos && <p role="alert" className="text-[13px] text-[#b42318]">{erreurs.photos}</p>}
          <label className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
            <input type="checkbox" checked={certifie} onChange={(e) => setCertifie(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4f46e5]" />
            {`J'ai fait appel à ${nom} via AVYORA et mon avis reflète mon expérience. Je n'ai reçu aucune contrepartie.`}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={enCours || note < 1} className="btn btn-primary min-h-11 px-5 text-[14px]">{enCours ? "Envoi…" : "Envoyer mon avis"}</button>
            <button type="button" onClick={() => setOuvert(false)} className="text-[13.5px] font-semibold text-muted underline">Annuler</button>
          </div>
          <p className="text-[12.5px] text-faint">
            Daniel lit chaque avis avant de le publier. Il n&apos;est refusé que pour un motif des <Link href="/avis-artisans#regles" className="underline">règles des avis</Link>, et tu reçois ce motif par e-mail. Tu peux le modifier jusqu&apos;à sa publication.
          </p>
          {global && <p role="alert" className="text-[13px] text-[#b42318]">{global}</p>}
        </form>
      )}
      {envoye && !ouvert && <p role="status" className="mt-1.5 text-[12.5px] font-medium text-[#0b5e40]">Merci ! Ton avis est en cours de vérification.</p>}
    </div>
  );
}

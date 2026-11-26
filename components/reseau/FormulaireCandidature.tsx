"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { nettoyerImage } from "@/lib/reseau/image";
import { enregistrerDocument, preparerEnvoiDocument, soumettreCandidature, supprimerDocument, verifierMonSiret } from "@/lib/actions/reseau";
import { BUCKET_ARTISANS, DOCS, MESSAGES_ERREURS, TAILLE_MAX, TYPES_DOCUMENTS, documentsManquants, mimeAccepte, validerCandidature, type ErreursCandidature, type TypeDocument } from "@/lib/reseau/candidature";
import { METIERS } from "@/lib/reseau/metiers";
import { REGIONS, DEPARTEMENTS } from "@/lib/reseau/departements";
import type { DocumentArtisan } from "@/lib/reseau/artisan";
import type { VerifSiret } from "@/lib/reseau/siret";

/**
 * Le formulaire de candidature au Réseau AVYORA (/espace-artisan). Les fichiers partent directement au stockage privé
 * par une URL signée à usage unique (lib/actions/reseau.ts) ; le reste est envoyé d'un bloc et revérifié côté serveur.
 * Tutoiement, comme tout le site.
 */
export type ValeursCandidature = {
  siret: string; nomCommercial: string; contactNom: string; telephone: string;
  metiers: string[]; departements: string[]; presentation: string; siteWeb: string; lienAvis: string;
  decennaleAssureur: string; decennalePolice: string; decennaleFin: string;
};

type Doc = DocumentArtisan & { url: string | null };

const ERREURS_FICHIER: Record<string, string> = {
  session: "Ta session a expiré : reconnecte-toi.",
  verrouille: "Ta candidature est déjà envoyée : elle ne se modifie plus.",
  limite: "Trop d'envois en peu de temps : réessaie dans une heure.",
  type: "Ce type de fichier n'est pas accepté.",
  taille: "Ce fichier dépasse 10 Mo.",
  trop: "Tu as atteint le nombre maximum de fichiers pour cette rubrique.",
  introuvable: "Le fichier n'est pas arrivé : réessaie.",
  serveur: "L'envoi a échoué : réessaie.",
  pro: "Le réseau est réservé aux comptes professionnels : passe en compte pro depuis Mon compte.",
};

const champ = "min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand-600 aria-[invalid=true]:border-[#b42318]";

function Erreur({ id, code }: { id: string; code?: string }) {
  if (!code) return null;
  return <p id={id} className="mt-1.5 text-[13px] text-[#b42318]">{MESSAGES_ERREURS[code] ?? MESSAGES_ERREURS.invalide}</p>;
}

function Champ({
  id, label, aide, erreur, children,
}: { id: string; label: string; aide?: string; erreur?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-ink">{label}</label>
      {aide && <p id={`${id}-aide`} className="mt-0.5 text-[12.5px] text-muted">{aide}</p>}
      <div className="mt-1.5">{children}</div>
      <Erreur id={`${id}-err`} code={erreur} />
    </div>
  );
}

function Bloc({ titre, texte, children }: { titre: string; texte?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <legend className="sr-only">{titre}</legend>
      <h2 className="text-[17px] font-semibold text-ink" aria-hidden="true">{titre}</h2>
      {texte && <p className="mt-1 text-[13.5px] text-muted">{texte}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

/** Une rubrique de fichiers : la liste déposée, un bouton pour en ajouter, l'envoi direct au stockage. */
function Fichiers({
  type, aide, docs, setDocs,
}: { type: TypeDocument; aide: string; docs: Doc[]; setDocs: React.Dispatch<React.SetStateAction<Doc[]>> }) {
  const id = useId();
  const entree = useRef<HTMLInputElement>(null);
  const [envois, setEnvois] = useState(0);
  const [erreur, setErreur] = useState("");
  const miens = docs.filter((d) => d.type === type);
  const regle = DOCS[type];
  const accept = type === "photo" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp";

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur("");
    const liste = Array.from(fichiers).slice(0, Math.max(0, regle.max - miens.length));
    if (liste.length < fichiers.length) setErreur(ERREURS_FICHIER.trop);
    for (const brut of liste) {
      if (!mimeAccepte(type, brut.type)) { setErreur(`${brut.name} : ${ERREURS_FICHIER.type} ${type === "photo" ? "Photos en JPEG, PNG ou WebP." : "PDF, JPEG, PNG ou WebP."}`); continue; }
      setEnvois((n) => n + 1);
      try {
        // Une image est réencodée sans métadonnées (position GPS des chantiers comprise) ; un PDF part tel quel.
        const f = brut.type.startsWith("image/") ? await nettoyerImage(brut).catch(() => null) : brut;
        if (!f) { setErreur(`${brut.name} : ce fichier n'a pas pu être préparé, essaie avec un autre.`); continue; }
        if (f.size > TAILLE_MAX) { setErreur(`${brut.name} : ${ERREURS_FICHIER.taille}`); continue; }
        const p = await preparerEnvoiDocument({ type, taille: f.size, mime: f.type });
        if (!p.ok) { setErreur(ERREURS_FICHIER[p.erreur] ?? ERREURS_FICHIER.serveur); continue; }
        const { error } = await supabaseBrowser().storage.from(BUCKET_ARTISANS).uploadToSignedUrl(p.chemin, p.jeton, f, { contentType: f.type });
        if (error) { setErreur(`${f.name} : ${ERREURS_FICHIER.serveur}`); continue; }
        const r = await enregistrerDocument({ type, chemin: p.chemin, nom: f.name });
        if (!r.ok) { setErreur(ERREURS_FICHIER[r.erreur] ?? ERREURS_FICHIER.serveur); continue; }
        const apercu = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
        setDocs((ds) => [...ds, { ...r.document, url: apercu }]);
      } catch {
        setErreur(ERREURS_FICHIER.serveur);
      } finally {
        setEnvois((n) => n - 1);
      }
    }
    if (entree.current) entree.current.value = "";
  }

  async function retirer(d: Doc) {
    setErreur("");
    const r = await supprimerDocument(d.id).catch(() => ({ ok: false as const, erreur: "serveur" as const }));
    if (r.ok) setDocs((ds) => ds.filter((x) => x.id !== d.id));
    else setErreur(ERREURS_FICHIER[r.erreur ?? "serveur"]);
  }

  return (
    <div data-fichiers={type}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id={`${id}-titre`} className="text-[14px] font-semibold text-ink">
          {regle.titre}
          {regle.min > 0 ? <span className="font-normal text-muted"> · {regle.min > 1 ? `${regle.min} minimum` : "obligatoire"}</span> : <span className="font-normal text-muted"> · facultatif</span>}
        </p>
        <span className="num text-[12.5px] text-faint">{miens.length} / {regle.max}</span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted">{aide}</p>
      {miens.length > 0 && (
        <ul className={"mt-2.5 " + (type === "photo" ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "space-y-1.5")}>
          {miens.map((d) =>
            type === "photo" ? (
              <li key={d.id} className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
                {d.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={`Photo de chantier : ${d.nom}`} className="aspect-square w-full object-cover" />
                ) : (
                  <span className="flex aspect-square items-center justify-center px-2 text-center text-[11px] text-muted">{d.nom}</span>
                )}
                <button type="button" onClick={() => retirer(d)} className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#15172b]/75 text-white hover:bg-[#15172b]" aria-label={`Retirer ${d.nom}`}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </li>
            ) : (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13.5px]">
                <span className="min-w-0 truncate text-ink">{d.nom}</span>
                <button type="button" onClick={() => retirer(d)} className="shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-muted hover:bg-surface hover:text-[#b42318]">Retirer<span className="sr-only"> {d.nom}</span></button>
              </li>
            ),
          )}
        </ul>
      )}
      {miens.length < regle.max && (
        <div className="mt-2.5">
          <input
            ref={entree}
            id={`${id}-entree`}
            type="file"
            accept={accept}
            multiple={regle.max > 1}
            className="sr-only"
            aria-labelledby={`${id}-titre`}
            onChange={(e) => envoyer(e.target.files)}
          />
          <label htmlFor={`${id}-entree`} className={"btn btn-outline min-h-11 cursor-pointer " + (envois ? "pointer-events-none opacity-60" : "")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 11V3m0 0L5 6m3-3 3 3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {envois ? "Envoi en cours…" : type === "photo" ? "Ajouter des photos" : "Ajouter un fichier"}
          </label>
        </div>
      )}
      {erreur && <p role="alert" className="mt-2 text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

function Departements({ valeur, onChange, erreur }: { valeur: string[]; onChange: (v: string[]) => void; erreur?: string }) {
  const choisis = new Set(valeur);
  const basculer = (codes: string[], oui: boolean) => {
    const s = new Set(choisis);
    codes.forEach((c) => (oui ? s.add(c) : s.delete(c)));
    onChange([...s]);
  };
  return (
    <div role="group" aria-labelledby="deps-titre" aria-describedby={erreur ? "deps-err" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id="deps-titre" className="text-[14px] font-semibold text-ink">Départements où tu interviens</p>
        <span className="num text-[12.5px] text-muted">{valeur.length} sélectionné{valeur.length > 1 ? "s" : ""}</span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted">Les clients de ces départements pourront te choisir. Ouvre une région pour cocher ses départements.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(DEPARTEMENTS.map(([c]) => c))} className="btn btn-ghost min-h-9 px-3 text-[13px]">Toute la France</button>
        {valeur.length > 0 && <button type="button" onClick={() => onChange([])} className="btn btn-ghost min-h-9 px-3 text-[13px]">Tout décocher</button>}
      </div>
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {REGIONS.map((r) => {
          const codes = r.departements.map(([c]) => c);
          const n = codes.filter((c) => choisis.has(c)).length;
          return (
            <details key={r.nom} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[14px] text-ink hover:bg-surface-2">
                <span className="font-medium">{r.nom}</span>
                <span className="flex items-center gap-2">
                  {n > 0 && <span className="num rounded-full bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand-700">{n === codes.length ? "toute la région" : `${n} / ${codes.length}`}</span>}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-faint transition-transform group-open:rotate-180"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </summary>
              <div className="bg-surface-2/60 px-4 pb-3 pt-1">
                <button type="button" onClick={() => basculer(codes, n < codes.length)} className="mb-2 rounded-lg px-2 py-1 text-[13px] font-semibold text-brand-700 hover:bg-brand-50">
                  {n < codes.length ? `Cocher toute la région ${r.nom}` : `Décocher toute la région ${r.nom}`}
                </button>
                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {r.departements.map(([c, nom]) => (
                    <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                      <input type="checkbox" checked={choisis.has(c)} onChange={(e) => basculer([c], e.target.checked)} className="h-4 w-4 accent-[var(--color-brand-600)]" />
                      {nom} <span className="num text-faint">({c})</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <Erreur id="deps-err" code={erreur} />
    </div>
  );
}

/** Les champs qui ont une phrase d'aide sous leur titre (liée par aria-describedby). */
const AIDES = new Set(["nomCommercial", "presentation", "lienAvis"]);

const LIBELLES_CHAMPS: Record<string, string> = {
  siret: "SIRET", contactNom: "Ton nom", telephone: "Portable", metiers: "Métiers", departements: "Départements",
  decennaleAssureur: "Assureur décennale", decennalePolice: "Numéro de contrat", decennaleFin: "Fin de validité",
  siteWeb: "Site web", lienAvis: "Lien vers tes avis", presentation: "Présentation", nomCommercial: "Nom commercial",
  conditions: "Conditions du réseau", documents: "Documents",
};

export default function FormulaireCandidature({
  initial, documents, email, completer,
}: { initial: ValeursCandidature; documents: Doc[]; email: string; completer: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [docs, setDocs] = useState<Doc[]>(documents);
  const [conditions, setConditions] = useState(false);
  const [erreurs, setErreurs] = useState<ErreursCandidature>({});
  const [global, setGlobal] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [siret, setSiret] = useState<{ etat: "attente" | "ok" | "erreur"; verif?: VerifSiret; message?: string } | null>(null);
  const resume = useRef<HTMLDivElement>(null);

  const maj = <K extends keyof ValeursCandidature>(k: K, val: ValeursCandidature[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    if (erreurs[k]) setErreurs((e) => ({ ...e, [k]: undefined }));
  };
  const attrs = (k: string) => ({
    id: `c-${k}`,
    "aria-invalid": erreurs[k as keyof ErreursCandidature] ? true : undefined,
    "aria-describedby": [erreurs[k as keyof ErreursCandidature] ? `c-${k}-err` : "", AIDES.has(k) ? `c-${k}-aide` : ""].filter(Boolean).join(" ") || undefined,
  });

  async function verifier() {
    setSiret({ etat: "attente" });
    const r = await verifierMonSiret(v.siret).catch(() => null);
    if (!r) return setSiret({ etat: "erreur", message: "La vérification n'a pas pu se faire : tu peux quand même envoyer ta candidature." });
    if (!r.ok) return setSiret({ etat: "erreur", message: r.erreur === "limite" ? "Trop de vérifications : réessaie plus tard." : MESSAGES_ERREURS[r.erreur === "cle" ? "cle" : "invalide"] });
    setSiret({ etat: "ok", verif: r.verif });
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setGlobal("");
    // Les mêmes règles que le serveur, d'abord ici : les erreurs s'affichent tout de suite (le serveur revérifie tout).
    const local = validerCandidature({ ...v, conditions });
    const manque = documentsManquants(Object.fromEntries(TYPES_DOCUMENTS.map((t) => [t, docs.filter((d) => d.type === t).length])));
    if (!local.ok || manque) {
      setErreurs({ ...(local.ok ? {} : local.erreurs), ...(manque ? { documents: manque } : {}) });
      requestAnimationFrame(() => resume.current?.focus());
      return;
    }
    setEnvoi(true);
    try {
      const r = await soumettreCandidature({ ...v, conditions });
      if (r.ok) { router.refresh(); window.scrollTo({ top: 0 }); return; }
      if (r.erreurs) setErreurs(r.erreurs);
      else setErreurs({});
      setGlobal(r.erreurs ? "" : r.erreur === "limite" ? "Trop d'envois en peu de temps : réessaie dans une heure." : r.erreur === "verrouille" ? "Ta candidature est déjà envoyée." : r.erreur === "session" ? "Ta session a expiré : reconnecte-toi." : r.erreur === "pro" ? "Le réseau est réservé aux comptes professionnels : passe en compte pro depuis Mon compte." : "L'envoi a échoué : réessaie dans un instant.");
      requestAnimationFrame(() => resume.current?.focus());
    } catch {
      setGlobal("L'envoi a échoué : réessaie dans un instant.");
      requestAnimationFrame(() => resume.current?.focus());
    } finally {
      setEnvoi(false);
    }
  }

  const listeErreurs = Object.entries(erreurs).filter(([, c]) => c);
  const manquants = erreurs.documents ? erreurs.documents.split(",").map((t) => DOCS[t as TypeDocument]?.titre).filter(Boolean) : [];
  const vs = siret?.verif;

  return (
    <form onSubmit={envoyer} noValidate className="space-y-5" data-candidature="">
      {(listeErreurs.length > 0 || global) && (
        <div ref={resume} tabIndex={-1} role="alert" className="scroll-mt-28 rounded-2xl border border-[#f1b8b2] bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15] outline-none">
          {global || (
            <>
              <p className="font-semibold">Quelques points à corriger avant d'envoyer :</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {listeErreurs.map(([k, c]) => (
                  <li key={k}>
                    {k === "documents" ? `Il manque : ${manquants.join(", ").toLowerCase()} (3 photos minimum).` : <a href={k === "departements" ? "#deps-titre" : `#c-${k}`} className="underline">{LIBELLES_CHAMPS[k] ?? k}</a>}
                    {k !== "documents" && ` : ${(MESSAGES_ERREURS[c!] ?? MESSAGES_ERREURS.invalide).toLowerCase()}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Bloc titre="Ton entreprise" texte="On vérifie ton SIRET auprès du répertoire officiel des entreprises : l'établissement doit être actif.">
        <Champ id="c-siret" label="Numéro SIRET (14 chiffres)" erreur={erreurs.siret}>
          <div className="flex flex-wrap gap-2">
            <input {...attrs("siret")} inputMode="numeric" autoComplete="off" maxLength={20} placeholder="123 456 789 00012" value={v.siret}
              onChange={(e) => { maj("siret", e.target.value); setSiret(null); }} className={champ + " num max-w-[15rem] flex-1"} />
            <button type="button" onClick={verifier} disabled={siret?.etat === "attente" || v.siret.replace(/\D/g, "").length !== 14} className="btn btn-outline min-h-11">
              {siret?.etat === "attente" ? "Vérification…" : "Vérifier"}
            </button>
          </div>
          {siret?.etat === "erreur" && <p role="status" className="mt-2 text-[13px] text-[#b42318]">{siret.message}</p>}
          {vs && (
            <div role="status" className={"mt-2 rounded-xl px-3 py-2 text-[13.5px] " + (vs.statut === "actif" ? "bg-[#e9f7f1] text-[#0b5e40]" : vs.statut === "ferme" ? "bg-[#fdf0ef] text-[#8a1f15]" : "bg-surface-2 text-muted")}>
              {vs.statut === "actif" && <><b>{vs.nom ?? "Établissement actif"}</b>{vs.adresse ? ` · ${vs.adresse}` : ""}{vs.rge ? " · label RGE" : ""}</>}
              {vs.statut === "ferme" && "Cet établissement est fermé d'après le répertoire des entreprises."}
              {vs.statut === "introuvable" && "Ce SIRET n'apparaît pas encore dans le répertoire. Tu peux envoyer ta candidature : Daniel vérifiera."}
              {vs.statut === "indisponible" && "Le répertoire ne répond pas pour l'instant. Tu peux envoyer ta candidature : Daniel vérifiera."}
            </div>
          )}
        </Champ>
        <Champ id="c-nomCommercial" label="Nom commercial (facultatif)" aide="Si tes clients te connaissent sous un autre nom que celui de l'entreprise." erreur={erreurs.nomCommercial}>
          <input {...attrs("nomCommercial")} autoComplete="organization" maxLength={200} value={v.nomCommercial} onChange={(e) => maj("nomCommercial", e.target.value)} className={champ} />
        </Champ>
      </Bloc>

      <Bloc titre="Te joindre" texte={`Daniel t'appelle à ce numéro avant de valider ta candidature. Les e-mails partent à ${email}.`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="c-contactNom" label="Ton nom et prénom" erreur={erreurs.contactNom}>
            <input {...attrs("contactNom")} autoComplete="name" maxLength={120} value={v.contactNom} onChange={(e) => maj("contactNom", e.target.value)} className={champ} />
          </Champ>
          <Champ id="c-telephone" label="Ton portable" erreur={erreurs.telephone}>
            <input {...attrs("telephone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="06 12 34 56 78" value={v.telephone} onChange={(e) => maj("telephone", e.target.value)} className={champ} />
          </Champ>
        </div>
      </Bloc>

      <Bloc titre="Ton activité" texte="Ce que tu fais, et où. Coche tout ce que tu réalises toi-même ou avec ton équipe.">
        <div role="group" aria-labelledby="c-metiers" aria-describedby={erreurs.metiers ? "c-metiers-err" : undefined}>
          <p id="c-metiers" tabIndex={-1} className="text-[14px] font-semibold text-ink">Tes métiers</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {METIERS.map((m) => {
              const on = v.metiers.includes(m.cle);
              return (
                <label key={m.cle} className={"flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] transition-colors " + (on ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line bg-surface text-ink hover:border-line-strong")}>
                  <input type="checkbox" checked={on} onChange={(e) => maj("metiers", e.target.checked ? [...v.metiers, m.cle] : v.metiers.filter((x) => x !== m.cle))} className="h-4 w-4 accent-[var(--color-brand-600)]" />
                  {m.label}
                </label>
              );
            })}
          </div>
          <Erreur id="c-metiers-err" code={erreurs.metiers} />
        </div>
        <Departements valeur={v.departements} onChange={(d) => maj("departements", d)} erreur={erreurs.departements} />
      </Bloc>

      <Bloc titre="Ton assurance décennale" texte="Obligatoire pour entrer dans le réseau : l'attestation doit être en cours de validité et couvrir les métiers cochés.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="c-decennaleAssureur" label="Assureur" erreur={erreurs.decennaleAssureur}>
            <input {...attrs("decennaleAssureur")} maxLength={120} value={v.decennaleAssureur} onChange={(e) => maj("decennaleAssureur", e.target.value)} className={champ} />
          </Champ>
          <Champ id="c-decennalePolice" label="Numéro de contrat" erreur={erreurs.decennalePolice}>
            <input {...attrs("decennalePolice")} maxLength={80} value={v.decennalePolice} onChange={(e) => maj("decennalePolice", e.target.value)} className={champ} />
          </Champ>
        </div>
        <Champ id="c-decennaleFin" label="Valable jusqu'au" erreur={erreurs.decennaleFin}>
          <input {...attrs("decennaleFin")} type="date" value={v.decennaleFin} onChange={(e) => maj("decennaleFin", e.target.value)} className={champ + " num max-w-[13rem]"} />
        </Champ>
        <Fichiers type="decennale" aide="L'attestation de ton assureur, en PDF ou en photo lisible (10 Mo maximum)." docs={docs} setDocs={setDocs} />
        <Fichiers type="rc_pro" aide="Ton attestation de responsabilité civile professionnelle, si tu l'as sous la main." docs={docs} setDocs={setDocs} />
      </Bloc>

      <Bloc titre="Tes réalisations" texte="Des photos de chantiers que tu as faits : c'est ce qui donne confiance aux clients, et à Daniel.">
        <Fichiers type="photo" aide="Au moins 3 photos de tes chantiers (avant / après bienvenus), en JPEG, PNG ou WebP, 10 Mo maximum chacune." docs={docs} setDocs={setDocs} />
        <Champ id="c-presentation" label="Présente ton entreprise (facultatif)" aide="Ton expérience, ta spécialité, la taille de ton équipe. 2 000 caractères maximum." erreur={erreurs.presentation}>
          <textarea {...attrs("presentation")} rows={4} maxLength={2000} value={v.presentation} onChange={(e) => maj("presentation", e.target.value)} className={champ + " min-h-28 leading-snug"} />
        </Champ>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="c-siteWeb" label="Site web (facultatif)" erreur={erreurs.siteWeb}>
            <input {...attrs("siteWeb")} type="url" inputMode="url" autoComplete="url" maxLength={300} placeholder="https://" value={v.siteWeb} onChange={(e) => maj("siteWeb", e.target.value)} className={champ} />
          </Champ>
          <Champ id="c-lienAvis" label="Lien vers tes avis clients (facultatif)" aide="Ta fiche Google, par exemple." erreur={erreurs.lienAvis}>
            <input {...attrs("lienAvis")} type="url" inputMode="url" maxLength={300} placeholder="https://" value={v.lienAvis} onChange={(e) => maj("lienAvis", e.target.value)} className={champ} />
          </Champ>
        </div>
      </Bloc>

      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-ink">
          <input id="c-conditions" type="checkbox" checked={conditions} onChange={(e) => { setConditions(e.target.checked); if (erreurs.conditions) setErreurs((x) => ({ ...x, conditions: undefined })); }}
            aria-invalid={erreurs.conditions ? true : undefined} aria-describedby={erreurs.conditions ? "c-conditions-err" : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]" />
          <span>
            J'accepte les <Link href="/conditions-reseau" target="_blank" className="font-semibold text-brand-700 underline">conditions du Réseau AVYORA</Link> (nouvel onglet) et que Daniel m'appelle pour faire connaissance.
            Je certifie que les informations et documents fournis sont exacts.
          </span>
        </label>
        <Erreur id="c-conditions-err" code={erreurs.conditions} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={envoi} className="btn btn-primary min-h-12 px-6 text-[15px]">
            {envoi ? "Envoi…" : completer ? "Renvoyer ma candidature" : "Envoyer ma candidature"}
          </button>
          <p className="text-[12.5px] text-muted">Gratuit. Tu reçois un e-mail de confirmation.</p>
        </div>
      </div>
    </form>
  );
}

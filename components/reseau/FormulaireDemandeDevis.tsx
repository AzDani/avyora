"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { nettoyerImage } from "@/lib/reseau/image";
import { chercherArtisans, envoyerDemandeDevis, preparerPhotoDemande } from "@/lib/actions/devis";
import { BUCKET_ARTISANS, TAILLE_MAX } from "@/lib/reseau/candidature";
import { DELAIS, MAX_ARTISANS, MAX_PHOTOS_DEMANDE, MESSAGES_DEMANDE, validerDemandeDevis, type ArtisanPropose, type ErreursDemande } from "@/lib/reseau/demande";
import { METIERS, labelMetier } from "@/lib/reseau/metiers";
import { departementDuCodePostal, nomDepartement } from "@/lib/reseau/departements";

/**
 * La demande de devis d'un client au Réseau AVYORA (/demandes-devis/nouvelle). Le type de travaux et le code postal
 * suffisent pour voir les artisans vérifiés de son département ; il en choisit jusqu'à 3. Le reste est facultatif.
 * Les photos partent directement au stockage privé (URL signée). Le serveur revérifie tout.
 */
export type InitialDemande = {
  metiers: string[]; codePostal: string; ville: string; prenom: string; telephone: string;
  projetId: string; projetNom: string; estimationTtc: number | null;
};

const champ = "min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand-600 aria-[invalid=true]:border-[#b42318]";
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Bloc({ titre, texte, children, id }: { titre: string; texte?: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-28 rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <h2 id={id} className="text-[17px] font-semibold text-ink">{titre}</h2>
      {texte && <p className="mt-1 text-[13.5px] text-muted">{texte}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Erreur({ id, code }: { id: string; code?: string }) {
  if (!code) return null;
  return <p id={id} className="mt-1.5 text-[13px] text-[#b42318]">{MESSAGES_DEMANDE[code] ?? MESSAGES_DEMANDE.invalide}</p>;
}

function CarteArtisan({ a, choisi, bloque, onChange, metiersDemandes }: { a: ArtisanPropose; choisi: boolean; bloque: boolean; onChange: (v: boolean) => void; metiersDemandes: string[] }) {
  return (
    <li className={"rounded-2xl border p-4 transition-colors " + (choisi ? "border-brand-600 bg-brand-50/50" : "border-line bg-surface")}>
      <label className={"flex items-start gap-3 " + (bloque ? "cursor-not-allowed" : "cursor-pointer")}>
        <input type="checkbox" checked={choisi} disabled={bloque} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15.5px] font-semibold text-ink">{a.nom}</span>
            <span className="rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b5e40]">Décennale et SIRET vérifiés</span>
            {a.rge && <span className="rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b5e40]">RGE</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            {a.metiers.map((m) => (
              <span key={m} className={"rounded-full px-2 py-0.5 text-[12px] " + (metiersDemandes.includes(m) ? "bg-brand-50 font-semibold text-brand-700" : "bg-surface-2 text-muted")}>{labelMetier(m)}</span>
            ))}
          </span>
          {a.presentation && <span className="mt-2 line-clamp-3 block whitespace-pre-line text-[13.5px] leading-snug text-muted">{a.presentation}</span>}
        </span>
      </label>
      {a.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 pl-8">
          {a.photos.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt={`Chantier réalisé par ${a.nom}, photo ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-line object-cover" />
          ))}
        </div>
      )}
      {(a.siteWeb || a.lienAvis) && (
        <p className="mt-2 flex flex-wrap gap-x-4 pl-8 text-[13px]">
          {a.siteWeb && <a href={a.siteWeb} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 underline">Son site</a>}
          {a.lienAvis && <a href={a.lienAvis} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 underline">Ses avis clients</a>}
        </p>
      )}
    </li>
  );
}

export default function FormulaireDemandeDevis({ initial }: { initial: InitialDemande }) {
  const router = useRouter();
  const [metiers, setMetiers] = useState<string[]>(initial.metiers);
  const [codePostal, setCodePostal] = useState(initial.codePostal);
  const [ville, setVille] = useState(initial.ville);
  const [description, setDescription] = useState("");
  const [quantites, setQuantites] = useState("");
  const [delai, setDelai] = useState("");
  const [prenom, setPrenom] = useState(initial.prenom);
  const [telephone, setTelephone] = useState(initial.telephone);
  const [joindre, setJoindre] = useState(!!initial.projetId && initial.estimationTtc != null);
  const [consentement, setConsentement] = useState(false);
  const [choix, setChoix] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ chemin: string; apercu: string }[]>([]);
  const [envoisPhotos, setEnvoisPhotos] = useState(0);
  const [erreurPhoto, setErreurPhoto] = useState("");
  const [liste, setListe] = useState<{ etat: "vide" | "charge" | "ok" | "erreur"; artisans: ArtisanPropose[]; dep?: string }>({ etat: "vide", artisans: [] });
  const [erreurs, setErreurs] = useState<ErreursDemande>({});
  const [global, setGlobal] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const resume = useRef<HTMLDivElement>(null);
  const entreePhotos = useRef<HTMLInputElement>(null);

  const dep = departementDuCodePostal(codePostal);
  const cleRecherche = dep && metiers.length ? `${codePostal}|${[...metiers].sort().join(",")}` : "";

  // La liste des artisans suit les travaux et le code postal (une recherche 400 ms après la dernière frappe).
  useEffect(() => {
    if (!cleRecherche) { setListe({ etat: "vide", artisans: [] }); return; }
    let annule = false;
    setListe((l) => ({ ...l, etat: "charge" }));
    const t = setTimeout(async () => {
      const r = await chercherArtisans({ codePostal, metiers }).catch(() => null);
      if (annule) return;
      if (!r || !r.ok) { setListe({ etat: "erreur", artisans: [] }); return; }
      setListe({ etat: "ok", artisans: r.artisans, dep: r.departement });
      setChoix((c) => c.filter((id) => r.artisans.some((a) => a.id === id)));
    }, 400);
    return () => { annule = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleRecherche]);

  const effacer = (k: keyof ErreursDemande) => erreurs[k] && setErreurs((e) => ({ ...e, [k]: undefined }));

  async function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreurPhoto("");
    const lot = Array.from(fichiers).slice(0, Math.max(0, MAX_PHOTOS_DEMANDE - photos.length));
    if (lot.length < fichiers.length) setErreurPhoto(`${MAX_PHOTOS_DEMANDE} photos au plus.`);
    for (const brut of lot) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(brut.type)) { setErreurPhoto(`${brut.name} : photos en JPEG, PNG ou WebP seulement.`); continue; }
      setEnvoisPhotos((n) => n + 1);
      try {
        // Réencodée sans métadonnées (position GPS comprise) avant de partir : lib/reseau/image.ts.
        const f = await nettoyerImage(brut).catch(() => null);
        if (!f) { setErreurPhoto(`${brut.name} : cette photo n'a pas pu être préparée, essaie avec une autre.`); continue; }
        if (f.size > TAILLE_MAX) { setErreurPhoto(`${brut.name} : 10 Mo au plus.`); continue; }
        const p = await preparerPhotoDemande({ taille: f.size, mime: f.type });
        if (!p.ok) { setErreurPhoto(p.erreur === "limite" ? "Trop d'envois en peu de temps : réessaie plus tard." : "L'envoi a échoué : réessaie."); continue; }
        const { error } = await supabaseBrowser().storage.from(BUCKET_ARTISANS).uploadToSignedUrl(p.chemin, p.jeton, f, { contentType: f.type });
        if (error) { setErreurPhoto("L'envoi a échoué : réessaie."); continue; }
        setPhotos((ph) => [...ph, { chemin: p.chemin, apercu: URL.createObjectURL(f) }]);
      } catch {
        setErreurPhoto("L'envoi a échoué : réessaie.");
      } finally {
        setEnvoisPhotos((n) => n - 1);
      }
    }
    if (entreePhotos.current) entreePhotos.current.value = "";
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setGlobal("");
    const valeurs = {
      metiers, codePostal, ville, description, quantites, delai, artisans: choix, prenom, telephone,
      joindreEstimation: joindre, projetId: initial.projetId, consentement, photos: photos.map((p) => p.chemin),
    };
    const local = validerDemandeDevis(valeurs);
    const sansChoix = liste.etat === "ok" && liste.artisans.length > 0 && choix.length === 0;
    if (!local.ok || sansChoix) {
      setErreurs({ ...(local.ok ? {} : local.erreurs), ...(sansChoix ? { artisans: "choisir" } : {}) });
      requestAnimationFrame(() => resume.current?.focus());
      return;
    }
    setEnvoi(true);
    try {
      const r = await envoyerDemandeDevis(valeurs);
      if (r.ok) { router.push("/demandes-devis?envoyee=1"); return; }
      if (r.erreurs) setErreurs(r.erreurs);
      setGlobal(r.erreurs ? "" : r.erreur === "limite" ? "Tu as déjà fait plusieurs demandes aujourd'hui : réessaie demain." : r.erreur === "pro" ? "Les demandes de devis sont réservées à AVYORA Pro." : r.erreur === "session" ? "Ta session a expiré : reconnecte-toi." : "L'envoi a échoué : réessaie dans un instant.");
      requestAnimationFrame(() => resume.current?.focus());
    } catch {
      setGlobal("L'envoi a échoué : réessaie dans un instant.");
      requestAnimationFrame(() => resume.current?.focus());
    } finally {
      setEnvoi(false);
    }
  }

  const listeErreurs = Object.entries(erreurs).filter(([, c]) => c);
  const LIB: Record<string, string> = { metiers: "Travaux", codePostal: "Code postal", artisans: "Artisans", prenom: "Prénom", telephone: "Portable", consentement: "Accord", photos: "Photos", description: "Description", quantites: "Quantités", ville: "Ville", delai: "Délai" };
  const ANCRE: Record<string, string> = { metiers: "dv-travaux", artisans: "dv-artisans", consentement: "dv-consentement", photos: "dv-details" };

  return (
    <form onSubmit={envoyer} noValidate className="space-y-5" data-demande-devis="">
      {(listeErreurs.length > 0 || global) && (
        <div ref={resume} tabIndex={-1} role="alert" className="scroll-mt-28 rounded-2xl border border-[#f1b8b2] bg-[#fdf0ef] p-4 text-[14px] text-[#8a1f15] outline-none">
          {global || (
            <>
              <p className="font-semibold">Quelques points avant d&apos;envoyer :</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {listeErreurs.map(([k, c]) => (
                  <li key={k}><a href={`#${ANCRE[k] ?? `dv-${k}`}`} className="underline">{LIB[k] ?? k}</a> : {(MESSAGES_DEMANDE[c!] ?? MESSAGES_DEMANDE.invalide).toLowerCase()}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Bloc id="dv-travaux" titre="Tes travaux" texte="Coche ce que tu veux faire faire : c'est ce qui permet aux artisans de savoir si c'est dans leurs cordes.">
        {initial.projetNom && <p className="rounded-xl bg-brand-50 px-3 py-2 text-[13px] text-brand-700">Pré-rempli depuis ton projet « {initial.projetNom} ». Ajuste si besoin.</p>}
        <div role="group" aria-labelledby="dv-travaux" aria-describedby={erreurs.metiers ? "dv-metiers-err" : undefined}>
          <div className="grid gap-2 sm:grid-cols-2">
            {METIERS.filter((m) => m.cle !== "tce").map((m) => {
              const on = metiers.includes(m.cle);
              return (
                <label key={m.cle} className={"flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] transition-colors " + (on ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line bg-surface text-ink hover:border-line-strong")}>
                  <input type="checkbox" checked={on} onChange={(e) => { setMetiers((x) => (e.target.checked ? [...x, m.cle] : x.filter((y) => y !== m.cle))); effacer("metiers"); }} className="h-4 w-4 accent-[var(--color-brand-600)]" />
                  {m.label}
                </label>
              );
            })}
          </div>
          <Erreur id="dv-metiers-err" code={erreurs.metiers} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <div>
            <label htmlFor="dv-codePostal" className="block text-[14px] font-semibold text-ink">Code postal du chantier</label>
            <input id="dv-codePostal" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={codePostal}
              onChange={(e) => { setCodePostal(e.target.value.replace(/\D/g, "").slice(0, 5)); effacer("codePostal"); }}
              aria-invalid={erreurs.codePostal ? true : undefined} aria-describedby={erreurs.codePostal ? "dv-codePostal-err" : undefined} className={champ + " num mt-1.5"} />
            <Erreur id="dv-codePostal-err" code={erreurs.codePostal} />
          </div>
          <div>
            <label htmlFor="dv-ville" className="block text-[14px] font-semibold text-ink">Ville (facultatif)</label>
            <input id="dv-ville" autoComplete="address-level2" maxLength={120} value={ville} onChange={(e) => setVille(e.target.value)} className={champ + " mt-1.5"} />
          </div>
        </div>
      </Bloc>

      <Bloc id="dv-artisans" titre={`Choisis tes artisans (${MAX_ARTISANS} au plus)`} texte="Des artisans du Réseau AVYORA qui interviennent dans ton département : SIRET, assurance décennale et chantiers vérifiés, entretien avec Daniel. Leurs coordonnées t'arrivent quand ils acceptent.">
        <div aria-live="polite">
          {liste.etat === "vide" && <p className="rounded-2xl bg-surface-2 px-4 py-5 text-center text-[14px] text-muted">Coche tes travaux et indique le code postal pour voir les artisans disponibles.</p>}
          {liste.etat === "charge" && <p className="rounded-2xl bg-surface-2 px-4 py-5 text-center text-[14px] text-muted">Recherche des artisans…</p>}
          {liste.etat === "erreur" && <p className="rounded-2xl bg-[#fdf0ef] px-4 py-5 text-center text-[14px] text-[#8a1f15]">La recherche n&apos;a pas abouti. Change un critère pour réessayer.</p>}
          {liste.etat === "ok" && liste.artisans.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-[14px] leading-relaxed text-muted">
              Pas encore d&apos;artisan du réseau en {liste.dep ? nomDepartement(liste.dep) : "ton département"} pour ces travaux. <b className="text-ink">Envoie quand même ta demande</b>{" "}: Daniel cherche, et on te prévient dès qu&apos;un artisan vérifié peut te répondre.
            </p>
          )}
          {liste.etat === "ok" && liste.artisans.length > 0 && (
            <>
              <p className="mb-2 text-[13px] text-muted"><span className="num font-semibold text-ink">{choix.length}</span> / {MAX_ARTISANS} choisis</p>
              <ul className="space-y-2.5">
                {liste.artisans.map((a) => (
                  <CarteArtisan key={a.id} a={a} metiersDemandes={metiers} choisi={choix.includes(a.id)} bloque={!choix.includes(a.id) && choix.length >= MAX_ARTISANS}
                    onChange={(v) => { setChoix((c) => (v ? [...c, a.id].slice(0, MAX_ARTISANS) : c.filter((x) => x !== a.id))); effacer("artisans"); }} />
                ))}
              </ul>
            </>
          )}
        </div>
        <Erreur id="dv-artisans-err" code={erreurs.artisans} />
      </Bloc>

      <Bloc id="dv-details" titre="Les détails (facultatif)" texte="Tout ce qui aide l'artisan à chiffrer. Si tu ne sais pas, laisse vide : il viendra voir ou te posera les questions.">
        <div>
          <label htmlFor="dv-description" className="block text-[14px] font-semibold text-ink">Description des travaux</label>
          <textarea id="dv-description" rows={4} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} className={champ + " mt-1.5 min-h-28 leading-snug"}
            placeholder="Ex. : refaire la salle de bain, remplacer la baignoire par une douche à l'italienne." />
        </div>
        <div>
          <label htmlFor="dv-quantites" className="block text-[14px] font-semibold text-ink">Surfaces et quantités</label>
          <textarea id="dv-quantites" rows={2} maxLength={1500} value={quantites} onChange={(e) => setQuantites(e.target.value)} className={champ + " mt-1.5 leading-snug"}
            placeholder="Ex. : 6 m² au sol, 18 m² de carrelage mural." />
        </div>
        <fieldset>
          <legend className="text-[14px] font-semibold text-ink">Quand souhaites-tu commencer ?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DELAIS.map(([k, l]) => (
              <label key={k} className={"inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 text-[13.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 " + (delai === k ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line text-ink hover:border-line-strong")}>
                <input type="radio" name="delai" value={k} checked={delai === k} onChange={() => setDelai(k)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <p id="dv-photos-titre" className="text-[14px] font-semibold text-ink">Photos <span className="font-normal text-muted">· {MAX_PHOTOS_DEMANDE} au plus</span></p>
          {photos.length > 0 && (
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {photos.map((p, i) => (
                <li key={p.chemin} className="relative overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.apercu} alt={`Photo ${i + 1} de tes travaux`} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => setPhotos((ph) => ph.filter((x) => x.chemin !== p.chemin))} aria-label={`Retirer la photo ${i + 1}`}
                    className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#15172b]/75 text-white hover:bg-[#15172b]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photos.length < MAX_PHOTOS_DEMANDE && (
            <div className="mt-2">
              <input ref={entreePhotos} id="dv-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-labelledby="dv-photos-titre" onChange={(e) => ajouterPhotos(e.target.files)} />
              <label htmlFor="dv-photos" className={"btn btn-outline min-h-11 cursor-pointer " + (envoisPhotos ? "pointer-events-none opacity-60" : "")}>
                {envoisPhotos ? "Envoi en cours…" : "Ajouter des photos"}
              </label>
            </div>
          )}
          {erreurPhoto && <p role="alert" className="mt-2 text-[13px] text-[#b42318]">{erreurPhoto}</p>}
          <Erreur id="dv-photos-err" code={erreurs.photos} />
        </div>
        {initial.projetId && initial.estimationTtc != null && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3.5 text-[14px] leading-snug text-ink">
            <input type="checkbox" checked={joindre} onChange={(e) => setJoindre(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]" />
            <span>
              <b className="font-semibold">Joindre mon estimation AVYORA</b> ({euros(initial.estimationTtc)}, postes par lot). Les artisans chiffrent sur la même base : tes devis seront plus faciles à comparer.
            </span>
          </label>
        )}
      </Bloc>

      <Bloc id="dv-contact" titre="Te joindre" texte="Ces informations ne sont transmises qu'aux artisans qui acceptent ta demande.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dv-prenom" className="block text-[14px] font-semibold text-ink">Ton prénom</label>
            <input id="dv-prenom" autoComplete="given-name" maxLength={60} value={prenom} onChange={(e) => { setPrenom(e.target.value); effacer("prenom"); }}
              aria-invalid={erreurs.prenom ? true : undefined} aria-describedby={erreurs.prenom ? "dv-prenom-err" : undefined} className={champ + " mt-1.5"} />
            <Erreur id="dv-prenom-err" code={erreurs.prenom} />
          </div>
          <div>
            <label htmlFor="dv-telephone" className="block text-[14px] font-semibold text-ink">Ton portable</label>
            <input id="dv-telephone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="06 12 34 56 78" value={telephone} onChange={(e) => { setTelephone(e.target.value); effacer("telephone"); }}
              aria-invalid={erreurs.telephone ? true : undefined} aria-describedby={erreurs.telephone ? "dv-telephone-err" : undefined} className={champ + " mt-1.5"} />
            <Erreur id="dv-telephone-err" code={erreurs.telephone} />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-ink">
          <input id="dv-consentement" type="checkbox" checked={consentement} onChange={(e) => { setConsentement(e.target.checked); effacer("consentement"); }}
            aria-invalid={erreurs.consentement ? true : undefined} aria-describedby={erreurs.consentement ? "dv-consentement-err" : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]" />
          <span>
            J&apos;accepte que ma demande soit envoyée aux artisans choisis, et que mon prénom, mon portable et mon e-mail soient transmis à ceux qui l&apos;acceptent, pour me contacter à son sujet. <Link href="/confidentialite" className="font-semibold text-brand-700 underline">Confidentialité</Link>
          </span>
        </label>
        <Erreur id="dv-consentement-err" code={erreurs.consentement} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={envoi || envoisPhotos > 0} className="btn btn-primary min-h-12 px-6 text-[15px]">{envoi ? "Envoi…" : "Envoyer ma demande"}</button>
          <p className="text-[12.5px] text-muted">Gratuit et sans engagement. Tu reçois un récapitulatif par e-mail.</p>
        </div>
      </Bloc>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changerPortable, demanderMajDossier } from "@/lib/actions/avis";
import { enregistrerDocument, preparerEnvoiDocument } from "@/lib/actions/reseau";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BUCKET_ARTISANS, TAILLE_MAX } from "@/lib/reseau/candidature";

/**
 * « Mon dossier » de l'artisan validé (25/11/2026) : le portable change tout de suite ; la nouvelle décennale
 * (attestation + assureur, contrat, date) et un changement de métiers ou de zone partent à Daniel, qui les applique.
 */
const champ = "mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand-600";

export function ChangerPortable({ actuel }: { actuel: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [tel, setTel] = useState(actuel);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);
  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="btn btn-outline min-h-10 px-4 text-[13.5px]">Changer mon portable</button>;
  return (
    <form
      className="w-full rounded-2xl border border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await changerPortable(tel).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
          setRetour({ ok: r.ok, msg: r.ok ? "Ton portable est changé." : r.erreur ?? "Réessaie dans un instant." });
          if (r.ok) { setOuvert(false); router.refresh(); }
        });
      }}
    >
      <label htmlFor="nv-tel" className="text-[13.5px] font-semibold text-ink">Ton nouveau portable</label>
      <input id="nv-tel" type="tel" inputMode="tel" autoComplete="tel" value={tel} onChange={(e) => setTel(e.target.value)} className={champ + " sm:w-64"} />
      <p className="mt-1 text-[12.5px] text-faint">Le client le reçoit quand tu acceptes sa demande. Il change tout de suite.</p>
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={enCours} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Enregistrer</button>
        <button type="button" onClick={() => setOuvert(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
      </div>
      {retour && !retour.ok && <p role="alert" className="mt-1.5 text-[13px] text-[#b42318]">{retour.msg}</p>}
    </form>
  );
}

export function NouvelleDecennale({ ouvertParDefaut = false }: { ouvertParDefaut?: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [assureur, setAssureur] = useState("");
  const [police, setPolice] = useState("");
  const [fin, setFin] = useState("");
  const [fichier, setFichier] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function deposer(f: File | undefined) {
    if (!f) return;
    setErreur("");
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) { setErreur("L'attestation en PDF ou en photo (JPEG, PNG, WebP)."); return; }
    if (f.size > TAILLE_MAX) { setErreur("10 Mo au plus."); return; }
    setEnvoi(true);
    try {
      const p = await preparerEnvoiDocument({ type: "decennale", taille: f.size, mime: f.type });
      if (!p.ok) { setErreur(p.erreur === "trop" ? "Trop d'attestations déposées : écris à contact@getavyora.fr." : "L'envoi a échoué : réessaie."); return; }
      const { error } = await supabaseBrowser().storage.from(BUCKET_ARTISANS).uploadToSignedUrl(p.chemin, p.jeton, f, { contentType: f.type });
      if (error) { setErreur("L'envoi a échoué : réessaie."); return; }
      const r = await enregistrerDocument({ type: "decennale", chemin: p.chemin, nom: f.name });
      if (!r.ok) { setErreur("L'envoi a échoué : réessaie."); return; }
      setFichier(f.name);
    } catch {
      setErreur("L'envoi a échoué : réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Envoyer ma nouvelle attestation</button>;
  return (
    <form
      noValidate
      className="w-full space-y-3 rounded-2xl border border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErreur("");
        if (!fichier) { setErreur("Dépose d'abord l'attestation de ton assureur."); return; }
        demarrer(async () => {
          const r = await demanderMajDossier({ type: "decennale", assureur, police, fin }).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
          if (r.ok) { setOuvert(false); router.refresh(); } else setErreur(r.erreur ?? "Réessaie dans un instant.");
        });
      }}
    >
      <p className="text-[14px] font-semibold text-ink">Ta nouvelle assurance décennale</p>
      <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-3 py-3 text-[13.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600">
        <span className="btn btn-outline min-h-9 px-3 text-[13px]">{envoi ? "Envoi…" : fichier ? "Remplacer" : "Déposer l'attestation"}</span>
        <span className="text-muted">{fichier ?? "PDF ou photo lisible, 10 Mo au plus"}</span>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => deposer(e.target.files?.[0])} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor="d-ass" className="text-[13px] font-semibold text-ink">Assureur</label><input id="d-ass" value={assureur} onChange={(e) => setAssureur(e.target.value)} maxLength={120} className={champ} /></div>
        <div><label htmlFor="d-pol" className="text-[13px] font-semibold text-ink">Numéro de contrat</label><input id="d-pol" value={police} onChange={(e) => setPolice(e.target.value)} maxLength={60} className={champ} /></div>
        <div><label htmlFor="d-fin" className="text-[13px] font-semibold text-ink">Valable jusqu&apos;au</label><input id="d-fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={champ} /></div>
      </div>
      <p className="text-[12.5px] text-faint">Daniel vérifie l&apos;attestation, puis met ta date à jour. Tu reçois des demandes tant que l&apos;ancienne est valable.</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={enCours || envoi} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Envoyer à Daniel</button>
        <button type="button" onClick={() => setOuvert(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
      </div>
      {erreur && <p role="alert" className="text-[13px] text-[#b42318]">{erreur}</p>}
    </form>
  );
}

export function DemandeModification() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="btn btn-outline min-h-10 px-4 text-[13.5px]">Changer mes métiers ou ma zone</button>;
  return (
    <form
      className="w-full rounded-2xl border border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await demanderMajDossier({ type: "message", texte }).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
          if (r.ok) { setOuvert(false); router.refresh(); } else setErreur(r.erreur ?? "Réessaie dans un instant.");
        });
      }}
    >
      <label htmlFor="modif" className="text-[13.5px] font-semibold text-ink">Qu&apos;est-ce qui doit changer ?</label>
      <textarea id="modif" rows={3} maxLength={1000} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. : j'ajoute la Dordogne (24), je fais aussi la plomberie…" className={champ} />
      <p className="mt-1 text-[12.5px] text-faint">Les métiers et la zone repassent par Daniel : il vérifie que ta décennale les couvre.</p>
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={enCours || texte.trim().length < 5} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Envoyer à Daniel</button>
        <button type="button" onClick={() => setOuvert(false)} className="text-[13px] font-semibold text-muted underline">Annuler</button>
      </div>
      {erreur && <p role="alert" className="mt-1.5 text-[13px] text-[#b42318]">{erreur}</p>}
    </form>
  );
}

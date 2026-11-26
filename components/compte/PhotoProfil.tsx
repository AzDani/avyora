"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recadrerPortrait, type ZoneCarree } from "@/lib/reseau/image";
import RecadragePhoto from "./RecadragePhoto";
import { BUCKET_PHOTOS, COTE_PHOTO } from "@/lib/compte/photo";
import { enregistrerPhotoProfil, preparerPhotoProfil, retirerPhotoProfil } from "@/lib/actions/photo";

/**
 * Ajouter, changer ou retirer sa photo de profil (26/11/2026). La photo choisie s'ouvre dans l'outil de cadrage
 * (RecadragePhoto), puis la zone gardée est redessinée en carré et réencodée dans le navigateur (sans métadonnées),
 * envoyée par une URL signée, et enregistrée côté serveur. Pour un artisan,
 * c'est aussi la photo (ou le logo) de sa fiche dans le réseau.
 */
export default function PhotoProfil({ url, initiale, artisan = false }: { url: string | null; initiale: string; artisan?: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  // Un état simple plutôt qu'une transition : avec router.refresh() dans une transition, le bouton restait sur
  // « Envoi… » pendant tout le rechargement, alors que la photo était déjà enregistrée (vu en ligne le 26/11/2026).
  const [enCours, setEnCours] = useState(false);
  // undefined : la photo de la page ; une adresse : la nouvelle photo ; null : retirée (avant le rechargement).
  const [ici, setIci] = useState<string | null | undefined>(undefined);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  // La photo choisie, ouverte dans l'outil de cadrage (avant tout envoi).
  const [aCadrer, setACadrer] = useState<File | null>(null);
  const affichee = ici === undefined ? url : ici;

  const vider = () => { if (champ.current) champ.current.value = ""; };

  const choisir = (f: File | undefined) => {
    if (!f || enCours) return;
    setMessage(null);
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setMessage({ ok: false, texte: "Choisis une image (JPEG, PNG ou WebP)." }); vider(); return; }
    setACadrer(f);
  };

  const envoyer = async (f: File, zone: ZoneCarree) => {
    setACadrer(null);
    setEnCours(true);
    try {
      const photo = await recadrerPortrait(f, zone, COTE_PHOTO).catch(() => { throw new Error("Cette image n'a pas pu être lue : essaie une autre photo."); });
      const p = await preparerPhotoProfil({ taille: photo.size, mime: photo.type });
      if (!p.ok) throw new Error(p.erreur);
      const { error } = await supabaseBrowser().storage.from(BUCKET_PHOTOS).uploadToSignedUrl(p.chemin, p.jeton, photo, { contentType: "image/jpeg" });
      if (error) throw new Error("L'envoi a échoué : réessaie.");
      const r = await enregistrerPhotoProfil(p.chemin);
      if (!r.ok) throw new Error(r.erreur ?? "Réessaie dans un instant.");
      setIci(URL.createObjectURL(photo));
      setMessage({ ok: true, texte: "Photo enregistrée." });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Réessaie dans un instant." });
    } finally {
      setEnCours(false);
      vider();
    }
  };

  const retirer = async () => {
    if (enCours) return;
    setMessage(null);
    setEnCours(true);
    const r = await retirerPhotoProfil().catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
    setEnCours(false);
    if (!r.ok) { setMessage({ ok: false, texte: r.erreur ?? "Réessaie dans un instant." }); return; }
    setIci(null);
    setMessage({ ok: true, texte: "Photo retirée." });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-4" data-photo-profil="">
      {aCadrer && <RecadragePhoto fichier={aCadrer} onValider={(z) => envoyer(aCadrer, z)} onAnnuler={() => { setACadrer(null); vider(); }} />}
      {affichee ? (
        // eslint-disable-next-line @next/next/no-img-element -- une petite image publique déjà réduite
        <img src={affichee} alt="Ta photo de profil" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-line" />
      ) : (
        <span aria-hidden="true" className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#a78bfa] text-[26px] font-bold text-[#1e1b4b]">{initiale}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-muted">
          {artisan
            ? "Ta photo ou le logo de ton entreprise : il s'affiche sur ta fiche dans le réseau. Une image carrée marche le mieux."
            : "Elle s'affiche dans « Mon espace ». Une image carrée marche le mieux."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className={"btn btn-outline min-h-10 cursor-pointer px-4 text-[13.5px] " + (enCours ? "pointer-events-none opacity-60" : "")}>
            {enCours ? "Envoi…" : affichee ? "Changer ma photo" : "Ajouter une photo"}
            <input ref={champ} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={enCours} onChange={(e) => choisir(e.target.files?.[0])} />
          </label>
          {affichee && !enCours && (
            <button type="button" onClick={retirer} className="btn btn-ghost min-h-10 px-3 text-[13.5px] text-muted">Retirer</button>
          )}
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={"mt-1.5 text-[13px] " + (message.ok ? "text-[#0b7a53]" : "text-[#b42318]")}>{message.texte}</p>}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { nettoyerImage } from "@/lib/reseau/image";
import { BUCKET_ARTISANS, TAILLE_MAX } from "@/lib/reseau/candidature";

export type PhotoEnvoyee = { chemin: string; apercu: string | null };
type Preparer = (f: { taille: number; mime: string }) => Promise<{ ok: true; chemin: string; jeton: string } | { ok: false; erreur: string }>;

/**
 * Ajouter des photos (avis du client, galerie de l'artisan) : chaque photo est réencodée sans métadonnées (la position
 * GPS part avec, lib/reseau/image.ts), puis envoyée directement au stockage privé par une URL signée à usage unique.
 */
export default function EnvoiPhotos({
  photos, onChange, max, preparer, label, aide,
}: { photos: PhotoEnvoyee[]; onChange: (p: PhotoEnvoyee[]) => void; max: number; preparer: Preparer; label: string; aide: string }) {
  const entree = useRef<HTMLInputElement>(null);
  const [envois, setEnvois] = useState(0);
  const [erreur, setErreur] = useState("");
  const courantes = useRef(photos);
  courantes.current = photos;

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur("");
    const lot = Array.from(fichiers).slice(0, Math.max(0, max - photos.length));
    if (lot.length < fichiers.length) setErreur(`${max} photos au plus.`);
    for (const brut of lot) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(brut.type)) { setErreur(`${brut.name} : photos en JPEG, PNG ou WebP seulement.`); continue; }
      setEnvois((n) => n + 1);
      try {
        const f = await nettoyerImage(brut).catch(() => null);
        if (!f) { setErreur(`${brut.name} : cette photo n'a pas pu être préparée, essaie avec une autre.`); continue; }
        if (f.size > TAILLE_MAX) { setErreur(`${brut.name} : 10 Mo au plus.`); continue; }
        const p = await preparer({ taille: f.size, mime: f.type });
        if (!p.ok) { setErreur(p.erreur); continue; }
        const { error } = await supabaseBrowser().storage.from(BUCKET_ARTISANS).uploadToSignedUrl(p.chemin, p.jeton, f, { contentType: f.type });
        if (error) { setErreur("L'envoi a échoué : réessaie."); continue; }
        courantes.current = [...courantes.current, { chemin: p.chemin, apercu: URL.createObjectURL(f) }];
        onChange(courantes.current);
      } catch {
        setErreur("L'envoi a échoué : réessaie.");
      } finally {
        setEnvois((n) => n - 1);
      }
    }
    if (entree.current) entree.current.value = "";
  }

  return (
    <div>
      <p className="text-[13.5px] font-semibold text-ink">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <li key={p.chemin} className="relative">
            {p.apercu ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.apercu} alt={`Photo ${i + 1}`} className="h-16 w-20 rounded-lg border border-line object-cover" />
            ) : (
              <span className="grid h-16 w-20 place-items-center rounded-lg border border-line bg-surface-2 text-[11px] text-faint">Photo {i + 1}</span>
            )}
            <button type="button" onClick={() => onChange(photos.filter((x) => x.chemin !== p.chemin))}
              className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-[13px] font-bold text-muted shadow-sm hover:text-[#b42318]"
              aria-label={`Retirer la photo ${i + 1}`}>×</button>
          </li>
        ))}
        {photos.length < max && (
          <li>
            <label className="grid h-16 w-20 cursor-pointer place-items-center rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface-2 text-[22px] text-faint hover:border-brand-600 hover:text-brand-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600">
              {envois > 0 ? <span className="text-[11px]">Envoi…</span> : <span aria-hidden="true">+</span>}
              <span className="sr-only">Ajouter des photos</span>
              <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => ajouter(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      <p className="mt-1.5 text-[12.5px] text-faint">{aide}</p>
      {erreur && <p role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreur}</p>}
    </div>
  );
}

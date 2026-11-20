"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ajouterArtisans } from "@/lib/actions/devis";
import { labelMetier } from "@/lib/reseau/metiers";
import type { ArtisanPropose } from "@/lib/reseau/demande";

/** Choisir un ou plusieurs artisans de plus pour une demande (à la place d'un refus ou d'un silence). */
export default function AjoutArtisans({ demandeId, artisans, places, metiersDemandes }: { demandeId: string; artisans: ArtisanPropose[]; places: number; metiersDemandes: string[] }) {
  const router = useRouter();
  const [choix, setChoix] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const envoyer = () =>
    demarrer(async () => {
      setErreur("");
      const r = await ajouterArtisans(demandeId, choix).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) router.push("/demandes-devis?ajout=1");
      else setErreur(r.erreur);
    });

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-muted"><span className="num font-semibold text-ink">{choix.length}</span> / {places} choisi{places > 1 ? "s" : ""}</p>
      <ul className="space-y-2.5">
        {artisans.map((a) => {
          const on = choix.includes(a.id);
          const bloque = !on && choix.length >= places;
          return (
            <li key={a.id} className={"rounded-2xl border p-4 " + (on ? "border-brand-600 bg-brand-50/50" : "border-line bg-surface")}>
              <label className={"flex items-start gap-3 " + (bloque ? "cursor-not-allowed" : "cursor-pointer")}>
                <input type="checkbox" checked={on} disabled={bloque} onChange={(e) => setChoix((c) => (e.target.checked ? [...c, a.id] : c.filter((x) => x !== a.id)))} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15.5px] font-semibold text-ink">{a.nom}</span>
                    <span className="rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b5e40]">Décennale et SIRET vérifiés</span>
                    {a.rge && <span className="rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b5e40]">RGE</span>}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {a.metiers.map((m) => <span key={m} className={"rounded-full px-2 py-0.5 text-[12px] " + (metiersDemandes.includes(m) ? "bg-brand-50 font-semibold text-brand-700" : "bg-surface-2 text-muted")}>{labelMetier(m)}</span>)}
                  </span>
                  {a.presentation && <span className="mt-2 line-clamp-3 block text-[13.5px] text-muted">{a.presentation}</span>}
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
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" disabled={enCours || choix.length === 0} onClick={envoyer} className="btn btn-primary min-h-12 px-6 text-[15px]">
          {enCours ? "Envoi…" : choix.length > 1 ? "Envoyer ma demande à ces artisans" : "Envoyer ma demande à cet artisan"}
        </button>
        {erreur && <p role="alert" className="text-[13px] text-[#b42318]">{erreur}</p>}
      </div>
    </div>
  );
}

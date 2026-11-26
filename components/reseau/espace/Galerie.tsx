"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerRealisation, preparerPhotoRealisation, supprimerRealisation } from "@/lib/actions/avis";
import { MAX_PHOTOS_REALISATION, labelMois, moisRecents, type ErreursRealisation } from "@/lib/reseau/avis";
import type { Realisation } from "@/lib/data/reseau";
import EnvoiPhotos, { type PhotoEnvoyee } from "@/components/reseau/avis/EnvoiPhotos";

/**
 * La galerie de l'artisan (25/11/2026) : ses réalisations (titre, description, ville, mois, 1 à 10 photos), publiées
 * tout de suite sur sa fiche, sans validation. Ajouter, modifier, supprimer. Une réalisation retirée par Daniel reste
 * visible ici avec le motif, mais plus sur la fiche.
 */
type Brouillon = { id: string | null; titre: string; description: string; ville: string; mois: string; photos: PhotoEnvoyee[] };
const VIDE: Brouillon = { id: null, titre: "", description: "", ville: "", mois: "", photos: [] };

/** La vignette d'une réalisation : 1 photo pleine ; 2 côte à côte ; 3 ou plus, une grande et deux petites. */
function Vignettes({ urls }: { urls: string[] }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = (u: string, c = "") => <img key={u} src={u} alt="" loading="lazy" className={"h-full w-full object-cover " + c} />;
  if (urls.length === 0) return <div className="h-40 bg-surface-2" />;
  if (urls.length === 1) return <div className="h-40">{img(urls[0])}</div>;
  if (urls.length === 2) return <div className="grid h-40 grid-cols-2 gap-0.5 bg-line">{urls.map((u) => img(u))}</div>;
  return (
    <div className="grid h-40 grid-cols-[2fr_1fr] grid-rows-2 gap-0.5 bg-line">
      {img(urls[0], "row-span-2")}
      {img(urls[1])}
      <span className="relative">
        {img(urls[2])}
        {urls.length > 3 && <span className="absolute inset-0 grid place-items-center bg-black/45 text-[14px] font-semibold text-white">+{urls.length - 3}</span>}
      </span>
    </div>
  );
}

export default function Galerie({ realisations }: { realisations: Realisation[] }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [b, setB] = useState<Brouillon | null>(null);
  const [certifie, setCertifie] = useState(false);
  const [erreurs, setErreurs] = useState<ErreursRealisation>({});
  const [global, setGlobal] = useState("");
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const liste = moisRecents(new Date(), 120);

  const ouvrir = (r?: Realisation) => {
    setErreurs({});
    setGlobal("");
    setCertifie(!!r);
    setB(r ? { id: r.id, titre: r.titre, description: r.description, ville: r.ville ?? "", mois: r.mois ? r.mois.slice(0, 7) : "", photos: r.photos.map((p) => ({ chemin: p.chemin, apercu: p.url })) } : VIDE);
  };
  const enregistrer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b) return;
    setGlobal("");
    if (!certifie) { setGlobal("Coche la case pour confirmer que ce chantier est le tien."); return; }
    demarrer(async () => {
      const r = await enregistrerRealisation(b.id, { ...b, photos: b.photos.map((p) => p.chemin) }).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) { setB(null); router.refresh(); return; }
      setErreurs(("erreurs" in r && r.erreurs) || {});
      if ("erreur" in r && r.erreur) setGlobal(r.erreur);
    });
  };
  const supprimer = (id: string) =>
    demarrer(async () => {
      const r = await supprimerRealisation(id).catch(() => ({ ok: false, erreur: "Réessaie dans un instant." }));
      setASupprimer(null);
      if (r.ok) router.refresh();
      else setGlobal(r.erreur ?? "Réessaie dans un instant.");
    });

  const champ = "mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand-600";
  const err = (k: keyof ErreursRealisation) => erreurs[k] && <p role="alert" className="mt-1 text-[13px] text-[#b42318]">{erreurs[k]}</p>;

  return (
    <div className="space-y-4">
      {!b && <button type="button" onClick={() => ouvrir()} className="btn btn-primary min-h-11 px-5">+ Ajouter une réalisation</button>}

      {b && (
        <form onSubmit={enregistrer} noValidate className="space-y-4 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-[16px] font-semibold text-ink">{b.id ? "Modifier la réalisation" : "Nouvelle réalisation"}</h2>
          <div>
            <label htmlFor="real-titre" className="text-[13.5px] font-semibold text-ink">Titre des travaux</label>
            <input id="real-titre" type="text" maxLength={120} value={b.titre} onChange={(e) => setB({ ...b, titre: e.target.value })} placeholder="Ex. : Ouverture d'un mur porteur avec IPN" className={champ} />
            {err("titre")}
          </div>
          <div>
            <label htmlFor="real-desc" className="text-[13.5px] font-semibold text-ink">Description des travaux réalisés</label>
            <textarea id="real-desc" rows={4} maxLength={1000} value={b.description} onChange={(e) => setB({ ...b, description: e.target.value })} placeholder="Ce que tu as fait, les matériaux, les difficultés du chantier…" className={champ} />
            <p className="mt-1 text-[12.5px] text-faint">1 000 caractères au plus.</p>
            {err("description")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="real-ville" className="text-[13.5px] font-semibold text-ink">Ville <span className="font-normal text-faint">(facultatif)</span></label>
              <input id="real-ville" type="text" maxLength={80} value={b.ville} onChange={(e) => setB({ ...b, ville: e.target.value })} placeholder="Bordeaux" className={champ} />
              <p className="mt-1 text-[12.5px] text-faint">La ville seulement, jamais l&apos;adresse du client.</p>
            </div>
            <div>
              <label htmlFor="real-mois" className="text-[13.5px] font-semibold text-ink">Quand <span className="font-normal text-faint">(facultatif)</span></label>
              <select id="real-mois" value={b.mois} onChange={(e) => setB({ ...b, mois: e.target.value })} className={champ}>
                <option value="">Non précisé</option>
                {liste.map((m) => <option key={m.v} value={m.v}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</option>)}
              </select>
              {err("mois")}
            </div>
          </div>
          <EnvoiPhotos photos={b.photos} onChange={(photos) => setB((x) => (x ? { ...x, photos } : x))} max={MAX_PHOTOS_REALISATION} preparer={preparerPhotoRealisation}
            label={`Photos · 1 à ${MAX_PHOTOS_REALISATION}`} aide="Avant / après bienvenus. Pas de visage ni d'adresse lisible. La position GPS est retirée automatiquement." />
          {err("photos")}
          <label className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
            <input type="checkbox" checked={certifie} onChange={(e) => setCertifie(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4f46e5]" />
            Je certifie que ce chantier est le mien et que le client est d&apos;accord pour que les photos soient montrées.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={enCours} className="btn btn-primary min-h-11 px-5">{enCours ? "Enregistrement…" : b.id ? "Enregistrer" : "Publier la réalisation"}</button>
            <button type="button" onClick={() => setB(null)} className="text-[13.5px] font-semibold text-muted underline">Annuler</button>
            <span className="basis-full text-[12.5px] text-faint">Visible tout de suite par les membres AVYORA Pro, sur ta fiche.</span>
          </div>
          {global && <p role="alert" className="text-[13px] text-[#b42318]">{global}</p>}
        </form>
      )}

      {realisations.length === 0 && !b ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">
          Pas encore de réalisation. Ajoute tes plus beaux chantiers : c&apos;est ce que les clients regardent avant de te choisir.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {realisations.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <Vignettes urls={r.photos.map((p) => p.url).filter((u): u is string => !!u)} />
              <div className="p-3.5">
                <p className="text-[14.5px] font-semibold text-ink">{r.titre}</p>
                <p className="mt-0.5 text-[12.5px] text-faint">{[r.ville, r.mois ? labelMois(r.mois) : null, `${r.photos.length} photo${r.photos.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">{r.description}</p>
                {r.retireeLe ? (
                  <p className="mt-2 rounded-xl bg-[#fdf1e1] px-3 py-2 text-[12.5px] text-[#8a5208]">Retirée de ta fiche par Daniel{r.retireeMotif ? ` : ${r.retireeMotif}` : ""}.</p>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e3f5ed] px-2 py-0.5 text-[11.5px] font-semibold text-[#0b7a53]">En ligne</span>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                  {!r.retireeLe && <button type="button" onClick={() => ouvrir(r)} className="font-semibold text-brand-700 underline">Modifier</button>}
                  {aSupprimer === r.id ? (
                    <>
                      <button type="button" disabled={enCours} onClick={() => supprimer(r.id)} className="font-semibold text-[#b42318] underline">Confirmer la suppression</button>
                      <button type="button" onClick={() => setASupprimer(null)} className="font-semibold text-muted underline">Annuler</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setASupprimer(r.id)} className="font-semibold text-[#b42318] underline">Supprimer</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

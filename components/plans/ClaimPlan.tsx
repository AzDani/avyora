"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictPlans, messageReprise } from "@/lib/i18n/plans";
import { CLE_RECLAMATION_PLAN, reprendrePlanLocal, stockageNavigateur, type ResultatReprise } from "@/lib/plans/local";
import { mesurerPlan, mesureReprise } from "@/lib/plans/mesure";

/**
 * Reprend dans le compte le plan dessiné sans compte, après l'inscription ou la connexion. Jumeau de
 * `ClaimDraft` (les estimations) : il ne fait RIEN sans le drapeau `avyora-plan-claim`, posé par
 * l'invitation de l'éditeur ou par « Garde-le dans ton compte » du hub. On ne crée jamais un plan par
 * surprise. Le drapeau est retiré dans tous les cas (sauf si la session manque encore).
 *
 * Monté sur `/projets`, AVANT `ClaimDraft` (le plan part le premier : il obtient son id du compte avant
 * l'estimation née de lui), et dans `TesPlans` (vitrine) pour une personne connectée.
 * Ne rend rien tant qu'il n'y a rien à dire : le HTML serveur de la page ne change pas.
 *
 * `pro` : seulement pour la phrase « Avec Pro… », jamais pour décider (le serveur tient la limite).
 */
export default function ClaimPlan({ pro = false, onFini }: { pro?: boolean; onFini?: (r: ResultatReprise) => void }) {
  const locale = useLocale();
  const t = dictPlans(locale);
  const fait = useRef(false);
  const [enCours, setEnCours] = useState(false);
  const [res, setRes] = useState<ResultatReprise | null>(null);
  const [ferme, setFerme] = useState(false);
  const fini = useRef(onFini);
  const proRef = useRef(pro);
  useEffect(() => {
    fini.current = onFini;
    proRef.current = pro;
  }, [onFini, pro]);

  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    const s = stockageNavigateur();
    if (!s) return;
    let drapeau: string | null = null;
    try {
      drapeau = s.getItem(CLE_RECLAMATION_PLAN);
    } catch {
      drapeau = null;
    }
    if (!drapeau) return;
    setEnCours(true);
    reprendrePlanLocal(s, (u, i) => fetch(u, i)).then((r) => {
      setEnCours(false);
      setRes(r);
      mesurerPlan(mesureReprise(r, proRef.current));
      fini.current?.(r);
    });
  }, []);

  if (enCours) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-muted" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
        {t.reprise.enCours}
      </div>
    );
  }
  const m = res && !ferme ? messageReprise(res, t, pro) : null;
  if (!m) return null;
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-field border p-4 text-sm " +
        (m.ok ? "border-brand-200 bg-brand-50 text-ink" : "border-line-strong bg-surface text-ink")
      }
      role="status"
    >
      <p className="min-w-0 flex-1 leading-relaxed">{m.texte}</p>
      {m.lien && (
        <Link href={m.lien.href} className="btn btn-outline py-2">
          {m.lien.label}
        </Link>
      )}
      <button type="button" className="btn btn-ghost py-2" onClick={() => setFerme(true)}>
        {t.reprise.fermer}
      </button>
    </div>
  );
}

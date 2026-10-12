"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";
import { CLE_BROUILLON_NEUF, CLE_RECLAMATION_NEUF, RECLAMATION_NEUF, lireBrouillonNeuf, corpsProjetNeuf, reclamationNeufPosee } from "@/lib/estimateur/brouillon-neuf";
import { CLE_BROUILLON_RENO, CLE_BROUILLON_DETAIL_RENO, CLE_RECLAMATION_RENO, lireBrouillonReno, corpsReclamationReno } from "@/lib/estimateur/brouillon-reno";
import { mesurerPlan, mesureEstimationNeuf } from "@/lib/plans/mesure";

const TR = {
  fr: { enregistrement: "Enregistrement de ton estimation…" },
  en: { enregistrement: "Saving your estimate…" },
} as const;

/**
 * Réclame le brouillon anonyme de l'ESTIMATEUR (localStorage) après connexion/inscription :
 * crée le projet pour l'utilisateur désormais authentifié, puis redirige vers lui.
 * Monté sur /projets et /mon-espace (atterrissage post-auth). Ne se déclenche QUE si un anonyme
 * a explicitement tenté d'enregistrer (drapeau CLAIM_KEY posé par Estimateur sur 401) — pour ne
 * pas créer de projet par accident quand un utilisateur connecté a juste un brouillon en cours.
 */
const DRAFT_KEY = CLE_BROUILLON_RENO;
const CLAIM_KEY = CLE_RECLAMATION_RENO;

export default function ClaimDraft() {
  const router = useRouter();
  const locale = useLocale();
  const s = TR[locale];
  const done = useRef(false);
  const [etat, setEtat] = useState<"idle" | "claiming">("idle");

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // Deux drapeaux indépendants : la construction neuve (`avyora-neuf-claim`) et la rénovation
    // (`avyora-estim-claim = "1"`). Un anonyme qui a enregistré les deux retrouve les deux projets.
    let neuf = false, flag: string | null = null;
    try {
      neuf = reclamationNeufPosee((k) => localStorage.getItem(k));
      flag = localStorage.getItem(CLAIM_KEY);
    } catch { /* noop */ }
    const reno = !!flag && flag !== RECLAMATION_NEUF; // « neuf » : ancienne valeur du drapeau du neuf
    if (!neuf && !reno) return; // pas de tentative d'enregistrement anonyme → on ne réclame rien

    /** Construction neuve : son propre brouillon (`avyora-neuf-v1`), son propre nom et `typeBien`. */
    async function reclamerNeuf(): Promise<string | null> {
      const clear = () => {
        try {
          localStorage.removeItem(CLE_RECLAMATION_NEUF);
          if (localStorage.getItem(CLAIM_KEY) === RECLAMATION_NEUF) localStorage.removeItem(CLAIM_KEY);
        } catch { /* noop */ }
      };
      let rawNeuf: string | null = null;
      try { rawNeuf = localStorage.getItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
      const dn = lireBrouillonNeuf(rawNeuf);
      if (!dn) { clear(); return null; }
      setEtat("claiming");
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpsProjetNeuf(dn, locale)),
        });
        if (res.ok) {
          const { id } = await res.json();
          try { localStorage.removeItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
          clear();
          mesurerPlan(mesureEstimationNeuf(dn));   // C10 : interrupteur allumé, une maison venue d'un plan
          return id as string;
        }
      } catch { /* réseau : on garde le brouillon pour réessayer */ }
      clear();
      return null;
    }

    /** Rénovation : son brouillon (`avyora-estim-v2`), rapide ou détaillé (lignes perso et pièces comprises, N4). */
    async function reclamerReno(): Promise<string | null> {
      let raw: string | null = null;
      try { raw = localStorage.getItem(DRAFT_KEY); } catch { /* noop */ }
      const clearFlag = () => { try { localStorage.removeItem(CLAIM_KEY); } catch { /* noop */ } };
      const d = lireBrouillonReno(raw);
      if (!d) { clearFlag(); return null; }

      setEtat("claiming");
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpsReclamationReno(d)),
        });
        if (res.ok) {
          const { id } = await res.json();
          // Un détaillé réclamé est enregistré : son travail en cours ne doit pas revenir au prochain détaillé.
          try { localStorage.removeItem(DRAFT_KEY); if (d.mode === "detaille") localStorage.removeItem(CLE_BROUILLON_DETAIL_RENO); } catch { /* noop */ }
          clearFlag();
          return id as string;
        }
      } catch { /* réseau : on garde le brouillon pour réessayer */ }
      clearFlag();
      return null;
    }

    (async () => {
      const idNeuf = neuf ? await reclamerNeuf() : null;
      const idReno = reno ? await reclamerReno() : null;
      if (idNeuf && idReno) {
        // Deux projets créés : la liste les montre tous les deux.
        router.replace("/projets");
        router.refresh();
        return;
      }
      const id = idNeuf ?? idReno;
      if (id) {
        router.replace(`/projets/${id}`);
        router.refresh();
        return;
      }
      setEtat("idle");
    })();
  }, [router]);

  if (etat !== "claiming") return null;
  return (
    <div className="card flex items-center gap-3 p-4 text-sm text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
      {s.enregistrement}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";
import { CLE_BROUILLON_NEUF, CLE_RECLAMATION_NEUF, RECLAMATION_NEUF, lireBrouillonNeuf, corpsProjetNeuf, reclamationNeufPosee } from "@/lib/estimateur/brouillon-neuf";
import { CLE_BROUILLON_RENO, CLE_BROUILLON_DETAIL_RENO, CLE_RECLAMATION_RENO, lireBrouillonReno, corpsReclamationReno } from "@/lib/estimateur/brouillon-reno";
import { mesurerPlan, mesureEstimationNeuf } from "@/lib/plans/mesure";
import { suivre } from "@/lib/track";

const TR = {
  fr: {
    enregistrement: "Enregistrement de ton estimation…",
    echec: "Ton estimation n'a pas pu être enregistrée dans ton compte. Elle est gardée sur cet appareil : réessaie.",
    trop: "Trop de requêtes pour l'instant : ton estimation est gardée sur cet appareil, réessaie dans un instant.",
    invalide: "Ton estimation n'a pas pu être enregistrée : ses données sont incomplètes. Refais-la depuis l'estimateur.",
    reessayer: "Réessayer",
    refaire: "Refaire une estimation",
  },
  en: {
    enregistrement: "Saving your estimate…",
    echec: "Your estimate couldn't be saved to your account. It's kept on this device: try again.",
    trop: "Too many requests right now: your estimate is kept on this device, try again in a moment.",
    invalide: "Your estimate couldn't be saved: its data is incomplete. Start it again from the estimator.",
    reessayer: "Try again",
    refaire: "Start a new estimate",
  },
} as const;

/** Issue d'une réclamation : le projet créé, rien à réclamer, un échec à réessayer (le drapeau est
 *  gardé), ou un brouillon refusé par le serveur (400 : le réessayer ne changerait rien). */
type Issue = { id: string } | "rien" | { echec: number } | "invalide";

/**
 * Exclusion entre onglets : deux onglets /projets montés en même temps (onglet d'origine + lien de
 * l'e-mail) créaient chacun le projet. Le second attend la fin du premier, puis relit les drapeaux
 * (retirés après un succès) : il n'a plus rien à réclamer. Sans Web Locks (vieux navigateurs), un
 * verrou horodaté de 30 s dans localStorage ; s'il est pris, cet onglet ne réclame rien.
 */
const VERROU = "avyora-reclamation";
async function sousVerrou(f: () => Promise<Issue[]>): Promise<Issue[]> {
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks?.request) {
    return navigator.locks.request(VERROU, f);
  }
  const cle = VERROU + "-verrou";
  try {
    const t = Number(localStorage.getItem(cle));
    if (t && Date.now() - t < 30_000) return [];
    localStorage.setItem(cle, String(Date.now()));
  } catch { /* stockage indisponible : on réclame quand même */ }
  try { return await f(); } finally { try { localStorage.removeItem(cle); } catch { /* noop */ } }
}

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
  const [etat, setEtat] = useState<"idle" | "claiming" | "echec" | "trop" | "invalide">("idle");

  const reclamer = useCallback(async () => {
    /** Construction neuve : son propre brouillon (`avyora-neuf-v1`), son propre nom et `typeBien`. */
    async function reclamerNeuf(): Promise<Issue> {
      const clear = () => {
        try {
          localStorage.removeItem(CLE_RECLAMATION_NEUF);
          if (localStorage.getItem(CLAIM_KEY) === RECLAMATION_NEUF) localStorage.removeItem(CLAIM_KEY);
        } catch { /* noop */ }
      };
      let rawNeuf: string | null = null;
      try { rawNeuf = localStorage.getItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
      const dn = lireBrouillonNeuf(rawNeuf);
      if (!dn) { clear(); return "rien"; }
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
          suivre("projet_enregistre", { nature: "neuf", mode: dn.mode === "detaille" ? "detaille" : "rapide", edition: false });
          return { id: id as string };
        }
        // 400 : le serveur refuse ce brouillon, le réessayer ne changerait rien (il reste sur l'appareil).
        if (res.status === 400) { clear(); return "invalide"; }
        return { echec: res.status };
      } catch {
        return { echec: 0 }; // réseau : le drapeau et le brouillon restent, pour réessayer
      }
    }

    /** Rénovation : son brouillon (`avyora-estim-v2`), rapide ou détaillé (lignes perso et pièces comprises, N4). */
    async function reclamerReno(): Promise<Issue> {
      let raw: string | null = null;
      try { raw = localStorage.getItem(DRAFT_KEY); } catch { /* noop */ }
      const clearFlag = () => { try { localStorage.removeItem(CLAIM_KEY); } catch { /* noop */ } };
      const d = lireBrouillonReno(raw);
      if (!d) { clearFlag(); return "rien"; }

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
          suivre("projet_enregistre", { nature: "reno", mode: d.mode === "detaille" ? "detaille" : "rapide", edition: false });
          return { id: id as string };
        }
        if (res.status === 400) { clearFlag(); return "invalide"; }
        return { echec: res.status };
      } catch {
        return { echec: 0 };
      }
    }

    // Les drapeaux sont relus SOUS le verrou : un autre onglet a peut-être déjà tout réclamé.
    const issues = await sousVerrou(async () => {
      // Deux drapeaux indépendants : la construction neuve (`avyora-neuf-claim`) et la rénovation
      // (`avyora-estim-claim = "1"`). Un anonyme qui a enregistré les deux retrouve les deux projets.
      let neuf = false, flag: string | null = null;
      try {
        neuf = reclamationNeufPosee((k) => localStorage.getItem(k));
        flag = localStorage.getItem(CLAIM_KEY);
      } catch { /* noop */ }
      const reno = !!flag && flag !== RECLAMATION_NEUF; // « neuf » : ancienne valeur du drapeau du neuf
      const out: Issue[] = [];
      if (neuf) out.push(await reclamerNeuf());
      if (reno) out.push(await reclamerReno());
      return out;
    });

    const ids = issues.flatMap((x) => (typeof x === "object" && "id" in x ? [x.id] : []));
    if (ids.length > 1) {
      // Deux projets créés : la liste les montre tous les deux.
      router.replace("/projets");
      router.refresh();
      return;
    }
    if (ids.length === 1) {
      router.replace(`/projets/${ids[0]}`);
      router.refresh();
      return;
    }
    // Rien de créé : on le dit (avant, l'utilisateur arrivait sur une liste vide, sans un mot).
    const echec = issues.find((x): x is { echec: number } => typeof x === "object" && "echec" in x);
    if (echec) setEtat(echec.echec === 429 ? "trop" : "echec");
    else if (issues.includes("invalide")) setEtat("invalide");
    else setEtat("idle");
  }, [router, locale]);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Pas de tentative d'enregistrement anonyme → on ne réclame rien (ni verrou, ni requête).
    let neuf = false, flag: string | null = null;
    try {
      neuf = reclamationNeufPosee((k) => localStorage.getItem(k));
      flag = localStorage.getItem(CLAIM_KEY);
    } catch { /* noop */ }
    if (!neuf && !(!!flag && flag !== RECLAMATION_NEUF)) return;
    void reclamer();
  }, [reclamer]);

  if (etat === "idle") return null;
  if (etat === "claiming") {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-muted" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
        {s.enregistrement}
      </div>
    );
  }
  return (
    <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-danger/25 bg-danger-soft p-4 text-sm text-danger">
      <span className="min-w-0 flex-1">{etat === "trop" ? s.trop : etat === "invalide" ? s.invalide : s.echec}</span>
      {etat === "invalide" ? (
        <Link href="/projets/nouveau" className="btn btn-outline py-1.5 text-[13px]">{s.refaire}</Link>
      ) : (
        <button type="button" onClick={() => { void reclamer(); }} className="btn btn-outline py-1.5 text-[13px]">{s.reessayer}</button>
      )}
    </div>
  );
}

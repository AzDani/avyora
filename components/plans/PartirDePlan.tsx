"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictPlans } from "@/lib/i18n/plans";
import { lirePlansLocaux, stockageNavigateur } from "@/lib/plans/local";
import { clicPlan } from "@/lib/plans/mesure";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Workflow = "final_plan" | "renovation";
type Trouve = { nom: string; href: string };

/**
 * « Partir de « {nom} » → » dans le bandeau « Partir de mon plan » de l'écran de choix (C9) : le plan le plus
 * récent du bon type (Plan final pour le neuf, Projet rénovation pour la rénovation en Pro).
 *  - la session d'abord (`GET /api/plans/session`, 200 même sans compte) : aucun 401 en console pour un visiteur ;
 *  - connecté : `GET /api/plans` (la liste du compte, la plus récente d'abord) → `/plan?id=` ;
 *  - sans compte : le plan ouvert dans ce navigateur (`avyora-plan-v2`), que `/plan` rouvre tel quel.
 * Rendu vide au serveur, dans une ligne de hauteur réservée : le lien qui arrive ne décale rien.
 */
export default function PartirDePlan({ workflow }: { workflow: Workflow }) {
  const d = dictPlans(useLocale());
  const t = d.choix;
  const sansNom = d.commun.sansNom;
  const [trouve, setTrouve] = useState<Trouve | null>(null);

  useEffect(() => {
    let fini = false;
    (async () => {
      const json = { headers: { Accept: "application/json" }, cache: "no-store" as const };
      let connecte = false;
      try {
        const s = await fetch("/api/plans/session", json);
        if (!s.ok) return;
        connecte = ((await s.json()) as { connecte?: unknown })?.connecte === true;
      } catch {
        return;
      }
      let r: Response | null = null;
      if (connecte) {
        try {
          r = await fetch("/api/plans", json);
        } catch {
          return;
        }
      }
      let res: Trouve | null = null;
      if (!r || r.status === 401) {
        const s = stockageNavigateur();
        const p = (s ? lirePlansLocaux(s) : []).find((x) => x.ouvert && x.workflow === workflow);
        if (p) res = { nom: p.nom, href: "/plan" };
      } else if (r.ok) {
        try {
          const j = (await r.json()) as { plans?: unknown };
          const l = Array.isArray(j.plans) ? (j.plans as Record<string, unknown>[]) : [];
          const p = l.find((x) => typeof x.id === "string" && UUID.test(x.id) && x.workflow === workflow);
          if (p) {
            const nom = typeof p.nom === "string" && p.nom.trim() ? p.nom.trim() : sansNom;
            res = { nom, href: `/plan?id=${encodeURIComponent(p.id as string)}` };
          }
        } catch {
          res = null;
        }
      }
      if (!fini) setTrouve(res);
    })();
    return () => {
      fini = true;
    };
  }, [workflow, sansNom]);

  return (
    <p className="plan-partir" aria-live="polite">
      {trouve && (
        <a href={trouve.href} className="lien" title={trouve.nom} {...clicPlan("choix")}>
          {t.partirDe(trouve.nom)}
        </a>
      )}
    </p>
  );
}

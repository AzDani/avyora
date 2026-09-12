"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LangProvider";

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
const DRAFT_KEY = "avyora-estim-v2";
const CLAIM_KEY = "avyora-estim-claim";

type Draft = { v?: string; ctx?: { type?: string; surface?: number }; sel?: unknown; codePostal?: string };

export default function ClaimDraft() {
  const router = useRouter();
  const locale = useLocale();
  const s = TR[locale];
  const done = useRef(false);
  const [etat, setEtat] = useState<"idle" | "claiming">("idle");

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    let flag: string | null = null;
    try { flag = localStorage.getItem(CLAIM_KEY); } catch { /* noop */ }
    if (!flag) return; // pas de tentative d'enregistrement anonyme → on ne réclame rien

    let raw: string | null = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch { /* noop */ }
    const clearFlag = () => { try { localStorage.removeItem(CLAIM_KEY); } catch { /* noop */ } };
    if (!raw) { clearFlag(); return; }

    let d: Draft | null = null;
    try { d = JSON.parse(raw); } catch { clearFlag(); return; }
    const surface = Number(d?.ctx?.surface) || 0;
    const codePostal = String(d?.codePostal || "");
    if (!d || d.v !== "estimateur" || !d.ctx || surface <= 0 || !/^\d{5}$/.test(codePostal)) { clearFlag(); return; }

    (async () => {
      setEtat("claiming");
      try {
        const nom = `Rénovation — ${d!.ctx!.type ?? "bien"} ${surface} m²`.slice(0, 110);
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom, typeBien: d!.ctx!.type, surface, codePostal,
            reponses: { v: "estimateur", ctx: d!.ctx, sel: d!.sel ?? {}, codePostal },
          }),
        });
        if (res.ok) {
          const { id } = await res.json();
          try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
          clearFlag();
          router.replace(`/projets/${id}`);
          router.refresh();
          return;
        }
      } catch { /* réseau : on garde le brouillon pour réessayer */ }
      clearFlag();
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

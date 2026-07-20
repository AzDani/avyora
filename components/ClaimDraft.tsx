"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DRAFT_KEY } from "@/components/ParcoursForm";

/**
 * Réclame le brouillon anonyme (localStorage) après connexion/inscription : crée le projet
 * pour l'utilisateur désormais authentifié, puis redirige vers lui. Monté sur /projets
 * (l'atterrissage post-auth via ?next=/projets). Ne rend rien tant qu'il n'y a pas de brouillon.
 */
export default function ClaimDraft() {
  const router = useRouter();
  const done = useRef(false);
  const [etat, setEtat] = useState<"idle" | "claiming">("idle");

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(DRAFT_KEY);
    } catch {}
    if (!raw) return;

    (async () => {
      setEtat("claiming");
      try {
        const payload = JSON.parse(raw!);
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { id } = await res.json();
          try {
            localStorage.removeItem(DRAFT_KEY);
          } catch {}
          router.replace(`/projets/${id}`);
          router.refresh();
          return;
        }
      } catch {}
      // Échec (ex. payload invalide) : on nettoie et on reste sur la liste.
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setEtat("idle");
    })();
  }, [router]);

  if (etat !== "claiming") return null;
  return (
    <div className="card flex items-center gap-3 p-4 text-sm text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
      Enregistrement de ton estimation…
    </div>
  );
}

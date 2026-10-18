"use client";

import { useEffect, useState } from "react";

/**
 * Le champ en faute à l'enregistrement (« Enregistrer » sans code postal) : `signaler` le marque
 * (`champ`, que l'appelant passe en `aria-invalid`), puis le centre et lui donne le focus, une fois
 * la saisie réaffichée. Le même comportement dans les deux détaillés (A7) et dans le rapide de la
 * rénovation (N13) ; `effacer` le démarque. Module à part : le rapide le prend sans les briques du
 * questionnaire (`intake.tsx`, qui le réexporte).
 */
export function useChampEnFaute<K extends string>() {
  const [faute, setFaute] = useState<{ champ: K; id: string; n: number } | null>(null);
  useEffect(() => {
    if (!faute) return;
    const el = document.getElementById(faute.id);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); }
  }, [faute]);
  return {
    champ: faute?.champ ?? null,
    /** `id` : celui du champ à focaliser (son `htmlFor`). Signaler deux fois de suite refocalise. */
    signaler: (champ: K, id: string) => setFaute((f) => ({ champ, id, n: (f?.n ?? 0) + 1 })),
    effacer: () => setFaute(null),
  };
}


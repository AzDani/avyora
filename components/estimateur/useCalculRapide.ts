"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BANC } from "@/lib/estimateur/banc-essai";

/**
 * L'estimation rapide chiffrée par le serveur (`POST /api/estimateur/rapide`, 27/11/2026) : le formulaire envoie ses
 * réponses (`entree`), il reçoit ce qu'il affiche. Une demande par jeu de réponses (groupées à ~0,15 s pendant la
 * frappe), les réponses déjà vues sont relues sans requête ; la dernière réponse reste affichée pendant le calcul de
 * la suivante (les montants glissent, comme avant, par `CountUp`).
 *
 * `attendre()` rend le résultat des réponses COURANTES (sans délai) : « Enregistrer », « Affiner » et le brouillon
 * ne rangent jamais le preset d'un état précédent.
 *
 * `droitsBanc` ne sert qu'au banc d'essai des tests (`BANC.calculRapide`) : sur le site, c'est la session qui décide.
 */
export function useCalculRapide<S>(entree: unknown, droitsBanc: { compte: boolean; pro: boolean }): {
  res: S | null;
  /** `res` correspond aux réponses affichées. */
  aJour: boolean;
  attendre: () => Promise<S>;
} {
  const cle = JSON.stringify(entree);
  const cache = useRef(new Map<string, Promise<S>>());
  const courante = useRef(cle);
  courante.current = cle;
  const [etat, setEtat] = useState<{ cle: string; res: S } | null>(null);
  const premier = useRef(true);

  const obtenir = useCallback((c: string): Promise<S> => {
    const vu = cache.current.get(c);
    if (vu) return vu;
    const p = fetch("/api/estimateur/rapide", { method: "POST", headers: { "Content-Type": "application/json" }, body: c, credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as S;
      });
    p.catch(() => cache.current.delete(c));
    if (cache.current.size > 60) cache.current.clear();
    cache.current.set(c, p);
    return p;
  }, []);

  useEffect(() => {
    let vivant = true;
    const delai = premier.current ? 0 : 150;
    premier.current = false;
    const id = window.setTimeout(() => {
      obtenir(cle).then((res) => { if (vivant && courante.current === cle) setEtat({ cle, res }); }).catch(() => { /* réseau : la dernière réponse reste */ });
    }, delai);
    return () => { vivant = false; window.clearTimeout(id); };
  }, [cle, obtenir]);

  const attendre = useCallback(() => obtenir(courante.current), [obtenir]);
  if (BANC.calculRapide) {
    const local = BANC.calculRapide(entree, droitsBanc) as S;
    return { res: local, aJour: true, attendre: async () => local };
  }
  return { res: etat?.res ?? null, aJour: etat?.cle === cle, attendre };
}

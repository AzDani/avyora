"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { CHAMP_CAPTCHA, CLE_CAPTCHA, ORIGINE_CAPTCHA } from "@/lib/captcha";

type Turnstile = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let chargement: Promise<void> | null = null;

/** Le script de Turnstile, chargé une fois, à la demande (rendu explicite : les formulaires apparaissent après coup). */
function chargerTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = `${ORIGINE_CAPTCHA}/turnstile/v0/api.js?render=explicit`;
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => {
        chargement = null;
        ko(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return chargement;
}

/**
 * Le CAPTCHA d'un formulaire d'accès (lib/captcha.ts) : rien sans `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Sinon, un widget
 * Turnstile « seulement si besoin » (invisible pour presque tout le monde) qui ajoute au formulaire le champ caché du
 * jeton. Un jeton ne sert qu'une fois : le formulaire change la `key` de ce composant après chaque envoi (nouveau widget).
 */
export function Captcha() {
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  useEffect(() => {
    if (!CLE_CAPTCHA) return;
    let id: string | null = null;
    let fini = false;
    chargerTurnstile()
      .then(() => {
        if (fini || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: CLE_CAPTCHA,
          appearance: "interaction-only",
          size: "flexible",
          language: locale,
          "response-field-name": CHAMP_CAPTCHA,
        });
      })
      .catch(() => {
        /* script indisponible : Supabase refusera l'envoi, le formulaire le dira */
      });
    return () => {
      fini = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [locale]);
  if (!CLE_CAPTCHA) return null;
  return <div ref={ref} data-captcha="" />;
}

/** Un compteur qui avance à chaque nouvel état d'un formulaire : la `key` du CAPTCHA (un jeton neuf par envoi). */
export function useCleCaptcha(etat: unknown): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (etat !== undefined) setN((x) => x + 1);
  }, [etat]);
  return n;
}

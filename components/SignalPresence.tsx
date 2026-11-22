"use client";

import { useEffect } from "react";

/**
 * Charge `public/presence.js` (compteur « en ligne » de l'admin, sans cookie : lib/presence.ts) une fois la page
 * interactive. Pas de `next/script` dans le layout : le test du consentement l'y interdit, garde contre un retour de gtag.
 * Le même fichier sert l'éditeur de plan (lib/editeur/heberger.ts), qui ne passe pas par ce layout.
 */
export default function SignalPresence() {
  useEffect(() => {
    if (document.querySelector('script[data-presence]')) return;
    const s = document.createElement("script");
    s.src = "/presence.js";
    s.defer = true;
    s.dataset.presence = "";
    document.body.appendChild(s);
  }, []);
  return null;
}

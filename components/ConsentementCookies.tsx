"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LangProvider";
import {
  choixEnregistre,
  effacerTraceursGoogle,
  enregistrerChoix,
  EVENEMENT_OUVRIR,
  type Choix,
} from "@/lib/consentement";
import { chargerGtag, retirerConsentementGtag } from "@/lib/gtag";

/**
 * Bandeau de consentement aux cookies publicitaires (CNIL) : « Tout accepter » et « Tout refuser », deux boutons
 * identiques, aucune case pré-cochée, choix gardé 6 mois (lib/consentement.ts). Rien n'est rendu côté serveur : le
 * choix vit dans le navigateur, le bandeau apparaît au montage s'il n'y en a pas (ou plus) de valable.
 *
 * - Visiteur qui avait accepté : la balise Google Ads est chargée tout de suite, pas de bandeau.
 * - « Tout refuser » après avoir accepté (lien « Gérer mes cookies ») : Consent Mode repasse à « denied » et les cookies
 *   Google du domaine sont effacés.
 *
 * Jamais imprimé (print:hidden) : le PDF du rapport est une impression de page par un Chrome sans choix enregistré.
 *
 * Fixe en bas d'écran, compact ; une cale de même hauteur en fin de page laisse remonter le pied de page au-dessus de
 * lui, rien n'est donc caché pour de bon sur mobile.
 */
export default function ConsentementCookies() {
  const t = useT().cookies;
  const [ouvert, setOuvert] = useState(false);
  const [hauteur, setHauteur] = useState(0);
  const boite = useRef<HTMLElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  const rouvert = useRef(false);

  useEffect(() => {
    const choix = choixEnregistre();
    if (choix === "accepte") chargerGtag();
    // Pas de choix valable (première visite, ou plus de 6 mois) : on le demande.
    else if (choix === null) setOuvert(true);
    const ouvrir = () => {
      rouvert.current = true;
      setOuvert(true);
    };
    window.addEventListener(EVENEMENT_OUVRIR, ouvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, ouvrir);
  }, []);

  // La cale suit la hauteur réelle du bandeau (retour à la ligne, rotation de l'écran).
  useEffect(() => {
    if (!ouvert || !boite.current) return;
    const el = boite.current;
    const mesurer = () => setHauteur(el.offsetHeight + 24);
    mesurer();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ouvert]);

  // Rouvert par « Gérer mes cookies » : le focus va au bandeau (clavier, lecteur d'écran).
  useEffect(() => {
    if (ouvert && rouvert.current) {
      rouvert.current = false;
      titre.current?.focus();
    }
  }, [ouvert]);

  if (!ouvert) return null;

  const choisir = (choix: Choix) => {
    enregistrerChoix(choix);
    if (choix === "accepte") {
      chargerGtag();
    } else {
      retirerConsentementGtag();
      effacerTraceursGoogle();
    }
    setOuvert(false);
  };

  return (
    <>
      <div aria-hidden="true" className="print:hidden" style={{ height: hauteur }} />
      <section
        ref={boite}
        role="dialog"
        aria-modal="false"
        aria-labelledby="consentement-titre"
        aria-describedby="consentement-texte"
        className="fixed inset-x-4 bottom-4 z-50 print:hidden mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-4 shadow-[0_18px_50px_-20px_rgba(30,27,75,0.45)] sm:p-5"
      >
        <div className="sm:flex sm:items-end sm:gap-6">
          <div className="min-w-0 flex-1">
            <h2 id="consentement-titre" ref={titre} tabIndex={-1} className="text-sm font-semibold text-ink outline-none">
              {t.titre}
            </h2>
            <p id="consentement-texte" className="mt-1 text-[13px] leading-snug text-muted">
              {t.texte}{" "}
              <Link href="/cookies" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
                {t.enSavoirPlus}
              </Link>
            </p>
          </div>
          {/* Même poids visuel pour les deux choix : mêmes classes, même taille, côte à côte. */}
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => choisir("refuse")} className="btn btn-primary flex-1 whitespace-nowrap py-2 sm:flex-none">
              {t.refuser}
            </button>
            <button type="button" onClick={() => choisir("accepte")} className="btn btn-primary flex-1 whitespace-nowrap py-2 sm:flex-none">
              {t.accepter}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

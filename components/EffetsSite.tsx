"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Les effets du site (24/11/2026, maquette validée par Dani), posés une fois dans le layout pour toutes les pages :
 *  - la barre du haut se resserre dès qu'on descend (classe `compact` sur `[data-entete]`) ;
 *  - au défilement, les blocs encore sous l'écran glissent en place quand ils arrivent (sections, articles, cartes :
 *    le plus intérieur seulement, en cascade entre voisins). Un bloc déjà visible au chargement ne bouge pas, et rien
 *    n'est jamais invisible : il part d'une légère transparence (globals.css, `.rv-pret`). Les blocs qui arrivent
 *    ensemble à l'écran se suivent à 80 ms d'écart ;
 *  - les chiffres marqués `data-compte` se comptent quand ils arrivent à l'écran (le vrai chiffre est écrit dans la
 *    page : sans script, il reste affiché).
 * Pas d'effet de défilement dans l'application (projets, éditeur, espaces, admin, formulaires de compte) : on y
 * travaille, on ne la découvre pas. Tout est coupé si l'appareil demande moins d'animations.
 */
const SANS_DEFILEMENT = [
  "/projets", "/plan", "/admin", "/mon-espace", "/espace-artisan", "/onboarding", "/connexion", "/inscription",
  "/reset", "/auth", "/bienvenue-pro", "/demandes-devis",
];
/* Les pages de prix (prix des travaux, par ville, par poste) n'ont pas de sections : leurs titres, tableaux et listes
   glissent un par un (24/11/2026, demande de Dani). */
const CIBLES = "section, article, .card, .offre, .tuile, .av-seo > *, .av-poste > *, .av-hub > *";

export default function EffetsSite() {
  const chemin = usePathname();

  // La barre du haut, une fois pour toute la visite.
  useEffect(() => {
    const tete = document.querySelector("[data-entete]");
    if (!tete) return;
    const suivre = () => tete.classList.toggle("compact", window.scrollY > 40);
    suivre();
    window.addEventListener("scroll", suivre, { passive: true });
    return () => window.removeEventListener("scroll", suivre);
  }, []);

  // Le défilement et les compteurs, à chaque page.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.getElementById("contenu");
    if (!main) return;
    const minuteurs: number[] = [];

    const compteurs = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        compteurs.unobserve(e.target);
        const el = e.target as HTMLElement;
        const fin = Number(el.dataset.compte);
        if (!Number.isFinite(fin) || fin <= 0) continue;
        const debut = performance.now();
        const duree = fin > 20 ? 1200 : 900;
        const pas = (t: number) => {
          const p = Math.min(1, (t - debut) / duree);
          el.textContent = String(Math.round(fin * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(pas);
        };
        el.textContent = "0";
        requestAnimationFrame(pas);
      }
    }, { threshold: 0.5 });
    main.querySelectorAll<HTMLElement>("[data-compte]").forEach((el) => compteurs.observe(el));

    const exclu = SANS_DEFILEMENT.some((p) => chemin === p || chemin.startsWith(`${p}/`));
    const blocs: HTMLElement[] = [];
    if (!exclu) {
      const tous = Array.from(main.querySelectorAll<HTMLElement>(CIBLES)).filter((el) => !el.closest("form, [data-rv-non]") && !/^(STYLE|SCRIPT)$/.test(el.tagName));
      const hauteur = window.innerHeight;
      for (const el of tous) {
        if (tous.some((autre) => autre !== el && el.contains(autre))) continue; // le plus intérieur seulement
        if (el.getBoundingClientRect().top < hauteur * 0.92) continue; // déjà visible : ne bouge pas
        blocs.push(el);
      }
    }
    const revele = new IntersectionObserver((entrees) => {
      let rang = 0;
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        revele.unobserve(e.target);
        const el = e.target as HTMLElement;
        if (rang > 0) el.style.transitionDelay = `${Math.min(rang, 5) * 80}ms`;
        rang++;
        el.classList.add("rv-vu");
        // Une fois arrivé, le bloc rend la main à ses propres effets (zoom au survol).
        minuteurs.push(window.setTimeout(() => { el.classList.remove("rv-pret", "rv-vu"); el.style.removeProperty("transition-delay"); }, 1100));
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    for (const el of blocs) {
      el.classList.add("rv-pret");
      revele.observe(el);
    }

    return () => {
      compteurs.disconnect();
      revele.disconnect();
      minuteurs.forEach((m) => window.clearTimeout(m));
      for (const el of blocs) { el.classList.remove("rv-pret", "rv-vu"); el.style.removeProperty("transition-delay"); }
    };
  }, [chemin]);

  return null;
}

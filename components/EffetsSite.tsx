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
  "/reset", "/auth", "/bienvenue-pro", "/demandes-devis", "/avis-artisans",
  // Les estimateurs (le formulaire est le haut de ces pages) : on y travaille aussi.
  "/estimation-travaux", "/estimation-construction-maison",
];
const CIBLES = "section, article, .card, .offre, .tuile";
/* Les pages de lecture (prix, guides, méthodologie, pages légales…) n'ont souvent pas de sections : leurs titres,
   tableaux et listes glissent un par un. On les trouve partout de la même façon : tout bloc qui contient au moins deux
   intertitres (h2) directs est un « fil de lecture », et chacun de ses enfants glisse (24/11/2026, « partout sur le site
   on garde cette logique »). */
function filsDeLecture(main: HTMLElement): HTMLElement[] {
  const parents = new Map<HTMLElement, number>();
  main.querySelectorAll<HTMLElement>("h2").forEach((h) => { if (h.parentElement) parents.set(h.parentElement, (parents.get(h.parentElement) ?? 0) + 1); });
  const out: HTMLElement[] = [];
  for (const [p, n] of parents) if (n >= 2) out.push(...(Array.from(p.children) as HTMLElement[]));
  return out;
}

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
      const tous = Array.from(new Set([...main.querySelectorAll<HTMLElement>(CIBLES), ...filsDeLecture(main)]))
        .filter((el) => !el.closest("form, [data-rv-non]") && !/^(STYLE|SCRIPT|LINK|META)$/.test(el.tagName));
      const hauteur = window.innerHeight;
      for (const el of tous) {
        if (tous.some((autre) => autre !== el && el.contains(autre))) continue; // le plus intérieur seulement
        if (el.getBoundingClientRect().top < hauteur * 0.92) continue; // déjà visible : ne bouge pas
        blocs.push(el);
      }
    }
    const montrer = (el: HTMLElement, rang: number) => {
      if (el.classList.contains("rv-vu") || !el.classList.contains("rv-pret")) return;
      revele.unobserve(el);
      if (rang > 0) el.style.transitionDelay = `${Math.min(rang, 5) * 80}ms`;
      el.classList.add("rv-vu");
      // Une fois arrivé, le bloc rend la main à ses propres effets (zoom au survol).
      minuteurs.push(window.setTimeout(() => { el.classList.remove("rv-pret", "rv-vu"); el.style.removeProperty("transition-delay"); }, 1100));
    };
    const revele = new IntersectionObserver((entrees) => {
      let rang = 0;
      for (const e of entrees) if (e.isIntersecting) montrer(e.target as HTMLElement, rang++);
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    for (const el of blocs) {
      el.classList.add("rv-pret");
      revele.observe(el);
    }
    // Filet : un saut (lien vers #demande, retour en arrière) peut passer par-dessus des blocs sans qu'ils « entrent » à
    // l'écran. Après chaque défilement, tout bloc déjà dépassé ou à l'écran est montré.
    let image = 0;
    const filet = () => {
      if (image) return;
      image = requestAnimationFrame(() => {
        image = 0;
        const bas = window.innerHeight * 0.92;
        let rang = 0;
        for (const el of blocs) if (el.getBoundingClientRect().top < bas) montrer(el, rang++);
      });
    };
    window.addEventListener("scroll", filet, { passive: true });

    return () => {
      window.removeEventListener("scroll", filet);
      if (image) cancelAnimationFrame(image);
      compteurs.disconnect();
      revele.disconnect();
      minuteurs.forEach((m) => window.clearTimeout(m));
      for (const el of blocs) { el.classList.remove("rv-pret", "rv-vu"); el.style.removeProperty("transition-delay"); }
    };
  }, [chemin]);

  return null;
}

"use client";

/**
 * Visite guidée d'un estimateur : des bulles ancrées aux vrais éléments de la page, étape par étape.
 * Même esprit et même ergonomie que la visite de l'éditeur de plan (`maquettes/plan-editor.html`, D42) ;
 * la logique pure (mémoire, étapes, clavier, géométrie, mesure) vit dans `lib/visite.ts`.
 *
 * Ce que rend le composant, À L'ENDROIT où on le pose (en haut de l'estimateur) :
 *  - une rangée de 44 px avec le bouton discret « ? Visite guidée » ;
 *  - à la première visite seulement, à sa place, l'invitation « Te guider en 1 minute ? » (C'est parti / Non merci),
 *    dans la page : elle ne bloque rien, ne chevauche ni la barre de prix collante ni le bandeau cookies, et
 *    n'apparaît qu'une fois ce bandeau fermé. Jamais sur un formulaire prérempli (`prerempli`).
 * Pendant la visite (portail dans `body`) : un voile, un halo autour de la cible, la bulle (`role="dialog"`,
 * `aria-modal`) posée à côté sans jamais la couvrir (au téléphone, une feuille en bas, ou en haut si la cible est
 * dessous), points de progression, Suivant / Retour / Passer, Échap, ← →, Tab qui reste dans la bulle ; rien
 * d'autre n'est cliquable. La page défile jusqu'à chaque cible. À la fermeture, « fait » ou « passé » est mémorisé
 * (par estimateur) et le focus revient où il était.
 *
 * La visite ne touche ni aux réponses, ni aux calculs, ni au réseau (aucune requête, aucune conversion Google Ads) :
 * elle lit la position des éléments, rien d'autre. Mesure : visite_debut / visite_fin / visite_passee (`suivre`).
 *
 * Ajouter une visite à un estimateur : poser `data-visite="nom"` sur les éléments à montrer, écrire les textes
 * dans `lib/i18n/visite.ts` (section de l'estimateur, FR et EN), puis
 *   <VisiteGuidee id="rapideNeuf" etapes={[{ id: "surface", cible: "neuf-surface", ...tv.rapideNeuf.surface }, …]} prerempli={…} />
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictVisite, type DictVisite } from "@/lib/i18n/visite";
import { choixEnregistre, EVENEMENT_CHOIX } from "@/lib/consentement";
import {
  actionClavier, defilement, doitInviter, lireVisite, memoriserVisite, mesurerVisite, naviguer, placerBulle, resoudreEtapes,
  selecteurCible, unionRects, type EtapeResolue, type EtapeVisite, type EtatVisite, type IdVisite, type Rect,
} from "@/lib/visite";

export type { EtapeVisite, IdVisite };

/** Même point de bascule que le CSS des rapides (`rapide-styles.ts`) : en dessous, la bulle devient une feuille. */
const MQ_MOBILE = "(max-width: 560px)";
const estMobile = () => typeof window !== "undefined" && !!window.matchMedia?.(MQ_MOBILE).matches;
const mouvementReduit = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Collé à l'écran (barre de prix `position: sticky`…) : défiler ne le rapproche pas, il est déjà où il sera. */
function estColle(el: HTMLElement): boolean {
  for (let e: HTMLElement | null = el; e && e !== document.body; e = e.parentElement) {
    const pos = getComputedStyle(e).position;
    if (pos === "sticky" || pos === "fixed") return true;
  }
  return false;
}
/** L'élément d'une cible, s'il est dans la page ET affiché (un `display:none` n'a pas de boîte). */
function elementDe(nom: string): HTMLElement | null {
  try {
    const el = document.querySelector<HTMLElement>(selecteurCible(nom));
    return el && el.getClientRects().length > 0 ? el : null;
  } catch {
    return null; // sélecteur invalide : l'étape est sautée
  }
}
/** La hauteur occupée en haut par l'en-tête collant du site (la cible ne doit pas défiler dessous). */
function hauteurEntete(): number {
  let h = 0;
  for (const el of Array.from(document.querySelectorAll("header"))) {
    const pos = getComputedStyle(el).position;
    if (pos !== "sticky" && pos !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom > 0) h = Math.max(h, r.bottom);
  }
  return h;
}
const FOCUSABLES = "button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex='-1'])";

export default function VisiteGuidee({ id, etapes, prerempli = false }: {
  /** L'estimateur (une mémoire chacun). */
  id: IdVisite;
  /** Les étapes, dans l'ordre ; celles dont la cible manque sont sautées. */
  etapes: EtapeVisite[];
  /** Formulaire arrivé déjà rempli (page de prix, brouillon, projet rouvert) : pas d'invitation, le bouton seulement. */
  prerempli?: boolean;
}) {
  const t = dictVisite(useLocale()).commun;
  /** `undefined` tant que la mémoire n'est pas lue (rendu serveur, 1er rendu) : rien à inviter. */
  const [etat, setEtat] = useState<EtatVisite | null | undefined>(undefined);
  const [cookiesOuverts, setCookiesOuverts] = useState(true);
  const [visite, setVisite] = useState<null | { origine: "invitation" | "bouton" }>(null);
  const aideRef = useRef<HTMLButtonElement>(null);
  const retourRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setEtat(lireVisite(id));
    // Le bandeau cookies d'abord : l'invitation attend le choix (un seul message à la fois).
    if (choixEnregistre() !== null) { setCookiesOuverts(false); return; }
    const ferme = () => setCookiesOuverts(false);
    window.addEventListener(EVENEMENT_CHOIX, ferme);
    return () => window.removeEventListener(EVENEMENT_CHOIX, ferme);
  }, [id]);

  const inviter = etat !== undefined && !visite && doitInviter({ etat, prerempli, cookiesOuverts });

  const lancer = (origine: "invitation" | "bouton") => {
    // Depuis l'invitation, qui disparaît : le focus reviendra au bouton « ? Visite guidée ».
    const actif = document.activeElement as HTMLElement | null;
    retourRef.current = origine === "invitation" || !actif || actif === document.body ? null : actif;
    setVisite({ origine });
  };
  const nonMerci = () => {
    memoriserVisite(id, "passe");
    setEtat("passe");
    mesurerVisite("visite_passee", { estimateur: id, etape: 0, origine: "invitation" });
    requestAnimationFrame(() => aideRef.current?.focus({ preventScroll: true }));
  };
  /** Fin de visite. `null` : rien à montrer (aucune cible présente), rien n'est mémorisé. */
  const fermer = useCallback((fin: "fait" | "passe" | null, etape: number, n: number) => {
    if (fin) {
      memoriserVisite(id, fin);
      setEtat(fin);
      mesurerVisite(fin === "fait" ? "visite_fin" : "visite_passee", { estimateur: id, etape, etapes: n });
    }
    setVisite(null);
    const avant = retourRef.current;
    retourRef.current = null;
    requestAnimationFrame(() => {
      // Le bouton « ? Visite guidée » n'existe qu'une fois l'invitation partie : lu ici, après le rendu.
      const r = avant ?? aideRef.current;
      if (r && document.contains(r) && r.getClientRects().length) r.focus({ preventScroll: true });
    });
  }, [id]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VISITE_CSS }} />
      <div className="av-visite-barre">
        {inviter ? (
          <div className="av-visite-invit" role="group" aria-label={t.regionInvitation}>
            <span className="av-visite-invit-t">{t.invitation}</span>
            <button type="button" className="av-visite-go" onClick={() => lancer("invitation")}>{t.cestParti}</button>
            <button type="button" className="av-visite-non" onClick={nonMerci}>{t.nonMerci}</button>
          </div>
        ) : (
          <button type="button" ref={aideRef} className="av-visite-aide" aria-haspopup="dialog" aria-label={t.boutonAria} onClick={() => lancer("bouton")}>
            <span className="av-visite-q" aria-hidden="true">?</span>{t.bouton}
          </button>
        )}
      </div>
      {visite && typeof document !== "undefined" && createPortal(
        <Bulle id={id} etapes={etapes} t={t} origine={visite.origine} onFin={fermer} />,
        document.body,
      )}
    </>
  );
}

/** La visite en cours : voile, halo, bulle. Monté seulement côté client (portail), le temps de la visite. */
function Bulle({ id, etapes, t, origine, onFin }: {
  id: IdVisite;
  etapes: EtapeVisite[];
  t: DictVisite["commun"];
  origine: "invitation" | "bouton";
  onFin: (fin: "fait" | "passe" | null, etape: number, n: number) => void;
}) {
  const [liste, setListe] = useState<EtapeResolue[]>([]);
  const [i, setI] = useState(0);
  const [mobile, setMobile] = useState(estMobile);
  const rootRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const bulleRef = useRef<HTMLDivElement>(null);
  const suivantRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const idTitre = `${uid}-titre`, idTexte = `${uid}-texte`;
  /** L'état courant, pour les écouteurs posés une fois. */
  const courant = useRef({ i, liste, mobile });
  courant.current = { i, liste, mobile };
  /**
   * Le défilement en cours vers la cible (`y` visé) : pendant qu'il glisse, la bulle choisit son côté d'après la
   * position FINALE de la cible (sinon, au téléphone, la feuille sauterait du bas vers le haut au passage).
   */
  const visee = useRef<{ y: number } | null>(null);
  const debutMesure = useRef(false);

  // Les étapes jouables, au lancement : sans aucune, la visite se referme sans rien mémoriser.
  useLayoutEffect(() => {
    const l = resoudreEtapes(etapes, (nom) => !!elementDe(nom), mobile);
    if (!l.length) { onFin(null, 0, 0); return; }
    setListe(l);
    // Une fois, même quand React rejoue les effets du montage (mode strict, en développement).
    if (!debutMesure.current) { debutMesure.current = true; mesurerVisite("visite_debut", { estimateur: id, etapes: l.length, origine }); }
    // Une seule résolution au lancement (le redimensionnement refait la sienne, plus bas).
  }, []);

  const rectCible = useCallback((e: EtapeResolue | undefined): Rect | null => {
    if (!e) return null;
    const rs: Rect[] = [];
    for (const nom of e.cibles) {
      const el = elementDe(nom);
      if (el) { const r = el.getBoundingClientRect(); rs.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }); }
    }
    return unionRects(rs);
  }, []);

  /** Halo autour de la cible, bulle à côté : relu à chaque défilement et redimensionnement. */
  const placer = useCallback(() => {
    const { i, liste, mobile } = courant.current;
    const root = rootRef.current, halo = haloRef.current, b = bulleRef.current;
    if (!root || !halo || !b) return;
    const e = liste[i];
    const vue = { w: document.documentElement.clientWidth || window.innerWidth, h: window.innerHeight };
    const r = rectCible(e);
    root.classList.toggle("sanscible", !r);
    if (r) {
      const pad = 6, x = Math.max(3, r.left - pad), y = Math.max(3, r.top - pad);
      const x2 = Math.min(vue.w - 3, r.right + pad), y2 = Math.min(vue.h - 3, r.bottom + pad);
      halo.style.display = x2 > x && y2 > y ? "block" : "none";
      halo.style.left = `${x}px`; halo.style.top = `${y}px`;
      halo.style.width = `${Math.max(0, x2 - x)}px`; halo.style.height = `${Math.max(0, y2 - y)}px`;
    } else halo.style.display = "none";
    // Pendant le défilement vers la cible : le côté se choisit sur sa position d'arrivée ; à l'ordinateur la bulle
    // glisse avec elle, au téléphone la feuille reste où elle sera.
    let ecart = 0;
    if (visee.current) {
      ecart = window.scrollY - visee.current.y;
      if (Math.abs(ecart) < 2) { visee.current = null; ecart = 0; }
    }
    const fin = r && ecart ? { left: r.left, right: r.right, top: r.top + ecart, bottom: r.bottom + ecart } : r;
    const p = placerBulle({ cible: fin, bulle: { w: b.offsetWidth, h: b.offsetHeight }, vue, mobile, place: e?.place });
    b.style.left = `${Math.round(p.x)}px`;
    b.style.top = `${Math.round(mobile ? p.y : p.y - ecart)}px`;
    b.dataset.cote = p.cote;
  }, [rectCible]);

  // Chaque étape : la page défile jusqu'à la cible (avec la place de la bulle), la bulle se pose, le focus y entre.
  useLayoutEffect(() => {
    const e = liste[i];
    if (!e) return;
    const b = bulleRef.current;
    const r = rectCible(e);
    visee.current = null;
    // Une cible collée à l'écran et déjà visible (la barre de prix) : la page ne bouge pas.
    const colle = r && r.top >= 0 && r.bottom <= window.innerHeight && e.cibles.some((nom) => { const el = elementDe(nom); return !!el && estColle(el); });
    if (r && b && !colle) {
      const d = defilement({ cible: r, vue: { w: window.innerWidth, h: window.innerHeight }, mobile, bulle: { h: b.offsetHeight }, entete: hauteurEntete() });
      if (Math.abs(d) > 2) {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const y = Math.max(0, Math.min(max, window.scrollY + d));
        const reduit = mouvementReduit();
        if (!reduit) visee.current = { y };
        window.scrollTo({ top: y, behavior: reduit ? "instant" : "smooth" });
      }
    }
    placer();
    suivantRef.current?.focus({ preventScroll: true });
    // Un défilement interrompu (molette, doigt) : au bout d'un moment, on se recale sur la position réelle.
    const ids = [window.setTimeout(placer, 180), window.setTimeout(placer, 450), window.setTimeout(() => { visee.current = null; placer(); }, 900)];
    return () => ids.forEach((x) => window.clearTimeout(x));
  }, [i, liste, mobile, placer, rectCible]);

  // Défilement (la molette reste libre) et redimensionnement : la bulle suit ; passage téléphone ↔ ordinateur :
  // les étapes sont relues (une cible a pu apparaître ou disparaître) et la visite reprend à la même étape.
  useEffect(() => {
    let raf = 0;
    const suivre = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placer); };
    const redim = () => {
      const m = estMobile();
      if (m === courant.current.mobile) { suivre(); return; }
      const { i, liste } = courant.current;
      const ici = liste[i]?.id;
      const l = resoudreEtapes(etapes, (nom) => !!elementDe(nom), m);
      if (!l.length) { onFin(null, 0, 0); return; }
      const j = l.findIndex((e) => e.id === ici);
      setMobile(m); setListe(l); setI(j >= 0 ? j : Math.min(i, l.length - 1));
    };
    window.addEventListener("scroll", suivre, { passive: true });
    window.addEventListener("resize", redim);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", suivre); window.removeEventListener("resize", redim); };
  }, [etapes, onFin, placer]);

  const aller = useCallback((action: "suivant" | "retour") => {
    const { i, liste } = courant.current;
    const r = naviguer(i, liste.length, action);
    if (r === "fin") onFin("fait", liste.length, liste.length);
    else setI(r);
  }, [onFin]);
  const passer = useCallback(() => {
    const { i, liste } = courant.current;
    onFin("passe", i + 1, liste.length);
  }, [onFin]);

  // Clavier : Échap passe, ← → naviguent, Tab reste dans la bulle ; aucune autre touche n'atteint la page.
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      const b = bulleRef.current;
      if (!b) return;
      const a = actionClavier(ev.key);
      if (a === "passer") { ev.preventDefault(); ev.stopPropagation(); passer(); return; }
      if (a === "suivant" || a === "retour") { ev.preventDefault(); ev.stopPropagation(); aller(a); return; }
      if (a === "tab") {
        ev.preventDefault();
        const f = Array.from(b.querySelectorAll<HTMLElement>(FOCUSABLES));
        if (!f.length) { b.focus(); return; }
        const k = f.indexOf(document.activeElement as HTMLElement);
        f[ev.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k === -1 || k === f.length - 1 ? 0 : k + 1)].focus();
        return;
      }
      // Entrée / Espace sur un bouton de la bulle : son clic. Le reste (défilement au clavier compris) reste
      // permis tant qu'il vise la bulle ; tout ce qui viserait la page est arrêté.
      if (!(ev.target instanceof Node && b.contains(ev.target))) { ev.preventDefault(); ev.stopPropagation(); }
    };
    // Le focus qui s'échapperait (lecteur d'écran, clic programmé) revient dans la bulle.
    const garde = (ev: FocusEvent) => {
      const b = bulleRef.current;
      if (b && ev.target instanceof Node && !b.contains(ev.target)) (suivantRef.current ?? b).focus({ preventScroll: true });
    };
    window.addEventListener("keydown", touche, true);
    document.addEventListener("focusin", garde);
    return () => { window.removeEventListener("keydown", touche, true); document.removeEventListener("focusin", garde); };
  }, [aller, passer]);

  /** Un clic à côté de la bulle ne fait rien : la bulle se signale d'un petit mouvement. */
  const secouer = (ev: React.PointerEvent) => {
    ev.preventDefault();
    const b = bulleRef.current;
    if (!b) return;
    b.classList.remove("secoue");
    void b.offsetWidth;
    b.classList.add("secoue");
  };

  const e = liste[i];
  const n = liste.length;
  const der = i === n - 1;
  return (
    <div ref={rootRef} className={"av-visite" + (mobile ? " mobile" : "")}>
      <div className="av-visite-bloc" onPointerDown={secouer} />
      <div ref={haloRef} className="av-visite-halo" aria-hidden="true" />
      <div ref={bulleRef} className="av-visite-bulle" role="dialog" aria-modal="true" aria-labelledby={idTitre} aria-describedby={idTexte} tabIndex={-1}
        style={e ? undefined : { visibility: "hidden" }}>
        {e && (
          <>
            <div aria-live="polite">
              <div className="av-visite-k">{t.etape(i + 1, n)}</div>
              <h2 id={idTitre} className="av-visite-titre">{e.titre}</h2>
              <p id={idTexte} className="av-visite-texte">{e.texte}</p>
            </div>
            <div className="av-visite-pied">
              <div className="av-visite-pts" aria-hidden="true">
                {liste.map((x, j) => <i key={x.id} className={j === i ? "on" : j < i ? "fait" : ""} />)}
              </div>
              {i > 0 && <button type="button" className="av-visite-lien" onClick={() => aller("retour")}>{t.retour}</button>}
              {!der && <button type="button" className="av-visite-lien" onClick={passer}>{t.passer}</button>}
              <button type="button" ref={suivantRef} className="av-visite-suiv" onClick={() => aller("suivant")}>
                {der ? t.terminer : t.suivant}
                {!der && <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Classes `av-visite-*` seulement (les noms courts existent déjà sous `.av-estim` et `.av-rapide`). Couleurs de la
 * marque (`app/globals.css`), avec leur valeur en secours.
 */
export const VISITE_CSS = `
.av-visite-barre{display:flex;justify-content:flex-end;align-items:center;min-height:44px;margin:-4px 0 10px}
.av-visite-aide{box-sizing:border-box;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px 0 8px;border-radius:999px;border:1px solid var(--color-line-strong,#dcdeec);background:var(--color-surface,#fff);color:var(--color-muted,#565a75);font:600 13px/1 var(--font-geist-sans),system-ui,sans-serif;cursor:pointer;transition:border-color .15s,color .15s}
.av-visite-aide:hover{border-color:var(--color-brand-200,#c7ccfe);color:var(--color-brand-700,#4338ca)}
.av-visite-q{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--color-brand-50,#eef1ff);color:var(--color-brand-600,#4f46e5);font:700 12px/1 var(--font-geist-mono),ui-monospace,monospace}
.av-visite-invit{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:44px;padding:3px 3px 3px 14px;border-radius:999px;background:var(--color-brand-50,#eef1ff);border:1px solid var(--color-brand-200,#c7ccfe);max-width:100%;animation:avVisiteIn .3s cubic-bezier(.22,.72,.2,1)}
.av-visite-invit-t{flex:1 1 auto;min-width:0;font:600 13.5px/1.25 var(--font-geist-sans),system-ui,sans-serif;color:var(--color-ink,#15172b);margin-right:4px}
.av-visite-go,.av-visite-non{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:999px;font:600 13px/1 var(--font-geist-sans),system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.av-visite-go{border:0;background:var(--color-brand-600,#4f46e5);color:#fff}
.av-visite-go:hover{background:var(--color-brand-700,#4338ca)}
.av-visite-non{border:0;background:transparent;color:var(--color-muted,#565a75)}
.av-visite-non:hover{color:var(--color-ink,#15172b);background:rgba(255,255,255,.7)}
.av-visite-aide:focus-visible,.av-visite-go:focus-visible,.av-visite-non:focus-visible,.av-visite button:focus-visible{outline:2px solid var(--color-brand-600,#4f46e5);outline-offset:2px}
@keyframes avVisiteIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.av-visite{position:fixed;inset:0;z-index:1000;font-family:var(--font-geist-sans),system-ui,sans-serif}
.av-visite-bloc{position:absolute;inset:0;background:transparent}
.av-visite.sanscible .av-visite-bloc{background:rgba(20,17,51,.5)}
.av-visite-halo{position:absolute;border-radius:14px;box-shadow:0 0 0 3px var(--color-accent-400,#a78bfa),0 0 0 9px rgba(167,139,250,.30),0 0 0 9999px rgba(20,17,51,.5);pointer-events:none}
.av-visite-bulle{box-sizing:border-box;position:absolute;left:0;top:0;width:344px;max-width:calc(100vw - 24px);background:var(--color-surface,#fff);color:var(--color-ink,#15172b);border-radius:16px;box-shadow:0 24px 60px -18px rgba(30,27,75,.55),0 2px 8px rgba(30,27,75,.12);padding:18px 18px 14px;outline:0}
.av-visite-bulle.secoue{animation:avVisiteSecoue .3s ease}
@keyframes avVisiteSecoue{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.av-visite-k{font:600 11px/1.2 var(--font-geist-mono),ui-monospace,monospace;color:var(--color-brand-600,#4f46e5);letter-spacing:.04em;text-transform:uppercase}
.av-visite-titre{font-size:17px;font-weight:700;margin:6px 0;letter-spacing:-.01em;line-height:1.25}
.av-visite-texte{font-size:14px;line-height:1.5;color:var(--color-muted,#565a75);margin:0}
.av-visite-pied{display:flex;align-items:center;gap:6px;margin-top:14px}
.av-visite-pts{display:flex;gap:5px;margin-right:auto}
.av-visite-pts i{width:7px;height:7px;border-radius:99px;background:var(--color-line-strong,#dcdeec);display:block;transition:width .2s}
.av-visite-pts i.fait{background:var(--color-accent-300,#c4b5fd)}
.av-visite-pts i.on{background:var(--color-brand-600,#4f46e5);width:18px}
.av-visite-lien{border:0;background:transparent;color:var(--color-muted,#565a75);font:600 13px/1 var(--font-geist-sans),system-ui,sans-serif;padding:0 9px;min-height:40px;border-radius:10px;cursor:pointer}
.av-visite-lien:hover{color:var(--color-ink,#15172b);background:var(--color-canvas,#f5f6fb)}
.av-visite-suiv{border:0;background:var(--color-brand-600,#4f46e5);color:#fff;font:700 13px/1 var(--font-geist-sans),system-ui,sans-serif;padding:0 14px;min-height:40px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.av-visite-suiv:hover{background:var(--color-brand-700,#4338ca)}
.av-visite.mobile .av-visite-bulle{width:calc(100vw - 16px);max-width:none;border-radius:18px;padding:16px 16px 12px}
.av-visite.mobile .av-visite-lien,.av-visite.mobile .av-visite-suiv{min-height:44px}
@media (max-width:560px){
.av-visite-barre{margin:-6px 0 10px;min-height:48px}
.av-visite-aide{min-height:44px}
.av-visite-invit{width:100%;min-height:48px;padding:1px 1px 1px 12px;gap:2px}
.av-visite-invit-t{font-size:13px}
.av-visite-go,.av-visite-non{min-height:44px;padding:0 12px}
}
@media (prefers-reduced-motion:reduce){.av-visite-invit,.av-visite-bulle.secoue{animation:none}.av-visite-pts i,.av-visite-aide{transition:none}}
@media print{.av-visite-barre,.av-visite{display:none!important}}
`;

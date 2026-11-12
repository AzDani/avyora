"use client";

/**
 * Estimation rapide (< 2 min) : 4 questions → preset de lots → MÊME moteur que l'estimateur détaillé.
 * « Affiner » ouvre le détaillé pré-rempli (via le brouillon localStorage). « Enregistrer » crée le projet.
 *
 * Édition d'un projet existant (`edit`, page « Modifier » d'un compte gratuit) : le chiffre s'affiche
 * d'emblée, mais rien n'est mesuré ni déclaré à Google Ads avant une vraie action ; la liste des
 * pièces et le suivi de chantier sont repris et renvoyés au PATCH (N4, règles dans `rapide-reno.ts`).
 *
 * Aligné sur le rapide du neuf (N13) : libellés selon le compte (droits, bêta, édition), « Affiner »
 * d'un visiteur sans les droits droit vers /tarifs avec ses réponses rendues au retour, boutons qui
 * disent s'ils sont pressés, champ en faute marqué et focalisé. La mesure et la conversion Google Ads
 * ne bougent pas : une fois, 1,8 s après une fourchette stable (`estimationReelle`).
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// Sous-modules ciblés plutôt que le baril `@/lib/estimateur` : le baril réexporte aussi le moteur
// de la construction neuve, qui n'a rien à faire dans le bundle de cette page.
import { buildDevis, regionCoef, type TypeBien, type Finition } from "@/lib/estimateur/core";
import { CATALOG } from "@/lib/estimateur/catalog";
import { presetRapide, AMPLEURS, SURFACE_MIN_RAPIDE, SURFACE_MAX_RAPIDE, type Ampleur, type QuiRealise } from "@/lib/estimateur/presets";
import { PIECES, presetPieces, type PieceKey, type PieceSel } from "@/lib/estimateur/pieces";
import {
  chiffreAfficheRapide, estimationReelleRapide, reponsesRapideReno, lireRetourRapideReno, codePostalValide, CLE_RETOUR_RENO, SURFACE_MAX_PIECE,
  type RapideEdit, type RetourRapideReno,
} from "@/lib/estimateur/rapide-reno";
import { CLE_BROUILLON_RENO, CLE_RECLAMATION_RENO, brouillonRapideReno } from "@/lib/estimateur/brouillon-reno";
import { suivre } from "@/lib/track";
import { conversionEstimation } from "@/lib/gtag";
import { useT, useLocale } from "@/components/i18n/LangProvider";
import Stepper from "@/components/Stepper";
import { CountUpNf as CountUp } from "@/components/estimateur/CountUp";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import { useChampEnFaute } from "@/components/estimateur/champ-en-faute";
import type { SourceSeo } from "@/lib/seo-source";
import { lienInscriptionBeta } from "@/lib/beta";
import { euroApres, euroAvant, signePct } from "@/lib/i18n/nombres";
import VisiteGuidee, { type EtapeVisite } from "@/components/visite/VisiteGuidee";
import { dictVisite } from "@/lib/i18n/visite";

type Mode = "bien" | "pieces";
// Pièces disponibles (mode « une ou plusieurs pièces ») : emoji, libellé, surface par défaut.
const ROOMS: { key: PieceKey; emoji: string; label: string; surf: number }[] = [
  { key: "cuisine", emoji: "🍳", label: "Cuisine", surf: 10 },
  { key: "sdb", emoji: "🚿", label: "Salle de bain", surf: 5 },
  { key: "chambre", emoji: "🛏️", label: "Chambre", surf: 12 },
  { key: "salon", emoji: "🛋️", label: "Salon / séjour", surf: 22 },
  { key: "suite", emoji: "🛁", label: "Suite parentale", surf: 20 },
  { key: "buanderie", emoji: "🧺", label: "Buanderie", surf: 6 },
];
const roomLabel = (k: PieceKey) => ROOMS.find((r) => r.key === k)!;
/** Les champs qu'« Enregistrer » peut signaler (marqués `aria-invalid`, puis focalisés) et la ligne d'erreur. */
const ID_CHAMP = { cp: "rapide-cp", surface: "rapide-surface" } as const;
const ID_ERREUR = "rapide-err";
const ID_CP_INCONNU = "rapide-cp-inconnu";
/** L'adresse de la page (chemin + paramètres) : les réponses gardées dans l'onglet ne valent que pour elle. */
const adresseCourante = () => (typeof window === "undefined" ? "" : window.location.pathname + window.location.search);
// Descriptions d'ampleur adaptées au mode « pièce » (traduites : voir t.piecesAmp dans le dictionnaire).

const DRAFT_KEY = CLE_BROUILLON_RENO;
// Ordre + niveau de jauge (le texte des cartes vient du dictionnaire i18n).
const FINITIONS: { v: Finition; lvl: number }[] = [
  { v: "eco", lvl: 1 },
  { v: "standard", lvl: 2 },
  { v: "premium", lvl: 3 },
];
const QUIS: { v: QuiRealise; lvl: number }[] = [
  { v: "pros", lvl: 1 },
  { v: "partie", lvl: 2 },
  { v: "max", lvl: 3 },
];

export type { RapideEdit };

/** Avertissement d'un projet rouvert (détaillé, ou pièces perdues) : même encadré que le rapide du neuf. */
const AVERT_CSS = `
.av-rapide .avert{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#7a4b00;background:#fff7e6;border:1px solid #f6d999;border-radius:var(--radius-card);padding:11px 14px;margin-bottom:18px}
.av-rapide .avert svg{flex:0 0 16px;margin-top:2px}
`;

/**
 * Contexte d'amorçage venu d'une page SEO (déjà validé côté serveur, cf. la page `rapide`).
 * `edit` reste réservé à la reprise d'un projet EXISTANT — les deux ne se mélangent pas.
 */
export type RapideInitial = { cp?: string; piece?: PieceKey; surface?: number; src?: SourceSeo };

export default function EstimateurRapide({
  isPro = false,
  beta = false,
  edit,
  initial,
  connecte,
}: {
  isPro?: boolean;
  /**
   * Le visiteur est-il connecté (décidé par la page, côté serveur) ? `false` : « Enregistrer » range le
   * brouillon et mène droit à l'inscription, sans POST voué au 401 (une erreur en console à chaque clic).
   * Absent : on ne sait pas, le POST tranche (le 401 reste géré, pour une session expirée).
   */
  connecte?: boolean;
  /**
   * Bêta gratuite en cours (lib/beta.ts, décidé par la page, côté serveur). Un non-Pro est alors un anonyme :
   * « Affiner », le multi-pièces et « Enregistrer » l'envoient créer son compte gratuit, pas payer.
   */
  beta?: boolean;
  edit?: RapideEdit;
  initial?: RapideInitial;
}) {
  const router = useRouter();
  // Une pièce transmise par l'URL ouvre directement le mode « pièces » avec cette pièce
  // présélectionnée : le visiteur venait de lire une page sur cette pièce précise.
  // Un projet « pièces » rouvert reprend sa liste (ou, enregistré avant N4, une liste à refaire).
  const [mode, setMode] = useState<Mode>(edit?.pieces?.length || edit?.piecesPerdues || (!edit && initial?.piece) ? "pieces" : "bien");
  const [type, setType] = useState<TypeBien>(edit?.type ?? "Maison");
  const [surface, setSurface] = useState(edit?.surface ?? 100);
  const [pieces, setPieces] = useState<PieceSel[]>(
    edit?.pieces?.length
      ? edit.pieces
      : !edit && initial?.piece
        ? [{ room: initial.piece, surface: initial.surface ?? PIECES.find((x) => x.key === initial.piece)!.surfaceDefaut }]
        : [],
  );
  const [cp, setCp] = useState(edit?.cp ?? (!edit ? (initial?.cp ?? "") : ""));
  const [ampleur, setAmpleur] = useState<Ampleur>(edit?.ampleur ?? "complete");
  const [finition, setFinition] = useState<Finition>(edit?.finition ?? "standard");
  const [qui, setQui] = useState<QuiRealise>(edit?.qui ?? "pros");
  /**
   * L'utilisateur a-t-il RÉPONDU quelque chose ? Tant que non, l'estimateur n'affiche aucun chiffre
   * et ne déclenche aucune conversion.
   *
   * ⚠️ POURQUOI CE DRAPEAU EXISTE. Le formulaire s'ouvrait sur des valeurs par défaut (Maison,
   * 100 m², réno complète) qui rendaient l'estimation « valide » AVANT toute action. Deux
   * conséquences : le visiteur voyait le budget d'une maison que personne n'avait décrite, et la
   * conversion Google Ads « Estimation terminée » partait 1,8 s après le simple chargement de la
   * page. Elle mesurait donc « n'a pas fermé l'onglet », pas une intention — et une stratégie
   * d'enchères branchée dessus apprenait à acheter n'importe quel clic.
   *
   * Il n'est PAS mis par `initial` (contexte venu d'une page SEO) : cliquer un lien n'est pas
   * décrire son projet. Ni par `edit` : un projet rouvert AFFICHE son chiffre (`affiche`), mais
   * ne le recompte pas (N4 : avant, `demarre` faux masquait le chiffre d'un projet rouvert).
   */
  const [demarre, setDemarre] = useState(false);
  /**
   * Le bien a-t-il été CHOISI (Maison ou Appartement cliqué) ? « Maison » est une valeur par défaut :
   * sans ce drapeau, taper son seul code postal affichait — et déclarait à Google Ads — le budget
   * d'une maison de 100 m² que personne n'avait choisie. Le mode « pièces » est un choix en soi.
   */
  const [bienChoisi, setBienChoisi] = useState(!!edit);
  const typeChoisi = mode === "pieces" || bienChoisi;
  /** Retour arrière, rechargement ou retour de /tarifs : ses réponses reviennent et le chiffre s'affiche,
   *  mais ce n'est pas une nouvelle action (ni mesure, ni conversion), comme un projet rouvert. */
  const [retour, setRetour] = useState(false);
  // Une pièce venue d'une page de prix : la fourchette de la page s'affiche d'emblée (sans conversion).
  const affiche = chiffreAfficheRapide({ demarre, edition: !!edit, retour, prerempli: !edit && !!initial?.piece, typeChoisi });
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const faute = useChampEnFaute<keyof typeof ID_CHAMP>();
  /** Une erreur d'« Enregistrer » : le message, et le champ en faute marqué et focalisé (comme le neuf). */
  const signaler = (msg: string, champ?: keyof typeof ID_CHAMP) => {
    setErreur(msg);
    if (champ) faute.signaler(champ, ID_CHAMP[champ]); else faute.effacer();
  };

  // Une seule lecture, même quand React rejoue les effets du montage (mode strict, en développement) :
  // sinon la 2ᵉ lecture relisait les valeurs d'arrivée que l'enregistrement venait de ranger, et
  // écrasait les réponses rendues (une pièce venue d'une page de prix revenait à son état d'arrivée).
  const retourLu = useRef(false);
  useEffect(() => {
    if (edit || retourLu.current) return;
    retourLu.current = true;
    try {
      const brut = sessionStorage.getItem(CLE_RETOUR_RENO);
      if (!brut) return;
      sessionStorage.removeItem(CLE_RETOUR_RENO);
      const lu = JSON.parse(brut) as { url?: unknown };
      // Rangées depuis une autre adresse (une autre page de prix, d'autres paramètres) : la nouvelle l'emporte.
      if (typeof lu?.url === "string" && lu.url !== adresseCourante()) return;
      const r = lireRetourRapideReno(lu);
      if (!r) return;
      setMode(r.mode); setType(r.type); setSurface(r.surface); setPieces(r.pieces); setCp(r.cp);
      setAmpleur(r.ampleur); setFinition(r.finition); setQui(r.qui);
      setBienChoisi(true);
      setRetour(true);
    } catch { /* stockage illisible : formulaire vierge */ }
    // Une seule lecture, au montage.
  }, []);

  const T = useT();
  // Bêta : les quelques libellés « Pro » prennent ceux de la bêta (même clés, pour le rendu ci-dessous).
  const t = beta ? { ...T.rapide, introGratuit: T.beta.introReno, affiner: T.beta.affiner, proLock: T.beta.proLock, lockedLabel: T.beta.lockedLabel, lockedSub: T.beta.lockedSub, lockedCta: T.beta.creerCompteFleche } : T.rapide;
  const versInscription = beta && !isPro;
  /* Selon le compte (N13, comme le neuf) : qui a les droits (abonné, ou inscrit pendant la bêta) ne lit ni « Pro »
     ni « gratuit » ; un anonyme lit la bêta (ou « Pro » après elle) ; un projet rouvert s'enregistre, sans « gratuit ». */
  const libAffiner = isPro ? t.affinerInclus : t.affiner;
  const libEnregistrer = isPro || edit ? t.enregistrerCompte : t.enregistrer;
  const locale = useLocale();
  const nf = locale === "en" ? "en-US" : "fr-FR";
  /** Après le prix au m² d'une carte : « … € / m² » en français, « €…/m² » en anglais (lib/i18n/nombres.ts). */
  const parM2 = locale === "en" ? "/m²" : " / m²";
  // Libellé d'ampleur traduit ("Réno totale" pour la lourde en appartement).
  const ampL = (v: Ampleur) => (v === "lourde" && type !== "Maison" ? t.ampleurs.lourdeAppart : t.ampleurs[v]);
  const ampCard = (v: Ampleur) => (mode === "pieces" ? t.piecesAmp[v] : ampL(v));
  const roomName = (k: PieceKey) => t.rooms[k] ?? roomLabel(k).label;

  const totalSurface = mode === "pieces"
    ? pieces.reduce((s, r) => s + (r.surface || 0), 0)
    : surface;

  // {ctx, sel} pour le mode courant, réglages éventuellement remplacés (aperçus des cartes 2-3-4).
  // Un projet rouvert garde sa provision pour aléas (D7) : seuls les nouveaux prennent le défaut.
  function buildSel(o: { ampleur?: Ampleur; finition?: Finition; qui?: QuiRealise } = {}) {
    const a = o.ampleur ?? ampleur, f = o.finition ?? finition, q = o.qui ?? qui;
    const p = mode === "pieces"
      ? presetPieces(pieces, a, f, q, cp)
      : presetRapide({ type, surface, codePostal: cp, ampleur: a, finition: f, qui: q });
    return edit?.aleas != null ? { ...p, ctx: { ...p.ctx, aleas: edit.aleas } } : p;
  }

  const preset = useMemo(() => buildSel(), [mode, type, surface, cp, ampleur, finition, qui, pieces]);
  const tot = useMemo(() => buildDevis(CATALOG, preset.ctx, preset.sel).totaux, [preset]);
  // `affiche` d'abord : sans lui, les valeurs par défaut rendaient l'estimation valide au
  // chargement, donc affichaient un prix que personne n'avait demandé.
  const saisieValide = mode === "pieces" ? pieces.length > 0 && totalSurface > 0 : surface > 0;
  const valid = affiche && saisieValide;
  const lo = Math.round((tot.ttc * 0.85) / 100) * 100;
  const hi = Math.round((tot.ttc * 1.15) / 100) * 100;
  // Le €/m² divise par la surface CHIFFRÉE (bornée par le moteur), jamais par celle en cours de frappe :
  // « 1 » tapé donnait 24 033 €/m² (le total d'un bien de 8 m² divisé par 1).
  const surfaceChiffree = (c: { surface: number }) => (c.surface > 0 ? c.surface : 0);
  const m2 = valid && surfaceChiffree(preset.ctx) > 0 ? Math.round(tot.ttc / surfaceChiffree(preset.ctx)) : 0;

  /**
   * Les réponses gardées dans l'onglet à chaque changement, dès qu'un chiffre s'affiche : un retour
   * arrière (depuis l'inscription, /tarifs…) ou un rechargement les rend (lues au montage, plus haut).
   * Avec l'adresse de la page : une autre page de prix amorce son propre formulaire.
   */
  useEffect(() => {
    if (edit || !affiche) return;
    const r: RetourRapideReno & { url: string } = { mode, type, surface, pieces, cp, ampleur, finition, qui, url: adresseCourante() };
    try { sessionStorage.setItem(CLE_RETOUR_RENO, JSON.stringify(r)); } catch { /* stockage indisponible : rien de gardé */ }
  }, [edit, affiche, mode, type, surface, pieces, cp, ampleur, finition, qui]);

  // Conversion « Estimation terminée » : l'estimateur rapide affiche le prix EN DIRECT (pas de bouton « calculer »),
  // donc le moment de valeur = une fourchette valide restée stable ~1,8 s. On déclenche alors la conversion Google Ads
  // (dédupliquée par session dans conversionEstimation) + l'event Vercel. Une seule fois par visite (convFired).
  // Affiner / Enregistrer restent des signaux d'intention plus profonds (plus bas), déjà dédupliqués côté Google.
  const convFired = useRef(false);
  /**
   * Ce qui fait une estimation RÉELLE : une saisie valide, un total non nul, et un code postal —
   * c'est lui qui rend le chiffre propre au visiteur (ajustement régional) et qui signale une
   * intention. Sans lui, on compterait une personne qui a juste cliqué deux cartes.
   *
   * Une seule définition, désormais partagée. Le déclenchement automatique l'appliquait ;
   * `affiner()` ne l'appliquait PAS et envoyait la conversion Google Ads sans rien vérifier.
   * Deux portes vers le même compteur, dont une sans serrure.
   *
   * Elle exige `demarre`, jamais `affiche` : rouvrir un projet n'est pas une estimation.
   */
  const estimationReelle = estimationReelleRapide({ demarre, saisieValide, ttc: tot.ttc, codePostal: cp, edition: !!edit, typeChoisi });
  useEffect(() => {
    if (convFired.current || !estimationReelle) return;
    const id = window.setTimeout(() => {
      convFired.current = true;
      suivre("estimation_terminee", { action: "affichee", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
      conversionEstimation("reno");
    }, 1800);
    return () => window.clearTimeout(id);
  }, [estimationReelle, mode, type, ampleur]);
  const ampName = ampCard(ampleur).label.toLowerCase();

  /**
   * Visite guidée (bulles ancrées aux `data-visite` ci-dessous). La barre de prix, cachée au téléphone tant qu'il n'y
   * a pas de prix, est sautée ; « Enregistre ou affine » entoure ses boutons et, au téléphone, le bouton « Détail »
   * posé sous le formulaire (seul, tant que la barre est cachée). Formulaire
   * arrivé rempli (page de prix, projet rouvert, réponses rendues au retour) : pas d'invitation, le bouton seulement.
   */
  const etapesVisite = useMemo<EtapeVisite[]>(() => {
    const tv = dictVisite(locale).rapideReno;
    return [
      { id: "quoi", cible: ["rapide-bien-titre", "rapide-bien", "rapide-pieces"], ...tv.quoi },
      { id: "champs", cible: "rapide-champs", ...tv.champs },
      { id: "ampleur", cible: "rapide-ampleur", ...tv.ampleur },
      { id: "finition", cible: "rapide-finition", ...tv.finition },
      { id: "qui", cible: "rapide-qui", ...tv.qui },
      { id: "budget", cible: "rapide-budget", place: ["haut"], ...tv.budget },
      { id: "suite", cible: ["rapide-actions", "rapide-affiner-m"], place: ["haut"], ...tv.suite },
    ];
  }, [locale]);
  const prerempli = !!edit || retour || !!initial?.piece || !!initial?.cp || initial?.surface != null;
  /** Aperçu d'une carte : le €/m² d'un réglage, sur la surface chiffrée (0 sans saisie). */
  function prixM2De(p: ReturnType<typeof buildSel>): number {
    const s = totalSurface > 0 ? surfaceChiffree(p.ctx) : 0;
    return s > 0 ? Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc / s) : 0;
  }

  const m2ByAmp = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of AMPLEURS) { const p = buildSel({ ampleur: a.v }); out[a.v] = prixM2De(p); }
    return out;
  }, [mode, type, surface, cp, finition, qui, pieces]);
  const m2ByFin = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of ["eco", "standard", "premium"] as Finition[]) { const p = buildSel({ finition: f }); out[f] = prixM2De(p); }
    return out;
  }, [mode, type, surface, cp, ampleur, qui, pieces]);
  const m2ByQui = useMemo(() => {
    const out: Record<string, number> = {};
    for (const q of ["pros", "partie", "max"] as QuiRealise[]) { const p = buildSel({ qui: q }); out[q] = prixM2De(p); }
    return out;
  }, [mode, type, surface, cp, ampleur, finition, pieces]);

  const reg = regionCoef(cp);
  const regDelta = Math.round((reg.mo - 1) * 100);
  const zoneLbl = t.zones[reg.zone] ?? reg.zone;
  // « +10 % MO » / « +4% labor » : le signe « % » collé en anglais, après une espace insécable en français (F1).
  // Cinq chiffres qui ne forment pas un code postal couvert : signalé sous le champ, et pas de zone affichée.
  const cpInconnu = cp.length === 5 && !codePostalValide(cp);
  const regLabel = cp.length >= 2 && !cpInconnu ? `${zoneLbl}${regDelta ? ` · ${regDelta > 0 ? "+" : ""}${regDelta}${signePct(locale)} ${t.moSuffix}` : ""}` : "";

  // ── Gestion des pièces (mode multi) ── chaque ajout = une LIGNE (instance) avec sa propre surface.
  const nbPieces = pieces.length;
  const nbTypes = new Set(pieces.map((r) => r.room)).size;
  // Assembler des pièces de TYPES DIFFÉRENTS (2+) = réservé au Pro (paywall doux). Plusieurs pièces
  // du même type (ex. 2 chambres) restent gratuites.
  const locked = mode === "pieces" && nbTypes >= 2 && !isPro;
  function ajouterPiece(k: PieceKey) {
    setMode("pieces");
    setPieces((prev) => [...prev, { room: k, surface: roomLabel(k).surf }]);
  }
  function retirerUne(k: PieceKey) {
    setPieces((prev) => {
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) if (prev[i].room === k) { idx = i; break; }
      return idx < 0 ? prev : prev.filter((_, i) => i !== idx);
    });
  }
  const setPieceSurf = (i: number, s: number) =>
    setPieces((prev) => prev.map((r, idx) => (idx === i ? { ...r, surface: s } : r)));
  const retirerPiece = (i: number) => setPieces((prev) => prev.filter((_, idx) => idx !== i));
  // Compteur d'instances par type (badge sur les tuiles) + ordinal d'affichage pour les doublons.
  const countByRoom = (k: PieceKey) => pieces.filter((r) => r.room === k).length;

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(brouillonRapideReno({
        nom: nomProjet(), ampleur, qui, ctx: preset.ctx, sel: preset.sel, codePostal: cp, pieces: mode === "pieces" ? pieces : undefined,
      })));
    } catch { /* noop */ }
  }
  function affiner() {
    // Le clic mène toujours à l'estimateur détaillé — mais on ne déclare une estimation terminée,
    // et surtout pas une conversion payante, que s'il y en a réellement eu une.
    if (estimationReelle) {
      suivre("estimation_terminee", { action: "affiner", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
      conversionEstimation("reno");
    }
    // Le brouillon seulement s'il y a une estimation : un formulaire vierge rangeait « Maison 100 m² »,
    // que l'inscription présentait comme « ton estimation ». Sinon, un ancien brouillon est retiré.
    if (valid) saveDraft();
    else { try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } }
    try { sessionStorage.setItem("avyora-affiner", "1"); } catch { /* noop */ }
    // Sans les droits, hors bêta (ou projet rouvert) : /tarifs directement (le détaillé l'y renverrait, sans la
    // source). Ses réponses reviennent s'il revient en arrière : elles sont gardées dans l'onglet à chaque
    // changement (plus haut), quel que soit le chemin. Le brouillon reste prêt pour après l'abonnement.
    const versTarifs = !isPro && !versInscription;
    // Bêta, anonyme : l'inscription d'abord ; le lien de l'e-mail le ramène au détaillé, semé par ce brouillon (?affiner=1).
    router.push(versInscription ? lienInscriptionBeta("/projets/nouveau/detaille?affiner=1", "affiner-reno")
      : versTarifs ? "/tarifs?source=affiner-reno"
      : "/projets/nouveau/detaille");
  }

  /**
   * Bêta, anonyme, plusieurs types de pièces : « Créer mon compte gratuit ». Comme « Enregistrer » sans compte,
   * le brouillon puis le drapeau de réclamation : une fois inscrit, `ClaimDraft` (/projets) crée le projet, multi-pièces
   * compris (il est Pro pendant la bêta). Le code postal d'abord : sans lui, la réclamation échouerait.
   */
  function versInscriptionMultiPieces() {
    setErreur(null); faute.effacer();
    if (!codePostalValide(cp)) { signaler(cp.length === 5 ? t.errCpInconnu : t.errCp, "cp"); return; }
    saveDraft();
    try { localStorage.setItem(CLE_RECLAMATION_RENO, "1"); } catch { /* noop */ }
    router.push(lienInscriptionBeta(undefined, "multi-pieces"));
  }

  /** « Enregistrer » sans compte : le brouillon d'abord, le drapeau ensuite (un drapeau sans brouillon ne réclame rien). */
  function versInscriptionEnregistrer() {
    saveDraft();
    try { localStorage.setItem(CLE_RECLAMATION_RENO, "1"); } catch { /* noop */ }
    router.push(beta ? lienInscriptionBeta(undefined, "enregistrer-reno") : "/inscription");
  }

  /** Libellé du projet (ex. « Rénovation — Chambre ×2 + Salle de bain » ou « Rénovation — Maison 100 m² »). */
  function nomProjet(): string {
    if (mode === "pieces") {
      const counts = new Map<PieceKey, number>();
      for (const r of pieces) counts.set(r.room, (counts.get(r.room) ?? 0) + 1);
      const parts = [...counts].map(([k, n]) => `${t.rooms[k] ?? roomLabel(k).label}${n > 1 ? ` ×${n}` : ""}`);
      return `${t.projetNom} — ${parts.join(" + ")}`.slice(0, 110);
    }
    const nomType = type === "Maison" ? t.typeMaison : t.typeAppart;
    return `${t.projetNom} — ${nomType} ${surface} m²`.slice(0, 110);
  }

  async function enregistrer() {
    setErreur(null); faute.effacer();
    if (!codePostalValide(cp)) { signaler(cp.length === 5 ? t.errCpInconnu : t.errCp, "cp"); return; }
    if (mode === "pieces" && pieces.length === 0) { signaler(t.auMoinsUnePiece); return; }
    if (!valid) { signaler(t.errSurface, mode === "bien" ? "surface" : undefined); return; }
    // La conversion « estimation » compte une CRÉATION : enregistrer la modification d'un projet n'en est pas une.
    if (!edit) {
      suivre("estimation_terminee", { action: "enregistrer", type: mode === "pieces" ? "pieces" : type, ampleur, nature: "reno", src: initial?.src ?? "direct" });
      conversionEstimation("reno");
    }
    // Visiteur anonyme (connu de la page) : le brouillon, le drapeau, l'inscription — sans POST voué au 401.
    if (connecte === false && !edit) { versInscriptionEnregistrer(); return; }
    setSaving(true);
    const nom = nomProjet();
    const typeBien = (mode === "pieces" ? "Appartement" : type) as TypeBien;
    // La liste des pièces (pour rouvrir le formulaire tel quel) et le suivi de chantier du projet
    // rouvert (le PATCH remplace toutes les réponses : sans lui, il était effacé).
    const reponses = reponsesRapideReno({
      ampleur, qui, ctx: preset.ctx, sel: preset.sel, codePostal: cp,
      pieces: mode === "pieces" ? pieces : undefined, statuts: edit?.statuts,
    });
    try {
      const res = await fetch(edit ? `/api/projects/${edit.projectId}` : "/api/projects", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, typeBien, surface: totalSurface, codePostal: cp, reponses }) });
      // Le brouillon d'abord, le drapeau ensuite : un drapeau sans brouillon ne réclame rien.
      // Session expirée (ou page qui ne sait pas) : même chemin que l'anonyme.
      if (res.status === 401) { versInscriptionEnregistrer(); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || t.errSave); setSaving(false); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      suivre("projet_enregistre", { nature: "reno", mode: "rapide", edition: !!edit });
      router.push(`/projets/${edit ? edit.projectId : data.id}`);
    } catch { setErreur(t.errReseau); setSaving(false); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RAPIDE_CSS + (edit?.detaille || edit?.piecesPerdues ? AVERT_CSS : "") }} />
      <div className="av-rapide">
        <VisiteGuidee id="rapideReno" etapes={etapesVisite} prerempli={prerempli} />
        {(edit?.detaille || edit?.piecesPerdues) && (
          <div className="avert" role="note">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1L8 1.8Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.2v3.6M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span>{edit.detaille ? t.avertDetaille : t.avertPiecesPerdues}</span>
          </div>
        )}
        <div className="q">
          <h2 className="qlbl"><span className="n" aria-hidden="true">1</span>{t.step1q}</h2>

          <div className="glbl" data-visite="rapide-bien-titre">{t.bienEntier}</div>
          <div className="seg" role="group" aria-label={t.bienEntier} data-visite="rapide-bien" style={{ marginBottom: 14 }}>
            {(["Maison", "Appartement"] as TypeBien[]).map((tb) => {
              const on = affiche && mode === "bien" && type === tb;
              return <button type="button" key={tb} className={on ? "on" : ""} aria-pressed={on} onClick={() => { setDemarre(true); setBienChoisi(true); setMode("bien"); setType(tb); }}>{tb === "Maison" ? t.maison : t.appart}</button>;
            })}
          </div>

          <div className="glbl">{t.uneOuPlusieurs}</div>
          <div className="rgrid" role="group" aria-label={t.uneOuPlusieurs} data-visite="rapide-pieces">
            {ROOMS.map((r) => {
              const n = countByRoom(r.key);
              return (
                <div key={r.key} className={"rcard" + (mode === "pieces" && n > 0 ? " on" : "")}>
                  <button type="button" className="rname" onClick={() => { setDemarre(true); ajouterPiece(r.key); }}>
                    <span className="rem" aria-hidden="true">{r.emoji}</span> {roomName(r.key)}
                  </button>
                  <span className="rstep">
                    <button type="button" onClick={() => { setDemarre(true); retirerUne(r.key); }} disabled={n === 0} aria-label={`${t.retirerUne} ${roomName(r.key)}`}>−</button>
                    <span className="rn">{n}</span>
                    <button type="button" onClick={() => { setDemarre(true); ajouterPiece(r.key); }} aria-label={`${t.ajouterUne} ${roomName(r.key)}`}>+</button>
                  </span>
                </div>
              );
            })}
          </div>

          {mode === "pieces" && pieces.length > 0 && (() => {
            const totalPer: Record<string, number> = {};
            pieces.forEach((r) => { totalPer[r.room] = (totalPer[r.room] ?? 0) + 1; });
            const seen: Record<string, number> = {};
            return (
              <div className="plist">
                {pieces.map((r, i) => {
                  const meta = roomLabel(r.room);
                  seen[r.room] = (seen[r.room] ?? 0) + 1;
                  const ord = totalPer[r.room] > 1 ? ` ${seen[r.room]}` : "";
                  return (
                    <div className="prow" key={i}>
                      <span className="pname">{meta.emoji} {roomName(r.room)}{ord}</span>
                      <Stepper compact aLaSortie value={r.surface} min={2} max={SURFACE_MAX_PIECE} unit="m²" onChange={(n) => { setDemarre(true); setPieceSurf(i, n); }} />
                      <button type="button" className="prm" onClick={() => { setDemarre(true); retirerPiece(i); }} aria-label={`${t.supprimer} ${roomName(r.room)}${ord}`}>✕</button>
                    </div>
                  );
                })}
                <div className="psum">{nbPieces} {nbPieces > 1 ? t.piecePlur : t.pieceSing} · {totalSurface.toLocaleString(nf)} m² {t.auTotal} · <span className="hintadd">{t.ajusteSurface}</span></div>
              </div>
            );
          })()}

          <div className="fields" data-visite="rapide-champs">
            {mode === "bien" && (
              <div className="fld">
                <label htmlFor={ID_CHAMP.surface}>{t.surfaceLabel}</label>
                {/* Le champ du rapide du neuf (F1) : « − 100 m² + » en pleine largeur, boutons de 44 px. La valeur est
                    prise à la sortie du champ (comme le neuf), bornée : le total ne saute pas à chaque chiffre tapé. */}
                <Stepper block aLaSortie id={ID_CHAMP.surface} invalide={faute.champ === "surface"} value={surface} min={SURFACE_MIN_RAPIDE} max={SURFACE_MAX_RAPIDE} unit="m²"
                  onChange={(n) => { setDemarre(true); setSurface(n); if (faute.champ === "surface" && n > 0) { faute.effacer(); setErreur(null); } }} />
                {surface >= SURFACE_MAX_RAPIDE
                  ? <div className="fhint">{t.surfaceMax(SURFACE_MAX_RAPIDE)}</div>
                  : valid && <div className="fhint">{t.hypotheses(preset.ctx.niveaux, preset.ctx.sdb)}</div>}
              </div>
            )}
            <div className="fld" style={mode === "pieces" ? { gridColumn: "1 / -1" } : undefined}>
              <label htmlFor={ID_CHAMP.cp}>{t.cpLabel}</label>
              <input id={ID_CHAMP.cp} inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder={t.cpPlaceholder} value={cp}
                aria-invalid={faute.champ === "cp" || cpInconnu || undefined} aria-describedby={faute.champ === "cp" ? ID_ERREUR : cpInconnu ? ID_CP_INCONNU : undefined}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setDemarre(true); setCp(v);
                  if (faute.champ === "cp" && codePostalValide(v)) { faute.effacer(); setErreur(null); }
                }} />
              {cpInconnu && <div className="fhint err" id={ID_CP_INCONNU}>{t.errCpInconnu}</div>}
            </div>
          </div>
        </div>

        <div className="q">
          <h2 className="qlbl"><span className="n" aria-hidden="true">2</span>{t.step2}</h2>
          <div className="cards" role="group" aria-label={t.step2} data-visite="rapide-ampleur">
            {AMPLEURS.map((a, i) => {
              const al = ampCard(a.v);
              return (
                <button type="button" key={a.v} className={"amp" + (ampleur === a.v ? " on" : "")} aria-pressed={ampleur === a.v} onClick={() => { setDemarre(true); setAmpleur(a.v); }}>
                  <span className="head">
                    <span className="gauge">{[0, 1, 2, 3].map((k) => <i key={k} className={k <= i ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="t">{al.label}</span>
                  <span className="d">{al.desc}</span>
                  <span className="amt">{locked ? <span className="lock">{t.proLock}</span> : valid && m2ByAmp[a.v] > 0 ? <>≈ <b>{euroAvant(locale) + m2ByAmp[a.v].toLocaleString(nf) + euroApres(locale)}</b>{parM2}</> : "—"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <h2 className="qlbl"><span className="n" aria-hidden="true">3</span>{t.step3}</h2>
          <div className="fins" role="group" aria-label={t.step3} data-visite="rapide-finition">
            {FINITIONS.map((f) => {
              const fi = t.finitions[f.v];
              return (
              <button type="button" key={f.v} className={"fin" + (finition === f.v ? " on" : "")} aria-pressed={finition === f.v} onClick={() => { setDemarre(true); setFinition(f.v); }}>
                <span className="head">
                  <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span>
                  <span className="chk" />
                </span>
                <span className="eye">{fi.eye}</span>
                <span className="t">{fi.label}</span>
                <span className="d">{fi.desc}</span>
                <span className="amt">{locked ? <span className="lock">{t.proLock}</span> : valid && m2ByFin[f.v] > 0 ? <>≈ <b>{euroAvant(locale) + m2ByFin[f.v].toLocaleString(nf) + euroApres(locale)}</b>{parM2}</> : "—"}</span>
              </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <h2 className="qlbl"><span className="n" aria-hidden="true">4</span>{t.step4}</h2>
          <div className="quis" role="group" aria-label={t.step4} data-visite="rapide-qui">
            {QUIS.map((q) => {
              const qi = t.quis[q.v];
              const price = m2ByQui[q.v] || 0;
              const base = m2ByQui.pros || 0;
              const pct = valid && base > 0 && price > 0 ? Math.round((1 - price / base) * 100) : 0;
              // « Je fais un max » au prix de « J'en bricole une partie » (tout le panier se fait déjà soi-même) : dit, pas laissé en doublon muet.
              const identique = valid && !locked && q.v === "max" && price > 0 && price === (m2ByQui.partie || 0);
              return (
                <button type="button" key={q.v} className={"qcard" + (qui === q.v ? " on" : "")} aria-pressed={qui === q.v} onClick={() => { setDemarre(true); setQui(q.v); }}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < q.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{qi.eye}</span>
                  <span className="t">{qi.label}</span>
                  <span className="d">{qi.desc}</span>
                  {identique && <span className="qsame">{t.quiIdentique}</span>}
                  <span className="amt">
                    {locked ? <span className="lock">{t.proLock}</span> : valid && price > 0 ? <span className="p">≈ <b>{euroAvant(locale) + price.toLocaleString(nf) + euroApres(locale)}</b>{parM2}</span> : <span className="p">—</span>}
                    {!locked && pct > 0 && <span className="save">−{pct}{signePct(locale)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="intro">{isPro ? t.intro : t.introGratuit}</p>
        {/* Téléphone : « Détail poste par poste » vit ici, sous le formulaire ; la barre collante ne garde
            que le prix et « Enregistrer », sur deux lignes au plus (elle couvrait un quart de l'écran). */}
        {!locked && <div className="affiner-m" data-visite="rapide-affiner-m"><button type="button" className="ghost-m" onClick={affiner}>{libAffiner}</button></div>}
      </div>

      <div className={"av-rapide-live av-reno-live" + (locked ? " lk" : "") + (!locked && !valid && !erreur ? " vide" : "")} data-visite="rapide-budget">
        <div className="in">
          {locked ? (
            <>
              <div>
                <div className="lbl">{t.lockedLabel}</div>
                <div className="big">{t.lockedBig1}{nbPieces}{nbPieces > 1 ? t.lockedBig2Plur : t.lockedBig2Sing}</div>
                <div className="sub">{t.lockedSub}</div>
              </div>
              <div className="btns" data-visite="rapide-actions">
                {versInscription
                  ? <button type="button" className="cta" onClick={versInscriptionMultiPieces}>{t.lockedCta}</button>
                  : <Link className="cta" href="/tarifs?source=affiner-reno">{t.lockedCta}</Link>}
              </div>
              {versInscription && erreur && <div className="err" id={ID_ERREUR} role="alert">{erreur}</div>}
            </>
          ) : (
            <>
              <div>
                <div className="lbl">{t.liveLabel}</div>
                <div className="big">{valid ? <>{euroAvant(locale)}<CountUp value={lo} nf={nf} />{euroApres(locale)}<span style={{ opacity: .55 }}> – </span>{euroAvant(locale)}<CountUp value={hi} nf={nf} />{euroApres(locale)}</> : "—"}</div>
                <div className="sub">{valid ? <>≈ {euroAvant(locale)}<CountUp value={m2} nf={nf} />{`${euroApres(locale)}/m² · `}{ampName} · {locale === "en" ? "±15%" : "±15\u00a0%"}{regLabel ? <> · {regLabel}</> : ""}</> : !affiche ? t.step1q : (mode === "pieces" ? t.ajoutePiece : t.renseigneSurface)}</div>
              </div>
              <div className="btns" data-visite="rapide-actions">
                <button type="button" className="ghost" onClick={affiner}>{libAffiner}</button>
                <button type="button" className="cta" onClick={enregistrer} disabled={saving}>{saving ? t.enregistrement : libEnregistrer}</button>
              </div>
              {erreur && <div className="err" id={ID_ERREUR} role="alert">{erreur}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
